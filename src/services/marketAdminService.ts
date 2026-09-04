// Market Admin service. The backend is authoritative for catalogue,
// lifecycle, proposals, fills, and order-book state.

import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils.ts';
import type {
  AdminMarket as ApiAdminMarket,
  Market as ApiMarket,
  MarketCategory as ApiMarketCategory,
  SportResource,
  SportingEvent,
  NamedResource,
} from '../types/api.ts';
import { backendQuantityToShares, normalizedPriceToUgxSharePrice } from '../utils/marketPricing.ts';

export const MARKET_CATEGORIES = [
  'Football',
  'Rugby',
  'Basketball',
  'Cricket',
  'Athletics',
  'Esports',
  'Other',
] as const;
export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export type MarketStatus = 'Draft' | 'Pending Approval' | 'Upcoming' | 'Live' | 'Suspended' | 'Closed' | 'Resolved' | 'Voided' | 'Cancelled';
export type OutcomeId = 'YES' | 'NO';
export type ProposalStatus = 'New' | 'Under Review' | 'Converted' | 'Rejected' | 'Duplicate';

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface Outcome {
  id: OutcomeId;
  backendOutcomeId?: string;
  label: string;
  description: string;
  probabilityPct: number | null;
  /** UGX — price = implied probability x UGX 10,000 (see the contract explainer). */
  price: number | null;
  openingProbabilityPct: number | null;
  openingPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  lastTrade: number | null;
  markSource?: 'LAST_TRADE' | 'MIDPOINT' | 'BEST_QUOTE' | 'OPENING_REFERENCE' | 'NO_LIQUIDITY';
}

export interface MarketParameters {
  opensAt: string;
  closesAt: string;
  settlesBy: string;
  initialLiquidityUgx: number;
  liquiditySource: 'PLATFORM_TREASURY' | 'EXTERNAL_MARKET_MAKER';
  openingSpreadBps: number;
  minTradeUgx: number;
  maxTradeUgx: number;
  positionLimitUgx?: number;
  dailyLimitUgx?: number;
  feePct: number;
  featured: boolean;
  trending: boolean;
  recommended: boolean;
  inPlayTrading: boolean;
}

export interface MarketLiquidity {
  status: string; source: string | null; configuredOpeningLiquidityUgx: number;
  lockedCollateralUgx: number; issuedCompleteSets: number; openingSpreadBps: number;
  openingYesAsk: number | null; openingNoAsk: number | null; providerDisplayName: string | null;
}

export interface Market {
  id: string;
  sportingEventId?: string;
  eventLabel: string;
  competition: string;
  venue: string;
  kickoff: string;
  category: MarketCategory;
  question: string;
  description: string;
  tags: string[];
  outcomes: Outcome[];
  faceValueUgx: number;
  parameters: MarketParameters;
  liquidity?: MarketLiquidity;
  status: MarketStatus;
  isSettled: boolean;
  isRefunded: boolean;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  resolvedAt?: string;
  winningOutcomeId?: OutcomeId;
  auditHistory: AuditEvent[];
}

export interface MarketProposal {
  id: string;
  submittedBy: string;
  eventLabel: string;
  suggestedQuestion: string;
  suggestedRules?: string;
  status: ProposalStatus;
  createdAt: string;
  duplicateOfMarketId?: string;
  auditHistory: AuditEvent[];
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  shares: number;
  orderCount: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  quantity: number;
  shares: number;
  executedAt: string;
}

export interface OrderBook {
  marketId: string;
  outcomeId: OutcomeId;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  recentTrades: RecentTrade[];
  lastPrice: number | null;
  spread: number | null;
}

export interface MarketDetailsInput {
  scopeType: 'EVENT' | 'COMPETITION' | 'CUSTOM';
  sportId?: string;
  categoryId?: string;
  competitionId?: string;
  sportingEventId?: string;
  eventLabel: string;
  competition: string;
  venue: string;
  kickoff: string;
  category: MarketCategory;
  question: string;
  description: string;
  tags: string[];
}

