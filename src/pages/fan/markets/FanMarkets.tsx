import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiCheckCircle,
  FiFilter,
  FiLock,
  FiShare2,
  FiShield,
  FiShieldOff,
  FiStar,
  FiTrendingUp,
  FiUnlock,
  FiCreditCard,
  FiX,
} from 'react-icons/fi';
// NOTE: adjust these relative imports if this page doesn't sit at
// src/pages/fan/markets/ alongside src/pages/fan/sections/
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import {
  fetchMarkets,
  fetchMyPositions,
  type MarketListItem,
  type UserPosition,
} from '../../../services/fanMarketsServices';
import '../sections/FanDashboard.css';
import './Markets.css';

type ListTab = 'live' | 'upcoming' | 'trending' | 'all';
type DetailTab = 'details' | 'positions' | 'info';
type TradeSide = 'buy' | 'sell';

const LIST_TABS: { key: ListTab; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'trending', label: 'Trending' },
  { key: 'all', label: 'All Markets' },
];

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'details', label: 'Market Details' },
  { key: 'positions', label: 'My Positions' },
  { key: 'info', label: 'Market Info' },
];

const PRESET_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

const MARKET_TYPE_OPTIONS = ['Match Result', 'Over/Under', 'Both Teams to Score', 'Goal Scorer', 'Combo Markets'];
const STATUS_OPTIONS: { key: 'live' | 'upcoming' | 'trending'; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'trending', label: 'Trending' },
];

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

function StatusChip({ market }: { market: MarketListItem }) {
  if (market.status === 'live') {
    return (
      <span className="market-status-badge market-status-badge--live">
        LIVE
        <b>{market.liveMinute}</b>
      </span>
    );
  }
  return (
    <span className="market-status-badge market-status-badge--upcoming">
      {market.scheduleLabel ?? 'UPCOMING'}
    </span>
  );
}

function VerifyInlineNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`verify-inline-notice${compact ? ' compact' : ''}`}>
      <FiLock aria-hidden="true" />
      <div>
        <b>Verify your account to see this</b>
        <p>Balances and positions are hidden until identity verification is complete.</p>
      </div>
    </div>
  );
}

