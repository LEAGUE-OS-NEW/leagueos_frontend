import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import {
  fetchOrderBook,
  type OrderBook,
} from '../../services/marketAdminService';
import {
  fetchMarket as fetchPublicMarket,
  fetchFanPositions,
  fetchMarketOrderBook,
  placeOrder,
  type Market,
  type OutcomeId,
  type Position,
} from '../../services/fanMarketsServices';
import { normalizedPriceToUgxSharePrice } from '../../utils/marketPricing.ts';
import { useMarketEligibility } from '../../hooks/useMarketEligibility';
import './MarketDetailPage.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

function getInitialOutcome(searchParams: URLSearchParams): OutcomeId {
  return searchParams.get('outcome') === 'NO' ? 'NO' : 'YES';
}

function outcomeDisplayPrice(
  outcome: Market['outcomes'][number],
): string {
  const price =
    outcome.bestAsk ??
    outcome.price ??
    outcome.openingReference ??
    null;

  return price === null
    ? 'Price unavailable'
    : `${formatUgx(price)}/share`;
}

function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isEligible: isIdentityVerified } = useMarketEligibility();

  const [market, setMarket] = useState<Market | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [myPositions, setMyPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeId>(() => getInitialOutcome(searchParams));
  const [amount, setAmount] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [bestAsk, setBestAsk] = useState<number | null>(null);

  useEffect(() => {
    if (!marketId) return;

    let cancelled = false;

    fetchPublicMarket(marketId)
      .then(async (marketResult) => {
        if (cancelled) return;

        setMarket(marketResult);
        setLoadError(null);

        const optionalRequests = await Promise.allSettled([
          fetchOrderBook(marketId),
          isIdentityVerified
            ? fetchFanPositions()
            : Promise.resolve([] as Position[]),
        ]);

        if (cancelled) return;

        const [bookResult, positionsResult] =
          optionalRequests;

        if (bookResult.status === 'fulfilled') {
          setOrderBook(bookResult.value);
        } else {
          setOrderBook(null);
        }

        if (positionsResult.status === 'fulfilled') {
          setMyPositions(
            positionsResult.value.filter(
              (position: Position) =>
                position.market.id === marketId,
            ),
          );
        } else {
          setMyPositions([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            'Could not load this market. Please try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [marketId, isIdentityVerified]);

  useEffect(() => {
    const outcome = market?.outcomes.find((item) => item.id === selectedOutcome);
    if (!market || !outcome?.backendOutcomeId) return;
    let cancelled = false;
    // Clear the previous outcome's quote while this outcome is fetched.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBestAsk(null);
    fetchMarketOrderBook(market.id, outcome.backendOutcomeId)
      .then((book) => { if (!cancelled) setBestAsk(book.best_ask === null ? null : Number(book.best_ask)); })
      .catch(() => { if (!cancelled) setBestAsk(null); });
    return () => { cancelled = true; };
  }, [market, selectedOutcome]);

  const handlePlaceOrder = async () => {
    if (!market) return;
    const quantityUgx = Number(amount);
    if (!quantityUgx || quantityUgx <= 0) {
      setOrderError('Enter an amount to trade.');
      return;
    }
    setOrderError(null);
    try {
      if (bestAsk === null) { setOrderError('No sell liquidity is currently available for this outcome.'); return; }
      await placeOrder({ marketId: market.id, outcomeId: selectedOutcome, quantityUgx, limitPrice: bestAsk });
      const positions = await fetchFanPositions();
      setMyPositions(positions.filter((position) => position.market.id === market.id));
      setOrderSuccess(true);
      setAmount('');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not place this order.');
    }
  };

  if (isLoading) {
    return (
      <div className="pmd-page">
        <Navbar />
        <main className="pmd-main">
          <p className="pmd-loading">Loading market…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError || !market || market.status === 'Draft') {
    return (
      <div className="pmd-page">
        <Navbar />
        <main className="pmd-main">
          <div className="pmd-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? 'This market is not available.'}</span>
          </div>
          <Link to="/markets" className="pmd-back">
            <FiArrowLeft /> Back to Markets
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const yesOutcome = market.outcomes.find((outcome) => outcome.id === 'YES')!;
  const noOutcome = market.outcomes.find((outcome) => outcome.id === 'NO')!;
  const selected = market.outcomes.find((outcome) => outcome.id === selectedOutcome)!;
  const isTradingOpen = market.status === 'Live';
  const isResolved = market.status === 'Resolved';
  const isCancelled = market.status === 'Cancelled' || market.status === 'Voided';
  const selectedPrice = bestAsk === null ? null : normalizedPriceToUgxSharePrice(bestAsk, market.faceValueUgx);
  const estimatedShares = selectedPrice && Number(amount) > 0 ? Number(amount) / selectedPrice : 0;

  return (
    <div className="pmd-page">
      <Navbar />
      <main className="pmd-main">
        <button type="button" className="pmd-back" onClick={() => navigate('/markets')}>
          <FiArrowLeft /> Back to Markets
        </button>

        <div className="pmd-head">
          <span className={`pmd-status-pill pmd-status-pill--${market.status.toLowerCase()}`}>{market.status}</span>
          <h1>{market.eventLabel}</h1>
          <p className="pmd-question">{market.question}</p>
          <p className="pmd-meta">
            {market.category} &middot; {market.competition} &middot; {market.venue} &middot; Kickoff{' '}
            {formatDateTime(market.kickoff)}
          </p>
        </div>

        {market.description && <p className="pmd-description">{market.description}</p>}

        <div className="pmd-outcomes">
          <div className="pmd-outcome-card pmd-outcome-card--yes">
            <span className="pmd-outcome-card__label">{yesOutcome.label}</span>
            <span className="pmd-outcome-card__price">{outcomeDisplayPrice(yesOutcome)}</span>
            <span className="pmd-outcome-card__pct">Not traded yet</span>
          </div>
          <div className="pmd-outcome-card pmd-outcome-card--no">
            <span className="pmd-outcome-card__label">{noOutcome.label}</span>
            <span className="pmd-outcome-card__price">{outcomeDisplayPrice(noOutcome)}</span>
            <span className="pmd-outcome-card__pct">Not traded yet</span>
          </div>
        </div>

        {isResolved && (
          <div className="pmd-notice pmd-notice--resolved">
            <FiCheckCircle aria-hidden="true" />
            <span>
              Resolved — {market.outcomes.find((outcome) => outcome.id === market.winningOutcomeId)?.label ?? 'Voided'}{' '}
              won.
            </span>
          </div>
        )}
        {isCancelled && (
          <div className="pmd-notice pmd-notice--cancelled">
            <FiAlertTriangle aria-hidden="true" />
            <span>This market was cancelled — no payouts are made.</span>
          </div>
        )}

        {isIdentityVerified && myPositions.length > 0 && (
          <div className="pmd-panel">
            <h2>Your Position</h2>
            {myPositions.map((position) => (
              <div className="pmd-position-row" key={position.contract.id}>
                <span>
                  {position.contract.outcomeId} &middot; staked {formatUgx(position.contract.quantityUgx)}
                </span>
                <span>
                  {position.contract.status === 'Open'
                    ? 'Open'
                    : `Settled — ${formatUgx(position.contract.payoutUgx ?? 0)}`}
                </span>
              </div>
            ))}
            <Link to="/positions" className="pmd-positions-link">
              Track all your positions
            </Link>
          </div>
        )}

        {isTradingOpen && !isIdentityVerified && (
          <div className="pmd-panel">
            <h2>Place an Order</h2>
            <div className="pmd-notice pmd-notice--upcoming">
              <span>
                Verify your identity to trade on this market.{' '}
                <Link to="/fan/verify" className="pmd-positions-link">
                  Verify now
                </Link>
              </span>
            </div>
          </div>
        )}

        {isTradingOpen && isIdentityVerified && (
          <div className="pmd-panel">
            <h2>Place an Order</h2>
            {orderError && (
              <div className="pmd-error-banner">
                <FiAlertTriangle aria-hidden="true" />
                <span>{orderError}</span>
              </div>
            )}
            {orderSuccess && (
              <div className="pmd-notice pmd-notice--resolved">
                <FiCheckCircle aria-hidden="true" />
                <span>Order matched — track it under Your Position or My Positions.</span>
              </div>
            )}
            <div className="pmd-outcome-picker">
              <button
                type="button"
                className={`pmd-outcome-choice pmd-outcome-choice--yes${selectedOutcome === 'YES' ? ' is-selected' : ''}`}
                onClick={() => setSelectedOutcome('YES')}
              >
                {yesOutcome.label}
              </button>
              <button
                type="button"
                className={`pmd-outcome-choice pmd-outcome-choice--no${selectedOutcome === 'NO' ? ' is-selected' : ''}`}
                onClick={() => setSelectedOutcome('NO')}
              >
                {noOutcome.label}
              </button>
            </div>
            <label className="pmd-field">
              <span>Amount (UGX)</span>
              <input
                type="number"
                min={market.parameters.minTradeUgx}
                max={market.parameters.maxTradeUgx}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={`${market.parameters.minTradeUgx.toLocaleString()} - ${market.parameters.maxTradeUgx.toLocaleString()}`}
              />
            </label>
            {estimatedShares > 0 && (
              <p className="pmd-estimate">
                &asymp; {estimatedShares.toFixed(2)} shares &middot; pays {formatUgx(estimatedShares * 10_000)} if{' '}
                {selected.label} wins, UGX 0 if not.
              </p>
            )}
            {bestAsk === null && <p>No sell liquidity is currently available for this outcome.</p>}
            <button type="button" className="pmd-btn pmd-btn--gradient" disabled={bestAsk === null} onClick={handlePlaceOrder}>
              {bestAsk === null ? 'No sell liquidity' : `Buy at ${formatUgx(selectedPrice ?? 0)}/share`}
            </button>
          </div>
        )}

        {market.status === 'Upcoming' && (
          <div className="pmd-notice pmd-notice--upcoming">
            <span>Trading opens {formatDateTime(market.parameters.opensAt)}.</span>
          </div>
        )}

        {orderBook && isTradingOpen && (
          <div className="pmd-panel">
            <h2>Order Book</h2>
            {orderBook.bids.length === 0 && orderBook.asks.length === 0 && <p>No orders yet.</p>}
            <div className="pmd-orderbook-grid">
              <div>
                <h4 className="pmd-orderbook-col__title pmd-orderbook-col__title--bid">Bids</h4>
                {orderBook.bids.map((level, index) => (
                  <div className="pmd-orderbook-row pmd-orderbook-row--bid" key={`bid-${index}`}>
                    <span>{formatUgx(level.price)}</span>
                    <span>{level.shares.toLocaleString()} shares</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="pmd-orderbook-col__title pmd-orderbook-col__title--ask">Asks</h4>
                {orderBook.asks.map((level, index) => (
                  <div className="pmd-orderbook-row pmd-orderbook-row--ask" key={`ask-${index}`}>
                    <span>{formatUgx(level.price)}</span>
                    <span>{level.shares.toLocaleString()} shares</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default MarketDetailPage;
