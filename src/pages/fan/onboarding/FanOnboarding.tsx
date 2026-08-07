import { useEffect, useMemo, useRef, useState } from "react";
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

/* =============================================================================
   TYPES
   ============================================================================= */

type SportId = "football" | "rugby" | "basketball";

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface Sport {
  id: SportId;
  name: string;
  
}

interface Competition {
  id: string;
  name: string;
  sport: SportId;
}

interface Club {
  id: string;
  name: string;
  sport: SportId;
  initials: string;
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

/** Labels for the 5 "personalization" steps shown in the progress bar. Welcome and Success aren't counted. */
const PROGRESS_LABELS = ["Country", "Sports", "Competitions", "Clubs", "Summary"];

const DASHBOARD_ROUTE = "/dashboard/fan";

/* =============================================================================
   STATIC DATA
   In a real League OS deployment these would come from an API — kept static
   here so the wizard is fully self-contained in one file.
   ============================================================================= */

const COUNTRIES: Country[] = [
  { code: "UG", name: "Uganda", flag: "/flags/uganda.png" },
  { code: "KE", name: "Kenya", flag: "/flags/kenya.png" },
  { code: "TZ", name: "Tanzania", flag: "/flags/tanzania.png" },
  { code: "RW", name: "Rwanda", flag: "/flags/rwanda.png" },
  { code: "SS", name: "South Sudan", flag: "/flags/south-sudan.png" },
];

const SPORTS: Sport[] = [
  { id: "football", name: "Football" },
  { id: "rugby", name: "Rugby" },
  { id: "basketball", name: "Basketball"},
];

const COMPETITIONS: Competition[] = [
  { id: "upl", name: "Uganda Premier League", sport: "football" },
  { id: "fufa-big-league", name: "FUFA Big League", sport: "football" },
  { id: "urp", name: "Uganda Rugby Premiership", sport: "rugby" },
  { id: "nbl", name: "National Basketball League", sport: "basketball" },
  { id: "bal", name: "Basketball Africa League", sport: "basketball" },
];

const CLUBS: Club[] = [
  { id: "vipers", name: "Vipers SC", sport: "football", initials: "VP" },
  { id: "kcca", name: "KCCA FC", sport: "football", initials: "KC" },
  { id: "sc-villa", name: "SC Villa", sport: "football", initials: "SV" },
  { id: "express", name: "Express FC", sport: "football", initials: "EX" },
  { id: "ura", name: "URA FC", sport: "football", initials: "UR" },
  { id: "city-oilers", name: "City Oilers", sport: "basketball", initials: "CO" },
  { id: "jkl-dolphins", name: "JKL Dolphins", sport: "basketball", initials: "JD" },
  { id: "heathens", name: "Heathens Rugby Club", sport: "rugby", initials: "HR" },
];

/* =============================================================================
   SHARED: Chip
   Removable pill used to show a selected item outside the dropdown panel.
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
   A dropdown with a built-in search/filter field. Options are toggled with a
   single click (no Ctrl/Cmd needed) — works for both single-select
   (`multiple={false}`, e.g. Country) and multi-select (`multiple={true}`,
   e.g. Sports/Competitions/Clubs). Designed to stay usable with long lists.
   ============================================================================= */
interface ComboboxOption {
  value: string;
  label: string;
  image?: string;
}

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

  // Close the panel on outside click.
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
      // Single-select: pick, close, and reset the search field.
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

