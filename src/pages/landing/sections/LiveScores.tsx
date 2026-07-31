import { Link } from 'react-router-dom';
import './LiveScores.css';

type Sport = 'Football' | 'Rugby' | 'Basketball';

type ScoreCard = {
  sport: Sport;
  meta: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  crestA?: string;
  crestB?: string;
  competition: string;
  venue: string;
};

type ListMatch = {
  teamA: string;
  scoreA: number;
  crestA?: string;
  teamB: string;
  scoreB: number;
  crestB?: string;
  status: string;
  isLive: boolean;
};

const SPORT_CLASS: Record<Sport, string> = {
  Football: 'sport-football',
  Rugby: 'sport-rugby',
  Basketball: 'sport-basketball',
};

const SCORE_CARDS: ScoreCard[] = [
  {
    sport: 'Football',
    meta: "75'",
    teamA: 'Vipers SC',
    teamB: 'KCCA FC',
    scoreA: 2,
    scoreB: 1,
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/kcca-fc.png',
    competition: 'Uganda Premier League',
    venue: "St. Mary's Stadium",
  },
  {
    sport: 'Rugby',
    meta: 'Q3 04:15',
    teamA: 'Kobs Rugby',
    teamB: 'Black Pirates',
    scoreA: 21,
    scoreB: 14,
    crestA: '/clubs/kobs.jpg',
    crestB: '/clubs/black-pirates.png',
    competition: 'Rugby Africa Cup',
    venue: 'Kings Park Arena',
  },
  {
    sport: 'Basketball',
    meta: 'Q3 02:30',
    teamA: 'City Oilers',
    teamB: 'UCU Canons',
    scoreA: 78,
    scoreB: 69,
    crestA: '/clubs/city-oilers.png',
    competition: 'NBL Uganda',
    venue: 'Lugogo Indoor Arena',
  },
];

const LIST_MATCHES: ListMatch[] = [
  {
    teamA: 'Express FC',
    scoreA: 1,
    crestA: '/clubs/express-fc.png',
    teamB: 'SC Villa',
    scoreB: 0,
    crestB: '/clubs/sc-villa.png',
    status: 'HT',
    isLive: false,
  },
  {
    teamA: 'Kyadondo Rugby',
    scoreA: 10,
    teamB: 'Heathens RC',
    scoreB: 7,
    crestB: '/clubs/platinum-heathens.jpg',
    status: 'LIVE',
    isLive: true,
  },
  {
    teamA: 'UPDF FC',
    scoreA: 1,
    teamB: 'Maroons FC',
    scoreB: 1,
    status: "63'",
    isLive: false,
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

function TeamCrest({ src, name, className }: { src?: string; name: string; className: string }) {
  if (!src) {
    return (
      <span className={className}>
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className={`${className} score-crest-image`}>
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function LiveScores() {
  return (
    <section className="live-scores">
      <div className="live-scores-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Live Scores</h2>
            <p className="section-subheading">Real-time scores from Africa and beyond.</p>
          </div>
          <Link to="/live" className="section-link">
            View all live
          </Link>
        </div>

        <div className="live-scores-grid">
          {SCORE_CARDS.map((card) => (
            <Link to="/live" className="score-card" key={`${card.teamA}-${card.teamB}`}>
              <div className="score-card-header">
                <span className={`score-sport-tag ${SPORT_CLASS[card.sport]}`}>{card.sport}</span>
                <span className="score-status">
                  LIVE <span className="score-status-meta">{card.meta}</span>
                </span>
              </div>

              <div className="score-teams">
                <div className="score-team">
                  <TeamCrest src={card.crestA} name={card.teamA} className="score-crest" />
                  <span className="score-team-name">{card.teamA}</span>
                </div>
                <span className="score-value">
                  {card.scoreA} - {card.scoreB}
                </span>
                <div className="score-team">
                  <TeamCrest src={card.crestB} name={card.teamB} className="score-crest" />
                  <span className="score-team-name">{card.teamB}</span>
                </div>
              </div>

              <div className="score-meta">
                <p>{card.competition}</p>
                <p>{card.venue}</p>
              </div>
            </Link>
          ))}

          <div className="score-list-card">
            {LIST_MATCHES.map((match) => (
              <div className="score-list-match" key={`${match.teamA}-${match.teamB}`}>
                <div className="score-list-teams">
                  <div className="score-list-row">
                    <TeamCrest src={match.crestA} name={match.teamA} className="score-list-crest" />
                    <span className="score-list-name">{match.teamA}</span>
                    <span className="score-list-value">{match.scoreA}</span>
                  </div>
                  <div className="score-list-row">
                    <TeamCrest src={match.crestB} name={match.teamB} className="score-list-crest" />
                    <span className="score-list-name">{match.teamB}</span>
                    <span className="score-list-value">{match.scoreB}</span>
                  </div>
                </div>
                <span className={`score-list-badge${match.isLive ? ' live' : ''}`}>{match.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LiveScores;
