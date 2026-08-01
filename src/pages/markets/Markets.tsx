import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiClock,
  FiHelpCircle,
  FiRepeat,
  FiSearch,
  FiShield,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { GiBasketballBall, GiRugbyConversion, GiSoccerBall, GiTrophyCup } from 'react-icons/gi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './Markets.css';

type Sport = 'Football' | 'Rugby' | 'Basketball';
type SportFilter = 'All' | Sport;

type FeaturedMarket = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  question: string;
  closesIn: string;
  traders: string;
  tradedYes: string;
  yesOdds: string;
  noOdds: string;
};

type OpenMarketRow = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  yesOdds: string;
  noOdds: string;
  volume: string;
  closesIn: string;
};

type StartingSoonItem = {
  sport: Sport;
  teamA: string;
  teamB: string;
  league: string;
  startsIn: string;
};

type TrendingMarket = {
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  fireCount: string;
};

type ClosedMarketRow = {
  id: string;
  sport: Sport;
  teamA: string;
  teamB: string;
  question: string;
  result: 'Yes' | 'No';
  volume: string;
  closedAgo: string;
};

const SPORT_META: Record<Sport, { icon: IconType; markets: string; live: string; className: string }> = {
  Football: { icon: GiSoccerBall, markets: '1,284 markets', live: '87', className: 'football' },
  Rugby: { icon: GiRugbyConversion, markets: '342 markets', live: '18', className: 'rugby' },
  Basketball: { icon: GiBasketballBall, markets: '512 markets', live: '34', className: 'basketball' },
};

const FEATURED_MARKETS: FeaturedMarket[] = [
  {
    id: 'vipers-kcca',
    sport: 'Football',
    teamA: 'Vipers SC',
    teamB: 'KCCA FC',
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/kcca-fc.png',
    question: 'Will Vipers SC beat KCCA FC?',
    closesIn: 'Closes in 2h 45m',
    traders: '1.2K',
    tradedYes: '75% Yes',
    yesOdds: 'UGX 1.65',
    noOdds: 'UGX 2.20',
  },
  {
    id: 'kobs-heathens',
    sport: 'Rugby',
    teamA: 'KOBS Rugby',
    teamB: 'Heathens RC',
    crestA: '/clubs/kobs.jpg',
    crestB: '/clubs/platinum-heathens.jpg',
    question: 'Will KOBS win the match?',
    closesIn: 'Closes in 3h 04m',
    traders: '856',
    tradedYes: '68% Yes',
    yesOdds: 'UGX 1.55',
    noOdds: 'UGX 2.35',
  },
  {
    id: 'oilers-canons',
    sport: 'Basketball',
    teamA: 'City Oilers',
    teamB: 'UCU Canons',
    crestA: '/clubs/city-oilers.png',
    question: 'Will City Oilers score 80+ points?',
    closesIn: 'Closes in 3h 22m',
    traders: '1.0K',
    tradedYes: '71% Yes',
    yesOdds: 'UGX 1.75',
    noOdds: 'UGX 2.15',
  },
];

const OPEN_MARKETS: OpenMarketRow[] = [
  {
    id: 'express-villa',
    sport: 'Football',
    teamA: 'Express FC',
    teamB: 'SC Villa',
    question: 'Will Express FC score 2+ goals?',
    yesOdds: 'UGX 1.70',
    noOdds: 'UGX 2.10',
    volume: '427',
    closesIn: '1h 18m',
  },
  {
    id: 'jinja-rams',
    sport: 'Rugby',
    teamA: 'Jinja Hippos',
    teamB: 'Rams',
    question: 'Will Jinja Hippos win the match?',
    yesOdds: 'UGX 1.60',
    noOdds: 'UGX 2.30',
    volume: '312',
    closesIn: '2h 05m',
  },
  {
    id: 'ndejje-power',
    sport: 'Basketball',
    teamA: 'Ndejje Angels',
    teamB: 'Power',
    question: 'Will Ndejje Angels score 75+ points?',
    yesOdds: 'UGX 1.80',
    noOdds: 'UGX 2.05',
    volume: '256',
    closesIn: '3h 12m',
  },
  {
    id: 'bul-maroons',
    sport: 'Football',
    teamA: 'BUL FC',
    teamB: 'Maroons FC',
    question: 'Will BUL FC keep a clean sheet?',
    yesOdds: 'UGX 1.65',
    noOdds: 'UGX 2.25',
    volume: '198',
    closesIn: '4h 01m',
  },
  {
    id: 'pirates-impis',
    sport: 'Rugby',
    teamA: 'Black Pirates',
    teamB: 'Impis',
    question: 'Will Black Pirates lead at halftime?',
    yesOdds: 'UGX 1.75',
    noOdds: 'UGX 2.10',
    volume: '142',
    closesIn: '5h 30m',
  },
];

