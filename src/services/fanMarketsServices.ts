import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList } from './apiUtils.ts';
import type { Market as ApiMarket, MarketCategory as ApiMarketCategory } from '../types/api.ts';

export type MarketStatus = 'live' | 'upcoming' | 'trending' | 'closed';
export type AdminMarketStatus = 'Draft' | 'Upcoming' | 'Live' | 'Resolved' | 'Voided' | 'Cancelled';
export type OutcomeId = 'YES' | 'NO';
export type MarketCategoryName = string;

export const MARKET_CATEGORIES = ['Football', 'Rugby', 'Basketball', 'Cricket', 'Athletics', 'Esports', 'Other'] as const;

const PAYOUT_PER_CONTRACT_UGX = 10_000;
const DEFAULT_PROBABILITY = 50;
const DEFAULT_MIN_TRADE_UGX = 1_000;
const DEFAULT_MAX_TRADE_UGX = 500_000;
const DEFAULT_FEE_PCT = 2;

export interface MarketListItem {
  id: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  league: string;
  status: MarketStatus;
  liveMinute?: string;
  scheduleLabel?: string;
  marketType: string;
  endsInLabel: string;
  volumeLabel: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  changePct: number;
  tradersCount: number;
  totalContractsLabel: string;
}

export interface MarketCategory {
  id: string;
  label: string;
  description: string;
}

export interface Outcome {
  id: OutcomeId;
  backendOutcomeId: string;
  label: string;
  description: string;
  probabilityPct: number;
  price: number;
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
  category: MarketCategoryName;
  question: string;
  description: string;
  tags: string[];
  outcomes: Outcome[];
  parameters: MarketParameters;
  status: AdminMarketStatus;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  resolvedAt?: string;
  winningOutcomeId?: OutcomeId;
  auditHistory: Array<{ id: string; timestamp: string; adminUser: string; action: string; note?: string }>;
}

export interface UserPosition {
  id: string;
  marketId: string;
  question: string;
  side: 'Yes' | 'No';
  quantity: number;
  price: number;
  value: number;
}

export interface Contract {
  id: string;
  marketId: string;
  outcomeId: OutcomeId;
  price: number;
  quantityUgx: number;
  buyer: string;
  seller: string;
  matchedAt: string;
  status: string;
  payoutUgx?: number;
}

export interface Position {
  contract: Contract;
  market: Market;
}

export interface PlaceOrderInput {
  marketId: string;
  outcomeId: OutcomeId;
  quantityUgx: number;
}

interface PortfolioPositionApi {
  id: string;
  market_id: string;
  outcome_id: string;
  market_question: string;
  outcome_label: string;
  market_status: string;
  quantity: string;
  available_quantity: string;
  average_entry_price: string;
  total_cost_basis: string;
  market_value: string | null;
  mark_price: string | null;
  created_at: string;
}

interface MarketOrderApi {
  id: string;
  market: string;
  outcome: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  limit_price: string;
  filled_quantity: string;
  average_fill_price: string | null;
  status: string;
  created_at: string;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

function splitSubject(subject: string): [string, string] {
  const separators = [' vs ', ' v ', ' - '];
  for (const separator of separators) {
    const parts = subject.split(separator);
    if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(separator).trim()];
  }
  return [subject || 'Market', ''];
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return 'TBA';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDurationUntil(iso?: string | null): string {
  if (!iso) return 'TBA';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diffMs)) return 'TBA';
  if (diffMs <= 0) return 'Closed';
  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function statusFromApi(market: ApiMarket): AdminMarketStatus {
  if (market.status === 'DRAFT') return 'Draft';
  if (market.status === 'RESOLVED') return 'Resolved';
  if (market.status === 'VOIDED') return 'Voided';
  if (market.status === 'CANCELLED' || market.status === 'CLOSED' || market.status === 'SUSPENDED') return 'Cancelled';
  return market.opens_at && new Date(market.opens_at).getTime() > Date.now() ? 'Upcoming' : 'Live';
}

function listStatusFromMarket(market: Market): MarketStatus {
  if (market.status === 'Live') return market.parameters.trending ? 'trending' : 'live';
  if (market.status === 'Upcoming') return 'upcoming';
  return 'closed';
}

function probabilityFromOutcome(outcome: ApiMarket['outcomes'][number], fallback: number): number {
  const text = `${outcome.label} ${outcome.description ?? ''}`;
  const match = text.match(/(\d{1,2})(?:\.\d+)?\s*%/);
  return match ? Math.max(1, Math.min(99, Number(match[1]))) : fallback;
}

