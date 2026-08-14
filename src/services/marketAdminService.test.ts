import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import {
  createMarketDraft,
  fetchCanonicalSportingEvents,
  fetchMarkets,
  marketScopePayload,
  setParameters,
  type MarketDetailsInput,
  type MarketParameters,
} from './marketAdminService.ts';

vi.mock('./apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const details = (overrides: Partial<MarketDetailsInput>): MarketDetailsInput => ({
  scopeType: 'CUSTOM', sportId: '00000000-0000-4000-8000-000000000001',
  categoryId: '00000000-0000-4000-8000-000000000002', eventLabel: 'League awards',
  competition: '', venue: '', kickoff: '2026-08-15T10:00:00Z', category: 'Other',
  question: 'Will the award be announced?', description: '', tags: [], ...overrides,
});

const base = {
  id: 'market-1', question: 'Will the home team win?', description: '', scope_type: 'EVENT',
  status: 'OPEN', opens_at: '2099-01-01T00:00:00Z', closes_at: '2099-01-02T00:00:00Z',
  is_featured: false, sport: { id: 'sport-1', name: 'Football', slug: 'football', code: 'FB' },
  category: { id: 'category-1', name: 'Match Result', slug: 'match-result' },
  subject: { type: 'event', id: 'event-1', name: 'Lions v Stars' }, outcomes: [
    { id: 'yes', side: 'YES', position: 1, label: 'Yes' },
    { id: 'no', side: 'NO', position: 2, label: 'No' },
  ], winning_outcome: null, is_watchlisted: false, created_at: '2026-01-01T00:00:00Z',
  trading_snapshot: { outcomes: {}, volume: '0', trader_count: 0 }, status_transitions: [],
};

describe('market admin backend adaptation', () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it.each([['OPEN', 'Live'], ['CLOSED', 'Closed'], ['CANCELLED', 'Cancelled']])(
    'maps backend %s to %s', async (status, expected) => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [{ ...base, status }] });
      expect((await fetchMarkets())[0].status).toBe(expected);
    },
  );

  it('keeps MarketCategory separate from sport, including a future OPEN market', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [base] });
    const market = (await fetchMarkets())[0];
    expect(market.status).toBe('Live');
    expect(market.status).not.toBe('Upcoming');
    expect(market.category).toBe('Match Result');
    expect(market.tags).toContain('FB');
    expect(market.category).not.toBe('Football');
  });
});

describe('market scope payload contract', () => {
  it('sends only the fixture target for an EVENT market', () => {
    const payload = marketScopePayload(details({ scopeType: 'EVENT', sportingEventId: '00000000-0000-4000-8000-000000000003', competitionId: '00000000-0000-4000-8000-000000000004' }));
    expect(payload).toMatchObject({ scope_type: 'EVENT', sporting_event_id: '00000000-0000-4000-8000-000000000003', custom_subject: '' });
    expect(payload).not.toHaveProperty('competition_id');
    expect(payload).not.toHaveProperty('participant_id');
  });

  it('sends only the competition target for a COMPETITION market', () => {
    const payload = marketScopePayload(details({ scopeType: 'COMPETITION', competitionId: '00000000-0000-4000-8000-000000000004', sportingEventId: '00000000-0000-4000-8000-000000000003' }));
    expect(payload).toMatchObject({ scope_type: 'COMPETITION', competition_id: '00000000-0000-4000-8000-000000000004', custom_subject: '' });
    expect(payload).not.toHaveProperty('sporting_event_id');
  });

  it('sends only a custom subject target for CUSTOM', () => {
    const payload = marketScopePayload(details({ scopeType: 'CUSTOM', sportingEventId: '00000000-0000-4000-8000-000000000003', competitionId: '00000000-0000-4000-8000-000000000004' }));
    expect(payload).toEqual({ scope_type: 'CUSTOM', custom_subject: 'League awards' });
  });

  it('presents a safe backend field validation detail', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true, response: { status: 400, data: { competition_id: ['Selected competition does not match the fixture.'], stack: ['secret'] } },
    });
    await expect(createMarketDraft(details({}))).rejects.toThrow('Selected competition does not match the fixture.');
  });
});

describe('create market timing contracts', () => {
  const parameters: MarketParameters = {
    opensAt: '2099-01-01T00:00:00Z', closesAt: '2099-01-02T00:00:00Z', settlesBy: '2099-01-04T00:00:00Z',
    initialLiquidityUgx: 0, minTradeUgx: 1_000, maxTradeUgx: 500_000, feePct: 2,
    featured: false, trending: false, recommended: false, inPlayTrading: false,
  };

  it('requests and returns only scheduled future fixtures in kickoff order', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [
      { id: 'later', status: 'SCHEDULED', starts_at: '2099-01-03T00:00:00Z' },
      { id: 'past', status: 'SCHEDULED', starts_at: '2020-01-01T00:00:00Z' },
      { id: 'live', status: 'LIVE', starts_at: '2099-01-01T00:00:00Z' },
      { id: 'first', status: 'SCHEDULED', starts_at: '2099-01-02T00:00:00Z' },
    ] });

    expect((await fetchCanonicalSportingEvents({ sportId: 'sport-1', competitionId: 'competition-1' })).map((event) => event.id))
      .toEqual(['first', 'later']);
    expect(apiClient.get).toHaveBeenCalledWith('/sporting-events/', { params: expect.objectContaining({
      sport: 'sport-1', competition: 'competition-1', status: 'SCHEDULED', starts_after: expect.any(String),
    }) });
  });

  it('rejects settlement before close without sending a request', async () => {
    await expect(setParameters('market-1', { ...parameters, settlesBy: '2099-01-01T23:59:00Z' }))
      .rejects.toThrow('Settlement time must be at or after the trading close time.');
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('sends an editable valid settlement target as settles_by', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: base });
    await setParameters('market-1', parameters);
    expect(apiClient.patch).toHaveBeenCalledWith('/market-admin/markets/market-1/', expect.objectContaining({
      closes_at: parameters.closesAt, settles_by: parameters.settlesBy,
    }));
  });
});
