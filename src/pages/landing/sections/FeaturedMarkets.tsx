import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InfoTooltip from '../../../components/InfoTooltip/InfoTooltip';
import { fetchContracts, fetchFeaturedPublishedMarkets } from '../../../services/marketAdminService';
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
  probabilityPct: number;
  yesPrice: string;
  noPrice: string;
};

const SPORT_CLASS: Record<Sport, string> = {
  Football: 'sport-football',
  Rugby: 'sport-rugby',
  Basketball: 'sport-basketball',
};

function isSupportedSport(category: MarketCategory): category is Sport {
  return category === 'Football' || category === 'Rugby' || category === 'Basketball';
}

function teamsFromEventLabel(eventLabel: string): { teamA: string; teamB: string } {
  const [teamA, teamB] = eventLabel.split(' vs ');
  return { teamA: teamA ?? eventLabel, teamB: teamB ?? 'Event market' };
}

function formatUgxVolume(amount: number): string {
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  return `UGX ${Math.round(amount / 1000)}K`;
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
  const supported = published.filter((market): market is AdminMarket => isSupportedSport(market.category));

  const contractEntries = await Promise.all(
    supported.map((market) => fetchContracts(market.id).then((contracts) => [market.id, contracts] as const)),
  );
  const contractsByMarket = new Map(contractEntries);

  return supported.map((market) => {
    const yes = market.outcomes.find((outcome) => outcome.id === 'YES')!;
    const contracts = contractsByMarket.get(market.id) ?? [];
    const totalUgx = contracts.reduce((sum, contract) => sum + contract.quantityUgx, 0);
    const traders = new Set(contracts.flatMap((contract) => [contract.buyer, contract.seller])).size;

    return {
      id: market.id,
      sport: market.category as Sport,
      status:
        market.status === 'Live'
          ? { label: 'LIVE', meta: 'In play' }
          : { label: 'OPEN', meta: formatClosesIn(market.parameters.closesAt) },
      question: market.question,
      ...teamsFromEventLabel(market.eventLabel),
      volume: formatUgxVolume(totalUgx),
      traders: traders.toLocaleString('en-US'),
      probabilityPct: yes.probabilityPct,
      yesPrice: `${yes.probabilityPct}¢`,
      noPrice: `${100 - yes.probabilityPct}¢`,
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
                text="A YES price of 62¢ means the market currently sees a 62% chance of YES. Prices move as more people trade."
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
            <div className="market-card" key={market.id}>
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
                <div className="market-probability-track">
                  <div className="market-probability-fill" style={{ width: `${market.probabilityPct}%` }} />
                </div>
                <span className="market-probability-label">{market.probabilityPct}% likely YES</span>
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
                <Link to={`/markets/${market.id}?outcome=YES`} className="market-btn market-btn-yes">
                  YES <span>{market.yesPrice}</span>
                </Link>
                <Link to={`/markets/${market.id}?outcome=NO`} className="market-btn market-btn-no">
                  NO <span>{market.noPrice}</span>
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
