import { Link } from 'react-router-dom';
import './FantasyLeagues.css';

type FantasyCard = {
  title: string;
  tag: string;
  badge: string;
  background: string;
  accentClass: string;
  managers: string;
  gameweek: string;
};

const FANTASY_CARDS: FantasyCard[] = [
  {
    title: 'Uganda Premier League',
    tag: 'Fantasy',
    badge: '/images/star-times-upl.png',
    background: '/sports/football-promo.png',
    accentClass: 'fantasy-card-upl',
    managers: '12,548',
    gameweek: 'GW 28',
  },
  {
    title: 'Nile Special',
    tag: 'Rugby Fantasy',
    badge: '/images/nile-rugby.jpg',
    background: '/sports/rugby-promo.png',
    accentClass: 'fantasy-card-nile',
    managers: '4,823',
    gameweek: 'GW 12',
  },
  {
    title: 'NBL Uganda',
    tag: 'Fantasy',
    badge: '/images/national-basketball.png',
    background: '/sports/basketball-promo.png',
    accentClass: 'fantasy-card-nbl',
    managers: '3,210',
    gameweek: 'GW 15',
  },
];

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5M12.5 16c0-2-1.3-3.6-3-4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

function FantasyLeagues() {
  return (
    <section className="fantasy-leagues">
      <div className="fantasy-leagues-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Featured Fantasy Leagues</h2>
            <p className="section-subheading">Compete. Manage. Win big.</p>
          </div>
          <Link to="/fantasy" className="section-link">
            View all leagues
            <ArrowIcon />
          </Link>
        </div>

        <div className="fantasy-grid">
          {FANTASY_CARDS.map((card) => (
            <div className={`fantasy-card ${card.accentClass}`} key={card.title}>
              <img className="fantasy-card-bg" src={card.background} alt="" aria-hidden="true" />
              <div className="fantasy-card-overlay" aria-hidden="true" />

              <div className="fantasy-card-content">
                <span className="fantasy-card-badge">
                  <img src={card.badge} alt={`${card.title} logo`} />
                </span>

                <h3 className="fantasy-card-title">
                  {card.title}
                  <span className="fantasy-card-tag">{card.tag}</span>
                </h3>

                <div className="fantasy-card-stats">
                  <span className="fantasy-card-stat">
                    <PeopleIcon />
                    {card.managers} Managers
                  </span>
                  <span className="fantasy-card-stat">
                    <CalendarIcon />
                    {card.gameweek} Next Gameweek
                  </span>
                </div>

                <Link to="/fantasy" className="fantasy-card-btn">
                  Join League
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FantasyLeagues;
