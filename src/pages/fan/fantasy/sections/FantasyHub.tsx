import { useState } from 'react';
import type { Competition, FantasyTeam, Sport } from '../types';
import { SearchBar, SportFilter, Badge, StatCard } from './shared';
import { SPORT_META } from '../SportMeta';
import GameweekFixtures from './GameweekFixtures';

interface Props {
  teams: Record<string, FantasyTeam>;
  competitions: Competition[];
  leagueCount: number;
  onOpenCompetition: (c: Competition) => void;
  onManageTeam: (c: Competition) => void;
}

export default function FantasyHub({ teams, competitions, leagueCount, onOpenCompetition, onManageTeam }: Props) {
  const [sport, setSport] = useState<Sport | 'all'>('all');
  const [search, setSearch] = useState('');
  /** Competition whose gameweek fixtures panel is expanded */
  const [fixturesFor, setFixturesFor] = useState<string | null>(null);

  const active = Object.values(teams);
  const bestRank = active.reduce<number | null>((best, t) => {
    if (!t.overallRank) return best;
    return best === null ? t.overallRank : Math.min(best, t.overallRank);
  }, null);
  const totalPoints = active.reduce((s, t) => s + t.totalPoints, 0);

  const filtered = competitions.filter((c) => sport === 'all' || c.sport === sport).filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.shortName.toLowerCase().includes(search.toLowerCase()),
  );

  const withTeams = filtered.filter((c) => teams[c.id]);
  const discoverable = filtered.filter((c) => !teams[c.id]);

  return (
    <div className="hub">
      <div className="hub-heading">
        <h1>Fantasy Hub</h1>
        <p>Pick a competition, manage your team, and track the current gameweek.</p>
      </div>

      <div className="stat-row">
        <StatCard label="Active teams" value={active.length} accent="#6c5ce7" />
        <StatCard label="Best overall rank" value={bestRank ? `#${bestRank.toLocaleString()}` : '—'} accent="#f4661b" />
        <StatCard label="Total points" value={totalPoints} accent="#6c5ce7" />
        <StatCard label="Mini-leagues" value={leagueCount} accent="#22c55e" />
      </div>

      {withTeams.length > 0 && (
        <section className="hub-section">
          <h2>Your active teams</h2>
          <div className="hub-team-cards">
            {withTeams.map((c) => {
              const team = teams[c.id]!;
              const showFixtures = fixturesFor === c.id;
              return (
                <div className="hub-team-card-wrapper" key={c.id}>
                  {/* ── Team summary card ── */}
                  <button className="hub-team-card" onClick={() => onManageTeam(c)}>
                    <div className="hub-team-card-top">
                      <span className="sport-tag">
                        {SPORT_META[c.sport].emoji} {c.shortName}
                      </span>
                      <Badge tone="green">GWk{c.currentGameweek}/{c.totalGameweeks} open</Badge>
                    </div>
                    <strong className="hub-team-card-name">{team.teamName}</strong>
                    <div className="hub-team-card-stats">
                      <div>
                        <span>Deadline</span>
                        <strong>{c.deadline}</strong>
                      </div>
                      <div>
                        <span>Total points</span>
                        <strong>{team.totalPoints}</strong>
                      </div>
                      <div>
                        <span>Free transfers</span>
                        <strong>{team.freeTransfers}</strong>
                      </div>
                    </div>
                  </button>

                  {/* ── Fixtures toggle ── */}
                  <button
                    className={`hub-fixtures-toggle${showFixtures ? ' hub-fixtures-toggle-open' : ''}`}
                    onClick={() => setFixturesFor(showFixtures ? null : c.id)}
                    aria-expanded={showFixtures}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 9h2M9 9h2M5 12h2M9 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {showFixtures ? 'Hide fixtures' : 'View fixtures'}
                    <svg
                      className={`hub-fixtures-chevron${showFixtures ? ' rotated' : ''}`}
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                    >
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* ── Fixtures panel ── */}
                  {showFixtures && (
                    <div className="hub-fixtures-panel">
                      <GameweekFixtures
                        competition={c}
                        team={team}
                        onManageTeam={() => onManageTeam(c)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="hub-section">
        <div className="hub-section-head">
          <h2>Available fantasy competitions</h2>
          <SearchBar value={search} onChange={setSearch} placeholder="Search competitions…" />
        </div>
        <SportFilter value={sport} onChange={setSport} />

        <div className="hub-comp-list">
          {discoverable.map((c) => {
            const showFixtures = fixturesFor === c.id;
            return (
              <div key={c.id}>
                <div className="hub-comp-row">
                  <div className="hub-comp-row-main">
                    <span className="sport-tag">
                      {SPORT_META[c.sport].emoji} {SPORT_META[c.sport].label}
                    </span>
                    <div>
                      <strong>{c.name}</strong>
                      <span className="hub-comp-sub">
                        {c.status === 'upcoming' ? 'Entries open soon' : `GW ${c.currentGameweek}/${c.totalGameweeks}`} ·{' '}
                        Registration {c.api.registration_state.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="hub-comp-row-actions">
                    <Badge tone={c.status === 'active' ? 'green' : c.status === 'upcoming' ? 'orange' : 'gray'}>
                      {c.status === 'active' ? 'Active' : c.status === 'upcoming' ? 'Upcoming' : 'Draft'}
                    </Badge>
                    <button
                      className="btn hub-view-btn"
                      aria-label={`${showFixtures ? 'Hide' : 'View'} fixtures for ${c.name}`}
                      onClick={() => setFixturesFor(showFixtures ? null : c.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4 }}>
                        <rect x="2" y="2" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4"/>
                      </svg>
                      {showFixtures ? 'Hide' : 'Fixtures'}
                    </button>
                    <button className="btn hub-view-btn" onClick={() => onOpenCompetition(c)}>
                      View
                    </button>
                  </div>
                </div>

                {/* Fixtures panel for browseable competitions */}
                {showFixtures && (
                  <div className="hub-fixtures-panel hub-fixtures-panel-comp">
                    <GameweekFixtures
                      competition={c}
                      onManageTeam={() => onOpenCompetition(c)}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {discoverable.length === 0 && withTeams.length === 0 && (
            <div className="empty-state">
              <h3>No competitions match your filters</h3>
              <p>Try a different sport or clear your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
