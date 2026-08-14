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
import {
  fetchMarket,
  fetchMarkets,
  resolveMarket,
  type OutcomeId,
} from './marketAdminService';

export type VerificationStage = 'Awaiting Result' | 'Provisional Result' | 'Dispute Window' | 'Disputed' | 'Ready to Resolve' | 'Ready to Settle' | 'Settled' | 'Voided / Refunded';
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
  disputeDeadline?: string;
  openDisputeCount?: number;
  developmentWindowEndedAt?: string;
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

function fail(message: string): never {
  throw new Error(message);
}

/* ============================================================
   VERIFICATION QUEUE
   ============================================================ */

export async function fetchAwaitingResult(): Promise<ResultVerification[]> {
  const response = await apiClient.get('/market-admin/result-verification/');
  const records = normalizeApiList<Record<string, unknown>>(response.data);
  const stageMap: Record<string, VerificationStage> = {
    AWAITING_RESULT: 'Awaiting Result', PROVISIONAL_RESULT: 'Provisional Result', DISPUTE_WINDOW: 'Dispute Window',
    DISPUTED: 'Disputed', READY_TO_RESOLVE: 'Ready to Resolve', READY_TO_SETTLE: 'Ready to Settle',
    SETTLED: 'Settled', VOIDED: 'Voided / Refunded', VOIDED_REFUNDED: 'Voided / Refunded',
  };
  return records.map((record) => {
        const adapted = (record as { id: string }).id;
        const provisional = record.provisional_result as Record<string, unknown> | null;
        const outcomes = (record.outcomes as Array<{ id: string; side: OutcomeId; label: string }>) ?? [];
        const proposedBackendId = provisional?.winning_outcome_id ? String(provisional.winning_outcome_id) : undefined;
        const proposed = outcomes.find((outcome) => outcome.id === proposedBackendId)?.side;
        return {
          marketId: adapted,
          eventLabel: String((record.sporting_event as { name?: string } | null)?.name ?? record.custom_subject ?? record.question),
          question: String(record.question),
          competition: String((record.competition as { name?: string } | null)?.name ?? ''),
          kickoff: String(record.closes_at ?? record.created_at),
          officialSource: String(record.resolution_source ?? record.resolution_criteria ?? 'No resolution source recorded on the market.'),
          outcomes: outcomes.map((outcome) => ({ id: outcome.side, label: outcome.label })),
          stage: stageMap[String(record.workflow_state)] ?? 'Awaiting Result',
          proposedWinningOutcomeId: proposed,
          evidenceNote: provisional?.notes ? String(provisional.notes) : undefined,
          verifiedAt: provisional?.published_at ? String(provisional.published_at) : undefined,
          disputeDeadline: provisional?.dispute_deadline ? String(provisional.dispute_deadline) : undefined,
          developmentWindowEndedAt: provisional?.development_window_ended_at ? String(provisional.development_window_ended_at) : undefined,
          openDisputeCount: Number(record.open_dispute_count ?? 0),
          finalizedAt: record.resolved_at ? String(record.resolved_at) : undefined,
          auditHistory: [],
        };
      }).sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
}

export async function verifyResult(
  marketId: string,
  input: { winningOutcomeId: OutcomeId; evidenceNote: string },
): Promise<ResultVerification> {
  if (!input.evidenceNote.trim()) fail('Cite the official source or evidence used to verify this result.');
  const market = await fetchMarket(marketId);
  const outcome = market.outcomes.find((item) => item.id === input.winningOutcomeId);
  if (!outcome?.backendOutcomeId) fail('Winning outcome not found.');
  await apiClient.post(`/market-admin/markets/${encodeURIComponent(marketId)}/provisional-result/`, {
    winning_outcome_id: outcome.backendOutcomeId,
    notes: 'Provisional result published for dispute review.',
    dispute_window_hours: 24,
    evidence_items: [{ evidence_type: 'OFFICIAL_SOURCE', label: 'Official result source', reference: input.evidenceNote.trim() }],
  });
  return {
    marketId: market.id,
    eventLabel: market.eventLabel,
    question: market.question,
    competition: market.competition,
    kickoff: market.kickoff,
    officialSource: market.description || 'No resolution source recorded on the market.',
    outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label })),
    stage: 'Dispute Window', proposedWinningOutcomeId: input.winningOutcomeId,
    evidenceNote: input.evidenceNote.trim(), verifiedAt: new Date().toISOString(),
    openDisputeCount: 0,
    auditHistory: market.auditHistory,
  };
}

export async function finalizeResult(marketId: string): Promise<ResultVerification> {
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification) fail('This market is not in the result workflow queue.');
  if (verification.stage === 'Ready to Resolve' && verification.proposedWinningOutcomeId) {
    await resolveMarket(marketId, verification.proposedWinningOutcomeId);
    return { ...verification, stage: 'Ready to Settle', finalizedAt: new Date().toISOString() };
  }
  if (verification.stage !== 'Ready to Settle') {
    fail('Settlement is blocked until the dispute window closes and every dispute has a final decision.');
  }
  const market = await fetchMarket(marketId);
  await apiClient.post(`/markets/${encodeURIComponent(marketId)}/settle/`);
  return {
    marketId: market.id,
    eventLabel: market.eventLabel,
    question: market.question,
    competition: market.competition,
    kickoff: market.kickoff,
    officialSource: market.description || 'No resolution source recorded on the market.',
    outcomes: market.outcomes.map((outcome) => ({ id: outcome.id, label: outcome.label })),
    stage: 'Settled', proposedWinningOutcomeId: verification.proposedWinningOutcomeId,
    evidenceNote: verification.evidenceNote, verifiedAt: verification.verifiedAt,
    openDisputeCount: verification.openDisputeCount,
    finalizedAt: new Date().toISOString(), auditHistory: market.auditHistory,
  };
}

export async function endDisputeWindowForDevelopment(marketId: string): Promise<void> {
  await apiClient.post(`/market-admin/result-verification/${encodeURIComponent(marketId)}/dev-end-dispute-window/`);
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
