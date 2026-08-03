import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ForgotPassword from './ForgotPassword'
import { normalizeCodeInput } from './forgotPasswordUtils'

const navigateMock = vi.hoisted(() => vi.fn())
const requestPasswordResetMock = vi.hoisted(() => vi.fn())
const resetPasswordMock = vi.hoisted(() => vi.fn())

// `shouldAdvanceTime` lets real wall-clock time bleed into the fake clock
// while a test awaits user.type/click/waitFor, so the displayed tenths (and
// sometimes whole seconds) drift by an unpredictable amount. Matching a
// countdown by proximity to the expected second, rather than an exact
// "M:SS.t" string, keeps these assertions meaningful without being brittle.
function nearCountdown(expectedSeconds: number, toleranceSeconds = 5) {
  return (content: string) => {
    const match = content.match(/^(\d+):(\d{2})\.\d$/)
    if (!match) return false
    const totalSeconds = Number(match[1]) * 60 + Number(match[2])
    return Math.abs(totalSeconds - expectedSeconds) <= toleranceSeconds
  }
}

vi.mock('../../../hooks/usePasswordValidation.ts', () => ({
  usePasswordValidation: () => ({
    validation: {
      status: 'strong',
      message: 'Strong password',
      score: 3,
      disabled: false,
    },
    validatePassword: vi.fn().mockResolvedValue(undefined),
    resetValidation: vi.fn(),
  }),
}))

vi.mock('@zxcvbn-ts/core', () => ({
  ZxcvbnFactory: class {
    check() {
      return { score: 3 }
    }
  },
}))

// NOTE: this must match the exact specifier ForgotPassword.tsx imports from —
// it imports `requestPasswordReset` and `resetPassword` from
// '../../../services/authServices.ts' (plural, .ts). The previous mock
// pointed at '../../../services/authService.ts' (singular), which doesn't
// exist in the repo, so vi.mock never intercepted the real import and the
// mocks were never called.
vi.mock('../../../services/authServices.ts', () => ({
  requestPasswordReset: requestPasswordResetMock,
  resetPassword: resetPasswordMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

afterEach(() => {
  navigateMock.mockReset()
  requestPasswordResetMock.mockReset()
  resetPasswordMock.mockReset()
  vi.restoreAllMocks()
})

describe('forgot password helpers', () => {
  it('keeps only numeric reset code characters', () => {
    expect(normalizeCodeInput('12a-34 56')).toBe('123456')
  })
})

describe('ForgotPassword page', () => {
  it('walks through request, verification, and password reset', async () => {
    const user = userEvent.setup()
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })
    resetPasswordMock.mockResolvedValueOnce({ data: { ok: true } })
    const timeoutSpy = vi.spyOn(window, 'setTimeout')

    const { container } = render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText('you@example.com'), 'USER@EXAMPLE.COM')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        email: 'user@example.com',
      })
    })

    await user.type(screen.getByPlaceholderText(/enter the 6-digit code/i), '12a34b56')
    expect(screen.getByDisplayValue('123456')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^verify code$/i }))

    await waitFor(() => {
      expect(container.querySelectorAll('input[type="password"]')).toHaveLength(2)
    })

    const passwordInputs = container.querySelectorAll('input[type="password"]')

    await user.type(passwordInputs[0], 'NewStrongPass1!')
    await user.type(passwordInputs[1], 'NewStrongPass1!')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: '123456',
        password: 'NewStrongPass1!',
        confirm_password: 'NewStrongPass1!',
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/password reset successful/i)
    })

    await waitFor(() => {
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1800)
    })

    const timeoutCall = timeoutSpy.mock.calls.find(([, delay]) => delay === 1800)
    const timerCallback = timeoutCall?.[0]
    expect(typeof timerCallback).toBe('function')

    if (typeof timerCallback === 'function') {
      timerCallback()
    }

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        message: 'Password reset successful. Please log in with your new password.',
      },
    })
  }, 10000)

  it('counts the reset code down from 10 minutes and disables verification once it expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({ email: 'user@example.com' })
    })

    // Starts at ~10:00 and ticks down.
    await waitFor(() => {
      expect(screen.getByText(nearCountdown(10 * 60))).toBeInTheDocument()
    })
    await vi.advanceTimersByTimeAsync(60 * 1000)
    expect(screen.getByText(nearCountdown(9 * 60))).toBeInTheDocument()

    // Once the remaining 9 minutes elapse, the code is expired.
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000)

    expect(screen.getByText(/your code has expired/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^verify code$/i })).toBeDisabled()

    vi.useRealTimers()
  }, 10000)

  it('lets the user request a new code during the countdown by returning them to the request form', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledTimes(1)
    })

    await vi.advanceTimersByTimeAsync(90 * 1000)
    expect(screen.getByText(nearCountdown(8 * 60 + 30))).toBeInTheDocument()

    // "Resend code" mid-countdown takes the user back to the request form
    // rather than silently firing off a new code.
    await user.click(screen.getByRole('button', { name: /resend code/i }))

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument()
    expect(screen.queryByText(/code expires in/i)).not.toBeInTheDocument()

    // Submitting the request form again sends a fresh code and restarts the countdown.
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText(nearCountdown(10 * 60))).toBeInTheDocument()

    vi.useRealTimers()
  }, 10000)
})