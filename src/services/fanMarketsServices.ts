import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils.ts';
import type { Market as ApiMarket, MarketCategory as ApiMarketCategory } from '../types/api.ts';
import {
  backendQuantityToShares,
  normalizedPriceToUgxSharePrice,
  sharesToBackendQuantity,
  stakeUgxToBackendQuantity,
} from '../utils/marketPricing.ts';

export type MarketStatus = 'live' | 'upcoming' | 'suspended' | 'closed' | 'resolved' | 'voided';
export type AdminMarketStatus = 'Draft' | 'Pending Approval' | 'Upcoming' | 'Live' | 'Suspended' | 'Closed' | 'Resolved' | 'Voided' | 'Cancelled';
export type OutcomeId = 'YES' | 'NO';
export type MarketCategoryName = string;

export const MARKET_CATEGORIES = ['Football', 'Rugby', 'Basketball', 'Cricket', 'Athletics', 'Esports', 'Other'] as const;

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
  isTrending: boolean;
  liveMinute?: string;
  scheduleLabel?: string;
  marketType: string;
  endsInLabel: string;
  volumeLabel: string | null;
  question: string;
  yesPrice: number | null;
  noPrice: number | null;
  changePct: number | null;
  tradersCount: number | null;
  totalContractsLabel: string | null;
  createdAt: string; // ISO string — used to sort newest-first
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
  probabilityPct: number | null;
  price: number | null;
  openingReference: number | null;
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
  faceValueUgx: number;
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
  filledQuantityUgx: number;
  remainingQuantityUgx: number;
  averageFillPrice: number | null;
  payoutUgx?: number;
}

export interface Position {
  contract: Contract;
  market: Market;
  portfolio: PortfolioPosition;
}

export interface PlaceOrderInput {
  marketId: string;
  outcomeId: OutcomeId;
  quantityUgx: number;
  limitPrice: number;
}

export interface SellOrderInput {
  marketId: string;
  backendOutcomeId: string;
  outcomeId: OutcomeId;
  shares: number;
  limitPrice: number;
}

export interface MarketOrderBookLevel { price: string; quantity: string; order_count: number }
export interface MarketRecentTrade { id: string; price: string; quantity: string; executed_at: string }
export interface MarketOrderBook {
  market_id: string;
  outcome: { id: string; side: string; label: string };
  best_bid: string | null;
  best_ask: string | null;
  spread: string | null;
  total_bid_quantity: string;
  total_ask_quantity: string;
  bids: MarketOrderBookLevel[];
  asks: MarketOrderBookLevel[];
  recent_trades: MarketRecentTrade[];
}
export interface RawPriceHistoryPoint { fill_id: string; executed_at: string; price: string; quantity: string }
export interface AggregatePriceHistoryPoint {
  bucket_start: string; open: string; high: string; low: string; close: string; volume: string; trade_count: number;
}
interface PriceHistoryBase { market_id: string; outcome_id: string; start?: string | null; end?: string | null }
export interface RawPriceHistoryResponse extends PriceHistoryBase { interval: 'RAW'; points: RawPriceHistoryPoint[] }
export interface AggregatePriceHistoryResponse extends PriceHistoryBase { interval: 'HOUR' | 'DAY'; points: AggregatePriceHistoryPoint[] }
export type MarketPriceHistory = RawPriceHistoryResponse | AggregatePriceHistoryResponse;
export interface PriceHistoryOptions { interval?: 'RAW' | 'HOUR' | 'DAY'; start?: string; end?: string; limit?: number }

export interface PortfolioPosition {
  id: string; marketId: string; backendOutcomeId: string; outcomeLabel: string; marketStatus: string;
  quantity: number; availableQuantity: number; reservedQuantity: number; averageEntryPrice: number;
  totalCostBasis: number; realizedPnl: number; markPrice: number | null; markSource: string;
  marketValue: number | null; unrealizedPnl: number | null; totalPositionPnl: number | null;
  valuationComplete: boolean; openSellOrderCount: number; reservedSellOrderQuantity: number;
}

