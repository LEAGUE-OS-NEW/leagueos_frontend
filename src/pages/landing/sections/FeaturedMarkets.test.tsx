import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeaturedMarkets from './FeaturedMarkets';
import { fetchFeaturedPublishedMarkets } from '../../../services/marketAdminService';
import type { Market } from '../../../services/marketAdminService';

vi.mock('../../../services/marketAdminService', () => ({ fetchFeaturedPublishedMarkets: vi.fn() }));

const market: Market = {
  faceValueUgx: 10000,
  id: 'featured-1', eventLabel: 'Team A vs Team B', competition: 'League', venue: 'Venue', kickoff: '2026-08-12T12:00:00Z',
  category: 'Football', question: 'Will Team A win?', description: '', tags: [], status: 'Live', createdBy: 'Admin',
  createdAt: '2026-08-01T00:00:00Z', auditHistory: [],
  outcomes: [
    { id: 'YES', label: 'Yes', description: '', probabilityPct: 50, price: 500, openingProbabilityPct: 50, openingPrice: 500, bestBid: null, bestAsk: null, lastTrade: null },
    { id: 'NO', label: 'No', description: '', probabilityPct: 50, price: 500, openingProbabilityPct: 50, openingPrice: 500, bestBid: null, bestAsk: null, lastTrade: null },
  ],
  parameters: { opensAt: '2026-08-01T00:00:00Z', closesAt: '2026-08-20T00:00:00Z', settlesBy: '2026-08-20T00:00:00Z', initialLiquidityUgx: 0, liquiditySource: 'PLATFORM_TREASURY', openingSpreadBps: 100, minTradeUgx: 1000, maxTradeUgx: 500000, feePct: 2, featured: true, trending: false, recommended: false, inPlayTrading: true },
};

describe('Featured markets trading data', () => {
  beforeEach(() => vi.mocked(fetchFeaturedPublishedMarkets).mockResolvedValue([market]));

  it('shows unavailable states instead of proxy prices and contract metrics', async () => {
    render(<MemoryRouter><FeaturedMarkets /></MemoryRouter>);
    expect(await screen.findByText('Not traded yet')).toBeInTheDocument();
    expect(screen.getAllByText('Price unavailable')).toHaveLength(2);
    expect(screen.queryByText('50% likely YES')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
