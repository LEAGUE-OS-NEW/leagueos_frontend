import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

interface OrderPlacedState {
  outcome?: string;
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
          <div className="market-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
            <main className="market-detail-main" style={{ maxWidth: 920, width: '100%', margin: '0 auto' }}>
              <section className="dashboard-card order-placed">
                <span className="order-placed-icon">
                  <FiCheck />
                </span>

                <h3>Order Placed Successfully</h3>
                <p>Your order has been recorded and will appear in your positions shortly.</p>

                <dl className="order-placed-summary">
                  <div>
                    <dt>Outcome</dt>
                    <dd>{outcome}</dd>
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
                    <dt>Contracts</dt>
                    <dd>{contracts.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Total (UGX)</dt>
                    <dd>{total.toLocaleString()}</dd>
                  </div>
                </dl>

                <div className="order-placed-actions">
                  <Link
                    to="/positions"
                    className="verify-action-modal-button verify-action-modal-button--secondary"
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    View My Positions
                  </Link>
                  <button
                    type="button"
                    className="verify-action-modal-button verify-action-modal-button--primary"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/fan/markets/${marketId}`)}
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