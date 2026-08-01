import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { FiChevronRight } from 'react-icons/fi';
import { GiSoccerBall, GiRugbyConversion, GiBasketballBall } from 'react-icons/gi';
import './UpcomingGameweeks.css';

type Gameweek = {
  id: string;
  icon: IconType;
  accentClass: string;
  league: string;
  gameweek: string;
  startsIn: string;
};

const GAMEWEEKS: Gameweek[] = [
  { id: 'upl', icon: GiSoccerBall, accentClass: 'league-upl', league: 'UPL Fantasy', gameweek: 'Gameweek 28', startsIn: '2d 05h' },
  { id: 'rugby', icon: GiRugbyConversion, accentClass: 'league-nile', league: 'Rugby Fantasy', gameweek: 'Gameweek 12', startsIn: '1d 14h' },
  { id: 'nbl', icon: GiBasketballBall, accentClass: 'league-nbl', league: 'NBL Fantasy', gameweek: 'Gameweek 15', startsIn: '03h 22m' },
];

function UpcomingGameweeks() {
  return (
    <section className="fantasy-panel upcoming-gameweeks" aria-labelledby="upcoming-gameweeks-heading">
      <div className="fantasy-panel-heading">
        <h2 id="upcoming-gameweeks-heading">Upcoming Gameweeks</h2>
        <Link to="/fantasy" className="fantasy-view-link">
          View calendar
        </Link>
      </div>

      <div className="gameweek-list">
        {GAMEWEEKS.map((gw) => (
          <div className="gameweek-row" key={gw.id}>
            <span className={`gameweek-icon ${gw.accentClass}`}>
              <gw.icon />
            </span>
            <div className="gameweek-details">
              <span className="gameweek-league">{gw.league}</span>
              <span className="gameweek-number">{gw.gameweek}</span>
            </div>
            <div className="gameweek-countdown">
              <span className="gameweek-countdown-label">Starts in</span>
              <span className="gameweek-countdown-value">{gw.startsIn}</span>
            </div>
            <FiChevronRight className="gameweek-chevron" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default UpcomingGameweeks;
