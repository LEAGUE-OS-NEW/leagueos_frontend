import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { FiUsers, FiClock, FiArrowRight, FiCreditCard, FiBriefcase, FiZap } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useIdentityVerificationStore } from '../../../store/identityVerificationStore';
import { formatUgx } from '../../../utils/rules.ts';
import { fetchFanPositions, fetchPublishedMarkets, MARKET_CATEGORIES } from '../../../services/fanMarketsServices';
import type { Market, Position } from '../../../services/fanMarketsServices';
import { fetchWalletDetails } from '../../../services/walletService';
import type { WalletDetails } from '../../../services/walletService';
import DepositModal from '../wallet/sections/DepositModal';
import '../sections/FanDashboard.css';
import './Markets.css';
import './FanMarketDetail.css';
import './FanTradeHub.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CLOSED_STATUSES: Market['status'][] = ['Resolved', 'Voided', 'Cancelled'];

function MarketCard({ market, onNavigate }: { market: Market; onNavigate: NavigateFunction }) {
  const yes = market.outcomes.find((outcome) => outcome.id === 'YES');
  const no = market.outcomes.find((outcome) => outcome.id === 'NO');
  const isClosed = CLOSED_STATUSES.includes(market.status);

  return (
    <article className="trade-hub-market-card dashboard-card">
      <div className="trade-hub-market-card-head">
        <span className="trade-hub-sport-tag">{market.category}</span>
        <span className={`market-status-badge market-status-badge--${market.status.toLowerCase()}`}>
          {market.status === 'Live' ? 'LIVE' : market.status.toUpperCase()}
        </span>
      </div>

      <button type="button" className="trade-hub-market-card-main" onClick={() => onNavigate(`/fan/markets/${market.id}`)}>
        <p className="trade-hub-market-teams">{market.eventLabel}</p>
        <p className="trade-hub-market-question">{market.question}</p>
        <div className="trade-hub-market-meta">
          <span>
            <FiUsers /> {market.category}
          </span>
          <span>
            <FiClock /> {isClosed ? 'Closed' : formatDateTime(market.parameters.closesAt)}
          </span>
        </div>
      </button>

      {!isClosed && yes && (
        <div className="market-probability">
          <div className="market-probability-track">
            <div className="market-probability-fill" style={{ width: `${yes.probabilityPct}%` }} />
          </div>
          <span className="market-probability-label">{yes.probabilityPct}% likely YES</span>
        </div>
      )}

      {isClosed ? (
        <Link to={`/fan/markets/${market.id}`} className="trade-hub-closed-link">
          View result <FiArrowRight />
        </Link>
      ) : (
        <div className="trade-hub-market-actions">
          {yes && (
            <button type="button" className="trade-hub-yes-btn" onClick={() => onNavigate(`/fan/markets/${market.id}/trade`, { state: { outcomeId: 'YES' } })}>
              Yes {yes.price.toLocaleString()}
            </button>
          )}
          {no && (
            <button type="button" className="trade-hub-no-btn" onClick={() => onNavigate(`/fan/markets/${market.id}/trade`, { state: { outcomeId: 'NO' } })}>
              No {no.price.toLocaleString()}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function FanTradeHub() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const isIdentityVerified = useIdentityVerificationStore((state) => state.isVerified);
  const isVerified = Boolean(!isUserLoading && isIdentityVerified);

  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Initial load: isLoading is never read while !isVerified (the render
  // ternary below checks !isVerified first), so the early-return doesn't
  // need to touch it — avoids the synchronous setState-in-effect lint error.
  useEffect(() => {
    let cancelled = false;

    if (!isVerified) {
      return;
    }

    Promise.all([fetchPublishedMarkets(), fetchFanPositions(), fetchWalletDetails()])
      .then(([marketsData, positionsData, walletData]) => {
        if (cancelled) return;
        setMarkets(marketsData);
        setPositions(positionsData);
        setWallet(walletData);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your trading dashboard.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVerified]);

  function refresh() {
    if (!isVerified) return;
    setIsLoading(true);
    setError('');
    Promise.all([fetchPublishedMarkets(), fetchFanPositions(), fetchWalletDetails()])
      .then(([marketsData, positionsData, walletData]) => {
        setMarkets(marketsData);
        setPositions(positionsData);
        setWallet(walletData);
      })
      .catch(() => setError("Couldn't load your trading dashboard."))
      .finally(() => setIsLoading(false));
  }

  const liveMarkets = useMemo(() => markets.filter((market) => market.status === 'Live'), [markets]);
  const filteredMarkets = useMemo(
    () => (activeCategory === 'all' ? markets : markets.filter((market) => market.category === activeCategory)),
    [markets, activeCategory],
  );
  const openMarkets = useMemo(
    () => filteredMarkets.filter((market) => !CLOSED_STATUSES.includes(market.status)),
    [filteredMarkets],
  );
  const closedMarkets = useMemo(
    () => filteredMarkets.filter((market) => CLOSED_STATUSES.includes(market.status)),
    [filteredMarkets],
  );

  const handleDepositSuccess = () => {
    setIsDepositOpen(false);
    refresh();
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content trade-hub-page">
          {!isVerified ? (
            <DashboardNotice
              tone={isUserLoading ? 'empty' : 'forbidden'}
              title={isUserLoading ? 'Loading your account…' : 'Verify your identity to unlock full trading'}
              message={isUserLoading ? 'Checking your verification status.' : 'Complete identity verification to place orders, deposit funds, and manage positions.'}
              actionLabel={isUserLoading ? undefined : 'Verify identity'}
              actionTo={isUserLoading ? undefined : '/fan/verify'}
            />
          ) : isLoading ? (
            <DashboardSkeleton rows={6} />
          ) : error ? (
            <DashboardNotice tone="error" title="Couldn't load your trading dashboard" message={error} onRetry={refresh} />
          ) : (
            <>
              <section className="trade-hub-hero dashboard-card">
                <div className="trade-hub-hero-copy">
                  <span className="trade-hub-hero-eyebrow">
                    <FiZap /> Full trading access unlocked
                  </span>
                  <h1>Welcome back{currentUser.name ? `, ${currentUser.name}` : ''}</h1>
                  <p>Your identity is verified — buy, sell, and track positions across every open market.</p>
                </div>
                <div className="trade-hub-hero-wallet">
                  <span>Available Balance</span>
                  <b>{wallet?.balance ?? formatUgx(0)}</b>
                  <button type="button" className="verify-btn verify-btn--primary" onClick={() => setIsDepositOpen(true)}>
                    <FiCreditCard /> Top Up
                  </button>
                </div>
              </section>

              {liveMarkets.length > 0 && (
                <section className="trade-hub-section">
                  <div className="trade-hub-section-head">
                    <h2>
                      <span className="trade-hub-live-dot" aria-hidden="true" /> Live Now
                    </h2>
                  </div>
                  <div className="trade-hub-market-grid">
                    {liveMarkets.map((market) => (
                      <MarketCard key={market.id} market={market} onNavigate={navigate} />
                    ))}
                  </div>
                </section>
              )}

              <section className="trade-hub-section">
                <div className="trade-hub-section-head">
                  <h2>Explore Markets</h2>
                </div>
                <div className="trade-hub-categories" role="tablist" aria-label="Market categories">
                  <button type="button" role="tab" aria-selected={activeCategory === 'all'} className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory('all')}>
                    All
                  </button>
                  {MARKET_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={activeCategory === category}
                      className={activeCategory === category ? 'active' : ''}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {openMarkets.length === 0 && closedMarkets.length === 0 ? (
                  <p className="trade-hub-empty">No markets in this category right now.</p>
                ) : (
                  <>
                    <div className="trade-hub-market-subsection">
                      <h3 className="trade-hub-market-subhead">Open Markets</h3>
                      {openMarkets.length === 0 ? (
                        <p className="trade-hub-empty">No open markets in this category right now.</p>
                      ) : (
                        <div className="trade-hub-market-grid">
                          {openMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} onNavigate={navigate} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="trade-hub-market-subsection">
                      <h3 className="trade-hub-market-subhead">Closed Markets</h3>
                      {closedMarkets.length === 0 ? (
                        <p className="trade-hub-empty">No closed markets in this category yet.</p>
                      ) : (
                        <div className="trade-hub-market-grid">
                          {closedMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} onNavigate={navigate} />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="trade-hub-section">
                <div className="trade-hub-section-head">
                  <h2>
                    <FiBriefcase /> My Positions
                  </h2>
                  <Link to="/positions" className="trade-hub-view-all">
                    View all <FiArrowRight />
                  </Link>
                </div>
                {positions.length === 0 ? (
                  <p className="trade-hub-empty">You don&apos;t have any open positions yet.</p>
                ) : (
                  <div className="trade-hub-positions-list">
                    {positions.slice(0, 5).map((position) => (
                      <Link to={`/fan/positions/${position.contract.id}`} className="trade-hub-position-row" key={position.contract.id}>
                        <div>
                          <b>{position.market.question}</b>
                          <span className={position.contract.outcomeId === 'YES' ? 'up' : 'down'}>{position.contract.outcomeId}</span>
                        </div>
                        <div className="trade-hub-position-meta">
                          <span>{formatUgx(position.contract.quantityUgx)} staked</span>
                          <b>{position.contract.status}</b>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
        <Footer />
      </div>

      {isDepositOpen && <DepositModal onClose={() => setIsDepositOpen(false)} onSuccess={handleDepositSuccess} />}
    </div>
  );
}

export default FanTradeHub;