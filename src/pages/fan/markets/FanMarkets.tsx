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

import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import { useMarketEligibility } from '../../../hooks/useMarketEligibility';
import { marketEligibilityActions, marketEligibilityMessage, marketEligibilityTitle } from '../../../utils/marketEligibilityCopy.ts';
import {
  fetchMarkets,
  fetchMarketCategories,
  fetchMyPositions,
  type MarketCategory,
  type MarketListItem,
  type MarketStatus,
  type UserPosition,
} from '../../../services/fanMarketsServices';
import { formatUgx } from '../../../utils/rules.ts';
import {
  formatMarketSharePrice,
} from '../../../utils/marketPricing.ts';
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

function VerifyInlineNotice({
  compact = false,
  title,
  message,
}: {
  compact?: boolean;
  title: string;
  message: string;
}) {
  return (
    <div className={`verify-inline-notice${compact ? ' compact' : ''}`}>
      <FiLock aria-hidden="true" />
      <div>
        <b>{title}</b>
        <p>{message}</p>
      </div>
    </div>
  );
}

function Markets() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const {
    eligibility,
    isEligible,
    isLoading: isEligibilityLoading,
    isPending: isVerificationPending,
  } = useMarketEligibility();
  const isVerified = isEligible;
  const verificationTitle = marketEligibilityTitle(eligibility, isEligibilityLoading);
  const verificationMessage = marketEligibilityMessage(eligibility, 'Complete identity verification to start trading.');
  const verificationActions = marketEligibilityActions(eligibility);

  // Gate for any trade-intent action (Yes/No, Buy, etc). Unverified fans are
  // sent straight to the verification page instead of being interrupted by a
  // modal first.
  const requireVerification = (action: () => void) => {
    if (isEligibilityLoading) return;
    if (!isVerified) {
      navigate('/fan/verify');
      return;
    }
    action();
  };

  const { data: markets, isLoading, error, retry } = useDashboardSection<MarketListItem[]>(fetchMarkets);
  const { data: positions } = useDashboardSection<UserPosition[]>(fetchMyPositions);
  const {
    data: marketCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
    retry: retryCategories,
  } = useDashboardSection<MarketCategory[]>(fetchMarketCategories);

  const [tab, setTab] = useState<ListTab>('live');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('details');
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('');
  const numericAmount = Number(amount);
  const amountError = useMemo(() => {
    if (!amount) return '';
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return 'Enter a valid positive amount to trade.';
    }
    return '';
  }, [amount, numericAmount]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['live', 'upcoming']);
  const [allMarketsStatusFilter, setAllMarketsStatusFilter] = useState<MarketStatus | 'all'>('all');

 
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen || isDetailOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, isDetailOpen]);

  const visibleMarkets = useMemo(() => {
    if (!markets) return [];
    const byTab = tab === 'all'
      ? markets
      : tab === 'trending'
        ? markets.filter((m) => m.status === 'live' || m.status === 'trending')
        : markets.filter((m) => m.status === tab);
    return byTab.filter((market) => {
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(market.marketType);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(market.status);
      return matchesType && matchesStatus;
    });
  }, [markets, selectedStatuses, selectedTypes, tab]);

  // All Markets table: sort newest-first, then filter by the Ends In status chip
  const allMarketsDisplay = useMemo(() => {
    if (!markets) return [];
    const sorted = [...markets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (allMarketsStatusFilter === 'all') return sorted;
    return sorted.filter((m) => m.status === allMarketsStatusFilter);
  }, [markets, allMarketsStatusFilter]);

  useEffect(() => {
    if (!marketCategories) return;
    const validNames = new Set(marketCategories.map((category) => category.label));
    // API catalogue changes must invalidate selections that no longer exist.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTypes((current) => current.filter((type) => validNames.has(type)));
  }, [marketCategories]);

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
    if (!selectedMarket || !numericAmount || Number.isNaN(numericAmount)) return null;
    const price = tradeSide === 'buy' ? selectedMarket.yesPrice : selectedMarket.noPrice;
    if (price === null) return null;
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
    setSelectedTypes([]);
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
                  <div className="market-details-matchup">
                    <div className="market-details-team">
                      <CrestOrPlaceholder src={selectedMarket.crestA} name={selectedMarket.teamA} />
                      <span>{selectedMarket.teamA}</span>
                    </div>
                    <span className="market-mini-vs">vs</span>
                    <div className="market-details-team">
                      <CrestOrPlaceholder src={selectedMarket.crestB} name={selectedMarket.teamB} />
                      <span>{selectedMarket.teamB}</span>
                    </div>
                    <StatusChip market={selectedMarket} />
                  </div>

                  <div className="market-details-header-actions">
                    <button type="button" aria-label="Watchlist">
                      <FiStar />
                    </button>
                    <button type="button" aria-label="Share">
                      <FiShare2 />
                    </button>
                  </div>

                  <p className="market-details-league">{selectedMarket.league}</p>

                  <Link to={`/fan/markets/${selectedMarket.id}`} className="dashboard-card-link market-details-full-link">
                    Full page
                  </Link>
                </div>

                <div className="market-details-stats-row">
                  <div>
                    <span>Total Volume</span>
                    <b>{selectedMarket.volumeLabel === null ? '—' : `UGX ${selectedMarket.volumeLabel}`}</b>
                  </div>
                  <div>
                    <span>Total Contracts</span>
                    <b>{selectedMarket.totalContractsLabel ?? '—'}</b>
                  </div>
                  <div>
                    <span>Traders</span>
                    <b>{selectedMarket.tradersCount?.toLocaleString() ?? '—'}</b>
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
                    <span className="btn-label">Yes</span>
                    <span className="btn-price">{formatMarketSharePrice(selectedMarket.yesPrice)}</span>
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
                    <span className="btn-label">No</span>
                    <span className="btn-price">{formatMarketSharePrice(selectedMarket.noPrice)}</span>
                  </button>
                </div>

                {isVerified ? (
                  <div className="market-details-verified-row">
                    <div>
                      <span>Your Potential Win</span>
                      <b>{potentialReturn === null ? '—' : formatUgx(potentialReturn)}</b>
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
                  <VerifyInlineNotice compact title={verificationTitle} message={verificationMessage} />
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
                <VerifyInlineNotice title={verificationTitle} message={verificationMessage} />
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
                    <b>{selectedMarket?.question ?? 'Select a market'}</b>
                    {selectedMarket ? <StatusChip market={selectedMarket} /> : null}
                  </div>
                  <div className="trade-ticket-ends">
                    <span>Market Ends In</span>
                    <b>{selectedMarket?.endsInLabel ?? '—'}</b>
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
                    Amount (UGX) <span className="required-star">*</span>
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
                  {amountError && <p className="field-error">{amountError}</p>}

                  <div className="preset-chips">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button key={preset} type="button" onClick={() => setAmount(String(preset))}>
                        +{preset >= 1000 ? `${preset / 1000}K` : preset}
                      </button>
                    ))}
                  </div>

                  <div className="potential-return-row">
                    <span>Potential Return</span>
                    <b>{potentialReturn === null ? '—' : formatUgx(potentialReturn)}</b>
                  </div>

                 <div className="trade-actions">
                    <button
                      type="button"
                      className="buy-button buy-button--yes"
                      disabled={!amount || Number(amount) <= 0 || selectedMarket.yesPrice === null}
                      onClick={() =>
                        requireVerification(() =>
                          navigate(`/fan/markets/${selectedMarket.id}/review`, {
                            state: {
                              outcome: 'Yes',
                              side: 'buy',
                              price: selectedMarket.yesPrice,
                              amount: Number(amount) || 0,
                              contracts: Number(amount) && selectedMarket.yesPrice !== null ? Number(amount) / selectedMarket.yesPrice : 0,
                              feeRate: 0.02,
                            },
                          }),
                        )
                      }
                    >
                      Buy Yes
                    </button>
                    <button
                      type="button"
                      className="buy-button buy-button--no"
                      disabled={!amount || Number(amount) <= 0 || selectedMarket.yesPrice === null}
                      onClick={() =>
                        requireVerification(() =>
                          navigate(`/fan/markets/${selectedMarket.id}/review`, {
                            state: {
                              outcome: 'Yes',
                              side: 'sell',
                              price: selectedMarket.yesPrice,
                              amount: Number(amount) || 0,
                              contracts: Number(amount) && selectedMarket.yesPrice !== null ? Number(amount) / selectedMarket.yesPrice : 0,
                              feeRate: 0.02,
                            },
                          }),
                        )
                      }
                    >
                      Sell Yes
                    </button>
                  </div>
                  <button type="button" className="hold-position-btn" onClick={closeMarketDetail}>
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
                <h3>{verificationTitle}</h3>
                <p>{verificationMessage}</p>
                {verificationActions.length > 0 && (
                  <ul className="verify-checklist">
                    {verificationActions.map((action) => (
                      <li key={action}>
                        <FiCheckCircle /> {action}
                      </li>
                    ))}
                  </ul>
                )}
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
                  {isVerificationPending ? 'View verification status' : 'Get Started'}
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
                  {categoriesLoading ? (
                    <p>Loading categories…</p>
                  ) : categoriesError ? (
                    <DashboardNotice
                      tone="error"
                      title="Couldn't load market categories"
                      message={categoriesError}
                      onRetry={retryCategories}
                    />
                  ) : !marketCategories || marketCategories.length === 0 ? (
                    <p>No market categories available.</p>
                  ) : (
                    marketCategories.map((category) => (
                      <label key={category.id} className="filters-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(category.label)}
                          onChange={() => toggleType(category.label)}
                        />
                        {category.label}
                      </label>
                    ))
                  )}
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
                        className={`market-mini-card sport-${market.marketType.toLowerCase()}${selectedMarket?.id === market.id ? ' active' : ''}`}
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
                          <span className="mini-yesno mini-yesno--yes">
                            <span className="btn-label">Yes</span>
                            <span className="btn-price">{formatMarketSharePrice(market.yesPrice)}</span>
                          </span>
                          <span className="mini-yesno mini-yesno--no">
                            <span className="btn-label">No</span>
                            <span className="btn-price">{formatMarketSharePrice(market.noPrice)}</span>
                          </span>
                        </span>
                        <span className="market-mini-footer">
                          <span>Volume: {market.volumeLabel === null ? '—' : `UGX ${market.volumeLabel}`}</span>
                          <span>Traders: {market.tradersCount?.toLocaleString() ?? '—'}</span>
                          <span className="up">Change: {market.changePct === null ? '—' : `${market.changePct}%`}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-card markets-terminal-col all-markets-panel">
                <div className="all-markets-header">
                  <h2 className="section-title all-markets-title">All Markets</h2>
                </div>
                <div className="all-markets-simple-table" role="table" aria-label="All markets">
                  <div className="all-markets-simple-row all-markets-simple-labels" role="row">
                    <span>Market</span>
                    <span>Type</span>
                    <span className="all-markets-ends-header">
                      Ends In
                      <select
                        className="all-markets-ends-select"
                        value={allMarketsStatusFilter}
                        onChange={(e) => setAllMarketsStatusFilter(e.target.value as MarketStatus | 'all')}
                        aria-label="Filter by status"
                      >
                        <option value="all">All</option>
                        <option value="live">Live</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="closed">Closed</option>
                      </select>
                    </span>
                    <span>Volume (UGX)</span>
                    <span>Price / Share</span>
                    <span aria-hidden="true" />
                  </div>
                  {allMarketsDisplay.length === 0 ? (
                    <p className="all-markets-empty">No markets match this filter.</p>
                  ) : allMarketsDisplay.map((market) => (
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
                        {formatMarketSharePrice(market.yesPrice)} /{' '}
                        {formatMarketSharePrice(market.noPrice)}
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