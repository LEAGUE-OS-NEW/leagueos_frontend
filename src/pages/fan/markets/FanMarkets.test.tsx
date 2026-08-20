import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FanMarkets from './FanMarkets';
import { fetchMarketCategories, fetchMarkets, fetchMyPositions } from '../../../services/fanMarketsServices';

vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));
vi.mock('../../../hooks/useMarketEligibility', () => ({
  useMarketEligibility: () => ({ eligibility: null, isEligible: true, isLoading: false, isPending: false }),
}));
vi.mock('../../../services/fanMarketsServices', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/fanMarketsServices')>();
  return { ...actual, fetchMarkets: vi.fn(), fetchMyPositions: vi.fn(), fetchMarketCategories: vi.fn() };
});

describe('Fan market category filters', () => {
  beforeEach(() => {
    vi.mocked(fetchMarkets).mockResolvedValue([]);
    vi.mocked(fetchMyPositions).mockResolvedValue([]);
    vi.mocked(fetchMarketCategories).mockResolvedValue([
      { id: 'spread', label: 'Handicap / Spread', description: '' },
    ]);
  });

  it('renders categories returned by the API instead of the old static list', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FanMarkets /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Filters' }));

    expect(await screen.findByLabelText('Handicap / Spread')).toBeInTheDocument();
    expect(screen.queryByLabelText('Over/Under')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Combo Markets')).not.toBeInTheDocument();
    expect(fetchMarketCategories).toHaveBeenCalledTimes(1);
  });
});

describe('Fan market status display', () => {
  beforeEach(() => {
    vi.mocked(fetchMyPositions).mockResolvedValue([]);
    vi.mocked(fetchMarketCategories).mockResolvedValue([]);
  });

  it('shows real settlement status instead of a stale Upcoming label for a resolved market', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMarkets).mockResolvedValue([{
      id: 'market-1', teamA: 'Lions', teamB: 'Stars', league: 'League OS', status: 'resolved',
      isSettled: false, isRefunded: false, isTrending: false, marketType: 'Football',
      endsInLabel: 'Closed', volumeLabel: '0', question: 'Will Lions win?', yesPrice: null, noPrice: null,
      yesBestAsk: null, noBestAsk: null, faceValueUgx: 1000, changePct: null, tradersCount: null,
      totalContractsLabel: null, createdAt: '2026-01-01T00:00:00Z',
    }]);

    render(<MemoryRouter><FanMarkets /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('tab', { name: 'Market Info' }));

    const statusTerm = await screen.findByText('Status');
    const statusRow = statusTerm.closest('div');
    expect(statusRow).toHaveTextContent('RESOLVED · PAYOUT PENDING');
    expect(statusRow).not.toHaveTextContent('Upcoming');
  });
});
