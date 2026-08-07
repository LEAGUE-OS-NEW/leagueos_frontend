// Referee / Resolution Officer — service layer (US-17.4, rebranded from
// Result Verification Admin per the partners' meeting). No backend endpoint
// exists for the verification workflow yet, so this reads through
// marketAdminService's in-memory Market store (the single source of truth
// every admin module shares) and layers a lightweight verification queue and
// dispute log on top — every export is async and delay()-wrapped so a real
// backend swap later only touches this file.
//
// Flow (per the reference diagram): Event Happens -> Referee Verifies
// Result -> Market Resolved -> Payouts Sent. "Verify" records the proposed
// outcome and evidence; "Finalise" is the separate confirming action that
// actually resolves the market and settles its contracts (marketAdminService
// computes each contract's payout there). Splitting verify/finalise keeps a
// second look possible before money moves, mirroring the separation of
// duties used elsewhere in the merged admin workflow.

import {
  currentAdminIdentity,
  fetchContracts,
  fetchMarket,
  fetchMarkets,
  resolveMarket,
  type OutcomeId,
} from './marketAdminService';
import { recordMarketPayout } from './walletService';

export type VerificationStage = 'Awaiting Result' | 'Verified' | 'Finalised';
export type DisputeStatus = 'Open' | 'Escalated' | 'Resolved';

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface ResultVerification {
  marketId: string;
  eventLabel: string;
  question: string;
  competition: string;
  kickoff: string;
  officialSource: string;
  outcomes: { id: OutcomeId; label: string }[];
  stage: VerificationStage;
  proposedWinningOutcomeId?: OutcomeId;
  evidenceNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  finalizedAt?: string;
  auditHistory: AuditEvent[];
}

export interface Dispute {
  id: string;
  marketId: string;
  eventLabel: string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolutionNote?: string;
  auditHistory: AuditEvent[];
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

interface VerificationRecord {
  stage: VerificationStage;
  proposedWinningOutcomeId?: OutcomeId;
  evidenceNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  finalizedAt?: string;
  auditHistory: AuditEvent[];
}

const verificationRecords = new Map<string, VerificationRecord>();

function recordFor(marketId: string): VerificationRecord {
  if (!verificationRecords.has(marketId)) {
    verificationRecords.set(marketId, { stage: 'Awaiting Result', auditHistory: [] });
  }
  return verificationRecords.get(marketId)!;
}

function pushRecordAudit(record: VerificationRecord, action: string, note?: string): void {
  record.auditHistory = [
    { id: genId('audit'), timestamp: nowIso(), adminUser: currentAdminIdentity(), action, note },
    ...record.auditHistory,
  ];
}

/* ============================================================
   VERIFICATION QUEUE
   ============================================================ */

export async function fetchAwaitingResult(): Promise<ResultVerification[]> {
  const markets = await fetchMarkets();
  const now = Date.now();
  return delay(
    markets
      .filter(
        (market) =>
          (market.status === 'Live' || market.status === 'Upcoming') &&
          new Date(market.kickoff).getTime() <= now,
      )
      .map((market) => {
        const record = recordFor(market.id);
        return {
          marketId: market.id,
          eventLabel: market.eventLabel,
          question: market.question,
          competition: market.competition,
          kickoff: market.kickoff,
          officialSource: market.description || 'No resolution source recorded on the market.',
          outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label })),
          stage: record.stage,
          proposedWinningOutcomeId: record.proposedWinningOutcomeId,
          evidenceNote: record.evidenceNote,
          verifiedBy: record.verifiedBy,
          verifiedAt: record.verifiedAt,
          finalizedAt: record.finalizedAt,
          auditHistory: [...record.auditHistory],
        };
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()),
  );
}

export async function verifyResult(
  marketId: string,
  input: { winningOutcomeId: OutcomeId; evidenceNote: string },
): Promise<ResultVerification> {
  if (!input.evidenceNote.trim()) fail('Cite the official source or evidence used to verify this result.');
  const [market] = await Promise.all([fetchMarket(marketId), fetchAwaitingResult()]);

  const record = recordFor(marketId);
  record.stage = 'Verified';
  record.proposedWinningOutcomeId = input.winningOutcomeId;
  record.evidenceNote = input.evidenceNote.trim();
  record.verifiedBy = currentAdminIdentity();
  record.verifiedAt = nowIso();
  pushRecordAudit(record, 'Result verified', input.evidenceNote.trim());

  return delay({
    marketId: market.id,
    eventLabel: market.eventLabel,
    question: market.question,
    competition: market.competition,
    kickoff: market.kickoff,
    officialSource: market.description || 'No resolution source recorded on the market.',
    outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label })),
    stage: record.stage,
    proposedWinningOutcomeId: record.proposedWinningOutcomeId,
    evidenceNote: record.evidenceNote,
    verifiedBy: record.verifiedBy,
    verifiedAt: record.verifiedAt,
    finalizedAt: record.finalizedAt,
    auditHistory: [...record.auditHistory],
  });
}

