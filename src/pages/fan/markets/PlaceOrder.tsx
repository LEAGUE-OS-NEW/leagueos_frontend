import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useMarketEligibility } from '../../../hooks/useMarketEligibility';
import { formatUgx } from '../../../utils/rules.ts';
import {
  formatMarketSharePrice,
  normalizedPriceToUgxSharePrice,
} from '../../../utils/marketPricing.ts';
import { fetchMarket, fetchMarketOrderBook } from '../../../services/fanMarketsServices';
import type { Market, OutcomeId } from '../../../services/fanMarketsServices';
import {
  isTradeEntryState,
  type TradeOrderDraft,
} from './trading/tradeDraft';
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

function PlaceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const { isEligible, isLoading: isEligibilityLoading } = useMarketEligibility();

  const navState = isTradeEntryState(location.state)
    ? location.state
    : {};

  useEffect(() => {
    if (!isEligibilityLoading && !isEligible) {
      navigate(`/fan/verify?returnTo=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
    }
  }, [isEligibilityLoading, isEligible, location.pathname, location.search, navigate]);

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bestAsk, setBestAsk] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    // marketId can change between market trade pages, so loading/error need
    // to reset synchronously here to avoid flashing stale state from the
    // previous market before the new fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setLoadError('');
    fetchMarket(marketId)
      .then((result) => {
        if (!cancelled) setMarket(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setLoadError(fetchError instanceof Error ? fetchError.message : 'Market not found.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  const [outcomeId, setOutcomeId] = useState<OutcomeId>(navState.outcomeId ?? 'YES');
  const [amount, setAmount] = useState(
    navState.amount
      ? String(navState.amount)
      : '',
  );
  const [amountError, setAmountError] = useState('');
  const [orderMode, setOrderMode] = useState<'BUY_NOW' | 'LIMIT_ORDER'>('BUY_NOW');
  const [limitPriceUgx, setLimitPriceUgx] = useState('');

  const outcome = market?.outcomes.find((item) => item.id === outcomeId);
  useEffect(() => {
    if (!market || !outcome) return;
    let cancelled = false;
    // Reset the selected outcome's quote before the asynchronous request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuoteLoading(true);
    setBestAsk(null);
    fetchMarketOrderBook(market.id, outcome.backendOutcomeId)
      .then((book) => { if (!cancelled) setBestAsk(book.best_ask === null ? null : Number(book.best_ask)); })
      .catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load the order book.'); })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [market, outcome]);
  const price = bestAsk === null || !market ? 0 : normalizedPriceToUgxSharePrice(bestAsk, market.faceValueUgx);
  const numericLimitPriceUgx = Number(limitPriceUgx);
  const normalizedLimitPrice = market && numericLimitPriceUgx > 0 ? numericLimitPriceUgx / market.faceValueUgx : 0;
  const effectivePrice = orderMode === 'BUY_NOW' ? price : numericLimitPriceUgx;
  const numericAmount = Number(amount);

  const amountValidationMessage = useMemo(() => {
    if (!amount || !market) return '';
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return 'Enter a valid positive amount.';
    }
    if (numericAmount < market.parameters.minTradeUgx) {
      return `Minimum trade is ${formatUgx(market.parameters.minTradeUgx)}.`;
    }
    if (numericAmount > market.parameters.maxTradeUgx) {
      return `Maximum trade is ${formatUgx(market.parameters.maxTradeUgx)}.`;
    }
    return '';
  }, [amount, numericAmount, market]);

  const contracts = useMemo(() => (numericAmount > 0 && effectivePrice > 0 ? numericAmount / effectivePrice : 0), [numericAmount, effectivePrice]);
  const potentialReturn = useMemo(() => contracts * (market?.faceValueUgx ?? 0), [contracts, market]);

  const validLimitPrice = normalizedLimitPrice > 0 && normalizedLimitPrice < 1;
  const canReview =
    market?.status === 'Live' &&
    numericAmount > 0 &&
    !amountValidationMessage &&
    (
      orderMode === 'BUY_NOW'
        ? bestAsk !== null
        : validLimitPrice
    );
  const presetAmounts = market
    ? [market.parameters.minTradeUgx, market.parameters.minTradeUgx * 5, market.parameters.minTradeUgx * 20, market.parameters.maxTradeUgx].filter(
        (value, index, all) => all.indexOf(value) === index,
      )
    : [];

  const goToReview = () => {
    if (!market) return;
    if (amountValidationMessage) {
      setAmountError(amountValidationMessage);
      return;
    }
    if (!canReview) {
      setAmountError('Enter a valid amount before reviewing your order.');
      return;
    }
    const draft: TradeOrderDraft = {
      marketId: market.id,
      outcomeId,
      mode: orderMode,
      price: effectivePrice,
      limitPrice:
        orderMode === 'BUY_NOW'
          ? bestAsk!
          : normalizedLimitPrice,
      amount: numericAmount,
      contracts,
    };

    navigate(
      `/fan/markets/${market.id}/review`,
      {
        state: draft,
      },
    );
  };

  if (isLoading) {
    return (
      <div className="fan-dashboard">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="fan-dashboard-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="fan-dashboard-content market-detail-page">
            <DashboardSkeleton rows={5} />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (loadError || !market || !outcome) {
    return (
      <div className="fan-dashboard">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="fan-dashboard-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="fan-dashboard-content market-detail-page">
            <DashboardNotice
              tone="error"
              title="Couldn't load this market"
              message={loadError || 'This market may have been removed.'}
              actionLabel="Back to Markets"
              actionTo="/fan/trade"
            />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card trade-ticket">
                <button
                  type="button"
                  className="market-back-btn trade-ticket-back"
                  onClick={() => navigate(`/fan/markets/${market.id}`)}
                >
                  <FiArrowLeft /> Back
                </button>

                <h2 className="trade-ticket-question">{market.question}</h2>

                <div className="trade-tabs" role="tablist" aria-label="Order type">
                  <button type="button" role="tab" aria-selected={orderMode === 'BUY_NOW'} className={orderMode === 'BUY_NOW' ? 'active' : ''} onClick={() => setOrderMode('BUY_NOW')}>Buy Now</button>
                  <button type="button" role="tab" aria-selected={orderMode === 'LIMIT_ORDER'} className={orderMode === 'LIMIT_ORDER' ? 'active' : ''} onClick={() => { setOrderMode('LIMIT_ORDER'); if (!limitPriceUgx && outcome?.openingReference) setLimitPriceUgx(String(outcome.openingReference)); }}>Limit Order</button>
                </div>

                <div className="trade-tabs" role="tablist" aria-label="Outcome">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={outcomeId === 'YES'}
                    className={outcomeId === 'YES' ? 'active' : ''}
                    onClick={() => setOutcomeId('YES')}
                  >
                    Buy Yes
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={outcomeId === 'NO'}
                    className={outcomeId === 'NO' ? 'active' : ''}
                    onClick={() => setOutcomeId('NO')}
                  >
                    Buy No
                  </button>
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>{orderMode === 'BUY_NOW' ? 'Current executable price' : 'Opening reference'}</span>
                    <b>
                      {orderMode === 'BUY_NOW' ? (quoteLoading ? 'Loading quote…' : bestAsk === null ? 'No sell liquidity' : formatMarketSharePrice(price)) : (outcome.openingReference === null ? 'Not configured' : formatMarketSharePrice(outcome.openingReference))}
                    </b>
                  </div>
                </div>

                <label className="trade-amount-label" htmlFor="place-order-amount">
                  Amount (UGX) <span className="required-star">*</span>
                </label>
                <input
                  id="place-order-amount"
                  type="number"
                  min="0"
                  placeholder="Enter amount"
                  className="trade-amount-input"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setAmountError('');
                  }}
                />
                {amountError && <p className="field-error">{amountError}</p>}
                {orderMode === 'BUY_NOW' && !quoteLoading && bestAsk === null && <p className="field-error">No immediate sell liquidity is currently available for this outcome.</p>}
                {orderMode === 'LIMIT_ORDER' && <><label className="trade-amount-label" htmlFor="limit-price">Desired price per share (UGX)</label><input id="limit-price" aria-label="Desired price per share (UGX)" className="trade-amount-input" type="number" min="1" max={market.faceValueUgx - 1} value={limitPriceUgx} onChange={(event) => setLimitPriceUgx(event.target.value)} />{limitPriceUgx && !validLimitPrice && <p className="field-error">Limit price must be greater than UGX 0 and less than the winning share value.</p>}<p>Your order may rest on the order book until matched.</p><p>A compatible order on the opposite outcome may create a new fully collateralized YES/NO complete set.</p></>}
                {!amountError && amountValidationMessage && <p className="field-error">{amountValidationMessage}</p>}

                <div className="preset-chips">
                  {presetAmounts.map((preset) => (
                    <button key={preset} type="button" onClick={() => setAmount(String(preset))}>
                      {preset >= 1000 ? `${preset / 1000}K` : preset}
                    </button>
                  ))}
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>You will receive (est.)</span>
                    <b>{contracts.toFixed(2)} Contracts</b>
                  </div>
                  <div>
                    <span>Potential Return (if {outcome.label} Wins)</span>
                    <b>{formatUgx(potentialReturn)}</b>
                  </div>
                </div>

                {market.status === 'Closed' && (
                  <p className="field-error">
                    Trading has closed for this market.
                  </p>
                )}

                {market.status === 'Upcoming' && (
                  <p>
                    Trading has not opened for this market yet.
                  </p>
                )}

                <button type="button" className="verify-btn verify-btn--primary" disabled={!canReview} onClick={goToReview}>
                  Review Order
                </button>

                <div className="trade-ticket-balance-row">
                  <div>
                    <span>Trade Limits</span>
                    <b>
                      {formatUgx(market.parameters.minTradeUgx)} &ndash; {formatUgx(market.parameters.maxTradeUgx)}
                    </b>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default PlaceOrder;
