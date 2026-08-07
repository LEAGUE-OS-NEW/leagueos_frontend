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
import './Markets.css';
import './FanMarketDetail.css';

type ChartRange = '1H' | '6H' | '1D' | '1W' | 'ALL';

const CHART_RANGES: ChartRange[] = ['1H', '6H', '1D', '1W', 'ALL'];

interface PricePoint {
  timeLabel: string;
  yes: number;
  no: number;
}

interface OrderBookRow {
  price: number;
  contracts: number;
}

// NOTE: replace with a real fetch (market summary + price history + order
// book) keyed on marketId once those endpoints exist.
const MARKET_SUMMARY = {
  question: 'Can SC Villa get a clean sheet?',
  yesPrice: 2.15,
  noPrice: 1.85,
};

const PRICE_HISTORY: PricePoint[] = [
  { timeLabel: '12:00', yes: 1.7, no: 2.3 },
  { timeLabel: '15:00', yes: 1.85, no: 2.15 },
  { timeLabel: '18:00', yes: 1.75, no: 2.25 },
  { timeLabel: '21:00', yes: 1.95, no: 2.05 },
  { timeLabel: '00:00', yes: 1.9, no: 2.1 },
  { timeLabel: '03:00', yes: 2.0, no: 2.0 },
  { timeLabel: '06:00', yes: 2.15, no: 1.85 },
  { timeLabel: '09:00', yes: 2.15, no: 1.85 },
];

const BUY_YES_BOOK: OrderBookRow[] = [
  { price: 2.15, contracts: 1250 },
  { price: 2.14, contracts: 1860 },
  { price: 2.13, contracts: 2300 },
  { price: 2.12, contracts: 1920 },
  { price: 2.11, contracts: 3100 },
];

const SELL_NO_BOOK: OrderBookRow[] = [
  { price: 1.85, contracts: 1200 },
  { price: 1.86, contracts: 2050 },
  { price: 1.87, contracts: 1750 },
  { price: 1.88, contracts: 2600 },
  { price: 1.89, contracts: 1960 },
];

function buildSparklinePath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1 || 1);
  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function MarketDetailChart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [range, setRange] = useState<ChartRange>('1D');

  const initialTab = (location.state as { initialTab?: string } | null)?.initialTab;
  const [activePanel, setActivePanel] = useState<'chart' | 'orderbook'>(
    initialTab === 'orderbook' ? 'orderbook' : 'chart',
  );

  const width = 640;
  const height = 180;
  const padding = 12;

  const yesPath = useMemo(
    () => buildSparklinePath(PRICE_HISTORY.map((p) => p.yes), width, height, padding),
    [],
  );
  const noPath = useMemo(
    () => buildSparklinePath(PRICE_HISTORY.map((p) => p.no), width, height, padding),
    [],
  );

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card market-detail-card">

                <div className="market-detail-topline">
                  <button
                    type="button"
                    className="market-back-btn"
                    onClick={() => navigate(marketId ? `/fan/markets/${marketId}` : '/fan/markets')}
                  >
                    <FiArrowLeft /> Back
                  </button>
                </div>

                <div className="market-detail-subtabs" role="tablist" aria-label="Chart or order book">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePanel === 'chart'}
                    className={activePanel === 'chart' ? 'active' : ''}
                    onClick={() => setActivePanel('chart')}
                  >
                    Chart
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePanel === 'orderbook'}
                    className={activePanel === 'orderbook' ? 'active' : ''}
                    onClick={() => setActivePanel('orderbook')}
                  >
                    Order Book
                  </button>
                </div>

                <h3 className="market-details-question">{MARKET_SUMMARY.question}</h3>

                {activePanel === 'chart' ? (
                  <div className="market-detail-panel">
                    <div className="chart-range-tabs" role="tablist" aria-label="Chart range">
                      {CHART_RANGES.map((item) => (
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

                    <div className="market-detail-stat-row">
                      <div>
                        <span>Yes</span>
                        <b className="up">{MARKET_SUMMARY.yesPrice.toFixed(2)}</b>
                      </div>
                      <div>
                        <span>No</span>
                        <b className="down">{MARKET_SUMMARY.noPrice.toFixed(2)}</b>
                      </div>
                    </div>

                    <div className="price-sparkline-wrap">
                      <svg className="price-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                        <path d={yesPath} fill="none" stroke="var(--color-open, #22c55e)" strokeWidth={2} />
                        <path d={noPath} fill="none" stroke="var(--color-danger, #ef4444)" strokeWidth={2} />
                      </svg>
                      <div className="market-detail-stat-row">
                        {PRICE_HISTORY.map((point) => (
                          <span key={point.timeLabel}>{point.timeLabel}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="market-detail-panel">
                    <div className="market-detail-stat-row">
                      <div>
                        <span>Buy Yes</span>
                      </div>
                      <div>
                        <span>Sell No</span>
                      </div>
                    </div>
                    <div className="orderbook-table">
                      {BUY_YES_BOOK.map((row, index) => (
                        <div className="orderbook-row" key={`book-${row.price}`}>
                          <span className="up">{row.price.toFixed(2)}</span>
                          <span>{row.contracts.toLocaleString()}</span>
                          <span className="down">{SELL_NO_BOOK[index]?.price.toFixed(2)}</span>
                          <span>{SELL_NO_BOOK[index]?.contracts.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </main>

            <aside className="market-detail-aside">
              <section className="dashboard-card">

               <button
                  type="button"
                  className="markets-cta markets-cta--primary"
                  style={{ width: '100%' }}
                  onClick={() => navigate(marketId ? `/fan/markets/${marketId}/trade` : '/fan/markets')}
                >
                  Trade This Market
                </button>
              </section>
            </aside>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default MarketDetailChart;