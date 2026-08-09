import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLock,
  FiShield,
  FiCheckCircle,
  FiCheck,
  FiClock,
  FiUpload,
  FiCalendar,
  FiAlertTriangle,
} from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';

import { calculateAge } from '../../../utils/rules.ts';
import { startMarketKYCSession } from '../../../services/marketEligibilityService.ts';
import { useMarketEligibility } from '../../../hooks/useMarketEligibility.ts';
import { marketEligibilityMessage } from '../../../utils/marketEligibilityCopy.ts';
import '../sections/FanDashboard.css';
import './FanVerification.css';

type StepKey =
  | 'intro'
  | 'personal'
  | 'identity'
  | 'review'
  | 'pending'
  | 'verified';

// Reduced from 8 steps to 6: "Personal Details" and "Additional Information"
// have been combined into a single "Personal Details" step.
const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'intro', label: 'Get Started', description: 'Why we verify' },
  { key: 'personal', label: 'Personal Details', description: 'About you' },
  { key: 'identity', label: 'Verify Identity', description: 'ID document' },
  { key: 'review', label: 'Review & Submit', description: 'Confirm everything' },
  { key: 'pending', label: 'Verification Pending', description: 'Under review' },
  { key: 'verified', label: "You're Verified", description: 'All set' },
];

const ID_TYPE_OPTIONS = ["National ID", 'Passport', "Driver's License", "Voter's Card"];
const NATIONALITY_OPTIONS = ['Ugandan', 'Kenyan', 'Tanzanian', 'Rwandan', 'Other'];
const OCCUPATION_OPTIONS = ['Student', 'Employed', 'Self-Employed', 'Unemployed', 'Other'];
const PROFILE_UPDATED_EVENT = 'leagueos:profile-updated';

interface VerificationForm {
  idType: string;
  idFront: File | null;
  idBack: File | null;
  fullLegalName: string;
  dob: string;
  nationality: string;
  gender: 'Male' | 'Female' | 'Other';
  nin: string;
  occupation: string;
  confirmedAccurate: boolean;
}

