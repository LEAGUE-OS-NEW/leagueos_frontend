import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiSearch,
  FiX,
} from "react-icons/fi";
import "./FanOnboarding.css";
import {
  getOnboardingStatus,
  getCountries,
  getSports,
  getCompetitions,
  getClubs,
  selectCountry,
  selectSports,
  selectCompetitions,
  selectClubs,
  skipOnboardingStep,
  completeOnboarding,
  extractApiError,
  type OnboardingCountry,
  type OnboardingSport,
  type OnboardingCompetition,
  type OnboardingClub,
  type OnboardingStepKey,
} from "../../../services/onboardingService";

/* =============================================================================
   TYPES
   ============================================================================= */

// Sport IDs are now backend UUIDs, not a fixed union.
type SportId = string;

interface ComboboxOption {
  value: string;
  label: string;
  image?: string;
}

/** The seven screens of the flow, in order. */
type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STEP_WELCOME: StepId = 0;
const STEP_COUNTRY: StepId = 1;
const STEP_SPORTS: StepId = 2;
const STEP_COMPETITIONS: StepId = 3;
const STEP_CLUBS: StepId = 4;
const STEP_SUMMARY: StepId = 5;
const STEP_SUCCESS: StepId = 6;

/** Maps each personalization step to the backend step key for skip/submit. */
const STEP_KEY_MAP: Partial<Record<StepId, OnboardingStepKey>> = {
  [STEP_COUNTRY]:      "COUNTRY",
  [STEP_SPORTS]:       "SPORTS",
  [STEP_COMPETITIONS]: "COMPETITIONS",
  [STEP_CLUBS]:        "CLUBS",
};

/** Labels for the 5 "personalization" steps shown in the progress bar. */
const PROGRESS_LABELS = ["Country", "Sports", "Competitions", "Clubs", "Summary"];

const DASHBOARD_ROUTE = "/dashboard/fan";

/* =============================================================================
   SHARED: Chip
   ============================================================================= */

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="chip">
    {label}
    <button type="button" className="chip-remove" onClick={onRemove} aria-label={`Remove ${label}`}>
      <FiX size={12} />
    </button>
  </span>
);

/* =============================================================================
   SHARED: SearchableSelect
   ============================================================================= */

interface SearchableSelectProps {
  id: string;
  options: ComboboxOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  multiple: boolean;
  placeholder: string;
  emptyMessage?: string;
}

