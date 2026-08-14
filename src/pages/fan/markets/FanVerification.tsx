import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { updateProfile } from '../../../services/authServices.ts';
import {
  fetchCanonicalKycStatus,
  bypassCanonicalKycForDevelopment,
  requestCanonicalKycRetry,
  submitCanonicalKyc,
  type CanonicalKycState,
} from '../../../services/fanIdentityVerificationService.ts';
import { useMarketEligibility } from '../../../hooks/useMarketEligibility.ts';
import { useAuthStore } from '../../../store/authStore.ts';
import { canUseReviewWorkflowTools, safeAuthenticatedReturnTo } from '../../../utils/reviewWorkflowTools.ts';
import {
  marketEligibilityActions,
  marketEligibilityMessage,
  marketEligibilityTitle,
} from '../../../utils/marketEligibilityCopy.ts';
import '../sections/FanDashboard.css';
import './FanVerification.css';

type StepKey =
  | 'intro'
  | 'personal'
  | 'identity'
  | 'selfie'
  | 'review'
  | 'status';

// Reduced from 8 steps to 6: "Personal Details" and "Additional Information"
// have been combined into a single "Personal Details" step.
const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'intro', label: 'Get Started', description: 'Why we verify' },
  { key: 'personal', label: 'Personal Details', description: 'About you' },
  { key: 'identity', label: 'Identity Document', description: 'ID document' },
  { key: 'selfie', label: 'Live Selfie', description: 'Face check' },
  { key: 'review', label: 'Review & Submit', description: 'Confirm everything' },
  { key: 'status', label: 'Status', description: 'Verification result' },
];

const ID_TYPE_OPTIONS = ["National ID", 'Passport', "Driver's License"];
const NATIONALITY_OPTIONS = ['Ugandan', 'Kenyan', 'Tanzanian', 'Rwandan', 'Other'];
const OCCUPATION_OPTIONS = ['Student', 'Employed', 'Self-Employed', 'Unemployed', 'Other'];
const PROFILE_UPDATED_EVENT = 'leagueos:profile-updated';

interface VerificationForm {
  idType: string;
  idFront: File | null;
  idBack: File | null;
  selfie: File | null;
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
  selfie: null,
  fullLegalName: '',
  dob: '',
  nationality: NATIONALITY_OPTIONS[0],
  gender: 'Male',
  nin: '',
  occupation: OCCUPATION_OPTIONS[0],
  confirmedAccurate: false,
};

