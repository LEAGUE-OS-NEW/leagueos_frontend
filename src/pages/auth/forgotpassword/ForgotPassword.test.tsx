import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ForgotPassword from './ForgotPassword'
import { normalizeCodeInput } from './forgotPasswordUtils'

const navigateMock = vi.hoisted(() => vi.fn())
const requestPasswordResetMock = vi.hoisted(() => vi.fn())
const resetPasswordMock = vi.hoisted(() => vi.fn())

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
})