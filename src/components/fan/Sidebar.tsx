import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiLayers, FiShield, FiTag, FiAward, FiShoppingCart, FiFileText, FiCreditCard, FiUser, FiSettings, FiX } from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import HomeLogo from '../landing/HomeLogo';
import { useCartStore } from '../../store/cartStore';
import CartDrawer from '../cart/CartDrawer';
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

const PRIMARY_LINKS: SidebarLink[] = [
  { label: 'Home', route: '/dashboard/fan', icon: <FiHome /> },
  { label: 'Markets', route: '/fan/markets', icon: <FiTrendingUp /> },
  { label: 'My Positions', route: '/positions', icon: <FiLayers /> },
  { label: 'Fantasy', route: '/fan/fantasy', icon: <GiTrophyCup /> },
  { label: 'Clubs', route: '/fan/clubs', icon: <FiShield /> },
  { label: 'Tickets', route: '/fan/tickets', icon: <FiTag /> },
  { label: 'Memberships', route: '/memberships', icon: <FiAward /> },
  { label: 'Store', route: '/fan/store', icon: <FiShoppingCart /> },
  { label: 'News', route: '/fan/news', icon: <FiFileText /> },
];

const SECONDARY_LINKS_BEFORE_CART: SidebarLink[] = [
  { label: 'Wallet', route: '/wallet', icon: <FiCreditCard /> },
  { label: 'Profile', route: '/profile', icon: <FiUser /> },
];

const SECONDARY_LINKS_AFTER_CART: SidebarLink[] = [
  { label: 'Settings', route: '/settings', icon: <FiSettings /> },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems());
  return (
    <>
      <div className={`fan-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`fan-sidebar${isOpen ? ' open' : ''}`}>
        <div className="fan-sidebar-top">
          <HomeLogo className="fan-sidebar-logo" imageClassName="fan-sidebar-logo-image" onClick={onClose} />
          <button type="button" className="fan-sidebar-close" aria-label="Close menu" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <nav className="fan-sidebar-nav" aria-label="Primary">
          {PRIMARY_LINKS.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              onClick={onClose}
              className={({ isActive }) => `fan-sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="fan-sidebar-link-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="fan-sidebar-divider" />

        <nav className="fan-sidebar-nav" aria-label="Account">
          {SECONDARY_LINKS_BEFORE_CART.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              onClick={onClose}
              className={({ isActive }) => `fan-sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="fan-sidebar-link-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="fan-sidebar-link fan-sidebar-cart-btn"
            onClick={() => { onClose(); setIsCartOpen(true); }}
            aria-label={`Cart (${totalItems} items)`}
          >
            <span className="fan-sidebar-link-icon cart-icon-wrap">
              <FiShoppingCart />
              {totalItems > 0 && (
                <span className="cart-icon-badge">{totalItems > 99 ? '99+' : totalItems}</span>
              )}
            </span>
            Cart{totalItems > 0 ? ` · ${totalItems}` : ''}
          </button>
          {SECONDARY_LINKS_AFTER_CART.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              onClick={onClose}
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

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

export default Sidebar;