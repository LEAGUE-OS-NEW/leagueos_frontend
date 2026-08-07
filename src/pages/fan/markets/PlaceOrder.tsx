import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiTrendingUp } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

type TradeSide = 'buy' | 'sell';
type Outcome = 'Yes' | 'No';

const PRESET_AMOUNTS = [10_000, 20_000, 50_000, 100_000];
const PLATFORM_FEE_RATE = 0.02;

// NOTE: replace with a real fetch keyed on marketId once the service exists.
const MARKET_SUMMARY = {
  id: 'sc-villa-clean-sheet',
  question: 'Can SC Villa get a clean sheet?',
  yesPrice: 2.15,
  yesChangePct: 12.4,
  noPrice: 1.85,
  noChangePct: -12.1,
  availableBalance: 125_000,
};

function formatUgx(value: number) {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

interface TradeNavState {
  side?: TradeSide;
  outcome?: Outcome;
}

function PlaceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const navState = (location.state as TradeNavState | null) ?? {};
  const [tradeSide, setTradeSide] = useState<TradeSide>(navState.side ?? 'buy');
  const [outcome] = useState<Outcome>(navState.outcome ?? 'Yes');
  const [amount, setAmount] = useState('');

  const price = outcome === 'Yes' ? MARKET_SUMMARY.yesPrice : MARKET_SUMMARY.noPrice;
  const changePct = outcome === 'Yes' ? MARKET_SUMMARY.yesChangePct : MARKET_SUMMARY.noChangePct;

  const numericAmount = Number(amount) || 0;
  const contracts = useMemo(() => (numericAmount > 0 ? numericAmount / price : 0), [numericAmount, price]);
  const potentialReturn = useMemo(() => (numericAmount > 0 ? contracts * price : 0), [contracts, price, numericAmount]);

  const canReview = numericAmount > 0 && numericAmount <= MARKET_SUMMARY.availableBalance;

  const goToReview = () => {
    if (!canReview) return;
    navigate(`/fan/markets/${marketId ?? MARKET_SUMMARY.id}/review`, {
      state: {
        outcome,
        side: tradeSide,
        price,
        amount: numericAmount,
        contracts,
        feeRate: PLATFORM_FEE_RATE,
      },
    });
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
                <button
                  type="button"
                  className="market-back-btn trade-ticket-back"
                  onClick={() => navigate(`/fan/markets/${marketId ?? MARKET_SUMMARY.id}`)}
                >
                  <FiArrowLeft /> Back
                </button>

                <h2 className="trade-ticket-question">{MARKET_SUMMARY.question}</h2>

                <div className="trade-tabs" role="tablist" aria-label="Trade side">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tradeSide === 'buy'}
                    className={tradeSide === 'buy' ? 'active' : ''}
                    onClick={() => setTradeSide('buy')}
                  >
                    Buy {outcome}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tradeSide === 'sell'}
                    className={tradeSide === 'sell' ? 'active' : ''}
                    onClick={() => setTradeSide('sell')}
                  >
                    Sell {outcome === 'Yes' ? 'No' : 'Yes'}
                  </button>
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>Current {outcome} Price</span>
                    <b>
                      UGX {price.toFixed(2)}{' '}
                      <FiTrendingUp className={changePct >= 0 ? 'up' : 'down'} />{' '}
                      <span className={changePct >= 0 ? 'up' : 'down'}>{changePct.toFixed(1)}%</span>
                    </b>
                  </div>
                </div>

                <label className="trade-amount-label" htmlFor="place-order-amount">
                  Amount (UGX)
                </label>
                <input
                  id="place-order-amount"
                  type="number"
                  min="0"
                  placeholder="Enter amount"
                  className="trade-amount-input"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />

                <div className="preset-chips">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button key={preset} type="button" onClick={() => setAmount(String(preset))}>
                      +{preset >= 1000 ? `${preset / 1000}K` : preset}
                    </button>
                  ))}
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>You will receive (est.)</span>
                    <b>{contracts.toFixed(2)} Contracts</b>
                  </div>
                  <div>
                    <span>Potential Return (if {outcome} Wins)</span>
                    <b>{formatUgx(potentialReturn)}</b>
                  </div>
                </div>

                <button
                  type="button"
                  className="verify-btn verify-btn--primary"
                  disabled={!canReview}
                  onClick={goToReview}
                >
                  Review Order
                </button>

                <div className="trade-ticket-balance-row">
                  <div>
                    <span>Available Balance</span>
                    <b>{formatUgx(MARKET_SUMMARY.availableBalance)}</b>
                  </div>
                  <button type="button" className="add-funds-link">
                    Add Funds
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

export default PlaceOrder;