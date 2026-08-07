import { NavLink } from 'react-router-dom';
import { FiLogOut, FiX } from 'react-icons/fi';
import { ADMIN_NAV_ITEMS, ADMIN_ROLE_LABELS } from '../../config/adminNav';
import { useActiveAdminRole } from '../../hooks/useActiveAdminRole';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardIdentifier } from '../../types/dashboardAccess';
import './AdminSidebar.css';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { activeRole, availableRoles, switchRole } = useActiveAdminRole();
  const { logout } = useAuth();

  const visibleItems = ADMIN_NAV_ITEMS.filter(
    (item) => activeRole === 'SUPER_ADMIN' || item.allowedRoles.includes(activeRole),
  );

  return (
    <>
      <div className={`admin-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`admin-sidebar${isOpen ? ' open' : ''}`}>
        <div className="admin-sidebar__top">
          <span className="admin-sidebar__brand">League OS Admin</span>
          <button type="button" className="admin-sidebar__close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {availableRoles.length > 1 && (
          <label className="admin-sidebar__role-switch">
            <span>Active role</span>
            <select
              value={activeRole}
              onChange={(event) => switchRole(event.target.value as DashboardIdentifier)}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {ADMIN_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        )}

        <nav className="admin-sidebar__nav" aria-label="Admin">
          {visibleItems.map((item) => (
            <NavLink
              key={item.route}
              to={item.route}
              end={item.route === '/dashboard/admin'}
              onClick={onClose}
              className={({ isActive }) => `admin-sidebar__link${isActive ? ' active' : ''}`}
            >
              <span className="admin-sidebar__link-icon">
                <item.icon aria-hidden="true" />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="admin-sidebar__logout" onClick={logout}>
          <FiLogOut aria-hidden="true" /> Log Out
        </button>
      </aside>
    </>
  );
}

export default AdminSidebar;
