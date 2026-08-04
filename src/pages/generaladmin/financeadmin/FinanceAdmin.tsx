import React, { useMemo, useState } from "react";
import DashboardSidebar from "../../../components/generaladmin/Sidebar";
import DashboardTopbar from "../sections/Topbar";
import "./FinanceAdmin.css";

/* ============================================================================
   TYPES
   ========================================================================= */

type BatchStatus = "Matched" | "Mismatched" | "Pending" | "Under Review";
type QueueKey = "deposits" | "withdrawals" | "settlements" | "refunds" | "clubs";
type Severity = "Low" | "Medium" | "High" | "Critical";
type ExceptionStatus = "Open" | "Investigating" | "Escalated" | "Resolved";
type RefundApprovalStatus =
  | "Requested"
  | "Reviewed"
  | "Awaiting Second Approval"
  | "Approved"
  | "Rejected"
  | "Processed";

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  note?: string;
}

interface SourceReferences {
  flutterwaveRef?: string;
  mtnMomoRef?: string;
  airtelMoneyRef?: string;
  internalLedgerRef: string;
  bankSettlementRef?: string;
}

interface LineItem {
  id: string;
  reference: string;
  description: string;
  amount: number;
  timestamp: string;
}

interface ReconciliationBatch {
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

interface DepositBatch extends ReconciliationBatch {
  batchId: string;
  providerTotal: number;
  ledgerTotal: number;
  difference: number;
}

interface WithdrawalBatch extends ReconciliationBatch {
  withdrawalBatch: string;
  requestedAmount: number;
  paidAmount: number;
  providerReference: string;
  difference: number;
}

interface SettlementBatch extends ReconciliationBatch {
  settlementId: string;
  market: string;
  grossSettled: number;
  fees: number;
  netSettled: number;
  ledgerPosted: number;
  difference: number;
}

interface RefundRequest {
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

interface ClubCommerceRecord {
  club: string;
  ticketRevenue: number;
  merchandiseRevenue: number;
  membershipRevenue: number;
  feesDeducted: number;
  netClubFunds: number;
  settlementStatus: BatchStatus;
}

interface ReconciliationException {
  id: string;
  sourceType: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  severity: Severity;
  assignedAnalyst: string | null;
  status: ExceptionStatus;
}

interface FundSegregationLine {
  label: string;
  amount: number;
}

interface FundSegregationSummary {
  category: string;
  lines: FundSegregationLine[];
  subtotal: number;
}

interface ExportRecord {
  reportType: string;
  dateRange: string;
  generatedBy: string;
  lastGenerated: string;
}

/* ============================================================================
   HELPERS
   ========================================================================= */

const formatUGX = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  return `${sign}UGX ${Math.abs(value).toLocaleString("en-UG", {
    maximumFractionDigits: 0,
  })}`;
};

const nowStamp = (): string =>
  new Date().toISOString().replace("T", " ").slice(0, 19);

const uid = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const ANALYSTS = ["Finance Analyst", "Senior Finance Officer", "Finance Manager"];

/* ============================================================================
   MOCK DATA
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

const mockRefunds: RefundRequest[] = [
  { refundId: "RFD-5001", originalTransaction: "TXN-88213", customer: "A. Nakato", amount: 45000, reason: "Duplicate ticket charge", requestedBy: "Support Agent", approvalStatus: "Requested", createdAt: "2025-08-01 08:12:00" },
  { refundId: "RFD-5002", originalTransaction: "TXN-88477", customer: "J. Okello", amount: 120000, reason: "Cancelled market", requestedBy: "Support Agent", approvalStatus: "Reviewed", step1ApprovedBy: "Finance Analyst", createdAt: "2025-08-01 09:44:00" },
  { refundId: "RFD-5003", originalTransaction: "TXN-88602", customer: "M. Kintu", amount: 310000, reason: "Failed withdrawal, funds not received", requestedBy: "Finance Analyst", approvalStatus: "Awaiting Second Approval", step1ApprovedBy: "Finance Analyst", createdAt: "2025-08-02 10:02:00" },
  { refundId: "RFD-5004", originalTransaction: "TXN-88910", customer: "R. Byamukama", amount: 75000, reason: "Overcharged fee", requestedBy: "Support Agent", approvalStatus: "Approved", step1ApprovedBy: "Finance Analyst", step2ApprovedBy: "Finance Manager", createdAt: "2025-08-02 11:20:00" },
  { refundId: "RFD-5005", originalTransaction: "TXN-89044", customer: "P. Adroa", amount: 20000, reason: "Suspected fraud", requestedBy: "Risk Team", approvalStatus: "Rejected", rejectionReason: "Confirmed legitimate charge", createdAt: "2025-08-02 12:00:00" },
];

const mockClubCommerce: ClubCommerceRecord[] = [
  { club: "Kampala Sharks FC", ticketRevenue: 8_400_000, merchandiseRevenue: 1_250_000, membershipRevenue: 620_000, feesDeducted: 430_000, netClubFunds: 9_840_000, settlementStatus: "Matched" },
  { club: "Nile Rangers", ticketRevenue: 5_100_000, merchandiseRevenue: 740_000, membershipRevenue: 310_000, feesDeducted: 260_000, netClubFunds: 5_890_000, settlementStatus: "Pending" },
  { club: "Entebbe United", ticketRevenue: 3_950_000, merchandiseRevenue: 410_000, membershipRevenue: 180_000, feesDeducted: 195_000, netClubFunds: 4_345_000, settlementStatus: "Under Review" },
  { club: "Jinja Falls SC", ticketRevenue: 6_700_000, merchandiseRevenue: 980_000, membershipRevenue: 505_000, feesDeducted: 340_000, netClubFunds: 7_845_000, settlementStatus: "Matched" },
];

const mockExceptionsInit: ReconciliationException[] = [
  { id: "EXC-9001", sourceType: "MTN Deposit Batch DEP-1000", expectedAmount: 4_820_000, actualAmount: 4_670_000, difference: 150_000, severity: "High", assignedAnalyst: null, status: "Open" },
  { id: "EXC-9002", sourceType: "Withdrawal Batch WD-2000", expectedAmount: 1_940_000, actualAmount: 1_860_000, difference: 80_000, severity: "Medium", assignedAnalyst: "Finance Analyst", status: "Investigating" },
  { id: "EXC-9003", sourceType: "Settlement SET-3001", expectedAmount: 12_400_000, actualAmount: 12_340_000, difference: 60_000, severity: "Low", assignedAnalyst: null, status: "Open" },
  { id: "EXC-9004", sourceType: "Flutterwave Deposit Batch DEP-1004", expectedAmount: 9_100_000, actualAmount: 8_640_000, difference: 460_000, severity: "Critical", assignedAnalyst: "Finance Manager", status: "Escalated" },
];

const mockAuditFeedInit: AuditEvent[] = [
  { id: uid("AUD"), timestamp: "2025-08-02 07:15:03", user: "Finance Analyst", action: "Assigned exception", entityType: "Exception", entityId: "EXC-9002" },
  { id: uid("AUD"), timestamp: "2025-08-02 08:02:41", user: "Finance Manager", action: "Escalated for review", entityType: "Exception", entityId: "EXC-9004" },
  { id: uid("AUD"), timestamp: "2025-08-02 09:30:12", user: "Finance Analyst", action: "Approved Step 1", entityType: "Refund", entityId: "RFD-5002" },
  { id: uid("AUD"), timestamp: "2025-08-02 11:22:55", user: "Finance Manager", action: "Approved Step 2", entityType: "Refund", entityId: "RFD-5004" },
];

const fundSegregation: FundSegregationSummary[] = [
  {
    category: "Customer Funds",
    lines: [
      { label: "Wallet balances", amount: 184_320_000 },
      { label: "Pending withdrawals", amount: 21_450_000 },
      { label: "Escrowed ticket funds", amount: 38_600_000 },
    ],
    subtotal: 184_320_000 + 21_450_000 + 38_600_000,
  },
  {
    category: "Platform Revenue",
    lines: [
      { label: "Service fees", amount: 9_240_000 },
      { label: "Transaction fees", amount: 6_115_000 },
      { label: "Sponsorship platform commissions", amount: 4_800_000 },
    ],
    subtotal: 9_240_000 + 6_115_000 + 4_800_000,
  },
  {
    category: "Processing Fees",
    lines: [
      { label: "Flutterwave charges", amount: 2_310_000 },
      { label: "Mobile money provider fees", amount: 3_680_000 },
      { label: "Bank transfer fees", amount: 940_000 },
    ],
    subtotal: 2_310_000 + 3_680_000 + 940_000,
  },
  {
    category: "Club Funds",
    lines: [
      { label: "Club ticket sales", amount: 24_150_000 },
      { label: "Club merchandise sales", amount: 3_380_000 },
      { label: "Club membership allocations", amount: 1_615_000 },
    ],
    subtotal: 24_150_000 + 3_380_000 + 1_615_000,
  },
  {
    category: "Statutory Amounts",
    lines: [
      { label: "VAT / Tax collected", amount: 11_240_000 },
      { label: "Withholding tax", amount: 3_920_000 },
      { label: "Regulatory reserve amounts", amount: 6_000_000 },
    ],
    subtotal: 11_240_000 + 3_920_000 + 6_000_000,
  },
];

const initialExports: ExportRecord[] = [
  { reportType: "Daily Reconciliation Report", dateRange: "2025-08-01 → 2025-08-02", generatedBy: "Finance Analyst", lastGenerated: "2025-08-02 06:00:00" },
  { reportType: "Settlement Report", dateRange: "2025-08-01 → 2025-08-02", generatedBy: "Senior Finance Officer", lastGenerated: "2025-08-01 21:15:00" },
];

/* ============================================================================
   SMALL PRESENTATIONAL COMPONENTS
   ========================================================================= */

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cls = status.toLowerCase().replace(/\s+/g, "-");
  return <span className={`fa-pill fa-pill--${cls}`}>{status}</span>;
};

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => (
  <span className={`fa-badge fa-badge--${severity.toLowerCase()}`}>{severity}</span>
);

