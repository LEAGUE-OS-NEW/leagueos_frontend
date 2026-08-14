import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InfoTooltip from '../../../components/InfoTooltip/InfoTooltip';
import { fetchFeaturedPublishedMarkets } from '../../../services/marketAdminService';
import type { Market as AdminMarket, MarketCategory } from '../../../services/marketAdminService';
import './FeaturedMarkets.css';

type Sport = 'Football' | 'Rugby' | 'Basketball';

type MarketStatus = {
  label: 'LIVE' | 'OPEN';
  meta: string;
};

type Market = {
  id: string;
  sport: Sport;
  status: MarketStatus;
  question: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  volume: string;
  traders: string;
  yesPrice: string;
  noPrice: string;
};

const SPORT_CLASS: Record<Sport, string> = {
  Football: 'sport-football',
  Rugby: 'sport-rugby',
  Basketball: 'sport-basketball',
};

function isSupportedSport(market: AdminMarket): market is AdminMarket & { category: Sport } {
  const sport = (market.tags[0] ?? market.competition ?? '').toLowerCase();
  return (
    market.category === 'Football' ||
    market.category === 'Rugby' ||
    market.category === 'Basketball' ||
    sport.includes('football') ||
    sport.includes('rugby') ||
    sport.includes('basketball')
  );
}

function marketSport(market: AdminMarket): Sport {
  if (market.category === 'Football' || (market.tags[0] ?? '').toLowerCase().includes('football')) return 'Football';
  if (market.category === 'Rugby' || (market.tags[0] ?? '').toLowerCase().includes('rugby')) return 'Rugby';
  if (market.category === 'Basketball' || (market.tags[0] ?? '').toLowerCase().includes('basketball')) return 'Basketball';
  return 'Football'; // safe default — only reached when isSupportedSport passes
}

function teamsFromEventLabel(eventLabel: string): { teamA: string; teamB: string } {
  const [teamA, teamB] = eventLabel.split(' vs ');
  return { teamA: teamA ?? eventLabel, teamB: teamB ?? 'Event market' };
}

function formatClosesIn(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'Closing soon';
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `Closes in ${hours}h ${minutes}m`;
  return `Closes in ${minutes}m`;
}

async function loadFeaturedMarkets(): Promise<Market[]> {
  const published = await fetchFeaturedPublishedMarkets(5);
  // Keep all featured open markets; fall back to 'Football' for any market
  // whose sport tag doesn't match one of the three supported sport classes.
  const supported = published.filter(isSupportedSport);

  return supported.map((market) => {
    return {
      id: market.id,
      sport: marketSport(market),
      status:
        market.status === 'Live'
          ? { label: 'LIVE', meta: 'In play' }
          : { label: 'OPEN', meta: formatClosesIn(market.parameters.closesAt) },
      question: market.question,
      ...teamsFromEventLabel(market.eventLabel),
      volume: '—',
      traders: '—',
      yesPrice: 'Price unavailable',
      noPrice: 'Price unavailable',
    };
  });
}

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
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadFeaturedMarkets()
      .then((result) => {
        if (!cancelled) setMarkets(result);
      })
      .catch(() => {
        // Featured markets are a landing-page highlight, not the only way
        // to reach /markets — fail quietly and let the section render empty.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="featured-markets">
      <div className="featured-markets-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Featured Open Markets</h2>
            <p className="section-subheading">
              Live predictions. Real outcomes. Trade your view.
              <InfoTooltip
                label="How prices work"
                text="A winning share pays UGX 1,000. Current prices are shown in UGX per share when genuine trading data is available."
              />
            </p>
          </div>
          <Link to="/markets" className="section-link">
            View all markets
          </Link>
        </div>

        {isLoading && <p>Loading markets…</p>}
        {!isLoading && markets.length === 0 && <p>No open markets right now — check back soon.</p>}

        <div className="market-grid">
          {markets.map((market) => (
            <div className={`market-card ${SPORT_CLASS[market.sport]}`} key={market.id}>
              <Link
                to={`/markets/${market.id}`}
                className="market-card-link"
                aria-label={`${market.teamA} vs ${market.teamB}: ${market.question}`}
              />
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

              <div className="market-probability">
                <span className="market-probability-label">Not traded yet</span>
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
                <Link to="/login" className="market-btn market-btn-yes">
                  <span className="market-btn-label">YES</span>
                  <span className="market-btn-price">{market.yesPrice}</span>
                </Link>
                <Link to="/login" className="market-btn market-btn-no">
                  <span className="market-btn-label">NO</span>
                  <span className="market-btn-price">{market.noPrice}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedMarkets;
