import { Link } from 'react-router-dom';
import './FeaturedMarkets.css';

type Sport = 'Football' | 'Rugby' | 'Basketball';

type MarketStatus = {
  label: 'LIVE' | 'OPEN';
  meta: string;
};

type Market = {
  sport: Sport;
  status: MarketStatus;
  question: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  volume: string;
  traders: string;
  yesOdds: string;
  noOdds: string;
};

const SPORT_CLASS: Record<Sport, string> = {
  Football: 'sport-football',
  Rugby: 'sport-rugby',
  Basketball: 'sport-basketball',
};

const MARKETS: Market[] = [
  {
    sport: 'Football',
    status: { label: 'LIVE', meta: "75'" },
    question: 'Will Vipers SC beat KCCA FC?',
    teamA: 'Vipers SC',
    teamB: 'KCCA FC',
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/kcca-fc.png',
    volume: 'UGX 2.4M',
    traders: '1.2K',
    yesOdds: 'UGX 1.62',
    noOdds: 'UGX 2.38',
  },
  {
    sport: 'Football',
    status: { label: 'LIVE', meta: "62'" },
    question: 'Will SC Villa score first vs Express FC?',
    teamA: 'SC Villa',
    teamB: 'Express FC',
    crestA: '/clubs/sc-villa.png',
    crestB: '/clubs/express-fc.png',
    volume: 'UGX 1.6M',
    traders: '856',
    yesOdds: 'UGX 1.55',
    noOdds: 'UGX 2.45',
  },
  {
    sport: 'Rugby',
    status: { label: 'LIVE', meta: 'Q3 04:15' },
    question: 'Will Kobs Rugby win this match?',
    teamA: 'Kobs Rugby',
    teamB: 'Black Pirates',
    crestA: '/clubs/kobs.jpg',
    crestB: '/clubs/black-pirates.png',
    volume: 'UGX 980K',
    traders: '642',
    yesOdds: 'UGX 1.45',
    noOdds: 'UGX 2.70',
  },
  {
    sport: 'Basketball',
    status: { label: 'LIVE', meta: 'Q3 02:30' },
    question: 'Will City Oilers score 80+ points?',
    teamA: 'City Oilers',
    teamB: 'Canons',
    crestA: '/clubs/city-oilers.png',
    volume: 'UGX 1.1M',
    traders: '721',
    yesOdds: 'UGX 1.70',
    noOdds: 'UGX 2.20',
  },
  {
    sport: 'Football',
    status: { label: 'OPEN', meta: 'Closes in 2h 45m' },
    question: 'Will BUL FC keep a clean sheet?',
    teamA: 'BUL FC',
    teamB: 'Gaddafi FC',
    volume: 'UGX 620K',
    traders: '412',
    yesOdds: 'UGX 1.75',
    noOdds: 'UGX 2.15',
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

function TeamCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="market-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="market-crest market-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function FeaturedMarkets() {
  return (
    <section className="featured-markets">
      <div className="featured-markets-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Featured Open Markets</h2>
            <p className="section-subheading">Live predictions. Real outcomes. Trade your view.</p>
          </div>
          <Link to="/markets" className="section-link">
            View all markets
          </Link>
        </div>

        <div className="market-grid">
          {MARKETS.map((market) => (
            <div className="market-card" key={market.question}>
              <div className="market-card-header">
                <span className={`market-sport-tag ${SPORT_CLASS[market.sport]}`}>{market.sport}</span>
                <span className={`market-status market-status-${market.status.label.toLowerCase()}`}>
                  {market.status.label}
                  <span className="market-status-meta">{market.status.meta}</span>
                </span>
              </div>

              <p className="market-question">{market.question}</p>

              <div className="market-teams">
                <div className="market-team">
                  <TeamCrest src={market.crestA} name={market.teamA} />
                  <span className="market-team-name">{market.teamA}</span>
                </div>
                <span className="market-vs">VS</span>
                <div className="market-team">
                  <TeamCrest src={market.crestB} name={market.teamB} />
                  <span className="market-team-name">{market.teamB}</span>
                </div>
              </div>

              <div className="market-stats">
                <div className="market-stat">
                  <span className="market-stat-label">Volume</span>
                  <span className="market-stat-value">{market.volume}</span>
                </div>
                <div className="market-stat">
                  <span className="market-stat-label">Traders</span>
                  <span className="market-stat-value">{market.traders}</span>
                </div>
              </div>

              <div className="market-actions">
                <button type="button" className="market-btn market-btn-yes">
                  YES <span>{market.yesOdds}</span>
                </button>
                <button type="button" className="market-btn market-btn-no">
                  NO <span>{market.noOdds}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedMarkets;
