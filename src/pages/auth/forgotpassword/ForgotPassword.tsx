import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../../../services/authServices.ts';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { normalizeCodeInput } from './forgotPasswordUtils.js';
import './forgotpassword.css';
import { usePasswordValidation } from '../../../hooks/usePasswordValidation.js';


const features = [
  {
    title: 'Secure OTP',
    copy: 'We send a time-limited reset code to your email address.',
    tone: 'fp-feature-purple',
    icon: MarkEmailReadOutlinedIcon,
  },
  {
    title: 'Private Recovery',
    copy: 'Only someone with access to your email can update the password.',
    tone: 'fp-feature-orange',
    icon: ShieldOutlinedIcon,
  },
  {
    title: 'Fast Sign-in',
    copy: 'Set a new password and get back into your account quickly.',
    tone: 'fp-feature-blue',
    icon: LockResetOutlinedIcon,
  },
];

type RecoveryStep = 'request' | 'code' | 'password' | 'success';

type ApiError = {
  response?: {
    data?: Record<string, string | string[] | undefined>;
  };
};

function firstApiMessage(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getResetErrorMessage(error: unknown) {
  const data = (error as ApiError).response?.data;

  return (
    firstApiMessage(data?.detail) ||
    firstApiMessage(data?.error) ||
    firstApiMessage(data?.message) ||
    firstApiMessage(data?.email) ||
    firstApiMessage(data?.code) ||
    firstApiMessage(data?.password) ||
    firstApiMessage(data?.confirm_password) ||
    'Something went wrong. Please check the details and try again.'
  );
}

function PasswordStatusDisplay({
  status,
  message,
}: {
  status: string;
  message: string;
  score: number;
}) {
  if (!status || status === 'idle') return null;

  return (
    <div className={`fp-password-status status-${status}`}>
      <span>{message}</span>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RecoveryStep>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const { validation, validatePassword, resetValidation } = usePasswordValidation();

  const resetCodeStep = () => {
    setHasRequestedCode(false);
    setStep('request');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSuccessMessage('');
    setErrorMessage('');
    setInfoMessage('');
    resetValidation();
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);

    setErrorMessage('');
    setInfoMessage('');

    if (step !== 'request' || hasRequestedCode) {
      resetCodeStep();
    }
  };

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage('');
    setInfoMessage('');

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsRequesting(true);

    try {
      const response = await requestPasswordReset({ email: normalizedEmail });

      setHasRequestedCode(true);
      setStep('code');
      setInfoMessage(
        typeof response.data?.message === 'string'
          ? response.data.message
          : 'A password reset code has been sent to your email address.',
      );
    } catch (error) {
      setErrorMessage(getResetErrorMessage(error));
      setHasRequestedCode(false);
      setStep('request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = normalizeCodeInput(resetCode);

    setErrorMessage('');
    setInfoMessage('');

    if (normalizedCode.length !== 6) {
      setErrorMessage('Enter the 6-digit reset code sent to your email.');
      return;
    }

    setResetCode(normalizedCode);
    setIsVerifyingCode(true);
    setStep('password');
    setIsVerifyingCode(false);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPassword(val);
    void validatePassword(val);
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setInfoMessage('');

    if (validation.disabled) {
      setErrorMessage(validation.message || 'Please enter a stronger password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsResetting(true);

    try {
      const response = await resetPassword({
        email: email.trim().toLowerCase(),
        code: resetCode.trim(),
        password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccessMessage(
        typeof response.data?.message === 'string'
          ? response.data.message
          : 'Password reset successful. Redirecting to login...',
      );
      setStep('success');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setHasRequestedCode(false);

      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Password reset successful. Please log in with your new password.',
          },
        });
      }, 1800);
    } catch (error) {
      setErrorMessage(getResetErrorMessage(error));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fp-page">
      <main className="fp-layout">
        <section className="fp-story">
          <div className="fp-hero-copy">
            <h1>
              <span>Reset Access.</span>
              <span>Recover Securely.</span>
              <span className="fp-hero-accent">Back in the Game.</span>
            </h1>
            <p>
              We'll send a secure code to your email so you can create a new League OS
              password and get right back to your account.
            </p>
          </div>

          <div className="fp-feature-list">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="fp-feature">
                  <span className={`fp-feature-icon ${feature.tone}`} aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="fp-feature-copy">
                    <strong>{feature.title}</strong>
                    <p>{feature.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="fp-card">
          <div className="fp-card-inner">
            <header className="fp-card-header">
              <h2>
                Forgot <span>Password?</span>
              </h2>
            </header>

            {errorMessage ? (
              <p className="fp-message fp-message-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {infoMessage ? (
              <p className="fp-message fp-message-success" role="status" aria-live="polite">
                {infoMessage}
              </p>
            ) : null}

            {step === 'request' ? (
              <form className="fp-form" onSubmit={handleRequestCode} noValidate autoComplete="off">
                <input
                  type="text"
                  name="fake-username"
                  autoComplete="username"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="fp-hidden"
                />
                <input
                  type="password"
                  name="fake-password"
                  autoComplete="new-password"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="fp-hidden"
                />
                <label className="fp-field">
                  Email address
                  <div className="fp-field-shell">
                    <span className="fp-field-icon-ghost" aria-hidden="true">
                      <EmailOutlinedIcon />
                    </span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      name="recovery-email"
                      value={email}
                      onChange={handleEmailChange}
                    />
                  </div>
                </label>

                <button type="submit" className="fp-submit" disabled={isRequesting}>
                  {isRequesting ? 'Sending Code...' : 'Send Reset Code'}
                </button>

                <p className="fp-footnote">
                  <Link to="/login">
                    <ArrowBackOutlinedIcon fontSize="inherit" /> Back to login
                  </Link>
                </p>
              </form>
            ) : null}

            {step === 'code' ? (
              <>
                <div className="fp-divider" aria-hidden="true">
                  <span>Verify Code</span>
                </div>

                <form className="fp-form" onSubmit={handleVerifyCode} noValidate>
                  <label className="fp-field">
                    Reset code
                    <div className="fp-field-shell">
                      <span className="fp-field-icon-ghost" aria-hidden="true">
                        <KeyOutlinedIcon />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter the 6-digit code"
                        autoComplete="one-time-code"
                        value={resetCode}
                        onChange={(event) => setResetCode(normalizeCodeInput(event.target.value))}
                      />
                    </div>
                  </label>

                  <button type="submit" className="fp-submit" disabled={isVerifyingCode}>
                    {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
                  </button>

                  <button type="button" className="fp-text-button" onClick={resetCodeStep}>
                    Resend code
                  </button>
                </form>
              </>
            ) : null}

            {step === 'password' ? (
              <form className="fp-form" onSubmit={handleResetPassword} noValidate>
                <label className="fp-field">
                  New password
                  <div className="fp-password-shell">
                    <span className="fp-field-icon-ghost" aria-hidden="true">
                      <LockOutlinedIcon />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={handlePasswordChange}
                    />
                    <button
                      type="button"
                      className="fp-toggle-visibility"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                    </button>
                  </div>
                  <PasswordStatusDisplay
                    status={validation.status}
                    message={validation.message}
                    score={validation.score}
                  />
                </label>

                <label className="fp-field">
                  Confirm password
                  <div className="fp-password-shell">
                    <span className="fp-field-icon-ghost" aria-hidden="true">
                      <LockOutlinedIcon />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="fp-toggle-visibility"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="fp-submit" disabled={isResetting || validation.disabled}>
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>

                <p className="fp-footnote">
                  <Link to="/login">
                    <ArrowBackOutlinedIcon fontSize="inherit" /> Back to login
                  </Link>
                </p>
              </form>
            ) : null}

            {step === 'success' ? (
              <div className="fp-success" role="status" aria-live="polite">
                <h3>Success</h3>
                <p>{successMessage}</p>
                <p className="fp-footnote">
                  <Link to="/login">
                    <ArrowBackOutlinedIcon fontSize="inherit" /> Back to login
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}