export function marketScopePayload(input: MarketDetailsInput): Pick<
  MarketAdminPayload,
  'scope_type' | 'sporting_event_id' | 'competition_id' | 'participant_id' | 'custom_subject'
> {
  if (input.scopeType === 'EVENT') {
    if (!isUuid(input.sportingEventId)) fail('Select a canonical fixture for this event market.');
    return {
      scope_type: 'EVENT',
      sporting_event_id: input.sportingEventId,
      custom_subject: '',
    };
  }
  if (input.scopeType === 'COMPETITION') {
    if (!isUuid(input.competitionId)) fail('Select a competition for this competition market.');
    return {
      scope_type: 'COMPETITION',
      competition_id: input.competitionId,
      custom_subject: '',
    };
  }
  const customSubject = input.eventLabel.trim();
  if (!customSubject) fail('Enter a subject for this custom proposition.');
  return {
    scope_type: 'CUSTOM',
    custom_subject: customSubject,
  };
}

export interface MarketCatalogueOptions {
  sports: SportResource[];
  categories: ApiMarketCategory[];
}

export async function fetchMarketCatalogueOptions(): Promise<MarketCatalogueOptions> {
  const [sports, categories] = await Promise.all([
    fetchSports(),
    apiClient.get('/markets/categories/').then((response) => normalizeApiList<ApiMarketCategory>(response.data)),
  ]);
  return { sports, categories };
}

export async function fetchCanonicalCompetitions(sportId?: string): Promise<Array<NamedResource & { sport: SportResource }>> {
  const response = await apiClient.get('/competitions/', { params: sportId ? { sport: sportId } : undefined });
  return normalizeApiList(response.data);
}

export async function fetchCanonicalSportingEvents(filters: { sportId?: string; competitionId?: string } = {}): Promise<SportingEvent[]> {
  const now = Date.now();
  const response = await apiClient.get('/sporting-events/', {
    params: {
      sport: filters.sportId,
      competition: filters.competitionId,
      status: 'SCHEDULED',
      starts_after: new Date(now).toISOString(),
      show_in_markets: true,
    },
  });
  return normalizeApiList<SportingEvent>(response.data)
    .filter((event) => event.status === 'SCHEDULED' && new Date(event.starts_at).getTime() > now)
    .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
}

interface MarketAdminPayload {
  sport_id: string;
  category_id: string;
  template_id?: string | null;
  scope_type: 'EVENT' | 'COMPETITION' | 'PARTICIPANT' | 'CUSTOM';
  sporting_event_id?: string | null;
  competition_id?: string | null;
  participant_id?: string | null;
  custom_subject?: string;
  question: string;
  description?: string;
  rules?: string;
  resolution_source?: string;
  resolution_criteria?: string;
  opens_at?: string | null;
  closes_at?: string | null;
  settles_by?: string | null;
  is_featured?: boolean;
  yes_label?: string;
  no_label?: string;
}

export interface OutcomeInput {
  id: OutcomeId;
  label: string;
  description: string;
  probabilityPct: number;
}

function fail(message: string, status?: number): never {
  throw status === undefined ? new Error(message) : Object.assign(new Error(message), { status });
}

function apiError(error: unknown): Error {
  if (error instanceof Error && !('isAxiosError' in error)) return error;
  const details = extractApiError(error);
  const fieldMessage = Object.entries(details.fields).find(
    ([field, messages]) => !['detail', 'message', 'traceback', 'stack'].includes(field) && messages.length > 0,
  )?.[1][0];
  return Object.assign(new Error(fieldMessage ?? details.message), { status: details.status, fields: details.fields });
}


async function fetchAllPages<T>(
  url: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const response = await apiClient.get(url, {
      params: {
        ...params,
        page,
        page_size: 100,
      },
    });

    items.push(
      ...normalizeApiList<T>(response.data),
    );

    const payload = unwrapApiData(
      response.data,
    ) as {
      next?: string | null;
    };

    if (!payload?.next) {
      return items;
    }

    page += 1;
  }
}

