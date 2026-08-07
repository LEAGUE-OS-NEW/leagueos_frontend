import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FaTiktok, FaXTwitter } from 'react-icons/fa6';
import HomeLogo from './HomeLogo';
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
      { label: 'Terms & Conditions', route: '/terms-and-conditions' },
      { label: 'Privacy Policy', route: '/privacy-policy' },
    ],
  },
];

type SocialLink = {
  label: string;
  href: string;
  icon: ReactNode;
};

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Facebook', href: 'https://facebook.com', icon: <FaFacebook /> },
  { label: 'X', href: 'https://x.com', icon: <FaXTwitter /> },
  { label: 'Instagram', href: 'https://instagram.com', icon: <FaInstagram /> },
  { label: 'YouTube', href: 'https://youtube.com', icon: <FaYoutube /> },
  { label: 'TikTok', href: 'https://tiktok.com', icon: <FaTiktok /> },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-columns">
          <div className="footer-brand">
            <HomeLogo className="footer-logo" imageClassName="footer-logo-image" tooltipPosition="top" />
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
