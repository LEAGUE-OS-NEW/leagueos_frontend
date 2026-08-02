import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiSearch,
  FiAlertTriangle,
  FiRefreshCw,
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
  emoji: string;
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

/** The six screens of the wizard, in order. */
type StepId = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_WELCOME: StepId = 0;
const STEP_COUNTRY: StepId = 1;
const STEP_SPORTS: StepId = 2;
const STEP_COMPETITIONS: StepId = 3;
const STEP_CLUBS: StepId = 4;
const STEP_SUMMARY: StepId = 5;

/** Labels for the 5 "personalization" steps shown in the progress bar (Welcome is not counted). */
const PROGRESS_LABELS = ["Country", "Sports", "Competitions", "Clubs", "Summary"];

const DASHBOARD_ROUTE = "/fandashboard";

/* =============================================================================
   STATIC DATA
   In a real League OS deployment these would come from an API — kept static
   here so the wizard is fully self-contained in one file.
   ============================================================================= */

const COUNTRIES: Country[] = [
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
];

const SPORTS: Sport[] = [
  { id: "football", name: "Football", emoji: "⚽" },
  { id: "rugby", name: "Rugby", emoji: "🏉" },
  { id: "basketball", name: "Basketball", emoji: "🏀" },
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
   SMALL SHARED PIECES
   Kept as internal components so the whole feature stays in one file.
   ============================================================================= */

/** Friendly "nothing here" placeholder built from CSS shapes, not plain text. */
const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="empty-state">
    <div className="empty-illustration">
      <span className="empty-ring empty-ring--1" />
      <span className="empty-ring empty-ring--2" />
      <FiSearch size={20} className="empty-icon" />
    </div>
    <p className="empty-title">{title}</p>
    {hint && <p className="empty-hint">{hint}</p>}
  </div>
);

/** Inline error state with a retry action — used when a "fetch" simulation fails. */
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="error-state" role="alert">
    <FiAlertTriangle size={20} className="error-icon" />
    <p className="error-message">{message}</p>
    <button type="button" className="btn btn--secondary btn--small" onClick={onRetry}>
      <FiRefreshCw size={14} />
      Retry
    </button>
  </div>
);

/** Pulsing placeholder cards shown while a step's data is "loading". */
const SkeletonGrid = ({ count }: { count: number }) => (
  <div className="card-grid" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <span className="skeleton-avatar" />
        <span className="skeleton-line skeleton-line--wide" />
        <span className="skeleton-line skeleton-line--narrow" />
      </div>
    ))}
  </div>
);

/** Removable orange chip used for competitions and in the summary review. */
const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="chip">
    {label}
    <button type="button" className="chip-remove" onClick={onRemove} aria-label={`Remove ${label}`}>
      <FiX size={12} />
    </button>
  </span>
);

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
   STEP 1: WELCOME
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
      <button type="button" className="btn btn--ghost" onClick={onSkip}>
        Skip for now
      </button>
    </div>
  </div>
);

/* =============================================================================
   STEP 2: COUNTRY SELECTION
   ============================================================================= */

interface StepCountryProps {
  selected: string | null;
  onSelect: (code: string) => void;
}

