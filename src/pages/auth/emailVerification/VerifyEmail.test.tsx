import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VerifyEmail from './VerifyEmail';

const navigateMock = vi.hoisted(() => vi.fn());
const verifyOtpMock = vi.hoisted(() => vi.fn());
const resendOtpMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/authServices.ts', () => ({
  verifyOtp: verifyOtpMock,
  resendOtp: resendOtpMock,
}));

vi.mock('../../../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

afterEach(() => {
  loginMock.mockReset();
  verifyOtpMock.mockReset();
  resendOtpMock.mockReset();
  vi.restoreAllMocks();
});

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
  vi.setSystemTime(new Date(Date.now() + ms));
  await vi.advanceTimersByTimeAsync(300);
  // React 19 needs one more tick to flush the setState made inside the
  // interval callback above to the DOM — without this, assertions right
  // after fastForward see the pre-jump render.
  await vi.advanceTimersByTimeAsync(0);
}

describe('VerifyEmail page', () => {
  it('verifies the OTP and routes the user back to login', async () => {
    const user = userEvent.setup();
    const timeoutSpy = vi.spyOn(window, 'setTimeout');

    verifyOtpMock.mockResolvedValueOnce({ data: { message: 'OTP verified successfully.' } });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com', postLoginRedirect: '/personalize' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    // Type into the 6 individual OTP digit boxes
    const digitInputs = screen.getAllByRole('textbox', { name: /digit/i });
    expect(digitInputs).toHaveLength(6);

    await user.type(digitInputs[0], '1');
    await user.type(digitInputs[1], '2');
    await user.type(digitInputs[2], '3');
    await user.type(digitInputs[3], '4');
    await user.type(digitInputs[4], '5');
    await user.type(digitInputs[5], '6');

    await user.click(screen.getByRole('button', { name: /verify & continue/i }));

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: 'fan@example.com',
        code: '123456',
        purpose: 'EMAIL_VERIFICATION',
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent(/please log in/i);

    const timeoutCall = timeoutSpy.mock.calls.find(([, delay]) => delay === 1400);
    expect(timeoutCall).toBeDefined();

    const callback = timeoutCall?.[0];
    if (typeof callback === 'function') {
      callback();
    }

    expect(navigateMock).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        email: 'fan@example.com',
        message: 'Your email has been verified. Please log in to continue.',
        postLoginRedirect: '/personalize',
      },
    });
  });

  it('logs in pending onboarding users and routes them to personalization after verification', async () => {
    const user = userEvent.setup();
    const timeoutSpy = vi.spyOn(window, 'setTimeout');

    sessionStorage.setItem(
      'league_os_pending_onboarding',
      JSON.stringify({ email: 'fan@example.com', password: 'StrongPassword123' }),
    );
    verifyOtpMock.mockResolvedValueOnce({ data: { message: 'OTP verified successfully.' } });
    loginMock.mockResolvedValueOnce({ user: { email: 'fan@example.com' } });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com', postLoginRedirect: '/personalize' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    const digitInputs = screen.getAllByRole('textbox', { name: /digit/i });
    await user.type(digitInputs[0], '1');
    await user.type(digitInputs[1], '2');
    await user.type(digitInputs[2], '3');
    await user.type(digitInputs[3], '4');
    await user.type(digitInputs[4], '5');
    await user.type(digitInputs[5], '6');
    await user.click(screen.getByRole('button', { name: /verify & continue/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        identifier: 'fan@example.com',
        password: 'StrongPassword123',
      });
    });

    const timeoutCall = timeoutSpy.mock.calls.find(([, delay]) => delay === 1400);
    const callback = timeoutCall?.[0];
    if (typeof callback === 'function') {
      callback();
    }

    expect(navigateMock).toHaveBeenCalledWith('/personalize', { replace: true });
  });

  it('shows a retry message when verification has no email context', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email' }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/return to login/i);
    expect(screen.getByRole('button', { name: /verify & continue/i })).toBeDisabled();
  });

  it('can resend the verification code', async () => {
    const user = userEvent.setup();
    resendOtpMock.mockResolvedValueOnce({ data: { message: 'A new OTP has been sent.' } });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /didn't receive/i }));

    await waitFor(() => {
      expect(resendOtpMock).toHaveBeenCalledWith({
        email: 'fan@example.com',
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent(/new code has been sent/i);
  });

  it('shows a 10 minute countdown that ticks down every second', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    expect(screen.getByRole('timer')).toHaveTextContent('10:00');

    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByRole('timer')).toHaveTextContent('09:59');

    vi.useRealTimers();
  });

  it('disables the code once the countdown reaches zero and prompts for resend', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    await fastForward(10 * 60 * 1000);

    expect(screen.getByRole('timer')).toHaveTextContent(/expired/i);
    expect(screen.getByRole('button', { name: /verify & continue/i })).toBeDisabled();
    screen.getAllByRole('textbox', { name: /digit/i }).forEach((input) => {
      expect(input).toBeDisabled();
    });

    vi.useRealTimers();
  }, 30000);

  it('lets the user request a resend during the countdown, which restarts the timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    resendOtpMock.mockResolvedValueOnce({ data: { message: 'A new OTP has been sent.' } });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: { email: 'fan@example.com' } }]}>
        <VerifyEmail />
      </MemoryRouter>,
    );

    await vi.advanceTimersByTimeAsync(30 * 1000);
    // `shouldAdvanceTime` lets real time bleed in by more than a few tenths
    // of a second while awaiting on a slow/loaded machine, so widen the
    // window well beyond the nominal 09:30 mark rather than pinning to it.
    expect(screen.getByRole('timer')).toHaveTextContent(/09:(2[0-9]\.\d|30\.0)/);

    await user.click(screen.getByRole('button', { name: /didn't receive/i }));

    await waitFor(() => {
      expect(resendOtpMock).toHaveBeenCalledWith({ email: 'fan@example.com' });
    });

    expect(screen.getByRole('timer')).toHaveTextContent(/10:00\.0|09:59\.\d/);
    expect(screen.getByRole('button', { name: /verify & continue/i })).not.toBeDisabled();

    vi.useRealTimers();
  });
});