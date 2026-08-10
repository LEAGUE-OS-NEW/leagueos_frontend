import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
// NOTE: adjust these relative imports to match wherever this page ends up
// living in src/pages/fan/... — paths below assume it sits alongside
// src/pages/fan/markets/Markets.tsx.
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { formatUgx } from '../../../utils/rules.ts';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanTradeWallet.css';
import { MARKET_FACE_VALUE_UGX } from '../../../utils/marketPricing.ts';

type PriceRange = '1H' | '6H' | '1D' | '1W' | 'ALL';

const PRICE_RANGES: PriceRange[] = ['1H', '6H', '1D', '1W', 'ALL'];

export interface PositionDetailData {
  id: string;
  marketQuestion: string;
  outcome: 'Yes' | 'No';
  contracts: number;
  averagePrice: number;
  currentPrice: number;
  // Sparkline points normalized 0-100 on both axes; swap for real price
  // history once the endpoint exists.
  priceHistory: number[];
}

// TODO: replace with a real fetch (e.g. fetchPositionById(id)) once the
// positions-by-id endpoint exists. Falls back to this sample so the page
// renders standalone.
const SAMPLE_POSITION: PositionDetailData = {
  id: 'pos_1',
  marketQuestion: 'SC Villa Clean Sheet?',
  outcome: 'Yes',
  contracts: 20,
  averagePrice: 2.1,
  currentPrice: 2.15,
  priceHistory: [40, 44, 42, 48, 46, 52, 50, 55, 53, 58, 56, 60],
};


function Sparkline({ points }: { points: number[] }) {
  const path = useMemo(() => {
    if (points.length === 0) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const stepX = 100 / (points.length - 1 || 1);
    return points
      .map((value, index) => {
        const x = index * stepX;
        const y = 100 - ((value - min) / range) * 100;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [points]);

  return (
    <svg className="price-history-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--color-open, #22c55e)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PositionDetail({ position = SAMPLE_POSITION }: { position?: PositionDetailData }) {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [range, setRange] = useState<PriceRange>('1D');

  const currentValue = position.contracts * position.currentPrice * MARKET_FACE_VALUE_UGX;
  const costBasis = position.contracts * position.averagePrice * MARKET_FACE_VALUE_UGX;
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis === 0 ? 0 : (pnl / costBasis) * 100;
  const isProfit = pnl >= 0;

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content flow-page-content">
          <button type="button" className="flow-back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>

          <section className="dashboard-card flow-card">
            <h1 className="flow-card-title">Position Details</h1>

            <div className="flow-meta-row">
              <span>Market</span>
              <b>{position.marketQuestion}</b>
            </div>

            <div className="position-detail-stats">
              <div className="position-detail-stat">
                <span>Contracts</span>
                <b>{position.contracts}</b>
              </div>
              <div className="position-detail-stat">
                <span>Average Price</span>
                <b>{position.averagePrice.toFixed(2)}</b>
              </div>
              <div className="position-detail-stat">
                <span>Current Price</span>
                <b>{position.currentPrice.toFixed(2)}</b>
              </div>
              <div className="position-detail-stat">
                <span>Current Value</span>
                <b>{formatUgx(currentValue)}</b>
              </div>
              <div className="position-detail-stat position-detail-pnl">
                <span>P&amp;L (Unrealized)</span>
                <b className={isProfit ? 'up' : 'down'}>
                  {isProfit ? '+' : ''}
                  {formatUgx(pnl).replace('UGX ', '')} UGX ({isProfit ? '+' : ''}
                  {pnlPct.toFixed(2)}%)
                </b>
              </div>
            </div>

            <div className="price-history-panel">
              <div className="price-history-heading">
                <h3>Price History</h3>
                <div className="price-history-range-tabs" role="tablist" aria-label="Price history range">
                  {PRICE_RANGES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={range === item}
                      className={range === item ? 'active' : ''}
                      onClick={() => setRange(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <Sparkline points={position.priceHistory} />
            </div>

            <div className="position-detail-actions">
              <Link to={`/fan/positions/${positionId ?? position.id}/sell`} className="buy-button buy-button--no">
                Sell Position
              </Link>
              <button type="button" className="hold-btn-outline" onClick={() => navigate(-1)}>
                Hold Position
              </button>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default PositionDetail;
