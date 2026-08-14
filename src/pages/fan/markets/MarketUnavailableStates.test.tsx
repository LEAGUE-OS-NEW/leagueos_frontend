import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketDetailChart from './MarketDetailChart';
import PositionDetail from './PositionDetail';
import SellPosition from './SellPosition';
import SellConfirmation from './SellConfirmation';
import { fetchFanPositions, fetchMarket, fetchMarketOrderBook, fetchMarketPriceHistory } from '../../../services/fanMarketsServices';

vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));
vi.mock('../../../services/fanMarketsServices', () => ({ fetchFanPositions: vi.fn(), fetchMarket: vi.fn(), fetchMarketOrderBook: vi.fn(), fetchMarketPriceHistory: vi.fn(), sellPosition: vi.fn() }));

function renderAt(path: string, routePath: string, element: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={routePath} element={element} /></Routes></MemoryRouter>);
}

describe('market trading unavailable states', () => {
  beforeEach(() => {
    vi.mocked(fetchFanPositions).mockResolvedValue([]);
    vi.mocked(fetchMarket).mockResolvedValue({ id: 'market-1', question: 'Backend market question', faceValueUgx: 1000, outcomes: [{ id: 'YES', backendOutcomeId: 'outcome-1', label: 'Yes' }] } as never);
    vi.mocked(fetchMarketPriceHistory).mockResolvedValue({ market_id: 'market-1', outcome_id: 'outcome-1', interval: 'RAW', points: [] });
    vi.mocked(fetchMarketOrderBook).mockResolvedValue({ market_id: 'market-1', outcome: { id: 'outcome-1', side: 'YES', label: 'Yes' }, best_bid: null, best_ask: null, spread: null, total_bid_quantity: '0', total_ask_quantity: '0', bids: [], asks: [], recent_trades: [] });
  });

  it('shows genuine market identity and no-trades state on the chart screen', async () => {
    renderAt('/fan/markets/market-1/chart', '/fan/markets/:marketId/chart', <MarketDetailChart />);
    expect(await screen.findByText('Backend market question')).toBeInTheDocument();
    expect(await screen.findByText('No trades yet')).toBeInTheDocument();
  });

  it('renders genuine price-history points and backend order-book levels', async () => {
    vi.mocked(fetchMarketPriceHistory).mockResolvedValue({ market_id: 'market-1', outcome_id: 'outcome-1', interval: 'RAW', points: [
      { fill_id: 'fill-1', executed_at: '2026-01-01T00:00:00Z', price: '0.6200', quantity: '1000.0000' },
      { fill_id: 'fill-2', executed_at: '2026-01-01T01:00:00Z', price: '0.6700', quantity: '1000.0000' },
    ] });
    vi.mocked(fetchMarketOrderBook).mockResolvedValue({ market_id: 'market-1', outcome: { id: 'outcome-1', side: 'YES', label: 'Yes' }, best_bid: '0.61000', best_ask: '0.63000', spread: '0.02000', total_bid_quantity: '1000', total_ask_quantity: '2000', bids: [{price:'0.61000',quantity:'1000',order_count:1}], asks: [{price:'0.63000',quantity:'2000',order_count:2}], recent_trades: [] });
    renderAt('/fan/markets/market-1/chart', '/fan/markets/:marketId/chart', <MarketDetailChart />);
    expect(await screen.findByRole('img', { name: 'Genuine price history' })).toBeInTheDocument();
    expect(await screen.findByText(/Best bid: UGX 610\/share/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0000 shares \(2\)/)).toBeInTheDocument();
  });

  it('does not invent a position or SELL eligibility', async () => {
    renderAt('/fan/positions/missing', '/fan/positions/:positionId', <PositionDetail />);
    expect(await screen.findByText('Position not found')).toBeInTheDocument();
    expect(screen.queryByText(/SC Villa/i)).not.toBeInTheDocument();

    renderAt('/fan/positions/missing/sell', '/fan/positions/:positionId/sell', <SellPosition />);
    expect(await screen.findByText('SELL requires a genuine owned position.')).toBeInTheDocument();
  });

  it('does not fabricate a sell quote on confirmation', () => {
    renderAt('/fan/positions/missing/sell/confirm', '/fan/positions/:positionId/sell/confirm', <SellConfirmation />);
    expect(screen.getByText('Sell confirmation unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/SC Villa/i)).not.toBeInTheDocument();
  });
});
