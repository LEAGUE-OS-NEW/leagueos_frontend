/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../services/apiClient.ts';

/* ============================================================================
   FINANCE SERVICE
   Centralized data-access layer for the Finance Admin dashboard.

   This file currently returns mock data, but every export is shaped as an
   async function so that swapping the implementation for real API calls
   (fetch/axios/etc.) later requires no changes in FinanceAdmin.tsx — only
   the function bodies here need to change.
   ========================================================================= */

/* ============================================================================
   TYPES
   ========================================================================= */

export type BatchStatus = "Matched" | "Mismatched" | "Pending" | "Under Review";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type ExceptionStatus = "Open" | "Investigating" | "Escalated" | "Resolved";
export type RefundApprovalStatus =
  | "Requested"
  | "Reviewed"
  | "Awaiting Second Approval"
  | "Approved"
  | "Rejected"
  | "Processed";

/** Reconciliation queues that carry a settleable BatchStatus lifecycle. */
export type SettlableQueue = "deposits" | "withdrawals" | "settlements";

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  note?: string;
}

export interface SourceReferences {
  flutterwaveRef?: string;
  mtnMomoRef?: string;
  airtelMoneyRef?: string;
  internalLedgerRef: string;
  bankSettlementRef?: string;
}

export interface LineItem {
  id: string;
  reference: string;
  description: string;
  amount: number;
  timestamp: string;
}

export interface ReconciliationBatch {
  id: string;
  provider: string;
  settlementWindow: string;
  currency: string;
  status: BatchStatus;
  createdAt: string;
  closedAt?: string;
  sourceReferences: SourceReferences;
  lineItems: LineItem[];
  auditHistory: AuditEvent[];
}

export interface DepositBatch extends ReconciliationBatch {
  batchId: string;
  providerTotal: number;
  ledgerTotal: number;
  difference: number;
}

export interface WithdrawalBatch extends ReconciliationBatch {
  withdrawalBatch: string;
  requestedAmount: number;
  paidAmount: number;
  providerReference: string;
  difference: number;
}

export interface SettlementBatch extends ReconciliationBatch {
  settlementId: string;
  market: string;
  grossSettled: number;
  fees: number;
  netSettled: number;
  ledgerPosted: number;
  difference: number;
}