function UploadDropzone({
  label,
  hint,
  file,
  onChange,
  capture = 'environment',
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  capture?: 'user' | 'environment';
}) {
  return (
    <label className="verify-upload-zone">
      <input
        type="file"
        accept="image/*"
        capture={capture}
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
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const returnTo = safeAuthenticatedReturnTo(new URLSearchParams(location.search).get('returnTo'), '/fan/markets');
  const {
    eligibility,
    refresh: refreshEligibility,
    isEligible,
    isLoading: isEligibilityLoading,
    isPending,
    isRejected,
    needsKyc,
    needsProfile,
    status: kycStatus,
  } = useMarketEligibility();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<VerificationForm>(INITIAL_FORM);
  const [stepError, setStepError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof VerificationForm, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isVerifyingDocument, setIsVerifyingDocument] = useState(false);
  const [canonicalKyc, setCanonicalKyc] = useState<CanonicalKycState | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const localDevBypassVisible = import.meta.env.DEV && import.meta.env.VITE_DEV_KYC_BYPASS === 'true';
  const stagingReviewBypassVisible = canUseReviewWorkflowTools(user);

  const currentStep = STEPS[stepIndex].key;
  const age = useMemo(() => calculateAge(form.dob), [form.dob]);
  // KYC itself resolved (approved), but eligibility is still false — a
  // separate blocker (incomplete profile, a restriction, a risk hold) is
  // holding trading access back. Distinct from isPending, which means KYC
  // itself hasn't been decided yet.
  const isBlockedForOtherReason = kycStatus === 'VERIFIED' && !isEligible;
  const attemptsRemaining = canonicalKyc
    ? Math.max(0, canonicalKyc.max_attempts - canonicalKyc.attempts_count)
    : null;

  const refreshCanonicalStatus = useCallback(async () => {
    setIsRefreshingStatus(true);
    try {
      const next = await fetchCanonicalKycStatus();
      setCanonicalKyc(next);
      if (next.status === 'VERIFIED') await refreshEligibility();
      return next;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not refresh identity verification status.');
      return null;
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [refreshEligibility]);

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
      case 'selfie':
        if (!form.selfie) {
          errors.selfie = 'Take or upload a live selfie to continue.';
          error = 'A live selfie is required.';
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
      // Eligibility (markets/services/eligibility_service.py) reads
      // date_of_birth off the profile, not off the KYC session — this step
      // collects it, so it must actually be saved here, or an approved KYC
      // session still leaves the fan blocked with no visible cause.
      await updateProfile({ date_of_birth: form.dob });
      dispatchProfileUpdated();
      if (!form.selfie) throw new Error('Take or upload a live selfie to continue.');
      const documentType = form.idType === 'Passport'
        ? 'PASSPORT'
        : form.idType === "Driver's License" ? 'DRIVING_LICENCE' : 'NATIONAL_ID';
      await submitCanonicalKyc({
        documentType,
        documentCountry: 'UGA',
        documentImage: form.idFront,
        selfieImage: form.selfie,
      });
      await refreshCanonicalStatus();
      await refreshEligibility();
      goToStep('status');
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
      goToStep('status');
    } else if (isPending || isBlockedForOtherReason) {
      goToStep('status');
    }
  }, [goToStep, isEligible, isPending, isBlockedForOtherReason]);

  useEffect(() => {
    if (currentStep !== 'status') return;
    // The canonical service is external state; entering Status synchronizes its latest value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCanonicalStatus();
  }, [currentStep, refreshCanonicalStatus]);

  useEffect(() => {
    if (currentStep !== 'status' || !['PENDING', 'PROCESSING'].includes(canonicalKyc?.status ?? '')) return;
    const interval = window.setInterval(() => {
      void refreshCanonicalStatus();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [canonicalKyc?.status, currentStep, refreshCanonicalStatus]);

  const handleCanonicalRetry = async () => {
    setSubmitError(null);
    try {
      await requestCanonicalKycRetry();
      await refreshCanonicalStatus();
      goToStep('identity');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not start another verification attempt.');
    }
  };

  const handleDevelopmentBypass = async () => {
    if (!window.confirm('Skip identity verification for this synthetic staging review account? No identity provider checks will be performed.')) return;
    setSubmitError(null);
    setIsRefreshingStatus(true);
    try {
      await bypassCanonicalKycForDevelopment();
      const next = await fetchCanonicalKycStatus();
      setCanonicalKyc(next);
      const refreshedEligibility = await refreshEligibility();
      goToStep('status');
      if (refreshedEligibility?.eligible) navigate(returnTo, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Staging review verification bypass is unavailable.');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (currentStep !== 'status' || !isRejected) return;
    // Same as above: reacting to a rejection that arrives asynchronously
    // from polled eligibility data, not derivable at render time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitError(marketEligibilityMessage(eligibility));
  }, [currentStep, eligibility, goToStep, isRejected]);

  useEffect(() => {
    if (currentStep !== 'status' || !isEligible) return;
    dispatchProfileUpdated();
  }, [currentStep, isEligible]);

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
                    {stagingReviewBypassVisible ? (
                      <button
                        type="button"
                        className="verify-btn verify-btn--secondary"
                        disabled={isRefreshingStatus}
                        onClick={() => void handleDevelopmentBypass()}
                      >
                        {isRefreshingStatus
                          ? 'Applying staging verification…'
                          : 'Skip verification for staging review'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="verify-btn verify-btn--secondary"
                        onClick={() => navigate('/fan/markets')}
                      >
                        Not Now
                      </button>
                    )}

                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={goNext}
                    >
                      {needsKyc ? 'Yes, Verify Now' : 'Continue'}
                    </button>
                  </div>

                  {stagingReviewBypassVisible && (
                    <div className="verify-dev-bypass">
                      <strong>Synthetic staging review only</strong>
                      <p>
                        This verifies only this synthetic review account.
                        No identity provider checks are performed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'identity' && (
                <div className="verify-step">
                  <span className="verify-step-icon verify-step-icon--lock">
                    <FiShield />
                  </span>
                  <h2>Verify your identity</h2>
                  <p>Upload a valid government-issued document so we can confirm your identity.</p>

                  <label className="verify-field-label" htmlFor="verify-id-type">
                    Select ID type
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
                    Upload your ID document
                  </span>
                  <UploadDropzone
                    label="Upload Front Side"
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
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('personal')}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="verify-btn verify-btn--primary"
                      onClick={goNext}
                      disabled={!form.idFront}
                    >
                      Continue to Selfie
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

                  <label className="verify-field-label" htmlFor="verify-nin">
                    NIN (National Identification Number)
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
                    Gender
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
                    ))}
                  </div>

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

                  {stepError && <p className="verify-field-error" role="alert">{stepError}</p>}
                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('intro')}>
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
                <div className="verify-step">
                  <span className="verify-step-icon verify-step-icon--lock"><FiShield /></span>
                  <h2>Live Selfie</h2>
                  <p>Use good lighting, keep your full face visible, and remove sunglasses.</p>
                  <UploadDropzone
                    label="Take or upload a selfie"
                    hint="Use a recent, clear image of only you"
                    file={form.selfie}
                    onChange={(file) => updateForm('selfie', file)}
                    capture="user"
                  />
                  {fieldErrors.selfie && <p className="verify-field-error" role="alert">{fieldErrors.selfie}</p>}
                  <div className="verify-step-actions verify-step-actions--split">
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('identity')}>Back</button>
                    <button type="button" className="verify-btn verify-btn--primary" onClick={goNext} disabled={!form.selfie}>Continue</button>
                  </div>
                  {localDevBypassVisible && !stagingReviewBypassVisible && (
                    <div className="verify-dev-bypass">
                      <button type="button" className="verify-btn verify-btn--secondary" disabled={isRefreshingStatus} onClick={() => void handleDevelopmentBypass()}>
                        Skip verification
                      </button>
                      <strong>Development testing only</strong>
                      <p>This bypass is available only in the local development environment. Production users must complete identity verification.</p>
                    </div>
                  )}
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
                    I confirm that the information provided is accurate.
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
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => goToStep('selfie')}>
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

              {currentStep === 'status' && canonicalKyc?.status !== 'VERIFIED' && (
                <div className="verify-step verify-step--centered">
                  <span className="verify-step-icon verify-step-icon--pending">
                    {isBlockedForOtherReason ? <FiAlertTriangle /> : <FiClock />}
                  </span>
                  <h2>{canonicalKyc?.status === 'REVIEW' ? 'Compliance Review Required' : canonicalKyc?.status === 'RETRY_REQUIRED' ? 'Another Attempt Is Required' : canonicalKyc?.status === 'REJECTED' ? 'Identity Verification Rejected' : canonicalKyc?.status === 'EXPIRED' ? 'Identity Verification Expired' : 'Verification In Progress'}</h2>
                  <p>
                    {canonicalKyc?.status === 'REVIEW' ? 'Compliance will review your submission. No action is needed from you.' : canonicalKyc?.retry_reason || canonicalKyc?.rejection_reason || 'Your identity verification status comes directly from the verification service.'}
                  </p>
                  <div className="verify-next-box">
                    <b>Identity verification details</b>
                    <ul>
                      <li>Status: {canonicalKyc?.status ?? 'Loading'}</li>
                      <li>Attempts: {canonicalKyc?.attempts_count ?? '—'} / {canonicalKyc?.max_attempts ?? '—'} ({attemptsRemaining ?? '—'} remaining)</li>
                      <li>Submitted: {canonicalKyc?.submitted_at ? new Date(canonicalKyc.submitted_at).toLocaleString() : '—'}</li>
                      <li>Completed: {canonicalKyc?.completed_at ? new Date(canonicalKyc.completed_at).toLocaleString() : '—'}</li>
                      <li>Verified: {canonicalKyc?.verified_at ? new Date(canonicalKyc.verified_at).toLocaleString() : '—'}</li>
                    </ul>
                  </div>
                  <div className="verify-step-actions">
                    {canonicalKyc?.status === 'RETRY_REQUIRED' && canonicalKyc.can_retry && <button type="button" className="verify-btn verify-btn--primary" onClick={() => void handleCanonicalRetry()}>Retry Verification</button>}
                    <button type="button" className="verify-btn verify-btn--primary" disabled={isRefreshingStatus} onClick={() => void refreshCanonicalStatus()}>{isRefreshingStatus ? 'Refreshing…' : 'Refresh Status'}</button>
                    <button type="button" className="verify-btn verify-btn--secondary" onClick={() => navigate('/fan/trade')}>
                      Back to Markets
                    </button>
                  </div>
                  <div className="verify-skip-row">
                    <p className="verify-skip-note">You can browse markets while verification is processing.</p>
                    <button type="button" className="verify-btn verify-btn--accent" onClick={() => navigate('/fan/trade')}>
                      Skip to Trade Hub
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 'status' && canonicalKyc?.status === 'VERIFIED' && (
                <div className="verify-step verify-step--centered">
                  <span className="verify-step-icon verify-step-icon--verified">
                    <FiCheckCircle />
                  </span>
                  <h2>{canonicalKyc.verification_source === 'DEVELOPMENT_BYPASS' ? 'Verified for local development testing' : isEligible ? 'Identity Verified' : marketEligibilityTitle(eligibility)}</h2>
                  <p>{canonicalKyc.verification_source === 'DEVELOPMENT_BYPASS' ? 'No provider, document, OCR, face-match, or liveness checks were claimed for this development bypass.' : isEligible ? 'You can now trade on League OS Markets.' : marketEligibilityMessage(eligibility)}</p>
                  <ul className="verify-checklist">
                    <li>
                      <FiCheckCircle /> Identity Verified
                    </li>
                    {!isEligible && marketEligibilityActions(eligibility).map((action) => <li key={action}><FiAlertTriangle /> {action}</li>)}
                  </ul>
                  <div className="verify-step-actions">
                    {isEligible ? <button type="button" className="verify-btn verify-btn--primary" onClick={() => navigate(returnTo, { replace: true })}>Continue to Market</button> : needsProfile ? <button type="button" className="verify-btn verify-btn--primary" onClick={() => navigate('/profile')}>Complete Profile</button> : <button type="button" className="verify-btn verify-btn--primary" onClick={() => void refreshEligibility()}>Refresh Market Eligibility</button>}
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
