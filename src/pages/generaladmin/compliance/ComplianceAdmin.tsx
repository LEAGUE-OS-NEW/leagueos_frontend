import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import { extractApiError } from "../../../services/apiUtils.ts";
import {
  fetchComplianceDecisions,
  fetchKYCSessions,
  fetchRiskAssessments,
  fetchRiskProfiles,
} from "../../../services/markets/complianceAdminService.ts";
import "./ComplianceAdmin.css";

/* ============================================================
   TYPES
   ============================================================ */

export type QueueType =
  "KYC" | "Fraud" | "Duplicate" | "Self-Exclusion" | "Restriction";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type CaseStatus = "Pending" | "Under Review" | "Escalated" | "Resolved";

export type CompliancePermission =
  | "REQUEST_INFO"
  | "APPROVE_KYC"
  | "REJECT_KYC"
  | "RESTRICT_ACCOUNT"
  | "SUSPEND_ACCOUNT"
  | "ESCALATE_CASE";

export interface RelatedAccount {
  id: string;
  name: string;
  sharedPhone: boolean;
  sharedEmailDomain: boolean;
  sharedDevice: boolean;
  sharedPaymentMethod: boolean;
}

export interface RelatedTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  status: "Completed" | "Pending" | "Reversed" | "Flagged";
  riskIndicator: RiskLevel;
}

export interface EvidenceItem {
  id: string;
  kind:
    | "Document"
    | "ID Image"
    | "Transaction Screenshot"
    | "Device/Location"
    | "Note";
  label: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}

export interface Restriction {
  id: string;
  type:
    "Spending Limit" | "Trading Limit" | "Account Restriction" | "Suspension";
  appliedBy: string;
  appliedAt: string;
  active: boolean;
}

export interface SelfExclusionCase {
  requested: boolean;
  coolingOff: boolean;
  breachAttempts: number;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  registrationDate: string;
  verificationTier: "Unverified" | "Tier 1" | "Tier 2" | "Tier 3";
}

export interface ComplianceCase {
  id: string;
  queueType: QueueType;
  user: UserProfile;
  riskLevel: RiskLevel;
  riskScore: number;
  createdAt: string;
  assignedTo: string;
  status: CaseStatus;
  summary: string;
  relatedAccounts: RelatedAccount[];
  relatedTransactions: RelatedTransaction[];
  evidence: EvidenceItem[];
  auditHistory: AuditEvent[];
  restrictions: Restriction[];
  selfExclusion?: SelfExclusionCase;
}

/* Unsupported case mutations stay visible but disabled until matching endpoints exist. */
const currentUserPermissions: CompliancePermission[] = [];

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case "Low":
      return "badge badge-low";
    case "Medium":
      return "badge badge-medium";
    case "High":
      return "badge badge-high";
    case "Critical":
      return "badge badge-critical";
  }
}

function statusPillClass(status: CaseStatus): string {
  switch (status) {
    case "Pending":
      return "status-pill pending";
    case "Under Review":
      return "status-pill review";
    case "Escalated":
      return "status-pill escalated";
    case "Resolved":
      return "status-pill resolved";
  }
}

function hasPermission(
  perms: CompliancePermission[],
  required: CompliancePermission,
): boolean {
  return perms.includes(required);
}

let auditIdCounter = 0;
function nextAuditId(): string {
  auditIdCounter += 1;
  return `A-${Date.now()}-${auditIdCounter}`;
}

let restrictionIdCounter = 0;
function nextRestrictionId(): string {
  restrictionIdCounter += 1;
  return `R-${Date.now()}-${restrictionIdCounter}`;
}

const PermButton: React.FC<{
  label: string;
  permission: CompliancePermission;
  permissions: CompliancePermission[];
  variant?: "ghost" | "gradient" | "danger";
  onClick: () => void;
}> = ({ label, permission, permissions, variant = "ghost", onClick }) => {
  const allowed = hasPermission(permissions, permission);

  const cls =
    variant === "gradient"
      ? "btn btn-gradient btn-sm"
      : variant === "danger"
        ? "btn btn-danger btn-sm"
        : "btn btn-ghost btn-sm";

  return (
    <div className="perm-btn-wrap">
      <button
        className={cls}
        disabled={!allowed}
        aria-describedby={!allowed ? `${permission}-tooltip` : undefined}
        onClick={onClick}
      >
        {label}
      </button>

      {!allowed && (
        <span
          className="perm-tooltip"
          id={`${permission}-tooltip`}
          role="tooltip"
        >
          Insufficient permission
        </span>
      )}
    </div>
  );
};

/* ============================================================
   QUEUE SUMMARY CARDS
   ============================================================ */

