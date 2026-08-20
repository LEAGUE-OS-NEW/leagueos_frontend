/**
 * GameweekFixtures
 *
 * Displays the fixtures for a specific Fantasy Competition, grouped by
 * gameweek. Includes a prev/next gameweek selector so the fan can browse
 * past and upcoming weeks.
 *
 * Data source: GET /fantasy/gameweeks/?competition=<id>
 * Each gameweek already carries fixture_details (id, name, home_team,
 * away_team, starts_at, status, venue, home_score, away_score).
 *
 * No additional API calls beyond fetchFantasyGameweeks are needed.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Competition, FantasyTeam } from '../types';
import type { FantasyGameweek } from '../../../../services/fantasyService';
import { fetchFantasyGameweeks } from '../../../../services/fantasyService';
import {
  deriveFixtureStatus,
  fixtureStatusClass,
} from '../../../../services/fixturesService';

interface Props {
  competition: Competition;
  team?: FantasyTeam;
  /** Called when user wants to navigate to My Team for this competition */
  onManageTeam: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function gwStatusBadge(status: FantasyGameweek['status']): string {
  switch (status) {
    case 'OPEN':     return 'gw-status gw-status-open';
    case 'LIVE':     return 'gw-status gw-status-live';
    case 'LOCKED':   return 'gw-status gw-status-locked';
    case 'SCORING':  return 'gw-status gw-status-scoring';
    case 'FINALIZED':return 'gw-status gw-status-finalized';
    default:         return 'gw-status gw-status-draft';
  }
}