const SearchableSelect = ({
  id,
  options,
  selectedValues,
  onToggle,
  multiple,
  placeholder,
  emptyMessage = "No results found.",
}: SearchableSelectProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  const selectedOptions = options.filter((o) => selectedValues.includes(o.value));

  const handleSelect = (value: string) => {
    onToggle(value);
    if (!multiple) {
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!multiple) setQuery("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0].value);
    } else if (e.key === "ArrowDown") {
      setIsOpen(true);
    }
  };

  const inputValue =
    !multiple && !isOpen && selectedOptions[0] ? selectedOptions[0].label : query;

  return (
    <div className="combobox" ref={wrapperRef}>
      {multiple && selectedOptions.length > 0 && (
        <div className="chip-row">
          {selectedOptions.map((o) => (
            <Chip key={o.value} label={o.label} onRemove={() => onToggle(o.value)} />
          ))}
        </div>
      )}

      <div className="combobox-input-wrap">
        {!multiple && selectedOptions[0]?.image && !isOpen ? (
          <img
            src={selectedOptions[0].image}
            alt="flag"
            className="combobox-selected-flag"
          />
        ) : (
          <FiSearch size={16} className="combobox-icon" aria-hidden="true" />
        )}
        <input
          id={id}
          type="text"
          className="combobox-input"
          value={inputValue}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div className="combobox-panel" id={`${id}-panel`} role="listbox">
          {filtered.length === 0 ? (
            <p className="combobox-empty">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={"combobox-option" + (isSelected ? " combobox-option--selected" : "")}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="option-content">
                    {option.image && (
                      <img
                        src={option.image}
                        alt={`${option.label} flag`}
                        className="option-flag"
                      />
                    )}
                    {option.label}
                  </span>
                  {isSelected && <FiCheck size={14} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

/* =============================================================================
   PROGRESS BAR
   ============================================================================= */

interface ProgressBarProps {
  currentPersonalizationStep: number;
}

const ProgressBar = ({ currentPersonalizationStep }: ProgressBarProps) => {
  const total = PROGRESS_LABELS.length;
  const percent = (currentPersonalizationStep / total) * 100;

  return (
    <div className="progress-wrap" aria-label="Onboarding progress">
      <div className="progress-meta">
        <span>
          Step {currentPersonalizationStep} of {total}
        </span>
        <span>{PROGRESS_LABELS[currentPersonalizationStep - 1]}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

/* =============================================================================
   STEP 1: WELCOME
   ============================================================================= */

interface StepWelcomeProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const StepWelcome = ({ onGetStarted, onSkip }: StepWelcomeProps) => (
  <div className="step-panel step-panel--centered">
    <div className="welcome-logo">
      <img src="/logos/league-os-horizontal.png" alt="League OS logo" />
    </div>
    <h1 className="welcome-title">Welcome to League OS</h1>
    <p className="welcome-description">
      Let's personalize your dashboard, fixtures, fantasy competitions, news feed and
      notifications. It only takes a minute — and you can always change your preferences later.
    </p>
    <div className="welcome-actions">
      <button type="button" className="btn btn--primary btn--large" onClick={onGetStarted}>
        Get Started
        <FiArrowRight size={16} />
      </button>
      <button type="button" className="btn btn--ghost1" onClick={onSkip}>
        Skip for now
      </button>
    </div>
  </div>
);

/* =============================================================================
   STEP 2: COUNTRY
   Now receives API-loaded countries as `options`.
   ============================================================================= */

interface StepCountryProps {
  country: string | null;
  toggleCountry: (code: string) => void;
  showValidation: boolean;
  options: ComboboxOption[];
}

const StepCountry = ({ country, toggleCountry, showValidation, options }: StepCountryProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Where do you follow sport from?</h2>
      <p>This helps us prioritize your local leagues and kickoff times.</p>
    </header>
    <SearchableSelect
      id="country-select"
      options={options}
      selectedValues={country ? [country] : []}
      onToggle={toggleCountry}
      multiple={false}
      placeholder="Search countries…"
      emptyMessage="No countries found."
    />
    {showValidation && !country && (
      <p className="field-error">Please select your country to continue.</p>
    )}
  </div>
);

/* =============================================================================
   STEP 3: SPORTS
   Now receives API-loaded sports as `options`.
   ============================================================================= */

interface StepSportsProps {
  sports: SportId[];
  toggleSport: (id: SportId) => void;
  showValidation: boolean;
  options: ComboboxOption[];
}

const StepSports = ({ sports, toggleSport, showValidation, options }: StepSportsProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Which sports do you follow?</h2>
      <p>Pick at least one — your dashboard and news feed will follow suit.</p>
    </header>
    <SearchableSelect
      id="sports-select"
      options={options}
      selectedValues={sports}
      onToggle={(value) => toggleSport(value)}
      multiple
      placeholder="Search sports…"
      emptyMessage="No sports found."
    />
    <p className="dropdown-hint">Click to select — click again to remove.</p>
    {showValidation && sports.length === 0 && (
      <p className="field-error">Please select at least one sport to continue.</p>
    )}
  </div>
);

/* =============================================================================
   STEP 4: COMPETITIONS
   Now receives API-loaded (and sport-filtered) competitions as `options`.
   ============================================================================= */

interface StepCompetitionsProps {
  competitions: string[];
  toggleCompetition: (id: string) => void;
  showValidation: boolean;
  options: ComboboxOption[];
}

const StepCompetitions = ({
  competitions,
  toggleCompetition,
  showValidation,
  options,
}: StepCompetitionsProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Favorite competitions</h2>
      <p>Based on the sports you picked — choose the competitions you follow closely.</p>
    </header>
    <SearchableSelect
      id="competitions-select"
      options={options}
      selectedValues={competitions}
      onToggle={toggleCompetition}
      multiple
      placeholder="Search competitions…"
      emptyMessage="No competitions found."
    />
    <p className="dropdown-hint">Click to select — click again to remove.</p>
    {showValidation && competitions.length === 0 && (
      <p className="field-error">Please select at least one competition to continue.</p>
    )}
  </div>
);

/* =============================================================================
   STEP 5: CLUBS
   Now receives API-loaded (and competition-filtered) clubs as `options`.
   ============================================================================= */

interface StepClubsProps {
  clubs: string[];
  toggleClub: (id: string) => void;
  showValidation: boolean;
  options: ComboboxOption[];
}

const StepClubs = ({ clubs, toggleClub, showValidation, options }: StepClubsProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Favorite clubs</h2>
      <p>Pick the clubs you never miss.</p>
    </header>
    <SearchableSelect
      id="clubs-select"
      options={options}
      selectedValues={clubs}
      onToggle={toggleClub}
      multiple
      placeholder="Search clubs…"
      emptyMessage="No clubs found."
    />
    <p className="dropdown-hint">Click to select — click again to remove.</p>
    {showValidation && clubs.length === 0 && (
      <p className="field-error">Please select at least one club to continue.</p>
    )}
  </div>
);

/* =============================================================================
   STEP 6: SUMMARY
   Now receives resolved name strings from the wizard (no static lookup needed).
   ============================================================================= */

interface StepSummaryProps {
  countryName: string | null;
  countryFlag: string | null;
  sportNames: string[];
  competitionNames: string[];
  clubNames: string[];
  onComplete: () => void;
}

const StepSummary = ({
  countryName,
  countryFlag,
  sportNames,
  competitionNames,
  clubNames,
  onComplete,
}: StepSummaryProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Your Preferences</h2>
      <p>Here's what we'll use to personalize League OS for you.</p>
    </header>

    <div className="summary-card">
      <h3>Your Preferences</h3>
      <p>
        <strong>Country:</strong>
        {countryName ? (
          <span className="summary-country">
            {countryFlag && (
              <img
                src={countryFlag}
                alt={`${countryName} flag`}
                className="summary-country-flag"
              />
            )}
            {countryName}
          </span>
        ) : (
          " Not set"
        )}
      </p>
      <p>
        <strong>Sports:</strong>{" "}
        {sportNames.length > 0 ? sportNames.join(", ") : "Not set"}
      </p>
      <p>
        <strong>Competitions:</strong>{" "}
        {competitionNames.length > 0 ? competitionNames.join(", ") : "Not set"}
      </p>
      <p>
        <strong>Clubs:</strong>{" "}
        {clubNames.length > 0 ? clubNames.join(", ") : "Not set"}
      </p>
    </div>

    <div className="summary-footnote">
      <FiCheckCircle size={16} />
      <span>You can update any of this later from your profile settings.</span>
    </div>

    <div className="personalization-actions">
      <button type="button" className="btn btn--primary btn--large" onClick={onComplete}>
        Complete Setup
        <FiCheck size={16} />
      </button>
    </div>
  </div>
);

/* =============================================================================
   STEP 7: SUCCESS
   ============================================================================= */

interface StepSuccessProps {
  onGoToDashboard: () => void;
}

const StepSuccess = ({ onGoToDashboard }: StepSuccessProps) => (
  <div className="step-panel step-panel--centered">
    <div className="success-icon" aria-hidden="true">
      <FiCheckCircle size={40} />
    </div>
    <h1 className="welcome-title">You're All Set!</h1>
    <p className="welcome-description">
      Your League OS dashboard, fixtures, and news feed are now personalized to your picks.
      You can fine-tune any of this later from your profile settings.
    </p>
    <div className="welcome-actions">
      <button type="button" className="btn btn--primary btn--large" onClick={onGoToDashboard}>
        Go to Dashboard
        <FiArrowRight size={16} />
      </button>
    </div>
  </div>
);

/* =============================================================================
   MAIN WIZARD
   ============================================================================= */

const FanOnboarding = () => {
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<StepId>(STEP_WELCOME);
  const [country, setCountry] = useState<string | null>(null);
  const [sports, setSports] = useState<SportId[]>([]);
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  // ── Catalogue data from API ───────────────────────────────────────────────
  const [apiCountries, setApiCountries] = useState<OnboardingCountry[]>([]);
  const [apiSports, setApiSports] = useState<OnboardingSport[]>([]);
  const [apiCompetitions, setApiCompetitions] = useState<OnboardingCompetition[]>([]);
  const [apiClubs, setApiClubs] = useState<OnboardingClub[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  // ── Load onboarding status + initial catalogue on mount ───────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setCatalogueLoading(true);
      try {
        // Load status and base catalogues in parallel.
        const [status, countries, sportsData] = await Promise.all([
          getOnboardingStatus(),
          getCountries(),
          getSports(),
        ]);

        if (cancelled) return;

        setApiCountries(countries);
        setApiSports(sportsData);

        // If onboarding is already completed, go straight to the dashboard.
        if (status.completed) {
          navigate(DASHBOARD_ROUTE, { replace: true });
          return;
        }

        // Restore previously saved selections.
        if (status.preferred_country) {
          setCountry(status.preferred_country.id);
        }

        const savedSportIds = status.favourite_sports.map((s) => s.id);
        if (savedSportIds.length > 0) {
          setSports(savedSportIds);
        }

        const savedCompetitionIds = status.favourite_competitions.map((c) => c.id);
        if (savedCompetitionIds.length > 0) {
          setCompetitions(savedCompetitionIds);
        }

        const savedClubIds = status.favourite_clubs.map((c) => c.id);
        if (savedClubIds.length > 0) {
          setClubs(savedClubIds);
        }

        // Load competitions/clubs if previous selections exist.
        if (savedSportIds.length > 0) {
          const [competitionsData, clubsData] = await Promise.all([
            getCompetitions(savedSportIds),
            getClubs(savedCompetitionIds.length > 0 ? savedCompetitionIds : undefined),
          ]);
          if (!cancelled) {
            setApiCompetitions(competitionsData);
            setApiClubs(clubsData);
          }
        }

        // Resume from current_step.
        if (status.current_step) {
          const stepMap: Record<OnboardingStepKey, StepId> = {
            COUNTRY:      STEP_COUNTRY,
            SPORTS:       STEP_SPORTS,
            COMPETITIONS: STEP_COMPETITIONS,
            CLUBS:        STEP_CLUBS,
          };
          const resumeStep = stepMap[status.current_step];
          if (resumeStep !== undefined) {
            setStep(resumeStep);
          }
        }
      } catch {
        // Non-fatal: fall back to fresh onboarding from welcome screen.
        // Catalogue load errors will surface as empty dropdowns.
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [navigate]);

  // ── Reload competitions when sport selection changes ──────────────────────
  const loadCompetitions = useCallback(async (sportIds: string[]) => {
    if (sportIds.length === 0) {
      setApiCompetitions([]);
      return;
    }
    try {
      const data = await getCompetitions(sportIds);
      setApiCompetitions(data);
    } catch {
      setApiCompetitions([]);
    }
  }, []);

  // ── Reload clubs when competition selection changes ───────────────────────
  const loadClubs = useCallback(async (competitionIds: string[]) => {
    if (competitionIds.length === 0) {
      setApiClubs([]);
      return;
    }
    try {
      const data = await getClubs(competitionIds);
      setApiClubs(data);
    } catch {
      setApiClubs([]);
    }
  }, []);

  // ── Toggles ───────────────────────────────────────────────────────────────

  const toggleCountry = (id: string) =>
    setCountry((prev) => (prev === id ? null : id));

  const toggleSport = (id: SportId) => {
    setSports((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];

      // Drop competitions/clubs that no longer match the new sport set.
      setCompetitions((current) =>
        current.filter((cId) =>
          apiCompetitions.some((c) => c.id === cId && next.includes(c.sport)),
        ),
      );
      setClubs((current) =>
        current.filter((cId) =>
          apiClubs.some((c) => c.id === cId && next.includes(c.sport)),
        ),
      );

      loadCompetitions(next);
      return next;
    });
  };

  const toggleCompetition = (id: string) => {
    setCompetitions((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      loadClubs(next);
      return next;
    });
  };

  const toggleClub = (id: string) =>
    setClubs((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  // ── Step completion check ─────────────────────────────────────────────────

  const isStepComplete = (s: StepId): boolean => {
    switch (s) {
      case STEP_COUNTRY:      return country !== null;
      case STEP_SPORTS:       return sports.length > 0;
      case STEP_COMPETITIONS: return competitions.length > 0;
      case STEP_CLUBS:        return clubs.length > 0;
      default:                return true;
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goBack = () => {
    setShowValidation(false);
    setStepError(null);
    setStep((prev) => (prev > STEP_WELCOME ? ((prev - 1) as StepId) : prev));
  };

  const goNext = async () => {
    if (!isStepComplete(step)) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setStepError(null);
    setSubmitting(true);

    try {
      // Submit the current step's selection to the backend.
      switch (step) {
        case STEP_COUNTRY:
          if (country) await selectCountry(country);
          break;
        case STEP_SPORTS:
          await selectSports(sports);
          // Load competitions for the selected sports.
          await loadCompetitions(sports);
          break;
        case STEP_COMPETITIONS:
          await selectCompetitions(competitions);
          // Load clubs for the selected competitions.
          await loadClubs(competitions);
          break;
        case STEP_CLUBS:
          await selectClubs(clubs);
          break;
      }

      setStep((prev) => (prev < STEP_SUMMARY ? ((prev + 1) as StepId) : prev));
    } catch (err) {
      const { message } = extractApiError(err);
      setStepError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetStarted = () => {
    setStep(STEP_COUNTRY);
  };

  const handleCompleteSetup = async () => {
    setSubmitting(true);
    setStepError(null);
    try {
      await completeOnboarding();
      setStep(STEP_SUCCESS);
    } catch (err) {
      const { message } = extractApiError(err);
      setStepError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => navigate(DASHBOARD_ROUTE);

  const handleSkipAll = async () => {
    // Skip the current personalization step if we're inside one, then navigate.
    const stepKey = STEP_KEY_MAP[step];
    if (stepKey) {
      try {
        await skipOnboardingStep(stepKey);
      } catch {
        // Non-fatal — proceed to dashboard regardless.
      }
    }
    navigate(DASHBOARD_ROUTE);
  };

  // ── Derived display data for StepSummary ──────────────────────────────────

  const selectedCountry = apiCountries.find((c) => c.id === country) ?? null;
  const selectedSportNames = apiSports
    .filter((s) => sports.includes(s.id))
    .map((s) => s.name);
  const selectedCompetitionNames = apiCompetitions
    .filter((c) => competitions.includes(c.id))
    .map((c) => c.name);
  const selectedClubNames = apiClubs
    .filter((c) => clubs.includes(c.id))
    .map((c) => c.name);

  // ── ComboboxOption arrays for each step ───────────────────────────────────

  const countryOptions: ComboboxOption[] = apiCountries.map((c) => ({
    value: c.id,
    label: c.name,
    image: c.flag ?? undefined,
  }));

  const sportOptions: ComboboxOption[] = apiSports.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const competitionOptions: ComboboxOption[] = apiCompetitions.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const clubOptions: ComboboxOption[] = apiClubs.map((c) => ({
    value: c.id,
    label: c.initials ? `${c.initials} — ${c.name}` : c.name,
  }));

  // ── Render helpers ────────────────────────────────────────────────────────

  const isWelcome  = step === STEP_WELCOME;
  const isSummary  = step === STEP_SUMMARY;
  const isSuccess  = step === STEP_SUCCESS;
  const showChrome = !isWelcome && !isSuccess;

  const currentPersonalizationStep =
    step >= STEP_COUNTRY && step <= STEP_SUMMARY ? step : 0;

  return (
    <div className="onboarding-page">
      <div className="onboarding-glow onboarding-glow--purple" aria-hidden="true" />

      <div className="onboarding-shell">
        {showChrome && (
          <header className="onboarding-topbar">
            <div className="onboarding-brand">
              <img src="/logos/logo.png" alt="League OS logo" className="onboarding-logo" />
            </div>
            <button
              type="button"
              className="btn btn--ghost1"
              onClick={handleSkipAll}
              disabled={submitting}
            >
              Complete later
            </button>
          </header>
        )}

        {showChrome && <ProgressBar currentPersonalizationStep={currentPersonalizationStep} />}

        <div className="onboarding-stage">
          {/* Inline API error banner */}
          {stepError && (
            <p className="field-error" style={{ textAlign: "center", marginBottom: "12px" }}>
              {stepError}
            </p>
          )}

          <div key={step} className="step-transition">
            {step === STEP_WELCOME && (
              <StepWelcome onGetStarted={handleGetStarted} onSkip={handleSkipAll} />
            )}
            {step === STEP_COUNTRY && (
              <StepCountry
                country={country}
                toggleCountry={toggleCountry}
                showValidation={showValidation}
                options={catalogueLoading ? [] : countryOptions}
              />
            )}
            {step === STEP_SPORTS && (
              <StepSports
                sports={sports}
                toggleSport={toggleSport}
                showValidation={showValidation}
                options={catalogueLoading ? [] : sportOptions}
              />
            )}
            {step === STEP_COMPETITIONS && (
              <StepCompetitions
                competitions={competitions}
                toggleCompetition={toggleCompetition}
                showValidation={showValidation}
                options={competitionOptions}
              />
            )}
            {step === STEP_CLUBS && (
              <StepClubs
                clubs={clubs}
                toggleClub={toggleClub}
                showValidation={showValidation}
                options={clubOptions}
              />
            )}
            {step === STEP_SUMMARY && (
              <StepSummary
                countryName={selectedCountry?.name ?? null}
                countryFlag={selectedCountry?.flag ?? null}
                sportNames={selectedSportNames}
                competitionNames={selectedCompetitionNames}
                clubNames={selectedClubNames}
                onComplete={handleCompleteSetup}
              />
            )}
            {step === STEP_SUCCESS && (
              <StepSuccess onGoToDashboard={handleGoToDashboard} />
            )}
          </div>
        </div>

        {showChrome && !isSummary && (
          <footer className="onboarding-footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={goBack}
              disabled={submitting}
            >
              <FiArrowLeft size={16} />
              Back
            </button>

            <div className="onboarding-footer-right">
              <button
                type="button"
                className="btn btn--primary"
                onClick={goNext}
                disabled={submitting || catalogueLoading}
              >
                {submitting ? "Saving…" : "Continue"}
                <FiArrowRight size={16} />
              </button>
            </div>
          </footer>
        )}

        {showChrome && isSummary && (
          <footer className="onboarding-footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={goBack}
              disabled={submitting}
            >
              <FiArrowLeft size={16} />
              Back
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default FanOnboarding;
