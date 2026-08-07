/**
 * ------------------------------------------------------------------------
 * Fan-side Markets data layer
 * ------------------------------------------------------------------------
 * Every value returned from these functions (which matches are live, their
 * odds, volumes, categories, rules, order book, comments, positions, etc.)
 * is content that admins configure / the trading engine produces. This file
 * is the boundary the fan UI talks to; swap the mock bodies below for real
 * requests (e.g. `apiClient.get('/markets')`) once those endpoints exist.
 * ------------------------------------------------------------------------
 */

export type MarketStatus = 'live' | 'upcoming' | 'trending' | 'closed';

export interface MarketListItem {
  id: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  league: string;
  status: MarketStatus;
  liveMinute?: string;
  scheduleLabel?: string; // e.g. "Today 4:00 PM" for upcoming rows
  marketType: string;
  endsInLabel: string;
  volumeLabel: string;
  // Binary Yes/No market fields (matches the trading-terminal mockup)
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

export interface MarketOutcome {
  key: string;
  label: string;
  price: number;
  changePercent: number;
  probability: number;
  buyYesPrice: number;
  sellYesPrice: number;
  volumeLabel: string;
}

export interface MarketPosition {
  outcomeLabel: string;
  side: 'Yes' | 'No';
  avgPrice: number;
  currentPrice: number;
  contracts: number;
  pnl: number;
}

// Flat, cross-market position used by the Markets dashboard's "My Positions"
// widget (as opposed to MarketPosition, which is scoped to one market's
// detail page).
export interface UserPosition {
  id: string;
  marketId: string;
  question: string;
  side: 'Yes' | 'No';
  quantity: number;
  price: number;
  value: number;
}

export interface OrderBookRow {
  price: number;
  contracts: number;
}

export interface RecentTrade {
  price: number;
  contracts: number;
  time: string;
}

export interface MarketComment {
  id: string;
  author: string;
  level: number;
  timeAgo: string;
  body: string;
  likes: number;
  replies: number;
}

export interface InfoField {
  label: string;
  value: string;
}

export interface PriceHistoryPoint {
  label: string;
  values: Record<string, number>;
}

export interface MarketDetail {
  id: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  league: string;
  status: MarketStatus;
  liveMinute?: string;
  isWatchlisted: boolean;
  matchedVolumeLabel: string;
  totalContracts: string;
  endsInLabel: string;
  outcomes: MarketOutcome[];
  marketInfo: InfoField[];
  rules: InfoField[];
  positions: MarketPosition[];
  totals: { invested: string; currentValue: string; pnlLabel: string; pnlPct: string };
  stats: InfoField[];
  priceHistory: PriceHistoryPoint[];
  orderBook: { buyYes: OrderBookRow[]; sellYes: OrderBookRow[] };
  recentTrades: RecentTrade[];
  comments: MarketComment[];
  commentCount: number;
  meta: InfoField[];
}

const MOCK_MARKETS: MarketListItem[] = [
  {
    id: 'sc-villa-kcca',
    teamA: 'SC Villa',
    teamB: 'KCCA FC',
    crestA: '/clubs/sc-villa.png',
    crestB: '/clubs/kcca-fc.png',
    league: 'Uganda Premier League',
    status: 'live',
    liveMinute: "72'",
    marketType: 'Yes / No',
    endsInLabel: '17m 43s',
    volumeLabel: '58.7M',
    question: 'SC Villa Clean Sheet?',
    yesPrice: 2.15,
    noPrice: 1.85,
    changePct: 12,
    tradersCount: 1245,
    totalContractsLabel: '4,560',
  },
  {
    id: 'express-vipers',
    teamA: 'Express FC',
    teamB: 'Vipers SC',
    crestA: '/clubs/express-fc.png',
    crestB: '/clubs/vipers-sc.png',
    league: 'Uganda Premier League',
    status: 'live',
    liveMinute: "45'",
    marketType: 'Yes / No',
    endsInLabel: '32m 10s',
    volumeLabel: '32.1M',
    question: 'Express FC Win?',
    yesPrice: 2.4,
    noPrice: 1.6,
    changePct: 8,
    tradersCount: 812,
    totalContractsLabel: '2,340',
  },
  {
    id: 'cranes-tanzania',
    teamA: 'Uganda Cranes',
    teamB: 'Tanzania',
    league: 'International Friendly',
    status: 'upcoming',
    scheduleLabel: 'Tomorrow 3:00 PM',
    marketType: 'Yes / No',
    endsInLabel: '3h 25m',
    volumeLabel: '21.5M',
    question: 'Uganda Cranes Win?',
    yesPrice: 2.1,
    noPrice: 1.8,
    changePct: 5,
    tradersCount: 654,
    totalContractsLabel: '1,820',
  },
  {
    id: 'arsenal-mancity',
    teamA: 'Arsenal',
    teamB: 'Man City',
    league: 'Premier League',
    status: 'upcoming',
    scheduleLabel: 'Tomorrow 3:00 PM',
    marketType: 'Yes / No',
    endsInLabel: '1d 2h',
    volumeLabel: '43.2M',
    question: 'Arsenal vs Man City \u2013 Win?',
    yesPrice: 2.3,
    noPrice: 1.45,
    changePct: 6,
    tradersCount: 980,
    totalContractsLabel: '3,100',
  },
  {
    id: 'real-barca',
    teamA: 'Real Madrid',
    teamB: 'Barcelona',
    league: 'La Liga',
    status: 'upcoming',
    scheduleLabel: 'May 12, 7:00 PM',
    marketType: 'Yes / No',
    endsInLabel: '2d 6h',
    volumeLabel: '35.6M',
    question: 'Real Madrid Win?',
    yesPrice: 2.2,
    noPrice: 1.65,
    changePct: 4,
    tradersCount: 720,
    totalContractsLabel: '2,050',
  },
  {
    id: 'uganda-kenya',
    teamA: 'Uganda',
    teamB: 'Kenya',
    league: 'CECAFA Cup',
    status: 'live',
    liveMinute: "68'",
    marketType: 'Yes / No',
    endsInLabel: '21m 12s',
    volumeLabel: '23.4M',
    question: 'Uganda Win?',
    yesPrice: 2.05,
    noPrice: 1.9,
    changePct: 7,
    tradersCount: 540,
    totalContractsLabel: '1,410',
  },
];

const MOCK_CATEGORIES: MarketCategory[] = [
  { id: 'popular', label: 'Popular', description: 'Most traded' },
  { id: 'match-result', label: 'Match Result', description: '1X2 outcomes' },
  { id: 'over-under', label: 'Over/Under', description: 'Goals markets' },
  { id: 'btts', label: 'Both Teams to Score', description: 'Yes/No markets' },
  { id: 'goal-scorer', label: 'Goal Scorer', description: 'Player to score' },
  { id: 'correct-score', label: 'Correct Score', description: 'Exact score' },
  { id: 'ht-ft', label: 'Half Time / Full Time', description: 'HT/FT markets' },
  { id: 'combo', label: 'Combo Markets', description: 'Multi-outcome' },
];

const MOCK_POSITIONS: UserPosition[] = [
  { id: 'p1', marketId: 'sc-villa-kcca', question: 'SC Villa Clean Sheet?', side: 'Yes', quantity: 20, price: 2.15, value: 43000 },
  { id: 'p2', marketId: 'express-vipers', question: 'Express FC Win?', side: 'No', quantity: 15, price: 1.6, value: 24000 },
];

const MOCK_DETAIL: MarketDetail = {
  id: 'sc-villa-kcca',
  teamA: 'SC Villa',
  teamB: 'KCCA FC',
  crestA: '/clubs/sc-villa.png',
  league: 'Uganda Premier League',
  status: 'live',
  liveMinute: "72'",
  isWatchlisted: false,
  matchedVolumeLabel: 'UGX 120,500,000',
  totalContracts: '120,500',
  endsInLabel: '17m 43s',
  outcomes: [
    { key: 'a', label: 'SC Villa Win', price: 2.15, changePercent: 12.4, probability: 48, buyYesPrice: 2.15, sellYesPrice: 2.05, volumeLabel: 'UGX 57,840,000' },
    { key: 'draw', label: 'Draw', price: 3.2, changePercent: 5.6, probability: 30, buyYesPrice: 3.2, sellYesPrice: 3.05, volumeLabel: 'UGX 36,000,000' },
    { key: 'b', label: 'KCCA Win', price: 2.85, changePercent: -3.1, probability: 22, buyYesPrice: 2.85, sellYesPrice: 2.75, volumeLabel: 'UGX 26,700,000' },
  ],
  marketInfo: [
    { label: 'Event', value: 'SC Villa vs KCCA FC' },
    { label: 'Date', value: 'May 10, 2025 \u00b7 4:00 PM' },
    { label: 'Venue', value: 'Mutesa II Stadium' },
    { label: 'Market Type', value: 'Match Result' },
  ],
  rules: [
    { label: 'Trading Opens', value: 'May 10, 2025 12:00 PM' },
    { label: 'Trading Closes', value: 'May 10, 2025 3:45 PM' },
    { label: 'Settlement Time', value: 'Within 2 hours after match' },
    { label: 'Resolution Source', value: 'FUFA (Official)' },
  ],
  positions: [
    { outcomeLabel: 'SC Villa Win', side: 'Yes', avgPrice: 2.1, currentPrice: 2.15, contracts: 500, pnl: 2500 },
    { outcomeLabel: 'Draw', side: 'Yes', avgPrice: 3.2, currentPrice: 3.2, contracts: 300, pnl: 0 },
    { outcomeLabel: 'KCCA Win', side: 'No', avgPrice: 2.85, currentPrice: 2.85, contracts: 200, pnl: 0 },
  ],
  totals: { invested: 'UGX 125,000', currentValue: 'UGX 127,500', pnlLabel: '+ UGX 2,500', pnlPct: '(2.0%)' },
  stats: [
    { label: 'Matched Volume', value: 'UGX 120,500,000' },
    { label: 'Total Contracts', value: '120,500' },
    { label: 'Total Traders', value: '1,245' },
    { label: 'Open Interest', value: '57,840' },
    { label: 'Trading Started', value: 'May 10, 2025 12:00 PM' },
    { label: 'Market Liquidity', value: 'High' },
  ],
  priceHistory: buildPriceHistory(),
  orderBook: {
    buyYes: [
      { price: 2.15, contracts: 1250 },
      { price: 2.14, contracts: 1000 },
      { price: 2.13, contracts: 2300 },
      { price: 2.12, contracts: 1920 },
      { price: 2.11, contracts: 3100 },
    ],
    sellYes: [
      { price: 2.05, contracts: 1200 },
      { price: 2.04, contracts: 2050 },
      { price: 2.03, contracts: 1750 },
      { price: 2.02, contracts: 2600 },
      { price: 2.01, contracts: 1960 },
    ],
  },
  recentTrades: [
    { price: 2.15, contracts: 500, time: '09:41:23' },
    { price: 2.14, contracts: 1000, time: '09:41:10' },
    { price: 2.16, contracts: 750, time: '09:40:58' },
    { price: 2.13, contracts: 1250, time: '09:40:45' },
    { price: 2.15, contracts: 600, time: '09:40:33' },
  ],
  comments: [
    {
      id: 'c1',
      author: 'PredictKing',
      level: 5,
      timeAgo: '2m ago',
      body: 'SC Villa playing well at home, I think they can hold on and win this.',
      likes: 12,
      replies: 0,
    },
    {
      id: 'c2',
      author: 'MarketMaster',
      level: 3,
      timeAgo: '15m ago',
      body: 'KCCA looks strong, but SC Villa has better home record.',
      likes: 8,
      replies: 0,
    },
    {
      id: 'c3',
      author: 'GoalGetter',
      level: 2,
      timeAgo: '30m ago',
      body: 'Draw is possible, both teams are evenly matched.',
      likes: 5,
      replies: 0,
    },
  ],
  commentCount: 24,
  meta: [
    { label: 'Market', value: 'SC Villa vs KCCA FC' },
    { label: 'Market Type', value: 'Match Result' },
    { label: 'Event', value: 'SC Villa vs KCCA FC' },
    { label: 'League', value: 'Uganda Premier League' },
    { label: 'Date', value: 'May 10, 2025 4:00 PM' },
    { label: 'Venue', value: 'Mutesa II Stadium' },
    { label: 'Market ID', value: 'MKT-2025-0001245' },
    { label: 'Created By', value: 'Admin' },
    { label: 'Created At', value: 'May 7, 2025 10:30 AM' },
    { label: 'Resolution Source', value: 'FUFA (Official)' },
  ],
};

function buildPriceHistory(): PriceHistoryPoint[] {
  const hours = ['12:00', '15:00', '18:00', '21:00', '00:00', '03:00', '06:00', '09:00'];
  return hours.map((label, i) => ({
    label,
    values: {
      a: round2(1.8 + Math.sin(i * 0.8) * 0.25 + i * 0.05),
      draw: round2(3.0 + Math.sin(i * 0.5 + 1) * 0.2),
      b: round2(3.1 - Math.sin(i * 0.7 + 2) * 0.3 - i * 0.02),
    },
  }));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// TODO: replace with `apiClient.get<MarketListItem[]>('/markets')`
export function fetchMarkets(): Promise<MarketListItem[]> {
  return delay(MOCK_MARKETS);
}

// TODO: replace with `apiClient.get<MarketCategory[]>('/markets/categories')`
export function fetchMarketCategories(): Promise<MarketCategory[]> {
  return delay(MOCK_CATEGORIES);
}

// TODO: replace with `apiClient.get<MarketDetail>('/markets/' + id)`
export function fetchMarketDetail(id: string): Promise<MarketDetail> {
  return delay({ ...MOCK_DETAIL, id: id || MOCK_DETAIL.id });
}

// TODO: replace with `apiClient.get<UserPosition[]>('/me/positions')`.
// Only meaningful for verified users — callers should gate rendering (not
// the fetch itself) on the user's verification status.
export function fetchMyPositions(): Promise<UserPosition[]> {
  return delay(MOCK_POSITIONS);
}


// // Different file
// /**
//  * ------------------------------------------------------------------------
//  * Fan-side Markets data layer
//  * ------------------------------------------------------------------------
//  * Every value returned from these functions (which matches are live, their
//  * odds, volumes, categories, rules, order book, comments, positions, etc.)
//  * is content that admins configure / the trading engine produces. This file
//  * is the boundary the fan UI talks to; swap the mock bodies below for real
//  * requests (e.g. `apiClient.get('/markets')`) once those endpoints exist.
//  * ------------------------------------------------------------------------
//  */

// export type MarketStatus = 'live' | 'upcoming' | 'trending' | 'closed';

// export interface MarketListItem {
//   id: string;
//   teamA: string;
//   teamB: string;
//   crestA?: string;
//   crestB?: string;
//   league: string;
//   status: MarketStatus;
//   liveMinute?: string;
//   scheduleLabel?: string; // e.g. "Today 4:00 PM" for upcoming rows
//   marketType: string;
//   endsInLabel: string;
//   volumeLabel: string;
//   // Binary Yes/No market fields (matches the trading-terminal mockup)
//   question: string;
//   yesPrice: number;
//   noPrice: number;
//   changePct: number;
//   tradersCount: number;
//   totalContractsLabel: string;
// }

// export interface MarketCategory {
//   id: string;
//   label: string;
//   description: string;
// }

// export interface MarketOutcome {
//   key: string;
//   label: string;
//   price: number;
//   changePercent: number;
//   probability: number;
//   buyYesPrice: number;
//   sellYesPrice: number;
//   volumeLabel: string;
// }

// export interface MarketPosition {
//   outcomeLabel: string;
//   side: 'Yes' | 'No';
//   avgPrice: number;
//   currentPrice: number;
//   contracts: number;
//   pnl: number;
// }

// // Flat, cross-market position used by the Markets dashboard's "My Positions"
// // widget (as opposed to MarketPosition, which is scoped to one market's
// // detail page).
// export interface UserPosition {
//   id: string;
//   marketId: string;
//   question: string;
//   side: 'Yes' | 'No';
//   quantity: number;
//   price: number;
//   value: number;
// }

// export interface OrderBookRow {
//   price: number;
//   contracts: number;
// }

// export interface RecentTrade {
//   price: number;
//   contracts: number;
//   time: string;
// }

// export interface MarketComment {
//   id: string;
//   author: string;
//   level: number;
//   timeAgo: string;
//   body: string;
//   likes: number;
//   replies: number;
// }

// export interface InfoField {
//   label: string;
//   value: string;
// }

// export interface PriceHistoryPoint {
//   label: string;
//   values: Record<string, number>;
// }

// export interface MarketDetail {
//   id: string;
//   teamA: string;
//   teamB: string;
//   crestA?: string;
//   league: string;
//   status: MarketStatus;
//   liveMinute?: string;
//   isWatchlisted: boolean;
//   matchedVolumeLabel: string;
//   totalContracts: string;
//   endsInLabel: string;
//   outcomes: MarketOutcome[];
//   marketInfo: InfoField[];
//   rules: InfoField[];
//   positions: MarketPosition[];
//   totals: { invested: string; currentValue: string; pnlLabel: string; pnlPct: string };
//   stats: InfoField[];
//   priceHistory: PriceHistoryPoint[];
//   orderBook: { buyYes: OrderBookRow[]; sellYes: OrderBookRow[] };
//   recentTrades: RecentTrade[];
//   comments: MarketComment[];
//   commentCount: number;
//   meta: InfoField[];
// }

// /**
//  * ------------------------------------------------------------------------
//  * API wiring
//  * ------------------------------------------------------------------------
//  * Every market question, its odds, categories, and positions come from the
//  * admin-managed backend — nothing here is hardcoded. If this project
//  * already has a shared API client (e.g. `src/services/apiClient.ts` or an
//  * axios instance used by `accountService`/`fanDashboardService`), delete
//  * `apiFetch` below and import that instead so auth headers, base URL, and
//  * error handling stay consistent across the app. This is a drop-in
//  * placeholder so the feature works out of the box.
//  * ------------------------------------------------------------------------
//  */

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
//   const response = await fetch(`${API_BASE_URL}${path}`, {
//     credentials: 'include', // adjust if auth is via bearer token instead of cookies
//     headers: {
//       'Content-Type': 'application/json',
//       ...(init?.headers ?? {}),
//     },
//     ...init,
//   });

//   if (!response.ok) {
//     const message = await response.text().catch(() => '');
//     throw new Error(message || `Request to ${path} failed with status ${response.status}`);
//   }

//   // Handle empty responses (e.g. 204 No Content) gracefully.
//   const text = await response.text();
//   return (text ? JSON.parse(text) : undefined) as T;
// }

// // Admin creates/edits markets (including the question text, odds, schedule,
// // and status) from the admin dashboard; this simply reads what they've set.
// export function fetchMarkets(): Promise<MarketListItem[]> {
//   return apiFetch<MarketListItem[]>('/markets');
// }

// export function fetchMarketCategories(): Promise<MarketCategory[]> {
//   return apiFetch<MarketCategory[]>('/markets/categories');
// }

// export function fetchMarketDetail(id: string): Promise<MarketDetail> {
//   return apiFetch<MarketDetail>(`/markets/${encodeURIComponent(id)}`);
// }

// // Requires the fan to be authenticated; only meaningful for verified users —
// // callers should gate rendering (not the fetch itself) on verification status.
// export function fetchMyPositions(): Promise<UserPosition[]> {
//   return apiFetch<UserPosition[]>('/me/positions');
// }