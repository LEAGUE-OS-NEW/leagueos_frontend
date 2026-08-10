import React from 'react';
import type { Player } from '../FantasyCompetitions';

export interface Fixture {
  home: string;
  away: string;
  status: string;
}

export interface LeagueSeason {
  currentGameweek: number;
  totalGameweeks: number;
  transferWindowOpen: boolean;
  deadline: string; // ISO timestamp
  seasonStart: string;
  seasonEnd: string;
}

const formatCountdown = (deadlineIso: string): string => {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Deadline passed';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

interface GameweekHubProps {
  season: LeagueSeason;
  fixtures: Fixture[];
  startingPlayers: Player[];
  captainId: string | null;
  viceId: string | null;
  freeTransfers: number;
  seasonPoints: number;
  overallRank: number;
  simulated: boolean;
  onSimulate: () => void;
  onViewLivePoints: () => void;
}

const GameweekHub: React.FC<GameweekHubProps> = ({
  season,
  fixtures,
  startingPlayers,
  captainId,
  viceId,
  freeTransfers,
  seasonPoints,
  overallRank,
  simulated,
  onSimulate,
  onViewLivePoints,
}) => {
  return (
    <div className="gw-hub">
      <div className="gw-hub__top">
        <div>
          <h3>Gameweek {season.currentGameweek}</h3>
          <p className="gw-hub__deadline">Deadline: {formatCountdown(season.deadline)}</p>
        </div>
        <div className="gw-hub__season mono">
          <span>
            GW {season.currentGameweek} of {season.totalGameweeks}
          </span>
          <span>Season points: {seasonPoints}</span>
          <span>Overall rank: {overallRank.toLocaleString()}</span>
        </div>
      </div>

      <div className="gw-hub__fixtures">
        <h4>Match schedule</h4>
        <ul>
          {fixtures.map((f, i) => (
            <li key={`${f.home}-${f.away}-${i}`}>
              <span className="gw-hub__match">
                {f.home} vs {f.away}
              </span>
              <span className={`gw-hub__status${f.status === 'LIVE' ? ' gw-hub__status--live' : ''}`}>
                {f.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="gw-hub__lineup">
        <h4>Your active lineup</h4>
        {startingPlayers.length === 0 ? (
          <p className="gw-hub__empty">No starters confirmed yet — head to Lineup to set your team.</p>
        ) : (
          <ul className="gw-hub__lineup-list">
            {startingPlayers.map((p) => (
              <li key={p.id}>
                <span>{p.name}</span>
                {p.id === captainId && <span className="badge badge--captain">C</span>}
                {p.id === viceId && <span className="badge badge--vice">V</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="gw-hub__transfers">
          Free transfers remaining: <strong className="mono">{freeTransfers}</strong>
        </p>
      </div>

      <div className="gw-hub__actions">
        <button type="button" className="btn btn--primary" onClick={onSimulate}>
          {simulated ? 'Re-simulate kickoff' : 'Simulate kickoff'}
        </button>
        {simulated && (
          <button type="button" className="btn btn--ghost" onClick={onViewLivePoints}>
            View live points →
          </button>
        )}
      </div>
    </div>
  );
};

export default GameweekHub;
