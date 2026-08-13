import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { GiSoccerBall, GiRugbyConversion, GiBasketballBall } from 'react-icons/gi';
import './FeaturedLeaderboard.css';

type LeaderboardRow = {
  rank: number;
  manager: string;
  league: string;
  leagueIcon: IconType;
  leagueAccent: string;
  gwPoints: number;
  totalPoints: string;
};

const ROWS: LeaderboardRow[] = [
  { rank: 1, manager: 'KingOfThePitch', league: 'UPL Fantasy', leagueIcon: GiSoccerBall, leagueAccent: 'league-upl', gwPoints: 85, totalPoints: '1,872' },
  { rank: 2, manager: 'RugbyMaestro', league: 'Rugby Fantasy', leagueIcon: GiRugbyConversion, leagueAccent: 'league-nile', gwPoints: 72, totalPoints: '1,645' },
  { rank: 3, manager: 'BallIsLife_24', league: 'NBL Fantasy', leagueIcon: GiBasketballBall, leagueAccent: 'league-nbl', gwPoints: 68, totalPoints: '1,432' },
  { rank: 4, manager: 'TacticKing_UG', league: 'UPL Fantasy', leagueIcon: GiSoccerBall, leagueAccent: 'league-upl', gwPoints: 61, totalPoints: '1,298' },
  { rank: 5, manager: 'TryMachine7s', league: 'Rugby Fantasy', leagueIcon: GiRugbyConversion, leagueAccent: 'league-nile', gwPoints: 59, totalPoints: '1,104' },
];

const MEDAL_CLASS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function FeaturedLeaderboard() {
  return (
    <section className="fantasy-panel featured-leaderboard" aria-labelledby="featured-leaderboard-heading">
      <div className="fantasy-panel-heading">
        <h2 id="featured-leaderboard-heading">Featured Leaderboard</h2>
        <Link to="/fantasy" className="fantasy-view-link">
          View full leaderboard
        </Link>
      </div>

      <div className="leaderboard-table">
        <div className="leaderboard-row leaderboard-labels" aria-hidden="true">
          <span>#</span>
          <span>Manager</span>
          <span>League</span>
          <span>GW Points</span>
          <span>Total Points</span>
        </div>

        {ROWS.map((row) => (
          <div className="leaderboard-row" key={row.manager}>
            <span className={`leaderboard-rank${MEDAL_CLASS[row.rank] ? ` ${MEDAL_CLASS[row.rank]}` : ''}`}>
              {row.rank}
            </span>
            <span className="leaderboard-manager">
              <img src="/players/player-avatar.png" alt="" aria-hidden="true" />
              {row.manager}
            </span>
            <span className={`leaderboard-league ${row.leagueAccent}`}>
              <row.leagueIcon />
              {row.league}
            </span>
            <span className="leaderboard-gw-points">{row.gwPoints}</span>
            <span className="leaderboard-total-points">{row.totalPoints}</span>
          </div>
        ))}
      </div>

      <div className="leaderboard-cta">
        <span>Join now and start climbing!</span>
        <Link to="/register" className="leaderboard-cta-btn">
          Create League
        </Link>
      </div>
    </section>
  );
}

export default FeaturedLeaderboard;
