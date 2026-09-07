import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import { fetchFanPositions, type Position } from '../../../services/fanMarketsServices';
import '../sections/FanDashboard.css';
import './MyPositions.css';

type ResultBucket = 'open' | 'exited' | 'won' | 'lost' | 'pending' | 'cancelled';
type TabKey = 'all' | 'open' | 'exited' | 'won' | 'lost' | 'pending' | 'cancelled';
type SideFilter = 'all' | 'yes' | 'no';
type SortKey = 'newest' | 'oldest' | 'stake_desc' | 'stake_asc';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'pending', label: 'Pending Settlement' },
  { key: 'cancelled', label: 'Cancelled / Refunded' },
  { key: 'exited', label: 'Exited' },
];

const PAGE_SIZE = 8;
const INITIAL_TIME_MS = Date.now();

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

function formatSignedUgx(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}UGX ${Math.abs(rounded).toLocaleString('en-US')}`;
}

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysSince(iso: string, nowMs: number): number {
  const ms = nowMs - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function getStake(position: Position): number {
  return position.portfolio.totalCostBasis;
}

function getEntryPrice(position: Position): number {
  return position.portfolio.averageEntryPrice;
}

function getNormalizedPrice(position: Position, price: number): number {
  const faceValue = position.market.faceValueUgx;
  return faceValue > 0 && price > 1 ? price / faceValue : price;
}

function formatPositionPrice(position: Position, price: number): string {
  return getNormalizedPrice(position, price).toFixed(2);
}

function getCurrentPrice(position: Position): number {
  return position.portfolio.markPrice ?? getEntryPrice(position);
}

function getPotentialPayout(position: Position): number {
  return position.portfolio.quantity * position.market.faceValueUgx;
}

function getCurrentValue(position: Position): number {
  return position.portfolio.marketValue ?? getStake(position);
}

function getUnrealizedPnl(position: Position): number {
  return position.portfolio.unrealizedPnl ?? 0;
}

function getUnrealizedPnlPct(position: Position): number {
  const stake = getStake(position);
  return stake > 0 ? (getUnrealizedPnl(position) / stake) * 100 : 0;
}

function getRealizedPnl(position: Position): number {
  return position.portfolio.realizedPnl;
}

function getSettledPayout(position: Position): number {
  return getStake(position) + getRealizedPnl(position);
}

function getMarketClosesAt(position: Position): string | null {
  return position.market.parameters.closesAt ?? null;
}

function getSport(position: Position): string {
  return position.market.category;
}
function getLeague(position: Position): string {
  return position.market.competition;
}
function getClub(position: Position): string {
  return position.market.eventLabel;
}
function getMarketType(position: Position): string {
  return position.market.category;
}

function classify(position: Position): ResultBucket {
  const status = position.contract.status.toUpperCase();
  if (status === 'REFUNDED') return 'cancelled';
  if (status === 'EXITED') return 'exited';
  if (status === 'PENDING_SETTLEMENT') return 'pending';
  if (status === 'WON') return 'won';
  if (status === 'LOST') return 'lost';
  return 'open';
}

function matchesTab(position: Position, tab: TabKey): boolean {
  if (tab === 'all') return true;
  return classify(position) === tab;
}

function uniqueValues(positions: Position[], getter: (p: Position) => string): string[] {
  return Array.from(new Set(positions.map(getter))).sort((a, b) => a.localeCompare(b));
}

function splitMarketLabel(label: string): [string, string] {
  const separators = [' vs ', ' v ', ' - '];
  for (const separator of separators) {
    const parts = label.split(separator);
    if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(separator).trim()];
  }
  return [label, ''];
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function shortPositionCode(id: string): string {
  const digits = id.replace(/\D/g, '');
  return digits ? `#POS-${digits.slice(-6).padStart(6, '0')}` : `#${id.toUpperCase()}`;
}

// --- tiny dependency-free icons ---------------------------------------------

function IconLayers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10 2 2 6.5 10 11l8-4.5L10 2Z" />
      <path d="m2 10.5 8 4.5 8-4.5" />
      <path d="m2 14.5 8 4.5 8-4.5" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
    </svg>
  );
}
function IconShieldCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5 4 4.7v4.6c0 4 2.6 6.9 6 8.2 3.4-1.3 6-4.2 6-8.2V4.7L10 2.5Z" />
      <path d="m7.5 10 1.8 1.8L12.8 8" />
    </svg>
  );
}
function IconCoins() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="7.5" cy="6" rx="4.5" ry="2.3" />
      <path d="M3 6v4.5c0 1.27 2 2.3 4.5 2.3s4.5-1.03 4.5-2.3V6" />
      <path d="M3 8.25v4.5c0 1.27 2 2.3 4.5 2.3.9 0 1.75-.13 2.46-.36" />
      <ellipse cx="13.5" cy="10.5" rx="4" ry="2" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3.6" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconTrendingUp() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 13.5 8 8l3 3 6.5-6.5" />
      <path d="M13.5 4.5h4v4" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m17 17-4-4" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5v10" />
      <path d="m6 9 4 4 4-4" />
      <path d="M3.5 15v1.5A1.5 1.5 0 0 0 5 18h10a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}
