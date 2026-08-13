// Market Admin service. The backend is authoritative for catalogue,
// lifecycle, proposals, fills, and order-book state.

import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList } from './apiUtils.ts';
import type {
  AdminMarket as ApiAdminMarket,
  Market as ApiMarket,
  MarketCategory as ApiMarketCategory,
  SportResource,
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

export type MarketStatus = 'Draft' | 'Upcoming' | 'Live' | 'Suspended' | 'Resolved' | 'Voided' | 'Cancelled';
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
}

export interface MarketParameters {
  opensAt: string;
  closesAt: string;
  settlesBy: string;
  initialLiquidityUgx: number;
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
  parameters: MarketParameters;
  status: MarketStatus;
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
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

function isUuid(value?: string): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function backendStatusToAdminStatus(market: ApiMarket): MarketStatus {
  if (market.status === 'DRAFT' || market.status === 'REJECTED' || market.status === 'PENDING_APPROVAL' || market.status === 'APPROVED') {
    return 'Draft';
  }
  if (market.status === 'RESOLVED') return 'Resolved';
  if (market.status === 'VOIDED') return 'Voided';
  if (market.status === 'SUSPENDED') return 'Suspended';
  if (market.status === 'CANCELLED' || market.status === 'CLOSED') return 'Cancelled';
  return market.sporting_event?.starts_at && new Date(market.sporting_event.starts_at).getTime() > Date.now() ? 'Upcoming' : 'Live';
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

  return {
    id: market.id,
    sportingEventId: market.sporting_event?.id,
    eventLabel: subject,
    competition: market.sporting_event?.competition?.name ?? market.competition?.name ?? market.sport?.name ?? 'League OS',
    venue: market.sporting_event?.venue ?? 'Venue TBA',
    kickoff,
    category: ((market.sport?.name ?? market.category?.name ?? 'Other') as MarketCategory),
    question: market.question,
    description: market.description ?? '',
    tags: [market.category?.slug, market.sport?.code].filter(Boolean) as string[],
    outcomes: [
      yesApi && {
        id: 'YES' as const,
        backendOutcomeId: yesApi.id,
        label: yesApi.label || 'Yes',
        description: yesApi.description ?? '',
        probabilityPct: null,
        price: null,
      },
      noApi && {
        id: 'NO' as const,
        backendOutcomeId: noApi.id,
        label: noApi.label || 'No',
        description: noApi.description ?? '',
        probabilityPct: null,
        price: null,
      },
    ].filter(Boolean) as Outcome[],
    parameters: {
      opensAt: market.opens_at ?? market.created_at ?? new Date().toISOString(),
      closesAt: market.closes_at ?? kickoff,
      settlesBy: market.closes_at ?? kickoff,
      initialLiquidityUgx: 0,
      minTradeUgx: 1_000,
      maxTradeUgx: 500_000,
      feePct: 2,
      featured: market.is_featured,
      trending: market.is_featured,
      recommended: market.is_featured,
      inPlayTrading: status === 'Live',
    },
    status,
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
    const response = await apiClient.get('/market-admin/markets/');
    return normalizeApiList<ApiAdminMarket>(response.data).map(adaptApiMarket);
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
    const response = await apiClient.get('/markets/', { params: { status: 'OPEN' } });
    return normalizeApiList<ApiMarket>(response.data).map(adaptApiMarket);
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
    const eventId = isUuid(input.sportingEventId) ? input.sportingEventId : undefined;
    const eventLabel = input.eventLabel.trim();
    const description = input.description.trim();
    const payload: MarketAdminPayload = {
      ...catalogue,
      scope_type: eventId ? 'EVENT' : 'CUSTOM',
      sporting_event_id: eventId ?? null,
      custom_subject: eventId ? '' : eventLabel,
      question,
      description,
      rules: description || `Resolve this market from the official result for ${eventLabel}.`,
      resolution_source: input.competition.trim() || 'Official competition result',
      resolution_criteria: description || `Use the verified final result for ${eventLabel} to resolve YES or NO.`,
      opens_at: new Date(Date.now() - 60_000).toISOString(),
      closes_at: input.kickoff || new Date(Date.now() + 60 * 60_000).toISOString(),
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

export async function setParameters(id: string, parameters: MarketParameters): Promise<Market> {
  if (new Date(parameters.closesAt).getTime() <= new Date(parameters.opensAt).getTime()) {
    fail('Trading must close after it opens.');
  }
  if (new Date(parameters.settlesBy).getTime() < new Date(parameters.closesAt).getTime()) {
    fail('Settlement time must be at or after the trading close time.');
  }
  if (parameters.minTradeUgx <= 0 || parameters.maxTradeUgx < parameters.minTradeUgx) {
    fail('Enter a valid minimum and maximum trade amount.');
  }

  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/`, {
      opens_at: new Date(Math.min(new Date(parameters.opensAt).getTime(), Date.now() - 60_000)).toISOString(),
      closes_at: parameters.closesAt,
      is_featured: parameters.featured,
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
export async function resolveMarket(id: string, winningOutcomeId: OutcomeId): Promise<Market> {
  try {
    const market = await fetchMarket(id);
    const winner = market.outcomes.find((outcome) => outcome.id === winningOutcomeId);
    if (!winner?.backendOutcomeId) fail('Winning outcome not found.');
    const response = await apiClient.post(`/market-admin/markets/${encodeURIComponent(id)}/resolve/`, {
      winning_outcome_id: winner.backendOutcomeId, notes: `Resolved ${market.question}`,
      evidence: 'Verified result evidence supplied through the result verification workflow.',
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
      bids: data.bids.map((level) => ({ price: normalizedPriceToUgxSharePrice(Number(level.price)), quantity: Number(level.quantity), shares: backendQuantityToShares(Number(level.quantity)), orderCount: level.order_count })),
      asks: data.asks.map((level) => ({ price: normalizedPriceToUgxSharePrice(Number(level.price)), quantity: Number(level.quantity), shares: backendQuantityToShares(Number(level.quantity)), orderCount: level.order_count })),
      recentTrades: data.recent_trades.map((trade) => ({ id: String(trade.id), price: normalizedPriceToUgxSharePrice(Number(trade.price)), quantity: Number(trade.quantity), shares: backendQuantityToShares(Number(trade.quantity)), executedAt: String(trade.executed_at) })),
      lastPrice: data.recent_trades[0] ? normalizedPriceToUgxSharePrice(Number(data.recent_trades[0].price)) : null,
      spread: data.spread === null ? null : normalizedPriceToUgxSharePrice(Number(data.spread)),
    };
  } catch (error) { throw apiError(error); }
}