function isUuid(value?: string): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function backendStatusToAdminStatus(
  market: ApiMarket,
): MarketStatus {
  if (
    market.status === 'DRAFT' ||
    market.status === 'REJECTED'
  ) {
    return 'Draft';
  }

  if (market.status === 'PENDING_APPROVAL') {
    return 'Pending Approval';
  }

  if (market.status === 'APPROVED') {
    return 'Upcoming';
  }

  if (market.status === 'OPEN') {
    return 'Live';
  }

  if (market.status === 'SUSPENDED') {
    return 'Suspended';
  }

  if (market.status === 'CLOSED') {
    return 'Closed';
  }

  if (market.status === 'RESOLVED') {
    return 'Resolved';
  }

  if (market.status === 'VOIDED') {
    return 'Voided';
  }

  if (market.status === 'CANCELLED') {
    return 'Cancelled';
  }

  return 'Draft';
}

function adminName(user: ApiAdminMarket['created_by']): string {
  if (!user) return 'Market Admin';
  const adminUser = user as ApiAdminMarket['created_by'] & { first_name?: string; last_name?: string; full_name?: string };
  const names = [adminUser.first_name, adminUser.last_name].filter(Boolean).join(' ').trim();
  return adminUser.full_name || names || adminUser.email || 'Market Admin';
}

