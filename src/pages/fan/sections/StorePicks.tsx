import { Link } from 'react-router-dom';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchStorePicks } from '../../../services/fanDashboardService';
import './StorePicks.css';

function StorePicks() {
  const { data: picks, isLoading, error, retry } = useDashboardSection(fetchStorePicks);

  return (
    <div className="store-picks dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Store Picks</h2>
        <Link to="/store" className="dashboard-card-link">
          Shop now
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={2} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load store picks" message={error} onRetry={retry} />
      ) : picks && picks.length === 0 ? (
        <DashboardNotice tone="empty" title="Nothing here yet" message="Check the store for new merchandise." actionLabel="Browse store" actionTo="/store" />
      ) : (
        <div className="dashboard-store-list">
          {(picks ?? []).map((pick) => (
            <Link to="/store" className="dashboard-store-item" key={pick.id}>
              <img src={pick.image} alt="" className="dashboard-store-image" />
              <p className="store-pick-name">{pick.name}</p>
              <p className="store-pick-price">{pick.price}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default StorePicks;
