import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import "./FinanceAdmin.css";

import type {
  BatchStatus,
  Severity,
  AuditEvent,
  ReconciliationBatch,
  DepositBatch,
  WithdrawalBatch,
  SettlementBatch,
  RefundRequest,
  ClubCommerceRecord,
  ReconciliationException,
  FundSegregationSummary,
  ExportRecord,
  SettlableQueue,
} from "./FinanceService";

import {
  nowStamp,
  uid,
  ANALYSTS,
  formatExceptionSource,
  getDeposits,
  getWithdrawals,
  getSettlements,
  getRefunds,
  getClubs,
  getExceptions,
  getAuditFeed,
  getExportHistory,
} from "./FinanceService";

import FinanceWithdrawalQueue from "./FinanceWithdrawalQueue";

/* ============================================================================
   UI-ONLY TYPES
   (tab keys are a display concern, not part of the data layer)
   ========================================================================= */

type QueueKey = "deposits" | "withdrawals" | "settlements" | "refunds" | "clubs";

/* ============================================================================
   HELPERS
   ========================================================================= */

const formatUGX = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  return `${sign}UGX ${Math.abs(value).toLocaleString("en-UG", {
    maximumFractionDigits: 0,
  })}`;
};

/* ============================================================================
   STATIC REFERENCE DATA (report presentation config, not fetched)
   ========================================================================= */

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

/* Human-readable entity labels for audit entries, keyed by settleable queue. */
const QUEUE_ENTITY_LABELS: Record<SettlableQueue, string> = {
  deposits: "Deposit Batch",
  withdrawals: "Withdrawal Batch",
  settlements: "Settlement",
};

/* Human-readable audit action labels for each batch status transition, shared
   by the batch-level audit history and the global audit feed so both read
   the same wording for the same event. */
const STATUS_ACTION_LABELS: Record<BatchStatus, string> = {
  "Under Review": "Batch review started",
  Matched: "Batch matched",
  Mismatched: "Batch rejected",
  Pending: "Batch marked pending",
};

/* ============================================================================
   SMALL PRESENTATIONAL COMPONENTS
   ========================================================================= */

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cls = status.toLowerCase().replace(/\s+/g, "-");

  return (
    <span className={`fa-pill fa-pill--${cls}`}>
      {status}
    </span>
  );
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

// Payments and Payouts are two nav entries into the same reconciliation
// dashboard — initialQueue is what tells them apart (Payments opens on
// incoming money/Deposits, Payouts opens on outgoing money/Withdrawals).
interface FinanceAdminDashboardProps {
  initialQueue?: QueueKey;
}

