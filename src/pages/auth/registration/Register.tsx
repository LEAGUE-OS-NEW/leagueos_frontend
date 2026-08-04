import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import 'flag-icons/css/flag-icons.min.css';

import Navbar from '../../../components/landing/Navbar.tsx';
import BackButton from '../../../components/auth/BackButton.tsx';
import { register as registerAccount } from '../../../services/authServices.ts';
import { unwrapApiData } from '../../../services/apiUtils.ts';
import {
  buildPhoneNumber,
  firstNameLengthRange,
  mapRegisterApiErrors,
  nameMaxLength,
  normalizePhoneInput,
  normalizeUsernameInput,
  passwordLengthRange,
  phoneDigitLengthRange,
  usernameLengthRange,
  validateRegisterForm,
  type RegisterFormErrors,
  type RegisterFormValues,
} from './registerUtils.ts';
import './register.css';
import { usePasswordValidation } from '../../../hooks/usePasswordValidation.ts';
import { PERSONALIZE_ROUTE, VERIFY_EMAIL_ROUTE, getSafeAuthRedirect, type AuthFlowState } from '../../../utils/authFlow.ts';
import { savePendingOnboardingSession } from '../../../utils/onboardingSession.ts';

const features = [
  {
    title: 'Follow Your Teams',
    copy: 'Get updates on your favorite teams and players.',
    tone: 'feature-purple',
    icon: GroupsOutlinedIcon,
  },
  {
    title: 'Live Scores & Updates',
    copy: 'Real-time scores, results and match highlights.',
    tone: 'feature-orange',
    icon: EmojiEventsOutlinedIcon,
  },
  {
    title: 'Never Miss a Moment',
    copy: 'Personalized schedules and important alerts.',
    tone: 'feature-blue',
    icon: EventNoteOutlinedIcon,
  },
];

// `iso` maps to a flag-icons class (`fi fi-${iso}`) used to render a real
// image/SVG flag in the overlay indicator. Native <option> elements can't
// render icons at all, so the dropdown list itself only ever shows text —
// no emoji flags anywhere, since those fall back to plain "XX" letters on
// Windows (no color-emoji font) and caused the overlapping text bug.
const phoneCountries = [
  { code: '+256', iso: 'ug', label: 'Uganda' },
  { code: '+254', iso: 'ke', label: 'Kenya' },
  { code: '+255', iso: 'tz', label: 'Tanzania' },
  { code: '+250', iso: 'rw', label: 'Rwanda' },
  { code: '+257', iso: 'bi', label: 'Burundi' },
];

const initialFormValues: RegisterFormValues = {
  firstName: '',
  lastName: '',
  username: '',
  countryCode: '+256',
  phoneNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
};

type FieldName = keyof RegisterFormValues;

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="field-icon-ghost" aria-hidden="true">
      {children}
    </span>
  );
}

// Wraps the label text and the required-marker together so they stay on
// the same line as a single flex item, even inside a column-direction
// flex label (otherwise the asterisk becomes its own flex item and
// drops to a new line below the label text).
function FieldLabel({ children, required = true }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="field-label-text">
      {children}
      {required ? (
        <span className="field-required-mark" aria-hidden="true"> *</span>
      ) : null}
    </span>
  );
}

// Shows a small helper line under a field describing its constraints
// (length, allowed characters, etc). Only rendered while that specific
// field is focused, and never alongside an active error message.
function FieldHint({ children }: { children: ReactNode }) {
  return <span className="field-hint">{children}</span>;
}

// A single live requirement row (e.g. "8+ characters") that turns
// green with a checkmark once the current password value satisfies it.
function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`password-requirement ${met ? 'met' : ''}`.trim()}>
      <span className="password-requirement-dot" aria-hidden="true">
        {met ? <CheckIcon fontSize="inherit" /> : null}
      </span>
      {label}
    </span>
  );
}

