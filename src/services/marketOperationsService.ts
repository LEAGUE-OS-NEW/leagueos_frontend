// Market Operations Admin — service layer (US-17.2).
//
// Same pattern as sportsDataService.ts: every export is async and resolves
// against in-memory mock data via a simulated-latency helper, so the shapes
// match what a real backend integration will need later.

export type Sport = 'Football' | 'Rugby' | 'Basketball';
export type VerificationStatus = 'Verified' | 'Pending' | 'Unverified';
export type DraftStatus = 'Draft' | 'Ready for Approval' | 'Submitted';
export type ProposalStatus = 'New' | 'Under Review' | 'Returned' | 'Converted' | 'Rejected';

export interface VerifiedEvent {
  id: string;
  teamA: string;
  teamB: string;
  sport: Sport;
  competition: string;
  venue: string;
  kickoff: string;
  verificationStatus: VerificationStatus;
  provider: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface MarketDraft {
  id: string;
  eventId: string;
  eventLabel: string;
  question: string;
  resolutionRules: string;
  officialSource: string;
  opensAt: string;
  closesAt: string;
  voidConditions: string;
  status: DraftStatus;
  createdBy: string;
  createdAt: string;
  duplicateOfDraftId?: string;
}

export interface MarketProposal {
  id: string;
  submittedBy: string;
  eventId: string;
  eventLabel: string;
  suggestedQuestion: string;
  suggestedRules?: string;
  status: ProposalStatus;
  createdAt: string;
  duplicateOfDraftId?: string;
  auditHistory: AuditEvent[];
}

export interface NewDraftInput {
  eventId: string;
  eventLabel: string;
  question: string;
  resolutionRules: string;
  officialSource: string;
  opensAt: string;
  closesAt: string;
  voidConditions: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nowIso() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

const events: VerifiedEvent[] = [
  {
    id: 'EV-1',
    teamA: 'Vipers SC',
    teamB: 'Express FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    venue: "St. Mary's Stadium",
    kickoff: '2026-08-09T16:00:00Z',
    verificationStatus: 'Verified',
    provider: 'ISIN',
  },
  {
    id: 'EV-2',
    teamA: 'City Oilers',
    teamB: 'UCU Canons',
    sport: 'Basketball',
    competition: 'NBL Uganda',
    venue: 'Lugogo Indoor Arena',
    kickoff: '2026-08-09T19:00:00Z',
    verificationStatus: 'Verified',
    provider: 'ISIN',
  },
  {
    id: 'EV-3',
    teamA: 'KOBS',
    teamB: 'Black Pirates',
    sport: 'Rugby',
    competition: 'Nile Special Rugby League',
    venue: 'Kings Park Arena',
    kickoff: '2026-08-10T15:00:00Z',
    verificationStatus: 'Verified',
    provider: 'SportsRadar',
  },
  {
    id: 'EV-4',
    teamA: 'SC Villa',
    teamB: 'KCCA FC',
    sport: 'Football',
    competition: 'Uganda Premier League',
    venue: 'Mandela National Stadium',
    kickoff: '2026-08-11T16:00:00Z',
    verificationStatus: 'Pending',
    provider: 'SportsRadar',
  },
  {
    id: 'EV-5',
    teamA: 'Express FC',
    teamB: 'Onduparaka FC',
    sport: 'Football',
    competition: 'Uganda Cup',
    venue: 'Wankulukuku Stadium',
    kickoff: '2026-08-12T18:00:00Z',
    verificationStatus: 'Unverified',
    provider: 'SportsRadar',
  },
];

let drafts: MarketDraft[] = [
  {
    id: 'MKT-D-101',
    eventId: 'EV-1',
    eventLabel: 'Vipers SC vs Express FC',
    question: 'Will Vipers SC beat Express FC?',
    resolutionRules: 'Resolves YES if Vipers SC win in regulation time. Resolves NO for a draw or Express FC win.',
    officialSource: 'ISIN official match feed',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T15:45:00Z',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    status: 'Ready for Approval',
    createdBy: 'Nancy A.',
    createdAt: '2026-08-03T09:00:00Z',
  },
  {
    id: 'MKT-D-102',
    eventId: 'EV-2',
    eventLabel: 'City Oilers vs UCU Canons',
    question: 'Will City Oilers score 80 or more points?',
    resolutionRules: "Resolves YES if City Oilers' final score is 80 or higher. Resolves NO otherwise.",
    officialSource: 'ISIN official match feed',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T18:45:00Z',
    voidConditions: 'Voided if the fixture does not take place on the scheduled date.',
    status: 'Draft',
    createdBy: 'Nancy A.',
    createdAt: '2026-08-04T07:00:00Z',
  },
  {
    id: 'MKT-D-103',
    eventId: 'EV-3',
    eventLabel: 'KOBS vs Black Pirates',
    question: 'Will KOBS win by 7 or more points?',
    resolutionRules: 'Resolves YES if KOBS win the match by a margin of 7 points or more. Resolves NO otherwise.',
    officialSource: 'SportsRadar official match feed',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-10T14:45:00Z',
    voidConditions: 'Voided if the fixture is postponed or abandoned before full-time.',
    status: 'Submitted',
    createdBy: 'Daniel R.',
    createdAt: '2026-08-02T11:20:00Z',
  },
  {
    id: 'MKT-D-104',
    eventId: 'EV-1',
    eventLabel: 'Vipers SC vs Express FC',
    question: 'Will Vipers SC keep a clean sheet?',
    resolutionRules: 'Resolves YES if Express FC do not score. Resolves NO if Express FC score at least once.',
    officialSource: 'ISIN official match feed',
    opensAt: '2026-08-05T08:00:00Z',
    closesAt: '2026-08-09T15:45:00Z',
    voidConditions: 'Voided if the fixture is postponed or abandoned before 60 minutes are played.',
    status: 'Draft',
    createdBy: 'Nancy A.',
    createdAt: '2026-08-04T07:30:00Z',
    duplicateOfDraftId: 'MKT-D-101',
  },
];

let proposals: MarketProposal[] = [
  {
    id: 'PROP-201',
    submittedBy: 'Vipers SC Club Admin',
    eventId: 'EV-1',
    eventLabel: 'Vipers SC vs Express FC',
    suggestedQuestion: 'Will Vipers SC win the match?',
    status: 'New',
    createdAt: '2026-08-03T12:00:00Z',
    auditHistory: [
      {
        id: 'PROP-201-A1',
        timestamp: '2026-08-03T12:00:00Z',
        adminUser: 'Vipers SC Club Admin',
        action: 'Proposal submitted',
      },
    ],
  },
  {
    id: 'PROP-202',
    submittedBy: 'Fan: J. Okello',
    eventId: 'EV-4',
    eventLabel: 'SC Villa vs KCCA FC',
    suggestedQuestion: 'Will SC Villa vs KCCA FC end in a draw?',
    status: 'New',
    createdAt: '2026-08-03T15:40:00Z',
    auditHistory: [
      {
        id: 'PROP-202-A1',
        timestamp: '2026-08-03T15:40:00Z',
        adminUser: 'Fan: J. Okello',
        action: 'Proposal submitted',
      },
    ],
  },
  {
    id: 'PROP-203',
    submittedBy: 'City Oilers Club Admin',
    eventId: 'EV-2',
    eventLabel: 'City Oilers vs UCU Canons',
    suggestedQuestion: 'Will City Oilers win by 15 or more points?',
    status: 'Under Review',
    createdAt: '2026-08-02T09:10:00Z',
    duplicateOfDraftId: 'MKT-D-102',
    auditHistory: [
      {
        id: 'PROP-203-A1',
        timestamp: '2026-08-02T09:10:00Z',
        adminUser: 'City Oilers Club Admin',
        action: 'Proposal submitted',
      },
      {
        id: 'PROP-203-A2',
        timestamp: '2026-08-03T10:00:00Z',
        adminUser: 'Nancy A.',
        action: 'Marked Under Review',
        note: 'Overlaps with an existing draft for the same event',
      },
    ],
  },
  {
    id: 'PROP-204',
    submittedBy: 'Fan: R. Namono',
    eventId: 'EV-3',
    eventLabel: 'KOBS vs Black Pirates',
    suggestedQuestion: 'Will there be over 3 tries scored in the match?',
    suggestedRules: 'Count tries from both teams combined across the full match.',
    status: 'Returned',
    createdAt: '2026-08-01T18:00:00Z',
    auditHistory: [
      {
        id: 'PROP-204-A1',
        timestamp: '2026-08-01T18:00:00Z',
        adminUser: 'Fan: R. Namono',
        action: 'Proposal submitted',
      },
      {
        id: 'PROP-204-A2',
        timestamp: '2026-08-02T08:30:00Z',
        adminUser: 'Nancy A.',
        action: 'Returned for changes',
        note: 'Needs a precise try-count source before it can be converted',
      },
    ],
  },
  {
    id: 'PROP-205',
    submittedBy: 'Express FC Club Admin',
    eventId: 'EV-5',
    eventLabel: 'Express FC vs Onduparaka FC',
    suggestedQuestion: 'Will Express FC beat Onduparaka FC?',
    status: 'New',
    createdAt: '2026-08-04T06:15:00Z',
    auditHistory: [
      {
        id: 'PROP-205-A1',
        timestamp: '2026-08-04T06:15:00Z',
        adminUser: 'Express FC Club Admin',
        action: 'Proposal submitted',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function fetchVerifiedEvents(): Promise<VerifiedEvent[]> {
  return delay([...events]);
}

export async function fetchDrafts(): Promise<MarketDraft[]> {
  return delay([...drafts]);
}

export async function fetchProposals(): Promise<MarketProposal[]> {
  return delay([...proposals]);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

export async function createDraft(input: NewDraftInput): Promise<MarketDraft> {
  const question = input.question.trim();
  if (!question.endsWith('?')) {
    throw new Error('A market draft requires a single Yes/No question ending in "?".');
  }
  if (!input.resolutionRules.trim()) {
    throw new Error('A market draft requires resolution rules.');
  }
  if (!input.officialSource.trim()) {
    throw new Error('A market draft requires an official source.');
  }
  if (!input.opensAt || !input.closesAt || new Date(input.closesAt).getTime() <= new Date(input.opensAt).getTime()) {
    throw new Error('A market draft requires a close time after its open time.');
  }
  if (!input.voidConditions.trim()) {
    throw new Error('A market draft requires void conditions.');
  }

  const duplicate = drafts.find((draft) => draft.eventId === input.eventId);

  const draft: MarketDraft = {
    id: `MKT-D-${100 + drafts.length + 1}`,
    ...input,
    question,
    status: 'Draft',
    createdBy: 'You',
    createdAt: nowIso(),
    duplicateOfDraftId: duplicate?.id,
  };

  drafts = [draft, ...drafts];
  return delay(draft);
}

export async function submitForApproval(draftId: string): Promise<MarketDraft> {
  const index = drafts.findIndex((draft) => draft.id === draftId);
  if (index === -1) {
    throw new Error(`Draft ${draftId} not found`);
  }

  const updated: MarketDraft = { ...drafts[index], status: 'Ready for Approval' };
  drafts = [...drafts.slice(0, index), updated, ...drafts.slice(index + 1)];
  return delay(updated);
}

function mutateProposal(proposalId: string, status: ProposalStatus, action: string, note: string): MarketProposal {
  const index = proposals.findIndex((proposal) => proposal.id === proposalId);
  if (index === -1) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const event: AuditEvent = {
    id: `${proposalId}-A${proposals[index].auditHistory.length + 1}`,
    timestamp: nowIso(),
    adminUser: 'You',
    action,
    note: note || undefined,
  };

  const updated: MarketProposal = {
    ...proposals[index],
    status,
    auditHistory: [...proposals[index].auditHistory, event],
  };

  proposals = [...proposals.slice(0, index), updated, ...proposals.slice(index + 1)];
  return updated;
}

export async function convertProposalToDraft(proposalId: string): Promise<MarketProposal> {
  return delay(mutateProposal(proposalId, 'Converted', 'Converted to draft', 'Sent to the Market Draft Editor'));
}

export async function returnProposal(proposalId: string, note: string): Promise<MarketProposal> {
  return delay(mutateProposal(proposalId, 'Returned', 'Returned for changes', note));
}

export async function rejectProposal(proposalId: string, note: string): Promise<MarketProposal> {
  return delay(mutateProposal(proposalId, 'Rejected', 'Rejected', note));
}

export async function requestProposalInfo(proposalId: string, note: string): Promise<MarketProposal> {
  return delay(mutateProposal(proposalId, 'Under Review', 'Requested more information', note));
}
