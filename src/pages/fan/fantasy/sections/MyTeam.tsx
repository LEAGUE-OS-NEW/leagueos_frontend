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
  onSwapLineup: (starterId: string, benchId: string) => void;
}

export default function MyTeam({ competition, team, onGoTransfers, onSwapLineup }: Props) {
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

  

  return (
    <div className="my-team">
      <div className="stat-row">
        <StatCard label={`Gameweek ${competition.currentGameweek} points`} value={gwPoints} accent="#6c5ce7" />
        <StatCard label="Overall rank" value={team.overallRank ? `#${team.overallRank.toLocaleString()}` : '—'} accent="#f4661b" />
        <StatCard label="Free transfers" value={team.freeTransfers} sub="Resets next gameweek" accent="#22c55e" />
        <StatCard label="Budget in bank" value={`${team.budgetRemaining.toFixed(1)}M`} accent="#38bdf8" />
      </div>

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
          benchOptions={
            starters.some((s) => s.id === viewPlayer.id)
              ? bench.filter((b) => b.position === viewPlayer.position)
              : []
          }
          onSwap={
            starters.some((s) => s.id === viewPlayer.id)
              ? (benchId) => {
                  onSwapLineup(viewPlayer.id, benchId);
                  setViewPlayer(null);
                }
              : undefined
          }
        />
      )}

      {showPointsFor && (
        <Drawer title="Gameweek Points Breakdown" subtitle={`Gameweek ${competition.currentGameweek}`} onClose={() => setShowPointsFor(null)}>

          {/* ── Summary grid ── */}
          <div className="breakdown-summary">
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Gameweek points</span>
              <span className="breakdown-stat-value">{gwPoints}</span>
              <span className="breakdown-stat-sub">Your team's GW score</span>
            </div>
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Total points</span>
              <span className="breakdown-stat-value">{team.totalPoints}</span>
              <span className="breakdown-stat-sub">Season cumulative</span>
            </div>
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Captain points</span>
              <span className="breakdown-stat-value breakdown-stat-orange">
                {team.captainId
                  ? (() => { const c = byId.get(team.captainId); return c ? `${c.gwPoints * 2}` : '—'; })()
                  : '—'}
              </span>
              <span className="breakdown-stat-sub">
                {team.captainId
                  ? (() => { const c = byId.get(team.captainId); return c ? `${c.name.split(' ').slice(-1)[0]} ×2` : ''; })()
                  : 'No captain set'}
              </span>
            </div>
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Best player</span>
              <span className="breakdown-stat-value breakdown-stat-green">
                {starters.length > 0
                  ? Math.max(...starters.map((p) => p.gwPoints * (p.id === team.captainId ? 2 : 1)))
                  : '—'}
              </span>
              <span className="breakdown-stat-sub">
                {starters.length > 0
                  ? (() => {
                      const top = starters.reduce((best, p) => {
                        const pts = p.gwPoints * (p.id === team.captainId ? 2 : 1);
                        const bestPts = best.gwPoints * (best.id === team.captainId ? 2 : 1);
                        return pts > bestPts ? p : best;
                      });
                      return `${top.name.split(' ').slice(-1)[0]} pts`;
                    })()
                  : ''}
              </span>
            </div>
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Bench points</span>
              <span className="breakdown-stat-value breakdown-stat-dim">
                {bench.reduce((sum, p) => sum + p.gwPoints, 0)}
              </span>
              <span className="breakdown-stat-sub">Not counted in GW total</span>
            </div>
            <div className="breakdown-stat">
              <span className="breakdown-stat-label">Overall rank</span>
              <span className="breakdown-stat-value">
                {team.overallRank ? `#${team.overallRank.toLocaleString()}` : '—'}
              </span>
              <span className="breakdown-stat-sub">{competition.shortName}</span>
            </div>
          </div>

          <div className="breakdown-divider" />

          {/* ── Per-player list ── */}
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

          {bench.length > 0 && (
            <>
              <p className="breakdown-bench-label">Bench (not counted)</p>
              <div className="points-breakdown-list">
                {bench.map((p) => (
                  <div className="points-breakdown-row breakdown-row-bench" key={p.id}>
                    <PlayerAvatar player={p} size={32} />
                    <div className="points-breakdown-name">
                      <strong>{p.name}</strong>
                      <span>{p.club}</span>
                    </div>
                    <div className="points-breakdown-value breakdown-stat-dim">{p.gwPoints} pts</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}