export async function finalizeResult(marketId: string): Promise<ResultVerification> {
  const record = recordFor(marketId);
  if (record.stage !== 'Verified' || !record.proposedWinningOutcomeId) {
    fail('Verify the result with evidence before finalising payouts.');
  }

  const market = await resolveMarket(marketId, record.proposedWinningOutcomeId);
  record.stage = 'Finalised';
  record.finalizedAt = nowIso();
  pushRecordAudit(record, 'Finalised — payouts sent');

  // Credit the current session's wallet for any winning contract it holds
  // on this market — there's one shared mock wallet (the signed-in user's),
  // so contracts bought under other demo trader names have no real wallet
  // to credit, matching how a real multi-user backend would only ever
  // touch the specific holder's own balance.
  const identity = currentAdminIdentity();
  const contracts = await fetchContracts(marketId);
  for (const contract of contracts) {
    if (contract.buyer === identity && contract.status === 'Settled' && (contract.payoutUgx ?? 0) > 0) {
      recordMarketPayout(market.eventLabel, contract.payoutUgx!);
    }
  }

  return delay({
    marketId: market.id,
    eventLabel: market.eventLabel,
    question: market.question,
    competition: market.competition,
    kickoff: market.kickoff,
    officialSource: market.description || 'No resolution source recorded on the market.',
    outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label })),
    stage: record.stage,
    proposedWinningOutcomeId: record.proposedWinningOutcomeId,
    evidenceNote: record.evidenceNote,
    verifiedBy: record.verifiedBy,
    verifiedAt: record.verifiedAt,
    finalizedAt: record.finalizedAt,
    auditHistory: [...record.auditHistory],
  });
}

/* ============================================================
   DISPUTES
   ============================================================ */

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const disputes: Dispute[] = [
  {
    id: genId('dispute'),
    marketId: 'seed-dispute-1',
    eventLabel: 'Uganda Cranes vs Tanzania Taifa Stars',
    raisedBy: 'Fan #2231',
    reason: 'The match report shows a disallowed goal that would change the result to a draw.',
    status: 'Open',
    createdAt: hoursAgo(20),
    auditHistory: [],
  },
  {
    id: genId('dispute'),
    marketId: 'seed-dispute-2',
    eventLabel: 'Onduparaka FC vs Wakiso Giants',
    raisedBy: 'Fan #5560',
    reason: 'Market was cancelled but the fixture was actually played — requesting a review.',
    status: 'Escalated',
    createdAt: hoursAgo(50),
    auditHistory: [
      { id: genId('audit'), timestamp: hoursAgo(40), adminUser: 'Dawa Nakato', action: 'Escalated to Compliance' },
    ],
  },
];

function cloneDispute(dispute: Dispute): Dispute {
  return { ...dispute, auditHistory: dispute.auditHistory.map((event) => ({ ...event })) };
}

function findDisputeOrThrow(id: string): Dispute {
  const dispute = disputes.find((item) => item.id === id);
  if (!dispute) fail(`Dispute ${id} was not found.`);
  return dispute;
}

export async function fetchDisputes(): Promise<Dispute[]> {
  return delay(disputes.map(cloneDispute));
}

export async function escalateDispute(id: string, note: string): Promise<Dispute> {
  if (!note.trim()) fail('Explain why this dispute is being escalated.');
  const dispute = findDisputeOrThrow(id);
  dispute.status = 'Escalated';
  dispute.auditHistory = [
    { id: genId('audit'), timestamp: nowIso(), adminUser: currentAdminIdentity(), action: 'Escalated', note: note.trim() },
    ...dispute.auditHistory,
  ];
  return delay(cloneDispute(dispute));
}

export async function resolveDispute(id: string, resolutionNote: string): Promise<Dispute> {
  if (!resolutionNote.trim()) fail('A resolution note is required.');
  const dispute = findDisputeOrThrow(id);
  dispute.status = 'Resolved';
  dispute.resolutionNote = resolutionNote.trim();
  dispute.auditHistory = [
    { id: genId('audit'), timestamp: nowIso(), adminUser: currentAdminIdentity(), action: 'Resolved', note: resolutionNote.trim() },
    ...dispute.auditHistory,
  ];
  return delay(cloneDispute(dispute));
}
