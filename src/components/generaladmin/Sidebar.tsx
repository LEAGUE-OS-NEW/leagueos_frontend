import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiLock,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';
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

const OVERVIEW_LINK: SidebarLink = { label: 'Overview', route: '/dashboard/general-admin', icon: <FiGrid /> };

const PLATFORM_LINKS: SidebarLink[] = [
  { label: 'Sports Data', route: '/dashboard/general-admin/sports-data', icon: <FiActivity /> },
  { label: 'Markets', route: '/dashboard/general-admin/markets', icon: <FiTrendingUp /> },
  { label: 'Market Proposals', route: '/dashboard/general-admin/market-proposals', icon: <FiFileText /> },
  { label: 'Results', route: '/dashboard/general-admin/results', icon: <FiAward /> },
  { label: 'Fantasy', route: '/dashboard/general-admin/fantasy', icon: <FiStar /> },
  { label: 'Clubs', route: '/dashboard/general-admin/clubs', icon: <FiUsers /> },
];

const GOVERNANCE_LINKS: SidebarLink[] = [
  { label: 'Compliance', route: '/dashboard/general-admin/compliance', icon: <FiShield /> },
  { label: 'Finance', route: '/dashboard/general-admin/finance', icon: <FiDollarSign /> },
  { label: 'Support', route: '/dashboard/general-admin/support', icon: <FiHeadphones /> },
];

const INTELLIGENCE_LINKS: SidebarLink[] = [
  { label: 'Reports', route: '/dashboard/general-admin/reports', icon: <FiBarChart2 /> },
  { label: 'Audit Logs', route: '/dashboard/general-admin/audit-logs', icon: <FiClipboard /> },
];

function NavLinkItem({ link, onClose }: { link: SidebarLink; onClose: () => void }) {
  return (
    <NavLink
      to={link.route}
      end={link.route === '/dashboard/general-admin'}
      onClick={onClose}
      className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}
    >
      <span className="admin-sidebar-link-icon">{link.icon}</span>
      {link.label}
    </NavLink>
  );
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <div className={`admin-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`admin-sidebar${isOpen ? ' open' : ''}`}>
        <div className="admin-sidebar-top">
          <span className="admin-sidebar-group-label">Menu</span>
          <button type="button" className="admin-sidebar-close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Overview">
          <NavLinkItem link={OVERVIEW_LINK} onClose={onClose} />
        </nav>

        <span className="admin-sidebar-group-label admin-sidebar-group-label--section">Platform</span>
        <nav className="admin-sidebar-nav" aria-label="Platform">
          {PLATFORM_LINKS.map((link) => (
            <NavLinkItem link={link} onClose={onClose} key={link.route} />
          ))}
        </nav>

        <span className="admin-sidebar-group-label admin-sidebar-group-label--section">Governance</span>
        <nav className="admin-sidebar-nav" aria-label="Governance">
          {GOVERNANCE_LINKS.map((link) => (
            <NavLinkItem link={link} onClose={onClose} key={link.route} />
          ))}
        </nav>

        <span className="admin-sidebar-group-label admin-sidebar-group-label--section">Intelligence</span>
        <nav className="admin-sidebar-nav" aria-label="Intelligence">
          {INTELLIGENCE_LINKS.map((link) => (
            <NavLinkItem link={link} onClose={onClose} key={link.route} />
          ))}
        </nav>

        <div className="admin-sidebar-promo">
          <span className="admin-sidebar-promo-title">Admin Console</span>
          <FiLock className="admin-sidebar-promo-icon" aria-hidden="true" />
          <p className="admin-sidebar-promo-text">Permission-based control center. All actions are logged.</p>
        </div>

        <a href="/dashboard/general-admin" className="admin-sidebar-quick-actions">
          <FiZap /> Quick Actions
        </a>
      </aside>
    </>
  );
}

export default Sidebar;