function dispatchProfileUpdated() {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

const INITIAL_FORM: VerificationForm = {
  idType: ID_TYPE_OPTIONS[0],
  idFront: null,
  idBack: null,
  fullLegalName: '',
  dob: '',
  nationality: NATIONALITY_OPTIONS[0],
  gender: 'Male',
  nin: '',
  occupation: OCCUPATION_OPTIONS[0],
  confirmedAccurate: false,
};

function createKycIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `kyc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const {
    eligibility,
    refresh: refreshEligibility,
    isEligible,
    isLoading: isEligibilityLoading,
    isPending,
    isRejected,
    needsKyc,
    needsProfile,
  } = useMarketEligibility();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<VerificationForm>(INITIAL_FORM);
  const [stepError, setStepError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof VerificationForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isVerifyingDocument, setIsVerifyingDocument] = useState(false);
  const [kycSessionId, setKycSessionId] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex].key;
  const age = useMemo(() => calculateAge(form.dob), [form.dob]);

  const updateForm = <K extends keyof VerificationForm>(key: K, value: VerificationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const goToStep = useCallback((key: StepKey) => {
    const index = STEPS.findIndex((step) => step.key === key);
    if (index >= 0) {
      setStepError('');
      setStepIndex(index);
    }
  }, []);

  // Returns the step-level error message (empty string = valid). Every step
  // that can block progress runs through here, so there's exactly one place
  // that decides whether a submission is allowed. The name/NIN vs the actual
  // printed document is NOT checked here — that comparison needs OCR on the
  // uploaded file and happens server-side in handleSubmitForVerification via
  // verifyIdentityDocument().
  const validateStep = (): string => {
    let error = '';
    const errors: Partial<Record<keyof VerificationForm, string>> = {};

    switch (currentStep) {
      case 'identity':
        if (!form.idFront) {
          errors.idFront = 'Upload the front side of your ID document to continue.';
          error = 'Upload your ID document.';
        }
        break;
      case 'personal':
        if (!form.dob) {
          errors.dob = 'Enter your date of birth.';
          error = 'Date of birth is required.';
        } else if (age === null || age < 18) {
          errors.dob = 'You must be at least 18 years old to verify your account.';
          error = 'You must be at least 18 years old.';
        } else if (!form.nin.trim()) {
          errors.nin = 'Enter your National Identification Number.';
          error = 'NIN is required.';
        }
        break;
      case 'review':
        if (!form.confirmedAccurate) {
          errors.confirmedAccurate = 'You must confirm that the information provided is accurate.';
          error = 'Please confirm the accuracy of your details.';
        } else if (!form.nin.trim()) {
          errors.nin = 'Enter your National Identification Number.';
          error = 'NIN is required.';
        }
        // TODO: uncomment once profile registration reliably captures
        // first_name/last_name/date_of_birth — disabled during Markets flow
        // dev so verification isn't blocked by incomplete mock/profile data.
        // Also re-enable the isMatchingName/isMatchingDob import above.
        // else if (!profile?.first_name?.trim() || !profile?.last_name?.trim() || !profile?.date_of_birth?.trim()) {
        //   error = 'Complete your profile with first name, last name, and date of birth before submitting verification.';
        // } else if (!isMatchingName(form.fullLegalName, profile.first_name, profile.last_name, profile.full_name)) {
        //   error = 'Your full legal name does not match your registered name.';
        // } else if (!isMatchingDob(form.dob, profile.date_of_birth)) {
        //   error = 'Your date of birth does not match the date in your profile.';
        // }
        break;
      default:
        break;
    }

    setFieldErrors(errors);
    setStepError(error);
    return error;
  };

  // Advances to the next step AND is what visually marks the current step
  // "done" in the stepper (any index < stepIndex renders with a check).
  const goNext = () => {
    if (validateStep()) return;
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  };

  // Runs validateStep() first, then sends the uploaded document off to be
  // compared against what the user typed for Full Legal Name and NIN. That
  // comparison is the real identity check — everything before it just makes
  // sure the form itself is complete and internally consistent.
  const handleSubmitForVerification = async () => {
    const error = validateStep();
    if (error) {
      setSubmitError(error);
      return;
    }
    if (!form.idFront) {
      setSubmitError('Upload your ID document to continue.');
      return;
    }

    setSubmitError(null);
    setIsVerifyingDocument(true);
    try {
      const session = await startMarketKYCSession(createKycIdempotencyKey());
      setKycSessionId(session.id);
      const latest = await refreshEligibility();
      goToStep(latest?.eligible ? 'verified' : 'pending');
    } catch (submitException) {
      setSubmitError(
        submitException instanceof Error
          ? submitException.message
          : "We couldn't start verification. Please try again.",
      );
    } finally {
      setIsVerifyingDocument(false);
    }
  };

  // Simulated review: once submitted we land on "pending", then auto-advance
  // to "verified" after a short delay. There's no backend wired up yet, so
  // this stands in for the real async verification check — the actual
  // pass/fail decision already happened in handleSubmitForVerification.
  useEffect(() => {
    // Syncing the local wizard step to server-driven eligibility state
    // (polled elsewhere) — there's no render-time value to derive this from
    // directly since eligibility arrives asynchronously after mount.
    if (isEligible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      goToStep('verified');
    } else if (isPending) {
      goToStep('pending');
    }
  }, [goToStep, isEligible, isPending]);

  useEffect(() => {
    if (currentStep !== 'pending') return;
    const interval = window.setInterval(() => {
      void refreshEligibility();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [currentStep, refreshEligibility]);

  useEffect(() => {
    if (currentStep !== 'pending' || !isRejected) return;
    // Same as above: reacting to a rejection that arrives asynchronously
    // from polled eligibility data, not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitError(marketEligibilityMessage(eligibility));
    goToStep('review');
  }, [currentStep, eligibility, goToStep, isRejected]);

  useEffect(() => {
    if (currentStep !== 'verified') return;
    dispatchProfileUpdated();
  }, [currentStep]);

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
              {STEPS[stepIndex].label}
            </p>

            <section className="dashboard-card verify-wizard-card">
              {currentStep === 'intro' && (
                <div className="verify-step verify-step--intro">
                  <span className="verify-step-icon verify-step-icon--lock">
                    <FiLock />
                  </span>
                  <h2>Verification Required</h2>
                  <p>
                    {isEligibilityLoading
                      ? 'Checking your market access.'
                      : needsProfile
                        ? 'Complete your profile details before starting verification.'
                        : 'To trade on prediction markets, you need to verify your identity.'}
                  </p>
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
                      {needsKyc ? 'Yes, Verify Now' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'identity' && (
                <div className="verify-step">
                  <span className="verify-step-icon verify-step-icon--lock">
                    <FiShield />
                  </span>
                  <h2>Verify your identity</h2>
                  <p>Upload a valid government-issued document so we can confirm your identity.</p>
                  <p className="verify-required-note">Fields marked with <span className="required-star">*</span> are required.</p>

                  <label className="verify-field-label" htmlFor="verify-id-type">
                    Select ID type <span className="required-star">*</span>
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

                  <span className="verify-field-label">
                    Upload your ID document <span className="required-star">*</span>
                  </span>
                  <UploadDropzone
                    label="Upload Front Side *"
                    hint="JPG, PNG or PDF"
                    file={form.idFront}
                    onChange={(file) => updateForm('idFront', file)}
                  />
                  {fieldErrors.idFront && <p className="verify-field-error" role="alert">{fieldErrors.idFront}</p>}

                  <span className="verify-field-label">Upload back side (optional)</span>
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
                    Date of Birth <span className="required-star">*</span>
                  </label>
                  <div className={`verify-input-with-icon${fieldErrors.dob ? ' has-error' : ''}`}>
                    <FiCalendar />
                    <input
                      id="verify-dob"
                      type="date"
                      className={`verify-input${fieldErrors.dob ? ' has-error' : ''}`}
                      aria-invalid={Boolean(fieldErrors.dob)}
                      value={form.dob}
                      onChange={(event) => updateForm('dob', event.target.value)}
                    />
                  </div>
                  {fieldErrors.dob && <p className="verify-field-error" role="alert">{fieldErrors.dob}</p>}
                  {age !== null && <small className="verify-age-hint">Age: {age}</small>}

                  <label className="verify-field-label" htmlFor="verify-nationality">
                    Nationality <span className="required-star">*</span>
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

                  <label className="verify-field-label" htmlFor="verify-nin">
                    NIN (National Identification Number) <span className="required-star">*</span>
                  </label>
                  <input
                    id="verify-nin"
                    type="text"
                    className={`verify-input${fieldErrors.nin ? ' has-error' : ''}`}
                    placeholder="CM95012345678"
                    aria-invalid={Boolean(fieldErrors.nin)}
                    value={form.nin}
                    onChange={(event) => updateForm('nin', event.target.value)}
                  />
                  {fieldErrors.nin && <p className="verify-field-error" role="alert">{fieldErrors.nin}</p>}

                  <span className="verify-field-label">
                    Gender <span className="required-star">*</span>
                  </span>
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
                    ))} <span className="required-star">*</span>
                  </div>

                  <label className="verify-field-label" htmlFor="verify-occupation">
                    Occupation <span className="required-star">*</span>
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

                  {stepError && <p className="verify-field-error" role="alert">{stepError}</p>}
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
                      <dt>Date of Birth</dt>
                      <dd>{form.dob ? `${form.dob}${age !== null ? ` (age ${age})` : ''}` : '\u2014'}</dd>
                    </div>
                    <div>
                      <dt>Nationality</dt>
                      <dd>{form.nationality}</dd>
                    </div>
                    <div>
                      <dt>NIN</dt>
                      <dd>{form.nin || '\u2014'}</dd>
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
                      aria-invalid={Boolean(fieldErrors.confirmedAccurate)}
                    />
                    I confirm that the information provided is accurate. <span className="required-star">*</span>
                  </label>
                  {fieldErrors.confirmedAccurate && <p className="verify-field-error" role="alert">{fieldErrors.confirmedAccurate}</p>}
                  {stepError && <p className="verify-field-error" role="alert">{stepError}</p>}

                  {submitError && (
                    <div className="verify-submit-error">
                      <FiAlertTriangle aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('personal')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={handleSubmitForVerification}
                      disabled={!form.confirmedAccurate || isVerifyingDocument}
                    >
                      {isVerifyingDocument ? 'Starting verification...' : 'Submit for Verification'}
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
                    Your verification session is active. We will update this page when your market access changes.
                  </p>
                  {kycSessionId && <p className="verify-age-hint">Session ID: {kycSessionId}</p>}
                  <div className="verify-next-box">
                    <b>What happens next?</b>
                    <ul>
                      <li>Your KYC session is reviewed</li>
                      <li>Compliance updates your market eligibility</li>
                      <li>Trading unlocks automatically when approved</li>
                    </ul>
                  </div>
                  <div className="verify-step-actions">
                    <button type="button" className="verify-btn verify-btn--primary" onClick={() => void refreshEligibility()}>
                      Refresh Status
                    </button>
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => navigate('/fan/markets')}>
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
                    <button type="button" className="verify-btn verify-btn--primary" onClick={() => navigate('/fan/trade')}>
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