export interface RefundRequest {
  refundId: string;
  originalTransaction: string;
  customer: string;
  amount: number;
  reason: string;
  requestedBy: string;
  approvalStatus: RefundApprovalStatus;
  step1ApprovedBy?: string;
  step2ApprovedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ClubCommerceRecord {
  club: string;
  ticketRevenue: number;
  merchandiseRevenue: number;
  membershipRevenue: number;
  feesDeducted: number;
  netClubFunds: number;
  settlementStatus: BatchStatus;
}

/**
 * `sourceType` / `sourceId` replace the old free-text `sourceType` string so
 * exceptions can be linked back to the batch/queue they came from (and so a
 * readable label can be derived consistently — see `formatExceptionSource`).
 */
export interface ReconciliationException {
  id: string;
  sourceType: SettlableQueue;
  sourceId: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  severity: Severity;
  assignedAnalyst: string | null;
  status: ExceptionStatus;
}

export interface FundSegregationLine {
  label: string;
  amount: number;
}

export interface FundSegregationSummary {
  category: string;
  lines: FundSegregationLine[];
  subtotal: number;
}

export interface ExportRecord {
  reportType: string;
  dateRange: string;
  generatedBy: string;
  lastGenerated: string;
}

/* ============================================================================
   SHARED HELPERS
   (also used by FinanceAdmin.tsx for audit entries / export records)
   ========================================================================= */

export const nowStamp = (): string =>
  new Date().toISOString().replace("T", " ").slice(0, 19);

export const uid = (prefix: string): string =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const ANALYSTS = ["Finance Analyst", "Senior Finance Officer", "Finance Manager"];

const SOURCE_TYPE_LABELS: Record<SettlableQueue, string> = {
  deposits: "Deposit Batch",
  withdrawals: "Withdrawal Batch",
  settlements: "Settlement",
};

/** Builds a readable "Deposit Batch DEP-1000" style label from the
 *  structured sourceType/sourceId on a ReconciliationException. */
export const formatExceptionSource = (exception: ReconciliationException): string =>
  `${SOURCE_TYPE_LABELS[exception.sourceType] ?? exception.sourceType} ${exception.sourceId}`;

/* ============================================================================
   PUBLIC API
   Async-style getters. Swap the bodies for real fetch/axios calls later —
   callers in FinanceAdmin.tsx don't need to change.
   ========================================================================= */

async function financeReport(): Promise<Record<string, unknown[]>> {
  const response = await apiClient.get('/admin/finance/');
  return response.data as Record<string, unknown[]>;
}

export const getDeposits = async (): Promise<DepositBatch[]> => {
  const data = await financeReport();
  return (data.deposits ?? []).map((row: any) => ({ id: row.id, batchId: row.internal_reference,
    provider: row.provider || 'Wallet', settlementWindow: row.initiated_at, currency: row.currency,
    status: row.status === 'COMPLETED' ? 'Matched' : 'Pending', createdAt: row.initiated_at,
    closedAt: row.completed_at, providerTotal: Number(row.amount), ledgerTotal: Number(row.amount),
    difference: 0, sourceReferences: { internalLedgerRef: row.internal_reference },
    lineItems: [], auditHistory: [] }));
};

export const getWithdrawals = async (): Promise<WithdrawalBatch[]> => {
  const data = await financeReport();
  return (data.withdrawals ?? []).map((row: any) => ({ id: row.id, withdrawalBatch: row.id,
    provider: 'External payout', settlementWindow: row.created_at, currency: row.currency,
    status: row.status === 'COMPLETED' ? 'Matched' : 'Pending', createdAt: row.created_at,
    requestedAmount: Number(row.amount), paidAmount: row.status === 'COMPLETED' ? Number(row.amount) : 0,
    providerReference: '', difference: row.status === 'COMPLETED' ? 0 : Number(row.amount),
    sourceReferences: { internalLedgerRef: row.id }, lineItems: [], auditHistory: [] }));
};

export const getSettlements = async (): Promise<SettlementBatch[]> => {
  const data = await financeReport();
  return (data.settlements ?? []).map((row: any) => ({ id: row.id, settlementId: row.id,
    market: row.market, provider: 'League OS Wallet', settlementWindow: row.settled_at,
    currency: 'UGX', status: 'Matched', createdAt: row.settled_at,
    grossSettled: Number(row.gross_payout), fees: Number(row.fees), netSettled: Number(row.net_payout),
    ledgerPosted: Number(row.net_payout), difference: 0,
    sourceReferences: { internalLedgerRef: row.id }, lineItems: [], auditHistory: [] }));
};

export const getRefunds = async (): Promise<RefundRequest[]> => {
  const data = await financeReport();
  return (data.refunds ?? []).map((row: any) => ({ refundId: row.id, originalTransaction: row.market,
    customer: row.fan, amount: Number(row.net), reason: 'Voided market', requestedBy: 'System',
    approvalStatus: 'Processed', createdAt: row.created_at }));
};

export const getClubs = async (): Promise<ClubCommerceRecord[]> => {
  const data = await financeReport();
  const totals = new Map<string, number>();
  for (const row of data.club_commerce ?? []) { const item = row as any; totals.set(item.club, (totals.get(item.club) ?? 0) + Number(item.amount)); }
  return [...totals].map(([club, merchandiseRevenue]) => ({ club, ticketRevenue: 0,
    merchandiseRevenue, membershipRevenue: 0, feesDeducted: 0, netClubFunds: merchandiseRevenue,
    settlementStatus: 'Matched' }));
};

export const getExceptions = async (): Promise<ReconciliationException[]> => {
  const data = await financeReport();
  return (data.reconciliation_exceptions ?? []).map((row: any) => ({ id: row.id,
    sourceType: 'settlements', sourceId: row.source_id, expectedAmount: Number(row.expected),
    actualAmount: Number(row.actual), difference: Number(row.expected) - Number(row.actual),
    severity: row.severity === 'WARNING' ? 'Medium' : row.severity === 'ERROR' ? 'High' :
      row.severity === 'CRITICAL' ? 'Critical' : 'Low', assignedAnalyst: null,
    status: row.status === 'RESOLVED' ? 'Resolved' : 'Open' }));
};

export const getAuditFeed = async (): Promise<AuditEvent[]> => [];

export const getExportHistory = async (): Promise<ExportRecord[]> => [];
