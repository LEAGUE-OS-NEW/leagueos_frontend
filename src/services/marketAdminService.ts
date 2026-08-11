// Market Admin — service layer (merged Market Operations + Market Approval).
//
// Replaces marketOperationsService.ts + marketApprovalService.ts. Those two
// called a real backend (`/market-admin/...`) for the old two-role workflow;
// this merged role's 4-step create -> publish flow, plus the Contracts/
// Trading concepts the mockups introduce, have no backend support yet, so
// this is an in-memory mock — every export is async and shaped like a real
// integration (loading states, try/catch, await at every call site) so
// swapping these bodies for real `apiClient` calls later is a drop-in
// replacement, no component changes required.
//
// Self-publish separation of duties: the old backend blocked a Market
// Approval Admin from approving a market they themselves created as a
// Market Operations Admin (403, keyed on creator identity, not role). Now
// that one role does both jobs, that same identity check is preserved here
// as an instance-level rule — you can't publish a market you personally
// drafted; a different Market Admin (or a Super Admin, who sits above the
// separation-of-duties concern) has to do it. A thrown error carries
// `.status = 403` so callers can distinguish this from any other failure,
// matching the old contract exactly.

import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList } from './apiUtils.ts';
import { useAuthStore } from '../store/authStore.ts';
import type {
  AdminMarket as ApiAdminMarket,
  Market as ApiMarket,
  MarketCategory as ApiMarketCategory,
  SportResource,
} from '../types/api.ts';
import { getEntitlementsForDashboard } from '../utils/dashboardAccess.ts';

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

