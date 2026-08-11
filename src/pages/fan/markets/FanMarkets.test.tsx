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
