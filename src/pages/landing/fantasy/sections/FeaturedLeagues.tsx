import { Link } from 'react-router-dom';
import { FiArrowRight, FiUsers, FiCalendar } from 'react-icons/fi';
import './FeaturedLeagues.css';

type League = {
  id: string;
  name: string;
  tag: string;
  crest: string;
  photo: string;
  accentClass: string;
  managers: string;
  gameweek: string;
};

const LEAGUES: League[] = [
  {
    id: 'upl',
    name: 'Uganda Premier League',
    tag: 'Fantasy',
    crest: '/images/star-times-upl.png',
    photo: '/sports/football-promo.png',
    accentClass: 'league-upl',
    managers: '12,548',
    gameweek: 'GW 28',
  },
  {
    id: 'nile-rugby',
    name: 'Nile Special Rugby',
    tag: 'Fantasy',
    crest: '/images/nile-rugby.jpg',
    photo: '/sports/rugby-promo.png',
    accentClass: 'league-nile',
    managers: '4,823',
    gameweek: 'GW 12',
  },
  {
    id: 'nbl',
    name: 'NBL Uganda',
    tag: 'Fantasy',
    crest: '/images/national-basketball.png',
    photo: '/sports/basketball-promo.png',
    accentClass: 'league-nbl',
    managers: '3,210',
    gameweek: 'GW 15',
  },
];

function FeaturedLeagues() {
  return (
    <section className="fantasy-panel featured-leagues" aria-labelledby="featured-leagues-heading">
      <div className="fantasy-panel-heading">
        <h2 id="featured-leagues-heading">Featured Fantasy Leagues</h2>
        <Link to="/fantasy" className="fantasy-view-link">
          View all leagues
        </Link>
      </div>

      <div className="league-cards">
        {LEAGUES.map((league) => (
          <article className={`league-card ${league.accentClass}`} key={league.id}>
            <img className="league-card-photo" src={league.photo} alt="" aria-hidden="true" />
            <div className="league-card-tint" aria-hidden="true" />

            <div className="league-card-content">
              <img className="league-card-crest" src={league.crest} alt={`${league.name} crest`} />
              <h3 className="league-card-title">
                {league.name}
                <br />
                <span>{league.tag}</span>
              </h3>

              <div className="league-card-meta">
                <span>
                  <FiUsers /> {league.managers} Managers
                </span>
                <span>
                  <FiCalendar /> {league.gameweek} Next Gameweek
                </span>
              </div>

              <Link to="/register" className="league-card-join">
                Join League
                <FiArrowRight />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FeaturedLeagues;
