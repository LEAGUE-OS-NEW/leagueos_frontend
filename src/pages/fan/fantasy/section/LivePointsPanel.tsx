import React, { useMemo } from 'react';
import type { Sport, Player } from '../FantasyCompetitions';

interface ScoreEvent {
  label: string;
  points: number;
}

const EVENT_POOL: Record<Sport, ScoreEvent[]> = {
  football: [
    { label: 'Goal', points: 5 },
    { label: 'Assist', points: 3 },
    { label: 'Clean sheet', points: 4 },
    { label: 'Bonus points', points: 2 },
  ],
  basketball: [
    { label: '20+ points', points: 8 },
    { label: 'Double-double', points: 6 },
    { label: 'Steal', points: 2 },
    { label: 'Rebound haul', points: 3 },
  ],
  rugby: [
    { label: 'Try', points: 8 },
    { label: 'Turnover won', points: 3 },
    { label: 'Metres carried', points: 2 },
    { label: 'Try assist', points: 4 },
  ],
};

// Small deterministic hash so each player always maps to the same mock
// event for a given render — no per-render randomness.
const seed = (id: string): number => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 97;
  return h;
};

interface LivePointsPanelProps {
  sport: Sport;
  startingPlayers: Player[];
  benchPlayers: Player[];
  captainId: string | null;
  minutesPlayed: Record<string, number>;
  rankChange: number;
}

const LivePointsPanel: React.FC<LivePointsPanelProps> = ({
  sport,
  startingPlayers,
  benchPlayers,
  captainId,
  minutesPlayed,
  rankChange,
}) => {
  const pool = EVENT_POOL[sport];

  const rows = useMemo(
    () =>
      startingPlayers
        .filter((p) => minutesPlayed[p.id] !== 0)
        .map((p) => {
          const event = pool[seed(p.id) % pool.length];
          const isCaptain = p.id === captainId;
          return { player: p, event, isCaptain, awarded: isCaptain ? event.points * 2 : event.points };
        }),
    [startingPlayers, minutesPlayed, captainId, pool]
  );

  const basePoints = rows.reduce((sum, r) => sum + r.event.points, 0);
  const captainBonus = rows.filter((r) => r.isCaptain).reduce((sum, r) => sum + r.event.points, 0);
  const benchPoints = benchPlayers.reduce((sum, p) => sum + Math.round(p.expectedPoints * 0.2), 0);
  const liveScore = basePoints + captainBonus;

  return (
    <div className="live-points">
      <div className="live-points__summary">
        <div>
          <span className="live-points__label">Live score</span>
          <span className="live-points__value mono">{liveScore}</span>
        </div>
        <div>
          <span className="live-points__label">Captain bonus</span>
          <span className="live-points__value mono is-positive">+{captainBonus}</span>
        </div>
        <div>
          <span className="live-points__label">Bench points</span>
          <span className="live-points__value mono">{benchPoints}</span>
        </div>
        <div>
          <span className="live-points__label">Rank change</span>
          <span className={`live-points__value mono ${rankChange >= 0 ? 'is-positive' : 'is-negative'}`}>
            {rankChange >= 0 ? '↑' : '↓'} {Math.abs(rankChange)} places
          </span>
        </div>
      </div>

      <table className="live-points__table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Event</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player.id}>
              <td>
                {r.player.name}
                {r.isCaptain && <span className="badge badge--captain">C</span>}
              </td>
              <td>{r.event.label}</td>
              <td className="mono is-positive">+{r.awarded}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="live-points__empty">
                No live events yet — simulate a kickoff from the Gameweek Hub.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LivePointsPanel;