function gwStatusLabel(status: FantasyGameweek['status']): string {
  const map: Record<FantasyGameweek['status'], string> = {
    DRAFT: 'Draft', OPEN: 'Open', LOCKED: 'Locked',
    LIVE: 'Live', SCORING: 'Scoring', FINALIZED: 'Final',
  };
  return map[status] ?? status;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameweekFixtures({ competition, team, onManageTeam }: Props) {
  const [gameweeks, setGameweeks] = useState<FantasyGameweek[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const gws = await fetchFantasyGameweeks(competition.id);
      // Sort by number ascending
      const sorted = [...gws].sort((a, b) => a.number - b.number);
      setGameweeks(sorted);

      // Default to the current (active) gameweek
      const currentIdx = sorted.findIndex(
        g => g.status === 'OPEN' || g.status === 'LIVE' || g.status === 'SCORING',
      );
      setSelectedIndex(currentIdx >= 0 ? currentIdx : sorted.length - 1);
    } catch {
      setError('Could not load gameweek fixtures.');
    } finally {
      setLoading(false);
    }
  }, [competition.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const gw = gameweeks[selectedIndex] ?? null;
  const isFirst = selectedIndex === 0;
  const isLast = selectedIndex === gameweeks.length - 1;
  const gwPoints = team?.gwPoints ?? null;

  const fixtures = gw?.fixture_details ?? [];
  const COLLAPSED_LIMIT = 4;
  const visibleFixtures = showAll ? fixtures : fixtures.slice(0, COLLAPSED_LIMIT);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="gw-fixtures">
        <div className="gw-fixtures-skeleton">
          {[1, 2, 3].map(i => <div className="gw-fixture-skeleton-row" key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gw-fixtures">
        <p className="gw-fixtures-error">{error}</p>
        <button className="btn btn-secondary" onClick={() => void load()}>Retry</button>
      </div>
    );
  }

  if (!gameweeks.length) {
    return (
      <div className="gw-fixtures">
        <div className="empty-state">
          <h3>No gameweeks yet</h3>
          <p>Fixtures will appear here once the admin sets up gameweeks for this competition.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gw-fixtures">
      {/* ── Gameweek selector ── */}
      <div className="gw-selector">
        <button
          className="gw-nav-btn"
          disabled={isFirst}
          onClick={() => { setSelectedIndex(i => i - 1); setShowAll(false); }}
          aria-label="Previous gameweek"
        >
          ←
        </button>

        <div className="gw-selector-info">
          <div className="gw-selector-title">
            <span className="gw-selector-name">{gw?.name ?? `Gameweek ${selectedIndex + 1}`}</span>
            {gw && (
              <span className={gwStatusBadge(gw.status)}>{gwStatusLabel(gw.status)}</span>
            )}
          </div>
          {gw && (
            <div className="gw-selector-dates">
              <span>{formatDate(gw.starts_at)} – {formatDate(gw.ends_at)}</span>
              <span className="gw-deadline-label">
                Deadline: <strong>{formatDeadline(gw.deadline_at)}</strong>
              </span>
            </div>
          )}
        </div>

        <button
          className="gw-nav-btn"
          disabled={isLast}
          onClick={() => { setSelectedIndex(i => i + 1); setShowAll(false); }}
          aria-label="Next gameweek"
        >
          →
        </button>
      </div>

      {/* ── Points bar (if user has a team) ── */}
      {team && gw && (
        <div className="gw-points-bar">
          <div className="gw-points-bar-stat">
            <span>Your GW points</span>
            <strong className="gw-points-value">{gwPoints ?? '—'}</strong>
          </div>
          <div className="gw-points-bar-stat">
            <span>Season total</span>
            <strong>{team.totalPoints}</strong>
          </div>
          <div className="gw-points-bar-stat">
            <span>Free transfers</span>
            <strong>{team.freeTransfers}</strong>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onManageTeam}>
            Manage team
          </button>
        </div>
      )}

      {/* ── Fixture list ── */}
      <div className="gw-fixture-list">
        {fixtures.length === 0 ? (
          <div className="gw-fixtures-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 13h24" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 4v4M22 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p>No fixtures assigned to this gameweek yet.</p>
          </div>
        ) : (
          <>
            {visibleFixtures.map(fixture => {
              // Parse home/away from structured fields, fall back to name split
              const home = fixture.home_team ?? fixture.name.split(' vs ')[0] ?? 'TBD';
              const away = fixture.away_team ?? fixture.name.split(' vs ')[1] ?? 'TBD';
              const hasScore = fixture.home_score != null && fixture.away_score != null;
              const status = deriveFixtureStatus(fixture.status, hasScore);
              const statusClass = fixtureStatusClass(status);

              return (
                <div className="gw-fixture-card" key={fixture.id}>
                  <div className="gw-fixture-teams">
                    <span className="gw-fixture-team gw-team-home">{home}</span>
                    <div className="gw-fixture-centre">
                      {hasScore ? (
                        <span className="gw-fixture-score">
                          {fixture.home_score} – {fixture.away_score}
                        </span>
                      ) : (
                        <span className="gw-fixture-vs">vs</span>
                      )}
                      <span className={statusClass}>{status}</span>
                    </div>
                    <span className="gw-fixture-team gw-team-away">{away}</span>
                  </div>

                  <div className="gw-fixture-meta">
                    {fixture.starts_at && (
                      <span className="gw-fixture-time">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        {formatDate(fixture.starts_at)} · {formatTime(fixture.starts_at)}
                      </span>
                    )}
                    {fixture.venue && (
                      <span className="gw-fixture-venue">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 2a4 4 0 014 4c0 3-4 8-4 8S4 9 4 6a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.4"/>
                          <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        {fixture.venue}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {fixtures.length > COLLAPSED_LIMIT && (
              <button
                className="gw-show-more-btn"
                onClick={() => setShowAll(v => !v)}
              >
                {showAll
                  ? `Show fewer fixtures`
                  : `Show all ${fixtures.length} fixtures`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Gameweek progress dots */}
      {gameweeks.length > 1 && (
        <div className="gw-progress-dots" role="tablist" aria-label="Gameweek navigation">
          {gameweeks.map((g, i) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={i === selectedIndex}
              className={`gw-dot${i === selectedIndex ? ' gw-dot-active' : ''}${
                g.status === 'OPEN' || g.status === 'LIVE' ? ' gw-dot-current' : ''
              }`}
              title={g.name}
              onClick={() => { setSelectedIndex(i); setShowAll(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
