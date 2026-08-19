import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiMenu, FiSearch, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { useNotificationsStore } from '../../store/fanNotificationsStore';
import './ClubAdminTopbar.css';

interface Props { onMenuClick: () => void; }

export default function ClubAdminTopbar({ onMenuClick }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const hasLoadedNotifications = useNotificationsStore((state) => state.hasLoaded);
  const loadNotifications = useNotificationsStore((state) => state.load);
  const displayName = user?.full_name || user?.email || 'Club Admin';

  useEffect(() => {
    if (!hasLoadedNotifications) loadNotifications();
  }, [hasLoadedNotifications, loadNotifications]);

  return (
    <header className="ca-topbar">
      <button type="button" className="ca-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <label className="ca-topbar-search">
        <FiSearch />
        <input type="search" placeholder="Search members, players, tickets…" />
      </label>

      <div className="ca-topbar-actions">
        <button
          type="button"
          className="ca-topbar-icon-btn"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => navigate('/club-admin/settings?tab=notifications')}
        >
          <FiBell />
          {unreadCount > 0 && (
            <span className="ca-topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <span className="ca-topbar-identity">
          <FiUser aria-hidden="true" />
          {displayName}
        </span>
      </div>
    </header>
  );
}
