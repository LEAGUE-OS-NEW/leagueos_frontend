import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiClipboard,
  FiDollarSign,
  FiFlag,
  FiGlobe,
  FiGrid,
  FiKey,
  FiLink,
  FiSettings,
  FiShield,
  FiSliders,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import './Sidebar.css';

type SidebarLink = {
  label: string;
  route: string;
  icon: ReactNode;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ADMIN_LINKS: SidebarLink[] = [
  { label: 'Platform Overview', route: '/dashboard/super-admin', icon: <FiGrid /> },
  { label: 'Admin Users', route: '/dashboard/super-admin/admin-users', icon: <FiUsers /> },
  { label: 'Roles & Permissions', route: '/dashboard/super-admin/roles-permissions', icon: <FiKey /> },
  { label: 'Club Admins', route: '/dashboard/super-admin/club-admins', icon: <FiUserCheck /> },
  { label: 'Countries', route: '/dashboard/super-admin/countries', icon: <FiGlobe /> },
  { label: 'Currencies', route: '/dashboard/super-admin/currencies', icon: <FiDollarSign /> },
  { label: 'Sports Configuration', route: '/dashboard/super-admin/sports-configuration', icon: <FiSliders /> },
  { label: 'Feature Flags', route: '/dashboard/super-admin/feature-flags', icon: <FiFlag /> },
  { label: 'Integrations', route: '/dashboard/super-admin/integrations', icon: <FiLink /> },
  { label: 'Security', route: '/dashboard/super-admin/security', icon: <FiShield /> },
  { label: 'Audit', route: '/dashboard/super-admin/audit', icon: <FiClipboard /> },
  { label: 'System Health', route: '/dashboard/super-admin/system-health', icon: <FiActivity /> },
  { label: 'Settings', route: '/dashboard/super-admin/settings', icon: <FiSettings /> },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <div className={`admin-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`admin-sidebar${isOpen ? ' open' : ''}`}>
        <div className="admin-sidebar-top">
          <span className="admin-sidebar-group-label">Administration</span>
          <button type="button" className="admin-sidebar-close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Administration">
          {ADMIN_LINKS.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              end={link.route === '/dashboard/super-admin'}
              onClick={onClose}
              className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="admin-sidebar-link-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-promo">
          <GiTrophyCup className="admin-sidebar-promo-icon" aria-hidden="true" />
          <p className="admin-sidebar-promo-text">
            Platform at the speed of <span className="admin-sidebar-promo-accent">fandom.</span>
          </p>
          <a href="/dashboard/super-admin/settings" className="admin-sidebar-promo-link">
            View Platform Docs <FiArrowRight />
          </a>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
