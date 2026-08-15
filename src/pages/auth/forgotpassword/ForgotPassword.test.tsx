import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ForgotPassword from './ForgotPassword'
import { normalizeCodeInput } from './forgotPasswordUtils'

const navigateMock = vi.hoisted(() => vi.fn())
const requestPasswordResetMock = vi.hoisted(() => vi.fn())
const resetPasswordMock = vi.hoisted(() => vi.fn())

// `shouldAdvanceTime` lets real wall-clock time bleed into the fake clock
// while a test awaits user.type/click/waitFor, so the displayed tenths (and
// sometimes whole seconds) drift by an unpredictable amount — more so on a
// slow/loaded machine, where the real time spent inside those awaits can
// itself run into several seconds. Matching a countdown by proximity to the
// expected second, rather than an exact "M:SS.t" string, keeps these
// assertions meaningful without being brittle.
function nearCountdown(expectedSeconds: number, toleranceSeconds = 12) {
  return (content: string) => {
    const match = content.match(/^(\d+):(\d{2})\.\d$/)
    if (!match) return false
    const totalSeconds = Number(match[1]) * 60 + Number(match[2])
    return Math.abs(totalSeconds - expectedSeconds) <= toleranceSeconds
  }
}

// Jumps the fake clock forward instantly instead of walking through every
// intermediate tick of the countdown's 250ms interval. `advanceTimersByTimeAsync`
// fires every pending timer along the way, and each fire triggers a React
// render — for a multi-minute jump that's thousands of renders, which is
// fast on a quiet machine but can blow past any timeout on a loaded one.
// `setSystemTime` moves what `Date.now()` reports without walking the timer
// queue, so the cost of this jump no longer depends on how large it is; we
// still need one short `advanceTimersByTimeAsync` afterwards so the
// component's own `setInterval` callback actually runs and picks up the
// new time.
async function fastForward(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms))
  await vi.advanceTimersByTimeAsync(300)
  // React 19 needs one more tick to flush the setState made inside the
  // interval callback above to the DOM — without this, assertions right
  // after fastForward see the pre-jump render.
  await vi.advanceTimersByTimeAsync(0)
}

// `user.type()` simulates one keydown event per character, each scheduled
// on its own internal delay timer. Under `shouldAdvanceTime: true` those
// per-character timers are bridged to real wall-clock time, and that
// bridging can occasionally race and replay/reorder a stray keystroke —
// this is what produced "user@example.compas" instead of
// "user@example.com" in CI. None of the fake-timer tests below need
// keystroke-by-keystroke behavior for the email field (that's covered by
// the OTP-code field test and the normalizeCodeInput unit test), so we set
// the whole value in a single synchronous change event instead, which has
// no per-character timer to race with.
function setEmailValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
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
    // This test runs on real timers, so the component's own 250ms OTP-countdown
    // interval keeps firing (and re-rendering) for the whole real-world duration
    // of the test, on top of several realistic-delay user.type/click steps.
    // 10s was too tight under CI load — other similarly-shaped e2e tests in this
    // suite (see Login.test.tsx, Register.test.tsx) budget up to 18-20s.
  }, 20000)

  it('counts the reset code down from 10 minutes and disables verification once it expires', async () => {
    // No `shouldAdvanceTime` here: it ties the fake clock to real wall-clock
    // time, and this test fast-forwards a full 9 minutes at once — with a
    // 250ms tick that's ~2,160 timer fires, each paying real event-loop
    // overhead under shouldAdvanceTime, which is what pushed this test past
    // its timeout on a loaded machine. `advanceTimers` alone is enough to
    // let user.type/user.click drive the fake clock as needed.
    // `shouldAdvanceTime` is required here: without it, `user.click`/`user.type`
    // combined with `advanceTimers: vi.advanceTimersByTime` deadlocks and never
    // resolves in this environment (vitest 4 + user-event 14 + React 19) — that
    // was the actual cause of this test timing out, not the countdown logic.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    setEmailValue(screen.getByPlaceholderText('you@example.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({ email: 'user@example.com' })
    })

    // Starts at ~10:00 and ticks down.
    await waitFor(() => {
      expect(screen.getByText(nearCountdown(10 * 60))).toBeInTheDocument()
    })
    await fastForward(60 * 1000)
    expect(screen.getByText(nearCountdown(9 * 60))).toBeInTheDocument()

    // Once the remaining 9 minutes elapse, the code is expired.
    await fastForward(9 * 60 * 1000)

    expect(screen.getByText(/your code has expired/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^verify code$/i })).toBeDisabled()

    vi.useRealTimers()
  }, 15000)

  it('lets the user request a new code during the countdown by returning them to the request form', async () => {
    // Same reasoning as above — no need for real-time bleed here either,
    // and dropping it keeps the assertions deterministic instead of
    // dependent on machine speed.
    // See the note above on `shouldAdvanceTime` — required or `user.click` hangs.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })
    requestPasswordResetMock.mockResolvedValueOnce({ data: { ok: true } })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    )

    setEmailValue(screen.getByPlaceholderText('you@example.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledTimes(1)
    })

    await fastForward(90 * 1000)
    expect(screen.getByText(nearCountdown(8 * 60 + 30))).toBeInTheDocument()

    // "Resend code" mid-countdown takes the user back to the request form
    // rather than silently firing off a new code.
    await user.click(screen.getByRole('button', { name: /resend code/i }))

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument()
    expect(screen.queryByText(/code expires in/i)).not.toBeInTheDocument()

    // Submitting the request form again sends a fresh code and restarts the
    // countdown — email state persists across resend without retyping.
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText(nearCountdown(10 * 60))).toBeInTheDocument()

    vi.useRealTimers()
  }, 20000)
})