const STARTING_SOON: StartingSoonItem[] = [
  { sport: 'Football', teamA: 'Express FC', teamB: 'SC Villa', league: 'Uganda Premier League', startsIn: '1h 18m' },
  { sport: 'Rugby', teamA: 'KOBS', teamB: 'Heathens RC', league: 'Rugby Africa Cup', startsIn: '2h 05m' },
  { sport: 'Basketball', teamA: 'City Oilers', teamB: 'UCU Canons', league: 'NBL Uganda', startsIn: '3h 22m' },
  { sport: 'Football', teamA: 'Vipers SC', teamB: 'KCCA FC', league: 'Uganda Premier League', startsIn: '4h 10m' },
  { sport: 'Rugby', teamA: 'Black Pirates', teamB: 'Rams', league: 'Rugby Africa Cup', startsIn: '5h 45m' },
];

const TRENDING_MARKETS: TrendingMarket[] = [
  { sport: 'Football', teamA: 'Vipers SC', teamB: 'KCCA FC', question: 'Will Vipers SC win?', fireCount: '1.2K' },
  { sport: 'Rugby', teamA: 'KOBS', teamB: 'Heathens RC', question: 'Will KOBS win the match?', fireCount: '987' },
  { sport: 'Basketball', teamA: 'City Oilers', teamB: 'UCU Canons', question: 'Will City Oilers score 80+?', fireCount: '756' },
  { sport: 'Football', teamA: 'SC Villa', teamB: 'BUL FC', question: 'Will SC Villa score first?', fireCount: '642' },
  { sport: 'Rugby', teamA: 'Black Pirates', teamB: 'Rams', question: 'Will Black Pirates win?', fireCount: '521' },
];

const CLOSED_MARKETS: ClosedMarketRow[] = [
  {
    id: 'vipers-express-closed',
    sport: 'Football',
    teamA: 'Vipers SC',
    teamB: 'Express FC',
    question: 'Did Vipers SC win?',
    result: 'Yes',
    volume: '892',
    closedAgo: '2h ago',
  },
  {
    id: 'kobs-pirates-closed',
    sport: 'Rugby',
    teamA: 'KOBS',
    teamB: 'Black Pirates',
    question: 'Did KOBS win by 7+ points?',
    result: 'No',
    volume: '634',
    closedAgo: '5h ago',
  },
  {
    id: 'oilers-patriots-closed',
    sport: 'Basketball',
    teamA: 'City Oilers',
    teamB: 'Patriots BC',
    question: 'Did City Oilers score 80+?',
    result: 'Yes',
    volume: '1.1K',
    closedAgo: '1d ago',
  },
];

const HOW_IT_WORKS_STEPS: { icon: IconType; title: string; description: string; accent: 'purple' | 'orange' | 'blue' }[] = [
  { icon: FiSearch, title: 'Explore markets', description: 'Browse live and upcoming questions.', accent: 'purple' },
  { icon: FiRepeat, title: 'Pick your side', description: 'Choose YES or NO and see the price.', accent: 'orange' },
  { icon: FiBarChart2, title: 'Trade & track', description: 'Prices move as opinions change.', accent: 'blue' },
  { icon: GiTrophyCup, title: 'Cash out & win', description: 'Cash out anytime or hold to settlement.', accent: 'purple' },
];

const SPORT_FILTERS: SportFilter[] = ['All', 'Football', 'Rugby', 'Basketball'];

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