const FinanceAdminDashboard: React.FC<FinanceAdminDashboardProps> = ({ initialQueue = "deposits" }) => {
  /* --------------------------- data state (backend-ready) --------------------------- */
  // All of these are populated from financeService on mount. Every setter is
  // exposed (not just deposits') so status-update workflows can be extended
  // to withdrawals, settlements and clubs without further plumbing changes.
  const [deposits, setDeposits] = useState<DepositBatch[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalBatch[]>([]);
  const [settlements, setSettlements] = useState<SettlementBatch[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [clubs, setClubs] = useState<ClubCommerceRecord[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [auditFeed, setAuditFeed] = useState<AuditEvent[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);

  /* --------------------------- async / loading state --------------------------- */
  const [loadingData, setLoadingData] = useState(true);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const [processingExceptionId, setProcessingExceptionId] = useState<string | null>(null);
  const [updatingBatchId, setUpdatingBatchId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setLoadingData(true);
      try {
        const [
          depositsData,
          withdrawalsData,
          settlementsData,
          refundsData,
          clubsData,
          exceptionsData,
          auditFeedData,
          exportHistoryData,
        ] = await Promise.all([
          getDeposits(),
          getWithdrawals(),
          getSettlements(),
          getRefunds(),
          getClubs(),
          getExceptions(),
          getAuditFeed(),
          getExportHistory(),
        ]);

        if (cancelled) return;

        setDeposits(depositsData);
        setWithdrawals(withdrawalsData);
        setSettlements(settlementsData);
        setRefunds(refundsData);
        setClubs(clubsData);
        setExceptions(exceptionsData);
        setAuditFeed(auditFeedData);
        setExportHistory(exportHistoryData);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };  }, []);

  const [activeQueue, setActiveQueue] = useState<QueueKey>(initialQueue);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [drawerBatch, setDrawerBatch] = useState<ReconciliationBatch | null>(null);
  const [drawerTitle, setDrawerTitle] = useState<string>("");
  const [drawerQueue, setDrawerQueue] = useState<SettlableQueue | null>(null);

  // Refund Details Drawer — stores the ID (not the object) so the drawer
  // always reflects the latest refund state after an approval action fires,
  // and stays in sync with both the Refunds table and the quick-action panel
  // since all three read from the same `refunds` state.
  const [refundDrawerId, setRefundDrawerId] = useState<string | null>(null);

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

  // Quick-action queue for the Controlled Refund Approvals panel: only
  // refunds still in flight. Processed / Rejected refunds are finished
  // business and belong in the Refunds table + drawer audit history, not
  // in a panel meant to surface things that need action right now.
  const actionableRefunds = useMemo(
    () =>
      refunds.filter((r) =>
        ["Requested", "Reviewed", "Awaiting Second Approval", "Approved"].includes(r.approvalStatus)
      ),
    [refunds]
  );

  /* --------------------------- refund drawer helpers --------------------------- */

  const refundDrawer = useMemo(
    () => refunds.find((r) => r.refundId === refundDrawerId) ?? null,
    [refunds, refundDrawerId]
  );

  // Audit history for the drawer is derived from the single shared auditFeed
  // (the same feed every refund handler already writes to via pushAudit),
  // so no business logic or logging is duplicated between the panel,
  // the table, and the drawer.
  const refundAuditHistory = useMemo(() => {
    if (!refundDrawer) return [];
    return auditFeed.filter(
      (e) => e.entityType === "Refund" && e.entityId === refundDrawer.refundId
    );
  }, [auditFeed, refundDrawer]);

  const openRefundDrawer = (refund: RefundRequest) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_VIEW")) return;
    setRefundDrawerId(refund.refundId);
  };

  const closeRefundDrawer = () => setRefundDrawerId(null);

  /* --------------------------- actions --------------------------- */

  const openDrawer = (batch: ReconciliationBatch, title: string, queue: SettlableQueue) => {
    setDrawerBatch(batch);
    setDrawerTitle(title);
    setDrawerQueue(queue);
  };

  const closeDrawer = () => {
    setDrawerBatch(null);
    setDrawerTitle("");
    setDrawerQueue(null);
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
    const analyst = ANALYSTS[0];
    setProcessingExceptionId(exceptionId);
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId ? { ...e, assignedAnalyst: analyst, status: "Investigating" } : e
      )
    );
    pushAudit("Assigned analyst", "Exception", exceptionId, `Assigned to ${analyst}`);
    showToast(`${exceptionId} assigned to ${analyst}`);
    setProcessingExceptionId(null);
  };

  const escalateException = (exceptionId: string) => {
    confirmAndRun(
      "Escalate exception",
      `Escalate ${exceptionId} to Finance Manager for review? This cannot be undone.`,
      "Escalate",
      () => {
        setProcessingExceptionId(exceptionId);
        setExceptions((prev) =>
          prev.map((e) => (e.id === exceptionId ? { ...e, status: "Escalated" } : e))
        );
        pushAudit("Escalated for review", "Exception", exceptionId);
        showToast(`${exceptionId} escalated`);
        setProcessingExceptionId(null);
      }
    );
  };

  // Resolving an exception also syncs its linked batch: the exception's
  // sourceType/sourceId point directly at a deposit, withdrawal, or
  // settlement, so the two queues never drift out of sync with each other.
  const resolveException = (exceptionId: string) => {
    const exception = exceptions.find((e) => e.id === exceptionId);
    if (!exception) return;

    const relatedLabel = `${QUEUE_ENTITY_LABELS[exception.sourceType]} ${exception.sourceId}`;

    confirmAndRun(
      "Mark exception resolved",
      `Confirm that ${exceptionId} has been fully investigated and resolved. ${relatedLabel} will be marked Matched.`,
      "Mark Resolved",
      () => {
        setProcessingExceptionId(exceptionId);
        setExceptions((prev) =>
          prev.map((e) => (e.id === exceptionId ? { ...e, status: "Resolved" } : e))
        );
        pushAudit("Resolved exception", "Exception", exceptionId, `Marked resolved · ${relatedLabel}`);
        showToast(`${exceptionId} marked resolved`);

        // Sync the linked reconciliation batch back to Matched. This is a
        // no-op if the batch can't be found (e.g. it isn't loaded in this
        // session's mock data), so it's always safe to call.
        updateBatchStatus(exception.sourceType, exception.sourceId, "Matched");

        setProcessingExceptionId(null);
      }
    );
  };

  /* -----------------------------------------------------------------------
     Refund approval handlers.
     These are the single source of truth for the refund workflow and are
     shared by all three views: the Refunds table (via the drawer), the
     Refund Details Drawer, and the Controlled Refund Approvals quick-action
     panel. None of these three views implement their own copy of this logic.
     ----------------------------------------------------------------------- */

  const reviewRefund = (refundId: string) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_REVIEW")) return;
    setProcessingRefundId(refundId);
    setRefunds((prev) =>
      prev.map((r) => (r.refundId === refundId && r.approvalStatus === "Requested" ? { ...r, approvalStatus: "Reviewed" } : r))
    );
    pushAudit("Reviewed refund", "Refund", refundId, "Marked as reviewed");
    showToast(`${refundId} marked as reviewed`);
    setProcessingRefundId(null);
  };

  const approveStep1 = (refundId: string) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_APPROVE_STEP1")) return;
    confirmAndRun(
      "Approve Step 1",
      `Approve step 1 of ${refundId} as Finance Admin?`,
      "Approve Step 1",
      () => {
        setProcessingRefundId(refundId);
        setRefunds((prev) =>
          prev.map((r) =>
            r.refundId === refundId
              ? { ...r, approvalStatus: "Awaiting Second Approval", step1ApprovedBy: "Finance Admin" }
              : r
          )
        );
        pushAudit("Approved refund Step 1", "Refund", refundId, "Approved by Finance Admin");
        showToast(`${refundId} approved (step 1)`);
        setProcessingRefundId(null);
      }
    );
  };

  const approveStep2 = (refundId: string) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_APPROVE_STEP2")) return;
    confirmAndRun(
      "Approve Step 2",
      `Approve step 2 of ${refundId} as Finance Manager? This authorizes final processing.`,
      "Approve Step 2",
      () => {
        setProcessingRefundId(refundId);
        setRefunds((prev) =>
          prev.map((r) =>
            r.refundId === refundId
              ? { ...r, approvalStatus: "Approved", step2ApprovedBy: "Finance Manager" }
              : r
          )
        );
        pushAudit("Approved refund Step 2", "Refund", refundId, "Approved by Finance Manager");
        showToast(`${refundId} approved (step 2)`);
        setProcessingRefundId(null);
      }
    );
  };

  const rejectRefund = (refundId: string, reason: string) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_APPROVE_STEP1") && !hasPermission("REFUND_APPROVE_STEP2")) return;
    setProcessingRefundId(refundId);
    setRefunds((prev) =>
      prev.map((r) => (r.refundId === refundId ? { ...r, approvalStatus: "Rejected", rejectionReason: reason } : r))
    );
    pushAudit("Rejected refund", "Refund", refundId, reason);
    showToast(`${refundId} rejected`);
    setRejectDraft(null);
    setProcessingRefundId(null);
  };

  const processRefund = (refundId: string) => {
    // TODO: Replace with permission check
    // if (!hasPermission("REFUND_PROCESS")) return;
    confirmAndRun(
      "Process refund",
      `This will process ${refundId} for final payout. Confirm dual-control approval is complete.`,
      "Process Refund",
      () => {
        setProcessingRefundId(refundId);
        setRefunds((prev) =>
          prev.map((r) => (r.refundId === refundId ? { ...r, approvalStatus: "Processed" } : r))
        );
        pushAudit("Processed refund", "Refund", refundId, "Final payout released by Finance Admin");
        showToast(`${refundId} processed`);
        setProcessingRefundId(null);
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
    pushAudit("Report generated", "Report", reportType);
    showToast(`${reportType} generated successfully`);
  };

  // Generalized across all settleable reconciliation queues (deposits,
  // withdrawals, settlements) so status-update behavior isn't hard-coded to
  // deposits alone — the drawer just tells this handler which queue it came
  // from via `drawerQueue`.
  const updateBatchStatus = (queue: SettlableQueue, batchId: string, newStatus: BatchStatus) => {
    setUpdatingBatchId(batchId);

    const entityType = QUEUE_ENTITY_LABELS[queue];
    const actionLabel = STATUS_ACTION_LABELS[newStatus] ?? `Status changed to ${newStatus}`;
    const appendAuditEntry = (batch: ReconciliationBatch): ReconciliationBatch => ({
      ...batch,
      status: newStatus,
      auditHistory: [
        ...batch.auditHistory,
        {
          id: uid("AUD"),
          timestamp: nowStamp(),
          user: "Finance Admin",
          action: actionLabel,
          entityType,
          entityId: batchId,
        },
      ],
    });

    if (queue === "deposits") {
      setDeposits((prev) =>
        prev.map((batch) => (batch.id === batchId ? (appendAuditEntry(batch) as DepositBatch) : batch))
      );
    } else if (queue === "withdrawals") {
      setWithdrawals((prev) =>
        prev.map((batch) => (batch.id === batchId ? (appendAuditEntry(batch) as WithdrawalBatch) : batch))
      );
    } else if (queue === "settlements") {
      setSettlements((prev) =>
        prev.map((batch) => (batch.id === batchId ? (appendAuditEntry(batch) as SettlementBatch) : batch))
      );
    }

    pushAudit(actionLabel, entityType, batchId);

    // Only close the batch drawer if it's currently showing the batch we
    // just updated — this update can also be triggered indirectly (e.g. an
    // exception resolution syncing its linked batch) while a different
    // drawer, or no drawer, is open, and that shouldn't disturb the UI.
    if (drawerBatch && drawerBatch.id === batchId) {
      setDrawerBatch(null);
      setDrawerQueue(null);
    }

    setUpdatingBatchId(null);

    showToast(`${batchId} moved to ${newStatus}`);
  };

  /* --------------------------- render helpers --------------------------- */

  const activeStatuses = useMemo(() => {
    switch (activeQueue) {
      case "deposits":
        return queueStatuses(deposits);
      case "withdrawals":
        return [
          "PENDING_APPROVAL",
          "APPROVED",
          "REJECTED",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
        ];
      case "settlements":
        return queueStatuses(settlements);
      case "refunds":
        return Array.from(new Set(refunds.map((r) => r.approvalStatus)));
      case "clubs":
        return queueStatuses(clubs.map((c) => ({ status: c.settlementStatus })));
      default:
        return [];
    }
  }, [activeQueue, deposits, settlements, refunds, clubs]);

  return (
    <>
      <AdminLayout>
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

          {loadingData ? (
            <section className="fa-panel">
              <p className="fa-panel__note">Loading finance data…</p>
            </section>
          ) : (
            <>
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
                          <tr key={d.id} className="fa-row" onClick={() => openDrawer(d, `Deposit Batch ${d.batchId}`, "deposits")}>
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
                    <FinanceWithdrawalQueue
                      search={search}
                      statusFilter={statusFilter}
                    />
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
                          <tr key={s.id} className="fa-row" onClick={() => openDrawer(s, `Settlement ${s.settlementId}`, "settlements")}>
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

                  {/* REFUNDS QUEUE — primary entry point. Row actions open the
                      Refund Details Drawer, which is the authoritative workflow
                      view (full details, approval timeline, audit history, and
                      every approval action). */}
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
                          <th>Actions</th>
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
                            <td>
                              {/* TODO: Replace with permission check
                                  if (hasPermission("REFUND_VIEW")) */}
                              <button className="fa-btn fa-btn--ghost" onClick={() => openRefundDrawer(r)}>
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredRefunds.length === 0 && (
                          <tr><td colSpan={8} className="fa-empty">No refunds match your filters.</td></tr>
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
                          <td>{formatExceptionSource(exc)}</td>
                          <td className="fa-readonly">{formatUGX(exc.expectedAmount)}</td>
                          <td className="fa-readonly">{formatUGX(exc.actualAmount)}</td>
                          <td><DiffBadge value={exc.difference} /></td>
                          <td><SeverityBadge severity={exc.severity} /></td>
                          <td>{exc.assignedAnalyst ?? <span className="fa-muted">Unassigned</span>}</td>
                          <td><StatusPill status={exc.status} /></td>
                          <td className="fa-actions">
                            <button className="fa-btn fa-btn--ghost" onClick={() => showToast(`Viewing details for ${exc.id}`)}>View</button>
                            <button className="fa-btn fa-btn--ghost" disabled={exc.status === "Resolved" || processingExceptionId === exc.id} onClick={() => assignAnalyst(exc.id)}>Assign</button>
                            <button className="fa-btn fa-btn--warning" disabled={exc.status === "Escalated" || exc.status === "Resolved" || processingExceptionId === exc.id} onClick={() => escalateException(exc.id)}>Escalate</button>
                            <button className="fa-btn fa-btn--success" disabled={exc.status === "Resolved" || processingExceptionId === exc.id} onClick={() => resolveException(exc.id)}>Mark Resolved</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 7. CONTROLLED REFUND APPROVAL PANEL — secondary quick-action
                  queue for Finance Admin users. The Refund Details Drawer
                  remains the authoritative workflow view (full details,
                  approval timeline, audit history, rejection reason, and all
                  approval actions). This panel reads the same `refunds` state
                  and reuses the same handlers, so it stays in sync automatically
                  and never diverges from the drawer or the table. */}
              <section className="fa-panel">
                <div className="fa-panel__header">
                  <h2>Controlled Refund Approvals</h2>
                  <span className="fa-panel__hint">Dual control: Step 1 and Step 2 approval are required before a refund can be processed.</span>
                </div>
                <p className="fa-panel__note">
                  Quick-action approval queue. Open a refund from the Refunds table for full details and audit history.
                </p>
                <div className="fa-refund-list">
                  {actionableRefunds.map((r) => {
                    const canApprove1 = r.approvalStatus === "Reviewed";
                    const canRequestSecond = r.approvalStatus === "Reviewed" || r.approvalStatus === "Awaiting Second Approval";
                    const canApprove2 = r.approvalStatus === "Awaiting Second Approval";
                    const canProcess = r.approvalStatus === "Approved";
                    const isFinal = r.approvalStatus === "Processed" || r.approvalStatus === "Rejected";
                    const isProcessing = processingRefundId === r.refundId;
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
                          <button className="fa-btn fa-btn--ghost" onClick={() => openRefundDrawer(r)}>Open Details</button>
                          {/* TODO: Replace with permission check
                              if (hasPermission("REFUND_REVIEW")) */}
                          <button className="fa-btn fa-btn--ghost" disabled={r.approvalStatus !== "Requested" || isProcessing} onClick={() => reviewRefund(r.refundId)}>Review Refund</button>
                          {/* TODO: Replace with permission check
                              if (hasPermission("REFUND_APPROVE_STEP1")) */}
                          <button className="fa-btn fa-btn--primary" disabled={!canApprove1 || isProcessing} onClick={() => approveStep1(r.refundId)}>Approve Step 1</button>
                          {/* TODO: Replace with permission check
                              if (hasPermission("REFUND_APPROVE_STEP2")) */}
                          <button className="fa-btn fa-btn--primary" disabled={!canApprove2 || isProcessing} onClick={() => approveStep2(r.refundId)}>{canRequestSecond && !canApprove2 ? "Request Second Approval" : "Approve Step 2"}</button>
                          {/* TODO: Replace with permission check
                              if (hasPermission("REFUND_APPROVE_STEP1") || hasPermission("REFUND_APPROVE_STEP2")) */}
                          <button className="fa-btn fa-btn--danger" disabled={isFinal || isProcessing} onClick={() => setRejectDraft({ refundId: r.refundId, reason: "" })}>Reject with Reason</button>
                          {/* TODO: Replace with permission check
                              if (hasPermission("REFUND_PROCESS")) */}
                          <button className="fa-btn fa-btn--success" disabled={!canProcess || isProcessing} onClick={() => processRefund(r.refundId)}>Process Refund</button>
                        </div>
                      </div>
                    );
                  })}
                  {actionableRefunds.length === 0 && (
                    <div className="fa-empty fa-empty--panel">No refunds currently need action.</div>
                  )}
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
            </>
          )}
        </div>
      </AdminLayout>

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
                    disabled={updatingBatchId === drawerBatch.id}
                    onClick={() => drawerQueue && updateBatchStatus(drawerQueue, drawerBatch.id, "Under Review")}
                  >
                    Start Review
                  </button>
                )}

                {drawerBatch.status === "Under Review" && (
                  <>
                    <button
                      className="fa-btn fa-btn--success"
                      disabled={updatingBatchId === drawerBatch.id}
                      onClick={() =>
                        confirmAndRun(
                          "Resolve mismatch",
                          "Confirm this batch has been reconciled?",
                          "Confirm Match",
                          () => drawerQueue && updateBatchStatus(drawerQueue, drawerBatch.id, "Matched")
                        )
                      }
                    >
                      Confirm Match
                    </button>

                    <button
                      className="fa-btn fa-btn--danger"
                      disabled={updatingBatchId === drawerBatch.id}
                      onClick={() =>
                        confirmAndRun(
                          "Reject match",
                          "This will flag the batch as mismatched again for further investigation. Continue?",
                          "Reject Match",
                          () => drawerQueue && updateBatchStatus(drawerQueue, drawerBatch.id, "Mismatched")
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

      {/* 12. REFUND DETAILS DRAWER — authoritative workflow view.
          Distinct from the reconciliation batch drawer above because
          RefundRequest is a different type from ReconciliationBatch.
          Shows full refund details, the dual-control approval timeline,
          audit history (derived from the shared auditFeed), and every
          approval action, all backed by the same handlers used by the
          Refunds table and the Controlled Refund Approvals panel. */}
      {refundDrawer && (
        <div className="fa-drawer-overlay" onClick={closeRefundDrawer}>
          <div className="fa-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="fa-drawer__header">
              <h3>Refund {refundDrawer.refundId}</h3>
              <button className="fa-drawer__close" onClick={closeRefundDrawer} aria-label="Close drawer">✕</button>
            </div>

            <div className="fa-drawer__section">
              <h4>Refund Information</h4>
              <div className="fa-drawer__grid">
                <div><span className="fa-label">Refund ID</span><span className="fa-mono">{refundDrawer.refundId}</span></div>
                <div><span className="fa-label">Original Transaction</span><span className="fa-mono">{refundDrawer.originalTransaction}</span></div>
                <div><span className="fa-label">Customer</span><span>{refundDrawer.customer}</span></div>
                <div><span className="fa-label">Amount</span><span>{formatUGX(refundDrawer.amount)}</span></div>
                <div><span className="fa-label">Reason</span><span>{refundDrawer.reason}</span></div>
                <div><span className="fa-label">Requested By</span><span>{refundDrawer.requestedBy}</span></div>
                <div><span className="fa-label">Created</span><span>{refundDrawer.createdAt}</span></div>
                <div><span className="fa-label">Current Status</span><StatusPill status={refundDrawer.approvalStatus} /></div>
              </div>
            </div>

            <div className="fa-drawer__section">
              <h4>Approval Timeline</h4>
              <div className="fa-refund-drawer__timeline">
                <div className={`fa-refund-timeline-step ${refundDrawer.approvalStatus !== "Requested" ? "fa-refund-timeline-step--done" : "fa-refund-timeline-step--active"}`}>
                  <span className="fa-refund-timeline-step__marker">1</span>
                  <span className="fa-refund-timeline-step__label">Requested</span>
                  <span className="fa-refund-timeline-step__meta">{refundDrawer.requestedBy}</span>
                </div>

                <div className={`fa-refund-timeline-step ${["Reviewed", "Awaiting Second Approval", "Approved", "Processed"].includes(refundDrawer.approvalStatus)
                    ? "fa-refund-timeline-step--done"
                    : refundDrawer.approvalStatus === "Requested" ? "" : "fa-refund-timeline-step--active"
                  }`}>
                  <span className="fa-refund-timeline-step__marker">2</span>
                  <span className="fa-refund-timeline-step__label">Reviewed</span>
                </div>

                <div className={`fa-refund-timeline-step ${refundDrawer.step1ApprovedBy ? "fa-refund-timeline-step--done" : ""}`}>
                  <span className="fa-refund-timeline-step__marker">3</span>
                  <span className="fa-refund-timeline-step__label">Step 1 Approved</span>
                  {refundDrawer.step1ApprovedBy && <span className="fa-refund-timeline-step__meta">{refundDrawer.step1ApprovedBy}</span>}
                </div>

                <div className={`fa-refund-timeline-step ${refundDrawer.step2ApprovedBy ? "fa-refund-timeline-step--done" : ""}`}>
                  <span className="fa-refund-timeline-step__marker">4</span>
                  <span className="fa-refund-timeline-step__label">Step 2 Approved</span>
                  {refundDrawer.step2ApprovedBy && <span className="fa-refund-timeline-step__meta">{refundDrawer.step2ApprovedBy}</span>}
                </div>

                <div className={`fa-refund-timeline-step ${refundDrawer.approvalStatus === "Processed" ? "fa-refund-timeline-step--done" :
                    refundDrawer.approvalStatus === "Rejected" ? "fa-refund-timeline-step--rejected" : ""
                  }`}>
                  <span className="fa-refund-timeline-step__marker">5</span>
                  <span className="fa-refund-timeline-step__label">
                    {refundDrawer.approvalStatus === "Rejected" ? "Rejected" : "Processed"}
                  </span>
                  {refundDrawer.rejectionReason && <span className="fa-refund-timeline-step__meta">{refundDrawer.rejectionReason}</span>}
                </div>
              </div>
            </div>

            <div className="fa-drawer__section">
              <h4>Actions</h4>
              <div className="fa-actions">
                {/* TODO: Replace with permission check
                    if (hasPermission("REFUND_REVIEW")) */}
                <button
                  className="fa-btn fa-btn--ghost"
                  disabled={refundDrawer.approvalStatus !== "Requested" || processingRefundId === refundDrawer.refundId}
                  onClick={() => reviewRefund(refundDrawer.refundId)}
                >
                  Review Refund
                </button>

                {/* TODO: Replace with permission check
                    if (hasPermission("REFUND_APPROVE_STEP1")) */}
                <button
                  className="fa-btn fa-btn--primary"
                  disabled={refundDrawer.approvalStatus !== "Reviewed" || processingRefundId === refundDrawer.refundId}
                  onClick={() => approveStep1(refundDrawer.refundId)}
                >
                  Approve Step 1
                </button>

                {/* TODO: Replace with permission check
                    if (hasPermission("REFUND_APPROVE_STEP2")) */}
                <button
                  className="fa-btn fa-btn--primary"
                  disabled={refundDrawer.approvalStatus !== "Awaiting Second Approval" || processingRefundId === refundDrawer.refundId}
                  onClick={() => approveStep2(refundDrawer.refundId)}
                >
                  Approve Step 2
                </button>

                {/* TODO: Replace with permission check
                    if (hasPermission("REFUND_APPROVE_STEP1") || hasPermission("REFUND_APPROVE_STEP2")) */}
                <button
                  className="fa-btn fa-btn--danger"
                  disabled={refundDrawer.approvalStatus === "Processed" || refundDrawer.approvalStatus === "Rejected" || processingRefundId === refundDrawer.refundId}
                  onClick={() => setRejectDraft({ refundId: refundDrawer.refundId, reason: "" })}
                >
                  Reject with Reason
                </button>

                {/* TODO: Replace with permission check
                    if (hasPermission("REFUND_PROCESS")) */}
                <button
                  className="fa-btn fa-btn--success"
                  disabled={refundDrawer.approvalStatus !== "Approved" || processingRefundId === refundDrawer.refundId}
                  onClick={() => processRefund(refundDrawer.refundId)}
                >
                  Process Refund
                </button>
              </div>
            </div>

            <div className="fa-drawer__section">
              <h4>Audit History</h4>
              <ul className="fa-timeline fa-timeline--compact">
                {refundAuditHistory.map((event) => (
                  <li className="fa-timeline__item" key={event.id}>
                    <span className="fa-timeline__dot" />
                    <div className="fa-timeline__content">
                      <div className="fa-timeline__row">
                        <span className="fa-timeline__action">{event.action}</span>
                        <span className="fa-timeline__time">{event.timestamp}</span>
                      </div>
                      <div className="fa-timeline__meta">{event.user}</div>
                      {event.note && <div className="fa-timeline__note">{event.note}</div>}
                    </div>
                  </li>
                ))}
                {refundAuditHistory.length === 0 && (
                  <li className="fa-empty">No audit events yet for this refund.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 13. CONFIRMATION MODAL */}
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

      {/* Reject-with-reason mini modal — shared by the drawer and the panel */}
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

    </>
  );
};

export default FinanceAdminDashboard;