  // Single-select shows the chosen label once closed; otherwise it behaves
  // like a normal search box.
  const inputValue = !multiple && !isOpen && selectedOptions[0] ? selectedOptions[0].label : query;

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
  currentPersonalizationStep: number; // 1-5
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
   STEP 1: WELCOME  (unchanged — kept exactly as before)
   ============================================================================= */

interface StepWelcomeProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const StepWelcome = ({ onGetStarted, onSkip }: StepWelcomeProps) => (
  <div className="step-panel step-panel--centered">
    <div className="welcome-logo"> <img src="/logos/league-os-horizontal.png" alt="League OS logo" /></div>
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
   ============================================================================= */

interface StepCountryProps {
  country: string | null;
  toggleCountry: (code: string) => void;
  showValidation: boolean;
}

const StepCountry = ({ country, toggleCountry, showValidation }: StepCountryProps) => {
  const options: ComboboxOption[] = COUNTRIES.map((c) => ({
  value: c.code,
  label: c.name,
  image: c.flag,
}));

  return (
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
};

/* =============================================================================
   STEP 3: SPORTS
   ============================================================================= */

interface StepSportsProps {
  sports: SportId[];
  toggleSport: (id: SportId) => void;
  showValidation: boolean;
}

const StepSports = ({ sports, toggleSport, showValidation }: StepSportsProps) => {
  const options: ComboboxOption[] = SPORTS.map((s) => ({ value: s.id, label: ` ${s.name}` }));

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Which sports do you follow?</h2>
        <p>Pick at least one — your dashboard and news feed will follow suit.</p>
      </header>
      <SearchableSelect
        id="sports-select"
        options={options}
        selectedValues={sports}
        onToggle={(value) => toggleSport(value as SportId)}
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
};

/* =============================================================================
   STEP 4: COMPETITIONS
   Locked behind Sports — only competitions for the chosen sport(s) are shown.
   ============================================================================= */

interface StepCompetitionsProps {
  sports: SportId[];
  competitions: string[];
  toggleCompetition: (id: string) => void;
  showValidation: boolean;
}

const StepCompetitions = ({ sports, competitions, toggleCompetition, showValidation }: StepCompetitionsProps) => {
  const availableCompetitions = useMemo(
    () => (sports.length > 0 ? COMPETITIONS.filter((c) => sports.includes(c.sport)) : COMPETITIONS),
    [sports]
  );
  const options: ComboboxOption[] = availableCompetitions.map((c) => ({ value: c.id, label: c.name }));

  return (
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
};

/* =============================================================================
   STEP 5: CLUBS
   Also locked behind Sports for the same reason as Competitions.
   ============================================================================= */

interface StepClubsProps {
  sports: SportId[];
  clubs: string[];
  toggleClub: (id: string) => void;
  showValidation: boolean;
}

const StepClubs = ({ sports, clubs, toggleClub, showValidation }: StepClubsProps) => {
  const availableClubs = useMemo(
    () => (sports.length > 0 ? CLUBS.filter((c) => sports.includes(c.sport)) : CLUBS),
    [sports]
  );
  const options: ComboboxOption[] = availableClubs.map((c) => ({ value: c.id, label: `${c.initials} — ${c.name}` }));

  return (
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
};

/* =============================================================================
   STEP 6: SUMMARY
   ============================================================================= */

interface StepSummaryProps {
  country: string | null;
  sports: SportId[];
  competitions: string[];
  clubs: string[];
  onComplete: () => void;
}

const StepSummary = ({ country, sports, competitions, clubs, onComplete }: StepSummaryProps) => {
  const countryData = COUNTRIES.find((c) => c.code === country);
  const sportNames = SPORTS.filter((s) => sports.includes(s.id)).map((s) => s.name);
  const competitionNames = COMPETITIONS.filter((c) => competitions.includes(c.id)).map((c) => c.name);
  const clubNames = CLUBS.filter((c) => clubs.includes(c.id)).map((c) => c.name);

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Your Preferences</h2>
        <p>Here's what we'll use to personalize League OS for you.</p>
      </header>

      <div className="summary-card">
        <h3>Your Preferences</h3>
        <p>
  <strong>Country:</strong>
  {countryData ? (
    <span className="summary-country">
      <img
        src={countryData.flag}
        alt={`${countryData.name} flag`}
        className="summary-country-flag"
      />
      {countryData.name}
    </span>
  ) : (
    "Not set"
  )}
</p>
        <p>
          <strong>Sports:</strong> {sportNames.length > 0 ? sportNames.join(", ") : "Not set"}
        </p>
        <p>
          <strong>Competitions:</strong>{" "}
          {competitionNames.length > 0 ? competitionNames.join(", ") : "Not set"}
        </p>
        <p>
          <strong>Clubs:</strong> {clubNames.length > 0 ? clubNames.join(", ") : "Not set"}
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
};

/* =============================================================================
   STEP 7: SUCCESS CONFIRMATION
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

  const [step, setStep] = useState<StepId>(STEP_WELCOME);
  const [country, setCountry] = useState<string | null>(null);
  const [sports, setSports] = useState<SportId[]>([]);
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const isWelcome = step === STEP_WELCOME;
  const isSummary = step === STEP_SUMMARY;
  const isSuccess = step === STEP_SUCCESS;
  const showChrome = !isWelcome && !isSuccess;

  const toggleCountry = (code: string) => setCountry((prev) => (prev === code ? null : code));

  const toggleSport = (id: SportId) => {
  setSports((prev) => {
    const updatedSports = prev.includes(id)
      ? prev.filter((s) => s !== id)
      : [...prev, id];

    setCompetitions((current) =>
      current.filter((compId) => {
        const comp = COMPETITIONS.find((c) => c.id === compId);
        return comp && updatedSports.includes(comp.sport);
      })
    );

    setClubs((current) =>
      current.filter((clubId) => {
        const club = CLUBS.find((c) => c.id === clubId);
        return club && updatedSports.includes(club.sport);
      })
    );

    return updatedSports;
  });
};

  const toggleCompetition = (id: string) =>
    setCompetitions((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const toggleClub = (id: string) =>
    setClubs((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  // Whenever the sport selection narrows, drop any competition/club picks
  // that no longer belong to a currently-selected sport — they were only
  // reachable because a sport that's now deselected made them visible.
 

  /** Whether the given step's required selection has been made. Steps not
   *  listed here (Welcome, Summary, Success) have no gating requirement. */
  const isStepComplete = (s: StepId): boolean => {
    switch (s) {
      case STEP_COUNTRY:
        return country !== null;
      case STEP_SPORTS:
        return sports.length > 0;
      case STEP_COMPETITIONS:
        return competitions.length > 0;
      case STEP_CLUBS:
        return clubs.length > 0;
      default:
        return true;
    }
  };

  const goBack = () => {
    setShowValidation(false);
    setStep((prev) => (prev > STEP_WELCOME ? ((prev - 1) as StepId) : prev));
  };

  const goNext = () => {
    // Related-item gating: block advancing until the current step (and thus
    // everything it depends on, e.g. Sports before Competitions/Clubs) is
    // actually complete.
    if (!isStepComplete(step)) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setStep((prev) => (prev < STEP_SUMMARY ? ((prev + 1) as StepId) : prev));
  };

  const handleGetStarted = () => setStep(STEP_COUNTRY);
  const handleCompleteSetup = () => setStep(STEP_SUCCESS);
  const handleGoToDashboard = () => navigate(DASHBOARD_ROUTE);
  const handleSkipAll = () => navigate(DASHBOARD_ROUTE);

  const currentPersonalizationStep = step >= STEP_COUNTRY && step <= STEP_SUMMARY ? step : 0;

  return (
    <div className="onboarding-page">
      {/* Ambient purple glow layer — decorative depth only */}
      <div className="onboarding-glow onboarding-glow--purple" aria-hidden="true" />

      <div className="onboarding-shell">
        {showChrome && (
          <header className="onboarding-topbar">
            <div className="onboarding-brand">
              <img src="/logos/logo.png" alt="League OS logo" className="onboarding-logo" />
            </div>
            <button type="button" className="btn btn--ghost1" onClick={handleSkipAll}>
              Complete later
            </button>
          </header>
        )}

        {showChrome && <ProgressBar currentPersonalizationStep={currentPersonalizationStep} />}

        <div className="onboarding-stage">
          <div key={step} className="step-transition">
            {step === STEP_WELCOME && (
              <StepWelcome onGetStarted={handleGetStarted} onSkip={handleSkipAll} />
            )}
            {step === STEP_COUNTRY && (
              <StepCountry country={country} toggleCountry={toggleCountry} showValidation={showValidation} />
            )}
            {step === STEP_SPORTS && (
              <StepSports sports={sports} toggleSport={toggleSport} showValidation={showValidation} />
            )}
            {step === STEP_COMPETITIONS && (
              <StepCompetitions
                sports={sports}
                competitions={competitions}
                toggleCompetition={toggleCompetition}
                showValidation={showValidation}
              />
            )}
            {step === STEP_CLUBS && (
              <StepClubs sports={sports} clubs={clubs} toggleClub={toggleClub} showValidation={showValidation} />
            )}
            {step === STEP_SUMMARY && (
              <StepSummary
                country={country}
                sports={sports}
                competitions={competitions}
                clubs={clubs}
                onComplete={handleCompleteSetup}
              />
            )}
            {step === STEP_SUCCESS && <StepSuccess onGoToDashboard={handleGoToDashboard} />}
          </div>
        </div>

        {showChrome && !isSummary && (
          <footer className="onboarding-footer">
            <button type="button" className="btn btn--secondary" onClick={goBack}>
              <FiArrowLeft size={16} />
              Back
            </button>

            <div className="onboarding-footer-right">
              <button type="button" className="btn btn--primary" onClick={goNext}>
                Continue
                <FiArrowRight size={16} />
              </button>
            </div>
          </footer>
        )}

        {showChrome && isSummary && (
          <footer className="onboarding-footer">
            <button type="button" className="btn btn--secondary" onClick={goBack}>
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
