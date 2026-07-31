import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FiShield, FiSmartphone, FiClock, FiActivity, FiArrowRight } from 'react-icons/fi';
import './Hero.css';

type Feature = {
  title: string;
  subtitle: string;
  icon: ReactNode;
};

const FEATURES: Feature[] = [
  { title: 'Uganda-First', subtitle: 'Built for our fans', icon: <FiShield /> },
  { title: 'Web & Mobile', subtitle: 'Play anywhere', icon: <FiSmartphone /> },
  { title: 'Live Scores', subtitle: 'Real-time action', icon: <FiClock /> },
  { title: 'Real-time Updates', subtitle: 'Instant & accurate', icon: <FiActivity /> },
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
              <FiArrowRight />
            </Link>
            <Link to="/fantasy" className="hero-btn hero-btn-accent">
              Play Fantasy
            </Link>
          </div>

          <ul className="hero-features">
            {FEATURES.map((feature) => (
              <li className="hero-feature" key={feature.title}>
                <span className="hero-feature-icon">{feature.icon}</span>
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
