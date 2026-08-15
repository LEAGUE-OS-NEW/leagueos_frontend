import { fetchMarkets as fetchFanMarkets } from './fanMarketsServices.ts';

// Fan dashboard — service layer (US-2.3).
//
// No real backend endpoint exists for any of these yet, so this is
// mock-backed, following the same convention as accountService.ts /
// notificationPreferencesService.ts: typed interfaces, in-memory mock
// data, async delay()-wrapped functions, shaped so a real backend swap
// later only touches this file. Each card fetches independently, so one
// card failing never affects the others.

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* ------------------------------------------------------------------ */
/* Quick stats (WelcomeStats)                                          */
/* ------------------------------------------------------------------ */

export type QuickStatId = 'wallet' | 'positions' | 'fantasy' | 'clubs' | 'memberships';

export interface QuickStat {
  id: QuickStatId;
  value: string;
  sublabel: string;
  positive?: boolean;
}

const QUICK_STATS: QuickStat[] = [
  { id: 'wallet', value: 'UGX 920,000', sublabel: 'Available balance' },
  { id: 'positions', value: '3', sublabel: 'Active positions' },
  { id: 'fantasy', value: '1,286', sublabel: 'Top 18%', positive: true },
  { id: 'clubs', value: '4', sublabel: 'Clubs joined' },
  { id: 'memberships', value: '2', sublabel: 'Gold · Season Pass' },
];

