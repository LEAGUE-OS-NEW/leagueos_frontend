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

import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';
import { useAuthStore } from '../store/authStore.ts';
import {
  fetchMarket,
  fetchMarkets,
  resolveMarket,
  type OutcomeId,
} from './marketAdminService';

export type VerificationStage = 'Awaiting Result' | 'Verified' | 'Finalised';
export type DisputeStatus = 'Open' | 'Escalated' | 'Resolved' | 'Unavailable';

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

function authenticatedAdminIdentity(): string {
  const user = useAuthStore.getState().user;
  if (!user) return 'Authenticated administrator';
  const value = user as Record<string, unknown>;
  return String(value.full_name || value.name || value.email || value.id || 'Authenticated administrator');
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
    { id: genId('audit'), timestamp: nowIso(), adminUser: authenticatedAdminIdentity(), action, note },
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
  record.verifiedBy = authenticatedAdminIdentity();
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

// A market's result decision (Confirm/Correct/Void/Extend Review) covers
// every open dispute on that market at once — there is no per-dispute
// decision endpoint. So fetchDisputes() derives each dispute's status from
// whether its market already has a final decision, via the public
// per-market decision list (no admin permission required to read).
export async function fetchDisputes(): Promise<Dispute[]> {
  const [response, markets] = await Promise.all([
    apiClient.get('/market-admin/result-disputes/'),
    fetchMarkets(),
  ]);
  const labels = new Map(markets.map((market) => [market.id, market.eventLabel]));
  const disputes: Dispute[] = normalizeApiList<Record<string, unknown>>(response.data).map((value) => ({
    id: String(value.id),
    marketId: String(value.market_id),
    eventLabel: labels.get(String(value.market_id)) ?? 'Market details unavailable',
    raisedBy: value.participant_id ? String(value.participant_id) : 'Participant unavailable',
    reason: String(value.explanation ?? ''),
    status: 'Unavailable',
    createdAt: String(value.submitted_at ?? ''),
    auditHistory: [],
  }));

  const uniqueMarketIds = [...new Set(disputes.map((dispute) => dispute.marketId))];
  const decisionEntries = await Promise.allSettled(
    uniqueMarketIds.map((marketId) =>
      apiClient
        .get(`/markets/${encodeURIComponent(marketId)}/result-dispute-decisions/`)
        .then((res) => [marketId, normalizeApiList<Record<string, unknown>>(res.data)] as const),
    ),
  );
  const decisionsByMarket = new Map(
    decisionEntries
      .filter(
        (entry): entry is PromiseFulfilledResult<readonly [string, Record<string, unknown>[]]> =>
          entry.status === 'fulfilled',
      )
      .map((entry) => entry.value),
  );

  return disputes.map((dispute) => {
    const decisions = decisionsByMarket.get(dispute.marketId);
    if (!decisions) return dispute; // lookup failed — leave status 'Unavailable'
    const finalDecision = decisions.find((decision) => decision.is_final === true);
    if (finalDecision) {
      return { ...dispute, status: 'Resolved', resolutionNote: String(finalDecision.notes ?? '') };
    }
    return { ...dispute, status: 'Open' };
  });
}

export type DisputeDecisionType = 'CONFIRM' | 'CORRECT' | 'VOID' | 'EXTEND_REVIEW';

export interface DisputeMarketOutcome {
  id: OutcomeId;
  label: string;
}

export async function fetchDisputeMarketOutcomes(marketId: string): Promise<DisputeMarketOutcome[]> {
  const market = await fetchMarket(marketId);
  return market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label }));
}

// Decides the market's provisional result — this is the only real action
// the backend exposes for a dispute (there's no "escalate" or per-dispute
// "resolve" endpoint). Confirm/Correct require the winning outcome; Extend
// Review requires an extension window; Void needs neither. One decision
// resolves every open dispute on this market, so callers should refetch
// fetchDisputes() afterward rather than mutate a single row.
export async function decideResultDispute(
  marketId: string,
  input: {
    decisionType: DisputeDecisionType;
    winningOutcomeId?: OutcomeId;
    reviewExtensionHours?: number;
    notes: string;
    evidence: string;
  },
): Promise<void> {
  if (!input.notes.trim()) fail('Explain the reasoning behind this decision.');
  if (!input.evidence.trim()) fail('Cite the evidence used for this decision.');

  let winningOutcomeBackendId: string | undefined;
  if (input.winningOutcomeId) {
    const market = await fetchMarket(marketId);
    const outcome = market.outcomes.find((candidate) => candidate.id === input.winningOutcomeId);
    if (!outcome?.backendOutcomeId) fail('Winning outcome not found.');
    winningOutcomeBackendId = outcome.backendOutcomeId;
  }

  await apiClient.post(`/market-admin/markets/${encodeURIComponent(marketId)}/result-dispute-decisions/`, {
    decision_type: input.decisionType,
    winning_outcome_id: winningOutcomeBackendId,
    review_extension_hours: input.reviewExtensionHours,
    notes: input.notes.trim(),
    evidence: input.evidence.trim(),
  });
}
