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
});
