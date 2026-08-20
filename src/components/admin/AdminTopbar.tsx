import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiMenu, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { ADMIN_ROLE_LABELS } from '../../config/adminNav';
import { useActiveAdminRole } from '../../hooks/useActiveAdminRole';
import { useNotificationsStore } from '../../store/fanNotificationsStore';
import './AdminTopbar.css';

interface AdminTopbarProps {
  onMenuClick: () => void;
}

function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const navigate = useNavigate();
  const { activeRole } = useActiveAdminRole();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const hasLoadedNotifications = useNotificationsStore((state) => state.hasLoaded);
  const loadNotifications = useNotificationsStore((state) => state.load);
  const displayName = user?.full_name || user?.email || 'Admin User';
  const notificationsPath =
    activeRole === 'SUPER_ADMIN'
      ? '/dashboard/admin/settings?tab=notifications'
      : '/dashboard/admin/notifications';

  useEffect(() => {
    if (!hasLoadedNotifications) loadNotifications();
  }, [hasLoadedNotifications, loadNotifications]);

  return (
    <header className="admin-topbar">
      <button type="button" className="admin-topbar__menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <span className="admin-topbar__role-badge">{ADMIN_ROLE_LABELS[activeRole]}</span>

      <div className="admin-topbar__actions">
        <button
          type="button"
          className="admin-topbar__icon-btn"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => navigate(notificationsPath)}
        >
          <FiBell />
          {unreadCount > 0 && (
            <span className="admin-topbar__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <span className="admin-topbar__identity">
          <FiUser aria-hidden="true" />
          {displayName}
        </span>
      </div>
    </header>
  );
}

export default AdminTopbar;
