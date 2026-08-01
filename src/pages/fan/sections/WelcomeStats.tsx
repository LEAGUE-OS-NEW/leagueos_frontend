import type { ReactNode } from 'react';
import { FiBriefcase, FiAward, FiUsers, FiChevronRight } from 'react-icons/fi';
import { GiWallet } from 'react-icons/gi';
import './WelcomeStats.css';

type StatCard = {
  label: string;
  value: string;
  sublabel: string;
  positive?: boolean;
  highlighted?: boolean;
  showChevron?: boolean;
  icon: ReactNode;
  iconClassName: string;
};

const STAT_CARDS: StatCard[] = [
  {
    label: 'Wallet Balance',
    value: '$245.80',
    sublabel: 'OS Coins',
    showChevron: true,
    icon: <GiWallet />,
    iconClassName: 'stat-card-icon-purple',
  },
  {
    label: 'Open Positions',
    value: '3',
    sublabel: 'Active positions',
    showChevron: true,
    icon: <FiBriefcase />,
    iconClassName: 'stat-card-icon-orange',
  },
  {
    label: 'Fantasy Points',
    value: '1,286',
    sublabel: 'Top 18%',
    positive: true,
    highlighted: true,
    showChevron: true,
    icon: <FiAward />,
    iconClassName: 'stat-card-icon-purple',
  },
  {
    label: 'My Clubs',
    value: '4',
    sublabel: 'Clubs joined',
    showChevron: true,
    icon: <FiUsers />,
    iconClassName: 'stat-card-icon-blue',
  },
];

function WelcomeStats() {
  return (
    <div className="welcome-stats">
      <div className="welcome-text">
        <p className="welcome-greeting">Welcome back,</p>
        <h1 className="welcome-name">John!</h1>
        <p className="welcome-tagline">
          Everything fans need. <span className="welcome-tagline-accent">One</span> place.
        </p>
      </div>

      <div className="stat-cards">
        {STAT_CARDS.map((card) => (
          <div className={`stat-card${card.highlighted ? ' highlighted' : ''}`} key={card.label}>
            <div className="stat-card-header">
              <span className="stat-card-label">{card.label}</span>
              <span className={`stat-card-icon ${card.iconClassName}`}>{card.icon}</span>
            </div>
            <p className="stat-card-value">{card.value}</p>
            <div className="stat-card-footer">
              <span className={`stat-card-sublabel${card.positive ? ' positive' : ''}`}>{card.sublabel}</span>
              {card.showChevron && <FiChevronRight className="stat-card-chevron" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WelcomeStats;
