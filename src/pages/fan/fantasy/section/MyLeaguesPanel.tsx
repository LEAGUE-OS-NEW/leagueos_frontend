import React from 'react';
import type { Sport } from '../FantasyCompetitions';

export interface JoinedLeagueRecord {
  competitionId: string;
  sport: Sport;
  name: string;
  members: number;
  code?: string;
  rank: number;
  totalPoints: number;
  gameweekLabel: string;
}

interface MyLeaguesPanelProps {
  leagues: JoinedLeagueRecord[];
  onQuickAction: (league: JoinedLeagueRecord, action: 'lineup' | 'transfers' | 'standings') => void;
}

const SPORT_ICON: Record<Sport, string> = {
  football: '⚽',
  rugby: '🏉',
  basketball: '🏀',
};

const MyLeaguesPanel: React.FC<MyLeaguesPanelProps> = ({ leagues, onQuickAction }) => {
  if (leagues.length === 0) return null;

  return (
    <div className="my-leagues">
      <div className="section-heading section-heading--tight">
        <h2>My leagues</h2>
        <p>Jump straight back into any league you've already joined.</p>
      </div>
      <div className="my-leagues__grid">
        {leagues.map((league) => (
          <div key={league.competitionId} className="my-leagues__card">
            <div className="my-leagues__card-top">
              <span className="my-leagues__icon" aria-hidden="true">
                {SPORT_ICON[league.sport]}
              </span>
              <div>
                <p className="my-leagues__name">{league.name}</p>
                <p className="my-leagues__meta">
                  {league.members.toLocaleString()} managers · {league.gameweekLabel}
                </p>
              </div>
            </div>
            <dl className="my-leagues__stats">
              <div>
                <dt>Rank</dt>
                <dd className="mono">#{league.rank}</dd>
              </div>
              <div>
                <dt>Points</dt>
                <dd className="mono">{league.totalPoints}</dd>
              </div>
            </dl>
            <div className="my-leagues__actions">
              <button type="button" className="chip-btn" onClick={() => onQuickAction(league, 'lineup')}>
                Open lineup
              </button>
              <button type="button" className="chip-btn" onClick={() => onQuickAction(league, 'transfers')}>
                Transfers
              </button>
              <button type="button" className="chip-btn" onClick={() => onQuickAction(league, 'standings')}>
                Standings
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLeaguesPanel;
