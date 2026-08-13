import { Link } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchFantasyTeam } from '../../../services/fanDashboardService';
import './MyFantasyTeam.css';

function Jersey({ color }: { color: string }) {
  return (
    <span className="jersey" aria-hidden="true">
      <span className="jersey-sleeve jersey-sleeve-left" style={{ backgroundColor: color }} />
      <span className="jersey-sleeve jersey-sleeve-right" style={{ backgroundColor: color }} />
      <span className="jersey-body" style={{ backgroundColor: color }} />
      <span className="jersey-collar" />
    </span>
  );
}

function MyFantasyTeam() {
  const { data: team, isLoading, error, retry } = useDashboardSection(fetchFantasyTeam);

  return (
    <div className="my-fantasy-team dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">My Fantasy Team</h2>
        <Link to="/fan/fantasy" className="dashboard-card-link">
          View team
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={4} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your fantasy team" message={error} onRetry={retry} />
      ) : team ? (
        <>
          <div className="fantasy-header">
            <div className="fantasy-header-team">
              <FiShield className="fantasy-shield-icon" />
              <div>
                <p className="fantasy-team-name">{team.teamName}</p>
                <p className="fantasy-team-league">{team.leagueName}</p>
              </div>
            </div>
            <div className="fantasy-header-points">
              <p className="fantasy-points-value">
                {team.points.toLocaleString()} <span>PTS</span>
              </p>
              <p className="fantasy-points-rank">{team.rank}</p>
            </div>
          </div>

          <div className="fantasy-pitch">
            {team.formation.map((row, index) => (
              <div className="fantasy-pitch-row" key={index}>
                {row.map((player) => (
                  <div className="fantasy-player" key={player.name}>
                    <Jersey color={player.jerseyColor} />
                    <span className="fantasy-player-name">{player.name}</span>
                    <span className="fantasy-player-points">{player.points} PTS</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="fantasy-footer">
            <span className="fantasy-gameweek">{team.gameweek}</span>
            <Link to="/fan/fantasy" className="dashboard-card-link">
              View full team
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default MyFantasyTeam;
