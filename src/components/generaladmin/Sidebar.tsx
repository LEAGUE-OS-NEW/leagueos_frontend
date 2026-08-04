import { type ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiChevronDown,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiInbox,
  FiLock,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUser,
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
];


const SUPPORT_LINKS: SidebarLink[] = [
  { label: 'Support Overview', route: '/dashboard/general-admin/support', icon: <FiGrid /> },
  { label: 'Case Queues', route: '/dashboard/general-admin/support/case-queues', icon: <FiInbox /> },
  { label: 'My Cases', route: '/dashboard/general-admin/support/my-cases', icon: <FiUser /> },
  { label: 'Escalations', route: '/dashboard/general-admin/support/escalations', icon: <FiAlertTriangle /> },
  { label: 'SLA Monitoring', route: '/dashboard/general-admin/support/sla', icon: <FiClock /> },
  { label: 'Resolved Cases', route: '/dashboard/general-admin/support/resolved', icon: <FiCheckCircle /> },
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
  const location = useLocation();
  const onSupportRoute = location.pathname.startsWith('/dashboard/general-admin/support');
  const [isSupportOpen, setIsSupportOpen] = useState(onSupportRoute);

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

          {/* Customer Support with collapsible submenu */}
          <button
            type="button"
            className={`admin-sidebar-link admin-sidebar-link--toggle${onSupportRoute ? ' active' : ''}`}
            onClick={() => setIsSupportOpen(prev => !prev)}
            aria-expanded={isSupportOpen}
          >
            <span className="admin-sidebar-link-icon"><FiHeadphones /></span>
            Customer Support
            <FiChevronDown
              className={`admin-sidebar-link-chevron${isSupportOpen ? ' open' : ''}`}
              aria-hidden="true"
            />
          </button>
          {isSupportOpen && (
            <div style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SUPPORT_LINKS.map(link => (
                <NavLinkItem link={link} onClose={onClose} key={link.route} />
              ))}
            </div>
          )}
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
