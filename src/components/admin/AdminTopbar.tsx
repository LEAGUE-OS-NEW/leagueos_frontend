import { FiBell, FiMenu, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import { ADMIN_ROLE_LABELS } from '../../config/adminNav';
import { useActiveAdminRole } from '../../hooks/useActiveAdminRole';
import './AdminTopbar.css';

interface AdminTopbarProps {
  onMenuClick: () => void;
}

function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { activeRole } = useActiveAdminRole();
  const user = useAuthStore((state) => state.user);
  const displayName = user?.full_name || user?.email || 'Admin User';

  return (
    <header className="admin-topbar">
      <button type="button" className="admin-topbar__menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <span className="admin-topbar__role-badge">{ADMIN_ROLE_LABELS[activeRole]}</span>

      <div className="admin-topbar__actions">
        <button type="button" className="admin-topbar__icon-btn" aria-label="Notifications">
          <FiBell />
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
