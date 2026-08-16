import { Link } from 'react-router-dom';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchFixtures } from '../../../services/fanDashboardService';
import './UpcomingFixtures.css';

function CrestPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function FixtureCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="fixture-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="fixture-crest fixture-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function UpcomingFixtures() {
  const { data: fixtures, isLoading, error, retry } = useDashboardSection(fetchFixtures);

  return (
    <div className="upcoming-fixtures">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Upcoming Fixtures</h2>
        <Link to="/fan/markets" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={3} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load fixtures" message={error} onRetry={retry} />
      ) : fixtures && fixtures.length === 0 ? (
        <DashboardNotice tone="empty" title="No upcoming fixtures" message="Check back soon for new matches." />
      ) : (
        <div className="fixtures-grid">
          {(fixtures ?? []).slice(0, 2).map((fixture) => (
            <Link to="/fan/markets" className="fixture-card" key={`${fixture.teamA}-${fixture.teamB}`}>
              <div className="fixture-card-header">
                <span className={`fixture-tag fixture-tag--${fixture.sport}`}>{fixture.sportLabel}</span>
                <span className="fixture-live-badge">Live</span>
              </div>

              <div className="fixture-teams">
                <FixtureCrest src={fixture.crestA} name={fixture.teamA} />
                <span className="fixture-score">
                  {fixture.scoreA} - {fixture.scoreB}
                </span>
                <FixtureCrest src={fixture.crestB} name={fixture.teamB} />
              </div>

              <div className="fixture-team-names">
                <span>{fixture.teamA}</span>
                <span>{fixture.teamB}</span>
              </div>

              <p className="fixture-meta">
                {fixture.competition}
                <br />
                {fixture.time}
              </p>

              <span className={`fixture-watch-btn fixture-watch-btn--${fixture.sport}`}>
                View Match Details
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default UpcomingFixtures;