export interface PortfolioPositionApi {
  id: string;
  market_id: string;
  outcome_id: string;
  market_question: string;
  outcome_label: string;
  market_status: string;
  quantity: string;
  available_quantity: string;
  reserved_quantity: string;
  average_entry_price: string;
  total_cost_basis: string;
  market_value: string | null;
  mark_price: string | null;
  mark_source: string;
  realized_pnl: string;
  unrealized_pnl: string | null;
  total_position_pnl: string | null;
  valuation_complete: boolean;
  open_sell_order_count: number;
  reserved_sell_order_quantity: string;
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


const PUBLIC_CATALOGUE_STATUSES = [
  'OPEN',
  'APPROVED',
  'SUSPENDED',
  'CLOSED',
  'RESOLVED',
  'VOIDED',
] as const;

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

async function fetchVisibleMarketApiRecords(): Promise<ApiMarket[]> {
  const groups = await Promise.all(
    PUBLIC_CATALOGUE_STATUSES.map((status) =>
      fetchAllPages<ApiMarket>(
        '/markets/',
        { status },
      ),
    ),
  );

  return groups.flat();
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

function statusFromApi(
  market: ApiMarket,
): AdminMarketStatus {
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

function listStatusFromMarket(
  market: Market,
): MarketStatus {
  if (market.status === 'Live') return 'live';
  if (market.status === 'Upcoming') return 'upcoming';
  if (market.status === 'Suspended') return 'suspended';
  if (market.status === 'Resolved') return 'resolved';
  if (market.status === 'Voided') return 'voided';

  return 'closed';
}

function adaptMarket(market: ApiMarket): Market {
  const subject = market.subject?.name || market.sporting_event?.name || market.question;
  const [teamA, teamB] = splitSubject(subject);
  const yesApi = market.outcomes.find((outcome) => outcome.side === 'YES') ?? market.outcomes[0];
  const noApi = market.outcomes.find((outcome) => outcome.side === 'NO') ?? market.outcomes[1];
  const status = statusFromApi(market);
  const kickoff = market.sporting_event?.starts_at ?? market.closes_at ?? market.opens_at ?? market.created_at ?? new Date().toISOString();
  const outcomePrice = (outcomeId?: string) => {
    if (!outcomeId) return null;
    const raw = market.trading_snapshot?.outcomes[outcomeId]?.mark_price;
    return raw == null ? null : normalizedPriceToUgxSharePrice(Number(raw), market.face_value_ugx);
  };

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
        probabilityPct: outcomePrice(yesApi.id) === null ? null : Number(market.trading_snapshot?.outcomes[yesApi.id]?.mark_price) * 100,
        price: outcomePrice(yesApi.id),
        openingReference: market.opening_reference?.YES == null ? null : normalizedPriceToUgxSharePrice(Number(market.opening_reference.YES), market.face_value_ugx),
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
        openingReference: market.opening_reference?.NO == null ? null : normalizedPriceToUgxSharePrice(Number(market.opening_reference.NO), market.face_value_ugx),
        bestBid: market.trading_snapshot?.outcomes[noApi.id]?.best_bid == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].best_bid), market.face_value_ugx),
        bestAsk: market.trading_snapshot?.outcomes[noApi.id]?.best_ask == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].best_ask), market.face_value_ugx),
        lastTrade: market.trading_snapshot?.outcomes[noApi.id]?.last_trade == null ? null : normalizedPriceToUgxSharePrice(Number(market.trading_snapshot.outcomes[noApi.id].last_trade), market.face_value_ugx),
        markSource: market.trading_snapshot?.outcomes[noApi.id]?.mark_source,
      },
    ].filter(Boolean) as Outcome[],
    faceValueUgx: market.face_value_ugx,
    parameters: {
      opensAt: market.opens_at ?? market.created_at ?? new Date().toISOString(),
      closesAt: market.closes_at ?? kickoff,
      settlesBy: market.settles_by ?? market.closes_at ?? kickoff,
      initialLiquidityUgx: 0,
      liquiditySource: 'PLATFORM_TREASURY',
      openingSpreadBps: 0,
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
    isTrending: market.parameters.trending,
    scheduleLabel: market.status === 'Upcoming' ? formatDateTime(market.parameters.opensAt) : undefined,
    marketType: market.category,
    endsInLabel: formatDurationUntil(market.parameters.closesAt),
    volumeLabel: null,
    question: market.question,
    yesPrice: yes?.price ?? null,
    noPrice: no?.price ?? null,
    changePct: null,
    tradersCount: null,
    totalContractsLabel: null,
    createdAt: market.createdAt,
  };
}