interface QueueCardConfig {
  title: string;
  icon: string;
  color: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  actionLabel: string;
}

const ComplianceQueueCard: React.FC<{
  config: QueueCardConfig;
  onAction: () => void;
  disabled?: boolean;
}> = ({ config, onAction, disabled }) => (
  <div className="queue-card">
    <div className="queue-card__top">
      <div
        className="queue-card__icon"
        style={{ background: `${config.color}22`, color: config.color }}
      >
        {config.icon}
      </div>
      <p className="queue-card__title">{config.title}</p>
    </div>
    <div className="queue-card__metrics">
      <div className="queue-card__metric">
        <span className="queue-card__metric-value">{config.primaryValue}</span>
        <span className="queue-card__metric-label">{config.primaryLabel}</span>
      </div>
      <div className="queue-card__metric">
        <span className="queue-card__metric-value is-warning">
          {config.secondaryValue}
        </span>
        <span className="queue-card__metric-label">
          {config.secondaryLabel}
        </span>
      </div>
    </div>
    <button
      className="btn btn-gradient queue-card__action"
      onClick={onAction}
      disabled={disabled}
    >
      {config.actionLabel}
    </button>
  </div>
);

/* ============================================================
   RISK QUEUE TABLE (with filters, search, pagination)
   ============================================================ */

const PAGE_SIZE = 5;

