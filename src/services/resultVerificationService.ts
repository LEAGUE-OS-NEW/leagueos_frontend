// Referee / Resolution Officer — service layer (US-17.4, rebranded from
// Result Verification Admin per the partners' meeting). Backs the admin
// approval funnel for the market result lifecycle (close -> provisional
// result -> dispute window -> resolve -> settle) plus the void/refund path,
// against the real market-admin/result-verification queue endpoint and its
// per-action endpoints — no in-memory store involved.
//
// Flow (per the reference diagram): Event Happens -> Referee Verifies
// Result -> Market Resolved -> Payouts Sent. "Verify" records the proposed
// outcome and evidence; "Finalise" is the separate confirming action that
// actually resolves the market and settles its contracts. Splitting
// verify/finalise keeps a second look possible before money moves, mirroring
// the separation of duties used elsewhere in the merged admin workflow.

import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';
import {
  fetchMarket,
  fetchMarkets,
  resolveMarket,
  type OutcomeId,
} from './marketAdminService';

export type VerificationStage = 'Ready to Close' | 'Awaiting Result' | 'Provisional Result' | 'Dispute Window' | 'Disputed' | 'Ready to Resolve' | 'Ready to Settle' | 'Settled' | 'Ready to Refund' | 'Refunded';
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
  tradingClose?: string;
  settlementTarget?: string;
  officialSource: string;
  outcomes: { id: OutcomeId; label: string }[];
  stage: VerificationStage;
  proposedWinningOutcomeId?: OutcomeId;
  evidenceNote?: string;
  canPublishProvisional: boolean;
  canResolve: boolean;
  canSettle: boolean;
  canClose: boolean;
  canVoid: boolean;
  canRefund: boolean;
  disputeWindowHours?: number;
  verifiedBy?: string;
  verifiedAt?: string;
  disputeDeadline?: string;
  openDisputeCount?: number;
  developmentWindowEndedAt?: string;
  finalizedAt?: string;
  settlement?: { reference: string; status: string; executedAt?: string; totalPositionCount?: number; totalPayoutAmount?: string };
  refund?: { reference: string; status: string; executedAt?: string };
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
    READY_TO_CLOSE: 'Ready to Close', AWAITING_RESULT: 'Awaiting Result', PROVISIONAL_RESULT: 'Provisional Result', DISPUTE_WINDOW: 'Dispute Window',
    DISPUTED: 'Disputed', READY_TO_RESOLVE: 'Ready to Resolve', READY_TO_SETTLE: 'Ready to Settle',
    SETTLED: 'Settled', VOIDED: 'Ready to Refund', REFUNDED: 'Refunded',
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
          kickoff: String((record.sporting_event as { starts_at?: string } | null)?.starts_at ?? record.created_at),
          tradingClose: record.closes_at ? String(record.closes_at) : undefined,
          settlementTarget: record.settles_by ? String(record.settles_by) : undefined,
          officialSource: String(record.resolution_source ?? record.resolution_criteria ?? 'No resolution source recorded on the market.'),
          outcomes: outcomes.map((outcome) => ({ id: outcome.side, label: outcome.label })),
          stage: stageMap[String(record.workflow_state)] ?? 'Awaiting Result',
          proposedWinningOutcomeId: proposed,
          evidenceNote: Array.isArray(provisional?.evidence_items)
            ? String((provisional.evidence_items as Array<{ reference?: string }>)[0]?.reference ?? '') || undefined
            : undefined,
          canPublishProvisional: record.can_publish_provisional === true,
          canResolve: record.can_resolve === true,
          canSettle: record.can_settle === true,
          canClose: record.can_close === true,
          canVoid: record.can_void === true,
          canRefund: record.can_refund === true,
          disputeWindowHours: provisional?.published_at && provisional?.dispute_deadline
            ? Math.round((new Date(String(provisional.dispute_deadline)).getTime() - new Date(String(provisional.published_at)).getTime()) / 3_600_000)
            : undefined,
          verifiedAt: provisional?.published_at ? String(provisional.published_at) : undefined,
          disputeDeadline: provisional?.dispute_deadline ? String(provisional.dispute_deadline) : undefined,
          developmentWindowEndedAt: provisional?.development_window_ended_at ? String(provisional.development_window_ended_at) : undefined,
          openDisputeCount: Number(record.open_dispute_count ?? 0),
          finalizedAt: record.resolved_at ? String(record.resolved_at) : undefined,
          settlement: record.settlement && typeof record.settlement === 'object' ? {
            reference: String((record.settlement as Record<string, unknown>).reference ?? ''),
            status: String((record.settlement as Record<string, unknown>).status ?? ''),
            executedAt: (record.settlement as Record<string, unknown>).executed_at ? String((record.settlement as Record<string, unknown>).executed_at) : undefined,
          } : undefined,
          refund: record.void_refund && typeof record.void_refund === 'object' ? {
            reference: String((record.void_refund as Record<string, unknown>).reference ?? ''),
            status: String((record.void_refund as Record<string, unknown>).status ?? ''),
            executedAt: (record.void_refund as Record<string, unknown>).executed_at ? String((record.void_refund as Record<string, unknown>).executed_at) : undefined,
          } : undefined,
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
    notes: input.evidenceNote.trim(),
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
    canPublishProvisional: false, canResolve: false, canSettle: false,
    canClose: false, canVoid: false, canRefund: false,
    openDisputeCount: 0,
    auditHistory: market.auditHistory,
  };
}