function IconFilter() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h14l-5.5 6.5V16l-3 1.5v-7L3 4Z" />
    </svg>
  );
}
function IconDots() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 4-6 6 6 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 4 6 6-6 6" />
    </svg>
  );
}
function IconPortfolio() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="15" height="10.5" rx="2" />
      <path d="M7 5.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
    </svg>
  );
}

// --- small building blocks ---------------------------------------------------

function StatCard({
  icon,
  tone,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  tone: 'primary' | 'accent' | 'open' | 'gold' | 'danger' | 'neutral';
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="mp-stat-card">
      <div className={`mp-stat-icon mp-stat-icon--${tone}`}>{icon}</div>
      <div className="mp-stat-body">
        <p className="mp-stat-label">{label}</p>
        <p className="mp-stat-value">{value}</p>
        <p className="mp-stat-sublabel">{sublabel}</p>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcomeId }: { outcomeId: string }) {
  return (
    <span className={`my-positions-outcome my-positions-outcome--${outcomeId.toLowerCase()}`}>{outcomeId}</span>
  );
}

function ResultBadge({ bucket }: { bucket: ResultBucket }) {
  const label =
    bucket === 'won' ? 'Won' : bucket === 'lost' ? 'Lost' : bucket === 'pending' ? 'Pending' : bucket === 'cancelled' ? 'Cancelled' : bucket === 'exited' ? 'Exited' : 'Open';
  return <span className={`mp-result-badge mp-result-badge--${bucket}`}>{label}</span>;
}

function Pnl({ amount }: { amount: number }) {
  const tone = amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'neutral';
  return <span className={`mp-pnl mp-pnl--${tone}`}>{formatSignedUgx(amount)}</span>;
}

