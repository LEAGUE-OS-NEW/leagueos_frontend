import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import './Footer.css';

type FooterLink = {
  label: string;
  route: string;
};

type FooterColumn = {
  heading: string;
  links: FooterLink[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Markets', route: '/markets' },
      { label: 'Fantasy', route: '/fantasy' },
      { label: 'Clubs', route: '/clubs' },
      { label: 'Tickets', route: '/tickets' },
      { label: 'Memberships', route: '/memberships' },
      { label: 'Store', route: '/store' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help Center', route: '/help' },
      { label: 'How It Works', route: '/how-it-works' },
      { label: 'Safety', route: '/safety' },
      { label: 'Contact Us', route: '/contact' },
      { label: 'Community', route: '/community' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', route: '/about' },
      { label: 'Careers', route: '/careers' },
      { label: 'Press', route: '/press' },
      { label: 'Partners', route: '/partners' },
      { label: 'Terms & Conditions', route: '/terms' },
      { label: 'Privacy Policy', route: '/privacy' },
    ],
  },
];

type SocialLink = {
  label: string;
  href: string;
  icon: ReactNode;
};

function FacebookIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4h-1.8A3.2 3.2 0 007.5 7.2V9H5.8v2.6h1.7V17h2.7v-5.4h2l.4-2.6h-2.4V7.5c0-.7.4-1.1 1.1-1.1h1.2V4z"
        fill="currentColor"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="3.1" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="6" r="0.8" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="15" height="9" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.7 8v4l3.6-2-3.6-2z" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.3 3v8.6a2.6 2.6 0 11-2.1-2.55V3h2.1z" fill="currentColor" />
      <path d="M12.3 3.2c.35 1.9 1.75 3.25 3.6 3.45" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Facebook', href: 'https://facebook.com', icon: <FacebookIcon /> },
  { label: 'X', href: 'https://x.com', icon: <XIcon /> },
  { label: 'Instagram', href: 'https://instagram.com', icon: <InstagramIcon /> },
  { label: 'YouTube', href: 'https://youtube.com', icon: <YouTubeIcon /> },
  { label: 'TikTok', href: 'https://tiktok.com', icon: <TikTokIcon /> },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-columns">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/logos/logo.png" alt="League OS" className="footer-logo-image" />
            </Link>
            <p className="footer-tagline">Your game. Your community. Your win.</p>
            <p className="footer-tagline">Built in Uganda. Ready for Africa.</p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div className="footer-column" key={column.heading}>
              <h3 className="footer-heading">{column.heading}</h3>
              <ul className="footer-link-list">
                {column.links.map((link) => (
                  <li key={link.route}>
                    <Link to={link.route} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer-column">
            <h3 className="footer-heading">Follow Us</h3>
            <div className="footer-social-list">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="footer-social-link"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© {year} League OS. All rights reserved.</p>
          <p className="footer-disclaimer">
            Play responsibly. 18+ only.{' '}
            <a href="/responsible-play" className="footer-disclaimer-link">
              Learn more
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