function adaptMarket(market: ApiMarket): Market {
  const subject = market.subject?.name || market.sporting_event?.name || market.question;
  const [teamA, teamB] = splitSubject(subject);
  const yesApi = market.outcomes.find((outcome) => outcome.side === 'YES') ?? market.outcomes[0];
  const noApi = market.outcomes.find((outcome) => outcome.side === 'NO') ?? market.outcomes[1];
  const yesProbability = yesApi ? probabilityFromOutcome(yesApi, DEFAULT_PROBABILITY) : DEFAULT_PROBABILITY;
  const noProbability = noApi ? probabilityFromOutcome(noApi, 100 - yesProbability) : 100 - yesProbability;
  const status = statusFromApi(market);
  const kickoff = market.sporting_event?.starts_at ?? market.closes_at ?? market.opens_at ?? market.created_at ?? new Date().toISOString();

  return {
    id: market.id,
    sportingEventId: market.sporting_event?.id,
    eventLabel: teamB ? `${teamA} vs ${teamB}` : subject,
    competition: market.sporting_event?.competition?.name ?? market.competition?.name ?? market.sport?.name ?? 'League OS',
    venue: market.sporting_event?.venue ?? 'Venue TBA',
    kickoff,
    category: market.category?.name ?? market.sport?.name ?? 'Other',
    question: market.question,
    description: market.description ?? '',
    tags: [market.category?.slug, market.sport?.code].filter(Boolean) as string[],
    outcomes: [
      yesApi && {
        id: 'YES' as const,
        backendOutcomeId: yesApi.id,
        label: yesApi.label || 'Yes',
        description: yesApi.description ?? '',
        probabilityPct: yesProbability,
        price: Math.round((yesProbability / 100) * PAYOUT_PER_CONTRACT_UGX),
      },
      noApi && {
        id: 'NO' as const,
        backendOutcomeId: noApi.id,
        label: noApi.label || 'No',
        description: noApi.description ?? '',
        probabilityPct: noProbability,
        price: Math.round((noProbability / 100) * PAYOUT_PER_CONTRACT_UGX),
      },
    ].filter(Boolean) as Outcome[],
    parameters: {
      opensAt: market.opens_at ?? market.created_at ?? new Date().toISOString(),
      closesAt: market.closes_at ?? kickoff,
      settlesBy: market.closes_at ?? kickoff,
      initialLiquidityUgx: 0,
      minTradeUgx: DEFAULT_MIN_TRADE_UGX,
      maxTradeUgx: DEFAULT_MAX_TRADE_UGX,
      feePct: DEFAULT_FEE_PCT,
      featured: market.is_featured,
      trending: market.is_featured,
      recommended: market.is_featured,
      inPlayTrading: status === 'Live',
    },
    status,
    createdBy: 'Market Admin',
    createdAt: market.created_at ?? market.opens_at ?? new Date().toISOString(),
    publishedAt: market.opens_at,
    winningOutcomeId: market.winning_outcome === yesApi?.id ? 'YES' : market.winning_outcome === noApi?.id ? 'NO' : undefined,
    auditHistory: [],
  };
}

function adaptListItem(market: Market): MarketListItem {
  const [teamA, teamB] = splitSubject(market.eventLabel);
  const yes = market.outcomes.find((outcome) => outcome.id === 'YES');
  const no = market.outcomes.find((outcome) => outcome.id === 'NO');
  return {
    id: market.id,
    teamA,
    teamB: teamB || market.category,
    league: market.competition,
    status: listStatusFromMarket(market),
    scheduleLabel: market.status === 'Upcoming' ? formatDateTime(market.parameters.opensAt) : undefined,
    marketType: 'Yes / No',
    endsInLabel: formatDurationUntil(market.parameters.closesAt),
    volumeLabel: '0',
    question: market.question,
    yesPrice: yes?.price ?? 5_000,
    noPrice: no?.price ?? 5_000,
    changePct: 0,
    tradersCount: 0,
    totalContractsLabel: '0',
  };
}

