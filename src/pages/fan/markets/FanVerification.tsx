import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLock,
  FiShield,
  FiCheckCircle,
  FiCheck,
  FiCamera,
  FiClock,
  FiUpload,
  FiCalendar,
  FiAlertTriangle,
} from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useIdentityVerificationStore } from '../../../store/identityVerificationStore';
import '../sections/FanDashboard.css';
import './FanVerification.css';

type StepKey =
  | 'intro'
  | 'identity'
  | 'personal'
  | 'selfie'
  | 'review'
  | 'pending'
  | 'verified';

// Reduced from 8 steps to 7: "Personal Details" and "Additional Information"
// have been combined into a single "Personal Details" step.
const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'intro', label: 'Get Started', description: 'Why we verify' },
  { key: 'identity', label: 'Verify Identity', description: 'ID document' },
  { key: 'personal', label: 'Personal Details', description: 'About you' },
  { key: 'selfie', label: 'Selfie Verification', description: 'Prove it\u2019s you' },
  { key: 'review', label: 'Review & Submit', description: 'Confirm everything' },
  { key: 'pending', label: 'Verification Pending', description: 'Under review' },
  { key: 'verified', label: "You're Verified", description: 'All set' },
];

const ID_TYPE_OPTIONS = ["National ID", 'Passport', "Driver's License", "Voter's Card"];
const COUNTRY_OPTIONS = ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Other'];
const NATIONALITY_OPTIONS = ['Ugandan', 'Kenyan', 'Tanzanian', 'Rwandan', 'Other'];
const OCCUPATION_OPTIONS = ['Student', 'Employed', 'Self-Employed', 'Unemployed', 'Other'];
const SOURCE_OF_FUNDS_OPTIONS = ['Employment', 'Business', 'Investments', 'Savings', 'Other'];
const INCOME_RANGE_OPTIONS = ['Under 1M UGX', '1M \u2013 2M UGX', '2M \u2013 5M UGX', '5M \u2013 10M UGX', 'Above 10M UGX'];

interface VerificationForm {
  idType: string;
  idFront: File | null;
  idBack: File | null;
  fullLegalName: string;
  dob: string;
  country: string;
  nationality: string;
  gender: 'Male' | 'Female' | 'Other';
  nin: string;
  occupation: string;
  sourceOfFunds: string;
  incomeRange: string;
  selfie: File | null;
  confirmedAccurate: boolean;
}

const INITIAL_FORM: VerificationForm = {
  idType: ID_TYPE_OPTIONS[0],
  idFront: null,
  idBack: null,
  fullLegalName: '',
  dob: '',
  country: COUNTRY_OPTIONS[0],
  nationality: NATIONALITY_OPTIONS[0],
  gender: 'Male',
  nin: '',
  occupation: OCCUPATION_OPTIONS[0],
  sourceOfFunds: SOURCE_OF_FUNDS_OPTIONS[0],
  incomeRange: INCOME_RANGE_OPTIONS[2],
  selfie: null,
  confirmedAccurate: false,
};

const MINIMUM_TRADING_AGE = 18;

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function namesMatch(idName: string, registeredName: string): boolean {
  const normalizedId = normalizeName(idName);
  const normalizedRegistered = normalizeName(registeredName);
  return normalizedId.length > 0 && normalizedId === normalizedRegistered;
}

function UploadDropzone({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="verify-upload-zone">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="verify-upload-icon">
        <FiUpload />
      </span>
      <b>{file ? file.name : label}</b>
      <small>{file ? 'Tap to replace' : hint}</small>
    </label>
  );
}

