import axiosInstance from './apiClient';
import { extractApiError, unwrapApiData } from './apiUtils';
import { fetchMarkets as fetchFanMarkets } from './fanMarketsServices.ts';
import type { ApiEnvelope } from '../types/api';

type DashboardModuleStatus = 'success' | 'unavailable';

interface DashboardModule<TData = Record<string, unknown>> {
  status: DashboardModuleStatus;
  module: string;
  data?: TData;
  empty?: boolean;
  message?: string;
}

interface FanDashboardAggregate {
  modules: {
    profile?: DashboardModule;
    notifications?: DashboardModule<NotificationsModuleData>;
    favourites?: DashboardModule<FavouritesModuleData>;
    fixtures?: DashboardModule<FixturesModuleData>;
    wallet?: DashboardModule<WalletModuleData>;
  };
}

interface NotificationsModuleData {
  unread_count?: number;
  recent_notifications?: BackendNotification[];
}

interface FavouritesModuleData {
  clubs?: BackendFavouriteClub[];
}

interface FixturesModuleData {
  upcoming_fixtures?: BackendFixture[];
}

interface WalletModuleData {
  balance?: string | number | null;
  currency?: string;
  transactions_count?: number;
}

interface PortfolioSummary {
  currency?: string;
  wallet?: {
    available_balance?: string | number;
    balance?: string | number;
    pending_withdrawals?: string | number;
  };
  positions?: {
    open_position_count?: number;
  };
}

interface BackendNotification {
  id?: string;
  title?: string;
  message?: string;
  created_at?: string;
  read?: boolean;
}

interface BackendFavouriteClub {
  id?: string;
  name?: string;
  sport?: string | null;
  crest?: string;
  crest_url?: string;
  logo_url?: string;
  next_fixture?: string;
  competition?: string | null;
}

interface BackendFixture {
  id?: string;
  name?: string;
  sport?: string;
  competition?: string | null;
  starts_at?: string;
  status?: string;
  venue?: string;
  home_team?: string;
  away_team?: string;
  team_a?: string;
  team_b?: string;
  home_score?: number;
  away_score?: number;
  score_a?: number;
  score_b?: number;
  crest_a?: string;
  crest_b?: string;
}

let dashboardPromise: Promise<FanDashboardAggregate> | null = null;

async function fetchDashboardAggregate(): Promise<FanDashboardAggregate> {
  if (!dashboardPromise) {
    dashboardPromise = axiosInstance
      .get<ApiEnvelope<FanDashboardAggregate> | FanDashboardAggregate>('/')
      .then((response) => unwrapApiData(response.data))
      .catch((error) => {
        dashboardPromise = null;
        throw new Error(extractApiError(error).message, { cause: error });
      });
  }
  return dashboardPromise;
}

async function fetchPortfolioSummary(): Promise<PortfolioSummary | null> {
  try {
    const response = await axiosInstance.get<ApiEnvelope<PortfolioSummary> | PortfolioSummary>(
      '/markets/portfolio/summary/',
    );
    return unwrapApiData(response.data);
  } catch {
    return null;
  }
}

function moduleData<TData>(aggregate: FanDashboardAggregate, name: keyof FanDashboardAggregate['modules']): TData {
  const mod = aggregate.modules?.[name] as DashboardModule<TData> | undefined;
  if (!mod || mod.status === 'unavailable') {
    throw new Error(mod?.message || 'Could not load this dashboard section.');
  }
  return (mod.data || {}) as TData;
}

function formatNumber(value: number | string | undefined | null): string {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString('en-US') : String(value || '0');
}

function formatCurrency(value: number | string | undefined | null, currency = 'UGX'): string {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return `${currency} ${value || 0}`;
  return `${currency} ${numeric.toLocaleString('en-US', {
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  })}`;
}

