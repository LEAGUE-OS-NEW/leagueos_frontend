import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
  { label: 'Memberships', route: '/memberships' },
  { label: 'Store', route: '/store' },
  { label: 'News', route: '/news' },
  { label: 'About', route: '/about' },
];

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const LINK_ICONS: Record<string, ReactNode> = {
  Markets: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 15V9M10 15V5M16 15v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Fantasy: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 3h8v4a4 4 0 01-8 0V3zM4 4H2v2a3 3 0 003 3M16 4h2v2a3 3 0 01-3 3M8 13v2h4v-2M6 17h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Clubs: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5M12.5 16c0-2-1.3-3.6-3-4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Tickets: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 8a2 2 0 012-2h12a2 2 0 012 2v1a1.5 1.5 0 000 3v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1a1.5 1.5 0 000-3V8z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M8 6v8" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />
    </svg>
  ),
  Memberships: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2l6 2.2v4.6c0 4-2.6 6.9-6 8.2-3.4-1.3-6-4.2-6-8.2V4.2L10 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Store: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 3h2l1.6 9.6a2 2 0 002 1.7h6.3a2 2 0 002-1.6L17 6.5H4.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="17" r="1.1" fill="currentColor" />
      <circle cx="14" cy="17" r="1.1" fill="currentColor" />
    </svg>
  ),
  News: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="12" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8h5M6 11h5M14 6h2a1 1 0 011 1v8a1.5 1.5 0 01-3 0V6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  About: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v5M10 6.5h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

function Navbar({ links = DEFAULT_LINKS, showSignup = true }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
        <Link to="/" className="navbar-logo">
          <img src="/logos/logo.png" alt="League OS" className="navbar-logo-image" />
        </Link>

        <nav className="navbar-links" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.route}
              to={link.route}
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
            >
              {link.label}
              {link.showArrow && <ChevronIcon />}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <Link to="/login" className="btn-login">
            Log In
          </Link>
          {showSignup && (
            <Link to="/signup" className="btn-signup">
              Sign Up
            </Link>
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
          <MenuIcon />
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
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <span className="navbar-logo-league">LEAGUE</span>
            <span className="navbar-logo-os">OS</span>
          </Link>
          <button
            type="button"
            ref={closeButtonRef}
            className="navbar-mobile-close"
            aria-label="Close menu"
            onClick={closeMenu}
            tabIndex={isMenuOpen ? 0 : -1}
          >
            <CloseIcon />
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
              <span className="navbar-mobile-icon">{LINK_ICONS[link.label] ?? <ChevronIcon />}</span>
              <span>{link.label}</span>
              {link.showArrow && <ChevronIcon />}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-mobile-divider" />

        <div className="navbar-mobile-actions">
          <Link to="/login" className="btn-login-mobile" onClick={closeMenu} tabIndex={isMenuOpen ? 0 : -1}>
            Log In
          </Link>
          {showSignup && (
            <Link to="/signup" className="btn-signup-mobile" onClick={closeMenu} tabIndex={isMenuOpen ? 0 : -1}>
              Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
