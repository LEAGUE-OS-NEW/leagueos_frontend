import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiShield, FiFileText, FiUsers, FiCalendar,
  FiAward, FiTag, FiShoppingCart, FiPackage, FiTrendingUp,
  FiLock, FiStar, FiChevronLeft, FiChevronRight, FiX, FiLogOut,
} from 'react-icons/fi';
import './ClubAdminSidebar.css';

const NAV_ITEMS = [
  { label: 'Dashboard',          route: '/club-admin',             icon: FiGrid,         end: true },
  { label: 'Club Profile',       route: '/club-admin/profile',     icon: FiShield },
  { label: 'News',               route: '/club-admin/news',        icon: FiFileText },
  { label: 'Squad',              route: '/club-admin/squad',       icon: FiUsers },
  { label: 'Fixtures',           route: '/club-admin/fixtures',    icon: FiCalendar },
  { label: 'Memberships',        route: '/club-admin/memberships', icon: FiAward },
  { label: 'Tickets',            route: '/club-admin/tickets',     icon: FiTag },
  { label: 'Store',              route: '/club-admin/store',       icon: FiShoppingCart },
  { label: 'Orders',             route: '/club-admin/orders',      icon: FiPackage },
  { label: 'Analytics',          route: '/club-admin/analytics',   icon: FiTrendingUp },
  { label: 'Staff & Permissions',route: '/club-admin/staff',       icon: FiLock },
  { label: 'Sponsors',           route: '/club-admin/sponsors',    icon: FiStar },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClubAdminSidebar({ isOpen, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div className={`ca-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`ca-sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
        {/* Top — brand */}
        <div className="ca-sidebar-top">
          <div className="ca-sidebar-brand">
            <div className="ca-sidebar-club-badge">KC</div>
            {!collapsed && (
              <div className="ca-sidebar-club-info">
                <span className="ca-sidebar-club-name">KCCA FC</span>
                <span className="ca-sidebar-club-meta">Uganda Premier League</span>
              </div>
            )}
          </div>
          <button type="button" className="ca-sidebar-close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {!collapsed && (
          <button type="button" className="ca-sidebar-switch">Switch Club</button>
        )}

        {/* Nav */}
        <nav className="ca-sidebar-nav" aria-label="Club Admin">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.route}
              to={item.route}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `ca-sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="ca-sidebar-link-icon"><item.icon /></span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="ca-sidebar-bottom">
          <button type="button" className="ca-sidebar-logout">
            <FiLogOut />
            {!collapsed && <span>Log Out</span>}
          </button>
          <button
            type="button"
            className="ca-sidebar-collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <FiChevronRight /> : <><FiChevronLeft /><span>Collapse Menu</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
