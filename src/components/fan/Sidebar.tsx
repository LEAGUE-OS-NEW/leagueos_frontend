import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiShield, FiTag, FiAward, FiShoppingCart, FiFileText, FiCreditCard, FiUser, FiSettings } from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import './Sidebar.css';

type SidebarLink = {
  label: string;
  route: string;
  icon: ReactNode;
};

const PRIMARY_LINKS: SidebarLink[] = [
  { label: 'Home', route: '/fandashboard', icon: <FiHome /> },
  { label: 'Markets', route: '/markets', icon: <FiTrendingUp /> },
  { label: 'Fantasy', route: '/fantasy', icon: <GiTrophyCup /> },
  { label: 'Clubs', route: '/clubs', icon: <FiShield /> },
  { label: 'Tickets', route: '/tickets', icon: <FiTag /> },
  { label: 'Memberships', route: '/memberships', icon: <FiAward /> },
  { label: 'Store', route: '/store', icon: <FiShoppingCart /> },
  { label: 'News', route: '/news', icon: <FiFileText /> },
];

const SECONDARY_LINKS: SidebarLink[] = [
  { label: 'Wallet', route: '/wallet', icon: <FiCreditCard /> },
  { label: 'Profile', route: '/profile', icon: <FiUser /> },
  { label: 'Settings', route: '/settings', icon: <FiSettings /> },
];

function Sidebar() {
  return (
    <aside className="fan-sidebar">
      <Link to="/fandashboard" className="fan-sidebar-logo">
        <img src="/logos/logo.png" alt="League OS" className="fan-sidebar-logo-image" />
      </Link>

      <nav className="fan-sidebar-nav" aria-label="Primary">
        {PRIMARY_LINKS.map((link) => (
          <NavLink
            key={link.route}
            to={link.route}
            className={({ isActive }) => `fan-sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="fan-sidebar-link-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="fan-sidebar-divider" />

      <nav className="fan-sidebar-nav" aria-label="Account">
        {SECONDARY_LINKS.map((link) => (
          <NavLink
            key={link.route}
            to={link.route}
            className={({ isActive }) => `fan-sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="fan-sidebar-link-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="fan-sidebar-promo">
        <img src="/images/stadium-bg.png" alt="" className="fan-sidebar-promo-image" aria-hidden="true" />
        <div className="fan-sidebar-promo-overlay" aria-hidden="true" />
        <p className="fan-sidebar-promo-text">
          Every Game.
          <br />
          Every Fan.
          <br />
          <span className="fan-sidebar-promo-accent">One Platform.</span>
        </p>
        <img src="/logos/logo.png" alt="League OS" className="fan-sidebar-promo-logo" />
      </div>
    </aside>
  );
}

export default Sidebar;
