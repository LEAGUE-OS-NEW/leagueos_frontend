import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBell,
  FiShare2,
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
  FiLock,
  FiX,
} from 'react-icons/fi';
import { useMarketEligibility } from '../../../hooks/useMarketEligibility';
import {
  formatMarketSharePrice,
} from '../../../utils/marketPricing.ts';
import { fetchMarket } from '../../../services/fanMarketsServices';
import type { Market, OutcomeId } from '../../../services/fanMarketsServices';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function outcomeOf(market: Market, id: OutcomeId) {
  return market.outcomes.find((outcome) => outcome.id === id);
}

function MarketDetailOverview() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const { isEligible, isPending } = useMarketEligibility();
  const isVerified = isEligible;
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    // marketId can change (navigating between market detail pages re-uses
    // this component), so loading/error need to reset synchronously here —
    // otherwise a stale error or "loaded" state from the previous market
    // would flash before the new fetch resolves. Legitimate re-sync of
    // local state to a changing prop, not a render-cascade risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError('');
    fetchMarket(marketId)
      .then((result) => {
        if (!cancelled) setMarket(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : 'Market not found.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  const requireVerification = (action: () => void) => {
    if (!isVerified) {
      setIsVerifyModalOpen(true);
      return;
    }
    action();
  };

  const goToTrade = (outcomeId: OutcomeId) => {
    if (!market) return;
    requireVerification(() => navigate(`/fan/markets/${market.id}/trade`, { state: { outcomeId } }));
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          {isLoading ? (
            <DashboardSkeleton rows={6} />
          ) : error || !market ? (
            <DashboardNotice
              tone="error"
              title="Couldn't load this market"
              message={error || 'This market may have been removed.'}
              actionLabel="Back to Markets"
              actionTo="/fan/trade"
            />
          ) : (
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
                    <div className="market-details-header-copy">
                      <div className="market-details-title-row">
                        <h2>{market.eventLabel}</h2>
                        {market.status === 'Live' ? (
                          <span className="market-status-badge market-status-badge--live">LIVE</span>
                        ) : (
                          <span className="market-status-badge market-status-badge--upcoming">UPCOMING</span>
                        )}
                      </div>
                      <p>
                        {market.competition} &middot; {market.venue} &middot; {formatDateTime(market.kickoff)}
                      </p>
                    </div>
                  </div>

                  <h3 className="market-details-question">{market.question}</h3>

                  <div className="yesno-cards">
                    {(['YES', 'NO'] as const).map((id) => {
                      const outcome = outcomeOf(market, id);
                      if (!outcome) return null;
                      const isYes = id === 'YES';
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`yesno-card yesno-card--${isYes ? 'yes' : 'no'}`}
                          onClick={() => outcome.price !== null && goToTrade(id)}
                          disabled={outcome.price === null}
                        >
                          <span className="yesno-card-label">{outcome.label}</span>
                          <span className="yesno-card-question">{outcome.description || market.question}</span>
                          <span className="yesno-card-price">
                            {formatMarketSharePrice(outcome.price, outcome.markSource)}
                            {isYes ? <FiTrendingUp className="up" /> : <FiTrendingDown className="down" />}
                          </span>
                          <span className="yesno-card-probability">
                            {outcome.probabilityPct === null ? 'Not traded yet' : `${outcome.probabilityPct}% Probability`}
                          </span>
                          <span className={`yesno-card-cta yesno-card-cta--${isYes ? 'yes' : 'no'}`}>
                            Buy {outcome.label} · {formatMarketSharePrice(outcome.price, outcome.markSource)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="market-detail-meta-grid">
                    <div>
                      <span>Initial Liquidity</span>
                      <b>UGX {market.parameters.initialLiquidityUgx.toLocaleString()}</b>
                    </div>
                    <div>
                      <span>Trade Limits</span>
                      <b>
                        UGX {market.parameters.minTradeUgx.toLocaleString()}&ndash;
                        {market.parameters.maxTradeUgx.toLocaleString()}
                      </b>
                    </div>
                    <div>
                      <span>Platform Fee</span>
                      <b>{market.parameters.feePct}%</b>
                    </div>
                    <div>
                      <span>Trading Closes</span>
                      <b className="up">{formatDateTime(market.parameters.closesAt)}</b>
                    </div>
                  </div>

                  <div className="market-detail-panel">
                    <div>
                      <h3 className="trade-ticket-question">About this market</h3>
                      <p>{market.description || 'No additional description provided.'}</p>
                    </div>
                  </div>
                </section>
              </main>

              <aside className="market-detail-aside">
                <section className="dashboard-card">
                  {isVerified ? (
                    <Link
                      to={`/fan/markets/${market.id}/trade`}
                      className="markets-cta markets-cta--primary"
                      style={{ width: '100%' }}
                    >
                      Trade This Market
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="markets-cta markets-cta--primary"
                      style={{ width: '100%' }}
                      onClick={() => setIsVerifyModalOpen(true)}
                    >
                      Verify to Trade
                    </button>
                  )}
                </section>
                {!isVerified && (
                  <section className="dashboard-card verify-card verify-card--small">
                    <span className="verify-card-icon">
                      <FiLock />
                    </span>
                    <h3>Verification required</h3>
                    <p>Complete your identity verification before placing market orders.</p>
                  </section>
                )}
              </aside>
            </div>
          )}
        </div>
        <Footer />
      </div>

      {isVerifyModalOpen && (
        <div className="verify-action-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsVerifyModalOpen(false)}>
          <div className="verify-action-modal" onClick={(event) => event.stopPropagation()}>
            <div className="verify-action-modal-header">
              <div>
                <h2>{isPending ? 'Verification pending' : 'Verify to trade'}</h2>
                <p>
                  {isPending
                    ? 'Your verification is still under review. You can access markets once your account is approved.'
                    : 'Complete identity verification to start trading and participating in prediction markets.'}
                </p>
              </div>
              <button type="button" className="verify-action-modal-close" onClick={() => setIsVerifyModalOpen(false)} aria-label="Close dialog">
                <FiX />
              </button>
            </div>
            <div className="verify-action-modal-actions">
              <button type="button" className="verify-action-modal-button verify-action-modal-button--secondary" onClick={() => setIsVerifyModalOpen(false)}>
                Close
              </button>
              <Link to={`/fan/verify?returnTo=${encodeURIComponent(`/fan/markets/${marketId ?? ''}`)}`} className="verify-action-modal-button verify-action-modal-button--primary" onClick={() => setIsVerifyModalOpen(false)}>
                {isPending ? 'View verification status' : 'Verify now'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketDetailOverview;