export async function fetchQuickStats(): Promise<QuickStat[]> {
  return delay([...QUICK_STATS]);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

export type Sport = 'football' | 'rugby' | 'basketball';

export interface Fixture {
  sport: Sport;
  sportLabel: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  crestA?: string;
  crestB?: string;
  competition: string;
  time: string;
}

const FIXTURES: Fixture[] = [
  {
    sport: 'football',
    sportLabel: 'Football',
    teamA: 'Vipers SC',
    teamB: 'Express FC',
    scoreA: 2,
    scoreB: 1,
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/express-fc.png',
    competition: 'Uganda Premier League',
    time: 'Today, 4:00 PM',
  },
  {
    sport: 'rugby',
    sportLabel: 'Rugby',
    teamA: 'Toyota Buffaloes',
    teamB: 'Black Pirates',
    scoreA: 21,
    scoreB: 14,
    crestA: '/clubs/buffaloes.png',
    crestB: '/clubs/black-pirates.png',
    competition: 'Rugby Africa Cup',
    time: 'Today, 5:30 PM',
  },
  {
    sport: 'basketball',
    sportLabel: 'Basketball',
    teamA: 'City Oilers',
    teamB: 'Patriots BC',
    scoreA: 78,
    scoreB: 69,
    crestA: '/clubs/city-oilers.png',
    competition: 'NBL Uganda',
    time: 'Today, 7:00 PM',
  },
];

export async function fetchFixtures(): Promise<Fixture[]> {
  return delay([...FIXTURES]);
}

/* ------------------------------------------------------------------ */
/* Market update                                                        */
/* ------------------------------------------------------------------ */

export interface MarketUpdateData {
  marketId: string;
  teamA: string;
  teamB: string;
  question: string;
  price: string;
  priceChangePct: string;
  volume24h: string;
  trades24h: string;
  chartPoints: string;
}

export async function fetchMarketUpdate(): Promise<MarketUpdateData | null> {
  const markets = await fetchFanMarkets();

  const liveMarkets = markets.filter(
    (market) => market.status === 'live',
  );

  const market =
    liveMarkets.find(
      (item) =>
        item.isTrending &&
        item.yesPrice !== null,
    ) ??
    liveMarkets.find(
      (item) => item.yesPrice !== null,
    ) ??
    liveMarkets[0] ??
    markets.find(
      (item) => item.status === 'upcoming',
    );

  if (!market) {
    return null;
  }

  return {
    marketId: market.id,
    teamA: market.teamA,
    teamB: market.teamB,
    question: market.question,
    price:
      market.yesPrice === null
        ? 'Awaiting liquidity'
        : `UGX ${Math.round(
            market.yesPrice,
          ).toLocaleString('en-US')}/share`,
    priceChangePct:
      market.changePct === null
        ? '—'
        : market.changePct.toFixed(1),
    volume24h:
      market.volumeLabel ?? '—',
    trades24h:
      market.totalContractsLabel ?? '—',
    chartPoints: '',
  };
}

/* ------------------------------------------------------------------ */
/* Tickets                                                              */
/* ------------------------------------------------------------------ */

export interface Ticket {
  month: string;
  day: string;
  match: string;
  time: string;
  competition: string;
  seat: string;
}

const TICKETS: Ticket[] = [
  {
    month: 'AUG',
    day: '24',
    match: 'Vipers SC vs Express FC',
    time: '4:00 PM',
    competition: 'Uganda Premier League',
    seat: 'VIP Lounge • Row A • Seat 12',
  },
  {
    month: 'AUG',
    day: '30',
    match: 'City Oilers vs Patriots BC',
    time: '7:00 PM',
    competition: 'NBL Uganda',
    seat: 'Lower Bowl • Row C • Seat 8',
  },
];

export async function fetchTickets(): Promise<Ticket[]> {
  return delay([...TICKETS]);
}

/* ------------------------------------------------------------------ */
/* Fantasy team                                                         */
/* ------------------------------------------------------------------ */

export interface FantasyPlayer {
  name: string;
  points: number;
  jerseyColor: string;
}

export interface FantasyTeamData {
  teamName: string;
  leagueName: string;
  points: number;
  rank: string;
  gameweek: string;
  formation: FantasyPlayer[][];
}

const FANTASY_TEAM: FantasyTeamData = {
  teamName: 'Spartan Squad',
  leagueName: 'Classic League',
  points: 1286,
  rank: 'Top 18%',
  gameweek: 'Gameweek 12',
  formation: [
    [
      { name: 'A. Diallo', points: 156, jerseyColor: '#7c3aed' },
      { name: 'K. Mbuku', points: 198, jerseyColor: '#2563eb' },
      { name: 'S. Okello', points: 142, jerseyColor: '#dc2626' },
    ],
    [
      { name: 'P. Katongo', points: 172, jerseyColor: '#38bdf8' },
      { name: 'J. Mutyaba', points: 165, jerseyColor: '#1e3a8a' },
      { name: 'E. Niyonzima', points: 148, jerseyColor: '#e5e7eb' },
    ],
    [
      { name: 'B. Tendo', points: 134, jerseyColor: '#7c3aed' },
      { name: 'M. Awany', points: 128, jerseyColor: '#1e3a8a' },
      { name: 'H. Wasswa', points: 119, jerseyColor: '#dc2626' },
      { name: 'D. Ochieng', points: 124, jerseyColor: '#7f1d1d' },
    ],
    [{ name: 'I. Kizito', points: 108, jerseyColor: '#16a34a' }],
  ],
};

export async function fetchFantasyTeam(): Promise<FantasyTeamData> {
  return delay({ ...FANTASY_TEAM, formation: FANTASY_TEAM.formation.map((row) => [...row]) });
}

/* ------------------------------------------------------------------ */
/* News                                                                 */
/* ------------------------------------------------------------------ */

export interface NewsItem {
  category: Sport;
  categoryLabel: string;
  headline: string;
  timeAgo: string;
  image: string;
}

const NEWS_ITEMS: NewsItem[] = [
  {
    category: 'football',
    categoryLabel: 'Football',
    headline: 'Vipers SC maintain top spot with late winner',
    timeAgo: '2h ago',
    image: '/news/league-announcement.png',
  },
  {
    category: 'rugby',
    categoryLabel: 'Rugby',
    headline: 'Buffaloes advance to Africa Cup semi-finals',
    timeAgo: '3h ago',
    image: '/news/super-cup.png',
  },
  {
    category: 'basketball',
    categoryLabel: 'Basketball',
    headline: 'City Oilers extend winning streak to 5 games',
    timeAgo: '5h ago',
    image: '/news/oilers-preview.png',
  },
];

export async function fetchNews(): Promise<NewsItem[]> {
  return delay([...NEWS_ITEMS]);
}

/* ------------------------------------------------------------------ */
/* Favourite clubs                                                      */
/* ------------------------------------------------------------------ */

export interface FavouriteClub {
  id: string;
  name: string;
  sport: Sport;
  crest?: string;
  nextFixture: string;
}

const FAVOURITE_CLUBS: FavouriteClub[] = [
  { id: 'vipers-sc', name: 'Vipers SC', sport: 'football', crest: '/clubs/vipers-sc.png', nextFixture: 'vs Express FC — Today, 4:00 PM' },
  { id: 'kcca-fc', name: 'KCCA FC', sport: 'football', crest: '/clubs/kcca-fc.png', nextFixture: 'vs SC Villa — Sat, 3:00 PM' },
  { id: 'city-oilers', name: 'City Oilers', sport: 'basketball', crest: '/clubs/city-oilers.png', nextFixture: 'vs Patriots BC — Today, 7:00 PM' },
  { id: 'black-pirates', name: 'Black Pirates', sport: 'rugby', crest: '/clubs/black-pirates.png', nextFixture: 'vs Toyota Buffaloes — Today, 5:30 PM' },
];

export async function fetchFavouriteClubs(): Promise<FavouriteClub[]> {
  return delay([...FAVOURITE_CLUBS]);
}

/* ------------------------------------------------------------------ */
/* Memberships                                                          */
/* ------------------------------------------------------------------ */

export interface Membership {
  id: string;
  clubName: string;
  tier: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  validUntil: string;
}

const MEMBERSHIPS: Membership[] = [
  { id: 'mem-1', clubName: 'Vipers SC', tier: 'Gold Member', status: 'Active', validUntil: '31 Dec 2026' },
  { id: 'mem-2', clubName: 'City Oilers', tier: 'Season Pass', status: 'Expiring Soon', validUntil: '15 Aug 2026' },
];

export async function fetchMemberships(): Promise<Membership[]> {
  return delay([...MEMBERSHIPS]);
}

/* ------------------------------------------------------------------ */
/* Wallet                                                               */
/* ------------------------------------------------------------------ */

export interface WalletTransaction {
  id: string;
  label: string;
  amount: string;
  timestamp: string;
  type: 'credit' | 'debit';
}

export interface WalletSummary {
  balance: string;
  pendingWithdrawals: string;
  recentTransactions: WalletTransaction[];
}

const WALLET_SUMMARY: WalletSummary = {
  balance: 'UGX 920,000',
  pendingWithdrawals: 'UGX 0',
  recentTransactions: [
    { id: 'txn-1', label: 'Vipers SC vs Express FC — Market win', amount: '+UGX 74,000', timestamp: '2h ago', type: 'credit' },
    { id: 'txn-2', label: 'Ticket purchase — City Oilers vs Patriots BC', amount: '-UGX 60,000', timestamp: '1d ago', type: 'debit' },
    { id: 'txn-3', label: 'Wallet top-up — MTN MoMo', amount: '+UGX 200,000', timestamp: '3d ago', type: 'credit' },
  ],
};

export async function fetchWalletSummary(): Promise<WalletSummary> {
  return delay({ ...WALLET_SUMMARY, recentTransactions: [...WALLET_SUMMARY.recentTransactions] });
}

/* ------------------------------------------------------------------ */
/* Notifications preview                                                */
/* ------------------------------------------------------------------ */

export interface NotificationPreviewItem {
  id: string;
  message: string;
  timeAgo: string;
  isUnread: boolean;
}

const NOTIFICATIONS: NotificationPreviewItem[] = [
  { id: 'notif-1', message: 'Your Vipers SC vs Express FC market has settled — you won UGX 74,000.', timeAgo: '2h ago', isUnread: true },
  { id: 'notif-2', message: 'Gameweek 12 deadline is in 3 hours — set your fantasy lineup.', timeAgo: '4h ago', isUnread: true },
  { id: 'notif-3', message: 'Your City Oilers season pass renews in 10 days.', timeAgo: '1d ago', isUnread: false },
];

export async function fetchNotificationsPreview(): Promise<NotificationPreviewItem[]> {
  return delay([...NOTIFICATIONS]);
}

/* ------------------------------------------------------------------ */
/* Store picks                                                          */
/* ------------------------------------------------------------------ */

export interface StorePick {
  id: string;
  name: string;
  price: string;
  image: string;
}

const STORE_PICKS: StorePick[] = [
  { id: 'pick-1', name: 'Vipers SC Home Jersey 2024/25', price: 'UGX 120,000', image: '/clubs/vipers-sc.png' },
  { id: 'pick-2', name: 'City Oilers Jersey Home 2024', price: 'UGX 95,000', image: '/clubs/city-oilers.png' },
];

export async function fetchStorePicks(): Promise<StorePick[]> {
  return delay([...STORE_PICKS]);
}
