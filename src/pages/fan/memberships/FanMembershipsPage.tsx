import { useState } from 'react';
import { FiCheck, FiStar } from 'react-icons/fi';
import { GiShield } from 'react-icons/gi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import Memberships from '../sections/Memberships';
import '../sections/FanDashboard.css';
import './FanMembershipsPage.css';

interface Tier {
  key: string;
  name: string;
  priceLabel: string;
  priceNote: string;
  features: string[];
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    key: 'bronze',
    name: 'Bronze',
    priceLabel: 'UGX 25,000',
    priceNote: 'per year',
    features: ['Matchday updates', 'Club newsletter', 'Fan forum access', 'Digital member card'],
  },
  {
    key: 'silver',
    name: 'Silver',
    priceLabel: 'UGX 75,000',
    priceNote: 'per year',
    features: ['All Bronze benefits', 'Priority ticket access', '10% merchandise discount', 'Monthly fan digest', 'Member events invite'],
  },
  {
    key: 'gold',
    name: 'Gold',
    priceLabel: 'UGX 150,000',
    priceNote: 'per year',
    features: ['All Silver benefits', 'VIP lounge access', 'Meet & greet events', '20% merchandise discount', 'Signed jersey discount'],
    popular: true,
  },
  {
    key: 'platinum',
    name: 'Platinum',
    priceLabel: 'UGX 300,000',
    priceNote: 'per year',
    features: ['All Gold benefits', 'Stadium tours', 'Away kit included', 'Exclusive annual gala', 'Dedicated account manager'],
  },
  {
    key: 'season',
    name: 'Season Pass',
    priceLabel: 'UGX 200,000',
    priceNote: 'per season',
    features: ['All home games included', 'Dedicated seat', 'Special events access', 'Fan zone priority entry', 'End-of-season dinner'],
  },
];

function TierCard({ tier }: { tier: Tier }) {
  const [joined, setJoined] = useState(false);
  return (
    <div className={`fmp-tier-card fmp-tier-card--${tier.key}${tier.popular ? ' fmp-tier-card--popular' : ''}`}>
      {tier.popular && <span className="fmp-popular-badge"><FiStar /> Most Popular</span>}
      <div className={`fmp-tier-icon fmp-tier-icon--${tier.key}`}>
        <GiShield />
      </div>
      <h3 className={`fmp-tier-name fmp-tier-name--${tier.key}`}>{tier.name}</h3>
      <p className="fmp-tier-price">{tier.priceLabel}</p>
      <p className="fmp-tier-price-note">{tier.priceNote}</p>
      <ul className="fmp-tier-features">
        {tier.features.map((f) => (
          <li key={f}>
            <FiCheck className="fmp-feature-check" />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`fmp-join-btn fmp-join-btn--${tier.key}${joined ? ' fmp-join-btn--joined' : ''}`}
        onClick={() => setJoined(true)}
        disabled={joined}
      >
        {joined ? 'Request Sent' : 'Join Now'}
      </button>
    </div>
  );
}

function FanMembershipsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content fmp-content">
          <div className="fmp-header">
            <h1 className="fmp-title">Memberships</h1>
            <p className="fmp-sub">Unlock exclusive benefits by becoming a member of your favourite clubs.</p>
          </div>

          <section className="fmp-section">
            <h2 className="fmp-section-heading">Your Active Memberships</h2>
            <div className="fmp-my-memberships">
              <Memberships />
            </div>
          </section>

          <section className="fmp-section">
            <h2 className="fmp-section-heading">Explore Membership Tiers</h2>
            <p className="fmp-section-sub">Choose a tier and apply to join a club's membership programme.</p>
            <div className="fmp-tiers-grid">
              {TIERS.map((tier) => (
                <TierCard key={tier.key} tier={tier} />
              ))}
            </div>
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanMembershipsPage;
