// Market Approval Admin — service layer (US-17.3).
//
// Self-contained mock data, deliberately not imported from
// marketOperationsService.ts (that file belongs to the parallel US-17.2
// work) — same real fixtures/clubs for narrative continuity, no code
// dependency between the two modules. Same async-over-mock-data shape as
// sportsDataService.ts / marketOperationsService.ts so a real backend swap
// later only touches this file.

export type Sport = 'Football' | 'Rugby' | 'Basketball';

export type ApprovalStatus =
  | 'Awaiting Review'
  | 'High Risk'
  | 'Second Approval Required'
  | 'Returned'
  | 'Approved'
  | 'Rejected';

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskFlag {
  id: string;
  label: string;
  severity: RiskSeverity;
}

export type DecisionAction =
  | 'Approved'
  | 'Rejected'
  | 'Returned for changes'
  | 'Second approval given';

export interface ApprovalDecision {
  id: string;
  timestamp: string;
  reviewer: string;
  action: DecisionAction;
  reason?: string;
}

export interface MarketForApproval {
  id: string;
  eventLabel: string;
  sport: Sport;
  competition: string;
  question: string;
  outcomes: string[];
  resolutionRules: string;
  officialSource: string;
  voidConditions: string;
  opensAt: string;
  closesAt: string;
  createdBy: string;
  createdByRole: string;
  submittedAt: string;
  estimatedVolume: string;
  isHighValue: boolean;
  status: ApprovalStatus;
  riskFlags: RiskFlag[];
  missingRules: string[];
  requiresSecondApproval: boolean;
  firstApprovedBy?: string;
  decisionHistory: ApprovalDecision[];
}

/** The signed-in reviewer for this mock session — matches the sibling
 * service's `adminUser: 'You'` convention. */
export const CURRENT_REVIEWER = 'You';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nowIso() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