export async function resolveResult(marketId: string): Promise<void> {
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification) fail('This market is not in the result workflow queue.');
  if (!verification.canResolve || !verification.proposedWinningOutcomeId) fail('The backend has not made this result available to resolve.');
  if (!verification.evidenceNote?.trim()) fail('The provisional result evidence is required to resolve this market.');
  await resolveMarket(marketId, verification.proposedWinningOutcomeId, verification.evidenceNote);
}

export async function settleResult(marketId: string): Promise<{ reference: string; status: string; totalPositionCount?: number; totalPayoutAmount?: string }> {
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification?.canSettle) fail('The backend has not made this market available to settle.');
  const response = await apiClient.post(`/markets/${encodeURIComponent(marketId)}/settle/`);
  const data = response.data as Record<string, unknown>;
  return {
    reference: String(data.id ?? data.reference ?? ''),
    status: 'SETTLED',
    totalPositionCount: data.total_position_count === undefined ? undefined : Number(data.total_position_count),
    totalPayoutAmount: data.total_payout_amount === undefined ? undefined : String(data.total_payout_amount),
  };
}

export async function closeMarket(marketId: string, notes: string): Promise<void> {
  if (!notes.trim()) fail('A closing note is required.');
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification?.canClose) fail('The backend has not made this market available to close.');
  await apiClient.post(`/market-admin/markets/${encodeURIComponent(marketId)}/close/`, { notes: notes.trim() });
}

export async function voidMarket(marketId: string, input: { notes: string; evidence: string }): Promise<void> {
  if (!input.notes.trim()) fail('Explain why this market is being voided.');
  if (!input.evidence.trim()) fail('Cite the evidence used for this void decision.');
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification?.canVoid) fail('The backend has not made this market available to void.');
  await apiClient.post(`/market-admin/markets/${encodeURIComponent(marketId)}/void/`, {
    notes: input.notes.trim(),
    evidence: input.evidence.trim(),
  });
}

export async function refundResult(marketId: string): Promise<{ reference: string; status: string; executedAt?: string }> {
  const verification = (await fetchAwaitingResult()).find((item) => item.marketId === marketId);
  if (!verification?.canRefund) fail('The backend has not made this market available to refund.');
  const response = await apiClient.post(`/markets/${encodeURIComponent(marketId)}/void-refund/`);
  const data = response.data as Record<string, unknown>;
  return {
    reference: String(data.id ?? ''),
    status: 'REFUNDED',
    executedAt: data.executed_at ? String(data.executed_at) : undefined,
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