const StepCountry = ({ selected, onSelect }: StepCountryProps) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Where do you follow sport from?</h2>
        <p>This helps us prioritize your local leagues and kickoff times.</p>
      </header>

      <div className="search-input">
        <FiSearch size={16} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          aria-label="Search countries"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No countries found" hint="Try a different spelling." />
      ) : (
        <div className="list-grid">
          {filtered.map((country) => (
            <button
              key={country.code}
              type="button"
              className={"list-chip" + (selected === country.code ? " list-chip--selected" : "")}
              onClick={() => onSelect(country.code)}
              aria-pressed={selected === country.code}
            >
              <span className="list-chip__flag">{country.flag}</span>
              {country.name}
              {selected === country.code && <FiCheck size={16} className="list-chip__check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* =============================================================================
   STEP 3: SPORTS SELECTION
   ============================================================================= */

interface StepSportsProps {
  selected: SportId[];
  onToggle: (id: SportId) => void;
}

const StepSports = ({ selected, onToggle }: StepSportsProps) => (
  <div className="step-panel">
    <header className="step-header">
      <h2>Which sports do you follow?</h2>
      <p>Pick as many as you like — your dashboard and news feed will follow suit.</p>
    </header>

    <div className="sport-grid">
      {SPORTS.map((sport) => {
        const isSelected = selected.includes(sport.id);
        return (
          <button
            key={sport.id}
            type="button"
            className={"sport-card" + (isSelected ? " sport-card--selected" : "")}
            onClick={() => onToggle(sport.id)}
            aria-pressed={isSelected}
          >
            <span className="sport-card__emoji">{sport.emoji}</span>
            <span className="sport-card__name">{sport.name}</span>
            <span className="sport-card__check">
              <FiCheck size={14} />
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/* =============================================================================
   STEP 4: COMPETITION SELECTION
   ============================================================================= */

interface StepCompetitionsProps {
  sportsFilter: SportId[];
  selected: string[];
  onToggle: (id: string) => void;
}

const StepCompetitions = ({ sportsFilter, selected, onToggle }: StepCompetitionsProps) => {
  const [query, setQuery] = useState("");
  const relevantSports = sportsFilter.length > 0 ? sportsFilter : SPORTS.map((s) => s.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMPETITIONS.filter((c) => {
      const inSport = relevantSports.includes(c.sport);
      const matchesQuery = !q || c.name.toLowerCase().includes(q);
      return inSport && matchesQuery;
    });
  }, [query, relevantSports]);

  const selectedCompetitions = COMPETITIONS.filter((c) => selected.includes(c.id));

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Favorite competitions</h2>
        <p>Choose the competitions you follow closely.</p>
      </header>

      <div className="search-input">
        <FiSearch size={16} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search competitions…"
          aria-label="Search competitions"
        />
      </div>

      {selectedCompetitions.length > 0 && (
        <div className="chip-row">
          {selectedCompetitions.map((c) => (
            <Chip key={c.id} label={c.name} onRemove={() => onToggle(c.id)} />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No competitions found" hint="Try another name or a different sport." />
      ) : (
        <div className="list-grid">
          {filtered.map((comp) => {
            const isSelected = selected.includes(comp.id);
            return (
              <button
                key={comp.id}
                type="button"
                className={"list-chip" + (isSelected ? " list-chip--selected" : "")}
                onClick={() => onToggle(comp.id)}
                aria-pressed={isSelected}
              >
                {comp.name}
                {isSelected && <FiCheck size={16} className="list-chip__check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =============================================================================
   STEP 5: CLUB SELECTION
   Includes a simulated async load: the first fetch attempt "fails" to
   demonstrate the error + retry state, and a short delay to demonstrate the
   loading skeleton. Retrying always succeeds.
   ============================================================================= */

interface StepClubsProps {
  sportsFilter: SportId[];
  selected: string[];
  onToggle: (id: string) => void;
}

const StepClubs = ({ sportsFilter, selected, onToggle }: StepClubsProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Simulate an API call for the club list every time "attempt" changes.
  useEffect(() => {
    setLoading(true);
    setHasError(false);
    const timer = setTimeout(() => {
      if (attempt === 0) {
        // First attempt "fails" so the error + retry UI is reachable/demoable.
        setHasError(true);
      }
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [attempt]);

  const relevantSports = sportsFilter.length > 0 ? sportsFilter : SPORTS.map((s) => s.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLUBS.filter((c) => {
      const inSport = relevantSports.includes(c.sport);
      const matchesQuery = !q || c.name.toLowerCase().includes(q);
      return inSport && matchesQuery;
    });
  }, [query, relevantSports]);

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Favorite clubs</h2>
        <p>Pick the clubs you never miss.</p>
      </header>

      <div className="search-input">
        <FiSearch size={16} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs…"
          aria-label="Search clubs"
          disabled={loading || hasError}
        />
      </div>

      {loading && <SkeletonGrid count={6} />}

      {!loading && hasError && (
        <ErrorState
          message="Unable to load clubs. Please check your connection and try again."
          onRetry={() => setAttempt((a) => a + 1)}
        />
      )}

      {!loading && !hasError && filtered.length === 0 && (
        <EmptyState title="No clubs found" hint="Try a different club name." />
      )}

      {!loading && !hasError && filtered.length > 0 && (
        <div className="card-grid">
          {filtered.map((club) => {
            const isSelected = selected.includes(club.id);
            return (
              <button
                key={club.id}
                type="button"
                className={"club-card" + (isSelected ? " club-card--selected" : "")}
                onClick={() => onToggle(club.id)}
                aria-pressed={isSelected}
              >
                <span className="club-card__logo">{club.initials}</span>
                <span className="club-card__name">{club.name}</span>
                {isSelected && (
                  <span className="club-card__badge">
                    <FiCheck size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
}

const StepSummary = ({ country, sports, competitions, clubs }: StepSummaryProps) => {
  const countryData = COUNTRIES.find((c) => c.code === country);
  const sportNames = SPORTS.filter((s) => sports.includes(s.id)).map((s) => s.name);
  const competitionNames = COMPETITIONS.filter((c) => competitions.includes(c.id)).map(
    (c) => c.name
  );
  const clubNames = CLUBS.filter((c) => clubs.includes(c.id)).map((c) => c.name);

  return (
    <div className="step-panel">
      <header className="step-header">
        <h2>Your Preferences</h2>
        <p>Here's what we'll use to personalize League OS for you.</p>
      </header>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>Country</h3>
          <p>{countryData ? `${countryData.flag} ${countryData.name}` : "Not set"}</p>
        </div>

        <div className="summary-card">
          <h3>Sports</h3>
          <p>{sportNames.length > 0 ? sportNames.join(", ") : "Not set"}</p>
        </div>

        <div className="summary-card">
          <h3>Competitions</h3>
          <p>{competitionNames.length > 0 ? competitionNames.join(", ") : "Not set"}</p>
        </div>

        <div className="summary-card">
          <h3>Clubs</h3>
          <p>{clubNames.length > 0 ? clubNames.join(", ") : "Not set"}</p>
        </div>
      </div>

      <div className="summary-footnote">
        <FiCheckCircle size={16} />
        <span>You can update any of this later from your profile settings.</span>
      </div>
    </div>
  );
};

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

  const isWelcome = step === STEP_WELCOME;
  const isSummary = step === STEP_SUMMARY;

  const toggleSport = (id: SportId) =>
    setSports((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleCompetition = (id: string) =>
    setCompetitions((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const toggleClub = (id: string) =>
    setClubs((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const goBack = () => setStep((prev) => (prev > STEP_WELCOME ? ((prev - 1) as StepId) : prev));
  const goNext = () => setStep((prev) => (prev < STEP_SUMMARY ? ((prev + 1) as StepId) : prev));

  const handleComplete = () => navigate(DASHBOARD_ROUTE);
  const handleSkipAll = () => navigate(DASHBOARD_ROUTE);

  return (
    <div className="onboarding-page">
      {/* Ambient purple/orange glow layers — decorative depth only */}
      <div className="onboarding-glow onboarding-glow--purple" aria-hidden="true" />
      <div className="onboarding-glow onboarding-glow--orange" aria-hidden="true" />

      <div className="onboarding-shell">
        {!isWelcome && (
          <header className="onboarding-topbar">
            <div className="onboarding-brand">
  <img 
    src="/logos/logo.png" 
    alt="League OS logo" 
    className="onboarding-logo"
  />
  
</div>
            <button type="button" className="btn btn--ghost" onClick={handleSkipAll}>
              Complete later
            </button>
          </header>
        )}

        {!isWelcome && <ProgressBar currentPersonalizationStep={step} />}

        <div className="onboarding-stage">
          <div key={step} className="step-transition">
            {step === STEP_WELCOME && (
              <StepWelcome onGetStarted={goNext} onSkip={handleSkipAll} />
            )}
            {step === STEP_COUNTRY && <StepCountry selected={country} onSelect={setCountry} />}
            {step === STEP_SPORTS && <StepSports selected={sports} onToggle={toggleSport} />}
            {step === STEP_COMPETITIONS && (
              <StepCompetitions
                sportsFilter={sports}
                selected={competitions}
                onToggle={toggleCompetition}
              />
            )}
            {step === STEP_CLUBS && (
              <StepClubs sportsFilter={sports} selected={clubs} onToggle={toggleClub} />
            )}
            {step === STEP_SUMMARY && (
              <StepSummary
                country={country}
                sports={sports}
                competitions={competitions}
                clubs={clubs}
              />
            )}
          </div>
        </div>

        {!isWelcome && (
          <footer className="onboarding-footer">
            <button type="button" className="btn btn--secondary" onClick={goBack}>
              <FiArrowLeft size={16} />
              Back
            </button>

            <div className="onboarding-footer-right">
              {!isSummary && (
                <button type="button" className="btn btn--ghost" onClick={goNext}>
                  Skip
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={isSummary ? handleComplete : goNext}
              >
                {isSummary ? "Complete Setup" : "Continue"}
                {isSummary ? <FiCheck size={16} /> : <FiArrowRight size={16} />}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default FanOnboarding;
