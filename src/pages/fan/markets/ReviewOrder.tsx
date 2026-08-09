import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { fetchMarket, placeOrder } from '../../../services/fanMarketsServices';
import type { Market, OutcomeId } from '../../../services/fanMarketsServices';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

// This must match exactly what PlaceOrder.tsx passes via navigate(..., { state })
// — it sends `outcomeId: 'YES' | 'NO'`, not `outcome: 'Yes' | 'No'`. A field-name
// mismatch here silently falls back to a default outcome instead of erroring,
// which is why this is worth keeping in sync deliberately rather than guessing.
interface TradeReviewState {
  marketId?: string;
  outcomeId?: OutcomeId;
  price?: number;
  amount?: number;
  contracts?: number;
}

function ReviewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId: routeMarketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const order = (location.state as TradeReviewState | null) ?? {};
  const marketId = order.marketId ?? routeMarketId ?? '';
  const outcomeId: OutcomeId = order.outcomeId ?? 'YES';
  const price = order.price ?? 0;
  const amount = order.amount ?? 0;
  const contracts = order.contracts ?? (price > 0 ? amount / price : 0);

  const [market, setMarket] = useState<Market | null>(null);
  const [loadError, setLoadError] = useState('');

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

  const outcomeLabel = market?.outcomes.find((item) => item.id === outcomeId)?.label ?? outcomeId;
  const platformFee = useMemo(
    () => (market ? Math.round(amount * (market.parameters.feePct / 100)) : 0),
    [amount, market],
  );

  const goBack = () => navigate(`/fan/markets/${marketId}/trade`, { state: { outcomeId } });

  const confirmOrder = async () => {
    if (!marketId || amount <= 0) {
      setSubmitError('Missing order details — go back and re-enter your amount.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const contract = await placeOrder({
        marketId,
        outcomeId,
        quantityUgx: amount,
      });
      navigate(`/fan/markets/${marketId}/placed`, {
        state: {
          outcome: outcomeLabel,
          price: contract.price,
          amount: contract.quantityUgx,
          contracts: contract.price > 0 ? contract.quantityUgx / contract.price : 0,
          total: contract.quantityUgx,
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
                    <dt>Price per Contract (UGX)</dt>
                    <dd>{price.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Amount (UGX)</dt>
                    <dd>{amount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Contracts You Receive (est.)</dt>
                    <dd>{contracts.toFixed(2)}</dd>
                  </div>
                  {market && (
                    <div>
                      <dt>Platform Fee ({market.parameters.feePct}%, informational)</dt>
                      <dd>{platformFee.toLocaleString()}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Total Charged (UGX)</dt>
                    <dd>{amount.toLocaleString()}</dd>
                  </div>
                </dl>

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
                  disabled={isSubmitting}
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