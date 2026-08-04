// Sports Data Admin — service layer (US-17.1).
//
// Every export here is async and returns a Promise, resolved for now against
// the in-memory mock data below via a simulated-latency helper. This mirrors
// the shape a real backend integration needs (loading states, try/catch,
// await at every call site) so that swapping these bodies for real
// `axiosInstance` calls (see authServices.ts/ticketingService.ts) later is a
// drop-in replacement — no component changes required.

export type QueueType = 'Import' | 'Mapping' | 'Conflict' | 'Club Submission' | 'Correction';
export type IssueCategory = 'Competition' | 'Provider Mapping' | 'Fixture' | 'Player' | 'Statistic';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Pending' | 'In Review' | 'Approved' | 'Rejected';
export type ProviderStatus = 'Healthy' | 'Degraded' | 'Down';
export type MappingStatus = 'Mapped' | 'Partial' | 'Unmapped';
export type Sport = 'Football' | 'Rugby' | 'Basketball';

export interface FieldComparison {
  field: string;
  current: string;
  incoming: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface SportsDataIssue {
  id: string;
  queueType: QueueType;
  category: IssueCategory;
  severity: Severity;
  status: IssueStatus;
  title: string;
  description: string;
  provider: string;
  competition: string;
  club?: string;
  createdAt: string;
  submittedBy: string;
  comparisons: FieldComparison[];
  auditHistory: AuditEvent[];
}

export interface ProviderHealth {
  id: string;
  name: string;
  status: ProviderStatus;
  lastSyncAt: string;
  recordsSynced: number;
  errorRatePct: number | null;
}

export interface Competition {
  id: string;
  name: string;
  sport: Sport;
  provider: string;
  mappingStatus: MappingStatus;
  active: boolean;
  season: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nowIso() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const providers: ProviderHealth[] = [
  {
    id: 'isin',
    name: 'ISIN',
    status: 'Healthy',
    lastSyncAt: '2026-08-04T09:58:00Z',
    recordsSynced: 45210,
    errorRatePct: 0.4,
  },
  {
    id: 'sportsradar',
    name: 'SportsRadar',
    status: 'Degraded',
    lastSyncAt: '2026-08-04T09:38:00Z',
    recordsSynced: 12840,
    errorRatePct: 3.8,
  },
  {
    id: 'optastats',
    name: 'OptaStats',
    status: 'Down',
    lastSyncAt: '2026-08-04T07:02:00Z',
    recordsSynced: 0,
    errorRatePct: null,
  },
];

let competitions: Competition[] = [
  {
    id: 'comp-upl',
    name: 'Uganda Premier League',
    sport: 'Football',
    provider: 'ISIN',
    mappingStatus: 'Mapped',
    active: true,
    season: '2026',
  },
  {
    id: 'comp-nile-rugby',
    name: 'Nile Special Rugby League',
    sport: 'Rugby',
    provider: 'SportsRadar',
    mappingStatus: 'Mapped',
    active: true,
    season: '2026',
  },
  {
    id: 'comp-nbl',
    name: 'NBL Uganda',
    sport: 'Basketball',
    provider: 'ISIN',
    mappingStatus: 'Mapped',
    active: true,
    season: '2025/26',
  },
  {
    id: 'comp-uganda-cup',
    name: 'Uganda Cup',
    sport: 'Football',
    provider: 'SportsRadar',
    mappingStatus: 'Unmapped',
    active: false,
    season: '2026',
  },
  {
    id: 'comp-rugby-sevens',
    name: 'Rugby Sevens Circuit',
    sport: 'Rugby',
    provider: 'OptaStats',
    mappingStatus: 'Partial',
    active: true,
    season: '2026',
  },
];

let issues: SportsDataIssue[] = [
  {
    id: 'SD-4401',
    queueType: 'Mapping',
    category: 'Provider Mapping',
    severity: 'High',
    status: 'Pending',
    title: 'Unmapped provider team ID for Vipers SC',
    description:
      'The ISIN feed references team_id 88213 with no matching club record in League OS. Fixtures and stats for this team cannot be published until it is mapped.',
    provider: 'ISIN',
    competition: 'Uganda Premier League',
    club: 'Vipers SC',
    createdAt: '2026-08-03T08:10:00Z',
    submittedBy: 'System',
    comparisons: [
      { field: 'Provider Team ID', current: '—', incoming: '88213' },
      { field: 'Club Name (provider)', current: '—', incoming: 'Vipers Sports Club' },
      { field: 'Mapped Club', current: 'Unmapped', incoming: 'Vipers SC (suggested)' },
    ],
    auditHistory: [
      {
        id: 'SD-4401-A1',
        timestamp: '2026-08-03T08:10:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'Auto-flagged by provider mapping validator',
      },
    ],
  },
  {
    id: 'SD-4402',
    queueType: 'Conflict',
    category: 'Fixture',
    severity: 'Critical',
    status: 'Pending',
    title: 'Kickoff time mismatch: Vipers SC vs Express FC',
    description:
      'ISIN and SportsRadar report different kickoff times for the same fixture. Publishing without resolving this will show conflicting times to fans depending on which feed served their request.',
    provider: 'ISIN vs SportsRadar',
    competition: 'Uganda Premier League',
    club: 'Vipers SC',
    createdAt: '2026-08-03T11:22:00Z',
    submittedBy: 'System',
    comparisons: [
      { field: 'Kickoff Time (ISIN)', current: '2026-08-09 16:00 EAT', incoming: '—' },
      { field: 'Kickoff Time (SportsRadar)', current: '—', incoming: '2026-08-09 17:00 EAT' },
      { field: 'Venue', current: "St. Mary's Stadium", incoming: "St. Mary's Stadium" },
    ],
    auditHistory: [
      {
        id: 'SD-4402-A1',
        timestamp: '2026-08-03T11:22:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'Cross-provider fixture diff detected',
      },
    ],
  },
  {
    id: 'SD-4403',
    queueType: 'Import',
    category: 'Statistic',
    severity: 'Medium',
    status: 'Pending',
    title: 'Player statistics batch import — Round 12',
    description:
      '2,340 player statistic records queued from the ISIN nightly feed, awaiting validation before publishing. 6 records failed automated range checks.',
    provider: 'ISIN',
    competition: 'Uganda Premier League',
    createdAt: '2026-08-04T02:15:00Z',
    submittedBy: 'System',
    comparisons: [
      { field: 'Records in batch', current: '—', incoming: '2,340' },
      { field: 'Validation errors', current: '—', incoming: '6 flagged' },
      { field: 'Round', current: 'Round 11 (published)', incoming: 'Round 12 (pending)' },
    ],
    auditHistory: [
      {
        id: 'SD-4403-A1',
        timestamp: '2026-08-04T02:15:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'Nightly batch import queued for review',
      },
    ],
  },
  {
    id: 'SD-4404',
    queueType: 'Club Submission',
    category: 'Player',
    severity: 'Low',
    status: 'Pending',
    title: 'Roster correction: City Oilers jersey number change',
    description: "Club submitted a correction to a player's jersey number ahead of the new season.",
    provider: 'Club Submission',
    competition: 'NBL Uganda',
    club: 'City Oilers',
    createdAt: '2026-08-02T14:40:00Z',
    submittedBy: 'City Oilers Club Admin',
    comparisons: [
      { field: 'Player', current: 'D. Ayo', incoming: 'D. Ayo' },
      { field: 'Jersey Number', current: '11', incoming: '23' },
    ],
    auditHistory: [
      {
        id: 'SD-4404-A1',
        timestamp: '2026-08-02T14:40:00Z',
        adminUser: 'City Oilers Club Admin',
        action: 'Submission received',
        note: 'Submitted via club portal',
      },
    ],
  },
  {
    id: 'SD-4405',
    queueType: 'Correction',
    category: 'Statistic',
    severity: 'High',
    status: 'Pending',
    title: 'Incorrect final score recorded: KOBS vs Black Pirates',
    description:
      'Final score was published as 24-19, but broadcast footage confirms 24-21. League table standings for Nile Special Rugby League depend on this being corrected.',
    provider: 'Manual Correction',
    competition: 'Nile Special Rugby League',
    createdAt: '2026-08-04T06:05:00Z',
    submittedBy: 'Nancy A. (Sports Data Admin)',
    comparisons: [
      { field: 'KOBS Score', current: '24', incoming: '24' },
      { field: 'Black Pirates Score', current: '19', incoming: '21' },
    ],
    auditHistory: [
      {
        id: 'SD-4405-A1',
        timestamp: '2026-08-04T06:05:00Z',
        adminUser: 'Nancy A.',
        action: 'Correction submitted',
        note: 'Flagged after broadcast footage review',
      },
    ],
  },
  {
    id: 'SD-4406',
    queueType: 'Mapping',
    category: 'Competition',
    severity: 'Medium',
    status: 'Pending',
    title: 'New competition feed unmapped: Uganda Cup',
    description: 'SportsRadar started sending fixtures for a competition with no matching League OS record.',
    provider: 'SportsRadar',
    competition: 'Uganda Cup',
    createdAt: '2026-08-01T09:00:00Z',
    submittedBy: 'System',
    comparisons: [
      { field: 'Provider Competition ID', current: '—', incoming: 'UGC-2026' },
      { field: 'Mapped Competition', current: 'Unmapped', incoming: 'Uganda Cup (new)' },
    ],
    auditHistory: [
      {
        id: 'SD-4406-A1',
        timestamp: '2026-08-01T09:00:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'New competition detected in provider feed',
      },
    ],
  },
  {
    id: 'SD-4407',
    queueType: 'Conflict',
    category: 'Player',
    severity: 'Medium',
    status: 'In Review',
    title: 'Duplicate player record: Ssenyonga, Bashir',
    description: 'Two player records appear to represent the same person under slightly different provider IDs.',
    provider: 'ISIN',
    competition: 'Uganda Premier League',
    club: 'Express FC',
    createdAt: '2026-07-31T13:00:00Z',
    submittedBy: 'System',
    comparisons: [
      { field: 'Player ID A', current: 'PLY-30291', incoming: '—' },
      { field: 'Player ID B', current: '—', incoming: 'PLY-30447' },
      { field: 'Suggested Action', current: '—', incoming: 'Merge records' },
    ],
    auditHistory: [
      {
        id: 'SD-4407-A1',
        timestamp: '2026-07-31T13:00:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'Duplicate detection matched on name + date of birth',
      },
      {
        id: 'SD-4407-A2',
        timestamp: '2026-08-01T10:12:00Z',
        adminUser: 'Nancy A.',
        action: 'Marked In Review',
        note: 'Cross-checking with club roster before merging',
      },
    ],
  },
  {
    id: 'SD-4408',
    queueType: 'Import',
    category: 'Fixture',
    severity: 'Low',
    status: 'Approved',
    title: 'Fixture batch import — Matchday 14',
    description: 'Matchday 14 fixture batch imported cleanly from the ISIN feed with no validation errors.',
    provider: 'ISIN',
    competition: 'Uganda Premier League',
    createdAt: '2026-07-29T02:00:00Z',
    submittedBy: 'System',
    comparisons: [{ field: 'Fixtures in batch', current: '—', incoming: '6' }],
    auditHistory: [
      {
        id: 'SD-4408-A1',
        timestamp: '2026-07-29T02:00:00Z',
        adminUser: 'System',
        action: 'Issue created',
        note: 'Batch import queued for review',
      },
      {
        id: 'SD-4408-A2',
        timestamp: '2026-07-29T08:30:00Z',
        adminUser: 'Nancy A.',
        action: 'Approved',
        note: 'No conflicts found, published',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function fetchSportsDataIssues(): Promise<SportsDataIssue[]> {
  return delay([...issues]);
}

export async function fetchProviderHealth(): Promise<ProviderHealth[]> {
  return delay([...providers]);
}

export async function fetchCompetitions(): Promise<Competition[]> {
  return delay([...competitions]);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

function mutateIssue(issueId: string, status: IssueStatus, action: string, note: string): SportsDataIssue {
  const index = issues.findIndex((issue) => issue.id === issueId);
  if (index === -1) {
    throw new Error(`Issue ${issueId} not found`);
  }

  const event: AuditEvent = {
    id: `${issueId}-A${issues[index].auditHistory.length + 1}`,
    timestamp: nowIso(),
    adminUser: 'You',
    action,
    note: note || undefined,
  };

  const updated: SportsDataIssue = {
    ...issues[index],
    status,
    auditHistory: [...issues[index].auditHistory, event],
  };

  issues = [...issues.slice(0, index), updated, ...issues.slice(index + 1)];
  return updated;
}

export async function approveIssue(issueId: string, note: string): Promise<SportsDataIssue> {
  return delay(mutateIssue(issueId, 'Approved', 'Approved', note));
}

export async function rejectIssue(issueId: string, note: string): Promise<SportsDataIssue> {
  return delay(mutateIssue(issueId, 'Rejected', 'Rejected', note));
}

export async function requestMoreInfo(issueId: string, note: string): Promise<SportsDataIssue> {
  return delay(mutateIssue(issueId, 'In Review', 'Requested more information', note));
}

export async function updateCompetition(
  competitionId: string,
  patch: Partial<Pick<Competition, 'provider' | 'active' | 'mappingStatus'>>,
): Promise<Competition> {
  const index = competitions.findIndex((competition) => competition.id === competitionId);
  if (index === -1) {
    throw new Error(`Competition ${competitionId} not found`);
  }

  const updated: Competition = { ...competitions[index], ...patch };
  competitions = [...competitions.slice(0, index), updated, ...competitions.slice(index + 1)];
  return delay(updated);
}