function formatRelativeTime(value?: string): string {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;
  const diffMs = Date.now() - timestamp;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatFixtureTime(value?: string): string {
  if (!value) return 'Time TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeSport(value?: string | null): Sport {
  const sport = String(value || '').toLowerCase();
  if (sport.includes('rugby')) return 'rugby';
  if (sport.includes('basket')) return 'basketball';
  return 'football';
}

function sportLabel(sport: Sport): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

function splitFixtureName(name?: string): [string, string] {
  const [teamA, teamB] = String(name || '').split(/\s+(?:vs|v)\.?\s+/i);
  return [teamA || 'Home', teamB || 'Away'];
}

export type QuickStatId = 'wallet' | 'positions' | 'fantasy' | 'clubs' | 'memberships';

export interface QuickStat {
  id: QuickStatId;
  value: string;
  sublabel: string;
  positive?: boolean;
}

export async function fetchQuickStats(): Promise<QuickStat[]> {
  const [dashboard, portfolio] = await Promise.all([fetchDashboardAggregate(), fetchPortfolioSummary()]);
  const wallet = moduleData<WalletModuleData>(dashboard, 'wallet');
  const favourites = moduleData<FavouritesModuleData>(dashboard, 'favourites');
  const currency = portfolio?.currency || wallet.currency || 'UGX';
  const balance = portfolio?.wallet?.available_balance ?? portfolio?.wallet?.balance ?? wallet.balance ?? 0;

  return [
    { id: 'wallet', value: formatCurrency(balance, currency), sublabel: 'Available balance' },
    {
      id: 'positions',
      value: formatNumber(portfolio?.positions?.open_position_count ?? 0),
      sublabel: 'Active positions',
    },
    { id: 'fantasy', value: '0', sublabel: 'No fantasy data yet' },
    { id: 'clubs', value: formatNumber(favourites.clubs?.length ?? 0), sublabel: 'Clubs joined' },
    { id: 'memberships', value: '0', sublabel: 'No active memberships' },
  ];
}

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

export async function fetchFixtures(): Promise<Fixture[]> {
  const dashboard = await fetchDashboardAggregate();
  const data = moduleData<FixturesModuleData>(dashboard, 'fixtures');

  return (data.upcoming_fixtures || []).map((fixture) => {
    const [fallbackA, fallbackB] = splitFixtureName(fixture.name);
    const sport = normalizeSport(fixture.sport);
    return {
      sport,
      sportLabel: sportLabel(sport),
      teamA: fixture.home_team || fixture.team_a || fallbackA,
      teamB: fixture.away_team || fixture.team_b || fallbackB,
      scoreA: fixture.home_score ?? fixture.score_a ?? 0,
      scoreB: fixture.away_score ?? fixture.score_b ?? 0,
      crestA: fixture.crest_a,
      crestB: fixture.crest_b,
      competition: fixture.competition || 'League OS',
      time: formatFixtureTime(fixture.starts_at),
    };
  });
}

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
  const liveMarkets = markets.filter((market) => market.status === 'live');
  const market =
    liveMarkets.find((item) => item.isTrending && item.yesPrice !== null) ??
    liveMarkets.find((item) => item.yesPrice !== null) ??
    liveMarkets[0] ??
    markets.find((item) => item.status === 'upcoming');

  if (!market) return null;

  return {
    marketId: market.id,
    teamA: market.teamA,
    teamB: market.teamB,
    question: market.question,
    price:
      market.yesPrice === null
        ? 'Awaiting liquidity'
        : `UGX ${Math.round(market.yesPrice).toLocaleString('en-US')}/share`,
    priceChangePct: market.changePct === null ? '—' : market.changePct.toFixed(1),
    volume24h: market.volumeLabel ?? '—',
    trades24h: market.totalContractsLabel ?? '—',
    chartPoints: '',
  };
}

export interface Ticket {
  month: string;
  day: string;
  match: string;
  time: string;
  competition: string;
  seat: string;
}

export async function fetchTickets(): Promise<Ticket[]> {
  return [];
}

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

export async function fetchFantasyTeam(): Promise<FantasyTeamData | null> {
  return null;
}

export interface NewsItem {
  category: Sport;
  categoryLabel: string;
  headline: string;
  timeAgo: string;
  image: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  return [];
}

export interface FavouriteClub {
  id: string;
  name: string;
  sport: Sport;
  crest?: string;
  nextFixture: string;
}

export async function fetchFavouriteClubs(): Promise<FavouriteClub[]> {
  const dashboard = await fetchDashboardAggregate();
  const data = moduleData<FavouritesModuleData>(dashboard, 'favourites');

  return (data.clubs || []).map((club, index) => ({
    id: club.id || club.name || `club-${index}`,
    name: club.name || 'Favourite club',
    sport: normalizeSport(club.sport),
    crest: club.crest || club.crest_url || club.logo_url,
    nextFixture: club.next_fixture || club.competition || 'No upcoming fixture listed',
  }));
}

export interface Membership {
  id: string;
  clubName: string;
  tier: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  validUntil: string;
}

export async function fetchMemberships(): Promise<Membership[]> {
  return [];
}

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

export async function fetchWalletSummary(): Promise<WalletSummary> {
  const [dashboard, portfolio] = await Promise.all([fetchDashboardAggregate(), fetchPortfolioSummary()]);
  const wallet = moduleData<WalletModuleData>(dashboard, 'wallet');
  const currency = portfolio?.currency || wallet.currency || 'UGX';
  const balance = portfolio?.wallet?.available_balance ?? portfolio?.wallet?.balance ?? wallet.balance ?? 0;
  const pendingWithdrawals = portfolio?.wallet?.pending_withdrawals ?? 0;

  return {
    balance: formatCurrency(balance, currency),
    pendingWithdrawals: formatCurrency(pendingWithdrawals, currency),
    recentTransactions: [],
  };
}

export interface NotificationPreviewItem {
  id: string;
  message: string;
  timeAgo: string;
  isUnread: boolean;
}

export async function fetchNotificationsPreview(): Promise<NotificationPreviewItem[]> {
  const dashboard = await fetchDashboardAggregate();
  const data = moduleData<NotificationsModuleData>(dashboard, 'notifications');

  return (data.recent_notifications || []).map((notification, index) => ({
    id: notification.id || `notification-${index}`,
    message: notification.message || notification.title || 'Notification',
    timeAgo: formatRelativeTime(notification.created_at),
    isUnread: !notification.read,
  }));
}

export interface StorePick {
  id: string;
  name: string;
  price: string;
  image: string;
}

export async function fetchStorePicks(): Promise<StorePick[]> {
  return [];
}