export async function fetchMarkets(): Promise<MarketListItem[]> {
  try {
    const response = await apiClient.get('/markets/', { params: { status: 'OPEN' } });
    return normalizeApiList<ApiMarket>(response.data).map(adaptMarket).map(adaptListItem);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchPublishedMarkets(): Promise<Market[]> {
  try {
    const response = await apiClient.get('/markets/', { params: { status: 'OPEN' } });
    return normalizeApiList<ApiMarket>(response.data).map(adaptMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchMarket(id: string): Promise<Market> {
  try {
    const response = await apiClient.get(`/markets/${encodeURIComponent(id)}/`);
    return adaptMarket(response.data as ApiMarket);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchMarketCategories(): Promise<MarketCategory[]> {
  try {
    const response = await apiClient.get('/markets/categories/');
    return normalizeApiList<ApiMarketCategory>(response.data).map((category) => ({
      id: category.id,
      label: category.name,
      description: category.description ?? '',
    }));
  } catch (error) {
    throw apiError(error);
  }
}

async function fetchPositionMarkets(positions: PortfolioPositionApi[]): Promise<Map<string, Market>> {
  const ids = [...new Set(positions.map((position) => position.market_id))];
  const entries = await Promise.all(
    ids.map((id) => fetchMarket(id).then((market) => [id, market] as const).catch(() => null)),
  );
  return new Map(entries.filter(Boolean) as Array<readonly [string, Market]>);
}

export async function fetchMyPositions(): Promise<UserPosition[]> {
  try {
    const response = await apiClient.get('/markets/portfolio/positions/');
    const positions = normalizeApiList<PortfolioPositionApi>(response.data);
    return positions.map((position) => {
      const avgPrice = Number(position.average_entry_price) * PAYOUT_PER_CONTRACT_UGX;
      const quantity = Number(position.available_quantity || position.quantity);
      return {
        id: position.id,
        marketId: position.market_id,
        question: position.market_question,
        side: position.outcome_label.toLowerCase().includes('no') ? 'No' : 'Yes',
        quantity,
        price: avgPrice,
        value: Number(position.market_value ?? position.total_cost_basis) * PAYOUT_PER_CONTRACT_UGX,
      };
    });
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchFanPositions(): Promise<Position[]> {
  try {
    const response = await apiClient.get('/markets/portfolio/positions/');
    const positions = normalizeApiList<PortfolioPositionApi>(response.data);
    const marketsById = await fetchPositionMarkets(positions);
    return positions
      .map((position) => {
        const market = marketsById.get(position.market_id);
        if (!market) return null;
        const outcome = market.outcomes.find((item) => item.backendOutcomeId === position.outcome_id);
        const quantity = Number(position.available_quantity || position.quantity);
        const price = Number(position.average_entry_price) * PAYOUT_PER_CONTRACT_UGX;
        return {
          contract: {
            id: position.id,
            marketId: position.market_id,
            outcomeId: outcome?.id ?? (position.outcome_label.toLowerCase().includes('no') ? 'NO' : 'YES'),
            price,
            quantityUgx: quantity * price,
            buyer: 'You',
            seller: 'Market',
            matchedAt: position.created_at,
            status: position.market_status,
          },
          market,
        };
      })
      .filter(Boolean) as Position[];
  } catch (error) {
    throw apiError(error);
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<Contract> {
  try {
    const market = await fetchMarket(input.marketId);
    const outcome = market.outcomes.find((item) => item.id === input.outcomeId);
    if (!outcome) throw new Error('Select YES or NO.');

    const limitPrice = Math.max(0.00001, Math.min(0.99999, outcome.price / PAYOUT_PER_CONTRACT_UGX));
    const quantity = Math.max(0.0001, input.quantityUgx / PAYOUT_PER_CONTRACT_UGX);
    const response = await apiClient.post(`/markets/${encodeURIComponent(input.marketId)}/orders/`, {
      outcome_id: outcome.backendOutcomeId,
      side: 'BUY',
      quantity: quantity.toFixed(4),
      limit_price: limitPrice.toFixed(5),
      time_in_force: 'GTC',
    });
    const order = response.data as MarketOrderApi;
    return {
      id: order.id,
      marketId: order.market,
      outcomeId: input.outcomeId,
      price: Number(order.limit_price) * PAYOUT_PER_CONTRACT_UGX,
      quantityUgx: Number(order.quantity) * Number(order.limit_price) * PAYOUT_PER_CONTRACT_UGX,
      buyer: 'You',
      seller: 'Market',
      matchedAt: order.created_at,
      status: order.status,
    };
  } catch (error) {
    if (error instanceof Error && !('response' in error)) throw error;
    throw apiError(error);
  }
}
