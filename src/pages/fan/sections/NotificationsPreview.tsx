import { Link } from 'react-router-dom';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchNotificationsPreview } from '../../../services/fanDashboardService';
import './NotificationsPreview.css';

function NotificationsPreview() {
  const { data: notifications, isLoading, error, retry } = useDashboardSection(fetchNotificationsPreview);

  return (
    <div className="notifications-preview dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Notifications</h2>
        <Link to="/settings" className="dashboard-card-link">
          Manage
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={3} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load notifications" message={error} onRetry={retry} />
      ) : notifications && notifications.length === 0 ? (
        <DashboardNotice tone="empty" title="You're all caught up" message="New notifications will show up here." />
      ) : (
        <ul className="notifications-preview-list">
          {(notifications ?? []).map((notification) => (
            <li
              className={`dashboard-notification${notification.isUnread ? ' dashboard-notification--unread' : ''}`}
              key={notification.id}
            >
              <p className="notification-message">{notification.message}</p>
              <span className="notification-time">{notification.timeAgo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationsPreview;