export type MarketStatus = 'Draft' | 'Upcoming' | 'Live' | 'Resolved' | 'Voided' | 'Cancelled';
export type OutcomeId = 'YES' | 'NO';
export type ProposalStatus = 'New' | 'Under Review' | 'Converted' | 'Rejected' | 'Duplicate';
export type ContractStatus = 'Open' | 'Settled' | 'Voided';

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface Outcome {
  id: OutcomeId;
  label: string;
  description: string;
  probabilityPct: number;
  /** UGX — price = implied probability x UGX 10,000 (see the contract explainer). */
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

export interface Contract {
  id: string;
  marketId: string;
  outcomeId: OutcomeId;
  /** UGX price paid per contract at match time. */
  price: number;
  quantityUgx: number;
  buyer: string;
  seller: string;
  matchedAt: string;
  status: ContractStatus;
  payoutUgx?: number;
}

export interface OrderBookLevel {
  price: number;
  quantityUgx: number;
}

export interface OrderBook {
  marketId: string;
  outcomeId: OutcomeId;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastPrice: number;
  spread: number;
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

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string, status?: number): never {
  throw status === undefined ? new Error(message) : Object.assign(new Error(message), { status });
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function currentAdminIdentity(): string {
  const user = useAuthStore.getState().user;
  return user?.full_name || user?.email || 'You';
}

function currentAdminIsSuperAdmin(): boolean {
  const access = useAuthStore.getState().user?.dashboard_access;
  return getEntitlementsForDashboard(access, 'SUPER_ADMIN').length > 0;
}

function priceFromProbability(probabilityPct: number): number {
  return Math.round(probabilityPct * 100);
}

function defaultOutcomes(): Outcome[] {
  return [
    { id: 'YES', label: 'Yes', description: '', probabilityPct: 50, price: 5000 },
    { id: 'NO', label: 'No', description: '', probabilityPct: 50, price: 5000 },
  ];
}

function defaultParameters(kickoffIso: string): MarketParameters {
  const kickoff = new Date(kickoffIso || Date.now());
  const closesAt = new Date(kickoff.getTime() - 10 * 60_000).toISOString();
  const settlesBy = new Date(kickoff.getTime() + 3 * 60 * 60_000).toISOString();
  return {
    opensAt: nowIso(),
    closesAt,
    settlesBy,
    initialLiquidityUgx: 500_000,
    minTradeUgx: 1_000,
    maxTradeUgx: 500_000,
    feePct: 2,
    featured: false,
    trending: false,
    recommended: false,
    inPlayTrading: false,
  };
}

function deriveLifecycleStatus(parameters: MarketParameters): MarketStatus {
  return new Date(parameters.opensAt).getTime() <= Date.now() ? 'Live' : 'Upcoming';
}

function cloneMarket(market: Market): Market {
  return {
    ...market,
    outcomes: market.outcomes.map((outcome) => ({ ...outcome })),
    parameters: { ...market.parameters },
    tags: [...market.tags],
    auditHistory: market.auditHistory.map((event) => ({ ...event })),
  };
}

function cloneProposal(proposal: MarketProposal): MarketProposal {
  return { ...proposal, auditHistory: proposal.auditHistory.map((event) => ({ ...event })) };
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
  if (market.status === 'CANCELLED' || market.status === 'CLOSED' || market.status === 'SUSPENDED') return 'Cancelled';
  return market.sporting_event?.starts_at && new Date(market.sporting_event.starts_at).getTime() > Date.now() ? 'Upcoming' : 'Live';
}

function probabilityFromOutcome(outcome: ApiMarket['outcomes'][number] | undefined, fallback: number): number {
  if (!outcome) return fallback;
  const match = `${outcome.label} ${outcome.description ?? ''}`.match(/(\d{1,2})(?:\.\d+)?\s*%/);
  return match ? Math.max(1, Math.min(99, Number(match[1]))) : fallback;
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
  const yesProbability = probabilityFromOutcome(yesApi, 50);
  const noProbability = probabilityFromOutcome(noApi, 100 - yesProbability);
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
        label: yesApi.label || 'Yes',
        description: yesApi.description ?? '',
        probabilityPct: yesProbability,
        price: priceFromProbability(yesProbability),
      },
      noApi && {
        id: 'NO' as const,
        label: noApi.label || 'No',
        description: noApi.description ?? '',
        probabilityPct: noProbability,
        price: priceFromProbability(noProbability),
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

function pushAudit(market: Market, action: string, note?: string): void {
  market.auditHistory = [
    { id: genId('audit'), timestamp: nowIso(), adminUser: currentAdminIdentity(), action, note },
    ...market.auditHistory,
  ];
}

function findMarketOrThrow(id: string): Market {
  const market = markets.find((item) => item.id === id);
  if (!market) fail(`Market ${id} was not found.`);
  return market;
}

function findProposalOrThrow(id: string): MarketProposal {
  const proposal = proposals.find((item) => item.id === id);
  if (!proposal) fail(`Proposal ${id} was not found.`);
  return proposal;
}

/* ============================================================
   SEED DATA
   ============================================================ */

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

function buildMarket(overrides: Partial<Market> & Pick<Market, 'eventLabel' | 'question' | 'kickoff'>): Market {
  const market: Market = {
    id: genId('market'),
    competition: 'StarTimes Uganda Premier League',
    venue: 'Venue unavailable',
    category: 'Football',
    description: '',
    tags: [],
    outcomes: defaultOutcomes(),
    parameters: defaultParameters(overrides.kickoff),
    status: 'Draft',
    createdBy: 'Dennis Kato',
    createdAt: nowIso(),
    auditHistory: [],
    ...overrides,
  };
  pushAuditAs(market, market.createdBy, 'Draft created');
  if (market.status !== 'Draft') {
    pushAuditAs(market, market.createdBy, 'Published', `Market went ${market.status.toLowerCase()}.`);
  }
  return market;
}

function pushAuditAs(market: Market, adminUser: string, action: string, note?: string): void {
  market.auditHistory = [{ id: genId('audit'), timestamp: nowIso(), adminUser, action, note }, ...market.auditHistory];
}

const markets: Market[] = [
  buildMarket({
    eventLabel: 'Vipers SC vs Express FC',
    question: 'Will Vipers SC beat Express FC?',
    description: 'Resolves YES if Vipers SC win in regulation time at St. Mary\'s Stadium, Kitende.',
    venue: "St. Mary's Stadium, Kitende",
    kickoff: hoursFromNow(2),
    status: 'Live',
    createdBy: 'Dennis Kato',
    outcomes: [
      { id: 'YES', label: 'Yes', description: 'Vipers SC win', probabilityPct: 62, price: priceFromProbability(62) },
      { id: 'NO', label: 'No', description: 'Draw or Express FC win', probabilityPct: 38, price: priceFromProbability(38) },
    ],
    parameters: { ...defaultParameters(hoursFromNow(2)), featured: true, trending: true, inPlayTrading: true },
  }),
  buildMarket({
    eventLabel: 'KCCA FC vs URA FC',
    question: 'Will KCCA FC beat URA FC?',
    description: 'Resolves YES if KCCA FC win in regulation time.',
    venue: 'Philip Omondi Stadium, Lugogo',
    kickoff: hoursFromNow(30),
    status: 'Upcoming',
    createdBy: 'Dennis Kato',
    outcomes: [
      { id: 'YES', label: 'Yes', description: 'KCCA FC win', probabilityPct: 54, price: priceFromProbability(54) },
      { id: 'NO', label: 'No', description: 'Draw or URA FC win', probabilityPct: 46, price: priceFromProbability(46) },
    ],
  }),
  buildMarket({
    eventLabel: 'Uganda Cranes vs Kenya Harambee Stars',
    question: 'Will Uganda Cranes beat Kenya?',
    description: 'CECAFA friendly. Resolves YES if Uganda Cranes win in regulation time.',
    competition: 'CECAFA Friendly',
    venue: 'Mandela National Stadium, Namboole',
    kickoff: hoursFromNow(72),
    status: 'Upcoming',
    createdBy: 'Grace Nabirye',
    parameters: { ...defaultParameters(hoursFromNow(72)), trending: true },
  }),
  buildMarket({
    eventLabel: 'BUL FC vs Busoga United',
    question: 'Will BUL FC beat Busoga United?',
    description: 'Resolves YES if BUL FC win in regulation time.',
    venue: 'Bugembe Stadium, Jinja',
    kickoff: hoursFromNow(96),
    status: 'Draft',
    createdBy: 'Grace Nabirye',
  }),
  buildMarket({
    eventLabel: 'Uganda Cranes vs Tanzania Taifa Stars',
    question: 'Will Uganda Cranes beat Tanzania?',
    description: 'Resolves YES if Uganda Cranes win in regulation time.',
    competition: 'CECAFA Friendly',
    venue: 'Mandela National Stadium, Namboole',
    kickoff: hoursFromNow(-48),
    status: 'Resolved',
    createdBy: 'Dennis Kato',
    winningOutcomeId: 'YES',
    resolvedAt: hoursFromNow(-45),
    outcomes: [
      { id: 'YES', label: 'Yes', description: 'Uganda Cranes win', probabilityPct: 100, price: 10_000 },
      { id: 'NO', label: 'No', description: 'Draw or Tanzania win', probabilityPct: 0, price: 0 },
    ],
  }),
  buildMarket({
    eventLabel: 'Onduparaka FC vs Wakiso Giants',
    question: 'Will Onduparaka FC beat Wakiso Giants?',
    description: 'Resolves YES if Onduparaka FC win in regulation time.',
    venue: 'Green Light Stadium, Arua',
    kickoff: hoursFromNow(-20),
    status: 'Cancelled',
    createdBy: 'Dennis Kato',
  }),
];

const proposals: MarketProposal[] = [
  {
    id: genId('proposal'),
    submittedBy: 'Fan #4821',
    eventLabel: 'Vipers SC vs Express FC',
    suggestedQuestion: 'Will Vipers SC keep a clean sheet against Express FC?',
    suggestedRules: 'Resolves YES if Express FC do not score.',
    status: 'New',
    createdAt: hoursFromNow(-6),
    auditHistory: [],
  },
  {
    id: genId('proposal'),
    submittedBy: 'Fan #1187',
    eventLabel: 'KCCA FC vs URA FC',
    suggestedQuestion: 'Will KCCA FC score in the first half?',
    suggestedRules: 'Resolves YES if KCCA FC score before half-time.',
    status: 'Under Review',
    createdAt: hoursFromNow(-20),
    auditHistory: [
      { id: genId('audit'), timestamp: hoursFromNow(-18), adminUser: 'Dennis Kato', action: 'Review started' },
    ],
  },
  {
    id: genId('proposal'),
    submittedBy: 'Fan #9042',
    eventLabel: 'Vipers SC vs Express FC',
    suggestedQuestion: 'Will the referee show a red card in Vipers vs Express?',
    status: 'Converted',
    createdAt: hoursFromNow(-30),
    auditHistory: [
      { id: genId('audit'), timestamp: hoursFromNow(-28), adminUser: 'Dennis Kato', action: 'Converted to draft market' },
    ],
  },
];

const MOCK_TRADERS = ['Aisha K.', 'Brian O.', 'Grace N.', 'Samuel M.', 'Patricia A.', 'Moses T.'];
const contractsByMarket = new Map<string, Contract[]>();

function generateContracts(market: Market): Contract[] {
  if (market.status === 'Draft') return [];
  const seed = seedFromId(market.id);
  const count = 3 + (seed % 9);
  const yes = market.outcomes.find((outcome) => outcome.id === 'YES')!;
  const no = market.outcomes.find((outcome) => outcome.id === 'NO')!;

  return Array.from({ length: count }, (_, index) => {
    const outcome = (seed >> index) % 2 === 0 ? yes : no;
    const buyer = MOCK_TRADERS[(seed >> (index + 1)) % MOCK_TRADERS.length];
    const sellerCandidate = MOCK_TRADERS[(seed >> (index + 3)) % MOCK_TRADERS.length];
    const minutesAgo = (seed >> (index + 2)) % (60 * 24 * 3);
    return {
      id: genId('contract'),
      marketId: market.id,
      outcomeId: outcome.id,
      price: outcome.price,
      quantityUgx: 2_000 + ((seed >> (index + 4)) % 48_000),
      buyer,
      seller: sellerCandidate === buyer ? 'Market maker' : sellerCandidate,
      matchedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      status: (market.status === 'Resolved' ? 'Settled' : 'Open') as ContractStatus,
    };
  }).sort((a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime());
}

function contractsFor(market: Market): Contract[] {
  if (!contractsByMarket.has(market.id)) {
    contractsByMarket.set(market.id, generateContracts(market));
  }
  return contractsByMarket.get(market.id)!;
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
    const local = markets.find((item) => item.id === id);
    if (local) return delay(cloneMarket(local));
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
  if (yes.probabilityPct <= 0 || yes.probabilityPct >= 100) {
    fail('Probabilities must be between 1% and 99%.');
  }
  if (Math.round(yes.probabilityPct + no.probabilityPct) !== 100) {
    fail('YES and NO probabilities must add up to 100%.');
  }

  try {
    const response = await apiClient.patch(`/market-admin/markets/${encodeURIComponent(id)}/`, {
      yes_label: yes.label.trim() || 'Yes',
      no_label: no.label.trim() || 'No',
    });
    return adaptApiMarket(response.data as ApiAdminMarket);
  } catch (error) {
    const local = markets.find((item) => item.id === id);
    if (!local) throw apiError(error);
    const market = local;
  market.outcomes = [yes, no].map((outcome) => ({
    id: outcome.id,
    label: outcome.label.trim() || outcome.id,
    description: outcome.description.trim(),
    probabilityPct: outcome.probabilityPct,
    price: priceFromProbability(outcome.probabilityPct),
  }));
  pushAudit(market, 'Outcomes updated', `${yes.probabilityPct}% YES / ${no.probabilityPct}% NO`);
  return delay(cloneMarket(market));
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
    const local = markets.find((item) => item.id === id);
    if (!local) throw apiError(error);
    const market = local;
  market.parameters = { ...parameters };
  pushAudit(market, 'Parameters set');
  return delay(cloneMarket(market));
  }
}

export async function publishMarket(id: string): Promise<Market> {
  if (isUuid(id)) {
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

  const market = findMarketOrThrow(id);
  if (market.status !== 'Draft') {
    fail(`${market.eventLabel} is already ${market.status.toLowerCase()} — only draft markets can be published.`);
  }
  if (market.createdBy === currentAdminIdentity() && !currentAdminIsSuperAdmin()) {
    fail(
      'You created this market. A different Market Admin (or a Super Admin) must publish it to keep creation and publishing separated.',
      403,
    );
  }

  market.status = deriveLifecycleStatus(market.parameters);
  market.publishedAt = nowIso();
  pushAudit(market, 'Published', `Market went ${market.status.toLowerCase()}.`);
  return delay(cloneMarket(market));
}

export async function cancelMarket(id: string, reason: string): Promise<Market> {
  if (!reason.trim()) fail('A cancellation reason is required.');
  if (isUuid(id)) {
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

  const market = findMarketOrThrow(id);
  if (market.status === 'Resolved' || market.status === 'Cancelled') {
    fail(`${market.eventLabel} is already ${market.status.toLowerCase()}.`);
  }

  market.status = 'Cancelled';
  pushAudit(market, 'Cancelled', reason.trim());
  return delay(cloneMarket(market));
}

/**
 * Settles a market once the Referee / Resolution Officer has verified the
 * real-world result — marks every matched contract Settled and computes its
 * payout (UGX 10,000 per share for the winning outcome, 0 otherwise; a
 * "share" is quantityUgx / price, per the contract explainer).
 */
export async function resolveMarket(id: string, winningOutcomeId: OutcomeId): Promise<Market> {
  const market = findMarketOrThrow(id);
  if (market.status !== 'Live' && market.status !== 'Upcoming') {
    fail(`${market.eventLabel} can't be resolved from ${market.status}.`);
  }

  market.status = 'Resolved';
  market.winningOutcomeId = winningOutcomeId;
  market.resolvedAt = nowIso();
  pushAudit(market, 'Resolved', `Winning outcome: ${winningOutcomeId}`);

  for (const contract of contractsFor(market)) {
    contract.status = 'Settled';
    const shares = contract.quantityUgx / contract.price;
    contract.payoutUgx = contract.outcomeId === winningOutcomeId ? Math.round(shares * 10_000) : 0;
  }

  return delay(cloneMarket(market));
}

/* ============================================================
   PROPOSALS
   ============================================================ */

export async function fetchProposals(): Promise<MarketProposal[]> {
  return delay(proposals.map(cloneProposal));
}

async function decideProposal(id: string, status: ProposalStatus, action: string, note?: string): Promise<MarketProposal> {
  const proposal = findProposalOrThrow(id);
  proposal.status = status;
  proposal.auditHistory = [
    { id: genId('audit'), timestamp: nowIso(), adminUser: currentAdminIdentity(), action, note },
    ...proposal.auditHistory,
  ];
  return delay(cloneProposal(proposal));
}

export const startProposalReview = (id: string): Promise<MarketProposal> =>
  decideProposal(id, 'Under Review', 'Review started');

export const convertProposalToDraft = (id: string): Promise<MarketProposal> =>
  decideProposal(id, 'Converted', 'Converted to draft market');

export const rejectProposal = (id: string, note: string): Promise<MarketProposal> => {
  if (!note.trim()) fail('A rejection note is required.');
  return decideProposal(id, 'Rejected', 'Rejected', note.trim());
};

export const markProposalDuplicate = (id: string, note: string): Promise<MarketProposal> => {
  if (!note.trim()) fail('Explain which market this duplicates.');
  return decideProposal(id, 'Duplicate', 'Marked as duplicate', note.trim());
};

export const returnProposal = async (...args: [string?, string?]): Promise<MarketProposal> => {
  void args;
  throw new Error('Return for Changes is not supported by the current workflow.');
};

export const requestProposalInfo = async (...args: [string?, string?]): Promise<MarketProposal> => {
  void args;
  throw new Error('Request More Information is not supported by the current workflow.');
};

/* ============================================================
   CONTRACTS & ORDER BOOK (Trading tab)
   ============================================================ */

export async function fetchContracts(marketId: string): Promise<Contract[]> {
  const market = markets.find((item) => item.id === marketId) ?? (await fetchMarket(marketId));
  return delay(contractsFor(market).map((contract) => ({ ...contract })));
}

export async function fetchOrderBook(marketId: string): Promise<OrderBook> {
  const market = markets.find((item) => item.id === marketId) ?? (await fetchMarket(marketId));
  const yes = market.outcomes.find((outcome) => outcome.id === 'YES')!;
  const seed = seedFromId(marketId);
  const lastPrice = yes.price;
  const spread = 20 + (seed % 60);

  const levels = (base: number, direction: 1 | -1): OrderBookLevel[] =>
    Array.from({ length: 5 }, (_, index) => ({
      price: Math.max(1, Math.min(9_999, base + direction * (index + 1) * (10 + ((seed >> (index + 2)) % 15)))),
      quantityUgx: 5_000 + ((seed >> (index + 1)) % 45_000),
    }));

  return delay({
    marketId,
    outcomeId: 'YES',
    bids: levels(lastPrice - Math.round(spread / 2), -1),
    asks: levels(lastPrice + Math.round(spread / 2), 1),
    lastPrice,
    spread,
  });
}

/**
 * Records a newly matched contract against a market — historically the hook
 * the fan trading journey called into so a fan's buy showed up in the
 * admin's Contracts/Trading tabs within the same mock session. The fan side
 * now trades through the real backend (fanMarketsServices.ts); kept here in
 * case another mock consumer still needs it.
 */
export function recordContract(input: {
  marketId: string;
  outcomeId: OutcomeId;
  price: number;
  quantityUgx: number;
  buyer: string;
  seller?: string;
}): Contract {
  const market = findMarketOrThrow(input.marketId);
  const contract: Contract = {
    id: genId('contract'),
    marketId: input.marketId,
    outcomeId: input.outcomeId,
    price: input.price,
    quantityUgx: input.quantityUgx,
    buyer: input.buyer,
    seller: input.seller ?? 'Market maker',
    matchedAt: nowIso(),
    status: 'Open',
  };
  contractsFor(market).unshift(contract);
  return contract;
}

/** Every contract across every market — used to find one fan's positions. */
export async function fetchAllContracts(): Promise<Contract[]> {
  return delay(markets.flatMap((market) => contractsFor(market).map((contract) => ({ ...contract }))));
}

/**
 * Cashes out an open contract before its market resolves, at the market's
 * *current* price for that outcome (a mark-to-market sale, not the eventual
 * win/lose payout) — the "Sell (Optional)" step in the fan journey.
 */
export async function sellContract(contractId: string): Promise<Contract> {
  for (const market of markets) {
    const contract = contractsFor(market).find((item) => item.id === contractId);
    if (!contract) continue;
    if (contract.status !== 'Open') fail('This position has already been settled.');
    if (market.status !== 'Live' && market.status !== 'Upcoming') {
      fail(`${market.eventLabel} is no longer open for trading.`);
    }

    const currentOutcome = market.outcomes.find((outcome) => outcome.id === contract.outcomeId)!;
    const shares = contract.quantityUgx / contract.price;
    contract.status = 'Settled';
    contract.payoutUgx = Math.round(shares * currentOutcome.price);
    return delay({ ...contract });
  }
  fail(`Contract ${contractId} was not found.`);
}
