import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiArrowRight } from 'react-icons/fi';
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
            <FiArrowRight />
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
                    <FiUsers />
                    {card.managers} Managers
                  </span>
                  <span className="fantasy-card-stat">
                    <FiCalendar />
                    {card.gameweek} Next Gameweek
                  </span>
                </div>

                <Link to="/fantasy" className="fantasy-card-btn">
                  Join League
                  <FiArrowRight />
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
