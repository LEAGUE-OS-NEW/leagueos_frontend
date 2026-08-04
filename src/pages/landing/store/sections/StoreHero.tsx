import type { MouseEvent, ReactNode } from 'react';
import { FiArrowRight, FiSearch, FiShield, FiTruck, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import './StoreHero.css';

const SCROLL_DURATION_MS = 1400;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function smoothScrollToId(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.scrollIntoView();
    return;
  }

  const startY = window.scrollY;
  const targetY = startY + target.getBoundingClientRect().top;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function handleBrowseClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  smoothScrollToId('shop-by-category');
}

type TrustBadge = {
  label: string;
  sublabel: string;
  icon: ReactNode;
};

const TRUST_BADGES: TrustBadge[] = [
  { label: 'Official Club Products', sublabel: '100% Authentic', icon: <FiShield /> },
  { label: 'Nationwide Delivery', sublabel: 'Across Uganda', icon: <FiTruck /> },
  { label: 'Secure Payments', sublabel: 'MTN MoMo, Airtel, Cards', icon: <FiCreditCard /> },
  { label: 'Easy Returns', sublabel: '7-Day Return Policy', icon: <FiRefreshCw /> },
];

function StoreHero() {
  return (
    <section className="store-hero">
      <img className="store-hero-image" src="/images/sstore.jpg" alt="" aria-hidden="true" />
      <div className="store-hero-overlay" aria-hidden="true" />

      <div className="store-hero-inner">
        <p className="store-hero-eyebrow">League OS Store</p>
        <h1 className="store-hero-heading">
          Official Club
          <br />
          Merchandise.
          <br />
          <span className="store-hero-heading-gradient">Made For Africa.</span>
        </h1>
        <p className="store-hero-subtext">
          Represent your club. Wear your pride. Support African sport. Football. Rugby. Basketball. One Nation. One
          Passion.
        </p>

        <div className="store-hero-actions">
          <a href="#shop-by-category" className="store-cta store-cta--primary" onClick={handleBrowseClick}>
            Browse to Shop Now
            <FiArrowRight />
          </a>
          <label className="store-hero-search">
            <FiSearch />
            <input type="search" placeholder="Search by club" aria-label="Search by club" />
          </label>
        </div>

        <ul className="store-hero-badges">
          {TRUST_BADGES.map((badge) => (
            <li className="store-hero-badge" key={badge.label}>
              <span className="store-hero-badge-icon">{badge.icon}</span>
              <span>
                <span className="store-hero-badge-label">{badge.label}</span>
                <span className="store-hero-badge-sublabel">{badge.sublabel}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default StoreHero;