function SportIcon({ sport }: { sport: Sport }) {
  const Icon = SPORT_META[sport].icon;
  return <Icon aria-hidden="true" />;
}

function OutcomeButton({
  label,
  value,
  choice,
  selected,
  onSelect,
}: {
  label: 'Yes' | 'No';
  value: string;
  choice: 'yes' | 'no';
  selected?: 'yes' | 'no';
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`outcome-button outcome-button--${choice}${selected === choice ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected === choice}
    >
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );
}

function Markets() {
  const [openMarketFilter, setOpenMarketFilter] = useState<SportFilter>('All');
  const [selections, setSelections] = useState<Record<string, 'yes' | 'no'>>({});
  const [savedFixtures, setSavedFixtures] = useState<string[]>([]);

  const visibleOpenMarkets = useMemo(() => {
    if (openMarketFilter === 'All') return OPEN_MARKETS;
    return OPEN_MARKETS.filter((market) => market.sport === openMarketFilter);
  }, [openMarketFilter]);

  const selectOutcome = (id: string, outcome: 'yes' | 'no') => {
    setSelections((current) => ({ ...current, [id]: outcome }));
  };

  const toggleSaved = (match: string) => {
    setSavedFixtures((current) =>
      current.includes(match) ? current.filter((item) => item !== match) : [...current, match]
    );
  };

  return (
    <div className="markets-page">
      <Navbar />

      <main className="markets-main">
        <section className="markets-hero">
          <img className="markets-hero-image" src="/images/hero.png" alt="" aria-hidden="true" />
          <div className="markets-hero-overlay" aria-hidden="true" />
          <div className="markets-hero-inner">
            <p className="markets-eyebrow">Live Sports Markets</p>
            <h1 className="markets-heading">
              Predict. Trade.
              <br />
              <span className="markets-heading-gradient">Follow the Game.</span>
            </h1>
            <p className="markets-subtext">
              Explore open sports markets across football, rugby and basketball in Uganda.
            </p>
            <Link to="/signup" className="markets-cta">
              Sign Up Now
              <FiArrowRight />
            </Link>
          </div>
        </section>

        <section className="sports-summary" aria-label="Market categories">
          {(Object.keys(SPORT_META) as Sport[]).map((sport) => {
            const meta = SPORT_META[sport];
            return (
              <a href={`#${meta.className}-markets`} className={`sport-summary-card ${meta.className}`} key={sport}>
                <span className="sport-summary-icon">
                  <SportIcon sport={sport} />
                </span>
                <span className="sport-summary-copy">
                  <b>{sport}</b>
                  <small>{meta.markets}</small>
                  <em>
                    <i /> Live <strong>{meta.live}</strong>
                  </em>
                </span>
                <FiArrowRight className="sport-summary-arrow" />
              </a>
            );
          })}
        </section>

        <section className="market-panel featured-markets-panel" aria-labelledby="featured-markets-heading">
          <div className="market-panel-heading">
            <div>
              <h2 id="featured-markets-heading">
                <FiZap /> Featured Open Markets
              </h2>
              <p>Explore trending questions. Trade your view.</p>
            </div>
            <Link to="/markets" className="market-view-link">
              View all markets
            </Link>
          </div>

          <div className="featured-markets-grid">
            {FEATURED_MARKETS.map((market) => (
              <article className="featured-market-card" key={market.id}>
                <div className="featured-market-header">
                  <span className={`sport-tag ${SPORT_META[market.sport].className}`}>{market.sport}</span>
                  <span className="open-badge">Open</span>
                </div>

                <div className="featured-market-teams">
                  <div className="featured-market-team">
                    <TeamCrest src={market.crestA} name={market.teamA} />
                    <span>{market.teamA}</span>
                  </div>
                  <span className="featured-market-vs">vs</span>
                  <div className="featured-market-team">
                    <TeamCrest src={market.crestB} name={market.teamB} />
                    <span>{market.teamB}</span>
                  </div>
                </div>

                <p className="featured-market-question">{market.question}</p>
                <p className="featured-market-closes">{market.closesIn}</p>

                <div className="featured-market-stats">
                  <span>
                    <FiUsers /> {market.traders}
                  </span>
                  <span>Traded {market.tradedYes}</span>
                </div>

                <div className="market-outcomes">
                  <OutcomeButton
                    label="Yes"
                    value={market.yesOdds}
                    choice="yes"
                    selected={selections[market.id]}
                    onSelect={() => selectOutcome(market.id, 'yes')}
                  />
                  <OutcomeButton
                    label="No"
                    value={market.noOdds}
                    choice="no"
                    selected={selections[market.id]}
                    onSelect={() => selectOutcome(market.id, 'no')}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="markets-layout">
          <div className="markets-primary-column">
            <section className="market-panel open-markets-panel" aria-labelledby="open-markets-heading">
              <div className="market-panel-heading">
                <h2 id="open-markets-heading">Open Markets</h2>
                <Link to="/markets" className="market-view-link">
                  View all markets
                </Link>
              </div>

              <div className="open-markets-filters" role="group" aria-label="Filter open markets by sport">
                {SPORT_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={openMarketFilter === filter ? 'active' : ''}
                    onClick={() => setOpenMarketFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="open-markets-table" role="table" aria-label="Open market list">
                <div className="open-market-row open-market-labels" role="row">
                  <span>Event</span>
                  <span>Market Question</span>
                  <span>Yes</span>
                  <span>No</span>
                  <span>Volume</span>
                  <span>Closes In</span>
                </div>

                {visibleOpenMarkets.map((market) => (
                  <article className="open-market-row" role="row" key={market.id}>
                    <div className="open-market-event" role="cell">
                      <span className={`sport-tag ${SPORT_META[market.sport].className}`}>{market.sport}</span>
                      <span className="open-market-teams">
                        {market.teamA} vs {market.teamB}
                      </span>
                    </div>
                    <p role="cell" className="open-market-question">
                      {market.question}
                    </p>
                    <div role="cell" className="open-market-outcome open-market-outcome--yes">
                      {market.yesOdds}
                    </div>
                    <div role="cell" className="open-market-outcome open-market-outcome--no">
                      {market.noOdds}
                    </div>
                    <div role="cell" className="open-market-volume">
                      {market.volume}
                    </div>
                    <div role="cell" className="open-market-closes">
                      {market.closesIn}
                    </div>
                  </article>
                ))}

                {visibleOpenMarkets.length === 0 && (
                  <p className="open-markets-empty">No open markets for this sport right now.</p>
                )}
              </div>

              <Link to="/markets" className="open-markets-explore-link">
                Explore all open markets
                <FiArrowRight />
              </Link>
            </section>

            <section className="market-panel closed-markets-panel" aria-labelledby="closed-markets-heading">
              <div className="market-panel-heading">
                <h2 id="closed-markets-heading">Closed Markets</h2>
                <Link to="/markets" className="market-view-link">
                  View all markets
                </Link>
              </div>

              <div className="open-markets-table" role="table" aria-label="Closed market list">
                <div className="open-market-row closed-market-labels open-market-labels" role="row">
                  <span>Event</span>
                  <span>Market Question</span>
                  <span>Result</span>
                  <span>Volume</span>
                  <span>Closed</span>
                </div>

                {CLOSED_MARKETS.map((market) => (
                  <article className="open-market-row closed-market-row" role="row" key={market.id}>
                    <div className="open-market-event" role="cell">
                      <span className={`sport-tag ${SPORT_META[market.sport].className}`}>{market.sport}</span>
                      <span className="open-market-teams">
                        {market.teamA} vs {market.teamB}
                      </span>
                    </div>
                    <p role="cell" className="open-market-question">
                      {market.question}
                    </p>
                    <div role="cell" className={`closed-market-result closed-market-result--${market.result.toLowerCase()}`}>
                      {market.result}
                    </div>
                    <div role="cell" className="open-market-volume">
                      {market.volume}
                    </div>
                    <div role="cell" className="open-market-closes">
                      {market.closedAgo}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="markets-aside">
            <section className="market-panel trending-panel" aria-labelledby="trending-heading">
              <div className="market-panel-heading">
                <h2 id="trending-heading">
                  <FiZap /> Trending Markets
                </h2>
                <Link to="/markets" className="market-view-link">
                  View all
                </Link>
              </div>

              <div className="trending-list">
                {TRENDING_MARKETS.map((market) => (
                  <div className="trending-item" key={`${market.teamA}-${market.teamB}`}>
                    <span className={`trending-icon ${SPORT_META[market.sport].className}`}>
                      <SportIcon sport={market.sport} />
                    </span>
                    <div className="trending-copy">
                      <b>
                        {market.teamA} vs {market.teamB}
                      </b>
                      <span>{market.question}</span>
                    </div>
                    <span className="trending-count">
                      <FiZap /> {market.fireCount}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="market-panel starting-soon-panel" aria-labelledby="starting-soon-heading">
              <div className="market-panel-heading">
                <h2 id="starting-soon-heading">
                  <FiClock /> Starting Soon
                </h2>
                <Link to="/markets" className="market-view-link">
                  View all
                </Link>
              </div>

              <div className="starting-soon-list">
                {STARTING_SOON.map((fixture) => {
                  const match = `${fixture.teamA} vs ${fixture.teamB}`;
                  return (
                    <article className="starting-soon-item" key={match}>
                      <span className={`starting-soon-icon ${SPORT_META[fixture.sport].className}`}>
                        <SportIcon sport={fixture.sport} />
                      </span>
                      <div className="starting-soon-copy">
                        <span className="starting-soon-sport">{fixture.sport}</span>
                        <h3>{match}</h3>
                        <p>{fixture.league}</p>
                      </div>
                      <div className="starting-soon-meta">
                        <span className="starting-soon-time">Starts in {fixture.startsIn}</span>
                        <button
                          type="button"
                          aria-label={`Notify me about ${match}`}
                          aria-pressed={savedFixtures.includes(match)}
                          className={savedFixtures.includes(match) ? 'saved' : ''}
                          onClick={() => toggleSaved(match)}
                        >
                          <FiBell />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <Link to="/markets" className="starting-soon-view-full">
                View full calendar
                <FiArrowRight />
              </Link>
            </section>
          </aside>
        </section>

        <section className="how-markets" id="how-markets-work" aria-labelledby="how-markets-heading">
          <div className="how-markets-intro">
            <p>How Markets Work</p>
            <h2 id="how-markets-heading">Simple steps. Real markets. Real rewards.</h2>
          </div>

          <div className="how-market-steps">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <article key={step.title}>
                <span className={`how-market-step-icon ${step.accent}`}>
                  <step.icon />
                </span>
                <b>{index + 1}</b>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>

          <div className="market-chart-promo">
            <p>Markets move with the game.</p>
            <span>The more you follow, the smarter you trade.</span>
            <FiBarChart2 aria-hidden="true" />
          </div>
        </section>

        <section className="responsible-section" aria-labelledby="responsible-heading">
          <div className="responsible-main">
            <div className="responsible-heading">
              <FiShield aria-hidden="true" />
              <div>
                <h2 id="responsible-heading">Responsible Play</h2>
                <p>We promote safe, responsible and informed participation.</p>
              </div>
            </div>

            <div className="responsible-list">
              <article>
                <FiUsers />
                <p>
                  Play for fun,
                  <br />
                  not for money.
                </p>
              </article>
              <article>
                <FiShield />
                <p>
                  Set limits and
                  <br />
                  stick to them.
                </p>
              </article>
              <article>
                <b>18+</b>
                <p>
                  18+ only.
                  <br />
                  Play responsibly.
                </p>
              </article>
              <article>
                <FiHelpCircle />
                <p>
                  Trading involves risk.
                  <br />
                  Prices can go up or down. 18+ only.
                </p>
              </article>
            </div>
          </div>

          <aside className="support-card">
            <FiHelpCircle aria-hidden="true" />
            <div>
              <h3>Need support?</h3>
              <p>Visit our Help Centre for tools and resources.</p>
              <a href="#support">Learn more</a>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Markets;
