import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchMarket, fetchMarketFeePreview, fetchMarketOrderBook, placeOrder } from '../../../services/fanMarketsServices';
import type { Market, MarketFeePreview, OutcomeId } from '../../../services/fanMarketsServices';
import {
  isTradeOrderDraft,
} from './trading/tradeDraft';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

function ReviewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId: routeMarketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const order = isTradeOrderDraft(location.state)
    ? location.state
    : null;

  const marketId =
    order?.marketId ??
    routeMarketId ??
    '';

  const outcomeId: OutcomeId =
    order?.outcomeId ??
    'YES';

  const price =
    order?.price ??
    0;

  const mode =
    order?.mode ??
    'BUY_NOW';

  const limitPrice =
    order?.limitPrice ??
    0;

  const amount =
    order?.amount ??
    0;

  const contracts =
    order?.contracts ??
    0;

  const [market, setMarket] = useState<Market | null>(null);
  const [loadError, setLoadError] = useState('');
  const [feePreview, setFeePreview] = useState<MarketFeePreview | null>(null);
  const [feePreviewError, setFeePreviewError] = useState('');

  useEffect(() => {
    if (!marketId) {
      // Missing marketId is a genuine error condition to surface immediately,
      // not a value that will "settle" async — there's no fetch to wait on.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadError('No market was specified for this order.');
      return;
    }
    fetchMarket(marketId)
      .then(setMarket)
      .catch((fetchError) => {
        setLoadError(fetchError instanceof Error ? fetchError.message : 'This market could not be loaded.');
      });
  }, [marketId]);

  useEffect(() => {
    if (!market || amount <= 0 || !(limitPrice > 0 && limitPrice < 1)) return;
    let cancelled = false;
    fetchMarketFeePreview({ marketId, outcomeId, quantityUgx: amount, limitPrice })
      .then((preview) => {
        if (!cancelled) setFeePreview(preview);
      })
      .catch(() => {
        if (!cancelled) setFeePreviewError('Fee preview is unavailable. Refresh before placing this order.');
      });
    return () => { cancelled = true; };
  }, [amount, limitPrice, market, marketId, outcomeId]);

  const outcomeLabel = market?.outcomes.find((item) => item.id === outcomeId)?.label ?? outcomeId;

  const goBack = () => {
    if (!marketId) {
      navigate('/fan/markets');
      return;
    }

    navigate(
      `/fan/markets/${marketId}/trade`,
      {
        state: {
          outcomeId,
        },
      },
    );
  };

  if (!order) {
    return (
      <div className="fan-dashboard">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        <div className="fan-dashboard-main">
          <Topbar
            onMenuClick={() =>
              setIsSidebarOpen(true)
            }
          />

          <div className="fan-dashboard-content market-detail-page">
            <div
              className="market-detail-grid"
              style={{
                gridTemplateColumns: '1fr',
              }}
            >
              <main
                className="market-detail-main"
                style={{
                  maxWidth: 920,
                  width: '100%',
                  margin: '0 auto',
                }}
              >
                <section className="dashboard-card trade-ticket">
                  <h2 className="trade-ticket-heading">
                    Order draft expired
                  </h2>

                  <p>
                    Return to the trade screen and
                    review the latest market price
                    before placing your order.
                  </p>

                  <button
                    type="button"
                    className="verify-btn verify-btn--primary"
                    onClick={goBack}
                  >
                    Return to trade
                  </button>
                </section>
              </main>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    );
  }

  const confirmOrder = async () => {
    if (!marketId || amount <= 0 || !(limitPrice > 0 && limitPrice < 1)) {
      setSubmitError('Missing order details — go back and re-enter your amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const selectedOutcome = market?.outcomes.find((item) => item.id === outcomeId);
      if (!selectedOutcome) throw new Error('The selected outcome is unavailable.');
      let currentLimitPrice = limitPrice;
      if (mode === 'BUY_NOW') {
        const currentBook = await fetchMarketOrderBook(marketId, selectedOutcome.backendOutcomeId);
        if (currentBook.best_ask === null) throw new Error('No immediate sell liquidity is currently available for this outcome.');
        currentLimitPrice = Number(currentBook.best_ask);
      }
      const contract = await placeOrder({
        marketId,
        outcomeId,
        quantityUgx: amount,
        limitPrice: currentLimitPrice,
      });
      navigate(`/fan/markets/${marketId}/placed`, {
        state: {
          outcome: outcomeLabel,
          price: contract.price,
          amount: contract.quantityUgx,
          contracts: contract.price > 0 ? contract.quantityUgx / contract.price : 0,
          total: contract.quantityUgx,
          status: contract.status,
          filledAmount: contract.filledQuantityUgx,
          remainingAmount: contract.remainingQuantityUgx,
          averageFillPrice: contract.averageFillPrice,
        },
      });
    } catch (placeOrderException) {
      setSubmitError(
        placeOrderException instanceof Error ? placeOrderException.message : 'Could not place this order.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
            <main className="market-detail-main" style={{ maxWidth: 920, width: '100%', margin: '0 auto' }}>
              <section className="dashboard-card trade-ticket">
                <button type="button" className="market-back-btn trade-ticket-back" onClick={goBack}>
                  <FiArrowLeft /> Back
                </button>

                <h2 className="trade-ticket-heading">Review Your Order</h2>

                {loadError && <p className="field-error">{loadError}</p>}

                <dl className="trade-review-list">
                  <div>
                    <dt>Market</dt>
                    <dd>{market?.question ?? 'Loading…'}</dd>
                  </div>
                  <div>
                    <dt>Outcome</dt>
                    <dd>{outcomeLabel}</dd>
                  </div>
                  <div>
                    <dt>{mode === 'LIMIT_ORDER' ? 'Limit price' : 'Price per Contract (UGX)'}</dt>
                    <dd>{price.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>{mode === 'LIMIT_ORDER' ? 'Amount reserved' : 'Amount (UGX)'}</dt>
                    <dd>{amount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Contracts You Receive (est.)</dt>
                    <dd>{contracts.toFixed(2)}</dd>
                  </div>
                  {market && feePreview && (
                    <div>
                      <dt>Estimated fee ({(feePreview.effectiveFeeBps / 100).toFixed(2)}%)</dt>
                      <dd>{feePreview.currency} {Number(feePreview.estimatedFee).toLocaleString()}</dd>
                    </div>
                  )}
                  {feePreviewError && <div><dt>Estimated fee</dt><dd>Unavailable</dd></div>}
                  <div>
                    <dt>Total Charged (UGX)</dt>
                    <dd>{feePreview ? Number(feePreview.estimatedTotalDebit).toLocaleString() : 'Calculating…'}</dd>
                  </div>
                </dl>
                {mode === 'LIMIT_ORDER' && <><p>Your order may rest on the order book until matched.</p><p>Status may be OPEN, PARTIALLY_FILLED, or FILLED.</p></>}

                <p className="verify-age-hint">
                  By placing this order, you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noreferrer">
                    Terms &amp; Conditions
                  </a>
                  .
                </p>

                {submitError && <p className="field-error">{submitError}</p>}

                <button
                  type="button"
                  className="verify-btn verify-btn--primary"
                  disabled={isSubmitting || !feePreview}
                  onClick={() => void confirmOrder()}
                >
                  {isSubmitting ? 'Placing Order\u2026' : 'Confirm & Place Order'}
                </button>
              </section>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default ReviewOrder;
