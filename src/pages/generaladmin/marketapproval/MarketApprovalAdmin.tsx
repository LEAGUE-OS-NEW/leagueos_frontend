import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiShield,
  FiUser,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import Sidebar from '../../../components/generaladmin/Sidebar';
import Topbar from '../sections/Topbar';
import {
  approveMarket,
  fetchMarketsForApproval,
  rejectMarket,
  type ApprovalStatus,
  type MarketForApproval,
} from '../../../services/marketApprovalService';
import './MarketApprovalAdmin.css';

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorStatus(error: unknown): number | undefined {
  return error instanceof Error && 'status' in error
    ? (error as Error & { status?: number }).status
    : undefined;
}

const STATUS_TABS: ApprovalStatus[] = ['Awaiting Review', 'Approved', 'Rejected'];

function statusPillClass(status: ApprovalStatus): string {
  switch (status) {
    case 'Awaiting Review':
      return 'maa-status-pill maa-status-pill--awaiting';
    case 'Approved':
      return 'maa-status-pill maa-status-pill--approved';
    case 'Rejected':
      return 'maa-status-pill maa-status-pill--rejected';
  }
}

function isDecidable(status: ApprovalStatus): boolean {
  return status === 'Awaiting Review';
}

/* ============================================================
   SMALL PIECES
   ============================================================ */

function StatCard({ icon: Icon, value, label }: { icon: IconType; value: string | number; label: string }) {
  return (
    <div className="maa-stat-card">
      <span className="maa-stat-card__icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="maa-stat-card__value">{value}</p>
        <p className="maa-stat-card__label">{label}</p>
      </div>
    </div>
  );
}

type PendingDecision = {
  market: MarketForApproval;
  kind: 'Approve' | 'Reject';
};

