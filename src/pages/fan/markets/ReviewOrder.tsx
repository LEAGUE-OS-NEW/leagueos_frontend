import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

// NOTE: replace with a real fetch keyed on marketId once the service exists.
const MARKET_SUMMARY = {
  id: 'sc-villa-clean-sheet',
  name: 'SC Villa Clean Sheet?',
};

interface TradeReviewState {
  outcome?: 'Yes' | 'No';
  side?: 'buy' | 'sell';
  price?: number;
  amount?: number;
  contracts?: number;
  feeRate?: number;
}

function ReviewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const order = (location.state as TradeReviewState | null) ?? {};
  const outcome = order.outcome ?? 'Yes';
  const side = order.side ?? 'buy';
  const price = order.price ?? 0;
  const amount = order.amount ?? 0;
  const contracts = order.contracts ?? 0;
  const feeRate = order.feeRate ?? 0.02;

  const platformFee = useMemo(() => Math.round(amount * feeRate), [amount, feeRate]);
  const total = amount + platformFee;

  const goBack = () => navigate(`/fan/markets/${marketId ?? MARKET_SUMMARY.id}/trade`, { state: { side, outcome } });

  const confirmOrder = () => {
    setIsSubmitting(true);
    // NOTE: wire this up to the real order-placement endpoint. Simulated
    // here so the flow can be reviewed end to end without a backend.
    window.setTimeout(() => {
      navigate(`/fan/markets/${marketId ?? MARKET_SUMMARY.id}/placed`, {
        state: { outcome, side, price, amount, contracts, platformFee, total },
      });
    }, 400);
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card trade-ticket">
                <button type="button" className="market-back-btn trade-ticket-back" onClick={goBack}>
                  <FiArrowLeft /> Back
                </button>

                <h2 className="trade-ticket-heading">Review Your Order</h2>

                <dl className="trade-review-list">
                  <div>
                    <dt>Market</dt>
                    <dd>{MARKET_SUMMARY.name}</dd>
                  </div>
                  <div>
                    <dt>Outcome</dt>
                    <dd>{outcome}</dd>
                  </div>
                  <div>
                    <dt>Order Type</dt>
                    <dd>{side === 'buy' ? 'Buy' : 'Sell'}</dd>
                  </div>
                  <div>
                    <dt>Price (UGX)</dt>
                    <dd>{price.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Amount (UGX)</dt>
                    <dd>{amount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Contracts You Receive</dt>
                    <dd>{contracts.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Total Cost (UGX)</dt>
                    <dd>{amount.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Platform Fee ({Math.round(feeRate * 100)}%)</dt>
                    <dd>{platformFee.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Total (UGX)</dt>
                    <dd>{total.toLocaleString()}</dd>
                  </div>
                </dl>

                <p className="verify-age-hint">
                  By placing this order, you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noreferrer">
                    Terms &amp; Conditions
                  </a>
                  .
                </p>

                <button
                  type="button"
                  className="verify-btn verify-btn--primary"
                  disabled={isSubmitting}
                  onClick={confirmOrder}
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