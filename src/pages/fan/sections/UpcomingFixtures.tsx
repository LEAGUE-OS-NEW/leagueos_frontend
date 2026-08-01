import { Link } from 'react-router-dom';
import { FiPlayCircle } from 'react-icons/fi';
import './UpcomingFixtures.css';

type Sport = 'football' | 'rugby' | 'basketball';

type Fixture = {
  sport: Sport;
  sportLabel: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  crestA?: string;
  crestB?: string;
  competition: string;
  time: string;
};

const FIXTURES: Fixture[] = [
  {
    sport: 'football',
    sportLabel: 'Football',
    teamA: 'Vipers SC',
    teamB: 'Express FC',
    scoreA: 2,
    scoreB: 1,
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/express-fc.png',
    competition: 'Uganda Premier League',
    time: 'Today, 4:00 PM',
  },
  {
    sport: 'rugby',
    sportLabel: 'Rugby',
    teamA: 'Toyota Buffaloes',
    teamB: 'Black Pirates',
    scoreA: 21,
    scoreB: 14,
    crestA: '/clubs/buffaloes.png',
    crestB: '/clubs/black-pirates.png',
    competition: 'Rugby Africa Cup',
    time: 'Today, 5:30 PM',
  },
  {
    sport: 'basketball',
    sportLabel: 'Basketball',
    teamA: 'City Oilers',
    teamB: 'Patriots BC',
    scoreA: 78,
    scoreB: 69,
    crestA: '/clubs/city-oilers.png',
    competition: 'NBL Uganda',
    time: 'Today, 7:00 PM',
  },
];

function CrestPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function FixtureCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="fixture-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="fixture-crest fixture-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function UpcomingFixtures() {
  return (
    <div className="upcoming-fixtures">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Upcoming Fixtures</h2>
        <Link to="/markets" className="dashboard-card-link">
          View all
        </Link>
      </div>

      <div className="fixtures-grid">
        {FIXTURES.map((fixture) => (
          <Link to="/markets" className="fixture-card" key={`${fixture.teamA}-${fixture.teamB}`}>
            <div className="fixture-card-header">
              <span className={`fixture-tag fixture-tag--${fixture.sport}`}>{fixture.sportLabel}</span>
              <span className="fixture-live-badge">Live</span>
            </div>

            <div className="fixture-teams">
              <FixtureCrest src={fixture.crestA} name={fixture.teamA} />
              <span className="fixture-score">
                {fixture.scoreA} - {fixture.scoreB}
              </span>
              <FixtureCrest src={fixture.crestB} name={fixture.teamB} />
            </div>

            <div className="fixture-team-names">
              <span>{fixture.teamA}</span>
              <span>{fixture.teamB}</span>
            </div>

            <p className="fixture-meta">
              {fixture.competition}
              <br />
              {fixture.time}
            </p>

            <span className={`fixture-watch-btn fixture-watch-btn--${fixture.sport}`}>
              <FiPlayCircle />
              View Match Details
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default UpcomingFixtures;