function PriceChange({ position, from, to }: { position: Position; from: number; to: number }) {
  const diffPct = from > 0 ? ((to - from) / from) * 100 : 0;
  const tone = diffPct > 0 ? 'positive' : diffPct < 0 ? 'negative' : 'neutral';
  return (
    <span className="mp-price-cell">
      {formatPositionPrice(position, to)}
      {diffPct !== 0 && (
        <span className={`mp-price-change mp-price-change--${tone}`}>
          {diffPct > 0 ? '↑' : '↓'} {Math.abs(diffPct).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

// -----------------------------------------------------------------------------

const SPARKLINE_RANGES = [
  { key: '7', label: 'Last 7 Days', days: 7 },
  { key: '30', label: 'Last 30 Days', days: 30 },
  { key: 'all', label: 'Full History', days: null as number | null },
];

function MyPositions() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [marketTypeFilter, setMarketTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TabKey>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('oldest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sparklineRangeKey, setSparklineRangeKey] = useState('30');
  const [pageState, setPageState] = useState({ filterKey: '', page: 1 });
  const [currentTimeMs, setCurrentTimeMs] = useState(INITIAL_TIME_MS);

  useEffect(() => {
    let cancelled = false;
    fetchFanPositions()
      .then((result) => {
        if (!cancelled) {
          setPositions(result);
          setSelectedId((current) =>
            current && result.some((position) => position.contract.id === current)
              ? current
              : result[0]?.contract.id ?? null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your positions.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTimeMs(Date.now());
    const intervalId = window.setInterval(updateCurrentTime, 60 * 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function refreshPositions() {
    setIsLoading(true);
    setError('');
    fetchFanPositions()
      .then((result) => {
        setPositions(result);
        setSelectedId((current) =>
          current && result.some((position) => position.contract.id === current)
            ? current
            : result[0]?.contract.id ?? null,
        );
      })
      .catch(() => setError("Couldn't load your positions."))
      .finally(() => setIsLoading(false));
  }

  const openPositions = useMemo(() => positions.filter((p) => classify(p) === 'open'), [positions]);
  const settledPositions = useMemo(
    () => positions.filter((p) => classify(p) === 'won' || classify(p) === 'lost'),
    [positions],
  );
  const wonPositions = useMemo(() => settledPositions.filter((p) => classify(p) === 'won'), [settledPositions]);
  const lostPositions = useMemo(() => settledPositions.filter((p) => classify(p) === 'lost'), [settledPositions]);

  const totalInvested = useMemo(() => positions.reduce((sum, p) => sum + getStake(p), 0), [positions]);
  const potentialReturn = useMemo(
    () => openPositions.reduce((sum, p) => sum + getPotentialPayout(p), 0),
    [openPositions],
  );
  const netPnl = useMemo(() => {
    const unrealized = openPositions.reduce((sum, p) => sum + getUnrealizedPnl(p), 0);
    const realized = settledPositions.reduce((sum, p) => sum + getRealizedPnl(p), 0);
    return unrealized + realized;
  }, [openPositions, settledPositions]);
  const netPnlPct = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;

  const yesOpenCount = openPositions.filter((p) => p.contract.outcomeId.toUpperCase() === 'YES').length;
  const noOpenCount = openPositions.length - yesOpenCount;
  const yesSharePct = openPositions.length > 0 ? Math.round((yesOpenCount / openPositions.length) * 100) : 0;
  const noSharePct = 100 - yesSharePct;
  const openCommitted = openPositions.reduce((sum, p) => sum + getStake(p), 0);

  const highestExposure = useMemo(
    () =>
      openPositions.length
        ? [...openPositions].sort((a, b) => getStake(b) - getStake(a))[0]
        : null,
    [openPositions],
  );
  const avgEntryPrice = openPositions.length
    ? openPositions.reduce((sum, p) => sum + getNormalizedPrice(p, getEntryPrice(p)), 0) / openPositions.length
    : 0;
  const longestOpenDays = openPositions.length
    ? Math.max(...openPositions.map((p) => daysSince(p.contract.matchedAt, currentTimeMs)))
    : 0;
  const upcomingSettlement = useMemo(() => {
    const withClose = openPositions
      .map((p) => ({ p, closesAt: getMarketClosesAt(p) }))
      .filter((entry): entry is { p: Position; closesAt: string } => Boolean(entry.closesAt))
      .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
    return withClose[0] ?? null;
  }, [openPositions]);

  const winRate = settledPositions.length ? Math.round((wonPositions.length / settledPositions.length) * 100) : 0;
  const totalWonUgx = wonPositions.reduce((sum, p) => sum + getSettledPayout(p), 0);
  const totalLostUgx = lostPositions.reduce((sum, p) => sum + getStake(p), 0);
  const settledNetProfit = settledPositions.reduce((sum, p) => sum + getRealizedPnl(p), 0);
  const avgPositionUgx = positions.length
    ? positions.reduce((sum, p) => sum + getStake(p), 0) / positions.length
    : 0;
  const settledPnls = settledPositions.map((p) => ({ position: p, pnl: getRealizedPnl(p) }));
  const bestPosition = settledPnls.length ? settledPnls.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worstPosition = settledPnls.length ? settledPnls.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;
  const profitFactor = totalLostUgx > 0 ? totalWonUgx / totalLostUgx : totalWonUgx > 0 ? Infinity : 0;

  const sportOptions = useMemo(() => uniqueValues(positions, getSport), [positions]);
  const leagueOptions = useMemo(() => uniqueValues(positions, getLeague), [positions]);
  const clubOptions = useMemo(() => uniqueValues(positions, getClub), [positions]);
  const marketTypeOptions = useMemo(() => uniqueValues(positions, getMarketType), [positions]);

  const filteredPositions = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = positions.filter((p) => matchesTab(p, activeTab));
    if (sideFilter !== 'all') {
      result = result.filter((p) => p.contract.outcomeId.toUpperCase() === sideFilter.toUpperCase());
    }
    if (sportFilter !== 'all') result = result.filter((p) => getSport(p) === sportFilter);
    if (leagueFilter !== 'all') result = result.filter((p) => getLeague(p) === leagueFilter);
    if (clubFilter !== 'all') result = result.filter((p) => getClub(p) === clubFilter);
    if (marketTypeFilter !== 'all') result = result.filter((p) => getMarketType(p) === marketTypeFilter);
    if (statusFilter !== 'all') result = result.filter((p) => classify(p) === statusFilter);
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      result = result.filter((p) => new Date(p.contract.matchedAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59`).getTime();
      result = result.filter((p) => new Date(p.contract.matchedAt).getTime() <= toTime);
    }
    if (query) {
      result = result.filter(
        (p) =>
          p.market.eventLabel.toLowerCase().includes(query) || p.market.question.toLowerCase().includes(query),
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.contract.matchedAt).getTime() - new Date(b.contract.matchedAt).getTime();
        case 'stake_desc':
          return getStake(b) - getStake(a);
        case 'stake_asc':
          return getStake(a) - getStake(b);
        case 'newest':
        default:
          return new Date(b.contract.matchedAt).getTime() - new Date(a.contract.matchedAt).getTime();
      }
    });
    return sorted;
  }, [
    positions,
    activeTab,
    sideFilter,
    sportFilter,
    leagueFilter,
    clubFilter,
    marketTypeFilter,
    statusFilter,
    dateFrom,
    dateTo,
    search,
    sortKey,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredPositions.length / PAGE_SIZE));
  const paginationFilterKey = [
    activeTab,
    search,
    sideFilter,
    sportFilter,
    leagueFilter,
    clubFilter,
    marketTypeFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sortKey,
  ].join('\u001f');
  const requestedPage = pageState.filterKey === paginationFilterKey ? pageState.page : 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const pagedPositions = useMemo(
    () => filteredPositions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredPositions, currentPage],
  );
  const rangeStart = filteredPositions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredPositions.length);

  function setPageForCurrentFilters(nextPage: number | ((page: number) => number)) {
    setPageState((previous) => {
      const basePage = previous.filterKey === paginationFilterKey ? previous.page : 1;
      const page = typeof nextPage === 'function' ? nextPage(basePage) : nextPage;
      return { filterKey: paginationFilterKey, page };
    });
  }

  const selectedPosition = useMemo(
    () => positions.find((p) => p.contract.id === selectedId) ?? null,
    [positions, selectedId],
  );

  function exportCsv() {
    const header = ['Market', 'Question', 'Side', 'Stake (UGX)', 'Status', 'Placed', 'Payout (UGX)'];
    const rows = filteredPositions.map((p) => [
      p.market.eventLabel,
      p.market.question,
      p.contract.outcomeId,
      String(getStake(p)),
      p.contract.status,
      p.contract.matchedAt,
      String(classify(p) === 'won' || classify(p) === 'lost' ? getSettledPayout(p) : ''),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-positions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const recentSettlements = useMemo(
    () =>
      [...settledPositions]
        .sort((a, b) => new Date(b.contract.matchedAt).getTime() - new Date(a.contract.matchedAt).getTime())
        .slice(0, 5),
    [settledPositions],
  );

  const sparklineRangeDays = SPARKLINE_RANGES.find((r) => r.key === sparklineRangeKey)?.days ?? null;

  const sparklinePoints = useMemo(() => {
    const chronological = [...settledPositions].sort(
      (a, b) => new Date(a.contract.matchedAt).getTime() - new Date(b.contract.matchedAt).getTime(),
    );
    const cutoff =
      sparklineRangeDays == null ? null : currentTimeMs - sparklineRangeDays * 24 * 60 * 60 * 1000;
    return chronological.reduce<{ date: string; value: number }[]>((points, p) => {
      const previousValue = points.at(-1)?.value ?? 0;
      const nextValue = previousValue + getRealizedPnl(p);
      if (cutoff != null && new Date(p.contract.matchedAt).getTime() < cutoff) {
        return points;
      }
      return [...points, { date: p.contract.matchedAt, value: nextValue }];
    }, []);
  }, [settledPositions, sparklineRangeDays, currentTimeMs]);

  return (
    <div className="my-positions-shell">
      <div className="my-positions">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="my-positions-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="my-positions-content">
            <div className="my-positions-inner mp-wide">
              <div className="my-positions-header">
                <h1>My Positions</h1>
                <p>Track your markets, active positions and settlement history.</p>
              </div>

              {isLoading ? (
                <DashboardSkeleton rows={4} />
              ) : error ? (
                <DashboardNotice tone="error" title="Couldn't load your positions" message={error} onRetry={refreshPositions} />
              ) : positions.length === 0 ? (
                <DashboardNotice
                  tone="empty"
                  title="No positions yet"
                  message="Browse open markets and place your first order."
                  actionLabel="Explore Markets"
                  actionTo="/fan/trade"
                />
              ) : (
                <>
                  <div className="mp-stats-grid">
                    <StatCard
                      icon={<IconLayers />}
                      tone="primary"
                      label="Total Positions"
                      value={String(positions.length)}
                      sublabel="All time"
                    />
                    <StatCard
                      icon={<IconLock />}
                      tone="accent"
                      label="Open Positions"
                      value={String(openPositions.length)}
                      sublabel={`${positions.length ? Math.round((openPositions.length / positions.length) * 100) : 0}% of total`}
                    />
                    <StatCard
                      icon={<IconShieldCheck />}
                      tone="open"
                      label="Settled Positions"
                      value={String(settledPositions.length)}
                      sublabel={`${positions.length ? Math.round((settledPositions.length / positions.length) * 100) : 0}% of total`}
                    />
                    <StatCard
                      icon={<IconCoins />}
                      tone="gold"
                      label="Total Invested"
                      value={formatUgx(totalInvested)}
                      sublabel="Across all positions"
                    />
                    <StatCard
                      icon={<IconTarget />}
                      tone="primary"
                      label="Potential Return"
                      value={formatUgx(potentialReturn)}
                      sublabel="Open positions"
                    />
                    <StatCard
                      icon={<IconTrendingUp />}
                      tone={netPnl >= 0 ? 'open' : 'danger'}
                      label="Net P&L"
                      value={formatSignedUgx(netPnl)}
                      sublabel={`${formatPct(netPnlPct)} ROI`}
                    />
                  </div>

                  <div className="mp-tabs">
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`mp-tab${activeTab === tab.key ? ' mp-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mp-layout">
                    <div className="mp-main-col">
                      {showFilters && (
                        <div className="mp-filters-panel">
                          <label className="mp-select">
                            <span>Sport</span>
                            <select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
                              <option value="all">All Sports</option>
                              {sportOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mp-select">
                            <span>League</span>
                            <select value={leagueFilter} onChange={(event) => setLeagueFilter(event.target.value)}>
                              <option value="all">All Leagues</option>
                              {leagueOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mp-select">
                            <span>Club</span>
                            <select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)}>
                              <option value="all">All Clubs</option>
                              {clubOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mp-select">
                            <span>Market Type</span>
                            <select value={marketTypeFilter} onChange={(event) => setMarketTypeFilter(event.target.value)}>
                              <option value="all">All Types</option>
                              {marketTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mp-select">
                            <span>Side</span>
                            <select value={sideFilter} onChange={(event) => setSideFilter(event.target.value as SideFilter)}>
                              <option value="all">All (Yes/No)</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </label>
                          <label className="mp-select">
                            <span>Status</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TabKey)}>
                              <option value="all">All Status</option>
                              {TABS.filter((tab) => tab.key !== 'all').map((tab) => (
                                <option key={tab.key} value={tab.key}>
                                  {tab.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mp-select mp-select--daterange">
                            <span>Date Range</span>
                            <span className="mp-date-range">
                              <input
                                type="date"
                                value={dateFrom}
                                onChange={(event) => setDateFrom(event.target.value)}
                                aria-label="From date"
                              />
                              <span className="mp-date-range-sep">–</span>
                              <input
                                type="date"
                                value={dateTo}
                                onChange={(event) => setDateTo(event.target.value)}
                                aria-label="To date"
                              />
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="mp-toolbar">
                        <div className="mp-search">
                          <IconSearch />
                          <input
                            type="text"
                            placeholder="Search positions..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                          />
                        </div>
                        <label className="mp-select">
                          <span>Sort by</span>
                          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="stake_desc">Highest Stake</option>
                            <option value="stake_asc">Lowest Stake</option>
                          </select>
                        </label>
                        <div className="mp-toolbar-spacer" />
                        <button type="button" className="mp-export-btn" onClick={exportCsv}>
                          <IconDownload />
                          Export
                        </button>
                        <button
                          type="button"
                          className={`mp-filters-toggle${showFilters ? ' mp-filters-toggle--active' : ''}`}
                          onClick={() => setShowFilters((value) => !value)}
                          aria-expanded={showFilters}
                        >
                          <IconFilter />
                          Filters
                        </button>
                      </div>

                      {filteredPositions.length === 0 ? (
                        <div className="my-positions-section">
                          <p className="mp-empty-filtered">No positions match these filters.</p>
                        </div>
                      ) : (
                        <section className="my-positions-section mp-table-section">
                          <div className="mp-table-header-row">
                            <h2>
                              {TABS.find((t) => t.key === activeTab)?.label} Positions ({filteredPositions.length})
                            </h2>
                          </div>

                          <div className="mp-table-scroll">
                            <table className="mp-open-table">
                              <colgroup>
                                <col className="mp-col-market" />
                                <col className="mp-col-side" />
                                <col className="mp-col-stake" />
                                <col className="mp-col-entry" />
                                <col className="mp-col-current-price" />
                                <col className="mp-col-potential" />
                                <col className="mp-col-current-value" />
                                <col className="mp-col-pnl" />
                                <col className="mp-col-placed" />
                                <col className="mp-col-status" />
                                <col className="mp-col-action" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>Market</th>
                                  <th>My Positions</th>
                                  <th>Stake</th>
                                  <th>Entry Price</th>
                                  <th>Current Price</th>
                                  <th>Potential Payout</th>
                                  <th>Current Value</th>
                                  <th>P&amp;L</th>
                                  <th>Placed</th>
                                  <th>Status</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody className="my-positions-list">
                              {pagedPositions.map((position) => {
                                const bucket = classify(position);
                                const settled = bucket === 'won' || bucket === 'lost';
                                const [homeTeam, awayTeam] = splitMarketLabel(position.market.eventLabel);
                                return (
                                  <tr
                                    className={`my-positions-row${
                                      selectedId === position.contract.id ? ' mp-row--selected' : ''
                                    }`}
                                    key={position.contract.id}
                                    onClick={() => {
                                      setSelectedId(position.contract.id);
                                      setActionMenuId(null);
                                    }}
                                  >
                                    <td className="mp-col-market">
                                      <Link
                                        to={`/fan/markets/${position.market.id}`}
                                        className="my-positions-market"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <span className="mp-market-crests" aria-hidden="true">
                                          <span className="mp-market-crest mp-market-crest--home">{getInitials(homeTeam)}</span>
                                          {awayTeam && <span className="mp-market-crest mp-market-crest--away">{getInitials(awayTeam)}</span>}
                                        </span>
                                        <span className="mp-market-copy">
                                          <strong>{position.market.eventLabel}</strong>
                                          <span>{position.market.question}</span>
                                        </span>
                                      </Link>
                                    </td>

                                    <td className="mp-cell mp-col-side">
                                      <span className="mp-cell-label">My Positions</span>
                                      <OutcomeBadge outcomeId={position.contract.outcomeId} />
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-stake">
                                      <span className="mp-cell-label">Stake</span>
                                      <span className="my-positions-stake">{formatUgx(getStake(position))}</span>
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-entry">
                                      <span className="mp-cell-label">Entry Price</span>
                                      {settled ? '-' : formatPositionPrice(position, getEntryPrice(position))}
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-current-price">
                                      <span className="mp-cell-label">Current Price</span>
                                      {settled ? '—' : <PriceChange position={position} from={getEntryPrice(position)} to={getCurrentPrice(position)} />}
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-potential">
                                      <span className="mp-cell-label">Potential Payout</span>
                                      {settled ? '-' : formatUgx(getPotentialPayout(position))}
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-current-value">
                                      <span className="mp-cell-label">Current Value</span>
                                      <span className="my-positions-payout">
                                        {formatUgx(settled ? getSettledPayout(position) : getCurrentValue(position))}
                                      </span>
                                    </td>

                                    <td className="mp-cell mp-cell--num mp-col-pnl">
                                      <span className="mp-cell-label">P&amp;L</span>
                                      <Pnl amount={settled ? getRealizedPnl(position) : getUnrealizedPnl(position)} />
                                    </td>

                                    <td className="mp-cell mp-col-placed">
                                      <span className="mp-cell-label">Placed</span>
                                      <span className="my-positions-time">{formatDateTime(position.contract.matchedAt)}</span>
                                    </td>

                                    <td className="mp-cell mp-col-status">
                                      <span className="mp-cell-label">Status</span>
                                      <ResultBadge bucket={bucket} />
                                    </td>

                                    <td className="mp-cell mp-cell--action mp-col-action">
                                      <div className="mp-row-action-wrap">
                                        <button
                                          type="button"
                                          className="mp-row-action-btn"
                                          aria-label="Row actions"
                                          aria-expanded={actionMenuId === position.contract.id}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedId(position.contract.id);
                                            setActionMenuId((current) =>
                                              current === position.contract.id ? null : position.contract.id,
                                            );
                                          }}
                                        >
                                          <IconDots />
                                        </button>
                                        {actionMenuId === position.contract.id && (
                                          <div className="mp-row-action-menu" onClick={(event) => event.stopPropagation()}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedId(position.contract.id);
                                                setActionMenuId(null);
                                              }}
                                            >
                                              Details
                                            </button>
                                            <Link to={`/fan/markets/${position.market.id}`}>Market</Link>
                                            {bucket === 'open' && <Link to={`/fan/positions/${position.contract.id}/sell`}>Sell</Link>}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              </tbody>
                            </table>
                          </div>

                          <div className="mp-pagination">
                            <p className="mp-pagination-summary">
                              Showing {rangeStart} to {rangeEnd} of {filteredPositions.length}{' '}
                              {activeTab !== 'all' ? `${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} ` : ''}
                              {filteredPositions.length === 1 ? 'position' : 'positions'}
                            </p>
                            {totalPages > 1 && (
                              <div className="mp-pagination-controls">
                                <button
                                  type="button"
                                  className="mp-page-btn"
                                  disabled={currentPage === 1}
                                  onClick={() => setPageForCurrentFilters((p) => Math.max(1, p - 1))}
                                  aria-label="Previous page"
                                >
                                  <IconChevronLeft />
                                </button>
                                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                  <button
                                    key={pageNumber}
                                    type="button"
                                    className={`mp-page-btn${pageNumber === currentPage ? ' mp-page-btn--active' : ''}`}
                                    onClick={() => setPageForCurrentFilters(pageNumber)}
                                  >
                                    {pageNumber}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="mp-page-btn"
                                  disabled={currentPage === totalPages}
                                  onClick={() => setPageForCurrentFilters((p) => Math.min(totalPages, p + 1))}
                                  aria-label="Next page"
                                >
                                  <IconChevronRight />
                                </button>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </div>

                    <aside className="mp-side-col">
                      <section className="my-positions-section mp-portfolio-card">
                        <h2>
                          <IconPortfolio /> Portfolio Overview
                        </h2>
                        <div className="mp-donut-wrap">
                          <div
                            className="mp-donut"
                            style={{
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              ['--yes-pct' as any]: `${yesSharePct}%`,
                            }}
                          >
                            <div className="mp-donut-center">
                              <span className="mp-donut-count">{openPositions.length}</span>
                              <span className="mp-donut-label">Open Positions</span>
                            </div>
                          </div>
                          <div className="mp-donut-figure">{formatUgx(openCommitted)}</div>
                          <p className="mp-donut-sub">currently committed</p>
                        </div>
                        <ul className="mp-legend">
                          <li>
                            <span className="mp-legend-dot mp-legend-dot--yes" />
                            YES Positions
                            <span className="mp-legend-value">
                              {yesOpenCount} ({yesSharePct}%)
                            </span>
                          </li>
                          <li>
                            <span className="mp-legend-dot mp-legend-dot--no" />
                            NO Positions
                            <span className="mp-legend-value">
                              {noOpenCount} ({noSharePct}%)
                            </span>
                          </li>
                        </ul>
                        <dl className="mp-portfolio-facts">
                          <div>
                            <dt>Highest Exposure</dt>
                            <dd>{highestExposure ? highestExposure.market.eventLabel : '—'}</dd>
                          </div>
                          <div>
                            <dt>Upcoming Settlement</dt>
                            <dd>{upcomingSettlement ? formatDateTime(upcomingSettlement.closesAt) : 'None scheduled'}</dd>
                          </div>
                          <div>
                            <dt>Average Entry Price</dt>
                            <dd>{openPositions.length ? avgEntryPrice.toFixed(2) : '—'}</dd>
                          </div>
                          <div>
                            <dt>Longest Open Position</dt>
                            <dd>{openPositions.length ? `${longestOpenDays} day${longestOpenDays === 1 ? '' : 's'}` : '—'}</dd>
                          </div>
                        </dl>
                      </section>

                      {selectedPosition && (
                        <section className="my-positions-section mp-detail-card">
                          <div className="mp-detail-header">
                            <div className="mp-detail-heading">
                              <h2>Position Details</h2>
                              <p className="mp-detail-id">{shortPositionCode(selectedPosition.contract.id)}</p>
                            </div>
                            <div className="mp-detail-header-actions">
                              <ResultBadge bucket={classify(selectedPosition)} />
                              <button type="button" className="mp-close-btn" onClick={() => setSelectedId(null)} aria-label="Close">
                                <IconClose />
                              </button>
                            </div>
                          </div>
                          <dl className="mp-detail-list">
                            <div>
                              <dt>Market</dt>
                              <dd>{selectedPosition.market.eventLabel}</dd>
                            </div>
                            <div>
                              <dt>Question</dt>
                              <dd>{selectedPosition.market.question}</dd>
                            </div>
                            <div>
                              <dt>My Positions</dt>
                              <dd>
                                <OutcomeBadge outcomeId={selectedPosition.contract.outcomeId} />
                              </dd>
                            </div>
                            <div>
                              <dt>Amount Invested</dt>
                              <dd>{formatUgx(getStake(selectedPosition))}</dd>
                            </div>
                            <div>
                              <dt>Entry Price</dt>
                              <dd>{formatPositionPrice(selectedPosition, getEntryPrice(selectedPosition))}</dd>
                            </div>
                            {classify(selectedPosition) === 'open' ? (
                              <>
                                <div>
                                  <dt>Current Price</dt>
                                  <dd>
                                    <PriceChange position={selectedPosition} from={getEntryPrice(selectedPosition)} to={getCurrentPrice(selectedPosition)} />
                                  </dd>
                                </div>
                                <div>
                                  <dt>Potential Payout</dt>
                                  <dd>{formatUgx(getPotentialPayout(selectedPosition))}</dd>
                                </div>
                                <div>
                                  <dt>Current Value</dt>
                                  <dd>{formatUgx(getCurrentValue(selectedPosition))}</dd>
                                </div>
                                <div>
                                  <dt>Unrealized P&amp;L</dt>
                                  <dd>
                                    <Pnl amount={getUnrealizedPnl(selectedPosition)} />{' '}
                                    <span className="mp-detail-pct">({formatPct(getUnrealizedPnlPct(selectedPosition))})</span>
                                  </dd>
                                </div>
                                <div>
                                  <dt>Market Closes</dt>
                                  <dd>
                                    {getMarketClosesAt(selectedPosition)
                                      ? formatDateTime(getMarketClosesAt(selectedPosition) as string)
                                      : 'TBD'}
                                  </dd>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <dt>Payout</dt>
                                  <dd>{formatUgx(getSettledPayout(selectedPosition))}</dd>
                                </div>
                                <div>
                                  <dt>Realized P&amp;L</dt>
                                  <dd>
                                    <Pnl amount={getRealizedPnl(selectedPosition)} />
                                  </dd>
                                </div>
                              </>
                            )}
                            <div>
                              <dt>Settlement</dt>
                              <dd>
                                <ResultBadge bucket={classify(selectedPosition)} />
                              </dd>
                            </div>
                            <div>
                              <dt>Transaction ID</dt>
                              <dd className="mp-detail-mono">TXN-{selectedPosition.contract.id.slice(-8).toUpperCase()}</dd>
                            </div>
                            <div>
                              <dt>Placed</dt>
                              <dd>{formatDateTime(selectedPosition.contract.matchedAt)}</dd>
                            </div>
                          </dl>
                          <div className="mp-detail-actions">
                            <Link to={`/fan/markets/${selectedPosition.market.id}`} className="mp-detail-primary-btn">
                              View Market
                            </Link>
                            <button type="button" className="mp-detail-secondary-btn">
                              View Transaction
                            </button>
                            {classify(selectedPosition) === 'open' && (
                              <button type="button" className="my-positions-sell-btn">
                                Sell Position
                              </button>
                            )}
                          </div>
                        </section>
                      )}
                    </aside>
                  </div>

                  <div className="mp-bottom-grid">
                    <section className="my-positions-section mp-performance-card">
                      <h2>My Performance</h2>
                      <div className="mp-performance-grid">
                        <div>
                          <p className="mp-perf-label">Win Rate</p>
                          <p className="mp-perf-value">{settledPositions.length ? `${winRate}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Total Won</p>
                          <p className="mp-perf-value mp-perf-value--positive">{formatUgx(totalWonUgx)}</p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Total Lost</p>
                          <p className="mp-perf-value mp-perf-value--negative">{formatUgx(totalLostUgx)}</p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Net Profit</p>
                          <p className={`mp-perf-value ${settledNetProfit >= 0 ? 'mp-perf-value--positive' : 'mp-perf-value--negative'}`}>
                            {formatSignedUgx(settledNetProfit)}
                          </p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Average Position</p>
                          <p className="mp-perf-value">{formatUgx(avgPositionUgx)}</p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Best Position</p>
                          <p className="mp-perf-value mp-perf-value--positive">
                            {bestPosition ? formatSignedUgx(bestPosition.pnl) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Worst Position</p>
                          <p className="mp-perf-value mp-perf-value--negative">
                            {worstPosition ? formatSignedUgx(worstPosition.pnl) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="mp-perf-label">Profit Factor</p>
                          <p className="mp-perf-value">
                            {settledPositions.length ? (profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)) : '—'}
                          </p>
                        </div>
                      </div>

                      {sparklinePoints.length > 1 && (
                        <div className="mp-sparkline-wrap">
                          <div className="mp-sparkline-header">
                            <p className="mp-sparkline-title">P&amp;L Over Time</p>
                            <label className="mp-sparkline-range-select">
                              <select
                                value={sparklineRangeKey}
                                onChange={(event) => setSparklineRangeKey(event.target.value)}
                                aria-label="P&L history range"
                              >
                                {SPARKLINE_RANGES.map((range) => (
                                  <option key={range.key} value={range.key}>
                                    {range.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="mp-sparkline">
                            {(() => {
                              const values = sparklinePoints.map((point) => point.value);
                              const min = Math.min(...values, 0);
                              const max = Math.max(...values, 0);
                              const range = max - min || 1;
                              const innerWidth = 300;
                              const innerHeight = 80;
                              const offsetX = 10;
                              const offsetY = 8;
                              const stepX = innerWidth / (sparklinePoints.length - 1);
                              const coords = sparklinePoints.map((point, index) => {
                                const x = offsetX + index * stepX;
                                const y = offsetY + innerHeight - ((point.value - min) / range) * innerHeight;
                                return { x, y };
                              });
                              const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
                              const areaPoints = `${offsetX},${offsetY + innerHeight} ${linePoints} ${
                                offsetX + innerWidth
                              },${offsetY + innerHeight}`;
                              const zeroY = offsetY + innerHeight - ((0 - min) / range) * innerHeight;
                              return (
                                <>
                                  <line x1={offsetX} y1={zeroY} x2={offsetX + innerWidth} y2={zeroY} className="mp-sparkline-zero" />
                                  <polygon points={areaPoints} className="mp-sparkline-area" />
                                  <polyline points={linePoints} className="mp-sparkline-line" />
                                </>
                              );
                            })()}
                          </svg>
                          <div className="mp-sparkline-axis">
                            <span>{formatDateShort(sparklinePoints[0].date)}</span>
                            <span>{formatDateShort(sparklinePoints[sparklinePoints.length - 1].date)}</span>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="my-positions-section mp-settlements-card">
                      <div className="mp-table-header-row">
                        <h2>Recent Settlements</h2>
                        <button type="button" className="mp-view-all-btn" onClick={() => setActiveTab('all')}>
                          View All
                        </button>
                      </div>
                      {recentSettlements.length === 0 ? (
                        <p className="mp-empty-filtered">No settlements yet.</p>
                      ) : (
                        <>
                          <div className="mp-row mp-row--head mp-row--settled-cols">
                            <span>Market</span>
                            <span>Position</span>
                            <span>Stake</span>
                            <span>Result</span>
                            <span>Payout</span>
                          </div>
                          <ul className="my-positions-list">
                            {recentSettlements.map((position) => (
                              <li
                                className="my-positions-row mp-row mp-row--settled-cols"
                                key={position.contract.id}
                                onClick={() => setSelectedId(position.contract.id)}
                              >
                                <div className="my-positions-market">
                                  <strong>{position.market.eventLabel}</strong>
                                  <span>{formatDateShort(position.contract.matchedAt)}</span>
                                </div>
                                <span className="mp-cell">
                                  <span className="mp-cell-label">Position</span>
                                  <OutcomeBadge outcomeId={position.contract.outcomeId} />
                                </span>
                                <span className="mp-cell mp-cell--num">
                                  <span className="mp-cell-label">Stake</span>
                                  {formatUgx(getStake(position))}
                                </span>
                                <span className="mp-cell">
                                  <span className="mp-cell-label">Result</span>
                                  <ResultBadge bucket={classify(position)} />
                                </span>
                                <span className="mp-cell mp-cell--num">
                                  <span className="mp-cell-label">Payout</span>
                                  <span className="my-positions-payout">{formatUgx(getSettledPayout(position))}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                          <Link to="#" className="mp-view-full-history" onClick={() => setActiveTab('all')}>
                            View full settlement history
                          </Link>
                        </>
                      )}
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default MyPositions;
