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

import { useAuthStore } from '../store/authStore.ts';
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
  return delay(markets.map(cloneMarket));
}

export async function fetchMarket(id: string): Promise<Market> {
  return delay(cloneMarket(findMarketOrThrow(id)));
}

export async function fetchPublishedMarkets(): Promise<Market[]> {
  return delay(
    markets.filter((market) => market.status === 'Live' || market.status === 'Upcoming').map(cloneMarket),
  );
}

export async function fetchFeaturedPublishedMarkets(limit = 5): Promise<Market[]> {
  const published = markets.filter((market) => market.status === 'Live' || market.status === 'Upcoming');
  const featured = published.filter((market) => market.parameters.featured);
  const rest = published.filter((market) => !market.parameters.featured);
  return delay([...featured, ...rest].slice(0, limit).map(cloneMarket));
}

export async function createMarketDraft(input: MarketDetailsInput): Promise<Market> {
  if (!input.eventLabel.trim()) fail('Select an event for this market.');
  const question = input.question.trim();
  if (question.length < 6 || !question.endsWith('?')) {
    fail('Enter a single, unambiguous YES/NO question ending with a question mark.');
  }

  const market: Market = {
    id: genId('market'),
    sportingEventId: input.sportingEventId,
    eventLabel: input.eventLabel.trim(),
    competition: input.competition.trim() || 'Competition unavailable',
    venue: input.venue.trim() || 'Venue unavailable',
    kickoff: input.kickoff,
    category: input.category,
    question,
    description: input.description.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    outcomes: defaultOutcomes(),
    parameters: defaultParameters(input.kickoff),
    status: 'Draft',
    createdBy: currentAdminIdentity(),
    createdAt: nowIso(),
    auditHistory: [],
  };
  pushAudit(market, 'Draft created');
  markets.unshift(market);
  return delay(cloneMarket(market));
}

export async function updateOutcomes(id: string, outcomes: OutcomeInput[]): Promise<Market> {
  const market = findMarketOrThrow(id);
  const yes = outcomes.find((outcome) => outcome.id === 'YES');
  const no = outcomes.find((outcome) => outcome.id === 'NO');
  if (!yes || !no) fail('Both YES and NO outcomes are required.');
  if (yes.probabilityPct <= 0 || yes.probabilityPct >= 100) {
    fail('Probabilities must be between 1% and 99%.');
  }
  if (Math.round(yes.probabilityPct + no.probabilityPct) !== 100) {
    fail('YES and NO probabilities must add up to 100%.');
  }

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

export async function setParameters(id: string, parameters: MarketParameters): Promise<Market> {
  const market = findMarketOrThrow(id);
  if (new Date(parameters.closesAt).getTime() <= new Date(parameters.opensAt).getTime()) {
    fail('Trading must close after it opens.');
  }
  if (new Date(parameters.settlesBy).getTime() < new Date(parameters.closesAt).getTime()) {
    fail('Settlement time must be at or after the trading close time.');
  }
  if (parameters.minTradeUgx <= 0 || parameters.maxTradeUgx < parameters.minTradeUgx) {
    fail('Enter a valid minimum and maximum trade amount.');
  }

  market.parameters = { ...parameters };
  pushAudit(market, 'Parameters set');
  return delay(cloneMarket(market));
}

export async function publishMarket(id: string): Promise<Market> {
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
  const market = findMarketOrThrow(marketId);
  return delay(contractsFor(market).map((contract) => ({ ...contract })));
}

export async function fetchOrderBook(marketId: string): Promise<OrderBook> {
  const market = findMarketOrThrow(marketId);
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
 * Records a newly matched contract against a market — the hook the fan
 * trading journey (tradingService.ts) calls into so a fan's buy shows up in
 * the admin's Contracts/Trading tabs within the same mock session.
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
