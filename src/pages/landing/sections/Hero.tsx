import { Link } from 'react-router-dom';
import './Hero.css';

type Feature = {
  title: string;
  subtitle: string;
};

function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  { title: 'Uganda-First', subtitle: 'Built for our fans' },
  { title: 'Web & Mobile', subtitle: 'Play anywhere' },
  { title: 'Live Scores', subtitle: 'Real-time action' },
  { title: 'Real-time Updates', subtitle: 'Instant & accurate' },
];

function Hero() {
  return (
    <section className="hero">
      <img className="hero-background-image" src="/images/auth-stadium-bg.png" alt="" aria-hidden="true" />
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-content">
          <p className="hero-eyebrow">Uganda-First Sports Platform</p>
          <h1 className="hero-heading">
            Every Game.
            <br />
            Every Fan.
            <br />
            <span className="hero-heading-gradient">One Platform.</span>
          </h1>
          <p className="hero-subtext">
            League OS brings together markets, fantasy, clubs, tickets, memberships, merchandise, and live
            engagement for Uganda&apos;s fans. Real-time. Real communities. Real rewards.
          </p>

          <div className="hero-cta-row">
            <Link to="/markets" className="hero-btn hero-btn-primary">
              Explore Markets
              <ArrowIcon />
            </Link>
            <Link to="/fantasy" className="hero-btn hero-btn-accent">
              Play Fantasy
            </Link>
          </div>

          <ul className="hero-features">
            {FEATURES.map((feature) => (
              <li className="hero-feature" key={feature.title}>
                <span className="hero-feature-icon">
                  <PlaceholderIcon />
                </span>
                <span className="hero-feature-text">
                  <span className="hero-feature-title">{feature.title}</span>
                  <span className="hero-feature-subtitle">{feature.subtitle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Hero;
