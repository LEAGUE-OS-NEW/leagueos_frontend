import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FanMarkets from './FanMarkets';
import { fetchMarketCategories, fetchMarkets, fetchMyPositions } from '../../../services/fanMarketsServices';
import type { MarketListItem } from '../../../services/fanMarketsServices';

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
    vi.clearAllMocks();
    vi.mocked(fetchMarkets).mockResolvedValue([]);
    vi.mocked(fetchMyPositions).mockResolvedValue([]);
    vi.mocked(fetchMarketCategories).mockResolvedValue([
      { id: 'spread', label: 'Handicap / Spread', description: '' },
    ]);
  });

  const market = (overrides: Partial<MarketListItem>): MarketListItem => ({
    id: 'market-1', teamA: 'KOBS', teamB: 'Heathens', league: 'Uganda League',
    status: 'live', isTrending: true, marketType: 'Rugby', endsInLabel: '2d 3h',
    volumeLabel: '25,000', liquidityLabel: '400,000', question: 'Will KOBS win?',
    yesPrice: 6200, noPrice: 3800, yesBestAsk: 6200, noBestAsk: 3800,
    faceValueUgx: 10000, changePct: null, tradersCount: 8,
    totalContractsLabel: null, createdAt: '2026-09-08T08:00:00Z', isTradeable: true,
    ...overrides,
  });

  it('separates tradeable featured and active markets from archived records', async () => {
    vi.mocked(fetchMarkets).mockResolvedValue([
      market({ id: 'active', question: 'Curated liquid market' }),
      market({ id: 'no-liquidity', question: 'Unfunded open market', isTradeable: false, liquidityLabel: null }),
      market({ id: 'resolved', question: 'LOCAL QA resolved market', status: 'resolved', isTradeable: false }),
      market({ id: 'closed', question: 'Expired August open market', status: 'closed', isTradeable: false }),
    ]);

    render(<MemoryRouter><FanMarkets /></MemoryRouter>);

    expect((await screen.findAllByText('Curated liquid market')).length).toBe(2);
    expect(screen.getByRole('table', { name: 'Active markets' })).toHaveTextContent('Curated liquid market');
    expect(screen.getByText('LOCAL QA resolved market')).toBeInTheDocument();
    expect(screen.getByText('Expired August open market')).toBeInTheDocument();
    expect(screen.queryByText('Unfunded open market')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Archived Records' })).toBeInTheDocument();
    expect(screen.getByText('Trade Market')).toBeInTheDocument();
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
