import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiUsers,
  FiShoppingCart,
  FiFileText,
  FiInfo,
  FiTrendingUp,
  FiSearch,
} from 'react-icons/fi';
import { GiTrophyCup, GiTicket } from 'react-icons/gi';
import HomeLogo from './HomeLogo';
import { useAuthStore } from '../../store/authStore.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import './Navbar.css';

export type NavbarLink = {
  label: string;
  route: string;
  showArrow?: boolean;
};

export type NavbarProps = {
  links?: NavbarLink[];
  showSignup?: boolean;
};

const DEFAULT_LINKS: NavbarLink[] = [
  { label: 'Markets', route: '/markets' },
  { label: 'Fantasy', route: '/fantasy' },
  { label: 'Clubs', route: '/clubs' },
  { label: 'Tickets', route: '/tickets' },
  { label: 'Store', route: '/store' },
  { label: 'News', route: '/news' },
  { label: 'About', route: '/about' },
  { label: 'Search', route: '/search' },
];

const LINK_ICONS: Record<string, ReactNode> = {
  Markets: <FiTrendingUp />,
  Fantasy: <GiTrophyCup />,
  Clubs: <FiUsers />,
  Tickets: <GiTicket />,
  Store: <FiShoppingCart />,
  News: <FiFileText />,
  About: <FiInfo />,
  Search: <FiSearch />,
};

function Navbar({ links = DEFAULT_LINKS, showSignup = true }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isSignedIn = Boolean(useAuthStore((state) => state.accessToken));
  const { logout } = useAuth();

  const openMenu = () => setIsMenuOpen(true);

  const closeMenu = () => {
    setIsMenuOpen(false);
    hamburgerRef.current?.focus();
  };

  useEffect(() => {
    if (isMenuOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <HomeLogo className="navbar-logo" imageClassName="navbar-logo-image" />

        <nav className="navbar-links" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
            >
              {link.label}
              {link.showArrow && <FiChevronDown className="navbar-link-arrow" />}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          {isSignedIn ? (
            <>
              <Link to="/profile" className="btn-login">
                My Account
              </Link>
              <button type="button" className="btn-signup" onClick={logout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login">
                Log In
              </Link>
              {showSignup && (
                <Link to="/signup" className="btn-signup">
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          ref={hamburgerRef}
          className="navbar-hamburger"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls="navbar-mobile-menu"
          onClick={openMenu}
        >
          <FiMenu />
        </button>
      </div>

      <div
        className={`navbar-backdrop${isMenuOpen ? ' open' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div
        id="navbar-mobile-menu"
        className={`navbar-mobile-menu${isMenuOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="navbar-mobile-header">
          <HomeLogo className="navbar-logo" imageClassName="navbar-logo-image" onClick={closeMenu} />
          <button
            type="button"
            ref={closeButtonRef}
            className="navbar-mobile-close"
            aria-label="Close menu"
            onClick={closeMenu}
            tabIndex={isMenuOpen ? 0 : -1}
          >
            <FiX />
          </button>
        </div>

        <nav className="navbar-mobile-links" aria-label="Mobile">
          {links.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              className={({ isActive }) => `navbar-mobile-link${isActive ? ' active' : ''}`}
              onClick={closeMenu}
              tabIndex={isMenuOpen ? 0 : -1}
            >
              <span className="navbar-mobile-icon">{LINK_ICONS[link.label] ?? <FiChevronDown />}</span>
              <span>{link.label}</span>
              {link.showArrow && <FiChevronDown className="navbar-link-arrow" />}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-mobile-divider" />

        <div className="navbar-mobile-actions">
          {isSignedIn ? (
            <>
              <Link to="/profile" className="btn-login-mobile" onClick={closeMenu} tabIndex={isMenuOpen ? 0 : -1}>
                My Account
              </Link>
              <button
                type="button"
                className="btn-signup-mobile"
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                tabIndex={isMenuOpen ? 0 : -1}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login-mobile" onClick={closeMenu} tabIndex={isMenuOpen ? 0 : -1}>
                Log In
              </Link>
              {showSignup && (
                <Link to="/signup" className="btn-signup-mobile" onClick={closeMenu} tabIndex={isMenuOpen ? 0 : -1}>
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