function PasswordStrengthIndicator({
  status,
  message,
}: {
  status: string;
  message: string;
  score: number;
}) {
  if (!status || status === 'idle') return null;

  return (
    <div className={`password-status status-${status}`}>
      <span className="password-status-text">{message}</span>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as AuthFlowState | null;
  const postLoginRedirect = getSafeAuthRedirect(locationState?.postLoginRedirect);

  const [formValues, setFormValues] = useState<RegisterFormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const { validation, validatePassword } = usePasswordValidation();
  const canSubmit = !isSubmitting && !validation.disabled;

  const isFormEmpty =
    !formValues.firstName.trim() &&
    !formValues.lastName.trim() &&
    !formValues.username.trim() &&
    !formValues.phoneNumber.trim() &&
    !formValues.email.trim() &&
    !formValues.password &&
    !formValues.confirmPassword;

  const updateField = <K extends keyof RegisterFormValues>(
    field: K,
    value: RegisterFormValues[K],
  ) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setSubmitMessage('');

    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.form;
      delete nextErrors[field];

      if (field === 'password' || field === 'confirmPassword') {
        delete nextErrors.password;
        delete nextErrors.confirmPassword;
      }

      if (field === 'phoneNumber' || field === 'countryCode') {
        delete nextErrors.phoneNumber;
      }

      if (field === 'firstName' || field === 'lastName') {
        delete nextErrors.username;
      }

      return nextErrors;
    });

    if (field === 'password' && typeof value === 'string') {
      void validatePassword(value);
    }
  };

  const passwordChecks = {
    length: formValues.password.length >= passwordLengthRange.min,
    uppercase: /[A-Z]/.test(formValues.password),
    number: /\d/.test(formValues.password),
    special: /[^\w\s]/.test(formValues.password),
  };

  const selectedCountry =
    phoneCountries.find((country) => country.code === formValues.countryCode) ?? phoneCountries[0];

  const handleFocusField = (field: FieldName) => () => setFocusedField(field);
  const handleBlurField = (field: FieldName) => () =>
    setFocusedField((current) => (current === field ? null : current));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateRegisterForm(formValues);
    setFieldErrors(nextErrors);
    setSubmitMessage('');

    if (Object.keys(nextErrors).length > 0) return;
    if (validation.disabled) return;

    setIsSubmitting(true);

    try {
      const payload = {
        first_name: formValues.firstName.trim(),
        last_name: formValues.lastName.trim(),
        phone_number: formValues.phoneNumber.trim()
          ? buildPhoneNumber(formValues.countryCode, formValues.phoneNumber)
          : '',
        email: formValues.email.trim().toLowerCase(),
        password: formValues.password,
        confirm_password: formValues.confirmPassword,
      };

      const response = await registerAccount(payload);
      const data = unwrapApiData(response.data) as {
        requires_email_verification?: boolean;
        next_step?: string;
        message?: string;
        verification_channel?: string;
        destination?: string;
      };

      savePendingOnboardingSession({
        email: payload.email,
        password: payload.password,
      });

      navigate(VERIFY_EMAIL_ROUTE, {
        replace: true,
        state: {
          email: payload.email,
          message:
            (data.verification_channel && data.destination
              ? `${data.message ?? 'Verification required.'} Channel: ${data.verification_channel}; destination: ${data.destination}.`
              : data.message) ??
            'Please verify your email address before continuing.',
          postLoginRedirect: postLoginRedirect ?? PERSONALIZE_ROUTE,
        },
      });
    } catch (error) {
      const isTimeoutError =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'ECONNABORTED';

      if (isTimeoutError) {
        setSubmitMessage('The registration request timed out. Please try again in a moment.');
        return;
      }

      const responseData = (error as { response?: { data?: unknown } })?.response?.data;
      const apiErrors = mapRegisterApiErrors(responseData);

      if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        return;
      }

      setSubmitMessage('We could not complete registration right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <Navbar showSignup={false} />

      <div className="register-back-row">
        <BackButton to="/" />
      </div>

      <main className="register-main" id="register">
        <section className="register-story">
          <div className="register-story-copy">
            <h1>
              <span className="register-story-title">Join League OS</span>
              <span>Be Part of Uganda's Game.</span>
            </h1>
            <p>
              Create your account and unlock the ultimate sports experience.
              Follow. Engage. Support.
            </p>
          </div>

          <div className="register-feature-list">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className={`register-feature ${feature.tone}`}>
                  <span className="feature-icon" aria-hidden="true">
                    <Icon className="feature-icon-svg" />
                  </span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="register-panel">
          <div className="register-panel-inner">
            <div className="register-panel-header">
              <div className="register-panel-copy">
                <h2>Create Your <span>Account</span></h2>
                <p>Join the League OS community and be part of the action.</p>
              </div>
            </div>

            <form className="register-form" onSubmit={handleSubmit} noValidate>
              <div className="field-grid">
                <label
                  className={fieldErrors.firstName ? 'has-error' : undefined}
                  htmlFor="register-first-name"
                >
                  <FieldLabel>First name</FieldLabel>
                  <div className="field-shell">
                    <FieldIcon><PersonOutlinedIcon /></FieldIcon>
                    <input
                      id="register-first-name"
                      name="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      autoComplete="given-name"
                      maxLength={nameMaxLength}
                      value={formValues.firstName}
                      onChange={(event) => updateField('firstName', event.target.value)}
                      onFocus={handleFocusField('firstName')}
                      onBlur={handleBlurField('firstName')}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={fieldErrors.firstName ? 'register-first-name-error' : 'register-first-name-hint'}
                    />
                  </div>
                  {fieldErrors.firstName ? (
                    <span id="register-first-name-error" className="field-error" role="alert">
                      {fieldErrors.firstName}
                    </span>
                  ) : focusedField === 'firstName' ? (
                    <FieldHint>
                      {firstNameLengthRange.min}–{firstNameLengthRange.max} characters
                    </FieldHint>
                  ) : null}
                </label>

                <label
                  className={fieldErrors.lastName ? 'has-error' : undefined}
                  htmlFor="register-last-name"
                >
                  <FieldLabel required={false}>Last name</FieldLabel>
                  <div className="field-shell">
                    <FieldIcon><PersonOutlinedIcon /></FieldIcon>
                    <input
                      id="register-last-name"
                      name="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      autoComplete="family-name"
                      maxLength={nameMaxLength}
                      value={formValues.lastName}
                      onChange={(event) => updateField('lastName', event.target.value)}
                      onFocus={handleFocusField('lastName')}
                      onBlur={handleBlurField('lastName')}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={fieldErrors.lastName ? 'register-last-name-error' : 'register-last-name-hint'}
                    />
                  </div>
                  {fieldErrors.lastName ? (
                    <span id="register-last-name-error" className="field-error" role="alert">
                      {fieldErrors.lastName}
                    </span>
                  ) : focusedField === 'lastName' ? (
                    <FieldHint>Optional</FieldHint>
                  ) : null}
                </label>
              </div>

              <label
                className={fieldErrors.username ? 'has-error' : undefined}
                htmlFor="register-username"
              >
                <FieldLabel>Username</FieldLabel>
                <div className="field-shell">
                  <FieldIcon><PersonOutlinedIcon /></FieldIcon>
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    autoComplete="username"
                    maxLength={usernameLengthRange.max}
                    value={formValues.username}
                    onChange={(event) => updateField('username', normalizeUsernameInput(event.target.value))}
                    onFocus={handleFocusField('username')}
                    onBlur={handleBlurField('username')}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? 'register-username-error' : 'register-username-hint'}
                  />
                </div>
                {fieldErrors.username ? (
                  <span id="register-username-error" className="field-error" role="alert">
                    {fieldErrors.username}
                  </span>
                ) : focusedField === 'username' ? (
                  <FieldHint>
                    {usernameLengthRange.min}–{usernameLengthRange.max} characters — letters, numbers, dots, and underscores only
                  </FieldHint>
                ) : null}
              </label>

              <label
                className={fieldErrors.phoneNumber ? 'has-error' : undefined}
                htmlFor="register-phone-number"
              >
                <FieldLabel>Phone number</FieldLabel>
                <div className="phone-input-group">
                  <div className="phone-country-select">
                    <span
                      className={`phone-country-flag fi fi-${selectedCountry.iso}`}
                      aria-hidden="true"
                    />
                    <select
                      className="phone-country"
                      id="register-country-code"
                      name="countryCode"
                      value={formValues.countryCode}
                      onChange={(event) => updateField('countryCode', event.target.value)}
                      aria-label="Country code"
                    >
                      {phoneCountries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.label} {country.code}
                        </option>
                      ))}
                    </select>
                    <span className="phone-country-chevron" aria-hidden="true">
                      <KeyboardArrowDownIcon />
                    </span>
                  </div>
                  <div className="phone-number-shell">
                    <FieldIcon><LocalPhoneOutlinedIcon /></FieldIcon>
                    <input
                      id="register-phone-number"
                      name="phoneNumber"
                      type="tel"
                      placeholder="7XX XXX XXX"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formValues.phoneNumber}
                      onChange={(event) => updateField('phoneNumber', normalizePhoneInput(event.target.value))}
                      onFocus={handleFocusField('phoneNumber')}
                      onBlur={handleBlurField('phoneNumber')}
                      aria-invalid={Boolean(fieldErrors.phoneNumber)}
                      aria-describedby={fieldErrors.phoneNumber ? 'register-phone-number-error' : 'register-phone-number-hint'}
                    />
                  </div>
                </div>
                {fieldErrors.phoneNumber ? (
                  <span id="register-phone-number-error" className="field-error" role="alert">
                    {fieldErrors.phoneNumber}
                  </span>
                ) : focusedField === 'phoneNumber' ? (
                  <FieldHint>
                    {phoneDigitLengthRange.min}–{phoneDigitLengthRange.max} digits, without the country code
                  </FieldHint>
                ) : null}
              </label>

              <label
                className={fieldErrors.email ? 'has-error' : undefined}
                htmlFor="register-email"
              >
                <FieldLabel>Email address</FieldLabel>
                <div className="field-shell">
                  <FieldIcon><MailOutlinedIcon /></FieldIcon>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={formValues.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  />
                </div>
                {fieldErrors.email ? (
                  <span id="register-email-error" className="field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                ) : null}
              </label>

              <label
                className={fieldErrors.password ? 'has-error' : undefined}
                htmlFor="register-password"
              >
                <FieldLabel>Password</FieldLabel>
                <div className="password-field">
                  <FieldIcon><LockOutlinedIcon /></FieldIcon>
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    value={formValues.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    onFocus={handleFocusField('password')}
                    onBlur={handleBlurField('password')}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'register-password-error' : 'register-password-hint'}
                  />
                  <button
                    type="button"
                    className="field-icon"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </button>
                </div>
                {!fieldErrors.password && focusedField === 'password' ? (
                  <div className="password-requirements" role="status">
                    <span className="password-requirements-label">Password must contain:</span>
                    <div className="password-requirements-list">
                      <PasswordRequirement
                        met={passwordChecks.length}
                        label={`${passwordLengthRange.min}+ characters`}
                      />
                      <PasswordRequirement met={passwordChecks.uppercase} label="Uppercase letter" />
                      <PasswordRequirement met={passwordChecks.number} label="Number" />
                      <PasswordRequirement met={passwordChecks.special} label="Special character" />
                    </div>
                  </div>
                ) : null}
                <PasswordStrengthIndicator
                  status={validation.status}
                  message={validation.message}
                  score={validation.score}
                />
                {fieldErrors.password ? (
                  <span id="register-password-error" className="field-error" role="alert">
                    {fieldErrors.password}
                  </span>
                ) : null}
              </label>

              <label
                className={fieldErrors.confirmPassword ? 'has-error' : undefined}
                htmlFor="register-confirm-password"
              >
                <FieldLabel>Confirm password</FieldLabel>
                <div className="password-field">
                  <FieldIcon><LockOutlinedIcon /></FieldIcon>
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    value={formValues.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                    onFocus={handleFocusField('confirmPassword')}
                    onBlur={handleBlurField('confirmPassword')}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : 'register-confirm-password-hint'}
                  />
                  <button
                    type="button"
                    className="field-icon"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <span id="register-confirm-password-error" className="field-error" role="alert">
                    {fieldErrors.confirmPassword}
                  </span>
                ) : focusedField === 'confirmPassword' ? (
                  <FieldHint>Must match the password above</FieldHint>
                ) : null}
              </label>

              <label className="terms-row">
                <input
                  type="checkbox"
                  checked={formValues.termsAccepted}
                  onChange={(event) => updateField('termsAccepted', event.target.checked)}
                  aria-invalid={Boolean(fieldErrors.termsAccepted)}
                  aria-describedby={fieldErrors.termsAccepted ? 'register-terms-error' : undefined}
                />
                <span>
                  I agree to the <a href="#register">Terms of Service</a> and{' '}
                  <a href="#register">Privacy Policy</a>.
                </span>
              </label>

              {fieldErrors.termsAccepted ? (
                <span id="register-terms-error" className="field-error terms-error" role="alert">
                  {fieldErrors.termsAccepted}
                </span>
              ) : null}

              {fieldErrors.form ? (
                <p className="register-form-message" role="alert">{fieldErrors.form}</p>
              ) : null}

              {submitMessage ? (
                <p className="register-form-message" role="alert">{submitMessage}</p>
              ) : null}

              <button
                type="submit"
                className={`button button-primary button-full register-submit ${isFormEmpty ? 'register-submit-empty' : ''}`.trim()}
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
              >
                {isSubmitting ? 'Signing Up...' : isFormEmpty ? 'Start Registration' : 'Sign Up'}
                <span className="button-arrow" aria-hidden="true">{'>'}</span>
              </button>

              <p className="register-footnote">
                Already have an account? <Link to="/login">Log In</Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
