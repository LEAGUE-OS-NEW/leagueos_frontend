import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { FaTiktok, FaXTwitter } from 'react-icons/fa6';
import HomeLogo from '../landing/HomeLogo';
import './StoreFooter.css';

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
    heading: 'Shop',
    links: [
      { label: 'All Products', route: '/store' },
      { label: 'New Arrivals', route: '/store' },
      { label: 'Best Sellers', route: '/store' },
      { label: 'Offers', route: '/store' },
      { label: 'Gift Cards', route: '/store' },
    ],
  },
  {
    heading: 'Clubs',
    links: [
      { label: 'Football Clubs', route: '/clubs' },
      { label: 'Rugby Clubs', route: '/clubs' },
      { label: 'Basketball Clubs', route: '/clubs' },
      { label: 'All Clubs', route: '/clubs' },
    ],
  },
  {
    heading: 'Customer Care',
    links: [
      { label: 'Contact Us', route: '/contact' },
      { label: 'Delivery Information', route: '/delivery-information' },
      { label: 'Returns & Refunds', route: '/returns-refunds' },
      { label: 'FAQs', route: '/faqs' },
      { label: 'Size Guide', route: '/size-guide' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'About League OS', route: '/about' },
      { label: 'Terms & Conditions', route: '/terms' },
      { label: 'Privacy Policy', route: '/privacy' },
      { label: 'Store Policy', route: '/store-policy' },
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
  { label: 'Instagram', href: 'https://instagram.com', icon: <FaInstagram /> },
  { label: 'X', href: 'https://x.com', icon: <FaXTwitter /> },
  { label: 'YouTube', href: 'https://youtube.com', icon: <FaYoutube /> },
  { label: 'TikTok', href: 'https://tiktok.com', icon: <FaTiktok /> },
];

function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer store-footer">
      <div className="footer-inner">
        <div className="footer-columns store-footer-columns">
          <div className="footer-brand">
            <HomeLogo className="footer-logo" imageClassName="footer-logo-image" tooltipPosition="top" />
            <p className="footer-tagline">The official store for African clubs.</p>
            <p className="footer-tagline">Official merchandise. Real passion. One platform.</p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div className="footer-column" key={column.heading}>
              <h3 className="footer-heading">{column.heading}</h3>
              <ul className="footer-link-list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.route} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="footer-column store-footer-newsletter">
            <h3 className="footer-heading">Stay In The Game</h3>
            <p className="store-footer-newsletter-text">Get updates on new drops, offers & matchday deals.</p>
            <form className="store-footer-newsletter-form" onSubmit={(event) => event.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                className="store-footer-newsletter-input"
              />
              <button type="submit" className="store-footer-newsletter-submit" aria-label="Subscribe">
                <FiArrowRight />
              </button>
            </form>
          </div>

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

        <div className="footer-bottom store-footer-bottom">
          <p className="footer-copyright">© {year} League OS. All rights reserved.</p>
          <p className="store-footer-pride">Proudly African. For the love of sport.</p>
        </div>
      </div>
    </footer>
  );
}

export default StoreFooter;