function adaptApiMarket(market: ApiAdminMarket | ApiMarket): Market {
  const status = backendStatusToAdminStatus(market);
  const subject = market.subject?.name || market.sporting_event?.name || market.custom_subject || market.question;
  const yesApi = market.outcomes.find((outcome) => outcome.side === 'YES') ?? market.outcomes[0];
  const noApi = market.outcomes.find((outcome) => outcome.side === 'NO') ?? market.outcomes[1];
  const kickoff = market.sporting_event?.starts_at ?? market.closes_at ?? market.opens_at ?? market.created_at ?? new Date().toISOString();
  const createdBy = 'created_by' in market ? adminName(market.created_by) : 'Market Admin';
  const transitions = 'status_transitions' in market ? market.status_transitions ?? [] : [];
  const outcomePrice = (outcomeId?: string) => {
    if (!outcomeId) return null;
    const raw = market.trading_snapshot?.outcomes[outcomeId]?.mark_price;
    return raw == null ? null : normalizedPriceToUgxSharePrice(Number(raw), market.face_value_ugx);
  };

  return {
    id: market.id,
    sportingEventId: market.sporting_event?.id,
    eventLabel: subject,
    competition: market.sporting_event?.competition?.name ?? market.competition?.name ?? market.sport?.name ?? 'League OS',
    venue: market.sporting_event?.venue ?? 'Venue TBA',
    kickoff,
    category: ((market.category?.name ?? 'Other') as MarketCategory),
    question: market.question,
    description: market.description ?? '',
    tags: [market.category?.slug, market.sport?.code].filter(Boolean) as string[],
    outcomes: [
      yesApi && {
        id: 'YES' as const,
        backendOutcomeId: yesApi.id,
        label: yesApi.label || 'Yes',
        description: yesApi.description ?? '',
        probabilityPct: outcomePrice(yesApi.id) === null ? null : Number(market.trading_snapshot?.outcomes[yesApi.id]?.mark_price) * 100,
        price: outcomePrice(yesApi.id),
        openingProbabilityPct: yesApi.opening_probability_pct,
        openingPrice: yesApi.opening_price_ugx,
        bestBid: market.trading_snapshot?.outcomes[yesApi.id]?.best_bid == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[yesApi.id].best_bid), market.face_value_ugx),
        bestAsk: market.trading_snapshot?.outcomes[yesApi.id]?.best_ask == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[yesApi.id].best_ask), market.face_value_ugx),
        lastTrade: market.trading_snapshot?.outcomes[yesApi.id]?.last_trade == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[yesApi.id].last_trade), market.face_value_ugx),
        markSource: market.trading_snapshot?.outcomes[yesApi.id]?.mark_source,
      },
      noApi && {
        id: 'NO' as const,
        backendOutcomeId: noApi.id,
        label: noApi.label || 'No',
        description: noApi.description ?? '',
        probabilityPct: outcomePrice(noApi.id) === null ? null : Number(market.trading_snapshot?.outcomes[noApi.id]?.mark_price) * 100,
        price: outcomePrice(noApi.id),
        openingProbabilityPct: noApi.opening_probability_pct,
        openingPrice: noApi.opening_price_ugx,
        bestBid: market.trading_snapshot?.outcomes[noApi.id]?.best_bid == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].best_bid), market.face_value_ugx),
        bestAsk: market.trading_snapshot?.outcomes[noApi.id]?.best_ask == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].best_ask), market.face_value_ugx),
        lastTrade: market.trading_snapshot?.outcomes[noApi.id]?.last_trade == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].last_trade), market.face_value_ugx),
        markSource: market.trading_snapshot?.outcomes[noApi.id]?.mark_source,
      },
    ].filter(Boolean) as Outcome[],
    faceValueUgx: market.face_value_ugx,
    parameters: {
      opensAt: market.opens_at ?? market.created_at ?? new Date().toISOString(),
      closesAt: (() => {
        // Use the stored close time if one exists. Otherwise fall back to
        // kickoff — but if kickoff is already in the past (common for seeded
        // or test fixtures), default to 1 hour from now so the admin always
        // receives a valid, future close time on the Trading Setup step.
        const candidate = market.closes_at ?? kickoff;
        return new Date(candidate).getTime() > Date.now()
          ? candidate
          : new Date(Date.now() + 60 * 60_000).toISOString();
      })(),
      settlesBy: (() => {
        const candidate = market.closes_at ?? kickoff;
        return new Date(candidate).getTime() > Date.now()
          ? candidate
          : new Date(Date.now() + 60 * 60_000).toISOString();
      })(),
      initialLiquidityUgx: 'liquidity' in market && market.liquidity ? Number(market.liquidity.initial_liquidity_ugx) : 0,
      liquiditySource: ('liquidity' in market && market.liquidity?.liquidity_source) || 'PLATFORM_TREASURY',
      openingSpreadBps: 'liquidity' in market && market.liquidity ? market.liquidity.opening_spread_bps : 100,
      minTradeUgx: 1_000,
      maxTradeUgx: 500_000,
      feePct: 2,
      featured: market.is_featured,
      trending: market.is_featured,
      recommended: market.is_featured,
      inPlayTrading: status === 'Live',
    },
    liquidity: 'liquidity' in market && market.liquidity ? {
      status: market.liquidity.activation_status,
      source: market.liquidity.liquidity_source,
      configuredOpeningLiquidityUgx: Number(market.liquidity.initial_liquidity_ugx),
      lockedCollateralUgx: Number(market.liquidity.locked_collateral),
      issuedCompleteSets: backendQuantityToShares(Number(market.liquidity.issued_complete_sets), market.face_value_ugx),
      openingSpreadBps: market.liquidity.opening_spread_bps,
      openingYesAsk: market.liquidity.opening_yes_ask == null ? null : normalizedPriceToUgxSharePrice(Number(market.liquidity.opening_yes_ask), market.face_value_ugx),
      openingNoAsk: market.liquidity.opening_no_ask == null ? null : normalizedPriceToUgxSharePrice(Number(market.liquidity.opening_no_ask), market.face_value_ugx),
      providerDisplayName: market.liquidity.provider,
    } : undefined,
    status,
    isSettled: market.is_settled === true,
    isRefunded: market.is_refunded === true,
    createdBy,
    createdAt: market.created_at ?? market.opens_at ?? new Date().toISOString(),
    publishedAt: market.opens_at,
    winningOutcomeId: market.winning_outcome === yesApi?.id ? 'YES' : market.winning_outcome === noApi?.id ? 'NO' : undefined,
    auditHistory: transitions.map((transition) => ({
      id: transition.id,
      timestamp: transition.created_at,
      adminUser: transition.actor_email ?? 'Market Admin',
      action: transition.action ?? `${transition.from_status} to ${transition.to_status}`,
      note: transition.notes,
    })),
  };
}

