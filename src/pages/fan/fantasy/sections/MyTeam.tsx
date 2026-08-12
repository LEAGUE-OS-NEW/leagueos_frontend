import { useMemo, useState } from 'react';
import type { Competition, FantasyTeam, Player } from '../types';
import { SPORT_RULES, PLAYERS } from '../data';
import { Badge, StatCard } from './shared';
import PlayerAvatar from './PlayerAvatar';
import PlayerDrawer from './PlayerDrawer';
import { Drawer } from './Modal';

interface Props {
  competition: Competition;
  team: FantasyTeam;
  onGoTransfers: () => void;
}

export default function MyTeam({ competition, team, onGoTransfers }: Props) {
  const rules = SPORT_RULES[competition.sport];
  const byId = useMemo(() => new Map(PLAYERS.map((p) => [p.id, p])), []);
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null);
  const [showPointsFor, setShowPointsFor] = useState<Player | null>(null);

  const starters = team.squad.filter((s) => s.isStarter).map((s) => byId.get(s.playerId)!);
  const bench = team.squad.filter((s) => !s.isStarter).map((s) => byId.get(s.playerId)!);

  const gwPoints = starters.reduce((sum, p) => {
    const mult = p.id === team.captainId ? 2 : 1;
    return sum + p.gwPoints * mult;
  }, 0);

  const doubtfulStarters = starters.filter((p) => p.status !== 'ready');

  return (
    <div className="my-team">
      <div className="stat-row">
        <StatCard label={`Gameweek ${competition.currentGameweek} points`} value={gwPoints} accent="#6c5ce7" />
        <StatCard label="Overall rank" value={team.overallRank ? `#${team.overallRank.toLocaleString()}` : '—'} accent="#f4661b" />
        <StatCard label="Free transfers" value={team.freeTransfers} sub="Resets next gameweek" accent="#22c55e" />
        <StatCard label="Budget in bank" value={`${team.budgetRemaining.toFixed(1)}M`} accent="#38bdf8" />
      </div>

      {doubtfulStarters.length > 0 && (
        <div className="alert-banner">
          <strong>Availability alert.</strong> {doubtfulStarters.length} starting player
          {doubtfulStarters.length > 1 ? 's are' : ' is'} not fully fit — check before the deadline.
        </div>
      )}

      <div className="my-team-layout">
        <div>
          <div className="sb-summary-bar">
            <div>
              <strong>{team.teamName}</strong> · {rules.label}
            </div>
            <Badge tone="blue">Deadline {competition.deadline}</Badge>
          </div>

          <div className={`pitch pitch-${rules.pitchStyle}`}>
            {rules.positionGroups.map((g) => {
              const groupStarters = starters.filter((p) => p.position === g.group);
              if (groupStarters.length === 0) return null;
              return (
                <div className="pitch-row" key={g.group}>
                  <div className="pitch-slots">
                    {groupStarters.map((p) => (
                      <button className="pitch-slot filled" key={p.id} onClick={() => setViewPlayer(p)}>
                        <PlayerAvatar player={p} size={52} />
                        {p.id === team.captainId && <span className="captain-badge">C</span>}
                        {p.id === team.viceCaptainId && <span className="vice-badge">V</span>}
                        <span className="pitch-slot-name">{p.name.split(' ').slice(-1)[0]}</span>
                        <span className="pitch-slot-price">
                          {p.gwPoints * (p.id === team.captainId ? 2 : 1)} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bench-strip">
            <h5>Bench</h5>
            <div className="bench-row">
              {bench.map((p) => (
                <button className="bench-chip" key={p.id} onClick={() => setViewPlayer(p)}>
                  <PlayerAvatar player={p} size={32} />
                  {p.name.split(' ').slice(-1)[0]}
                  <em>{p.gwPoints} pts</em>
                </button>
              ))}
            </div>
          </div>

          <div className="sb-actions">
            <button className="btn btn-primary" onClick={onGoTransfers}>
              Make transfers
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPointsFor(starters[0] ?? null)}>
              View points breakdown
            </button>
          </div>
        </div>

        <div className="my-team-side">
          <h4>Gameweek {competition.currentGameweek} actions</h4>
          <ul className="action-list">
            <li onClick={onGoTransfers}>
              <strong>Make transfers</strong>
              <span>{team.freeTransfers} free transfer{team.freeTransfers === 1 ? '' : 's'} available</span>
            </li>
            <li>
              <strong>Edit lineup</strong>
              <span>Change starters and bench order</span>
            </li>
            <li>
              <strong>Change {rules.multiplierLabel.toLowerCase()}</strong>
              <span>{rules.multiplierLabel} multiplier x2</span>
            </li>
            <li>
              <strong>View fixtures</strong>
              <span>Check matchups for your players</span>
            </li>
          </ul>
        </div>
      </div>

      {viewPlayer && (
        <PlayerDrawer
          player={viewPlayer}
          onClose={() => setViewPlayer(null)}
          inSquad
          canAdd={false}
          onRemove={() => setViewPlayer(null)}
        />
      )}

      {showPointsFor && (
        <Drawer title="Gameweek Points Breakdown" subtitle={`Gameweek ${competition.currentGameweek}`} onClose={() => setShowPointsFor(null)}>
          <div className="points-breakdown-list">
            {starters.map((p) => (
              <div className="points-breakdown-row" key={p.id}>
                <PlayerAvatar player={p} size={32} />
                <div className="points-breakdown-name">
                  <strong>
                    {p.name} {p.id === team.captainId && <span className="captain-c-inline">C</span>}
                  </strong>
                  <span>{p.club}</span>
                </div>
                <div className="points-breakdown-value">{p.gwPoints * (p.id === team.captainId ? 2 : 1)} pts</div>
              </div>
            ))}
          </div>
        </Drawer>
      )}
    </div>
  );
}
