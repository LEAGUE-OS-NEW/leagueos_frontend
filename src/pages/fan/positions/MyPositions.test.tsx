import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MyPositions from './MyPositions';
import { fetchFanPositions, type Position } from '../../../services/fanMarketsServices';

vi.mock('../../../components/fan/Sidebar', () => ({
  default: () => null,
}));

vi.mock('../sections/Topbar', () => ({
  default: () => null,
}));

vi.mock('../../../components/landing/Footer', () => ({
  default: () => null,
}));

vi.mock('../../../services/fanMarketsServices', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../services/fanMarketsServices')
    >();

  return {
    ...actual,
    fetchFanPositions: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
//
// The component optionally reads entryPrice/currentPrice/potentialPayoutUgx
// off `contract` and sport/league/club/marketType/closesAt off `market` (see
// ContractWithMarketData / MarketWithTaxonomy in MyPositions.tsx). Those
// aren't part of the base `Position` type yet, so fixtures attach them
// directly and are cast through `unknown` to satisfy TS while still
// exercising the runtime fallback logic.
// ---------------------------------------------------------------------------

let idCounter = 0;

function makePosition(overrides: {
  contract?: Record<string, unknown>;
  market?: Record<string, unknown>;
} = {}): Position {
  idCounter += 1;
  const id = `pos-${idCounter}`;

  const contract: Record<string, unknown> = {
    id,
    quantityUgx: 25000,
    matchedAt: '2026-08-16T17:13:00.000Z',
    status: 'OPEN',
    outcomeId: 'YES',
    payoutUgx: undefined,
    ...overrides.contract,
  };

  const faceValueUgx = 1000;
  const rawEntryPrice = Number(contract.entryPrice ?? 500);
  const rawCurrentPrice = Number(contract.currentPrice ?? rawEntryPrice);
  const entryPrice = rawEntryPrice <= 1 ? rawEntryPrice * faceValueUgx : rawEntryPrice;
  const currentPrice = rawCurrentPrice <= 1 ? rawCurrentPrice * faceValueUgx : rawCurrentPrice;
  const stake = Number(contract.quantityUgx);
  const quantity = entryPrice > 0 ? stake / entryPrice : 0;
  const payout = contract.payoutUgx == null ? undefined : Number(contract.payoutUgx);
  const realizedPnl = payout == null ? 0 : payout - stake;
  const marketValue = quantity * currentPrice;

  const marketExtras = overrides.market ?? {};
  const market = {
    id: `market-${id}`,
    eventLabel: `Event ${id}`,
    question: `Will ${id} happen?`,
    status: 'Open',
    sportingEventId: undefined,
    competition: String(marketExtras.league ?? 'General League'),
    venue: 'Venue TBA',
    kickoff: '2026-08-22T20:00:00.000Z',
    category: String(marketExtras.sport ?? 'General'),
    description: '',
    tags: [],
    outcomes: [],
    faceValueUgx,
    parameters: {
      opensAt: '2026-08-16T17:13:00.000Z',
      closesAt: String(marketExtras.closesAt ?? '2026-08-22T20:00:00.000Z'),
      settlesBy: '2026-08-23T20:00:00.000Z',
      initialLiquidityUgx: 0,
      liquiditySource: 'PLATFORM_TREASURY',
      openingSpreadBps: 0,
      openingLiquidityAvailable: true,
      liquidityActivationStatus: 'ACTIVE',
      minTradeUgx: 1000,
      maxTradeUgx: 500000,
      feePct: 2,
      featured: false,
      trending: false,
      recommended: false,
      inPlayTrading: true,
    },
    createdBy: 'Market Admin',
    createdAt: '2026-08-16T17:13:00.000Z',
    auditHistory: [],
    ...marketExtras,
  };

  const portfolio = {
    id,
    marketId: String(market.id),
    backendOutcomeId: `${id}-outcome`,
    outcomeLabel: String(contract.outcomeId),
    marketStatus: String(contract.status),
    quantity,
    availableQuantity: quantity,
    reservedQuantity: 0,
    averageEntryPrice: entryPrice,
    totalCostBasis: stake,
    realizedPnl,
    markPrice: currentPrice,
    markSource: 'LAST_TRADE',
    marketValue,
    unrealizedPnl: marketValue - stake,
    totalPositionPnl: realizedPnl + marketValue - stake,
    valuationComplete: true,
    openSellOrderCount: 0,
    reservedSellOrderQuantity: 0,
  };

  return { contract, market, portfolio } as unknown as Position;
}

function renderPositions() {
  return render(
    <MemoryRouter>
      <MyPositions />
    </MemoryRouter>,
  );
}

function getBySelector(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  expect(element).toBeInTheDocument();
  return element as HTMLElement;
}

function getMainPositionsList(): HTMLElement {
  return getBySelector('.mp-table-section .my-positions-list');
}

describe('MyPositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
  });

  describe('loading state', () => {
    it('shows a skeleton while positions are being fetched', () => {
      let resolveFetch: (value: Position[]) => void = () => {};
      vi.mocked(fetchFanPositions).mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      renderPositions();

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

      // avoid an unresolved-promise / act warning leaking into other tests
      resolveFetch([]);
    });
  });

  describe('error state', () => {
    it('shows an error notice and retries the fetch on demand', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchFanPositions).mockRejectedValueOnce(new Error('network down'));

      renderPositions();

      expect(
        await screen.findByText("Couldn't load your positions"),
      ).toBeInTheDocument();
      expect(fetchFanPositions).toHaveBeenCalledTimes(1);

      vi.mocked(fetchFanPositions).mockResolvedValueOnce([]);
      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(await screen.findByText('No positions yet')).toBeInTheDocument();
      expect(fetchFanPositions).toHaveBeenCalledTimes(2);
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      vi.mocked(fetchFanPositions).mockResolvedValue([]);
    });

    it('loads authenticated positions without a market eligibility gate', async () => {
      renderPositions();

      expect(await screen.findByText('No positions yet')).toBeInTheDocument();
      expect(fetchFanPositions).toHaveBeenCalledTimes(1);

      expect(
        screen.queryByText('Verify your identity to trade'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Verify your email to trade'),
      ).not.toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    const openYes = makePosition({
      contract: {
        quantityUgx: 25000,
        matchedAt: '2026-08-16T17:13:00.000Z',
        status: 'OPEN',
        outcomeId: 'YES',
        entryPrice: 0.62,
        currentPrice: 0.74,
      },
      market: {
        eventLabel: 'City Oilers vs Namuwongo Blazers',
        question: 'Will City Oilers beat Namuwongo Blazers?',
        status: 'Open',
        sport: 'Basketball',
        league: 'National League',
        club: 'City Oilers',
        marketType: 'Match Result',
        closesAt: '2026-08-22T20:00:00.000Z',
      },
    });

    const openNo = makePosition({
      contract: {
        quantityUgx: 20000,
        matchedAt: '2026-08-17T09:52:00.000Z',
        status: 'OPEN',
        outcomeId: 'NO',
        entryPrice: 0.55,
        currentPrice: 0.48,
      },
      market: {
        eventLabel: 'Vipers SC vs KCCA FC',
        question: 'Will Vipers SC beat KCCA FC?',
        status: 'Open',
        sport: 'Football',
        league: 'Premier League',
        club: 'Vipers SC',
        marketType: 'Match Result',
        closesAt: '2026-08-25T18:00:00.000Z',
      },
    });

    const won = makePosition({
      contract: {
        quantityUgx: 70000,
        matchedAt: '2026-08-10T08:26:00.000Z',
        status: 'WON',
        outcomeId: 'YES',
        payoutUgx: 112000,
      },
      market: {
        eventLabel: 'Vipers SC vs KCCA FC (Rematch)',
        question: 'Will Vipers SC beat KCCA FC?',
        status: 'Resolved',
      },
    });

    const lost = makePosition({
      contract: {
        quantityUgx: 30000,
        matchedAt: '2026-08-05T11:04:00.000Z',
        status: 'LOST',
        outcomeId: 'NO',
        payoutUgx: 0,
      },
      market: {
        eventLabel: 'SC Villa vs Express FC',
        question: 'Will SC Villa beat Express FC?',
        status: 'Resolved',
      },
    });

    const pending = makePosition({
      contract: {
        quantityUgx: 15000,
        matchedAt: '2026-08-19T12:00:00.000Z',
        status: 'PENDING_SETTLEMENT',
        outcomeId: 'YES',
      },
      market: {
        eventLabel: 'Arua Hill SC vs Maroons',
        question: 'Will Arua Hill SC beat Maroons?',
        status: 'Open',
      },
    });

    const cancelled = makePosition({
      contract: {
        quantityUgx: 10000,
        matchedAt: '2026-08-01T12:00:00.000Z',
        status: 'REFUNDED',
        outcomeId: 'NO',
      },
      market: {
        eventLabel: 'Bul FC vs Onduparaka',
        question: 'Will Bul FC beat Onduparaka?',
        status: 'Cancelled',
      },
    });

    const basePositions = [openYes, openNo, won, lost, pending, cancelled];

    beforeEach(() => {
      vi.mocked(fetchFanPositions).mockResolvedValue(basePositions);
    });

    it('shows a completely sold position as exited rather than open', async () => {
      vi.mocked(fetchFanPositions).mockResolvedValue([
        makePosition({ contract: { quantityUgx: 0, matchedAt: '2026-08-20T12:00:00.000Z', status: 'EXITED', outcomeId: 'YES' } }),
      ]);
      const user = userEvent.setup();
      renderPositions();
      await user.click(await screen.findByRole('button', { name: 'Exited' }));
      expect(screen.getAllByText('Exited', { selector: '.mp-result-badge' }).length).toBeGreaterThan(0);
      await user.click(screen.getByRole('button', { name: /^Open/ }));
      expect(screen.getByText(/No positions match/)).toBeInTheDocument();
    });

    it('computes the summary stat cards from live data', async () => {
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');

      expect(screen.getByText('Total Positions')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument(); // total positions

      // Open: openYes + openNo. Pending settlement has its own backend status bucket.
      const statsGrid = getBySelector('.mp-stats-grid');
      const openCard = within(statsGrid).getByText('Open Positions').closest('.mp-stat-card');
      expect(within(openCard as HTMLElement).getByText('2')).toBeInTheDocument();

      // Settled: won + lost
      const settledCard = within(statsGrid).getByText('Settled Positions').closest('.mp-stat-card');
      expect(within(settledCard as HTMLElement).getByText('2')).toBeInTheDocument();

      // Total invested: sum of all stakes = 25000+20000+70000+30000+15000+10000 = 170000
      expect(screen.getByText('UGX 170,000')).toBeInTheDocument();
    });

    it('buckets positions into the correct result tabs', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');

      await user.click(screen.getByRole('button', { name: 'Won' }));
      expect(within(getMainPositionsList()).getByText('Vipers SC vs KCCA FC (Rematch)')).toBeInTheDocument();
      expect(within(getMainPositionsList()).queryByText('SC Villa vs Express FC')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Lost' }));
      expect(within(getMainPositionsList()).getByText('SC Villa vs Express FC')).toBeInTheDocument();
      expect(within(getMainPositionsList()).queryByText('Vipers SC vs KCCA FC (Rematch)')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Pending Settlement' }));
      expect(within(getMainPositionsList()).getByText('Arua Hill SC vs Maroons')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancelled / Refunded' }));
      expect(within(getMainPositionsList()).getByText('Bul FC vs Onduparaka')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(within(getMainPositionsList()).getByText('City Oilers vs Namuwongo Blazers')).toBeInTheDocument();
      expect(within(getMainPositionsList()).getByText('Vipers SC vs KCCA FC')).toBeInTheDocument();
      expect(within(getMainPositionsList()).queryByText('SC Villa vs Express FC')).not.toBeInTheDocument();
    });

    it('filters rows by search text', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');

      await user.type(screen.getByPlaceholderText('Search positions...'), 'Oilers');

      expect(within(getMainPositionsList()).getByText('City Oilers vs Namuwongo Blazers')).toBeInTheDocument();
      expect(within(getMainPositionsList()).queryByText('Vipers SC vs KCCA FC')).not.toBeInTheDocument();
    });

    it('filters rows by sport once the filter panel is open', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');

      await user.click(screen.getByRole('button', { name: /filters/i }));
      await user.selectOptions(screen.getByLabelText('Sport'), 'Football');

      expect(within(getMainPositionsList()).getByText('Vipers SC vs KCCA FC')).toBeInTheDocument();
      expect(within(getMainPositionsList()).queryByText('City Oilers vs Namuwongo Blazers')).not.toBeInTheDocument();
    });

    it('sorts by stake when "Highest Stake" is selected', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');

      await user.selectOptions(screen.getByLabelText('Sort by'), 'stake_desc');

      const marketNames = screen
        .getAllByText(/./, { selector: '.my-positions-market strong' })
        .map((node) => node.textContent);

      // Highest stake among all six fixtures is the 70,000 "won" position.
      expect(marketNames[0]).toBe('Vipers SC vs KCCA FC (Rematch)');
    });

    it('opens the position detail panel on row click and closes it', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findAllByText('City Oilers vs Namuwongo Blazers');
      const row = within(getMainPositionsList())
        .getByText('City Oilers vs Namuwongo Blazers')
        .closest('.my-positions-row');
      await user.click(row as HTMLElement);

      const detailCard = getBySelector('.mp-detail-card');
      expect(within(detailCard).getByText('Position Details')).toBeInTheDocument();
      expect(within(detailCard).getByText('Will City Oilers beat Namuwongo Blazers?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByText('Position Details')).not.toBeInTheDocument();
    });

    it('uses backend portfolio valuation when live pricing fields are absent from the contract', async () => {
      const user = userEvent.setup();
      renderPositions();

      await screen.findByText('Arua Hill SC vs Maroons');
      const row = within(getMainPositionsList())
        .getByText('Arua Hill SC vs Maroons')
        .closest('.my-positions-row');
      await user.click(row as HTMLElement);

      // The fixture's portfolio is built from backend-style cost basis and entry price.
      expect(within(getBySelector('.mp-detail-card')).getAllByText('UGX 15,000').length).toBeGreaterThan(0);
    });
  });

  describe('pagination', () => {
    it('paginates when there are more than 8 filtered positions', async () => {
      const user = userEvent.setup();
      const manyOpen = Array.from({ length: 10 }, (_, index) =>
        makePosition({
          contract: { status: 'OPEN', outcomeId: 'YES', quantityUgx: 1000 * (index + 1) },
          market: { eventLabel: `Market ${index + 1}`, question: `Q${index + 1}?`, status: 'Open' },
        }),
      );
      vi.mocked(fetchFanPositions).mockResolvedValue(manyOpen);

      renderPositions();

      await screen.findByText(/Showing 1 to 8 of 10/);
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '2' }));
      expect(await screen.findByText(/Showing 9 to 10 of 10/)).toBeInTheDocument();
    });
  });

  describe('CSV export', () => {
    it('builds and downloads a CSV of the filtered positions', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchFanPositions).mockResolvedValue([
        makePosition({
          contract: { status: 'OPEN', outcomeId: 'YES', quantityUgx: 25000 },
          market: { eventLabel: 'Export Test Market', question: 'Q?', status: 'Open' },
        }),
      ]);

      const createObjectURL = vi.fn(() => 'blob:mock-url');
      const revokeObjectURL = vi.fn();
      // @ts-expect-error jsdom doesn't implement these by default
      global.URL.createObjectURL = createObjectURL;
      // @ts-expect-error jsdom doesn't implement these by default
      global.URL.revokeObjectURL = revokeObjectURL;
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      renderPositions();
      await screen.findAllByText('Export Test Market');

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      clickSpy.mockRestore();
    });
  });

  describe('portfolio overview', () => {
    it('splits open positions by YES/NO share and surfaces highest exposure', async () => {
      vi.mocked(fetchFanPositions).mockResolvedValue([
        makePosition({
          contract: { status: 'OPEN', outcomeId: 'YES', quantityUgx: 90000 },
          market: { eventLabel: 'Big Bet', question: 'Q?', status: 'Open' },
        }),
        makePosition({
          contract: { status: 'OPEN', outcomeId: 'NO', quantityUgx: 10000 },
          market: { eventLabel: 'Small Bet', question: 'Q?', status: 'Open' },
        }),
      ]);

      renderPositions();

      await screen.findAllByText('Big Bet');

      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
      expect(within(getBySelector('.mp-portfolio-card')).getByText('2')).toBeInTheDocument(); // open position count in donut center
      expect(screen.getAllByText('Big Bet').length).toBeGreaterThan(0); // table row and highest exposure fact
      expect(within(getBySelector('.mp-portfolio-card')).getAllByText('1 (50%)')).toHaveLength(2);
    });
  });

  describe('performance card', () => {
    it('reports win rate and treats zero losses as an infinite profit factor', async () => {
      vi.mocked(fetchFanPositions).mockResolvedValue([
        makePosition({
          contract: { status: 'WON', outcomeId: 'YES', quantityUgx: 20000, payoutUgx: 40000 },
          market: { eventLabel: 'Only Win', question: 'Q?', status: 'Resolved' },
        }),
      ]);

      renderPositions();

      await screen.findByText('My Performance');

      expect(screen.getByText('100%')).toBeInTheDocument(); // win rate
      expect(screen.getByText('∞')).toBeInTheDocument(); // profit factor, no losses yet
    });
  });

  describe('sparkline', () => {
    it('only renders the P&L history chart once there are 2+ settled positions', async () => {
      vi.mocked(fetchFanPositions).mockResolvedValue([
        makePosition({
          contract: { status: 'WON', outcomeId: 'YES', quantityUgx: 20000, payoutUgx: 40000 },
          market: { eventLabel: 'Settled One', question: 'Q?', status: 'Resolved' },
        }),
      ]);

      renderPositions();

      await screen.findByText('My Performance');
      expect(screen.queryByText('P&L Over Time')).not.toBeInTheDocument();
    });
  });
});
