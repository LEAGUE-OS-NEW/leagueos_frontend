import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBell,
  FiShare2,
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
} from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

type DetailTab = 'overview' | 'chart' | 'orderbook' | 'activity' | 'info';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'chart', label: 'Chart' },
  { key: 'orderbook', label: 'Order Book' },
  { key: 'activity', label: 'My Activity' },
  { key: 'info', label: 'Market Info' },
];

// NOTE: shape this to line up with whatever fetchMarket(id) actually returns
// from fanMarketsServices. Stubbed here with the fields this page needs so
// the page can be wired up without blocking on the service layer.
interface MarketDetail {
  id: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  league: string;
  venue: string;
  scheduledAtLabel: string;
  status: 'live' | 'upcoming';
  liveMinute?: string;
  question: string;
  yesPrice: number;
  yesProbabilityPct: number;
  yesChangePct: number;
  noPrice: number;
  noProbabilityPct: number;
  noChangePct: number;
  volumeLabel: string;
  totalContractsLabel: string;
  tradersCount: number;
  endsInLabel: string;
  about: string;
  howItWorks: string[];
}

const MOCK_MARKET: MarketDetail = {
  id: 'sc-villa-clean-sheet',
  teamA: 'SC Villa',
  teamB: 'KCCA FC',
  league: 'Uganda Premier League',
  venue: 'Mutesa II Stadium',
  scheduledAtLabel: 'May 10, 2025 \u00b7 4:00 PM EAT',
  status: 'live',
  liveMinute: "72'",
  question: 'Can SC Villa get a clean sheet?',
  yesPrice: 2.15,
  yesProbabilityPct: 40,
  yesChangePct: 12.4,
  noPrice: 1.85,
  noProbabilityPct: 60,
  noChangePct: -12.1,
  volumeLabel: '57.8M',
  totalContractsLabel: '120,500',
  tradersCount: 1245,
  endsInLabel: '17m 43s',
  about: 'This market settles on whether SC Villa concede zero goals across the full 90 minutes plus added time.',
  howItWorks: [
    'Buy Yes if you think SC Villa keeps a clean sheet.',
    'Buy No if you think SC Villa concedes.',
    'The market settles after full time (including added time).',
  ],
};

function CrestOrPlaceholder({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="market-row-crest market-row-crest--placeholder" aria-hidden="true">
        {name.charAt(0)}
      </span>
    );
  }
  return <img className="market-row-crest" src={src} alt="" aria-hidden="true" />;
}

function MarketDetailOverview() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  // NOTE: swap for a real fetch keyed on marketId once the service exists.
  const market = useMemo(() => ({ ...MOCK_MARKET, id: marketId ?? MOCK_MARKET.id }), [marketId]);

  const goToTab = (tab: DetailTab) => {
    setDetailTab(tab);
    if (tab === 'chart' || tab === 'orderbook') {
      navigate(`/fan/markets/${market.id}/chart`, { state: { initialTab: tab } });
    }
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card market-detail-card">
                <div className="market-detail-topline">
                  <button type="button" className="market-back-btn" onClick={() => navigate(-1)}>
                    <FiArrowLeft /> Back
                  </button>
                  <div className="market-detail-topline-actions">
                    <button type="button" aria-label="Notifications">
                      <FiBell />
                    </button>
                    <button type="button" aria-label="Watchlist">
                      <FiStar />
                    </button>
                    <button type="button" aria-label="Share">
                      <FiShare2 />
                    </button>
                  </div>
                </div>

                <div className="market-details-header">
                  <span className="market-mini-card-crests">
                    <CrestOrPlaceholder src={market.crestA} name={market.teamA} />
                    <span className="market-mini-vs">vs</span>
                    <CrestOrPlaceholder src={market.crestB} name={market.teamB} />
                  </span>
                  <div className="market-details-header-copy">
                    <div className="market-details-title-row">
                      <h2>
                        {market.teamA} vs {market.teamB}
                      </h2>
                      {market.status === 'live' ? (
                        <span className="market-status-badge market-status-badge--live">
                          LIVE
                          <b>{market.liveMinute}</b>
                        </span>
                      ) : (
                        <span className="market-status-badge market-status-badge--upcoming">UPCOMING</span>
                      )}
                    </div>
                    <p>
                      {market.league} &middot; {market.venue} &middot; {market.scheduledAtLabel}
                    </p>
                  </div>
                </div>

                <div className="yesno-cards">
                  <button
                    type="button"
                    className="yesno-card yesno-card--yes"
                    onClick={() => navigate(`/fan/markets/${market.id}/trade`, { state: { side: 'buy', outcome: 'Yes' } })}
                  >
                    <span className="yesno-card-label">Yes</span>
                    <span className="yesno-card-question">{market.teamA} keeps a clean sheet?</span>
                    <span className="yesno-card-price">
                      UGX {market.yesPrice.toFixed(2)}
                      <FiTrendingUp className="up" />
                      <small className="up">{market.yesChangePct.toFixed(1)}%</small>
                    </span>
                    <span className="yesno-card-probability">{market.yesProbabilityPct}% Probability</span>
                    <span className="yesno-card-cta yesno-card-cta--yes">Buy Yes {market.yesPrice.toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    className="yesno-card yesno-card--no"
                    onClick={() => navigate(`/fan/markets/${market.id}/trade`, { state: { side: 'buy', outcome: 'No' } })}
                  >
                    <span className="yesno-card-label">No</span>
                    <span className="yesno-card-question">{market.teamA} concedes</span>
                    <span className="yesno-card-price">
                      UGX {market.noPrice.toFixed(2)}
                      <FiTrendingDown className="down" />
                      <small className="down">{Math.abs(market.noChangePct).toFixed(1)}%</small>
                    </span>
                    <span className="yesno-card-probability">{market.noProbabilityPct}% Probability</span>
                    <span className="yesno-card-cta yesno-card-cta--no">Buy No {market.noPrice.toFixed(2)}</span>
                  </button>
                </div>

                <div className="market-detail-meta-grid">
                  <div>
                    <span>Total Volume</span>
                    <b>UGX {market.volumeLabel}</b>
                  </div>
                  <div>
                    <span>Total Contracts</span>
                    <b>{market.totalContractsLabel}</b>
                  </div>
                  <div>
                    <span>Traders</span>
                    <b>{market.tradersCount.toLocaleString()}</b>
                  </div>
                  <div>
                    <span>Market Ends In</span>
                    <b className="up">{market.endsInLabel}</b>
                  </div>
                </div>

                <div className="market-detail-subtabs" role="tablist" aria-label="Market detail view">
                  {DETAIL_TABS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={detailTab === item.key}
                      className={detailTab === item.key ? 'active' : ''}
                      onClick={() => goToTab(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="market-detail-panel">
                  <div>
                    <h3 className="trade-ticket-question">About this market</h3>
                    <p>{market.about}</p>
                  </div>
                  <div>
                    <h3 className="trade-ticket-question">How it works</h3>
                    <ul className="verify-checklist verify-checklist--why">
                      {market.howItWorks.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </main>

            <aside className="market-detail-aside">
              <section className="dashboard-card">
                <Link to={`/fan/markets/${market.id}/trade`} className="markets-cta markets-cta--primary" style={{ width: '100%' }}>
                  Trade This Market
                </Link>
              </section>
            </aside>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default MarketDetailOverview;