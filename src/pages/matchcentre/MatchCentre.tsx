import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import SafeImage from '../../components/SafeImage/SafeImage';
import CrestFallback from '../../components/SafeImage/CrestFallback';
import { getPublicFixtures, getPublicStandings } from '../../services/publicDashboardService';
import type { PublicFixtureApi, PublicStandingApi } from '../../services/publicDashboardService';
import { fetchOpenMarkets } from '../../services/markets/publicMarketsService';
import type { PublicMarketCard } from '../../services/markets/publicMarketsService';
import {
  deriveFixtureStatus,
  fixtureHasScore,
  fixtureStatusClass,
  formatFixtureKickoff,
} from '../../services/fixturesService';
import './MatchCentre.css';

type Tab = 'Overview' | 'Standings' | 'Markets';

const TABS: Tab[] = ['Overview', 'Standings', 'Markets'];
const LIVE_REFRESH_MS = 30000;

function findFixture(fixtures: PublicFixtureApi[], fixtureId: string) {
  return fixtures.find((fixture) => String(fixture.id) === String(fixtureId)) ?? null;
}

function MatchCentre() {
  const { fixtureId = '' } = useParams();

  const [tab, setTab] = useState<Tab>('Overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fixture, setFixture] = useState<PublicFixtureApi | null>(null);
  const [standings, setStandings] = useState<PublicStandingApi[]>([]);
  const [markets, setMarkets] = useState<PublicMarketCard[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Pure fetch — no setState inside, safe to call from an effect or an
  // interval callback. There's no single-fixture endpoint, so this mirrors
  // TicketCheckoutPage.tsx's own "fetch the list, find by id" approach.
  // Memoized so effects below can depend on it without re-running every
  // render — its identity only changes when fixtureId does.
  const loadFixture = useCallback(
    () => getPublicFixtures().then((all) => findFixture(all, fixtureId)),
    [fixtureId],
  );

  useEffect(() => {
    let cancelled = false;

    loadFixture()
      .then((found) => {
        if (cancelled) return;
        setFixture(found);
        setLastRefreshedAt(new Date());
        if (!found) setLoadError('This fixture could not be found.');
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this match. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadFixture]);

  const status = fixture ? deriveFixtureStatus(fixture.status, fixtureHasScore(fixture)) : null;

  // Live refresh: while the match is live, poll for score/status changes.
  // Cleared on unmount and whenever it stops being live.
  useEffect(() => {
    if (status !== 'Live') return undefined;

    const interval = setInterval(() => {
      loadFixture().then((found) => {
        if (found) {
          setFixture(found);
          setLastRefreshedAt(new Date());
        }
      });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(interval);
  }, [status, loadFixture]);

  // Standings — secondary tab, fetched once the fixture's competition is
  // known. A failure here shouldn't block the rest of the page.
  useEffect(() => {
    if (!fixture) return undefined;
    let cancelled = false;

    getPublicStandings(fixture.competition)
      .then((rows) => {
        if (!cancelled) setStandings(rows);
      })
      .catch(() => {
        /* Standings are a secondary tab; the empty state covers this. */
      });

    return () => {
      cancelled = true;
    };
  }, [fixture]);

  // Markets — secondary tab, fetched once and filtered client-side below.
  useEffect(() => {
    let cancelled = false;

    fetchOpenMarkets()
      .then((all) => {
        if (!cancelled) setMarkets(all);
      })
      .catch(() => {
        /* Markets are a secondary tab; the empty state covers this. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleManualRefresh = () => {
    loadFixture().then((found) => {
      if (found) {
        setFixture(found);
        setLastRefreshedAt(new Date());
      }
    });
  };

  const relatedMarkets = markets.filter((market) => market.sportingEventId === String(fixtureId));
  const showScore = status === 'Live' || status === 'Provisional' || status === 'Final';

  return (
    <div className="matchcentre-page">
      <Navbar />

      <main className="matchcentre-main">
        <div className="matchcentre-main-inner">
          <Link to="/fixtures" className="matchcentre-breadcrumb">
            ← Back to Fixtures
          </Link>

          {loadError && (
            <div className="matchcentre-error-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>{loadError}</span>
              <button type="button" className="mc-btn mc-btn--outline" onClick={handleManualRefresh}>
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="matchcentre-loading">
              <FiActivity aria-hidden="true" className="matchcentre-loading__icon" />
              Loading match…
            </div>
          ) : (
            fixture &&
            status && (
              <>
                <div className="matchcentre-header">
                  <div className="matchcentre-header__top">
                    <span className="matchcentre-header__competition">{fixture.competition_name}</span>
                    <span className={fixtureStatusClass(status)}>{status}</span>
                  </div>

                  <div className="matchcentre-scoreboard">
                    <Link to={`/clubs/${fixture.home_club_slug}`} className="matchcentre-team">
                      <SafeImage
                        src={fixture.home_club_logo_url}
                        alt={fixture.home_club_name}
                        className="mc-crest"
                        fallback={<CrestFallback label={fixture.home_club_name} />}
                      />
                      <span>{fixture.home_club_name}</span>
                    </Link>

                    {showScore ? (
                      <span className="matchcentre-score">
                        {fixture.home_score ?? 0}&ndash;{fixture.away_score ?? 0}
                      </span>
                    ) : (
                      <span className="matchcentre-vs">vs</span>
                    )}

                    <Link to={`/clubs/${fixture.away_club_slug}`} className="matchcentre-team">
                      <SafeImage
                        src={fixture.away_club_logo_url}
                        alt={fixture.away_club_name}
                        className="mc-crest"
                        fallback={<CrestFallback label={fixture.away_club_name} />}
                      />
                      <span>{fixture.away_club_name}</span>
                    </Link>
                  </div>

                  <p className="matchcentre-meta">
                    {formatFixtureKickoff(fixture.match_date)}
                    {fixture.venue ? ` · ${fixture.venue}` : ''}
                  </p>

                  <div className="matchcentre-header__actions">
                    {status === 'Scheduled' && (
                      <Link to={`/tickets/${fixture.id}/checkout`} className="mc-btn mc-btn--gradient">
                        Buy Tickets
                      </Link>
                    )}
                    <button type="button" className="mc-btn mc-btn--outline" onClick={handleManualRefresh}>
                      <FiRefreshCw aria-hidden="true" /> Refresh
                    </button>
                    {lastRefreshedAt && (
                      <span className="matchcentre-refreshed-at">
                        Updated {lastRefreshedAt.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="matchcentre-tab-row">
                  {TABS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`matchcentre-tab${tab === value ? ' is-active' : ''}`}
                      onClick={() => setTab(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                {tab === 'Overview' && (
                  <div className="matchcentre-panel">
                    <h2>Related Markets</h2>
                    {relatedMarkets.length === 0 ? (
                      <p className="matchcentre-empty">No open markets for this fixture yet.</p>
                    ) : (
                      <>
                        <div className="mc-market-grid">
                          {relatedMarkets.slice(0, 3).map((market) => (
                            <Link to="/markets" className="mc-market-card" key={market.id}>
                              <p className="mc-market-card__question">{market.question}</p>
                            </Link>
                          ))}
                        </div>
                        {relatedMarkets.length > 3 && (
                          <button type="button" className="mc-see-all" onClick={() => setTab('Markets')}>
                            See all {relatedMarkets.length} markets
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tab === 'Standings' && (
                  <div className="matchcentre-panel">
                    <h2>{fixture.competition_name} Table</h2>
                    {standings.length === 0 ? (
                      <p className="matchcentre-empty">Standings aren&apos;t available for this competition yet.</p>
                    ) : (
                      <div className="mc-table-scroll">
                        <table className="mc-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Club</th>
                              <th>P</th>
                              <th>W</th>
                              <th>D</th>
                              <th>L</th>
                              <th>GD</th>
                              <th>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((row) => (
                              <tr
                                key={row.id}
                                className={
                                  row.club === fixture.home_club || row.club === fixture.away_club
                                    ? 'is-competing'
                                    : ''
                                }
                              >
                                <td>{row.position}</td>
                                <td className="mc-table__club">{row.club_name}</td>
                                <td>{row.played}</td>
                                <td>{row.won}</td>
                                <td>{row.drawn}</td>
                                <td>{row.lost}</td>
                                <td>{row.goal_difference}</td>
                                <td>{row.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'Markets' && (
                  <div className="matchcentre-panel">
                    <h2>Markets for this fixture</h2>
                    {relatedMarkets.length === 0 ? (
                      <p className="matchcentre-empty">No open markets for this fixture yet.</p>
                    ) : (
                      <div className="mc-market-grid">
                        {relatedMarkets.map((market) => (
                          <Link to="/markets" className="mc-market-card" key={market.id}>
                            <p className="mc-market-card__question">{market.question}</p>
                            <p className="mc-market-card__meta">Closes {formatFixtureKickoff(market.closesAt)}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default MatchCentre;