async function fetchSports(): Promise<SportResource[]> {
  const response = await apiClient.get('/sports/');
  return normalizeApiList<SportResource>(response.data);
}

async function resolveMarketCatalogue(input: MarketDetailsInput): Promise<Pick<MarketAdminPayload, 'sport_id' | 'category_id'>> {
  if (input.sportId && input.categoryId) return { sport_id: input.sportId, category_id: input.categoryId };
  const [sports, categories] = await Promise.all([
    fetchSports(),
    apiClient.get('/markets/categories/').then((response) => normalizeApiList<ApiMarketCategory>(response.data)),
  ]);
  const sport =
    sports.find((item) => item.name.toLowerCase() === input.category.toLowerCase()) ??
    sports.find((item) => item.name.toLowerCase() === 'football') ??
    sports[0];
  const category =
    categories.find((item) => item.name.toLowerCase() === 'match result') ??
    categories.find((item) => item.name.toLowerCase() === input.category.toLowerCase()) ??
    categories[0];

  if (!sport) fail('No active sport catalogue is available. Seed sports before creating markets.');
  if (!category) fail('No active market category is available. Seed market categories before creating markets.');

  return { sport_id: sport.id, category_id: category.id };
}

function lifecycleNote(market: Market, action: string): { notes: string } {
  return { notes: `${action}: ${market.question}` };
}

/* ============================================================
   MARKETS
   ============================================================ */

