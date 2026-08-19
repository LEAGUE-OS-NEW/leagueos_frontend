import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiAlertTriangle } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import SafeImage from '../../components/SafeImage/SafeImage';
import CrestFallback from '../../components/SafeImage/CrestFallback';
import {
  deriveFixtureStatus,
  fetchAllLiveFixtures,
  fetchResults,
  fetchUpcomingFixtures,
  fixtureHasScore,
  fixtureStatusClass,
  formatFixtureKickoff,
  type RealFixture,
} from '../../services/fixturesService';
import type { Sport } from '../../utils/sport';
import './FixturesPage.css';

type Tab = 'Upcoming' | 'Results';

const TABS: Tab[] = ['Upcoming', 'Results'];
const SPORT_FILTERS: Array<'All' | Sport> = ['All', 'Football', 'Rugby', 'Basketball'];

function FixtureCard({ fixture }: { fixture: RealFixture }) {
  const status = deriveFixtureStatus(fixture.status, fixtureHasScore(fixture));
  const showScore = status === 'Live' || status === 'Provisional' || status === 'Final';

  return (
    <Link to={`/matches/${fixture.id}`} className="fx-card">
      <div className="fx-card__top">
        <span className="fx-card__competition">{fixture.competition_name}</span>
        <span className={fixtureStatusClass(status)}>
          {status === 'Live' && fixture.clock_display ? fixture.clock_display : status}
        </span>
      </div>

      <div className="fx-card__teams">
        <div className="fx-card__team">
          <SafeImage
            src={fixture.home_club_logo_url}
            alt={fixture.home_club_name}
            className="fx-crest"
            fallback={<CrestFallback label={fixture.home_club_name} />}
          />
          <span>{fixture.home_club_name}</span>
        </div>

        {showScore ? (
          <span className="fx-card__score">
            {fixture.home_score ?? 0}&ndash;{fixture.away_score ?? 0}
          </span>
        ) : (
          <span className="fx-card__vs">vs</span>
        )}

        <div className="fx-card__team">
          <SafeImage
            src={fixture.away_club_logo_url}
            alt={fixture.away_club_name}
            className="fx-crest"
            fallback={<CrestFallback label={fixture.away_club_name} />}
          />
          <span>{fixture.away_club_name}</span>
        </div>
      </div>

      <p className="fx-card__meta">
        {formatFixtureKickoff(fixture.match_date)}
        {fixture.venue ? ` · ${fixture.venue}` : ''}
      </p>
    </Link>
  );
}

function mergeResults(live: RealFixture[], completed: RealFixture[]): RealFixture[] {
  return [...live, ...completed].sort(
    (left, right) => new Date(right.match_date).getTime() - new Date(left.match_date).getTime(),
  );
}

function FixturesPage() {
  const [tab, setTab] = useState<Tab>('Results');
  const [sportFilter, setSportFilter] = useState<'All' | Sport>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<RealFixture[]>([]);
  const [results, setResults] = useState<RealFixture[]>([]);

  // Pure fetch — no setState inside, safe to call from an effect.
  const fetchAll = () => Promise.all([fetchUpcomingFixtures(), fetchAllLiveFixtures(), fetchResults()]);

  useEffect(() => {
    let cancelled = false;

    fetchAll()
      .then(([upcoming, live, completed]) => {
        if (cancelled) return;
        setFixtures(upcoming);
        setResults(mergeResults(live, completed));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load fixtures. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);

    fetchAll()
      .then(([upcoming, live, completed]) => {
        setFixtures(upcoming);
        setResults(mergeResults(live, completed));
      })
      .catch(() => setLoadError('Could not load fixtures. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const activeList = tab === 'Upcoming' ? fixtures : results;
  const filteredList = activeList.filter((fixture) => {
    if (sportFilter === 'All') return true;
    return fixture.sport_name === sportFilter;
  });

  return (
    <div className="fixtures-page">
      <Navbar />

      <main className="fixtures-main">
        <div className="fixtures-main-inner">
          <div className="fixtures-header">
            <div>
              <p className="fixtures-header__eyebrow">Stay in the game</p>
              <h1>Fixtures &amp; Results</h1>
              <p>Upcoming matches and final results across football, rugby and basketball.</p>
            </div>
          </div>

          <div className="fixtures-tab-row">
            {TABS.map((value) => (
              <button
                key={value}
                type="button"
                className={`fixtures-tab${tab === value ? ' is-active' : ''}`}
                onClick={() => setTab(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="fixtures-pill-row">
            {SPORT_FILTERS.map((sport) => (
              <button
                key={sport}
                type="button"
                className={`fixtures-pill${sportFilter === sport ? ' is-active' : ''}`}
                onClick={() => setSportFilter(sport)}
              >
                {sport}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="fixtures-error-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="fixtures-btn fixtures-btn--outline" onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="fixtures-loading">
              <FiActivity aria-hidden="true" className="fixtures-loading__icon" />
              Loading fixtures…
            </div>
          ) : filteredList.length === 0 ? (
            <p className="fixtures-empty">
              {tab === 'Upcoming' ? 'No upcoming fixtures match this filter.' : 'No results match this filter.'}
            </p>
          ) : (
            <div className="fixtures-grid">
              {filteredList.map((fixture) => (
                <FixtureCard fixture={fixture} key={fixture.id} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default FixturesPage;
