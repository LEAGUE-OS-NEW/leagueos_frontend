
import type { Competition } from '../types';
import { rulesFor } from '../data';
import {  Badge } from './shared';
import { SPORT_META } from '../SportMeta';

interface Props {
  competition: Competition;
  hasTeam: boolean;
  onBack: () => void;
  onCreateTeam: () => void;
  onManageTeam: () => void;
}

export default function CompetitionDetail({ competition, hasTeam, onBack, onCreateTeam, onManageTeam }: Props) {
  const rules = rulesFor(competition);

  return (
    <div className="comp-detail">
      <button className="btn-link" onClick={onBack}>
        ← Back to Fantasy Hub
      </button>

      <div className="comp-detail-head">
        <span className="sport-tag large">
          {SPORT_META[competition.sport].emoji} {SPORT_META[competition.sport].label}
        </span>
        <h1>{competition.name}</h1>
        <p>{competition.description}</p>
        <div className="comp-detail-meta">
          <Badge tone={competition.status === 'active' ? 'green' : 'orange'}>
            {competition.status === 'active' ? `Gameweek ${competition.currentGameweek} of ${competition.totalGameweeks}` : 'Entries open soon'}
          </Badge>
          <span>{competition.entries.toLocaleString()} managers entered</span>
          <span>Season {competition.season}</span>
        </div>
      </div>

      <div className="comp-detail-grid">
        <div className="comp-detail-card">
          <h3>Squad &amp; budget</h3>
          <ul className="rules-list">
            <li>
              <span>Squad size</span>
              <strong>{rules.squadSize} players</strong>
            </li>
            <li>
              <span>Starting {competition.sport === 'football' ? 'XI' : 'lineup'}</span>
              <strong>{rules.startersCount} players</strong>
            </li>
            <li>
              <span>Budget</span>
              <strong>UGX {rules.budget.toFixed(1)}M</strong>
            </li>
            <li>
              <span>Max players per club</span>
              <strong>{rules.maxPerClub}</strong>
            </li>
          </ul>
        </div>

        <div className="comp-detail-card">
          <h3>Positions</h3>
          <ul className="rules-list">
            {rules.positionGroups.map((g) => (
              <li key={g.group}>
                <span>{g.label}</span>
                <strong>{g.squadCount} in squad · {g.starterMin}–{g.starterMax} starting</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="comp-detail-card">
          <h3>Transfers &amp; deadlines</h3>
          <ul className="rules-list">
            <li>
              <span>Free transfers</span>
              <strong>{competition.api.free_transfers_per_gameweek} per gameweek</strong>
            </li>
            <li>
              <span>Extra transfer cost</span>
              <strong>-{competition.api.transfer_penalty} points each</strong>
            </li>
            <li>
              <span>Next deadline</span>
              <strong>{competition.deadline}</strong>
            </li>
            <li>
              <span>{rules.multiplierLabel}</span>
              <strong>Points ×{competition.api.captain_multiplier} each gameweek</strong>
            </li>
          </ul>
        </div>

        <div className="comp-detail-card">
          <h3>Scoring basics</h3>
          <p className="rules-note">
            Points are calculated from official match data once a gameweek locks. Your squad is frozen at the deadline, so
            line up your strongest {competition.sport === 'football' ? 'XI' : 'team'} before then.
          </p>
        </div>
      </div>

      <div className="sb-actions comp-detail-cta">
        {hasTeam ? (
          <button className="btn btn-primary" onClick={onManageTeam}>
            Manage my team
          </button>
        ) : (
          <button className="btn btn-primary" disabled={competition.status === 'upcoming'} onClick={onCreateTeam}>
            {competition.status === 'upcoming' ? 'Entries open soon' : 'Create my team'}
          </button>
        )}
      </div>
    </div>
  );
}