let markets: MarketForApproval[] = [
  {
    id: 'MKT-A-301',
    eventLabel: 'Vipers SC vs Express FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    question: 'Will Vipers SC beat Express FC?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if Vipers SC win in regulation time. Resolves NO for a draw or Express FC win.',
    officialSource: 'ISIN official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T15:45:00Z',
    createdBy: 'Nancy A.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-04T09:10:00Z',
    estimatedVolume: 'UGX 1.2M projected',
    isHighValue: false,
    status: 'Awaiting Review',
    riskFlags: [],
    missingRules: [],
    requiresSecondApproval: false,
    decisionHistory: [],
  },
  {
    id: 'MKT-A-302',
    eventLabel: 'City Oilers vs UCU Canons',
    sport: 'Basketball',
    competition: 'NBL Uganda',
    question: 'Will City Oilers score 80 or more points?',
    outcomes: ['Yes', 'No'],
    resolutionRules: "Resolves YES if City Oilers' final score is 80 or higher. Resolves NO otherwise.",
    officialSource: 'ISIN official match feed',
    voidConditions: 'Voided if the fixture does not take place on the scheduled date.',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T18:45:00Z',
    createdBy: 'Nancy A.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-04T10:05:00Z',
    estimatedVolume: 'UGX 8.4M projected',
    isHighValue: true,
    status: 'Awaiting Review',
    riskFlags: [],
    missingRules: [],
    requiresSecondApproval: true,
    decisionHistory: [],
  },
  {
    id: 'MKT-A-303',
    eventLabel: 'KOBS vs Black Pirates',
    sport: 'Rugby',
    competition: 'Nile Special Rugby League',
    question: 'Will KOBS win by 7 or more points?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if KOBS win the match by a margin of 7 points or more. Resolves NO otherwise.',
    officialSource: 'SportsRadar official match feed',
    voidConditions: '',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-10T14:45:00Z',
    createdBy: 'Daniel R.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-03T16:20:00Z',
    estimatedVolume: 'UGX 640K projected',
    isHighValue: false,
    status: 'High Risk',
    riskFlags: [
      {
        id: 'RF-1',
        label: "Margin resolution doesn't specify full-time vs including extra time.",
        severity: 'high',
      },
    ],
    missingRules: ['No void condition specified for an abandoned or postponed match.'],
    requiresSecondApproval: false,
    decisionHistory: [],
  },
  {
    id: 'MKT-A-304',
    eventLabel: 'SC Villa vs KCCA FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    question: 'Will SC Villa vs KCCA FC end in a draw?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if the match ends level after regulation time. Resolves NO otherwise.',
    officialSource: 'SportsRadar official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    opensAt: '2026-08-06T08:00:00Z',
    closesAt: '2026-08-11T15:45:00Z',
    createdBy: CURRENT_REVIEWER,
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-04T11:30:00Z',
    estimatedVolume: 'UGX 950K projected',
    isHighValue: false,
    status: 'Awaiting Review',
    riskFlags: [],
    missingRules: [],
    requiresSecondApproval: false,
    decisionHistory: [],
  },
  {
    id: 'MKT-A-305',
    eventLabel: 'Express FC vs Onduparaka FC',
    sport: 'Football',
    competition: 'Uganda Cup',
    question: 'Will Express FC beat Onduparaka FC?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if Express FC win in regulation time. Resolves NO for a draw or Onduparaka FC win.',
    officialSource: 'SportsRadar official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    opensAt: '2026-08-07T08:00:00Z',
    closesAt: '2026-08-12T17:45:00Z',
    createdBy: 'Nancy A.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-02T13:00:00Z',
    estimatedVolume: 'UGX 6.1M projected',
    isHighValue: true,
    status: 'Second Approval Required',
    riskFlags: [],
    missingRules: [],
    requiresSecondApproval: true,
    firstApprovedBy: 'Grace K.',
    decisionHistory: [
      {
        id: 'MKT-A-305-D1',
        timestamp: '2026-08-03T09:15:00Z',
        reviewer: 'Grace K.',
        action: 'Approved',
        reason: 'Clear question, complete rules, verified event. High volume — routing for second approval.',
      },
    ],
  },
  {
    id: 'MKT-A-306',
    eventLabel: 'KOBS vs Black Pirates',
    sport: 'Rugby',
    competition: 'Nile Special Rugby League',
    question: 'Will there be over 3 tries scored in the match?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Count tries from both teams combined across the full match.',
    officialSource: 'SportsRadar official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before full-time.',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-10T14:45:00Z',
    createdBy: 'Daniel R.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-01T18:30:00Z',
    estimatedVolume: 'UGX 410K projected',
    isHighValue: false,
    status: 'Returned',
    riskFlags: [],
    missingRules: ['Try-count source is not precise enough to resolve disputes.'],
    requiresSecondApproval: false,
    decisionHistory: [
      {
        id: 'MKT-A-306-D1',
        timestamp: '2026-08-02T08:45:00Z',
        reviewer: CURRENT_REVIEWER,
        action: 'Returned for changes',
        reason: 'Needs a precise try-count source before this can be approved.',
      },
    ],
  },
  {
    id: 'MKT-A-307',
    eventLabel: 'Vipers SC vs Express FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    question: 'Will both teams score?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if both Vipers SC and Express FC score at least once. Resolves NO otherwise.',
    officialSource: 'ISIN official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T15:45:00Z',
    createdBy: 'Nancy A.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-08-01T10:00:00Z',
    estimatedVolume: 'UGX 780K projected',
    isHighValue: false,
    status: 'Approved',
    riskFlags: [],
    missingRules: [],
    requiresSecondApproval: false,
    decisionHistory: [
      {
        id: 'MKT-A-307-D1',
        timestamp: '2026-08-01T14:20:00Z',
        reviewer: CURRENT_REVIEWER,
        action: 'Approved',
      },
    ],
  },
  {
    id: 'MKT-A-308',
    eventLabel: 'SC Villa vs KCCA FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    question: 'Will there be a red card in the match?',
    outcomes: ['Yes', 'No'],
    resolutionRules: 'Resolves YES if a red card is shown to either team. Resolves NO otherwise.',
    officialSource: 'SportsRadar official match feed',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    opensAt: '2026-08-06T08:00:00Z',
    closesAt: '2026-08-11T15:45:00Z',
    createdBy: 'Daniel R.',
    createdByRole: 'Market Operations Admin',
    submittedAt: '2026-07-31T09:00:00Z',
    estimatedVolume: 'UGX 320K projected',
    isHighValue: false,
    status: 'Rejected',
    riskFlags: [
      { id: 'RF-2', label: 'No reliable official source tracks live disciplinary events for this competition.', severity: 'high' },
    ],
    missingRules: [],
    requiresSecondApproval: false,
    decisionHistory: [
      {
        id: 'MKT-A-308-D1',
        timestamp: '2026-07-31T15:40:00Z',
        reviewer: CURRENT_REVIEWER,
        action: 'Rejected',
        reason: 'Too speculative — no dependable official source for live disciplinary events on this feed.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function fetchMarketsForApproval(): Promise<MarketForApproval[]> {
  return delay([...markets]);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

function updateMarket(id: string, updater: (market: MarketForApproval) => MarketForApproval): MarketForApproval {
  const index = markets.findIndex((market) => market.id === id);
  if (index === -1) {
    throw new Error(`Market ${id} not found`);
  }

  const updated = updater(markets[index]);
  markets = [...markets.slice(0, index), updated, ...markets.slice(index + 1)];
  return updated;
}

export async function approveMarket(id: string, reviewer: string): Promise<MarketForApproval> {
  const updated = updateMarket(id, (market) => {
    const decision: ApprovalDecision = {
      id: `${market.id}-D${market.decisionHistory.length + 1}`,
      timestamp: nowIso(),
      reviewer,
      action: market.requiresSecondApproval && !market.firstApprovedBy ? 'Approved' : 'Second approval given',
    };

    if (market.requiresSecondApproval && !market.firstApprovedBy) {
      return {
        ...market,
        status: 'Second Approval Required',
        firstApprovedBy: reviewer,
        decisionHistory: [...market.decisionHistory, decision],
      };
    }

    return {
      ...market,
      status: 'Approved',
      decisionHistory: [...market.decisionHistory, decision],
    };
  });

  return delay(updated);
}

export async function rejectMarket(id: string, reviewer: string, reason: string): Promise<MarketForApproval> {
  const updated = updateMarket(id, (market) => ({
    ...market,
    status: 'Rejected',
    decisionHistory: [
      ...market.decisionHistory,
      { id: `${market.id}-D${market.decisionHistory.length + 1}`, timestamp: nowIso(), reviewer, action: 'Rejected', reason },
    ],
  }));

  return delay(updated);
}

export async function returnMarket(id: string, reviewer: string, reason: string): Promise<MarketForApproval> {
  const updated = updateMarket(id, (market) => ({
    ...market,
    status: 'Returned',
    decisionHistory: [
      ...market.decisionHistory,
      {
        id: `${market.id}-D${market.decisionHistory.length + 1}`,
        timestamp: nowIso(),
        reviewer,
        action: 'Returned for changes',
        reason,
      },
    ],
  }));

  return delay(updated);
}
