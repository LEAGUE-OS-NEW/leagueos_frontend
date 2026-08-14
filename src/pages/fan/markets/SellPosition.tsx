import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchFanPositions, fetchMarketOrderBook, type Position } from '../../../services/fanMarketsServices';
import { formatMarketSharePrice, normalizedPriceToUgxSharePrice } from '../../../utils/marketPricing.ts';
import '../sections/FanDashboard.css'; import '../markets/Markets.css'; import './FanTradeWallet.css';

function SellPosition() {
  const navigate = useNavigate(); const { positionId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); const [position, setPosition] = useState<Position | null>(null);
  const [bestBid, setBestBid] = useState<number | null>(null); const [shares, setShares] = useState('');
  const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let cancelled = false; fetchFanPositions().then(async (items) => {
    const found = items.find((item) => item.contract.id === positionId) ?? null; if (cancelled) return; setPosition(found);
    if (found) { const book = await fetchMarketOrderBook(found.market.id, found.portfolio.backendOutcomeId); if (!cancelled) setBestBid(book.best_bid === null ? null : Number(book.best_bid)); }
  }).catch(() => { if (!cancelled) setError("Couldn't load this position."); }).finally(() => { if (!cancelled) setIsLoading(false); }); return () => { cancelled = true; }; }, [positionId]);
  const quantity = Number(shares); const valid = Boolean(position && bestBid !== null && quantity > 0 && quantity <= position.portfolio.availableQuantity);
  return <div className="fan-dashboard"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /><div className="fan-dashboard-main"><Topbar onMenuClick={() => setIsSidebarOpen(true)} /><div className="fan-dashboard-content flow-page-content">
    <button type="button" className="flow-back-btn" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button><section className="dashboard-card flow-card"><h1 className="flow-card-title">Sell Your Position</h1>
    {isLoading ? <p>Loading position…</p> : error ? <DashboardNotice tone="error" title="Couldn't load position" message={error} /> : !position ? <DashboardNotice tone="empty" title="Position not found" message="SELL requires a genuine owned position." /> : <>
      <div className="flow-meta-row"><span>Market</span><b>{position.market.question}</b></div><div className="flow-meta-row"><span>Available shares</span><b>{position.portfolio.availableQuantity.toFixed(4)}</b></div>
      <div className="flow-meta-row"><span>Best bid</span><b>{bestBid === null ? 'No buy liquidity' : formatMarketSharePrice(normalizedPriceToUgxSharePrice(bestBid, position.market.faceValueUgx))}</b></div>
      {bestBid === null ? <DashboardNotice tone="empty" title="No buy liquidity" message="No buy liquidity is currently available for this position." /> : <><label className="trade-amount-label">Shares to sell<input className="trade-amount-input" type="number" min="0" max={position.portfolio.availableQuantity} value={shares} onChange={(event) => setShares(event.target.value)} /></label>
      <div className="preset-chips">{[25,50,75,100].map((pct) => <button type="button" key={pct} onClick={() => setShares(String(position.portfolio.availableQuantity * pct / 100))}>{pct}%</button>)}</div>
      {quantity > position.portfolio.availableQuantity && <p className="field-error">You can sell at most {position.portfolio.availableQuantity.toFixed(4)} available shares.</p>}
      <button className="verify-btn verify-btn--primary" type="button" disabled={!valid} onClick={() => navigate(`/fan/positions/${positionId}/sell/confirm`, { state: { shares: quantity, limitPrice: bestBid } })}>Review Sell Order</button></>}
    </>}</section></div><Footer /></div></div>;
}
export default SellPosition;