export async function fetchMarkets(): Promise<Market[]> {
  try {
    const records = await fetchAllPages<ApiAdminMarket>(
      '/market-admin/markets/',
    );

    return records.map(adaptApiMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchMarket(id: string): Promise<Market> {
  try {
    const response = await apiClient.get(`/market-admin/markets/${encodeURIComponent(id)}/`);
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export interface MarketStats {
  volumeUgx: number;
  fillCount: number;
}

/** Real fill-derived UGX volume + contract counts, keyed by market id. */
export async function fetchMarketAdminStats(marketIds: string[]): Promise<Map<string, MarketStats>> {
  if (marketIds.length === 0) return new Map();

  try {
    const response = await apiClient.get('/market-admin/markets/stats/', {
      params: { market_ids: marketIds.join(',') },
    });
    const data = response.data as {
      markets: Array<{ market_id: string; total_volume_ugx: string; fill_count: number }>;
    };
    return new Map(
      data.markets.map((item) => [
        item.market_id,
        { volumeUgx: Number(item.total_volume_ugx), fillCount: item.fill_count },
      ]),
    );
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchPublishedMarkets(): Promise<Market[]> {
  try {
    const statuses = [
      'OPEN',
      'APPROVED',
      'SUSPENDED',
      'CLOSED',
      'RESOLVED',
      'VOIDED',
    ] as const;

    const groups = await Promise.all(
      statuses.map((status) =>
        fetchAllPages<ApiMarket>(
          '/markets/',
          { status },
        ),
      ),
    );

    return groups
      .flat()
      .map(adaptApiMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchFeaturedPublishedMarkets(limit = 5): Promise<Market[]> {
  try {
    const response = await apiClient.get('/markets/', { params: { status: 'OPEN', is_featured: true } });
    return normalizeApiList<ApiMarket>(response.data).map(adaptApiMarket).slice(0, limit);
  } catch (error) {
    throw apiError(error);
  }
}

export async function createMarketDraft(input: MarketDetailsInput): Promise<Market> {
  if (!input.eventLabel.trim()) fail('Select an event for this market.');
  const question = input.question.trim();
  if (question.length < 6 || !question.endsWith('?')) {
    fail('Enter a single, unambiguous YES/NO question ending with a question mark.');
  }

  try {
    const catalogue = await resolveMarketCatalogue(input);
    const eventLabel = input.eventLabel.trim();
    const description = input.description.trim();
    const opensAtMs = Date.now() - 60_000;
    // If kickoff is in the past (or missing), default closes_at to 1 hour from
    // opens_at so the backend never receives closes_at <= opens_at.
    const kickoffMs = input.kickoff ? new Date(input.kickoff).getTime() : 0;
    const closesAtMs = kickoffMs > opensAtMs ? kickoffMs : opensAtMs + 60 * 60_000;
    const payload: MarketAdminPayload = {
      ...catalogue,
      ...marketScopePayload(input),
      question,
      description,
      rules: description || `Resolve this market from the official result for ${eventLabel}.`,
      resolution_source: input.competition.trim() || 'Official competition result',
      resolution_criteria: description || `Use the verified final result for ${eventLabel} to resolve YES or NO.`,
      opens_at: new Date(opensAtMs).toISOString(),
      closes_at: new Date(closesAtMs).toISOString(),
      is_featured: input.tags.some((tag) => tag.toLowerCase() === 'featured'),
      yes_label: 'Yes',
      no_label: 'No',
    };
    const response = await apiClient.post('/market-admin/markets/', payload);
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function updateMarketResolution(id: string, input: { resolutionSource: string; resolutionCriteria: string; rules: string }): Promise<Market> {
  if (!input.resolutionSource.trim() || !input.resolutionCriteria.trim() || !input.rules.trim()) {
    fail('Resolution source, criteria, and rules / void conditions are required.');
  }
  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/`, {
      resolution_source: input.resolutionSource.trim(),
      resolution_criteria: input.resolutionCriteria.trim(),
      rules: input.rules.trim(),
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) { throw apiError(error); }
}

export async function updateOutcomes(id: string, outcomes: OutcomeInput[]): Promise<Market> {
  const yes = outcomes.find((outcome) => outcome.id === 'YES');
  const no = outcomes.find((outcome) => outcome.id === 'NO');
  if (!yes || !no) fail('Both YES and NO outcomes are required.');
  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/`, {
      yes_label: yes.label.trim() || 'Yes',
      no_label: no.label.trim() || 'No',
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function configureOpeningPricing(id: string, faceValueUgx: number, yesProbability: number): Promise<Market> {
  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/opening-pricing/`, {
      face_value_ugx: faceValueUgx,
      yes_probability: yesProbability,
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) { throw apiError(error); }
}

export async function setParameters(id: string, parameters: MarketParameters): Promise<Market> {
  // Validate the exact timestamps that will be sent to the backend.
  // Do not silently clamp opens_at after validation.
  const opensAtMs = new Date(parameters.opensAt).getTime();
  const closesAtMs = new Date(parameters.closesAt).getTime();
  const settlesMs = new Date(parameters.settlesBy).getTime();

  if ([opensAtMs, closesAtMs, settlesMs].some((value) => !Number.isFinite(value))) {
    fail('Trading opens, trading closes, and settlement target are required.');
  }

  if (closesAtMs <= opensAtMs) {
    fail('Trading must close after it opens.');
  }
  if (settlesMs < closesAtMs) {
    fail('Settlement time must be at or after the trading close time.');
  }
  if (parameters.minTradeUgx <= 0 || parameters.maxTradeUgx < parameters.minTradeUgx) {
    fail('Enter a valid minimum and maximum trade amount.');
  }
  if (parameters.initialLiquidityUgx < 0 || parameters.openingSpreadBps < 0 || parameters.openingSpreadBps > 5000) {
    fail('Opening liquidity must be zero or more and spread must be between 0% and 50%.');
  }

  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/`, {
      opens_at: parameters.opensAt,
      closes_at: parameters.closesAt,
      settles_by: parameters.settlesBy,
      is_featured: parameters.featured,
      initial_liquidity_ugx: parameters.initialLiquidityUgx,
      liquidity_source: parameters.liquiditySource,
      opening_spread_bps: parameters.openingSpreadBps,
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function publishMarket(id: string): Promise<Market> {
  try {
      let market = await fetchMarket(id);
      const detail = await apiClient.get(`/market-admin/markets/${encodeURIComponent(id)}/`);
      let backendMarket = detail.data as ApiAdminMarket;

      if (backendMarket.status === 'DRAFT' || backendMarket.status === 'REJECTED') {
        const submitted = await apiClient.post(
          `/market-admin/markets/${encodeURIComponent(id)}/submit/`,
          lifecycleNote(market, 'Submitted'),
        );
        backendMarket = submitted.data as ApiAdminMarket;
        market = adaptApiMarket(backendMarket);
      }

      if (backendMarket.status === 'PENDING_APPROVAL') {
        const approved = await apiClient.post(
          `/market-admin/markets/${encodeURIComponent(id)}/approve/`,
          lifecycleNote(market, 'Approved'),
        );
        backendMarket = approved.data as ApiAdminMarket;
        market = adaptApiMarket(backendMarket);
      }

      if (backendMarket.status === 'APPROVED') {
        const opened = await apiClient.post(
          `/market-admin/markets/${encodeURIComponent(id)}/open/`,
          lifecycleNote(market, 'Opened'),
        );
        backendMarket = opened.data as ApiAdminMarket;
      }

      return adaptApiMarket(backendMarket);
  } catch (error) {
    throw apiError(error);
  }
}

// Recovery path for a market stuck at APPROVED after a failed open() (e.g.
// missing treasury provider) — moves it back to DRAFT so the wizard can
// edit and resubmit it instead of dead-ending.
export async function revertMarketToDraft(id: string, reason: string): Promise<Market> {
  if (!reason.trim()) fail('A reason is required to revert this market to draft.');
  try {
    const response = await apiClient.post(
      `/market-admin/markets/${encodeURIComponent(id)}/revert-to-draft/`,
      { notes: reason.trim() },
    );
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function cancelMarket(id: string, reason: string): Promise<Market> {
  if (!reason.trim()) fail('A cancellation reason is required.');
  try {
      const market = await fetchMarket(id);
      if (market.status !== 'Live' && market.status !== 'Upcoming') {
        fail('Only open backend markets can be closed from this screen.');
      }
      const response = await apiClient.post(`/market-admin/markets/${encodeURIComponent(id)}/close/`, { notes: reason.trim() });
      return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function suspendMarket(id: string, reason: string): Promise<Market> {
  if (!reason.trim()) fail('A suspension reason is required.');
  try {
    const market = await fetchMarket(id);
    if (market.status !== 'Live' && market.status !== 'Upcoming') {
      fail('Only open markets can be suspended.');
    }
    const response = await apiClient.post(`/market-admin/markets/${encodeURIComponent(id)}/suspend/`, { notes: reason.trim() });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function reopenMarket(id: string): Promise<Market> {
  try {
    const market = await fetchMarket(id);
    if (market.status !== 'Suspended') {
      fail('Only suspended markets can be reopened.');
    }
    const response = await apiClient.post(
      `/market-admin/markets/${encodeURIComponent(id)}/reopen/`,
      lifecycleNote(market, 'Reopened'),
    );
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    throw apiError(error);
  }
}

/** Settles a market through the backend's authoritative resolution workflow. */
export async function resolveMarket(id: string, winningOutcomeId: OutcomeId, evidence: string): Promise<Market> {
  try {
    const market = await fetchMarket(id);
    const winner = market.outcomes.find((outcome) => outcome.id === winningOutcomeId);
    if (!winner?.backendOutcomeId) fail('Winning outcome not found.');
    const response = await apiClient.post(`/market-admin/markets/${encodeURIComponent(id)}/resolve/`, {
      winning_outcome_id: winner.backendOutcomeId, notes: `Resolved ${market.question}`,
      evidence: evidence.trim(),
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) { throw apiError(error); }
}

/* ============================================================
   PROPOSALS
   ============================================================ */

export async function fetchProposals(): Promise<MarketProposal[]> {
  try {
    const response = await apiClient.get('/market-admin/proposals/');
    return normalizeApiList<Record<string, unknown>>(response.data).map(adaptProposal);
  } catch (error) { throw apiError(error); }
}
function proposalStatus(status: unknown): ProposalStatus {
  if (status === 'UNDER_REVIEW') return 'Under Review';
  if (status === 'APPROVED') return 'Converted';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'DUPLICATE') return 'Duplicate';
  return 'New';
}

function adaptProposal(value: Record<string, unknown>): MarketProposal {
  return {
    id: String(value.id), submittedBy: value.proposer_id ? String(value.proposer_id) : 'Unknown participant',
    eventLabel: String(value.proposed_event_title || 'Event not specified'),
    suggestedQuestion: String(value.question ?? ''), suggestedRules: String(value.resolution_criteria ?? value.description ?? ''),
    status: proposalStatus(value.status), createdAt: String(value.submitted_at ?? value.created_at ?? ''),
    duplicateOfMarketId: value.duplicate_of_market ? String(value.duplicate_of_market) : undefined,
    auditHistory: [],
  };
}

async function decideProposal(id: string, action: 'START_REVIEW'|'APPROVE'|'REJECT'|'MARK_DUPLICATE', reason = ''): Promise<MarketProposal> {
  try {
    const response = await apiClient.post(`/market-admin/proposals/${encodeURIComponent(id)}/review/`, { action, reason });
    return adaptProposal(response.data as Record<string, unknown>);
  } catch (error) { throw apiError(error); }
}
export const startProposalReview = (id: string): Promise<MarketProposal> => decideProposal(id, 'START_REVIEW');

export const convertProposalToDraft = (id: string): Promise<MarketProposal> =>
  decideProposal(id, 'APPROVE');

export const rejectProposal = (id: string, note: string): Promise<MarketProposal> => {
  if (!note.trim()) fail('A rejection note is required.');
  return decideProposal(id, 'REJECT', note.trim());
};

export const markProposalDuplicate = (id: string, note: string): Promise<MarketProposal> => {
  void id;
  if (!note.trim()) fail('Explain which market this duplicates.');
  return Promise.reject(new Error('Select a specific duplicate market or proposal before marking this proposal as a duplicate.'));
};

export const returnProposal = async (...args: [string?, string?]): Promise<MarketProposal> => {
  void args;
  throw new Error('Return for Changes is not supported by the current workflow.');
};

export const requestProposalInfo = async (...args: [string?, string?]): Promise<MarketProposal> => {
  void args;
  throw new Error('Request More Information is not supported by the current workflow.');
};

export async function fetchOrderBook(marketId: string): Promise<OrderBook> {
  try {
    const market = await fetchMarket(marketId); const outcome = market.outcomes[0];
    if (!outcome?.backendOutcomeId) fail('This market has no backend outcome identity.');
    const response = await apiClient.get(`/markets/${encodeURIComponent(marketId)}/outcomes/${encodeURIComponent(outcome.backendOutcomeId)}/order-book/`);
    const data = response.data as { bids:Array<{price:string;quantity:string;order_count:number}>; asks:Array<{price:string;quantity:string;order_count:number}>; recent_trades:Array<{id:string;price:string;quantity:string;executed_at:string}>; spread:string|null };
    return { marketId, outcomeId: outcome.id,
      bids: data.bids.map((level) => ({ price: normalizedPriceToUgxSharePrice(Number(level.price), market.faceValueUgx), quantity: Number(level.quantity), shares: backendQuantityToShares(Number(level.quantity), market.faceValueUgx), orderCount: level.order_count })),
      asks: data.asks.map((level) => ({ price: normalizedPriceToUgxSharePrice(Number(level.price), market.faceValueUgx), quantity: Number(level.quantity), shares: backendQuantityToShares(Number(level.quantity), market.faceValueUgx), orderCount: level.order_count })),
      recentTrades: data.recent_trades.map((trade) => ({ id: String(trade.id), price: normalizedPriceToUgxSharePrice(Number(trade.price), market.faceValueUgx), quantity: Number(trade.quantity), shares: backendQuantityToShares(Number(trade.quantity), market.faceValueUgx), executedAt: String(trade.executed_at) })),
      lastPrice: data.recent_trades[0] ? normalizedPriceToUgxSharePrice(Number(data.recent_trades[0].price), market.faceValueUgx) : null,
      spread: data.spread === null ? null : normalizedPriceToUgxSharePrice(Number(data.spread), market.faceValueUgx),
    };
  } catch (error) { throw apiError(error); }
}
