import { useState } from 'react';
import type { Competition, FantasyTeam, Sport } from '../types';
import { COMPETITIONS } from '../data';
import { SearchBar, SportFilter, SPORT_META, Badge, StatCard } from './shared';

interface Props {
  teams: Record<string, FantasyTeam>;
  onOpenCompetition: (c: Competition) => void;
  onManageTeam: (c: Competition) => void;
}

export default function FantasyHub({ teams, onOpenCompetition, onManageTeam }: Props) {
  const [sport, setSport] = useState<Sport | 'all'>('all');
  const [search, setSearch] = useState('');

  const active = Object.values(teams);
  const bestRank = active.reduce<number | null>((best, t) => {
    if (!t.overallRank) return best;
    return best === null ? t.overallRank : Math.min(best, t.overallRank);
  }, null);
  const totalPoints = active.reduce((s, t) => s + t.totalPoints, 0);

  const filtered = COMPETITIONS.filter((c) => sport === 'all' || c.sport === sport).filter(
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
        <StatCard label="Total points" value={totalPoints} accent="#ec4899" />
        <StatCard label="Mini-leagues" value="4" sub="2 private, 2 public" accent="#22c55e" />
      </div>

      {withTeams.length > 0 && (
        <section className="hub-section">
          <h2>Your active teams</h2>
          <div className="hub-team-cards">
            {withTeams.map((c) => {
              const team = teams[c.id]!;
              return (
                <button className="hub-team-card" key={c.id} onClick={() => onManageTeam(c)}>
                  <div className="hub-team-card-top">
                    <span className="sport-tag">
                      {SPORT_META[c.sport].emoji} {c.shortName}
                    </span>
                    <Badge tone="green">GW{c.currentGameweek} open</Badge>
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
          {discoverable.map((c) => (
            <div className="hub-comp-row" key={c.id}>
              <div className="hub-comp-row-main">
                <span className="sport-tag">
                  {SPORT_META[c.sport].emoji} {SPORT_META[c.sport].label}
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <span className="hub-comp-sub">
                    {c.status === 'upcoming' ? 'Entries open soon' : `GW ${c.currentGameweek}/${c.totalGameweeks}`} ·{' '}
                    {c.entries.toLocaleString()} entries
                  </span>
                </div>
              </div>
              <div className="hub-comp-row-actions">
                <Badge tone={c.status === 'active' ? 'green' : c.status === 'upcoming' ? 'orange' : 'gray'}>
                  {c.status === 'active' ? 'Active' : c.status === 'upcoming' ? 'Upcoming' : 'Draft'}
                </Badge>
                <button className="btn btn-secondary" onClick={() => onOpenCompetition(c)}>
                  View
                </button>
              </div>
            </div>
          ))}
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
