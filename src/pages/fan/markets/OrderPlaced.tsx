import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
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

interface OrderPlacedState {
  outcome?: 'Yes' | 'No';
  side?: 'buy' | 'sell';
  price?: number;
  amount?: number;
  contracts?: number;
  total?: number;
}

function OrderPlaced() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const order = (location.state as OrderPlacedState | null) ?? {};
  const outcome = order.outcome ?? 'Yes';
  const side = order.side ?? 'buy';
  const price = order.price ?? 0;
  const amount = order.amount ?? 0;
  const contracts = order.contracts ?? 0;
  const total = order.total ?? amount;

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card order-placed">
                <span className="order-placed-icon">
                  <FiCheckCircle />
                </span>
                <h3>Order Placed Successfully!</h3>
                <p>
                  Your order to {side === 'buy' ? 'Buy' : 'Sell'} {outcome} has been placed.
                </p>

                <dl className="order-placed-summary">
                  <div>
                    <dt>Market</dt>
                    <dd>{MARKET_SUMMARY.name}</dd>
                  </div>
                  <div>
                    <dt>Outcome</dt>
                    <dd>{outcome}</dd>
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
                    <dt>Contracts Received</dt>
                    <dd>{contracts.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Total Paid (UGX)</dt>
                    <dd>{total.toLocaleString()}</dd>
                  </div>
                </dl>

                <div className="order-placed-actions">
                  <button type="button" className="verify-btn verify-btn--primary" onClick={() => navigate('/positions')}>
                    View My Positions
                  </button>
                  <button
                    type="button"
                    className="verify-btn verify-btn--secondary"
                    onClick={() => navigate(`/fan/markets/${marketId ?? MARKET_SUMMARY.id}`)}
                  >
                    Back to Market
                  </button>
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

export default OrderPlaced;