function FanVerification() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const setVerified = useIdentityVerificationStore((state) => state.setVerified);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<VerificationForm>(INITIAL_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = STEPS[stepIndex].key;

  const updateForm = <K extends keyof VerificationForm>(key: K, value: VerificationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const goToStep = (key: StepKey) => {
    const index = STEPS.findIndex((step) => step.key === key);
    if (index >= 0) setStepIndex(index);
  };

  // Advances to the next step AND is what visually marks the current step
  // "done" in the stepper (any index < stepIndex renders with a check).
  const goNext = () => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));

  // The only two real checks this mock can perform without a backend: the
  // legal name given here has to match the registered account name, and the
  // fan has to be old enough to trade. Both are required to proceed past
  // review — this is what makes the gate elsewhere in the app meaningful
  // rather than a rubber stamp.
  const handleSubmitForVerification = () => {
    const age = calculateAge(form.dob);
    if (age === null || age < MINIMUM_TRADING_AGE) {
      setSubmitError(`You must be ${MINIMUM_TRADING_AGE} or older to trade on League OS.`);
      return;
    }
    if (!namesMatch(form.fullLegalName, currentUser.name)) {
      setSubmitError(
        `The name you entered doesn't match your registered account name (${currentUser.name}). Please double-check it matches your ID exactly.`,
      );
      return;
    }
    setSubmitError(null);
    goToStep('pending');
  };

  // Simulated review: once submitted we land on "pending", then auto-advance
  // to "verified" after a short delay. There's no backend wired up yet, so
  // this stands in for the real async verification check — the actual
  // pass/fail decision already happened in handleSubmitForVerification.
  useEffect(() => {
    if (currentStep !== 'pending') return;
    pendingTimeoutRef.current = setTimeout(() => {
      setVerified();
      goToStep('verified');
    }, 4000);
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, [currentStep, setVerified]);

  const stepNumber = stepIndex + 1;
  const age = useMemo(() => calculateAge(form.dob), [form.dob]);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content verify-page">
          <div className="verify-wizard-content">
            <div className="verify-wizard-head">
              <h1>Identity Verification</h1>
              <p>Complete every step to unlock full trading limits and withdrawals.</p>
            </div>

            {/* Horizontal, left-to-right stepper. Completed steps get a
                checkmark and turn green; the current step is highlighted. */}
            <nav className="verify-wizard-stepper" aria-label="Verification progress">
              {STEPS.map((step, index) => {
                const isDone = index < stepIndex;
                const isActive = index === stepIndex;
                return (
                  <span className="verify-wizard-stepper-item" key={step.key}>
                    <span
                      className={
                        'verify-wizard-stepper-label' +
                        (isDone ? ' done' : '') +
                        (isActive ? ' active' : '')
                      }
                    >
                      {isDone ? (
                        <FiCheck aria-hidden="true" />
                      ) : (
                        <span className="verify-wizard-stepper-index">({index + 1})</span>
                      )}
                      {step.label}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span className="verify-wizard-stepper-arrow" aria-hidden="true">
                        &rarr;
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
            <p className="verify-wizard-step-count">
              Step {stepNumber} of {STEPS.length}: {STEPS[stepIndex].label}
            </p>

            <section className="dashboard-card verify-wizard-card">
              {currentStep === 'intro' && (
                <div className="verify-step verify-step--intro">
                  <span className="verify-step-icon verify-step-icon--lock">
                    <FiLock />
                  </span>
                  <h2>Verification Required</h2>
                  <p>To trade on prediction markets, you need to verify your identity.</p>
                  <ul className="verify-checklist">
                    <li>
                      <FiCheckCircle /> Secure &amp; Safe Trading
                    </li>
                    <li>
                      <FiCheckCircle /> Higher Limits
                    </li>
                    <li>
                      <FiCheckCircle /> Withdraw Earnings
                    </li>
                  </ul>
                  <p className="verify-step-prompt">Do you want to verify now?</p>
                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => navigate(-1)}>
                      Not Now
                    </button>
                    <button type="button" className="verify-btn verify-btn--primary" onClick={goNext}>
                      Yes, Verify Now
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'identity' && (
                <div className="verify-step">
                  <span className="verify-step-icon verify-step-icon--lock">
                    <FiShield />
                  </span>
                  <h2>Let&apos;s verify your identity</h2>
                  <p>We need to confirm your identity to keep the platform secure.</p>

                  <label className="verify-field-label" htmlFor="verify-id-type">
                    ID Type
                  </label>
                  <select
                    id="verify-id-type"
                    className="verify-select"
                    value={form.idType}
                    onChange={(event) => updateForm('idType', event.target.value)}
                  >
                    {ID_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <span className="verify-field-label">Upload ID Document</span>
                  <UploadDropzone
                    label="Upload Front Side"
                    hint="JPG, PNG or PDF"
                    file={form.idFront}
                    onChange={(file) => updateForm('idFront', file)}
                  />

                  <span className="verify-field-label">Upload Back Side (Optional)</span>
                  <UploadDropzone
                    label="Upload Back Side"
                    hint="JPG, PNG or PDF"
                    file={form.idBack}
                    onChange={(file) => updateForm('idBack', file)}
                  />

                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('intro')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={goNext}
                      disabled={!form.idFront}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'personal' && (
                <div className="verify-step">
                  <h2>Tell us more about you</h2>
                  <p>Please provide your personal details.</p>

                  <label className="verify-field-label" htmlFor="verify-full-name">
                    Full Legal Name (as it appears on your ID)
                  </label>
                  <input
                    id="verify-full-name"
                    type="text"
                    className="verify-input"
                    placeholder="e.g. Nakato Grace"
                    value={form.fullLegalName}
                    onChange={(event) => updateForm('fullLegalName', event.target.value)}
                  />

                  <label className="verify-field-label" htmlFor="verify-dob">
                    Date of Birth
                  </label>
                  <div className="verify-input-with-icon">
                    <FiCalendar />
                    <input
                      id="verify-dob"
                      type="date"
                      className="verify-input"
                      value={form.dob}
                      onChange={(event) => updateForm('dob', event.target.value)}
                    />
                  </div>
                  {age !== null && <small className="verify-age-hint">Age: {age}</small>}

                  <label className="verify-field-label" htmlFor="verify-country">
                    Country
                  </label>
                  <select
                    id="verify-country"
                    className="verify-select"
                    value={form.country}
                    onChange={(event) => updateForm('country', event.target.value)}
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <label className="verify-field-label" htmlFor="verify-nationality">
                    Nationality
                  </label>
                  <select
                    id="verify-nationality"
                    className="verify-select"
                    value={form.nationality}
                    onChange={(event) => updateForm('nationality', event.target.value)}
                  >
                    {NATIONALITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <span className="verify-field-label">Gender</span>
                  <div className="verify-pill-group" role="radiogroup" aria-label="Gender">
                    {(['Male', 'Female', 'Other'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={form.gender === option}
                        className={`verify-pill${form.gender === option ? ' active' : ''}`}
                        onClick={() => updateForm('gender', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <label className="verify-field-label" htmlFor="verify-nin">
                    NIN (National Identification Number)
                  </label>
                  <input
                    id="verify-nin"
                    type="text"
                    className="verify-input"
                    placeholder="CM95012345678"
                    value={form.nin}
                    onChange={(event) => updateForm('nin', event.target.value)}
                  />

                  <label className="verify-field-label" htmlFor="verify-occupation">
                    Occupation
                  </label>
                  <select
                    id="verify-occupation"
                    className="verify-select"
                    value={form.occupation}
                    onChange={(event) => updateForm('occupation', event.target.value)}
                  >
                    {OCCUPATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <label className="verify-field-label" htmlFor="verify-source-of-funds">
                    Source of Funds
                  </label>
                  <select
                    id="verify-source-of-funds"
                    className="verify-select"
                    value={form.sourceOfFunds}
                    onChange={(event) => updateForm('sourceOfFunds', event.target.value)}
                  >
                    {SOURCE_OF_FUNDS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <label className="verify-field-label" htmlFor="verify-income-range">
                    Annual Income Range
                  </label>
                  <select
                    id="verify-income-range"
                    className="verify-select"
                    value={form.incomeRange}
                    onChange={(event) => updateForm('incomeRange', event.target.value)}
                  >
                    {INCOME_RANGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('identity')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={goNext}
                      disabled={!form.fullLegalName.trim() || !form.dob || !form.nin}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'selfie' && (
                <div className="verify-step verify-step--centered">
                  <h2>Take a selfie</h2>
                  <p>This helps us verify that you are a real person.</p>

                  <label className="verify-selfie-zone">
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(event) => updateForm('selfie', event.target.files?.[0] ?? null)}
                    />
                    {form.selfie ? (
                      <img
                        className="verify-selfie-preview"
                        src={URL.createObjectURL(form.selfie)}
                        alt="Selfie preview"
                      />
                    ) : (
                      <FiCamera />
                    )}
                  </label>
                  <small>{form.selfie ? 'Tap to retake' : 'Click to take selfie or upload photo'}</small>

                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('personal')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={goNext}
                      disabled={!form.selfie}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'review' && (
                <div className="verify-step">
                  <h2>Review your information</h2>
                  <p>Please confirm your details before submitting.</p>

                  <dl className="verify-review-list">
                    <div>
                      <dt>Full Legal Name</dt>
                      <dd>{form.fullLegalName || '\u2014'}</dd>
                    </div>
                    <div>
                      <dt>ID Type</dt>
                      <dd>{form.idType}</dd>
                    </div>
                    <div>
                      <dt>NIN</dt>
                      <dd>{form.nin || '\u2014'}</dd>
                    </div>
                    <div>
                      <dt>Date of Birth</dt>
                      <dd>{form.dob ? `${form.dob}${age !== null ? ` (age ${age})` : ''}` : '\u2014'}</dd>
                    </div>
                    <div>
                      <dt>Country</dt>
                      <dd>{form.country}</dd>
                    </div>
                    <div>
                      <dt>Occupation</dt>
                      <dd>{form.occupation}</dd>
                    </div>
                  </dl>

                  <label className="verify-confirm-checkbox">
                    <input
                      type="checkbox"
                      checked={form.confirmedAccurate}
                      onChange={(event) => updateForm('confirmedAccurate', event.target.checked)}
                    />
                    I confirm that the information provided is accurate.
                  </label>

                  {submitError && (
                    <div className="verify-submit-error">
                      <FiAlertTriangle aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('selfie')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={handleSubmitForVerification}
                      disabled={!form.confirmedAccurate}
                    >
                      Submit for Verification
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'pending' && (
                <div className="verify-step verify-step--centered">
                  <span className="verify-step-icon verify-step-icon--pending">
                    <FiClock />
                  </span>
                  <h2>Verification Under Review</h2>
                  <p>
                    We are verifying your information. This usually takes a few minutes. You will be notified once
                    your account is verified.
                  </p>
                  <div className="verify-next-box">
                    <b>What happens next?</b>
                    <ul>
                      <li>We verify your documents</li>
                      <li>You get full trading access</li>
                      <li>Higher limits &amp; withdrawals</li>
                    </ul>
                  </div>
                  <div className="verify-step-actions">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => navigate('/markets')}>
                      Back to Markets
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'verified' && (
                <div className="verify-step verify-step--centered">
                  <span className="verify-step-icon verify-step-icon--verified">
                    <FiCheckCircle />
                  </span>
                  <h2>You&apos;re Verified!</h2>
                  <p>You can now trade, deposit funds and withdraw your winnings.</p>
                  <ul className="verify-checklist">
                    <li>
                      <FiCheckCircle /> Identity Verified
                    </li>
                    <li>
                      <FiCheckCircle /> Higher Limits Unlocked
                    </li>
                    <li>
                      <FiCheckCircle /> Withdraw Earnings
                    </li>
                  </ul>
                  <div className="verify-step-actions">
                    <button type="button" className="verify-btn verify-btn--primary" onClick={() => navigate('/markets')}>
                      Go to Markets
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanVerification;
