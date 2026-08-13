import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FiDollarSign, FiShoppingBag, FiStar } from 'react-icons/fi';
import './PrizesBanner.css';

type Prize = {
  label: string;
  icon: ReactNode;
};

const PRIZES: Prize[] = [
  { label: 'Cash Rewards', icon: <FiDollarSign /> },
  { label: 'Merchandise & Gear', icon: <FiShoppingBag /> },
  { label: 'VIP Experiences', icon: <FiStar /> },
];

function PrizesBanner() {
  return (
    <section className="fantasy-panel prizes-banner" aria-labelledby="prizes-banner-heading">
      <img className="prizes-banner-trophy" src="/quick-links/trophy-image.png" alt="" aria-hidden="true" />

      <div className="prizes-banner-content">
        <h2 id="prizes-banner-heading">
          Prizes. Glory.
          <br />
          Bragging Rights.
        </h2>
        <p>Top managers win exclusive prizes every season. Are you in?</p>

        <div className="prizes-list">
          {PRIZES.map((prize) => (
            <div className="prize-item" key={prize.label}>
              <span className="prize-icon">{prize.icon}</span>
              {prize.label}
            </div>
          ))}
        </div>

        <Link to="/register" className="fantasy-cta fantasy-cta--primary prizes-explore-btn">
          Explore Prizes
        </Link>
      </div>
    </section>
  );
}

export default PrizesBanner;
