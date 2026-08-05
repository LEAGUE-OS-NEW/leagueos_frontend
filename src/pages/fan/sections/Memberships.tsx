import { Link } from 'react-router-dom';
import { GiTrophyCup } from 'react-icons/gi';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchMemberships, type Membership } from '../../../services/fanDashboardService';
import './Memberships.css';

function statusClass(status: Membership['status']): string {
  switch (status) {
    case 'Active':
      return 'membership-status membership-status--active';
    case 'Expiring Soon':
      return 'membership-status membership-status--expiring';
    case 'Expired':
      return 'membership-status membership-status--expired';
  }
}

function Memberships() {
  const { data: memberships, isLoading, error, retry } = useDashboardSection(fetchMemberships);

  return (
    <div className="memberships dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Memberships</h2>
        <Link to="/memberships" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={2} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your memberships" message={error} onRetry={retry} />
      ) : memberships && memberships.length === 0 ? (
        <DashboardNotice tone="empty" title="No memberships yet" message="Join a club membership to see it here." actionLabel="Explore memberships" actionTo="/memberships" />
      ) : (
        <ul className="dashboard-list">
          {(memberships ?? []).map((membership) => (
            <li className="dashboard-list-row" key={membership.id}>
              <span className="membership-icon">
                <GiTrophyCup />
              </span>
              <div>
                <p className="dashboard-list-primary">
                  {membership.clubName} — {membership.tier}
                </p>
                <p className="dashboard-list-meta">Valid until {membership.validUntil}</p>
              </div>
              <span className={statusClass(membership.status)}>{membership.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Memberships;