function ConfirmDecisionModal({
  decision,
  onClose,
  onConfirm,
}: {
  decision: PendingDecision;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const isApprove = decision.kind === 'Approve';

  return (
    <div className="maa-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="maa-modal" onClick={(event) => event.stopPropagation()}>
        <div className="maa-modal__header">
          <span className={`maa-modal__icon ${isApprove ? 'maa-modal__icon--success' : 'maa-modal__icon--warning'}`}>
            {isApprove ? <FiCheckCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
          </span>
          <div>
            <h3>{decision.kind} this market?</h3>
            <p>{decision.market.eventLabel} — {decision.market.question}</p>
          </div>
        </div>

        <label className="maa-modal__field">
          Note <span aria-hidden="true">*</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={`Explain why this market is being ${isApprove ? 'approved' : 'rejected'}…`}
            rows={3}
          />
        </label>

        <div className="maa-modal__footer">
          <button type="button" className="maa-btn maa-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`maa-btn ${isApprove ? 'maa-btn--gradient' : 'maa-btn--danger'}`}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {decision.kind}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleConflictModal({ market, onClose }: { market: MarketForApproval; onClose: () => void }) {
  return (
    <div className="maa-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="maa-modal" onClick={(event) => event.stopPropagation()}>
        <div className="maa-modal__header">
          <span className="maa-modal__icon maa-modal__icon--blocked">
            <FiShield aria-hidden="true" />
          </span>
          <div>
            <h3>You can't review this market</h3>
            <p>
              {market.eventLabel} — {market.question}
            </p>
          </div>
        </div>

        <p className="maa-modal__body-text">
          You created this market as a Market Operations Admin. Approval must come from an independent reviewer to
          keep creation and approval separated. Ask another Market Approval Admin to review it.
        </p>

        <div className="maa-modal__footer">
          <button type="button" className="maa-btn maa-btn--gradient" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewDrawer({
  market,
  onClose,
  onApprove,
  onReject,
}: {
  market: MarketForApproval;
  onClose: () => void;
  onApprove: (market: MarketForApproval) => void;
  onReject: (market: MarketForApproval) => void;
}) {
  const decidable = isDecidable(market.status);

  return (
    <div className="maa-drawer-overlay" onClick={onClose}>
      <div className="maa-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="maa-drawer__header">
          <div>
            <span className={statusPillClass(market.status)}>{market.status}</span>
            <h2>{market.eventLabel}</h2>
            <p>{market.competition} · {market.sport}</p>
          </div>
          <button type="button" className="maa-drawer__close" onClick={onClose} aria-label="Close market review">
            <FiX />
          </button>
        </div>

        <div className="maa-drawer__body">
          <div className="maa-drawer-section">
            <h4>Question &amp; Outcomes</h4>
            <p className="maa-drawer-question">{market.question}</p>
            <div className="maa-outcome-chips">
              {market.outcomes.map((outcome) => (
                <span className="maa-outcome-chip" key={outcome}>
                  {outcome}
                </span>
              ))}
            </div>
          </div>

          <div className="maa-drawer-section">
            <h4>Official Source</h4>
            <p className="maa-drawer-description">{market.officialSource}</p>
          </div>

          <div className="maa-drawer-section">
            <h4>Resolution Rules</h4>
            <p className="maa-drawer-description">{market.resolutionRules}</p>
          </div>

          <div className="maa-drawer-section">
            <h4>Void Conditions</h4>
            <p className="maa-drawer-description">
              {market.voidConditions || 'Not specified.'}
            </p>
          </div>

          <div className="maa-drawer-section">
            <h4>Creator</h4>
            <p className="maa-drawer-description">
              <FiUser aria-hidden="true" /> {market.createdBy} — {market.createdByRole}
            </p>
            <p className="maa-drawer-description">
              <FiClock aria-hidden="true" /> Submitted {formatDateTime(market.submittedAt)}
            </p>
          </div>

          {market.decisionHistory.length > 0 && (
            <div className="maa-drawer-section">
              <h4>Decision History</h4>
              {market.decisionHistory.map((decision) => (
                <div className="maa-history-row" key={decision.id}>
                  <p>
                    <strong>{decision.action}</strong> by {decision.reviewer} · {formatDateTime(decision.timestamp)}
                  </p>
                  {decision.reason && <p className="maa-history-reason">{decision.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {decidable && (
          <div className="maa-drawer__footer">
            <div className="maa-drawer__actions">
              <button type="button" className="maa-btn maa-btn--danger" onClick={() => onReject(market)}>
                <FiXCircle /> Reject
              </button>
              <button type="button" className="maa-btn maa-btn--gradient" onClick={() => onApprove(market)}>
                <FiCheckCircle /> Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   QUEUE
   ============================================================ */

function ApprovalQueueTable({
  markets,
  onSelect,
}: {
  markets: MarketForApproval[];
  onSelect: (market: MarketForApproval) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const map = new Map<ApprovalStatus, number>();
    for (const market of markets) {
      map.set(market.status, (map.get(market.status) ?? 0) + 1);
    }
    return map;
  }, [markets]);

  const filtered = useMemo(() => {
    return markets.filter((market) => {
      if (statusFilter !== 'All' && market.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return (
        market.eventLabel.toLowerCase().includes(needle) ||
        market.question.toLowerCase().includes(needle) ||
        market.createdBy.toLowerCase().includes(needle)
      );
    });
  }, [markets, statusFilter, search]);

  return (
    <div className="maa-panel">
      <div className="maa-panel__heading">
        <h2>Approval Queue</h2>
        <label className="maa-search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder="Search event, question, or creator"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="maa-tabs" role="tablist">
        <button
          type="button"
          className={`maa-tab${statusFilter === 'All' ? ' is-active' : ''}`}
          onClick={() => setStatusFilter('All')}
        >
          All <span>{markets.length}</span>
        </button>
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            className={`maa-tab${statusFilter === status ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status} <span>{counts.get(status) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="maa-table">
        <div className="maa-table-row maa-table-row--head" aria-hidden="true">
          <span>Event</span>
          <span>Question</span>
          <span>Creator</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 && <p className="maa-empty">No markets match this filter.</p>}

        {filtered.map((market) => (
          <button type="button" className="maa-table-row" key={market.id} onClick={() => onSelect(market)}>
            <span>
              <strong>{market.eventLabel}</strong>
              <em>{market.competition}</em>
            </span>
            <span>{market.question}</span>
            <span>{market.createdBy}</span>
            <span>{formatDateTime(market.submittedAt)}</span>
            <span className={statusPillClass(market.status)}>{market.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

function MarketApprovalAdmin() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [markets, setMarkets] = useState<MarketForApproval[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketForApproval | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [blockedMarket, setBlockedMarket] = useState<MarketForApproval | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMarketsForApproval()
      .then((result) => {
        if (!cancelled) setMarkets(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the approval queue. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchMarketsForApproval()
      .then(setMarkets)
      .catch(() => setLoadError('Could not load the approval queue. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const applyUpdate = (updated: MarketForApproval) => {
    setMarkets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedMarket(updated);
  };

  const handleDecisionConfirm = async (reason: string) => {
    if (!pendingDecision) return;
    const { market, kind } = pendingDecision;

    try {
      const updated = kind === 'Approve' ? await approveMarket(market.id, reason) : await rejectMarket(market.id, reason);
      applyUpdate(updated);
      setPendingDecision(null);
    } catch (error) {
      // A 403 here means the backend's maker/checker rule rejected it —
      // the reviewer created this market themselves, so show the dedicated
      // conflict explanation instead of a generic error.
      if (kind === 'Approve' && getErrorStatus(error) === 403) {
        setPendingDecision(null);
        setBlockedMarket(market);
        return;
      }

      setLoadError(error instanceof Error ? error.message : `Could not ${kind.toLowerCase()} this market.`);
    }
  };

  const awaitingReviewCount = markets.filter((m) => m.status === 'Awaiting Review').length;
  const approvedCount = markets.filter((m) => m.status === 'Approved').length;
  const rejectedCount = markets.filter((m) => m.status === 'Rejected').length;

  return (
    <div className="maa-root">
      <div className="maa-shell">
        <aside className={`maa-sidebar${isSidebarOpen ? ' is-open' : ''}`}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </aside>

        {isSidebarOpen && <div className="maa-sidebar-scrim" onClick={() => setIsSidebarOpen(false)} />}

        <div className="maa-main">
          <header className="maa-topbar">
            <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          </header>

          <main className="maa-content">
            <div className="maa-header">
              <div>
                <p className="maa-header__eyebrow">Welcome back</p>
                <h1>Market Approval</h1>
                <p>
                  Independently review clarity, integrity, and resolution rules so only suitable markets are
                  published. Creation and approval stay separated — you can't approve a market you created.
                </p>
              </div>
            </div>

            {loadError && (
              <div className="maa-error-banner">
                <FiAlertTriangle aria-hidden="true" />
                <span>{loadError}</span>
                <button type="button" className="maa-btn maa-btn--outline maa-btn--sm" onClick={handleRetry}>
                  Retry
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="maa-loading">
                <FiActivity aria-hidden="true" className="maa-loading__icon" />
                Loading the approval queue…
              </div>
            ) : (
              <>
                <div className="maa-stat-grid">
                  <StatCard icon={FiClock} value={awaitingReviewCount} label="Awaiting review" />
                  <StatCard icon={FiCheckCircle} value={approvedCount} label="Approved" />
                  <StatCard icon={FiXCircle} value={rejectedCount} label="Rejected" />
                  <StatCard icon={FiActivity} value={markets.length} label="Total markets" />
                </div>

                <ApprovalQueueTable markets={markets} onSelect={setSelectedMarket} />
              </>
            )}
          </main>
        </div>
      </div>

      {selectedMarket && (
        <ReviewDrawer
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onApprove={(market) => setPendingDecision({ market, kind: 'Approve' })}
          onReject={(market) => setPendingDecision({ market, kind: 'Reject' })}
        />
      )}

      {pendingDecision && (
        <ConfirmDecisionModal
          decision={pendingDecision}
          onClose={() => setPendingDecision(null)}
          onConfirm={handleDecisionConfirm}
        />
      )}

      {blockedMarket && <RoleConflictModal market={blockedMarket} onClose={() => setBlockedMarket(null)} />}
    </div>
  );
}

export default MarketApprovalAdmin;
