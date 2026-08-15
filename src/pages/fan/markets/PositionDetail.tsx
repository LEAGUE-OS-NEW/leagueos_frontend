import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchFanPositions, type Position } from '../../../services/fanMarketsServices';
import { formatUgx } from '../../../utils/rules.ts';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanTradeWallet.css';

function PositionDetail() {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchFanPositions()
      .then((items) => { if (!cancelled) setPosition(items.find((item) => item.contract.id === positionId) ?? null); })
      .catch(() => { if (!cancelled) setError("Couldn't load this position."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [positionId]);

  return (
    <div className="fan-dashboard"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main"><Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content flow-page-content">
          <button type="button" className="flow-back-btn" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>
          <section className="dashboard-card flow-card"><h1 className="flow-card-title">Position Details</h1>
            {isLoading ? <p>Loading position…</p> : error ? <DashboardNotice tone="error" title="Couldn't load position" message={error} /> : !position ? (
              <DashboardNotice tone="empty" title="Position not found" message="No genuine owned position matches this link." />
            ) : <>
              <div className="flow-meta-row"><span>Market</span><b>{position.market.question}</b></div>
              <div className="position-detail-stats">
                <div className="position-detail-stat"><span>Outcome</span><b>{position.contract.outcomeId}</b></div>
                <div className="position-detail-stat"><span>Available shares</span><b>{position.portfolio.availableQuantity.toFixed(4)}</b></div>
                <div className="position-detail-stat"><span>Average entry price</span><b>{formatUgx(position.portfolio.averageEntryPrice)}/share</b></div>
                <div className="position-detail-stat"><span>Mark price</span><b>{position.portfolio.markPrice === null ? 'Unpriced' : `${formatUgx(position.portfolio.markPrice)}/share`}</b><small>{position.portfolio.markSource}</small></div>
                <div className="position-detail-stat"><span>Market value</span><b>{position.portfolio.marketValue === null ? '—' : formatUgx(position.portfolio.marketValue)}</b></div>
                <div className="position-detail-stat"><span>Reserved SELL shares</span><b>{position.portfolio.reservedSellOrderQuantity.toFixed(4)}</b></div>
                <div className="position-detail-stat"><span>Unrealized P&amp;L</span><b>{position.portfolio.unrealizedPnl === null ? '—' : formatUgx(position.portfolio.unrealizedPnl)}</b></div>
                <div className="position-detail-stat position-detail-pnl"><span>Total position P&amp;L</span><b>{position.portfolio.totalPositionPnl === null ? '—' : formatUgx(position.portfolio.totalPositionPnl)}</b></div>
              </div>
              <button type="button" className="verify-btn verify-btn--primary" disabled={position.portfolio.availableQuantity <= 0} onClick={() => navigate(`/fan/positions/${position.contract.id}/sell`)}>Sell Position</button>
            </>}
          </section>
        </div><Footer /></div>
    </div>
  );
}

export default PositionDetail;
