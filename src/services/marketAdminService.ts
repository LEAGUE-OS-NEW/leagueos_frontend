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
// Creation and publishing are both handled by the merged Market Admin role —
// no cross-check between two different admins. `createdBy` is kept purely
// as an audit/display fact (who drafted this market), not as a publish gate.

import { useAuthStore } from '../store/authStore.ts';
import apiClient from './apiClient.ts';
import {
  extractApiError,
  normalizeApiList,
  unwrapApiData,
} from './apiUtils.ts';
import type {
  AdminMarket,
  MarketCategory as ApiMarketCategory,
  SportingEvent,
  SportResource,
} from '../types/api.ts';


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

function apiFailure(error: unknown): never {
  const details = extractApiError(error);

  throw Object.assign(
    new Error(details.message),
    {
      status: details.status,
    },
  );
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isUuid(value?: string): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function asMarketCategory(
  name?: string,
): MarketCategory {
  const value =
    (name || '').trim();

  return (
    MARKET_CATEGORIES.find(
      (category) =>
        category.toLowerCase() ===
        value.toLowerCase(),
    ) ?? 'Other'
  ) as MarketCategory;
}

function mapBackendStatus(
  market: AdminMarket,
): MarketStatus {
  switch (market.status) {
    case 'OPEN':
      return 'Live';

    case 'APPROVED':
      return 'Upcoming';

    case 'RESOLVED':
    case 'CLOSED':
      return 'Resolved';

    case 'VOIDED':
      return 'Voided';

    case 'SUSPENDED':
      return 'Cancelled';

    default:
      return 'Draft';
  }
}

function mapBackendMarket(
  market: AdminMarket,
): Market {
  const kickoff =
    market.sporting_event?.starts_at ||
    market.opens_at ||
    new Date().toISOString();

  const defaults =
    defaultParameters(kickoff);

  const backendOutcomes =
    market.outcomes || [];

  const outcomeFor = (
    side: OutcomeId,
  ): Outcome => {
    const backend =
      backendOutcomes.find(
        (item) =>
          item.side === side,
      );

    return {
      id: side,

      label:
        backend?.label ||
        (
          side === 'YES'
            ? 'Yes'
            : 'No'
        ),

      description:
        backend?.description || '',

      probabilityPct: 50,
      price: 5000,
    };
  };

  return {
    id:
      market.id,

    sportingEventId:
      market.sporting_event?.id,

    eventLabel:
      market.subject?.name ||
      market.sporting_event?.name ||
      market.question,

    competition:
      market.competition?.name ||
      market.sporting_event
        ?.competition?.name ||
      'Competition unavailable',

    venue:
      market.sporting_event?.venue ||
      'Venue unavailable',

    kickoff,

    category:
      asMarketCategory(
        market.sport?.name,
      ),

    question:
      market.question,

    description:
      market.description || '',

    tags: [],

    outcomes: [
      outcomeFor('YES'),
      outcomeFor('NO'),
    ],

    parameters: {
      ...defaults,

      opensAt:
        market.opens_at ||
        defaults.opensAt,

      closesAt:
        market.closes_at ||
        defaults.closesAt,

      featured:
        Boolean(
          market.is_featured,
        ),
    },

    status:
      mapBackendStatus(
        market,
      ),

    createdBy:
      market.created_by?.full_name ||
      market.created_by?.email ||
      'Backend user',

    createdAt:
      market.created_at ||
      new Date().toISOString(),

    publishedAt:
      market.status === 'OPEN'
        ? market.updated_at
        : undefined,

    resolvedAt:
      market.status === 'RESOLVED'
        ? market.updated_at
        : undefined,

    winningOutcomeId:
      market.winning_outcome
        ? (
            backendOutcomes.find(
              (outcome) =>
                outcome.id ===
                market.winning_outcome,
            )?.side === 'NO'
              ? 'NO'
              : 'YES'
          )
        : undefined,

    auditHistory:
      (
        market.status_transitions ||
        []
      ).map(
        (item) => ({
          id:
            item.id,

          timestamp:
            item.created_at,

          adminUser:
            'Authenticated admin',

          action:
            `${item.from_status} -> ${item.to_status}`,

          note:
            item.notes,
        }),
      ),
  };
}

async function resolveCreateReferences(
  input: MarketDetailsInput,
) {
  const [
    { data: sportsData },
    { data: eventsData },
    { data: categoriesData },
  ] = await Promise.all([
    apiClient.get(
      '/sports/',
    ),

    apiClient.get(
      '/sporting-events/',
    ),

    apiClient.get(
      '/markets/categories/',
    ),
  ]);

  const sports =
    normalizeApiList<SportResource>(
      sportsData,
    );

  const events =
    normalizeApiList<SportingEvent>(
      eventsData,
    );

  const categories =
    normalizeApiList<ApiMarketCategory>(
      categoriesData,
    );

  const requestedSport =
    normalizeName(
      input.category,
    );

  const sport =
    sports.find(
      (item) =>
        normalizeName(
          item.name,
        ) ===
        requestedSport,
    );

  if (!sport) {
    throw new Error(
      `No active ${input.category} sport exists in the backend.`,
    );
  }

  if (
    categories.length === 0
  ) {
    throw new Error(
      'No active market categories exist in the backend.',
    );
  }

  const category =
    categories.find(
      (item) =>
        normalizeName(
          item.name,
        ) ===
        'match result',
    ) ||
    categories.find(
      (item) =>
        normalizeName(
          item.name,
        ) ===
        normalizeName(
          input.category,
        ),
    ) ||
    categories[0];

  const label =
    normalizeName(
      input.eventLabel,
    );

  const eventById =
    isUuid(
      input.sportingEventId,
    )
      ? events.find(
          (item) =>
            item.id ===
            input.sportingEventId,
        )
      : undefined;

  const eventByName =
    events.find(
      (item) => {
        if (
          item.sport?.id !==
          sport.id
        ) {
          return false;
        }

        if (
          normalizeName(
            item.name,
          ) ===
          label
        ) {
          return true;
        }

        if (
          item.participants.length === 0
        ) {
          return false;
        }

        return (
          item.participants.every(
            (participant) =>
              label.includes(
                normalizeName(
                  participant
                    .participant
                    .name,
                ),
              ),
          )
        );
      },
    );

  return {
    sport,
    category,

    event:
      eventById ||
      eventByName,
  };
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

function cloneProposal(proposal: MarketProposal): MarketProposal {
  return { ...proposal, auditHistory: proposal.auditHistory.map((event) => ({ ...event })) };
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
   MARKETS - BACKEND PERSISTED
   ============================================================ */

export async function fetchMarkets(): Promise<Market[]> {
  try {
    const { data } =
      await apiClient.get(
        '/market-admin/markets/',
      );

    return normalizeApiList<AdminMarket>(
      data,
    ).map(
      mapBackendMarket,
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function fetchMarket(
  id: string,
): Promise<Market> {
  try {
    const { data } =
      await apiClient.get(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
      );

    return mapBackendMarket(
      unwrapApiData<AdminMarket>(
        data,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function fetchPublishedMarkets(): Promise<Market[]> {
  try {
    const { data } =
      await apiClient.get(
        '/markets/',
        {
          params: {
            status: 'OPEN',
          },
        },
      );

    return normalizeApiList<AdminMarket>(
      data,
    ).map(
      mapBackendMarket,
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function fetchPublishedMarket(
  id: string,
): Promise<Market> {
  try {
    const { data } =
      await apiClient.get(
        `/markets/${encodeURIComponent(id)}/`,
      );

    return mapBackendMarket(
      unwrapApiData<AdminMarket>(
        data,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function fetchFeaturedPublishedMarkets(
  limit = 5,
): Promise<Market[]> {
  try {
    const { data } =
      await apiClient.get(
        '/markets/',
        {
          params: {
            status: 'OPEN',
            is_featured: true,
          },
        },
      );

    const featured =
      normalizeApiList<AdminMarket>(
        data,
      ).map(
        mapBackendMarket,
      );

    if (
      featured.length >=
      limit
    ) {
      return featured.slice(
        0,
        limit,
      );
    }

    const {
      data: allData,
    } =
      await apiClient.get(
        '/markets/',
        {
          params: {
            status: 'OPEN',
          },
        },
      );

    const all =
      normalizeApiList<AdminMarket>(
        allData,
      ).map(
        mapBackendMarket,
      );

    const seen =
      new Set(
        featured.map(
          (market) =>
            market.id,
        ),
      );

    return [
      ...featured,

      ...all.filter(
        (market) =>
          !seen.has(
            market.id,
          ),
      ),
    ].slice(
      0,
      limit,
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function createMarketDraft(
  input: MarketDetailsInput,
): Promise<Market> {
  if (
    !input.eventLabel.trim()
  ) {
    fail(
      'Select an event for this market.',
    );
  }

  const question =
    input.question.trim();

  if (
    question.length < 6 ||
    !question.endsWith('?')
  ) {
    fail(
      'Enter a single, unambiguous YES/NO question ending with a question mark.',
    );
  }

  try {
    const {
      sport,
      category,
      event,
    } =
      await resolveCreateReferences(
        input,
      );

    const kickoff =
      input.kickoff ||
      event?.starts_at ||
      new Date(
        Date.now() +
        24 * 60 * 60_000,
      ).toISOString();

    const initial =
      defaultParameters(
        kickoff,
      );

    const description =
      input.description.trim();

    const payload:
      Record<string, unknown> = {
        sport_id:
          sport.id,

        category_id:
          category.id,

        scope_type:
          event
            ? 'EVENT'
            : 'CUSTOM',

        question,

        description,

        rules:
          description ||
          question,

        resolution_source:
          'Official League OS sporting event result',

        resolution_criteria:
          description ||
          question,

        opens_at:
          initial.opensAt,

        closes_at:
          initial.closesAt,

        is_featured:
          false,

        yes_label:
          'Yes',

        no_label:
          'No',
      };

    if (event) {
      payload.sporting_event_id =
        event.id;
    } else {
      payload.custom_subject =
        input.eventLabel.trim();
    }

    const { data } =
      await apiClient.post(
        '/market-admin/markets/',
        payload,
      );

    return mapBackendMarket(
      unwrapApiData<AdminMarket>(
        data,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function updateOutcomes(
  id: string,
  outcomes: OutcomeInput[],
): Promise<Market> {
  const yes =
    outcomes.find(
      (outcome) =>
        outcome.id === 'YES',
    );

  const no =
    outcomes.find(
      (outcome) =>
        outcome.id === 'NO',
    );

  if (
    !yes ||
    !no
  ) {
    fail(
      'Both YES and NO outcomes are required.',
    );
  }

  if (
    yes.probabilityPct <= 0 ||
    yes.probabilityPct >= 100
  ) {
    fail(
      'Probabilities must be between 1% and 99%.',
    );
  }

  if (
    Math.round(
      yes.probabilityPct +
      no.probabilityPct,
    ) !== 100
  ) {
    fail(
      'YES and NO probabilities must add up to 100%.',
    );
  }

  try {
    const { data } =
      await apiClient.patch(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
        {
          yes_label:
            yes.label.trim() ||
            'Yes',

          no_label:
            no.label.trim() ||
            'No',
        },
      );

    const mapped =
      mapBackendMarket(
        unwrapApiData<AdminMarket>(
          data,
        ),
      );

    mapped.outcomes =
      [yes, no].map(
        (outcome) => ({
          id:
            outcome.id,

          label:
            outcome.label.trim() ||
            outcome.id,

          description:
            outcome.description.trim(),

          probabilityPct:
            outcome.probabilityPct,

          price:
            priceFromProbability(
              outcome.probabilityPct,
            ),
        }),
      );

    return mapped;
  } catch (error) {
    return apiFailure(error);
  }
}

export async function setParameters(
  id: string,
  parameters: MarketParameters,
): Promise<Market> {
  if (
    new Date(
      parameters.closesAt,
    ).getTime() <=
    new Date(
      parameters.opensAt,
    ).getTime()
  ) {
    fail(
      'Trading must close after it opens.',
    );
  }

  if (
    new Date(
      parameters.settlesBy,
    ).getTime() <
    new Date(
      parameters.closesAt,
    ).getTime()
  ) {
    fail(
      'Settlement time must be at or after the trading close time.',
    );
  }

  if (
    parameters.minTradeUgx <= 0 ||
    parameters.maxTradeUgx <
      parameters.minTradeUgx
  ) {
    fail(
      'Enter a valid minimum and maximum trade amount.',
    );
  }

  try {
    const { data } =
      await apiClient.patch(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
        {
          opens_at:
            parameters.opensAt,

          closes_at:
            parameters.closesAt,

          is_featured:
            parameters.featured,
        },
      );

    const mapped =
      mapBackendMarket(
        unwrapApiData<AdminMarket>(
          data,
        ),
      );

    mapped.parameters = {
      ...mapped.parameters,
      ...parameters,
    };

    return mapped;
  } catch (error) {
    return apiFailure(error);
  }
}

async function lifecycleAction(
  id: string,
  action: string,
  notes: string,
): Promise<AdminMarket> {
  const { data } =
    await apiClient.post(
      `/market-admin/markets/${encodeURIComponent(id)}/${action}/`,
      {
        notes,
      },
    );

  return unwrapApiData<AdminMarket>(
    data,
  );
}

export async function publishMarket(
  id: string,
): Promise<Market> {
  try {
    const { data } =
      await apiClient.get(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
      );

    let market =
      unwrapApiData<AdminMarket>(
        data,
      );

    if (
      market.status === 'DRAFT' ||
      market.status === 'REJECTED'
    ) {
      market =
        await lifecycleAction(
          id,
          'submit',
          'Submitted from the Market Admin publish flow.',
        );
    }

    if (
      market.status ===
      'PENDING_APPROVAL'
    ) {
      market =
        await lifecycleAction(
          id,
          'approve',
          'Approved from the Market Admin publish flow.',
        );
    }

    if (
      market.status ===
      'APPROVED'
    ) {
      market =
        await lifecycleAction(
          id,
          'open',
          'Opened from the Market Admin publish flow.',
        );
    }

    if (
      market.status !==
      'OPEN'
    ) {
      throw new Error(
        `Market publish stopped at backend status ${market.status}.`,
      );
    }

    return mapBackendMarket(
      market,
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function cancelMarket(
  id: string,
  reason: string,
): Promise<Market> {
  if (
    !reason.trim()
  ) {
    fail(
      'A cancellation reason is required.',
    );
  }

  try {
    const { data } =
      await apiClient.get(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
      );

    const market =
      unwrapApiData<AdminMarket>(
        data,
      );

    if (
      market.status !==
      'OPEN'
    ) {
      fail(
        `Only an open market can be suspended. Current status: ${market.status}.`,
      );
    }

    return mapBackendMarket(
      await lifecycleAction(
        id,
        'suspend',
        reason.trim(),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}

export async function resolveMarket(
  id: string,
  winningOutcomeId: OutcomeId,
): Promise<Market> {
  try {
    const { data } =
      await apiClient.get(
        `/market-admin/markets/${encodeURIComponent(id)}/`,
      );

    const market =
      unwrapApiData<AdminMarket>(
        data,
      );

    const winning =
      market.outcomes.find(
        (outcome) =>
          outcome.side ===
          winningOutcomeId,
      );

    if (!winning) {
      fail(
        `The ${winningOutcomeId} outcome was not found.`,
      );
    }

    const response =
      await apiClient.post(
        `/market-admin/markets/${encodeURIComponent(id)}/resolve/`,
        {
          winning_outcome_id:
            winning.id,

          notes:
            `Resolved as ${winningOutcomeId}.`,

          evidence:
            'Verified sporting event result.',
        },
      );

    return mapBackendMarket(
      unwrapApiData<AdminMarket>(
        response.data,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
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

export async function fetchContracts(
  marketId: string,
): Promise<Contract[]> {
  const mockMarket =
    markets.find(
      (item) =>
        item.id === marketId,
    );

  if (!mockMarket) {
    return [];
  }

  return delay(
    contractsFor(
      mockMarket,
    ).map(
      (contract) => ({
        ...contract,
      }),
    ),
  );
}

export async function fetchOrderBook(
  marketId: string,
): Promise<OrderBook> {
  const mockMarket =
    markets.find(
      (item) =>
        item.id === marketId,
    );

  const market =
    mockMarket ??
    (
      await fetchPublishedMarket(
        marketId,
      ).catch(
        () =>
          fetchMarket(
            marketId,
          ),
      )
    );

  const yes =
    market.outcomes.find(
      (outcome) =>
        outcome.id === 'YES',
    )!;

  const seed =
    seedFromId(
      marketId,
    );

  const lastPrice =
    yes.price;

  const spread =
    20 +
    (
      seed %
      60
    );

  const levels = (
    base: number,
    direction: 1 | -1,
  ): OrderBookLevel[] =>
    Array.from(
      {
        length: 5,
      },
      (_, index) => ({
        price:
          Math.max(
            1,
            Math.min(
              9_999,
              base +
                direction *
                (
                  index + 1
                ) *
                (
                  10 +
                  (
                    (
                      seed >>
                      (
                        index + 2
                      )
                    ) %
                    15
                  )
                ),
            ),
          ),

        quantityUgx:
          5_000 +
          (
            (
              seed >>
              (
                index + 1
              )
            ) %
            45_000
          ),
      }),
    );

  return delay({
    marketId,

    outcomeId:
      'YES',

    bids:
      levels(
        lastPrice -
          Math.round(
            spread / 2,
          ),
        -1,
      ),

    asks:
      levels(
        lastPrice +
          Math.round(
            spread / 2,
          ),
        1,
      ),

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