const ComplianceRiskQueue: React.FC<{
  cases: ComplianceCase[];
  onSelect: (c: ComplianceCase) => void;
}> = ({ cases, onSelect }) => {
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<QueueType | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "All">("All");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "All">("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return cases
      .filter((c) =>
        queueFilter === "All" ? true : c.queueType === queueFilter,
      )
      .filter((c) => (riskFilter === "All" ? true : c.riskLevel === riskFilter))
      .filter((c) =>
        statusFilter === "All" ? true : c.status === statusFilter,
      )
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          c.id.toLowerCase().includes(q) ||
          c.user.fullName.toLowerCase().includes(q) ||
          c.user.email.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [cases, search, queueFilter, riskFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Keep the current page in range whenever the filtered set shrinks
  // (e.g. after a case is resolved or a filter narrows the results).
  const safePage = Math.min(page, totalPages);

  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    queueFilter !== "All" ||
    riskFilter !== "All" ||
    statusFilter !== "All";

  const resetFilters = () => {
    setSearch("");
    setQueueFilter("All");
    setRiskFilter("All");
    setStatusFilter("All");
    setPage(1);
  };

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>Risk Queue</h2>
          <p>All open compliance cases across every queue type</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search case ID, name, or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={queueFilter}
          onChange={(e) => {
            setQueueFilter(e.target.value as QueueType | "All");
            setPage(1);
          }}
        >
          <option value="All">All queue types</option>
          <option value="KYC">KYC</option>
          <option value="Fraud">Fraud</option>
          <option value="Duplicate">Duplicate</option>
          <option value="Self-Exclusion">Self-Exclusion</option>
          <option value="Restriction">Restriction</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value as RiskLevel | "All");
            setPage(1);
          }}
        >
          <option value="All">All risk levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CaseStatus | "All");
            setPage(1);
          }}
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Escalated">Escalated</option>
          <option value="Resolved">Resolved</option>
        </select>
        {hasActiveFilters && (
          <button className="btn btn-outline" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>

      <div className="table-scroll">
        <table className="risk-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Queue Type</th>
              <th>User</th>
              <th>Risk Level</th>
              <th>Created</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr
                key={c.id}
                tabIndex={0}
                role="button"
                aria-label={`Open case ${c.id} for ${c.user.fullName}`}
                onClick={() => onSelect(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(c);
                  }
                }}
              >
                <td>{c.id}</td>
                <td>{c.queueType}</td>
                <td>
                  <div className="cell-user__name">{c.user.fullName}</div>
                  <div className="cell-user__email">{c.user.email}</div>
                </td>
                <td>
                  <span className={riskBadgeClass(c.riskLevel)}>
                    {c.riskLevel}
                  </span>
                </td>
                <td>{formatDateTime(c.createdAt)}</td>
                <td>{c.assignedTo}</td>
                <td>
                  <span className={statusPillClass(c.status)}>{c.status}</span>
                </td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(c);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    padding: "24px 0",
                  }}
                >
                  No cases match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>
          Showing {pageItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
          cases
        </span>
        <div className="pagination__controls">
          <button
            className="btn btn-outline btn-sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <button
            className="btn btn-outline btn-sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   CONFIRMATION MODAL (two-step high-impact confirmation)
   ============================================================ */

interface PendingAction {
  label: string;
  confirmWord: string;
  impact: string;
  onConfirm: (reason: string) => void;
}

const ComplianceConfirmationModal: React.FC<{
  action: PendingAction;
  caseData: ComplianceCase;
  onClose: () => void;
}> = ({ action, caseData, onClose }) => {
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canConfirm =
    reason.trim().length > 0 &&
    checked &&
    confirmText.trim().toUpperCase() === action.confirmWord;

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__icon">⚠</div>
          <h3>{action.label}</h3>
        </div>

        <div className="kv-grid" style={{ marginTop: 14, marginBottom: 4 }}>
          <div className="kv-item">
            <span className="k">User</span>
            <span className="v">{caseData.user.fullName}</span>
          </div>
          <div className="kv-item">
            <span className="k">Account ID</span>
            <span className="v">{caseData.id}</span>
          </div>
          <div className="kv-item">
            <span className="k">Current Status</span>
            <span className="v">{caseData.status}</span>
          </div>
          <div className="kv-item">
            <span className="k">Risk Level</span>
            <span className="v">{caseData.riskLevel}</span>
          </div>
        </div>

        <p className="modal__impact">{action.impact}</p>

        <label className="field-label" htmlFor="reason">
          Reason (required)
        </label>
        <textarea
          id="reason"
          rows={3}
          placeholder="Explain why this action is being taken…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <label className="modal-checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I understand this action will immediately restrict the user from
          accessing platform services.
        </label>

        <label className="field-label" htmlFor="confirmText">
          Type {action.confirmWord} to continue
        </label>
        <input
          id="confirmText"
          type="text"
          placeholder={action.confirmWord}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />

        <div className="modal__footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            disabled={!canConfirm}
            onClick={() => {
              action.onConfirm(reason);
              onClose();
            }}
          >
            {action.label}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DECISION CONTROL PANEL
   ============================================================ */

const ComplianceDecisionPanel: React.FC<{
  permissions: CompliancePermission[];
  onLowImpact: (action: string, detail: string) => void;
  onMediumImpact: (action: string) => void;
  onRequestHighImpact: (action: PendingAction) => void;
  onAssignInvestigator: () => void;
}> = ({
  permissions,
  onLowImpact,
  onMediumImpact,
  onRequestHighImpact,
  onAssignInvestigator,
}) => {
  const [infoRequest, setInfoRequest] = useState("");
  const [internalNote, setInternalNote] = useState("");

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>Decision Controls</h2>
          <p>
            Actions are enabled based on your current compliance permissions
          </p>
        </div>
      </div>

      <div className="decision-groups">
        <div>
          <p className="decision-group__label">Low impact</p>

          <div className="low-impact-field">
            <input
              type="text"
              placeholder="What information do you need from the user?"
              value={infoRequest}
              onChange={(e) => setInfoRequest(e.target.value)}
            />
            <PermButton
              label="Request Information"
              permission="REQUEST_INFO"
              permissions={permissions}
              onClick={() => {
                if (!infoRequest.trim()) return;
                onLowImpact("Information requested", infoRequest.trim());
                setInfoRequest("");
              }}
            />
          </div>

          <div className="low-impact-field">
            <input
              type="text"
              placeholder="Add an internal note…"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
            <PermButton
              label="Add Internal Note"
              permission="REQUEST_INFO"
              permissions={permissions}
              onClick={() => {
                if (!internalNote.trim()) return;
                onLowImpact("Internal note added", internalNote.trim());
                setInternalNote("");
              }}
            />
          </div>

          <div className="decision-group__buttons">
            <PermButton
              label="Assign Investigator"
              permission="REQUEST_INFO"
              permissions={permissions}
              onClick={onAssignInvestigator}
            />
          </div>
        </div>

        <div>
          <p className="decision-group__label">Medium impact</p>
          <div className="decision-group__buttons">
            <PermButton
              label="Approve Verification"
              permission="APPROVE_KYC"
              permissions={permissions}
              variant="gradient"
              onClick={() => onMediumImpact("Approve Verification")}
            />

            <PermButton
              label="Reject Verification"
              permission="REJECT_KYC"
              permissions={permissions}
              onClick={() => onMediumImpact("Reject Verification")}
            />

            <PermButton
              label="Apply Participation Limit"
              permission="RESTRICT_ACCOUNT"
              permissions={permissions}
              onClick={() => onMediumImpact("Apply Participation Limit")}
            />
          </div>
        </div>

        <div>
          <p className="decision-group__label">
            High impact — requires strong confirmation
          </p>

          <div className="decision-group__buttons">
            <PermButton
              label="Restrict Account"
              permission="RESTRICT_ACCOUNT"
              permissions={permissions}
              variant="danger"
              onClick={() =>
                onRequestHighImpact({
                  label: "Restrict Account",
                  confirmWord: "RESTRICT",
                  impact:
                    "This will limit the user's ability to deposit, withdraw, or trade until the restriction is manually lifted.",
                  onConfirm: () => {},
                })
              }
            />

            <PermButton
              label="Suspend Account"
              permission="SUSPEND_ACCOUNT"
              permissions={permissions}
              variant="danger"
              onClick={() =>
                onRequestHighImpact({
                  label: "Suspend Account",
                  confirmWord: "SUSPEND",
                  impact:
                    "This will immediately suspend the user's access to all platform services pending investigation.",
                  onConfirm: () => {},
                })
              }
            />

            <PermButton
              label="Freeze Trading Activity"
              permission="RESTRICT_ACCOUNT"
              permissions={permissions}
              variant="danger"
              onClick={() =>
                onRequestHighImpact({
                  label: "Freeze Trading Activity",
                  confirmWord: "FREEZE",
                  impact:
                    "This will halt all trading activity on this account immediately, without affecting login access.",
                  onConfirm: () => {},
                })
              }
            />

            <PermButton
              label="Escalate to Senior Compliance"
              permission="ESCALATE_CASE"
              permissions={permissions}
              variant="danger"
              onClick={() =>
                onRequestHighImpact({
                  label: "Escalate to Senior Compliance",
                  confirmWord: "ESCALATE",
                  impact:
                    "This will route the case to senior compliance for final review and pause any pending automated actions.",
                  onConfirm: () => {},
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   CASE DETAIL DRAWER
   ============================================================ */

const RESTRICTION_TYPE_BY_LABEL: Record<string, Restriction["type"]> = {
  "Restrict Account": "Account Restriction",
  "Suspend Account": "Suspension",
  "Freeze Trading Activity": "Trading Limit",
  "Apply Participation Limit": "Spending Limit",
};

const ComplianceCaseDetail: React.FC<{
  caseData: ComplianceCase;
  permissions: CompliancePermission[];
  onClose: () => void;
  onMutate: (updated: ComplianceCase) => void;
}> = ({ caseData, permissions, onClose, onMutate }) => {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);
  const [assigneeName, setAssigneeName] = useState("");

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingAction) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pendingAction]);

  const appendAudit = (action: string, note?: string) => {
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      adminUser: "You",
      action,
      note,
    };
    onMutate({ ...caseData, auditHistory: [...caseData.auditHistory, event] });
  };

  // Applies the restriction to case state (not just the audit log) and,
  // for account-level actions, moves the case out of Pending so it's
  // clear the case is no longer awaiting a first decision.
  const applyRestriction = (action: PendingAction, reason: string) => {
    const restrictionType = RESTRICTION_TYPE_BY_LABEL[action.label];
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      adminUser: "You",
      action: action.label,
      note: reason,
    };

    let nextRestrictions = caseData.restrictions;
    if (restrictionType) {
      const restriction: Restriction = {
        id: nextRestrictionId(),
        type: restrictionType,
        appliedBy: "You",
        appliedAt: new Date().toISOString(),
        active: true,
      };
      nextRestrictions = [...caseData.restrictions, restriction];
    }

    const nextStatus: CaseStatus =
      action.label === "Escalate to Senior Compliance"
        ? "Escalated"
        : caseData.status;

    onMutate({
      ...caseData,
      restrictions: nextRestrictions,
      status: nextStatus,
      auditHistory: [...caseData.auditHistory, event],
    });
  };

  const liftRestriction = (restrictionId: string) => {
    const target = caseData.restrictions.find((r) => r.id === restrictionId);
    const nextRestrictions = caseData.restrictions.map((r) =>
      r.id === restrictionId ? { ...r, active: false } : r,
    );
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      adminUser: "You",
      action: "Restriction lifted",
      note: target ? `${target.type} lifted` : undefined,
    };
    onMutate({
      ...caseData,
      restrictions: nextRestrictions,
      auditHistory: [...caseData.auditHistory, event],
    });
  };

  const resolveCase = () => {
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      adminUser: "You",
      action: "Case resolved",
    };
    onMutate({
      ...caseData,
      status: "Resolved",
      auditHistory: [...caseData.auditHistory, event],
    });
  };

  const confirmAssignment = () => {
    if (!assigneeName.trim()) return;
    const event: AuditEvent = {
      id: nextAuditId(),
      timestamp: new Date().toISOString(),
      adminUser: "You",
      action: "Investigator assigned",
      note: `Assigned to ${assigneeName.trim()}`,
    };
    onMutate({
      ...caseData,
      assignedTo: assigneeName.trim(),
      auditHistory: [...caseData.auditHistory, event],
    });
    setAssigning(false);
    setAssigneeName("");
  };

  const activeRestrictions = caseData.restrictions.filter((r) => r.active);
  const inactiveRestrictions = caseData.restrictions.filter((r) => !r.active);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer__header">
          <div>
            <h2>{caseData.id}</h2>
            <span
              className={riskBadgeClass(caseData.riskLevel)}
              style={{ marginRight: 8 }}
            >
              {caseData.riskLevel}
            </span>
            <span className={statusPillClass(caseData.status)}>
              {caseData.status}
            </span>
          </div>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Close case detail"
          >
            ✕
          </button>
        </div>

        <div className="drawer__body">
          {/* Case Summary */}
          <div className="drawer-section">
            <h3>Case Summary</h3>
            <div className="kv-grid">
              <div className="kv-item">
                <span className="k">Queue Type</span>
                <span className="v">{caseData.queueType}</span>
              </div>
              <div className="kv-item">
                <span className="k">Risk Score</span>
                <span className="v">{caseData.riskScore}/100</span>
              </div>
              <div className="kv-item">
                <span className="k">Assigned Investigator</span>
                {assigning ? (
                  <div className="assignee-edit">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Investigator name"
                      value={assigneeName}
                      onChange={(e) => setAssigneeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmAssignment();
                        if (e.key === "Escape") setAssigning(false);
                      }}
                    />
                    <button
                      className="btn btn-gradient btn-sm"
                      onClick={confirmAssignment}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAssigning(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="v">{caseData.assignedTo}</span>
                )}
              </div>
              <div className="kv-item">
                <span className="k">Created</span>
                <span className="v">{formatDateTime(caseData.createdAt)}</span>
              </div>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                lineHeight: 1.55,
                marginTop: 12,
              }}
            >
              {caseData.summary}
            </p>
          </div>

          {/* User Profile */}
          <div className="drawer-section">
            <h3>User Profile</h3>
            <div className="kv-grid">
              <div className="kv-item">
                <span className="k">Full Name</span>
                <span className="v">{caseData.user.fullName}</span>
              </div>
              <div className="kv-item">
                <span className="k">Email</span>
                <span className="v">{caseData.user.email}</span>
              </div>
              <div className="kv-item">
                <span className="k">Phone</span>
                <span className="v">{caseData.user.phone}</span>
              </div>
              <div className="kv-item">
                <span className="k">Country</span>
                <span className="v">{caseData.user.country}</span>
              </div>
              <div className="kv-item">
                <span className="k">Registered</span>
                <span className="v">{caseData.user.registrationDate}</span>
              </div>
              <div className="kv-item">
                <span className="k">Verification Tier</span>
                <span className="v">{caseData.user.verificationTier}</span>
              </div>
            </div>
          </div>

          {/* Self-Exclusion status */}
          {caseData.selfExclusion && (
            <div className="drawer-section">
              <h3>Responsible Participation</h3>
              <div className="kv-grid">
                <div className="kv-item">
                  <span className="k">Self-Exclusion Requested</span>
                  <span className="v">
                    {caseData.selfExclusion.requested ? "Yes" : "No"}
                  </span>
                </div>
                <div className="kv-item">
                  <span className="k">Cooling-Off Period</span>
                  <span className="v">
                    {caseData.selfExclusion.coolingOff
                      ? "Active"
                      : "Not active"}
                  </span>
                </div>
                <div className="kv-item">
                  <span className="k">Breach Attempts</span>
                  <span className="v">
                    {caseData.selfExclusion.breachAttempts}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Restrictions */}
          <div className="drawer-section">
            <h3>Restrictions</h3>
            {activeRestrictions.length === 0 &&
              inactiveRestrictions.length === 0 && (
                <p className="empty-note">
                  No restrictions have been applied to this case.
                </p>
              )}
            {activeRestrictions.map((r) => (
              <div key={r.id} className="related-item">
                <div>
                  <div className="related-item__value">{r.type}</div>
                  <div className="related-item__label">
                    Applied by {r.appliedBy} · {formatDateTime(r.appliedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-high">Active</span>
                  <PermButton
                    label="Lift"
                    permission="RESTRICT_ACCOUNT"
                    permissions={permissions}
                    onClick={() => liftRestriction(r.id)}
                  />
                </div>
              </div>
            ))}
            {inactiveRestrictions.map((r) => (
              <div key={r.id} className="related-item" style={{ opacity: 0.6 }}>
                <div>
                  <div className="related-item__value">{r.type}</div>
                  <div className="related-item__label">
                    Applied by {r.appliedBy} · {formatDateTime(r.appliedAt)}
                  </div>
                </div>
                <span className="badge badge-low">Lifted</span>
              </div>
            ))}
          </div>

          {/* Related Accounts */}
          {caseData.relatedAccounts.length > 0 && (
            <div className="drawer-section">
              <h3>Related Accounts</h3>
              {caseData.relatedAccounts.map((ra) => (
                <div key={ra.id} className="related-item">
                  <div>
                    <div className="related-item__value">{ra.name}</div>
                    <div className="related-item__label">{ra.id}</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {ra.sharedPhone && (
                      <span className="badge badge-medium">Shared Phone</span>
                    )}
                    {ra.sharedEmailDomain && (
                      <span className="badge badge-medium">
                        Shared Email Domain
                      </span>
                    )}
                    {ra.sharedDevice && (
                      <span className="badge badge-high">Shared Device</span>
                    )}
                    {ra.sharedPaymentMethod && (
                      <span className="badge badge-high">Shared Payment</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Related Transactions */}
          {caseData.relatedTransactions.length > 0 && (
            <div className="drawer-section">
              <h3>Related Transactions</h3>
              {caseData.relatedTransactions.map((tx) => (
                <div key={tx.id} className="tx-row">
                  <div>
                    <div className="tx-row__id">{tx.id}</div>
                    <div className="tx-row__meta">
                      {tx.type} · {formatDateTime(tx.date)}
                    </div>
                  </div>
                  <div className="tx-row__meta">
                    {tx.currency} {tx.amount.toLocaleString()}
                  </div>
                  <div className="tx-row__meta">{tx.status}</div>
                  <span className={riskBadgeClass(tx.riskIndicator)}>
                    {tx.riskIndicator}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Evidence */}
          {caseData.evidence.length > 0 && (
            <div className="drawer-section">
              <h3>Evidence</h3>
              <div className="timeline">
                {caseData.evidence.map((ev) => (
                  <div className="timeline-item" key={ev.id}>
                    <div className="evidence-item">
                      <div className="evidence-item__icon">
                        {ev.kind === "ID Image"
                          ? "🪪"
                          : ev.kind === "Document"
                            ? "📄"
                            : ev.kind === "Transaction Screenshot"
                              ? "🖼"
                              : ev.kind === "Device/Location"
                                ? "📍"
                                : "📝"}
                      </div>
                      <div>
                        <p className="timeline-item__title">{ev.label}</p>
                        <p className="timeline-item__meta">
                          {ev.uploadedBy} · {formatDateTime(ev.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit History */}
          <div className="drawer-section">
            <h3>Audit History</h3>
            <div className="timeline">
              {caseData.auditHistory
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
                )
                .map((ev) => (
                  <div className="timeline-item" key={ev.id}>
                    <p className="timeline-item__title">{ev.action}</p>
                    <p className="timeline-item__meta">
                      {ev.adminUser} · {formatDateTime(ev.timestamp)}
                    </p>
                    {ev.note && (
                      <p className="timeline-item__note">{ev.note}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Decision Panel */}
          <ComplianceDecisionPanel
            permissions={permissions}
            onLowImpact={(action, detail) => appendAudit(action, detail)}
            onMediumImpact={(action) =>
              appendAudit(action, "Logged via medium-impact action")
            }
            onAssignInvestigator={() => {
              setAssigneeName(
                caseData.assignedTo === "Unassigned" ? "" : caseData.assignedTo,
              );
              setAssigning(true);
            }}
            onRequestHighImpact={(action) =>
              setPendingAction({
                ...action,
                onConfirm: (reason) => applyRestriction(action, reason),
              })
            }
          />
        </div>

        <div className="sticky-action-bar">
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            disabled={caseData.status === "Resolved"}
            onClick={resolveCase}
          >
            Resolve
          </button>
          <button
            className="btn btn-gradient"
            style={{ flex: 1 }}
            disabled={!hasPermission(permissions, "ESCALATE_CASE")}
            onClick={() =>
              setPendingAction({
                label: "Escalate to Senior Compliance",
                confirmWord: "ESCALATE",
                impact:
                  "This will route the case to senior compliance for final review.",
                onConfirm: (reason) =>
                  applyRestriction(
                    {
                      label: "Escalate to Senior Compliance",
                      confirmWord: "ESCALATE",
                      impact: "",
                      onConfirm: () => {},
                    },
                    reason,
                  ),
              })
            }
          >
            Escalate
          </button>
        </div>

        {/* Non-sticky resolve/escalate controls for desktop, mirrored above for mobile */}
        <div className="drawer-desktop-actions">
          <button
            className="btn btn-outline"
            disabled={caseData.status === "Resolved"}
            onClick={resolveCase}
          >
            Mark Case Resolved
          </button>
        </div>
      </div>

      {pendingAction && (
        <ComplianceConfirmationModal
          action={pendingAction}
          caseData={caseData}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */

const ComplianceAdmin: React.FC = () => {
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchKYCSessions(),
      fetchRiskProfiles(),
      fetchRiskAssessments(),
      fetchComplianceDecisions(),
    ])
      .then(([kycPage, profilePage, assessmentPage, decisionPage]) => {
        if (!active) return;
        const riskLevel = (score: number): RiskLevel =>
          score >= 90
            ? "Critical"
            : score >= 70
              ? "High"
              : score >= 40
                ? "Medium"
                : "Low";
        const status = (value: string): CaseStatus =>
          value === "COMPLETED" || value === "APPROVED"
            ? "Resolved"
            : value === "IN_REVIEW" || value === "PENDING_REVIEW"
              ? "Under Review"
              : value === "ESCALATED"
                ? "Escalated"
                : "Pending";
        const kycCases: ComplianceCase[] = kycPage.results.map((item) => ({
          id: item.id,
          queueType: "KYC",
          user: {
            fullName: `Participant ${item.participant_id.slice(0, 8)}…`,
            email: "Unavailable from compliance API",
            phone: "Unavailable",
            country: "Unavailable",
            registrationDate: item.initiated_at,
            verificationTier:
              item.verification_level === "NONE" ? "Unverified" : "Tier 1",
          },
          riskLevel: "Low",
          riskScore: 0,
          createdAt: item.initiated_at,
          assignedTo: "Unassigned",
          status: status(item.status),
          summary:
            item.failure_code || `KYC session via ${item.provider_code}.`,
          relatedAccounts: [],
          relatedTransactions: [],
          evidence: [],
          auditHistory: [],
          restrictions: [],
        }));
        const riskCases: ComplianceCase[] = profilePage.results.map((item) => {
          const latest = assessmentPage.results.find(
            (entry) => entry.participant_id === item.participant_id,
          );
          const proposal = decisionPage.results.find(
            (entry) => entry.participant_id === item.participant_id,
          );
          return {
            id: item.id,
            queueType: item.restriction_recommendation
              ? "Restriction"
              : "Fraud",
            user: {
              fullName: `Participant ${item.participant_id.slice(0, 8)}…`,
              email: "Unavailable from compliance API",
              phone: "Unavailable",
              country: "Unavailable",
              registrationDate: item.last_assessed_at,
              verificationTier: "Unverified",
            },
            riskLevel: riskLevel(item.current_score),
            riskScore: item.current_score,
            createdAt: latest?.created_at || item.last_assessed_at,
            assignedTo: "Unassigned",
            status: proposal ? status(proposal.status) : "Pending",
            summary:
              item.reason_codes.join(", ") || "No risk reason codes supplied.",
            relatedAccounts: [],
            relatedTransactions: [],
            evidence: [],
            auditHistory: [],
            restrictions: item.restriction_recommendation
              ? [
                  {
                    id: `risk-${item.id}`,
                    type: "Account Restriction",
                    appliedBy: "Risk service",
                    appliedAt: item.last_assessed_at,
                    active: true,
                  },
                ]
              : [],
          };
        });
        setCases([...kycCases, ...riskCases]);
      })
      .catch((error) => {
        if (active) setLoadError(extractApiError(error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const kycCases = cases.filter((c) => c.queueType === "KYC");
  const fraudCases = cases.filter((c) => c.queueType === "Fraud");
  const duplicateCases = cases.filter((c) => c.queueType === "Duplicate");
  const restrictionCases = cases.filter((c) =>
    c.restrictions.some((r) => r.active),
  );
  const selfExclusionCases = cases.filter(
    (c) => c.queueType === "Self-Exclusion",
  );
  const escalatedCases = cases.filter((c) => c.status === "Escalated");

  const queueCardConfigs: {
    config: QueueCardConfig;
    targetQueue: QueueType | "restriction" | "escalated";
  }[] = [
    {
      config: {
        title: "KYC Verification Queue",
        icon: "🪪",
        color: "#a855f7",
        primaryValue: kycCases.length,
        primaryLabel: "Pending reviews",
        secondaryValue: kycCases.filter(
          (c) => c.riskLevel === "High" || c.riskLevel === "Critical",
        ).length,
        secondaryLabel: "High-risk",
        actionLabel: "Review KYC",
      },
      targetQueue: "KYC",
    },
    {
      config: {
        title: "Unusual Transactions",
        icon: "📉",
        color: "#f97316",
        primaryValue: fraudCases.length,
        primaryLabel: "Suspicious transfers",
        secondaryValue: fraudCases.filter((c) =>
          c.relatedTransactions.some((t) => t.status === "Flagged"),
        ).length,
        secondaryLabel: "Flagged trading",
        actionLabel: "Investigate",
      },
      targetQueue: "Fraud",
    },
    {
      config: {
        title: "Duplicate Identity",
        icon: "🧬",
        color: "#2563eb",
        primaryValue: duplicateCases.length,
        primaryLabel: "Potential duplicates",
        secondaryValue: duplicateCases.reduce(
          (sum, c) =>
            sum + c.relatedAccounts.filter((a) => a.sharedDevice).length,
          0,
        ),
        secondaryLabel: "Shared device matches",
        actionLabel: "Review Matches",
      },
      targetQueue: "Duplicate",
    },
    {
      config: {
        title: "Restrictions & Limits",
        icon: "🚧",
        color: "#ef4444",
        primaryValue: restrictionCases.length,
        primaryLabel: "Active restrictions",
        secondaryValue: cases.filter((c) =>
          c.restrictions.some((r) => r.type === "Trading Limit" && r.active),
        ).length,
        secondaryLabel: "Trading limits",
        actionLabel: "Manage Restrictions",
      },
      targetQueue: "restriction",
    },
    {
      config: {
        title: "Responsible Participation",
        icon: "🛡",
        color: "#22c55e",
        primaryValue: selfExclusionCases.filter(
          (c) => c.selfExclusion?.requested,
        ).length,
        primaryLabel: "Self-exclusion requests",
        secondaryValue: selfExclusionCases.reduce(
          (sum, c) => sum + (c.selfExclusion?.breachAttempts ?? 0),
          0,
        ),
        secondaryLabel: "Breach attempts",
        actionLabel: "Review Cases",
      },
      targetQueue: "Self-Exclusion",
    },
    {
      config: {
        title: "Escalated Investigations",
        icon: "🚨",
        color: "#f5f7ff",
        primaryValue: escalatedCases.length,
        primaryLabel: "Escalated cases",
        secondaryValue: escalatedCases.filter((c) => c.riskLevel === "Critical")
          .length,
        secondaryLabel: "Critical severity",
        actionLabel: "Open Escalations",
      },
      targetQueue: "escalated",
    },
  ];

  const handleQueueCardAction = (
    targetQueue: QueueType | "restriction" | "escalated",
  ) => {
    let next: ComplianceCase | undefined;
    if (targetQueue === "restriction") {
      next = restrictionCases[0];
    } else if (targetQueue === "escalated") {
      next = escalatedCases[0];
    } else {
      next = cases.find((c) => c.queueType === targetQueue);
    }
    if (next) setSelectedCase(next);
  };

  const isQueueEmpty = (
    targetQueue: QueueType | "restriction" | "escalated",
  ): boolean => {
    if (targetQueue === "restriction") return restrictionCases.length === 0;
    if (targetQueue === "escalated") return escalatedCases.length === 0;
    return !cases.some((c) => c.queueType === targetQueue);
  };

  const handleMutateCase = (updated: ComplianceCase) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCase(updated);
  };

  return (
    <AdminLayout>
      <div className="compliance-root">
        <div className="compliance-content">
            <div className="compliance-header">
              <div>
                <p className="compliance-header__eyebrow">Welcome back</p>
                <h1>Compliance &amp; Trust Operations</h1>
                <p>
                  Central control for KYC reviews, fraud detection,
                  restrictions, responsible participation, and platform safety.
                </p>
              </div>
              <div className="compliance-header__actions">
                <span className="live-badge">
                  <span className="live-badge__dot" />
                  Live data
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(cases, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `compliance-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export Dashboard
                </button>
                <button
                  className="btn btn-gradient"
                  disabled
                  title="Compliance Settings coming soon"
                >
                  Compliance Settings
                </button>
              </div>
            </div>

            {loading && (
              <div className="empty-state" aria-busy="true">
                Loading compliance records…
              </div>
            )}
            {loadError && (
              <div className="empty-state" role="alert">
                {loadError}
              </div>
            )}
            <div className="queue-grid">
              {queueCardConfigs.map((item) => (
                <ComplianceQueueCard
                  key={item.config.title}
                  config={item.config}
                  disabled={isQueueEmpty(item.targetQueue)}
                  onAction={() => handleQueueCardAction(item.targetQueue)}
                />
              ))}
            </div>

            <ComplianceRiskQueue cases={cases} onSelect={setSelectedCase} />
        </div>

      {selectedCase && (
        <ComplianceCaseDetail
          caseData={selectedCase}
          permissions={currentUserPermissions}
          onClose={() => setSelectedCase(null)}
          onMutate={handleMutateCase}
        />
      )}
      </div>
    </AdminLayout>
  );
};

export default ComplianceAdmin;
