import { FiSearch, FiBell, FiChevronDown, FiMenu } from 'react-icons/fi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import { fetchNotificationsPreview } from '../../../services/fanDashboardService';
import './Topbar.css';

type TopbarProps = {
  onMenuClick: () => void;
};

function Topbar({ onMenuClick }: TopbarProps) {
  const { currentUser } = useCurrentUser();
  const { data: notifications } = useDashboardSection(fetchNotificationsPreview);
  const unreadCount = notifications?.filter((notification) => notification.isUnread).length ?? 0;

  return (
    <header className="fan-topbar">
      <button type="button" className="fan-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <label className="fan-topbar-search">
        <FiSearch className="fan-topbar-search-icon" />
        <input type="text" placeholder="Search games, teams, markets..." className="fan-topbar-search-input" />
      </label>

      <div className="fan-topbar-actions">
        <button
          type="button"
          className="fan-topbar-bell"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <FiBell />
          {unreadCount > 0 && <span className="fan-topbar-bell-badge">{unreadCount}</span>}
        </button>

        <button type="button" className="fan-topbar-user">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" className="fan-topbar-user-avatar" />
          ) : (
            <span className="fan-topbar-user-avatar-fallback" aria-hidden="true">
              {currentUser.avatarInitials}
            </span>
          )}
          <span className="fan-topbar-user-name">{currentUser.name}</span>
          <FiChevronDown className="fan-topbar-user-chevron" />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
