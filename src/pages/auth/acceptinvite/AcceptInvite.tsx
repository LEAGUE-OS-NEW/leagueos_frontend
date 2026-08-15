import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { completeAccountSetup } from '../../../services/authServices.ts';
import { usePasswordValidation } from '../../../hooks/usePasswordValidation.ts';
import { useAuthStore } from '../../../store/authStore.ts';
import { getDefaultDashboardRoute } from '../../../utils/roleRoutes.ts';
import './acceptinvite.css';

type ApiError = {
  response?: {
    data?: Record<string, string | string[] | undefined>;
  };
};

function firstApiMessage(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSetupErrorMessage(error: unknown) {
  const data = (error as ApiError).response?.data;

  return (
    firstApiMessage(data?.detail) ||
    firstApiMessage(data?.token) ||
    firstApiMessage(data?.message) ||
    firstApiMessage(data?.password) ||
    firstApiMessage(data?.confirm_password) ||
    firstApiMessage(data?.first_name) ||
    firstApiMessage(data?.last_name) ||
    'Something went wrong. Please check the details and try again.'
  );
}

function PasswordStatusDisplay({ status, message }: { status: string; message: string }) {
  if (!status || status === 'idle') return null;
  return (
    <div className={`ai-password-status status-${status}`}>
      <span>{message}</span>
    </div>
  );
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDone, setIsDone] = useState(false);
  const { validation, validatePassword } = usePasswordValidation();

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    void validatePassword(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Hard guard, not just the button's disabled prop — a second click or
    // resubmission before React re-renders must not reach the API a second
    // time and burn the (single-use) setup token on a request the user
    // never intended as a retry.
    if (isSubmitting) return;
    setErrorMessage('');

    if (!token) {
      setErrorMessage('This invite link is missing its token. Ask for a new invite.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Enter your first and last name.');
      return;
    }
    if (validation.disabled) {
      setErrorMessage(validation.message || 'Please enter a stronger password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await completeAccountSetup({
        token,
        password,
        confirm_password: confirmPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      const { user, access, refresh } = response.data;
      setAuth({ user, access, refresh, requiresEmailVerification: false });
      setIsDone(true);

      const destination = getDefaultDashboardRoute(user) ?? '/login';
      window.setTimeout(() => navigate(destination, { replace: true }), 1200);
    } catch (error) {
      setErrorMessage(getSetupErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ai-page">
      <section className="ai-card">
        <div className="ai-card-inner">
          <header className="ai-header">
            <h2>
              Set Up Your <span>Account</span>
            </h2>
            <p>You've been invited to League OS. Set a password to activate your account.</p>
          </header>

          {errorMessage ? (
            <p className="ai-message ai-message-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isDone ? (
            <form className="ai-form" onSubmit={handleSubmit} noValidate>
              <div className="ai-field-row">
                <label className="ai-field">
                  First name
                  <div className="ai-field-shell">
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                </label>
                <label className="ai-field">
                  Last name
                  <div className="ai-field-shell">
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                </label>
              </div>

              <label className="ai-field">
                Password
                <div className="ai-password-shell">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="ai-toggle-visibility"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </button>
                </div>
                <PasswordStatusDisplay status={validation.status} message={validation.message} />
              </label>

              <label className="ai-field">
                Confirm password
                <div className="ai-password-shell">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="ai-toggle-visibility"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </button>
                </div>
              </label>

              <button type="submit" className="ai-submit" disabled={isSubmitting || validation.disabled}>
                <LockOutlinedIcon fontSize="small" />
                {isSubmitting ? 'Setting up…' : 'Activate Account'}
              </button>

              <p className="ai-footnote">
                Already set up? <Link to="/login">Log in</Link>
              </p>
            </form>
          ) : (
            <div className="ai-success" role="status" aria-live="polite">
              <h3>You're all set</h3>
              <p>Redirecting to your dashboard…</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
