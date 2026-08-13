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
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

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

/** Simulates network latency so loading states are exercised meaningfully.
 *  Safe to shorten/remove once real API calls are wired in. */
const delay = <T,>(value: T, ms = 350): Promise<T> =>
  new Promise((resolve) => window.setTimeout(() => resolve(value), ms));

/* ============================================================================
   MOCK DATA BUILDERS
   ========================================================================= */

const mockLineItems = (count: number, prefix: string): LineItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-LI-${i + 1}`,
    reference: uid("TXN"),
    description: i % 3 === 0 ? "Wallet top-up" : i % 3 === 1 ? "Ticket purchase" : "Withdrawal payout",
    amount: Math.round((Math.random() * 500000 + 5000) / 100) * 100,
    timestamp: nowStamp(),
  }));

const mockAudit = (batchId: string): AuditEvent[] => [
  { id: uid("AUD"), timestamp: "2025-08-01 06:02:11", user: "System", action: "Batch imported", entityType: "Batch", entityId: batchId },
  { id: uid("AUD"), timestamp: "2025-08-01 06:03:44", user: "System", action: "Reconciliation executed", entityType: "Batch", entityId: batchId },
  { id: uid("AUD"), timestamp: "2025-08-01 06:04:02", user: "System", action: "Mismatch detected", entityType: "Batch", entityId: batchId, note: "Variance above tolerance" },
];

const mockSourceRefs = (): SourceReferences => ({
  flutterwaveRef: `FLW-${Math.floor(Math.random() * 900000 + 100000)}`,
  mtnMomoRef: `MTN-${Math.floor(Math.random() * 900000 + 100000)}`,
  airtelMoneyRef: `AIRTEL-${Math.floor(Math.random() * 900000 + 100000)}`,
  internalLedgerRef: `LEDGER-${Math.floor(Math.random() * 900000 + 100000)}`,
  bankSettlementRef: `BANK-${Math.floor(Math.random() * 900000 + 100000)}`,
});

const depositProviders = ["MTN", "Airtel", "Flutterwave", "Bank"];

const buildDeposits = (): DepositBatch[] =>
  Array.from({ length: 8 }, (_, i) => {
    const providerTotal = Math.round((Math.random() * 12_000_000 + 2_000_000) / 1000) * 1000;
    const skew = i % 4 === 0 ? Math.round(Math.random() * 150_000) : 0;
    const ledgerTotal = providerTotal - skew;
    const id = `DEP-${1000 + i}`;
    return {
      id,
      batchId: id,
      provider: depositProviders[i % depositProviders.length],
      providerTotal,
      ledgerTotal,
      difference: providerTotal - ledgerTotal,
      status: skew > 0 ? "Mismatched" : i % 5 === 0 ? "Under Review" : "Matched",
      createdAt: `2025-08-0${(i % 9) + 1} 05:${10 + i}:00`,
      closedAt: skew === 0 ? `2025-08-0${(i % 9) + 1} 07:00:00` : undefined,
      settlementWindow: "00:00 - 06:00 EAT",
      currency: "UGX",
      sourceReferences: mockSourceRefs(),
      lineItems: mockLineItems(6, id),
      auditHistory: mockAudit(id),
    };
  });

const buildWithdrawals = (): WithdrawalBatch[] =>
  Array.from({ length: 6 }, (_, i) => {
    const requestedAmount = Math.round((Math.random() * 8_000_000 + 1_000_000) / 1000) * 1000;
    const skew = i % 3 === 0 ? Math.round(Math.random() * 80_000) : 0;
    const paidAmount = requestedAmount - skew;
    const id = `WD-${2000 + i}`;
    return {
      id,
      withdrawalBatch: id,
      provider: depositProviders[(i + 1) % depositProviders.length],
      requestedAmount,
      paidAmount,
      providerReference: uid("PRV"),
      difference: requestedAmount - paidAmount,
      status: skew > 0 ? "Mismatched" : i % 4 === 0 ? "Pending" : "Matched",
      createdAt: `2025-08-0${(i % 9) + 1} 09:${5 + i}:00`,
      settlementWindow: "06:00 - 12:00 EAT",
      currency: "UGX",
      sourceReferences: mockSourceRefs(),
      lineItems: mockLineItems(5, id),
      auditHistory: mockAudit(id),
    };
  });

const markets = ["Premier League Weekend", "UPL Matchday 12", "CAF Qualifiers", "Uganda Cup Round 3"];

const buildSettlements = (): SettlementBatch[] =>
  Array.from({ length: 5 }, (_, i) => {
    const grossSettled = Math.round((Math.random() * 20_000_000 + 5_000_000) / 1000) * 1000;
    const fees = Math.round(grossSettled * 0.045);
    const netSettled = grossSettled - fees;
    const skew = i % 3 === 1 ? Math.round(Math.random() * 60_000) : 0;
    const ledgerPosted = netSettled - skew;
    const id = `SET-${3000 + i}`;
    return {
      id,
      settlementId: id,
      provider: "Market Engine",
      market: markets[i % markets.length],
      grossSettled,
      fees,
      netSettled,
      ledgerPosted,
      difference: netSettled - ledgerPosted,
      status: skew > 0 ? "Mismatched" : "Matched",
      createdAt: `2025-08-0${(i % 9) + 1} 20:00:00`,
      settlementWindow: "Post-match settlement",
      currency: "UGX",
      sourceReferences: mockSourceRefs(),
      lineItems: mockLineItems(7, id),
      auditHistory: mockAudit(id),
    };
  });

/* Approval naming: Step 1 = Finance Admin, Step 2 = Finance Manager,
   final processing = Finance Admin (post dual-control approval). */
const mockRefunds: RefundRequest[] = [
  { refundId: "RFD-5001", originalTransaction: "TXN-88213", customer: "A. Nakato", amount: 45000, reason: "Duplicate ticket charge", requestedBy: "Support Agent", approvalStatus: "Requested", createdAt: "2025-08-01 08:12:00" },
  { refundId: "RFD-5002", originalTransaction: "TXN-88477", customer: "J. Okello", amount: 120000, reason: "Cancelled market", requestedBy: "Support Agent", approvalStatus: "Reviewed", step1ApprovedBy: "Finance Admin", createdAt: "2025-08-01 09:44:00" },
  { refundId: "RFD-5003", originalTransaction: "TXN-88602", customer: "M. Kintu", amount: 310000, reason: "Failed withdrawal, funds not received", requestedBy: "Finance Analyst", approvalStatus: "Awaiting Second Approval", step1ApprovedBy: "Finance Admin", createdAt: "2025-08-02 10:02:00" },
  { refundId: "RFD-5004", originalTransaction: "TXN-88910", customer: "R. Byamukama", amount: 75000, reason: "Overcharged fee", requestedBy: "Support Agent", approvalStatus: "Approved", step1ApprovedBy: "Finance Admin", step2ApprovedBy: "Finance Manager", createdAt: "2025-08-02 11:20:00" },
  { refundId: "RFD-5005", originalTransaction: "TXN-89044", customer: "P. Adroa", amount: 20000, reason: "Suspected fraud", requestedBy: "Risk Team", approvalStatus: "Rejected", rejectionReason: "Confirmed legitimate charge", createdAt: "2025-08-02 12:00:00" },
];

const mockClubCommerce: ClubCommerceRecord[] = [
  { club: "Kampala Sharks FC", ticketRevenue: 8_400_000, merchandiseRevenue: 1_250_000, membershipRevenue: 620_000, feesDeducted: 430_000, netClubFunds: 9_840_000, settlementStatus: "Matched" },
  { club: "Nile Rangers", ticketRevenue: 5_100_000, merchandiseRevenue: 740_000, membershipRevenue: 310_000, feesDeducted: 260_000, netClubFunds: 5_890_000, settlementStatus: "Pending" },
  { club: "Entebbe United", ticketRevenue: 3_950_000, merchandiseRevenue: 410_000, membershipRevenue: 180_000, feesDeducted: 195_000, netClubFunds: 4_345_000, settlementStatus: "Under Review" },
  { club: "Jinja Falls SC", ticketRevenue: 6_700_000, merchandiseRevenue: 980_000, membershipRevenue: 505_000, feesDeducted: 340_000, netClubFunds: 7_845_000, settlementStatus: "Matched" },
];

const mockExceptionsInit: ReconciliationException[] = [
  { id: "EXC-9001", sourceType: "deposits", sourceId: "DEP-1000", expectedAmount: 4_820_000, actualAmount: 4_670_000, difference: 150_000, severity: "High", assignedAnalyst: null, status: "Open" },
  { id: "EXC-9002", sourceType: "withdrawals", sourceId: "WD-2000", expectedAmount: 1_940_000, actualAmount: 1_860_000, difference: 80_000, severity: "Medium", assignedAnalyst: "Finance Analyst", status: "Investigating" },
  { id: "EXC-9003", sourceType: "settlements", sourceId: "SET-3001", expectedAmount: 12_400_000, actualAmount: 12_340_000, difference: 60_000, severity: "Low", assignedAnalyst: null, status: "Open" },
  { id: "EXC-9004", sourceType: "deposits", sourceId: "DEP-1004", expectedAmount: 9_100_000, actualAmount: 8_640_000, difference: 460_000, severity: "Critical", assignedAnalyst: "Finance Manager", status: "Escalated" },
];

const mockAuditFeedInit: AuditEvent[] = [
  { id: uid("AUD"), timestamp: "2025-08-02 07:15:03", user: "Finance Analyst", action: "Assigned exception", entityType: "Exception", entityId: "EXC-9002" },
  { id: uid("AUD"), timestamp: "2025-08-02 08:02:41", user: "Finance Manager", action: "Escalated for review", entityType: "Exception", entityId: "EXC-9004" },
  { id: uid("AUD"), timestamp: "2025-08-02 09:30:12", user: "Finance Admin", action: "Approved refund Step 1", entityType: "Refund", entityId: "RFD-5002", note: "Approved by Finance Admin" },
  { id: uid("AUD"), timestamp: "2025-08-02 11:22:55", user: "Finance Manager", action: "Approved refund Step 2", entityType: "Refund", entityId: "RFD-5004", note: "Approved by Finance Manager" },
];

const mockExportHistoryInit: ExportRecord[] = [
  { reportType: "Daily Reconciliation Report", dateRange: "2025-08-01 → 2025-08-02", generatedBy: "Finance Analyst", lastGenerated: "2025-08-02 06:00:00" },
  { reportType: "Settlement Report", dateRange: "2025-08-01 → 2025-08-02", generatedBy: "Senior Finance Officer", lastGenerated: "2025-08-01 21:15:00" },
];

/* ============================================================================
   PUBLIC API
   Async-style getters. Swap the bodies for real fetch/axios calls later —
   callers in FinanceAdmin.tsx don't need to change.
   ========================================================================= */

export const getDeposits = (): Promise<DepositBatch[]> => delay(buildDeposits());

export const getWithdrawals = (): Promise<WithdrawalBatch[]> => delay(buildWithdrawals());

export const getSettlements = (): Promise<SettlementBatch[]> => delay(buildSettlements());

export const getRefunds = (): Promise<RefundRequest[]> => delay([...mockRefunds]);

export const getClubs = (): Promise<ClubCommerceRecord[]> => delay([...mockClubCommerce]);

export const getExceptions = (): Promise<ReconciliationException[]> => delay([...mockExceptionsInit]);

export const getAuditFeed = (): Promise<AuditEvent[]> => delay([...mockAuditFeedInit]);

export const getExportHistory = (): Promise<ExportRecord[]> => delay([...mockExportHistoryInit]);