export async function fetchMarkets(): Promise<MarketListItem[]> {
  try {
    const records = await fetchVisibleMarketApiRecords();

    return records
      .map(adaptMarket)
      .map(adaptListItem);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchPublishedMarkets(): Promise<Market[]> {
  try {
    const records = await fetchVisibleMarketApiRecords();

    return records.map(adaptMarket);
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

export async function fetchMarketOrderBook(marketId: string, backendOutcomeId: string): Promise<MarketOrderBook> {
  try {
    const response = await apiClient.get(`/markets/${encodeURIComponent(marketId)}/outcomes/${encodeURIComponent(backendOutcomeId)}/order-book/`);
    return response.data as MarketOrderBook;
  } catch (error) { throw apiError(error); }
}

export async function fetchMarketPriceHistory(
  marketId: string, backendOutcomeId: string, options: PriceHistoryOptions = {},
): Promise<MarketPriceHistory> {
  try {
    const response = await apiClient.get(`/markets/${encodeURIComponent(marketId)}/outcomes/${encodeURIComponent(backendOutcomeId)}/price-history/`, { params: options });
    return response.data as MarketPriceHistory;
  } catch (error) { throw apiError(error); }
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
    const marketsById = await fetchPositionMarkets(positions);
    return positions.map((position) => {
      const faceValueUgx = marketsById.get(position.market_id)?.faceValueUgx;
      if (!faceValueUgx) throw new Error(`Market ${position.market_id} has no authoritative face value.`);
      const avgPrice =
        Number(position.average_entry_price) *
        faceValueUgx;

      const backendQuantity =
        Number(
          position.available_quantity ||
          position.quantity,
        );

      const quantity =
        backendQuantityToShares(
          backendQuantity,
          faceValueUgx,
        );

      return {
        id: position.id,
        marketId: position.market_id,
        question: position.market_question,
        side:
          position.outcome_label
            .toLowerCase()
            .includes('no')
            ? 'No'
            : 'Yes',
        quantity,
        price: avgPrice,
        value: Number(
          position.market_value ??
          position.total_cost_basis,
        ),
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
        const backendQuantity =
          Number(
            position.available_quantity ||
            position.quantity,
          );

        const shares =
          backendQuantityToShares(
          backendQuantity,
            market.faceValueUgx,
          );

        const price = normalizedPriceToUgxSharePrice(Number(position.average_entry_price), market.faceValueUgx);
        const portfolio: PortfolioPosition = {
          id: position.id, marketId: position.market_id, backendOutcomeId: position.outcome_id,
          outcomeLabel: position.outcome_label, marketStatus: position.market_status,
          quantity: backendQuantityToShares(Number(position.quantity), market.faceValueUgx), availableQuantity: shares,
          reservedQuantity: backendQuantityToShares(Number(position.reserved_quantity), market.faceValueUgx), averageEntryPrice: price,
          totalCostBasis: Number(position.total_cost_basis), realizedPnl: Number(position.realized_pnl),
          markPrice: position.mark_price === null ? null : normalizedPriceToUgxSharePrice(Number(position.mark_price), market.faceValueUgx),
          markSource: position.mark_source, marketValue: position.market_value === null ? null : Number(position.market_value),
          unrealizedPnl: position.unrealized_pnl === null ? null : Number(position.unrealized_pnl),
          totalPositionPnl: position.total_position_pnl === null ? null : Number(position.total_position_pnl),
          valuationComplete: position.valuation_complete, openSellOrderCount: position.open_sell_order_count,
          reservedSellOrderQuantity: backendQuantityToShares(Number(position.reserved_sell_order_quantity), market.faceValueUgx),
        };

        return {
          contract: {
            id: position.id,
            marketId: position.market_id,
            outcomeId:
              outcome?.id ??
              (
                position.outcome_label
                  .toLowerCase()
                  .includes('no')
                  ? 'NO'
                  : 'YES'
              ),
            price,
            quantityUgx:
              shares * price,
            buyer: 'You',
            seller: 'Market',
            matchedAt: position.created_at,
            status: position.market_status,
          },
          market,
          portfolio,
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
    const limitPrice = input.limitPrice;
    if (!(limitPrice > 0 && limitPrice < 1)) throw new Error('A genuine executable quote is required.');

    const quantity =
      Math.max(
        0.0001,
        stakeUgxToBackendQuantity(
          input.quantityUgx,
          limitPrice,
        ),
      );
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
      price: Number(order.limit_price) * market.faceValueUgx,
      quantityUgx: Number(order.quantity) * Number(order.limit_price),
      buyer: 'You',
      seller: 'Market',
      matchedAt: order.created_at,
      status: order.status,
      filledQuantityUgx: Number(order.filled_quantity) * Number(order.average_fill_price ?? order.limit_price),
      remainingQuantityUgx: (Number(order.quantity) - Number(order.filled_quantity)) * Number(order.limit_price),
      averageFillPrice: order.average_fill_price === null ? null : normalizedPriceToUgxSharePrice(Number(order.average_fill_price), market.faceValueUgx),
    };
  } catch (error) {
    if (error instanceof Error && !('response' in error)) throw error;
    throw apiError(error);
  }
}

export async function sellPosition(input: SellOrderInput): Promise<Contract> {
  if (!(input.limitPrice > 0 && input.limitPrice < 1)) throw new Error('A genuine executable quote is required.');
  try {
    const market = await fetchMarket(input.marketId);
    const quantity = sharesToBackendQuantity(input.shares, market.faceValueUgx);
    if (quantity < 0.0001) throw new Error('Enter a valid number of shares.');
    const response = await apiClient.post(`/markets/${encodeURIComponent(input.marketId)}/orders/`, {
      outcome_id: input.backendOutcomeId, side: 'SELL', quantity: quantity.toFixed(4),
      limit_price: input.limitPrice.toFixed(5), time_in_force: 'GTC',
    });
    const order = response.data as MarketOrderApi;
    return {
      id: order.id, marketId: order.market, outcomeId: input.outcomeId,
      price: normalizedPriceToUgxSharePrice(Number(order.limit_price), market.faceValueUgx),
      quantityUgx: Number(order.quantity) * Number(order.limit_price), buyer: 'Market', seller: 'You',
      matchedAt: order.created_at, status: order.status,
      filledQuantityUgx: Number(order.filled_quantity) * Number(order.average_fill_price ?? order.limit_price),
      remainingQuantityUgx: (Number(order.quantity) - Number(order.filled_quantity)) * Number(order.limit_price),
      averageFillPrice: order.average_fill_price === null ? null : normalizedPriceToUgxSharePrice(Number(order.average_fill_price), market.faceValueUgx),
    };
  } catch (error) { throw apiError(error); }
}
