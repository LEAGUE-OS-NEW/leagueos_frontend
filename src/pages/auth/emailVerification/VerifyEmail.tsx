import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resendOtp, verifyOtp } from '../../../services/authServices.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import {
  getPendingOnboardingSession,
  clearPendingOnboardingSession,
} from '../../../utils/onboardingSession.ts';
import { getSafeAuthRedirect, LOGIN_ROUTE, PERSONALIZE_ROUTE } from '../../../utils/authFlow.ts';
const leagueWordmark = '/logos/league-os-horizontal.png';
import './verify-email.css';


type LocationState = { email?: string; message?: string; postLoginRedirect?: string };

const OTP_TTL_MS = 10 * 60 * 1000;

const getOtpExpiry = () => Date.now() + OTP_TTL_MS;

const formatCountdown = (msLeft: number) => {
  const clamped = Math.max(0, msLeft);
  const minutes = Math.floor(clamped / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((clamped % 60000) / 1000).toString().padStart(2, '0');
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${minutes}:${seconds}.${tenths}`;
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { login } = useAuth();
  const postLoginRedirect = getSafeAuthRedirect(state?.postLoginRedirect);

  const [email] = useState(state?.email ?? '');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState(
    state?.email ? '' : 'We need your email address to verify this account. Return to login and try again.',
  );
  const [statusMessage, setStatusMessage] = useState(state?.message ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(() => (state?.email ? getOtpExpiry() : null));
  const [msLeft, setMsLeft] = useState(OTP_TTL_MS);
  const isExpired = Boolean(email) && msLeft <= 0;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusSlot = (index: number) => inputRefs.current[index]?.focus();

  // Countdown from 10 minutes to zero, recomputed from an absolute expiry
  // timestamp every 100ms so the display can show tenths of a second.
  // Once it hits zero the code is treated as expired: the inputs/submit
  // are disabled and the user must press "Resend OTP" to request a fresh
  // code and restart the countdown.
  useEffect(() => {
    if (!email || otpExpiresAt === null) return;

 const tick = () => {
  const remaining = otpExpiresAt - Date.now();
  if (remaining <= 0) {
    setMsLeft(0);
    clearInterval(intervalId);   // ← stops once expired
    return;
  }
  setMsLeft(remaining);
};
   
  const intervalId = setInterval(tick, 250);

    return () => clearInterval(intervalId);
  }, [email, otpExpiresAt]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMessage('');
    if (digit && index < 5) focusSlot(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) focusSlot(index - 1);
    if (e.key === 'ArrowLeft' && index > 0) focusSlot(index - 1);
    if (e.key === 'ArrowRight' && index < 5) focusSlot(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { next[i] = d; });
    setDigits(next);
    focusSlot(Math.min(pasted.length, 5));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (!email) {
      setErrorMessage('We need your email address to verify this account. Return to login and try again.');
      return;
    }
    if (isExpired) {
      setErrorMessage("This code has expired. Click \"Resend OTP\" to get a new one.");
      return;
    }
    if (code.length !== 6) { setErrorMessage('Enter all 6 digits.'); return; }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await verifyOtp({ email, code, purpose: 'EMAIL_VERIFICATION' });

      const session = getPendingOnboardingSession();

      if (session) {
        try {
          await login({ identifier: session.email, password: session.password });
          setStatusMessage('Verified! Redirecting to personalization...');
          clearPendingOnboardingSession();
          setTimeout(() => navigate(postLoginRedirect ?? PERSONALIZE_ROUTE, { replace: true }), 1400);
        } catch {
          clearPendingOnboardingSession();
          setStatusMessage('Verified! Please log in to continue.');
          setTimeout(() => navigate(LOGIN_ROUTE, {
            replace: true,
            state: {
              email,
              message: 'Your email has been verified. Please log in to continue.',
              postLoginRedirect,
            },
          }), 1400);
        }
      } else {
        setStatusMessage('Verified! Please log in to continue.');
        setTimeout(() => navigate(LOGIN_ROUTE, {
          replace: true,
          state: {
            email,
            message: 'Your email has been verified. Please log in to continue.',
            postLoginRedirect,
          },
        }), 1400);
      }
    } catch (error) {
      const data = (error as { response?: { data?: unknown } })?.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const msgs = Object.values(data as Record<string, unknown>)
          .flatMap((v) => Array.isArray(v) ? v : [v])
          .filter((v): v is string => typeof v === 'string');
        if (msgs.length) { setErrorMessage(msgs[0]); return; }
      }
      setErrorMessage('Could not verify. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setErrorMessage('Email is required to resend the code.'); return; }
    setIsResending(true);
    setErrorMessage('');
    try {
      await resendOtp({ email });
      setStatusMessage('A new code has been sent.');
      setDigits(['', '', '', '', '', '']);
      setMsLeft(OTP_TTL_MS);
      setOtpExpiresAt(getOtpExpiry());
      focusSlot(0);
    } catch {
      setErrorMessage('Could not resend the code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="otp-shell">
      <div className="otp-card">
        <div className="otp-logo">
          <img src={leagueWordmark} alt="League OS" className="otp-logo-image" />
        </div>

        <h1 className="otp-title">Verify Your Email</h1>
        <p className="otp-subtitle">
          Enter the 6-digit code sent to your email address to continue.
        </p>

        {email && (
          <p className={`otp-countdown${isExpired ? ' otp-countdown-expired' : ''}`} role="timer">
            {isExpired
              ? 'Your code has expired. Click "Resend OTP" below to get a new code.'
              : `Code expires in ${formatCountdown(msLeft)}`}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="otp-boxes">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className={`otp-box${d ? ' otp-box-filled' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={d}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                disabled={isExpired}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          {errorMessage && (
            <p className="otp-message otp-error" role="alert">{errorMessage}</p>
          )}
          {statusMessage && (
            <p className="otp-message otp-success" role="status">{statusMessage}</p>
          )}

          <button type="submit" className="otp-submit" disabled={isSubmitting || !email || isExpired}>
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <button type="button" className="otp-resend" onClick={handleResend} disabled={isResending}>
          {isResending ? 'Resending...' : "Didn't receive a code? Resend"}
        </button>
      </div>
    </div>
  );
}