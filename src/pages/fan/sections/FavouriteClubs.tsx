import { Link } from 'react-router-dom';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchFavouriteClubs } from '../../../services/fanDashboardService';
import './FavouriteClubs.css';

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

function FavouriteClubs() {
  const { data: clubs, isLoading, error, retry } = useDashboardSection(fetchFavouriteClubs);

  return (
    <div className="favourite-clubs dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Favourite Clubs</h2>
        <Link to="/clubs" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={3} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your clubs" message={error} onRetry={retry} />
      ) : clubs && clubs.length === 0 ? (
        <DashboardNotice tone="empty" title="No clubs followed yet" message="Follow a club to see it here." actionLabel="Browse clubs" actionTo="/clubs" />
      ) : (
        <ul className="dashboard-club-list">
          {(clubs ?? []).map((club) => (
            <li className="dashboard-club-row" key={club.id}>
              {club.crest ? (
                <img src={club.crest} alt="" className="dashboard-club-crest" />
              ) : (
                <span className="dashboard-club-crest dashboard-club-crest--placeholder">
                  <CrestPlaceholder />
                </span>
              )}
              <div>
                <p className="dashboard-list-primary">{club.name}</p>
                <p className="dashboard-list-meta">{club.nextFixture}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FavouriteClubs;
