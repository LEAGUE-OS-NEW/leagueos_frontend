import React from 'react';
import type { StandingEntry, ScoringCorrection } from '../FantasyCompetitions';

interface StandingsTableProps {
  standings: StandingEntry[];
  corrections: ScoringCorrection[];
  accent: string;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings, corrections, accent }) => {
  return (
    <div className="standings" style={{ ['--accent' as string]: accent }}>
      <div className="standings__table-wrap">
        <table className="standings__table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Manager</th>
              <th>Team</th>
              <th>Captain pts</th>
              <th>Transfer hits</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => (
              <tr
                key={entry.rank}
                className={`${entry.rank <= 3 ? 'standings__row--top' : ''}${entry.isCurrentUser ? ' standings__row--current-user' : ''}`}
              >
                <td className="standings__rank">
                  <span className="standings__rank-badge">{entry.rank}</span>
                </td>
                <td>{entry.manager}</td>
                <td className="standings__team">{entry.teamName}</td>
                <td className="mono">+{entry.captainPoints}</td>
                <td className="mono standings__hits">{entry.transferHits ? `-${entry.transferHits}` : '—'}</td>
                <td className="mono standings__points">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="corrections">
        <h4>Scoring corrections log</h4>
        <p className="corrections__sub">Every automated point change is logged here for full transparency.</p>
        <ul className="corrections__list">
          {corrections.map((c) => (
            <li key={c.id} className="corrections__item">
              <span className={`corrections__tag corrections__tag--${c.type}`}>{c.type}</span>
              <div className="corrections__body">
                <p className="corrections__desc">{c.description}</p>
                <span className="corrections__meta">
                  {c.player} · Gameweek {c.gameweek}
                </span>
              </div>
              <span className={`corrections__delta ${c.pointsDelta >= 0 ? 'is-positive' : 'is-negative'}`}>
                {c.pointsDelta >= 0 ? '+' : ''}
                {c.pointsDelta} pts
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StandingsTable;