const DiffBadge: React.FC<{ value: number }> = ({ value }) => (
  <span className={`fa-diff ${value === 0 ? "fa-diff--zero" : "fa-diff--nonzero"}`}>
    {value === 0 ? "No variance" : formatUGX(value)}
  </span>
);

interface SummaryCardProps {
  icon: string;
  title: string;
  value: string;
  description: string;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, description, trend, trendTone = "neutral" }) => (
  <div className="fa-card">
    <div className="fa-card__top">
      <span className="fa-card__icon">{icon}</span>
      {trend && <span className={`fa-card__trend fa-card__trend--${trendTone}`}>{trend}</span>}
    </div>
    <div className="fa-card__value">{value}</div>
    <div className="fa-card__title">{title}</div>
    <div className="fa-card__desc">{description}</div>
  </div>
);

/* ============================================================================
   MAIN COMPONENT
   ========================================================================= */

const FinanceAdminDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [deposits,setDeposits] = useState<DepositBatch[]>(buildDeposits);
  const [withdrawals] = useState<WithdrawalBatch[]>(buildWithdrawals);
  const [settlements] = useState<SettlementBatch[]>(buildSettlements);
  const [refunds, setRefunds] = useState<RefundRequest[]>(mockRefunds);
  const [clubs] = useState<ClubCommerceRecord[]>(mockClubCommerce);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>(mockExceptionsInit);
  const [auditFeed, setAuditFeed] = useState<AuditEvent[]>(mockAuditFeedInit);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>(initialExports);

  const [activeQueue, setActiveQueue] = useState<QueueKey>("deposits");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [drawerBatch, setDrawerBatch] = useState<ReconciliationBatch | null>(null);
  const [drawerTitle, setDrawerTitle] = useState<string>("");

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [rejectDraft, setRejectDraft] = useState<{ refundId: string; reason: string } | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const pushAudit = (action: string, entityType: string, entityId: string, note?: string) => {
    const event: AuditEvent = {
      id: uid("AUD"),
      timestamp: nowStamp(),
      user: "Finance Admin",
      action,
      entityType,
      entityId,
      note,
    };
    setAuditFeed((prev) => [event, ...prev]);
  };

  /* --------------------------- derived summary numbers --------------------------- */

  const totals = useMemo(() => {
    const allBatches: ReconciliationBatch[] = [...deposits, ...withdrawals, ...settlements];
    const providerTotal = deposits.reduce((s, d) => s + d.providerTotal, 0);
    const ledgerTotal = deposits.reduce((s, d) => s + d.ledgerTotal, 0);
    const mismatches = allBatches.filter((b) => b.status === "Mismatched").length;
    const pendingRefunds = refunds.filter(
      (r) => r.approvalStatus !== "Processed" && r.approvalStatus !== "Rejected"
    ).length;
    const clubFundsHeld = clubs.reduce((s, c) => s + c.netClubFunds, 0);
    const unresolved = exceptions.filter((e) => e.status !== "Resolved").length;
    return { providerTotal, ledgerTotal, mismatches, pendingRefunds, clubFundsHeld, unresolved };
  }, [deposits, withdrawals, settlements, refunds, clubs, exceptions]);

  /* --------------------------- queue filtering --------------------------- */

  const queueStatuses = (rows: { status: string }[]) =>
    Array.from(new Set(rows.map((r) => r.status)));

  const filteredDeposits = useMemo(
    () =>
      deposits.filter(
        (d) =>
          (statusFilter === "all" || d.status === statusFilter) &&
          (d.batchId.toLowerCase().includes(search.toLowerCase()) ||
            d.provider.toLowerCase().includes(search.toLowerCase()))
      ),
    [deposits, search, statusFilter]
  );

  const filteredWithdrawals = useMemo(
    () =>
      withdrawals.filter(
        (w) =>
          (statusFilter === "all" || w.status === statusFilter) &&
          (w.withdrawalBatch.toLowerCase().includes(search.toLowerCase()) ||
            w.provider.toLowerCase().includes(search.toLowerCase()))
      ),
    [withdrawals, search, statusFilter]
  );

  const filteredSettlements = useMemo(
    () =>
      settlements.filter(
        (s) =>
          (statusFilter === "all" || s.status === statusFilter) &&
          (s.settlementId.toLowerCase().includes(search.toLowerCase()) ||
            s.market.toLowerCase().includes(search.toLowerCase()))
      ),
    [settlements, search, statusFilter]
  );

  const filteredRefunds = useMemo(
    () =>
      refunds.filter(
        (r) =>
          (statusFilter === "all" || r.approvalStatus === statusFilter) &&
          (r.refundId.toLowerCase().includes(search.toLowerCase()) ||
            r.customer.toLowerCase().includes(search.toLowerCase()))
      ),
    [refunds, search, statusFilter]
  );

  const filteredClubs = useMemo(
    () =>
      clubs.filter(
        (c) =>
          (statusFilter === "all" || c.settlementStatus === statusFilter) &&
          c.club.toLowerCase().includes(search.toLowerCase())
      ),
    [clubs, search, statusFilter]
  );

  /* --------------------------- actions --------------------------- */

  const openDrawer = (batch: ReconciliationBatch, title: string) => {
    setDrawerBatch(batch);
    setDrawerTitle(title);
  };

  const closeDrawer = () => {
    setDrawerBatch(null);
    setDrawerTitle("");
  };

  const confirmAndRun = (title: string, message: string, confirmLabel: string, run: () => void) => {
    setConfirmModal({
      title,
      message,
      confirmLabel,
      onConfirm: () => {
        run();
        setConfirmModal(null);
      },
    });
  };

  const assignAnalyst = (exceptionId: string) => {
    const analyst = ANALYSTS[Math.floor(Math.random() * ANALYSTS.length)];
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId ? { ...e, assignedAnalyst: analyst, status: "Investigating" } : e
      )
    );
    pushAudit("Assigned analyst", "Exception", exceptionId, `Assigned to ${analyst}`);
    showToast(`${exceptionId} assigned to ${analyst}`);
  };

  const escalateException = (exceptionId: string) => {
    confirmAndRun(
      "Escalate exception",
      `Escalate ${exceptionId} to Finance Manager for review? This cannot be undone.`,
      "Escalate",
      () => {
        setExceptions((prev) =>
          prev.map((e) => (e.id === exceptionId ? { ...e, status: "Escalated" } : e))
        );
        pushAudit("Escalated for review", "Exception", exceptionId);
        showToast(`${exceptionId} escalated`);
      }
    );
  };

  const resolveException = (exceptionId: string) => {
    confirmAndRun(
      "Mark exception resolved",
      `Confirm that ${exceptionId} has been fully investigated and resolved.`,
      "Mark Resolved",
      () => {
        setExceptions((prev) =>
          prev.map((e) => (e.id === exceptionId ? { ...e, status: "Resolved" } : e))
        );
        pushAudit("Approved by Finance", "Exception", exceptionId, "Marked resolved");
        showToast(`${exceptionId} marked resolved`);
      }
    );
  };

  const reviewRefund = (refundId: string) => {
    setRefunds((prev) =>
      prev.map((r) => (r.refundId === refundId && r.approvalStatus === "Requested" ? { ...r, approvalStatus: "Reviewed" } : r))
    );
    pushAudit("Reviewed refund", "Refund", refundId);
    showToast(`${refundId} marked as reviewed`);
  };

  const approveStep1 = (refundId: string) => {
    confirmAndRun(
      "Approve Step 1",
      `Approve step 1 of ${refundId} as Finance Analyst?`,
      "Approve Step 1",
      () => {
        setRefunds((prev) =>
          prev.map((r) =>
            r.refundId === refundId
              ? { ...r, approvalStatus: "Awaiting Second Approval", step1ApprovedBy: "Finance Analyst" }
              : r
          )
        );
        pushAudit("Approved Step 1", "Refund", refundId, "Approved by Finance Analyst");
        showToast(`${refundId} approved (step 1)`);
      }
    );
  };

  const approveStep2 = (refundId: string) => {
    confirmAndRun(
      "Approve Step 2",
      `Approve step 2 of ${refundId} as Senior Finance Officer? This authorizes final processing.`,
      "Approve Step 2",
      () => {
        setRefunds((prev) =>
          prev.map((r) =>
            r.refundId === refundId
              ? { ...r, approvalStatus: "Approved", step2ApprovedBy: "Senior Finance Officer" }
              : r
          )
        );
        pushAudit("Approved Step 2", "Refund", refundId, "Approved by Senior Finance Officer");
        showToast(`${refundId} approved (step 2)`);
      }
    );
  };

  const rejectRefund = (refundId: string, reason: string) => {
    setRefunds((prev) =>
      prev.map((r) => (r.refundId === refundId ? { ...r, approvalStatus: "Rejected", rejectionReason: reason } : r))
    );
    pushAudit("Rejected refund", "Refund", refundId, reason);
    showToast(`${refundId} rejected`);
    setRejectDraft(null);
  };

  const processRefund = (refundId: string) => {
    confirmAndRun(
      "Process refund",
      `This will process ${refundId} for final payout. Confirm dual-control approval is complete.`,
      "Process Refund",
      () => {
        setRefunds((prev) =>
          prev.map((r) => (r.refundId === refundId ? { ...r, approvalStatus: "Processed" } : r))
        );
        pushAudit("Processed refund", "Refund", refundId, "Final payout released");
        showToast(`${refundId} processed`);
      }
    );
  };

  const runExport = (reportType: string) => {
    const record: ExportRecord = {
      reportType,
      dateRange: "2025-08-01 → 2025-08-02",
      generatedBy: "Finance Admin",
      lastGenerated: nowStamp(),
    };
    setExportHistory((prev) => [record, ...prev]);
    pushAudit("Export generated", "Report", reportType);
    showToast(`${reportType} generated successfully`);
  };


  const updateBatchStatus = (
  batchId:string,
  newStatus:BatchStatus
) => {

  setDeposits(prev =>
    prev.map(batch =>
      batch.id === batchId
      ? {
          ...batch,
          status:newStatus,
          auditHistory:[
            ...batch.auditHistory,
            {
              id:uid("AUD"),
              timestamp:nowStamp(),
              user:"Finance Admin",
              action:`Status changed to ${newStatus}`,
              entityType:"Deposit Batch",
              entityId:batchId
            }
          ]
        }
      : batch
    )
  );


  pushAudit(
    `Changed batch status to ${newStatus}`,
    "Deposit Batch",
    batchId
  );


  setDrawerBatch(null);

  showToast(
    `${batchId} moved to ${newStatus}`
  );
};
  /* --------------------------- render helpers --------------------------- */

  const activeStatuses = useMemo(() => {
    switch (activeQueue) {
      case "deposits":
        return queueStatuses(deposits);
      case "withdrawals":
        return queueStatuses(withdrawals);
      case "settlements":
        return queueStatuses(settlements);
      case "refunds":
        return Array.from(new Set(refunds.map((r) => r.approvalStatus)));
      case "clubs":
        return queueStatuses(clubs.map((c) => ({ status: c.settlementStatus })));
      default:
        return [];
    }
  }, [activeQueue, deposits, withdrawals, settlements, refunds, clubs]);

  return (
    <div className="fa-shell">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="fa-main">
        <DashboardTopbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="fa-content">
          {/* 1. FINANCE HEADER */}
          <header className="fa-header">
            <div>
              <h1 className="fa-header__title">Financial Oversight &amp; Reconciliation</h1>
              <p className="fa-header__subtitle">
                Monitor provider settlements, resolve mismatches, and control approvals across the platform.
              </p>
            </div>
            <div className="fa-header__meta">
              <span className="fa-header__badge">Read-only ledger access</span>
              <span className="fa-header__updated">Last synced {nowStamp()}</span>
            </div>
          </header>

          {/* 2. SUMMARY CARDS */}
          <section className="fa-grid fa-grid--cards">
            <SummaryCard icon="🏦" title="Provider Totals" value={formatUGX(totals.providerTotal)} description="Sum of deposit totals reported by payment providers" trend="+4.2%" trendTone="positive" />
            <SummaryCard icon="📒" title="Ledger Totals" value={formatUGX(totals.ledgerTotal)} description="Sum of matching entries posted to the internal ledger" trend="+3.8%" trendTone="positive" />
            <SummaryCard icon="⚠️" title="Total Mismatches" value={String(totals.mismatches)} description="Batches where provider and ledger totals disagree" trend={totals.mismatches > 0 ? "Needs attention" : "All clear"} trendTone={totals.mismatches > 0 ? "negative" : "positive"} />
            <SummaryCard icon="🧾" title="Unresolved Exceptions" value={String(totals.unresolved)} description="Open, investigating or escalated exceptions" trend={totals.unresolved > 0 ? "Action required" : "Clear"} trendTone={totals.unresolved > 0 ? "negative" : "positive"} />
            <SummaryCard icon="💸" title="Pending Refund Approvals" value={String(totals.pendingRefunds)} description="Refunds awaiting dual-control approval" trend="Dual control" trendTone="neutral" />
            <SummaryCard icon="🏟️" title="Club Funds Held" value={formatUGX(totals.clubFundsHeld)} description="Net club commerce funds pending settlement" trend="5 clubs" trendTone="neutral" />
          </section>

          {/* 3. RECONCILIATION QUEUE TABS */}
          <section className="fa-panel">
            <div className="fa-tabs">
              {([
                ["deposits", "Deposits"],
                ["withdrawals", "Withdrawals"],
                ["settlements", "Market Settlements"],
                ["refunds", "Refunds"],
                ["clubs", "Club Commerce"],
              ] as [QueueKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`fa-tab ${activeQueue === key ? "fa-tab--active" : ""}`}
                  onClick={() => {
                    setActiveQueue(key);
                    setStatusFilter("all");
                    setSearch("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 4. QUEUE FILTERS & SEARCH */}
            <div className="fa-filters">
              <input
                className="fa-filters__search"
                type="text"
                placeholder="Search by ID, provider, customer or club..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="fa-filters__select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {activeStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. RECONCILIATION TABLE */}
            <div className="fa-table-wrap">
              {activeQueue === "deposits" && (
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Provider</th>
                      <th>Provider Total</th>
                      <th>Ledger Total</th>
                      <th>Difference</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeposits.map((d) => (
                      <tr key={d.id} className="fa-row" onClick={() => openDrawer(d, `Deposit Batch ${d.batchId}`)}>
                        <td className="fa-mono">{d.batchId}</td>
                        <td>{d.provider}</td>
                        <td>{formatUGX(d.providerTotal)}</td>
                        <td>{formatUGX(d.ledgerTotal)}</td>
                        <td><DiffBadge value={d.difference} /></td>
                        <td><StatusPill status={d.status} /></td>
                        <td>{d.createdAt}</td>
                      </tr>
                    ))}
                    {filteredDeposits.length === 0 && (
                      <tr><td colSpan={7} className="fa-empty">No deposit batches match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeQueue === "withdrawals" && (
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Withdrawal Batch</th>
                      <th>Requested Amount</th>
                      <th>Paid Amount</th>
                      <th>Provider Reference</th>
                      <th>Difference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} className="fa-row" onClick={() => openDrawer(w, `Withdrawal Batch ${w.withdrawalBatch}`)}>
                        <td className="fa-mono">{w.withdrawalBatch}</td>
                        <td>{formatUGX(w.requestedAmount)}</td>
                        <td>{formatUGX(w.paidAmount)}</td>
                        <td className="fa-mono">{w.providerReference}</td>
                        <td><DiffBadge value={w.difference} /></td>
                        <td><StatusPill status={w.status} /></td>
                      </tr>
                    ))}
                    {filteredWithdrawals.length === 0 && (
                      <tr><td colSpan={6} className="fa-empty">No withdrawal batches match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeQueue === "settlements" && (
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Settlement ID</th>
                      <th>Competition / Market</th>
                      <th>Gross Settled</th>
                      <th>Fees</th>
                      <th>Net Settled</th>
                      <th>Ledger Posted</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSettlements.map((s) => (
                      <tr key={s.id} className="fa-row" onClick={() => openDrawer(s, `Settlement ${s.settlementId}`)}>
                        <td className="fa-mono">{s.settlementId}</td>
                        <td>{s.market}</td>
                        <td>{formatUGX(s.grossSettled)}</td>
                        <td>{formatUGX(s.fees)}</td>
                        <td>{formatUGX(s.netSettled)}</td>
                        <td>{formatUGX(s.ledgerPosted)}</td>
                        <td><DiffBadge value={s.difference} /></td>
                      </tr>
                    ))}
                    {filteredSettlements.length === 0 && (
                      <tr><td colSpan={7} className="fa-empty">No settlements match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeQueue === "refunds" && (
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Refund ID</th>
                      <th>Original Transaction</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Requested By</th>
                      <th>Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefunds.map((r) => (
                      <tr key={r.refundId} className="fa-row-static">
                        <td className="fa-mono">{r.refundId}</td>
                        <td className="fa-mono">{r.originalTransaction}</td>
                        <td>{r.customer}</td>
                        <td>{formatUGX(r.amount)}</td>
                        <td>{r.reason}</td>
                        <td>{r.requestedBy}</td>
                        <td><StatusPill status={r.approvalStatus} /></td>
                      </tr>
                    ))}
                    {filteredRefunds.length === 0 && (
                      <tr><td colSpan={7} className="fa-empty">No refunds match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeQueue === "clubs" && (
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Club</th>
                      <th>Ticket Revenue</th>
                      <th>Merchandise Revenue</th>
                      <th>Membership Revenue</th>
                      <th>Fees Deducted</th>
                      <th>Net Club Funds</th>
                      <th>Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClubs.map((c) => (
                      <tr key={c.club} className="fa-row-static">
                        <td>{c.club}</td>
                        <td>{formatUGX(c.ticketRevenue)}</td>
                        <td>{formatUGX(c.merchandiseRevenue)}</td>
                        <td>{formatUGX(c.membershipRevenue)}</td>
                        <td>{formatUGX(c.feesDeducted)}</td>
                        <td>{formatUGX(c.netClubFunds)}</td>
                        <td><StatusPill status={c.settlementStatus} /></td>
                      </tr>
                    ))}
                    {filteredClubs.length === 0 && (
                      <tr><td colSpan={7} className="fa-empty">No clubs match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 6. MISMATCH & EXCEPTIONS PANEL */}
          <section className="fa-panel">
            <div className="fa-panel__header">
              <h2>Mismatch &amp; Exceptions</h2>
              <span className="fa-panel__hint">Finance balances shown here are read-only. Wallet and ledger amounts cannot be edited from this screen.</span>
            </div>
            <div className="fa-table-wrap">
              <table className="fa-table">
                <thead>
                  <tr>
                    <th>Exception ID</th>
                    <th>Source Type</th>
                    <th>Expected Amount</th>
                    <th>Actual Amount</th>
                    <th>Difference</th>
                    <th>Severity</th>
                    <th>Assigned Analyst</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((exc) => (
                    <tr key={exc.id}>
                      <td className="fa-mono">{exc.id}</td>
                      <td>{exc.sourceType}</td>
                      <td className="fa-readonly">{formatUGX(exc.expectedAmount)}</td>
                      <td className="fa-readonly">{formatUGX(exc.actualAmount)}</td>
                      <td><DiffBadge value={exc.difference} /></td>
                      <td><SeverityBadge severity={exc.severity} /></td>
                      <td>{exc.assignedAnalyst ?? <span className="fa-muted">Unassigned</span>}</td>
                      <td><StatusPill status={exc.status} /></td>
                      <td className="fa-actions">
                        <button className="fa-btn fa-btn--ghost" onClick={() => showToast(`Viewing details for ${exc.id}`)}>View</button>
                        <button className="fa-btn fa-btn--ghost" disabled={exc.status === "Resolved"} onClick={() => assignAnalyst(exc.id)}>Assign</button>
                        <button className="fa-btn fa-btn--warning" disabled={exc.status === "Escalated" || exc.status === "Resolved"} onClick={() => escalateException(exc.id)}>Escalate</button>
                        <button className="fa-btn fa-btn--success" disabled={exc.status === "Resolved"} onClick={() => resolveException(exc.id)}>Mark Resolved</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. CONTROLLED REFUND APPROVAL PANEL */}
          <section className="fa-panel">
            <div className="fa-panel__header">
              <h2>Controlled Refund Approvals</h2>
              <span className="fa-panel__hint">Dual control: Step 1 and Step 2 approval are required before a refund can be processed.</span>
            </div>
            <div className="fa-refund-list">
              {refunds.map((r) => {
                const canApprove1 = r.approvalStatus === "Reviewed";
                const canRequestSecond = r.approvalStatus === "Reviewed" || r.approvalStatus === "Awaiting Second Approval";
                const canApprove2 = r.approvalStatus === "Awaiting Second Approval";
                const canProcess = r.approvalStatus === "Approved";
                const isFinal = r.approvalStatus === "Processed" || r.approvalStatus === "Rejected";
                return (
                  <div className="fa-refund-card" key={r.refundId}>
                    <div className="fa-refund-card__top">
                      <div>
                        <span className="fa-mono fa-refund-card__id">{r.refundId}</span>
                        <span className="fa-refund-card__customer">{r.customer}</span>
                      </div>
                      <StatusPill status={r.approvalStatus} />
                    </div>
                    <div className="fa-refund-card__body">
                      <div><span className="fa-label">Original Txn</span><span className="fa-mono">{r.originalTransaction}</span></div>
                      <div><span className="fa-label">Amount</span><span>{formatUGX(r.amount)}</span></div>
                      <div><span className="fa-label">Reason</span><span>{r.reason}</span></div>
                      <div><span className="fa-label">Requested By</span><span>{r.requestedBy}</span></div>
                    </div>
                    <div className="fa-refund-card__steps">
                      <span className={`fa-step ${r.step1ApprovedBy ? "fa-step--done" : ""}`}>1. {r.step1ApprovedBy ? `Approved · ${r.step1ApprovedBy}` : "Step 1 pending"}</span>
                      <span className={`fa-step ${r.step2ApprovedBy ? "fa-step--done" : ""}`}>2. {r.step2ApprovedBy ? `Approved · ${r.step2ApprovedBy}` : "Step 2 pending"}</span>
                    </div>
                    {r.rejectionReason && <div className="fa-refund-card__rejected">Rejected: {r.rejectionReason}</div>}
                    <div className="fa-actions">
                      <button className="fa-btn fa-btn--ghost" disabled={r.approvalStatus !== "Requested"} onClick={() => reviewRefund(r.refundId)}>Review Refund</button>
                      <button className="fa-btn fa-btn--primary" disabled={!canApprove1} onClick={() => approveStep1(r.refundId)}>Approve Step 1</button>
                      <button className="fa-btn fa-btn--primary" disabled={!canApprove2} onClick={() => approveStep2(r.refundId)}>{canRequestSecond && !canApprove2 ? "Request Second Approval" : "Approve Step 2"}</button>
                      <button className="fa-btn fa-btn--danger" disabled={isFinal} onClick={() => setRejectDraft({ refundId: r.refundId, reason: "" })}>Reject with Reason</button>
                      <button className="fa-btn fa-btn--success" disabled={!canProcess} onClick={() => processRefund(r.refundId)}>Process Refund</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8. FUND SEGREGATION REPORT */}
          <section className="fa-panel">
            <div className="fa-panel__header">
              <h2>Fund Segregation Report</h2>
              <span className="fa-panel__hint">Customer, platform, fee, club and statutory funds are tracked separately at all times.</span>
            </div>
            <div className="fa-segregation">
              {fundSegregation.map((group) => (
                <div className={`fa-segregation__group fa-segregation__group--${group.category.toLowerCase().replace(/\s+/g, "-")}`} key={group.category}>
                  <div className="fa-segregation__title">{group.category}</div>
                  <table className="fa-segregation__table">
                    <tbody>
                      {group.lines.map((line) => (
                        <tr key={line.label}>
                          <td>{line.label}</td>
                          <td>{formatUGX(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Subtotal</td>
                        <td>{formatUGX(group.subtotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>
          </section>

          {/* 9. EXPORT & REPORTING PANEL */}
          <section className="fa-panel">
            <div className="fa-panel__header">
              <h2>Export &amp; Reporting</h2>
            </div>
            <div className="fa-export">
              <div className="fa-export__buttons">
                <button className="fa-btn fa-btn--primary" onClick={() => runExport("CSV Export")}>Export CSV</button>
                <button className="fa-btn fa-btn--primary" onClick={() => runExport("Excel Export")}>Export Excel</button>
                <button className="fa-btn fa-btn--primary" onClick={() => runExport("PDF Summary")}>Export PDF Summary</button>
                <button className="fa-btn fa-btn--ghost" onClick={() => runExport("Daily Reconciliation Report")}>Generate Daily Reconciliation Report</button>
                <button className="fa-btn fa-btn--ghost" onClick={() => runExport("Settlement Report")}>Generate Settlement Report</button>
              </div>
              <div className="fa-table-wrap">
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Report Type</th>
                      <th>Date Range</th>
                      <th>Generated By</th>
                      <th>Last Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportHistory.map((ex, idx) => (
                      <tr key={`${ex.reportType}-${idx}`}>
                        <td>{ex.reportType}</td>
                        <td>{ex.dateRange}</td>
                        <td>{ex.generatedBy}</td>
                        <td>{ex.lastGenerated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 10. AUDIT ACTIVITY FEED */}
          <section className="fa-panel">
            <div className="fa-panel__header">
              <h2>Audit Activity Feed</h2>
            </div>
            <ul className="fa-timeline">
              {auditFeed.map((event) => (
                <li className="fa-timeline__item" key={event.id}>
                  <span className="fa-timeline__dot" />
                  <div className="fa-timeline__content">
                    <div className="fa-timeline__row">
                      <span className="fa-timeline__action">{event.action}</span>
                      <span className="fa-timeline__time">{event.timestamp}</span>
                    </div>
                    <div className="fa-timeline__meta">
                      {event.entityType} · {event.entityId} · {event.user}
                    </div>
                    {event.note && <div className="fa-timeline__note">{event.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* 11. BATCH DETAIL DRAWER */}
      {drawerBatch && (
        <div className="fa-drawer-overlay" onClick={closeDrawer}>
          <div className="fa-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="fa-drawer__header">
              <h3>{drawerTitle}</h3>
              <button className="fa-drawer__close" onClick={closeDrawer} aria-label="Close drawer">✕</button>
            </div>

            <div className="fa-drawer__section">
              <h4>Batch Information</h4>
              <div className="fa-drawer__grid">
                <div><span className="fa-label">Batch ID</span><span className="fa-mono">{drawerBatch.id}</span></div>
                <div><span className="fa-label">Provider</span><span>{drawerBatch.provider}</span></div>
                <div><span className="fa-label">Settlement Window</span><span>{drawerBatch.settlementWindow}</span></div>
                <div><span className="fa-label">Currency</span><span>{drawerBatch.currency}</span></div>
                <div><span className="fa-label">Status</span><StatusPill status={drawerBatch.status} /></div>
                <div><span className="fa-label">Created</span><span>{drawerBatch.createdAt}</span></div>
                <div><span className="fa-label">Closed</span><span>{drawerBatch.closedAt ?? "Not yet closed"}</span></div>
              </div>
            </div>

            <div className="fa-drawer__section">
              <h4>Source References</h4>
              <div className="fa-drawer__grid">
                {drawerBatch.sourceReferences.flutterwaveRef && (
                  <div><span className="fa-label">Flutterwave</span><span className="fa-mono">{drawerBatch.sourceReferences.flutterwaveRef}</span></div>
                )}
                {drawerBatch.sourceReferences.mtnMomoRef && (
                  <div><span className="fa-label">MTN MoMo</span><span className="fa-mono">{drawerBatch.sourceReferences.mtnMomoRef}</span></div>
                )}
                {drawerBatch.sourceReferences.airtelMoneyRef && (
                  <div><span className="fa-label">Airtel Money</span><span className="fa-mono">{drawerBatch.sourceReferences.airtelMoneyRef}</span></div>
                )}
                <div><span className="fa-label">Internal Ledger</span><span className="fa-mono">{drawerBatch.sourceReferences.internalLedgerRef}</span></div>
                {drawerBatch.sourceReferences.bankSettlementRef && (
                  <div><span className="fa-label">Bank Settlement</span><span className="fa-mono">{drawerBatch.sourceReferences.bankSettlementRef}</span></div>
                )}
              </div>
            </div>

            <div className="fa-drawer__section">
              <h4>Line Items</h4>
              <div className="fa-drawer__scroll-table">
                <table className="fa-table fa-table--compact">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerBatch.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td className="fa-mono">{li.reference}</td>
                        <td>{li.description}</td>
                        <td>{formatUGX(li.amount)}</td>
                        <td>{li.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="fa-drawer__section">

<h4>Actions</h4>


<div className="fa-actions">


{drawerBatch.status === "Mismatched" && (

<button
className="fa-btn fa-btn--warning"
onClick={() =>
 updateBatchStatus(
 drawerBatch.id,
 "Under Review"
 )
}
>
Start Review
</button>

)}



{drawerBatch.status === "Under Review" && (

<>

<button
className="fa-btn fa-btn--success"
onClick={() =>
 confirmAndRun(
 "Resolve mismatch",
 "Confirm this deposit has been reconciled?",
 "Confirm Match",
 () =>
 updateBatchStatus(
 drawerBatch.id,
 "Matched"
 )
 )
}
>
Confirm Match
</button>



<button
className="fa-btn fa-btn--danger"
onClick={() =>
 showToast(
 `${drawerBatch.id} kept as mismatch`
 )
}
>
Reject Match
</button>

</>

)}



</div>

</div>

            <div className="fa-drawer__section">
              <h4>Audit History</h4>
              <ul className="fa-timeline fa-timeline--compact">
                {drawerBatch.auditHistory.map((event) => (
                  <li className="fa-timeline__item" key={event.id}>
                    <span className="fa-timeline__dot" />
                    <div className="fa-timeline__content">
                      <div className="fa-timeline__row">
                        <span className="fa-timeline__action">{event.action}</span>
                        <span className="fa-timeline__time">{event.timestamp}</span>
                      </div>
                      {event.note && <div className="fa-timeline__note">{event.note}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 12. CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fa-modal-overlay">
          <div className="fa-modal">
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="fa-modal__actions">
              <button className="fa-btn fa-btn--ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="fa-btn fa-btn--primary" onClick={confirmModal.onConfirm}>{confirmModal.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject-with-reason mini modal */}
      {rejectDraft && (
        <div className="fa-modal-overlay">
          <div className="fa-modal">
            <h3>Reject {rejectDraft.refundId}</h3>
            <p>Provide a reason for rejecting this refund request.</p>
            <textarea
              className="fa-modal__textarea"
              value={rejectDraft.reason}
              onChange={(e) => setRejectDraft({ ...rejectDraft, reason: e.target.value })}
              placeholder="Reason for rejection..."
            />
            <div className="fa-modal__actions">
              <button className="fa-btn fa-btn--ghost" onClick={() => setRejectDraft(null)}>Cancel</button>
              <button
                className="fa-btn fa-btn--danger"
                disabled={!rejectDraft.reason.trim()}
                onClick={() => rejectRefund(rejectDraft.refundId, rejectDraft.reason.trim())}
              >
                Reject Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && <div className="fa-toast">{toast}</div>}
    </div>
  );
};

export default FinanceAdminDashboard;