function formatUgx(value: number) {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

function Markets() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const { currentUser } = useCurrentUser();
  // NOTE: swap this for whatever field your user object actually exposes for
  // identity/KYC verification (this is distinct from email verification).
  const isVerified = Boolean((currentUser as { isVerified?: boolean } | null | undefined)?.isVerified);

  // Gate for any trade-intent action (Yes/No, Buy, etc). Unverified fans get
  // redirected into the verification wizard instead of placing a trade.
  const requireVerification = (action: () => void) => {
    if (!isVerified) {
      navigate('/fan/verify');
      return;
    }
    action();
  };

  const { data: markets, isLoading, error, retry } = useDashboardSection<MarketListItem[]>(fetchMarkets);
  const { data: positions } = useDashboardSection<UserPosition[]>(fetchMyPositions);

  const [tab, setTab] = useState<ListTab>('live');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('details');
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Match Result']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['live', 'upcoming']);

  // Lock background scroll whenever the mobile sidebar OR the market detail
  // modal is open. Merged into one effect so the two don't fight over
  // document.body.style.overflow.
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen || isDetailOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, isDetailOpen]);

  const visibleMarkets = useMemo(() => {
    if (!markets) return [];
    if (tab === 'all') return markets;
    if (tab === 'trending') return markets.filter((m) => m.status === 'live' || m.status === 'trending');
    return markets.filter((m) => m.status === tab);
  }, [markets, tab]);

  // NOTE: previously this fell back to visibleMarkets[0] via a useEffect that
  // called setSelectedMarketId. That's a "derive state from state" pattern —
  // it doesn't need an effect. selectedMarket below already falls back to
  // visibleMarkets[0]/markets[0] whenever selectedMarketId is null or points
  // at a market that's been filtered out, so the effect was pure duplication
  // that only existed to trigger an extra render. Removed.

  const selectedMarket = useMemo(() => {
    if (!markets) return undefined;
    return markets.find((m) => m.id === selectedMarketId) ?? visibleMarkets[0] ?? markets[0];
  }, [markets, selectedMarketId, visibleMarkets]);

  const potentialReturn = useMemo(() => {
    const numericAmount = Number(amount);
    if (!selectedMarket || !numericAmount || Number.isNaN(numericAmount)) return 0;
    const price = tradeSide === 'buy' ? selectedMarket.yesPrice : selectedMarket.noPrice;
    return Math.round(numericAmount / price);
  }, [amount, selectedMarket, tradeSide]);

  const positionsTotal = useMemo(() => (positions ?? []).reduce((sum, p) => sum + p.value, 0), [positions]);

  const toggleType = (type: string) => {
    setSelectedTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  };

  const toggleStatus = (status: 'live' | 'upcoming' | 'trending') => {
    setSelectedStatuses((current) => (current.includes(status) ? current.filter((s) => s !== status) : [...current, status]));
  };

  const resetFilters = () => {
    setSelectedTypes(['Match Result']);
    setSelectedStatuses(['live', 'upcoming']);
  };

  const openMarketDetail = (id: string) => {
    setSelectedMarketId(id);
    setIsDetailOpen(true);
  };

  const closeMarketDetail = () => setIsDetailOpen(false);

  useEffect(() => {
    if (!isDetailOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMarketDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailOpen]);

  const marketDetailModal = isDetailOpen && selectedMarket ? (
    <div className="market-detail-modal-overlay" onClick={closeMarketDetail}>
      <div className="market-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="market-detail-modal-header">
          <h2>Market Details</h2>
          <button
            type="button"
            className="market-detail-modal-close"
            onClick={closeMarketDetail}
            aria-label="Close market details"
          >
            <FiX />
          </button>
        </div>

        <div className="market-detail-modal-body markets-terminal-grid">
          {/* ------------------------ market details / positions / info ----------------------- */}
          <section className="markets-terminal-col">
            <div className="market-detail-subtabs" role="tablist" aria-label="Market detail view">
              {DETAIL_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === item.key}
                  className={detailTab === item.key ? 'active' : ''}
                  onClick={() => setDetailTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {detailTab === 'details' ? (
              <>
                <div className="market-details-header">
                  <span className="market-mini-card-crests">
                    <CrestOrPlaceholder src={selectedMarket.crestA} name={selectedMarket.teamA} />
                    <span className="market-mini-vs">vs</span>
                    <CrestOrPlaceholder src={selectedMarket.crestB} name={selectedMarket.teamB} />
                  </span>
                  <div className="market-details-header-copy">
                    <div className="market-details-title-row">
                      <h2>
                        {selectedMarket.teamA} vs {selectedMarket.teamB}
                      </h2>
                      <StatusChip market={selectedMarket} />
                    </div>
                    <p>{selectedMarket.league}</p>
                  </div>
                  <div className="market-details-header-actions">
                    <button type="button" aria-label="Watchlist">
                      <FiStar />
                    </button>
                    <button type="button" aria-label="Share">
                      <FiShare2 />
                    </button>
                  </div>
                  <Link to={`/fan/markets/${selectedMarket.id}`} className="dashboard-card-link market-details-full-link">
                    Full page
                  </Link>
                </div>

                <div className="market-details-stats-row">
                  <div>
                    <span>Total Volume</span>
                    <b>UGX {selectedMarket.volumeLabel}</b>
                  </div>
                  <div>
                    <span>Total Contracts</span>
                    <b>{selectedMarket.totalContractsLabel}</b>
                  </div>
                  <div>
                    <span>Traders</span>
                    <b>{selectedMarket.tradersCount.toLocaleString()}</b>
                  </div>
                  <div>
                    <span>Market Ends</span>
                    <b className="up">{selectedMarket.endsInLabel}</b>
                  </div>
                </div>

                <h3 className="market-details-question">{selectedMarket.question}</h3>

                <div className="yesno-buttons">
                  <button
                    type="button"
                    className="buy-button buy-button--yes"
                    onClick={() =>
                      requireVerification(() => {
                        setDetailTab('details');
                        setTradeSide('buy');
                      })
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="buy-button buy-button--no"
                    onClick={() =>
                      requireVerification(() => {
                        setDetailTab('details');
                        setTradeSide('sell');
                      })
                    }
                  >
                    No
                  </button>
                </div>

                {isVerified ? (
                  <div className="market-details-verified-row">
                    <div>
                      <span>Your Potential Win</span>
                      <b>{formatUgx(potentialReturn)}</b>
                    </div>
                    <div>
                      <span>Market Liquidity</span>
                      <b>High</b>
                    </div>
                    <div>
                      <span>Your Balance</span>
                      <b>
                        <FiCreditCard /> UGX 125,000
                      </b>
                    </div>
                  </div>
                ) : (
                  <VerifyInlineNotice compact />
                )}
              </>
            ) : detailTab === 'positions' ? (
              isVerified ? (
                !positions || positions.length === 0 ? (
                  <DashboardNotice tone="empty" title="No open positions" message="Trade a market to see it here." />
                ) : (
                  <div className="my-positions-list">
                    {positions.map((position) => (
                      <div className="my-positions-row" key={position.id}>
                        <span className="my-positions-question">{position.question}</span>
                        <span className={position.side === 'Yes' ? 'up' : 'down'}>{position.side}</span>
                        <span>{position.quantity}</span>
                        <span>{position.price.toFixed(2)}</span>
                        <span>{position.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="my-positions-total-row">
                      <span>Total</span>
                      <b>{positionsTotal.toLocaleString()}</b>
                    </div>
                  </div>
                )
              ) : (
                <VerifyInlineNotice />
              )
            ) : (
              <dl className="market-info-fields">
                <div>
                  <dt>Event</dt>
                  <dd>
                    {selectedMarket.teamA} vs {selectedMarket.teamB}
                  </dd>
                </div>
                <div>
                  <dt>League</dt>
                  <dd>{selectedMarket.league}</dd>
                </div>
                <div>
                  <dt>Market Type</dt>
                  <dd>{selectedMarket.marketType}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedMarket.status === 'live' ? `Live \u00b7 ${selectedMarket.liveMinute ?? ''}` : selectedMarket.scheduleLabel ?? 'Upcoming'}</dd>
                </div>
                <div>
                  <dt>Ends In</dt>
                  <dd>{selectedMarket.endsInLabel}</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>UGX {selectedMarket.volumeLabel}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* --------------------------- trade / verify -------------------------- */}
          <aside className="markets-terminal-col markets-terminal-col--aside">
            {isVerified ? (
              <>
                <section className="dashboard-card trade-ticket">
                  <div className="trade-ticket-header">
                    <b>{selectedMarket.question}</b>
                    <StatusChip market={selectedMarket} />
                  </div>
                  <div className="trade-ticket-ends">
                    <span>Market Ends In</span>
                    <b>{selectedMarket.endsInLabel}</b>
                  </div>

                  <div className="trade-tabs" role="tablist" aria-label="Trade side">
                    <button type="button" role="tab" aria-selected={tradeSide === 'buy'} className={tradeSide === 'buy' ? 'active' : ''} onClick={() => setTradeSide('buy')}>
                      Buy
                    </button>
                    <button type="button" role="tab" aria-selected={tradeSide === 'sell'} className={tradeSide === 'sell' ? 'active' : ''} onClick={() => setTradeSide('sell')}>
                      Sell
                    </button>
                  </div>

                  <label className="trade-amount-label" htmlFor="trade-amount">
                    Amount (UGX)
                  </label>
                  <input
                    id="trade-amount"
                    type="number"
                    min="0"
                    placeholder="Enter amount"
                    className="trade-amount-input"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />

                  <div className="preset-chips">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button key={preset} type="button" onClick={() => setAmount(String(preset))}>
                        +{preset >= 1000 ? `${preset / 1000}K` : preset}
                      </button>
                    ))}
                  </div>

                  <div className="potential-return-row">
                    <span>Potential Return</span>
                    <b>{formatUgx(potentialReturn)}</b>
                  </div>

                  <div className="trade-actions">
                    <button type="button" className="buy-button buy-button--yes">
                      Buy Yes
                    </button>
                    <button type="button" className="buy-button buy-button--no">
                      Sell Yes
                    </button>
                  </div>
                  <button type="button" className="hold-position-btn">
                    Hold Position
                  </button>
                </section>

                <section className="dashboard-card my-positions-mini">
                  <h3>My Positions</h3>
                  {!positions || positions.length === 0 ? (
                    <p className="my-positions-empty">No open positions yet.</p>
                  ) : (
                    <>
                      {positions.map((position) => (
                        <div className="my-positions-mini-row" key={position.id}>
                          <span>
                            <b>{position.question}</b>
                            <small className={position.side === 'Yes' ? 'up' : 'down'}>
                              {position.side} {position.quantity}
                            </small>
                          </span>
                          <span>{position.value.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="my-positions-mini-total">
                        <span>Total</span>
                        <b>{positionsTotal.toLocaleString()}</b>
                      </div>
                    </>
                  )}
                  <Link to="#" className="dashboard-card-link view-all-positions-link">
                    View All Positions
                  </Link>
                </section>
              </>
            ) : (
              <section className="dashboard-card verify-card">
                <span className="verify-card-icon">
                  <FiLock />
                </span>
                <h3>You are not verified</h3>
                <p>Complete your identity verification to start trading and participate in all markets.</p>
                <ul className="verify-checklist">
                  <li>
                    <FiCheckCircle /> Secure &amp; Safe Trading
                  </li>
                  <li>
                    <FiCheckCircle /> Higher Limits
                  </li>
                  <li>
                    <FiCheckCircle /> Withdraw Earnings
                  </li>
                </ul>
                <Link to="/fan/verify" className="markets-cta markets-cta--primary verify-card-cta">
                  Get Started
                </Link>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content markets-terminal-content">
          <div className="markets-list-heading">
            <div className="markets-list-tabs" role="tablist" aria-label="Filter markets">
              {LIST_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  className={tab === item.key ? 'active' : ''}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="markets-filters-toggle" onClick={() => setIsFiltersOpen((v) => !v)}>
              <FiFilter /> Filters
            </button>
          </div>

          {isFiltersOpen && (
            <section className="dashboard-card filters-panel" aria-labelledby="filters-heading">
              <div className="filters-panel-heading">
                <h2 id="filters-heading">Filters</h2>
                <button type="button" className="dashboard-card-link" onClick={resetFilters}>
                  Reset
                </button>
              </div>
              <div className="filters-panel-groups">
                <div className="filters-group">
                  <h3>Market Type</h3>
                  {MARKET_TYPE_OPTIONS.map((type) => (
                    <label key={type} className="filters-checkbox">
                      <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
                      {type}
                    </label>
                  ))}
                </div>
                <div className="filters-group">
                  <h3>Status</h3>
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status.key} className="filters-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.key)}
                        onChange={() => toggleStatus(status.key)}
                      />
                      {status.label}
                    </label>
                  ))}
                </div>
                <div className="filters-group">
                  <h3>Sort By</h3>
                  <select defaultValue="most-traded">
                    <option value="most-traded">Most Traded</option>
                    <option value="ending-soon">Ending Soon</option>
                    <option value="newest">Newest</option>
                  </select>
                  <h3>Time</h3>
                  <select defaultValue="all-time">
                    <option value="all-time">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
              </div>
              <button type="button" className="markets-cta markets-cta--primary filters-apply" onClick={() => setIsFiltersOpen(false)}>
                Apply Filters
              </button>
            </section>
          )}

          {isLoading ? (
            <div className="dashboard-card">
              <DashboardSkeleton rows={6} />
            </div>
          ) : error ? (
            <div className="dashboard-card">
              <DashboardNotice tone="error" title="Couldn't load markets" message={error} onRetry={retry} />
            </div>
          ) : !markets || markets.length === 0 ? (
            <div className="dashboard-card">
              <DashboardNotice tone="empty" title="No markets yet" message="Check back soon." />
            </div>
          ) : (
            /* --------------------------- browse: live strip + all markets, as two distinct panels --------------------------- */
            <div className="markets-browse-stack">
              <section className="markets-terminal-col live-markets-panel">
                <h2 className="section-title live-markets-title">Live Now</h2>
                {visibleMarkets.length === 0 ? (
                  <DashboardNotice tone="empty" title="No markets here yet" message="Check back soon or browse another tab." />
                ) : (
                  <div className="live-cards-row">
                    {visibleMarkets.map((market) => (
                      <button
                        key={market.id}
                        type="button"
                        className={`market-mini-card${selectedMarket?.id === market.id ? ' active' : ''}`}
                        onClick={() => openMarketDetail(market.id)}
                      >
                        <StatusChip market={market} />
                        <span className="market-mini-card-crests">
                          <CrestOrPlaceholder src={market.crestA} name={market.teamA} />
                          <span className="market-mini-vs">vs</span>
                          <CrestOrPlaceholder src={market.crestB} name={market.teamB} />
                        </span>
                        <span className="market-mini-teams">
                          {market.teamA} <em>vs</em> {market.teamB}
                        </span>
                        <span className="market-mini-question">{market.question}</span>
                        <span className="market-mini-actions">
                          <span className="mini-yesno mini-yesno--yes">Yes</span>
                          <span className="mini-yesno mini-yesno--no">No</span>
                        </span>
                        <span className="market-mini-footer">
                          <span>Volume UGX{market.volumeLabel}</span>
                          <span>Traders {market.tradersCount.toLocaleString()}</span>
                          <span className="up">+{market.changePct}%</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-card markets-terminal-col all-markets-panel">
                <h2 className="section-title all-markets-title">All Markets</h2>
                <div className="all-markets-simple-table" role="table" aria-label="All markets">
                  <div className="all-markets-simple-row all-markets-simple-labels" role="row">
                    <span>Market</span>
                    <span>Type</span>
                    <span>Ends In</span>
                    <span>Volume (UGX)</span>
                    <span>Odds</span>
                    <span aria-hidden="true" />
                  </div>
                  {markets.map((market) => (
                    <div className="all-markets-simple-row" role="row" key={market.id}>
                      <span role="cell" className="all-markets-simple-market">
                        <CrestOrPlaceholder src={market.crestA} name={market.teamA} />
                        <span>
                          <b>{market.question}</b>
                          <small>
                            {market.teamA} vs {market.teamB}
                          </small>
                        </span>
                      </span>
                      <span role="cell">Yes / No</span>
                      <span role="cell" className={`markets-row-ends markets-row-ends--${market.status}`}>
                        {market.endsInLabel}
                      </span>
                      <span role="cell">{market.volumeLabel}</span>
                      <span role="cell">
                        {market.yesPrice.toFixed(2)} / {market.noPrice.toFixed(2)}
                      </span>
                      <span role="cell">
                        <button type="button" className="all-markets-view-btn" onClick={() => openMarketDetail(market.id)}>
                          View
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!isVerified && (
            <section className="markets-onboarding-row">
              <div className="dashboard-card onboarding-card">
                <h3>Start Trading in 3 Simple Steps</h3>
                <ol className="onboarding-steps">
                  <li>
                    <span className="onboarding-step-icon">
                      <FiShield />
                    </span>
                    <div>
                      <b>Get Verified</b>
                      <p>Complete your identity verification.</p>
                    </div>
                  </li>
                  <li>
                    <span className="onboarding-step-icon">
                     <FiCreditCard />
                    </span>
                    <div>
                      <b>Fund Wallet</b>
                      <p>Add funds to your wallet.</p>
                    </div>
                  </li>
                  <li>
                    <span className="onboarding-step-icon">
                      <FiTrendingUp />
                    </span>
                    <div>
                      <b>Start Trading</b>
                      <p>Buy or sell on any market.</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="dashboard-card onboarding-card onboarding-card--verify">
                <span className="verify-card-icon">
                  <FiShieldOff />
                </span>
                <h3>You are not verified</h3>
                <p>Complete your identity verification to start trading and participate in all markets.</p>
                <Link to="/fan/verify" className="markets-cta markets-cta--primary verify-card-cta">
                  Get Started
                </Link>
              </div>

              <div className="dashboard-card onboarding-card">
                <h3>Why Verify?</h3>
                <ul className="verify-checklist verify-checklist--why">
                  <li>
                    <FiUnlock /> Secure &amp; Safe Trading
                  </li>
                  <li>
                    <FiUnlock /> Higher Limits
                  </li>
                  <li>
                    <FiUnlock /> Withdraw Earnings
                  </li>
                </ul>
              </div>
            </section>
          )}
        </div>
        <Footer />
      </div>

      {/* --------------------------- market detail popup (portaled to <body>) --------------------------- */}
      {typeof document !== 'undefined' && marketDetailModal ? createPortal(marketDetailModal, document.body) : null}
    </div>
  );
}

export default Markets;