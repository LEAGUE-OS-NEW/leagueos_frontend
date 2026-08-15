import type { ReactNode } from 'react';
import { FiLock, FiPercent, FiGift } from 'react-icons/fi';
import './CommunityBanner.css';

type Perk = {
  label: string;
  description: string;
  icon: ReactNode;
};

const PERKS: Perk[] = [
  { label: 'Exclusive Drops', description: 'Early access to new kits & limited collections.', icon: <FiLock /> },
  { label: 'Member Discounts', description: 'Special prices for League OS members.', icon: <FiPercent /> },
  { label: 'Earn Rewards', description: 'Shop, earn points & unlock amazing rewards.', icon: <FiGift /> },
];

function CommunityBanner() {
  return (
    <section className="store-panel community-banner" aria-label="Join the League OS community">
      <div className="community-banner-copy">
        <p className="community-banner-title">Wear It. Live It. Share It.</p>
        <p className="community-banner-subtext">Tag @LeagueOS_UG and use #LeagueOS to get featured.</p>
      </div>

      <div className="community-banner-perks">
        {PERKS.map((perk) => (
          <div className="community-banner-perk" key={perk.label}>
            <span className="community-banner-perk-icon">{perk.icon}</span>
            <div>
              <p className="community-banner-perk-label">{perk.label}</p>
              <p className="community-banner-perk-desc">{perk.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CommunityBanner;
