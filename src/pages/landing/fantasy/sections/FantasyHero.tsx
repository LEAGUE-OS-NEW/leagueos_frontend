import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FiZap, FiGift, FiUsers } from 'react-icons/fi';
import { GiTrophyCup } from 'react-icons/gi';
import './FantasyHero.css';

type Feature = {
  label: string;
  icon: ReactNode;
};

const FEATURES: Feature[] = [
  { label: 'Real-time stats', icon: <FiZap /> },
  { label: 'Compete & win', icon: <GiTrophyCup /> },
  { label: 'Awesome prizes', icon: <FiGift /> },
];

function FantasyHero() {
  return (
    <section className="fantasy-hero">
      <img className="fantasy-hero-image" src="/images/fantasylandingpage.png" alt="" aria-hidden="true" />
      <div className="fantasy-hero-overlay" aria-hidden="true" />

      <div className="fantasy-hero-inner">
        <h1 className="fantasy-hero-heading">
          Build Your
          <br />
          <span className="fantasy-hero-heading-gradient">Dream Team.</span>
        </h1>
        <p className="fantasy-hero-subtext">
          Join fantasy leagues for Uganda's football, rugby and basketball competitions.
        </p>

        <div className="fantasy-hero-actions">
          <Link to="/register" className="fantasy-cta fantasy-cta--primary">
            Create League
          </Link>
          <Link to="/register" className="fantasy-cta fantasy-cta--outline">
            Join League
            <FiUsers />
          </Link>
        </div>

        <ul className="fantasy-hero-features">
          {FEATURES.map((feature, index) => (
            <li className="fantasy-hero-feature" key={feature.label}>
              {index > 0 && <span className="fantasy-hero-feature-divider" aria-hidden="true" />}
              <span className="fantasy-hero-feature-icon">{feature.icon}</span>
              {feature.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default FantasyHero;
