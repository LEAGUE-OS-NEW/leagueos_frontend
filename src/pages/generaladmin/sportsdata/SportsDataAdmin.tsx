import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiLink,
  FiSettings,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  approveIssue,
  fetchCompetitions,
  fetchProviderHealth,
  fetchSportsDataIssues,
  rejectIssue,
  requestMoreInfo,
  updateCompetition,
  type Competition,
  type IssueCategory,
  type IssueStatus,
  type ProviderHealth,
  type QueueType,
  type Severity,
  type SportsDataIssue,
} from '../../../services/sportsDataService';
import './SportsDataAdmin.css';

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

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function severityBadgeClass(severity: Severity): string {
  switch (severity) {
    case 'Low':
      return 'sda-badge sda-badge--low';
    case 'Medium':
      return 'sda-badge sda-badge--medium';
    case 'High':
      return 'sda-badge sda-badge--high';
    case 'Critical':
      return 'sda-badge sda-badge--critical';
  }
}

function statusPillClass(status: IssueStatus): string {
  switch (status) {
    case 'Pending':
      return 'sda-status-pill sda-status-pill--pending';
    case 'In Review':
      return 'sda-status-pill sda-status-pill--review';
    case 'Approved':
      return 'sda-status-pill sda-status-pill--approved';
    case 'Rejected':
      return 'sda-status-pill sda-status-pill--rejected';
  }
}

function providerStatusClass(status: ProviderHealth['status']): string {
  switch (status) {
    case 'Healthy':
      return 'sda-provider-status sda-provider-status--healthy';
    case 'Degraded':
      return 'sda-provider-status sda-provider-status--degraded';
    case 'Down':
      return 'sda-provider-status sda-provider-status--down';
  }
}

const QUEUE_TYPES: QueueType[] = ['Import', 'Mapping', 'Conflict', 'Club Submission', 'Correction'];
const CATEGORIES: IssueCategory[] = ['Competition', 'Provider Mapping', 'Fixture', 'Player', 'Statistic'];
const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: IssueStatus[] = ['Pending', 'In Review', 'Approved', 'Rejected'];

const QUEUE_ICON: Record<QueueType, IconType> = {
  Import: FiDownload,
  Mapping: FiLink,
  Conflict: FiAlertTriangle,
  'Club Submission': FiUpload,
  Correction: FiEdit3,
};

/* ============================================================
   QUEUE SUMMARY CARDS
   ============================================================ */

function QueueCard({
  queueType,
  issues,
  onAction,
}: {
  queueType: QueueType;
  issues: SportsDataIssue[];
  onAction: () => void;
}) {
  const inQueue = issues.filter((issue) => issue.queueType === queueType);
  const priority = inQueue.filter((issue) => issue.severity === 'High' || issue.severity === 'Critical');
  const Icon = QUEUE_ICON[queueType];

  return (
    <article className="sda-queue-card">
      <div className="sda-queue-card__top">
        <span className="sda-queue-card__icon">
          <Icon aria-hidden="true" />
        </span>
        <p className="sda-queue-card__title">{queueType}</p>
      </div>

      <div className="sda-queue-card__metrics">
        <div className="sda-queue-card__metric">
          <span className="sda-queue-card__metric-value">{inQueue.length}</span>
          <span className="sda-queue-card__metric-label">In queue</span>
        </div>
        <div className="sda-queue-card__metric">
          <span className="sda-queue-card__metric-value sda-queue-card__metric-value--warning">
            {priority.length}
          </span>
          <span className="sda-queue-card__metric-label">High priority</span>
        </div>
      </div>

      <button type="button" className="sda-btn sda-btn--gradient sda-queue-card__action" onClick={onAction}>
        Review Queue <FiArrowRight />
      </button>
    </article>
  );
}

/* ============================================================
   PROVIDER HEALTH
   ============================================================ */

function ProviderHealthPanel({ providers }: { providers: ProviderHealth[] }) {
  return (
    <div className="sda-panel">
      <div className="sda-panel__header">
        <div>
          <h2>Provider Health</h2>
          <p>Connection status and last synchronisation for every sports data feed</p>
        </div>
      </div>

      <div className="sda-provider-grid">
        {providers.map((provider) => (
          <article className="sda-provider-card" key={provider.id}>
            <div className="sda-provider-card__top">
              <span className="sda-provider-card__name">{provider.name}</span>
              <span className={providerStatusClass(provider.status)}>{provider.status}</span>
            </div>
            <div className="sda-provider-card__row">
              <span>Last sync</span>
              <b>{formatRelative(provider.lastSyncAt)}</b>
            </div>
            <div className="sda-provider-card__row">
              <span>Records synced</span>
              <b>{provider.recordsSynced.toLocaleString()}</b>
            </div>
            <div className="sda-provider-card__row">
              <span>Error rate</span>
              <b>{provider.errorRatePct === null ? 'N/A' : `${provider.errorRatePct}%`}</b>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ISSUE QUEUE TABLE
   ============================================================ */

const PAGE_SIZE = 5;

function IssueQueueTable({
  issues,
  queueFilter,
  onQueueFilterChange,
  onSelect,
}: {
  issues: SportsDataIssue[];
  queueFilter: QueueType | 'All';
  onQueueFilterChange: (value: QueueType | 'All') => void;
  onSelect: (issue: SportsDataIssue) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'All'>('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues
      .filter((issue) => (queueFilter === 'All' ? true : issue.queueType === queueFilter))
      .filter((issue) => (categoryFilter === 'All' ? true : issue.category === categoryFilter))
      .filter((issue) => (severityFilter === 'All' ? true : issue.severity === severityFilter))
      .filter((issue) => (statusFilter === 'All' ? true : issue.status === statusFilter))
      .filter((issue) => {
        if (!query) return true;
        return (
          issue.id.toLowerCase().includes(query) ||
          issue.title.toLowerCase().includes(query) ||
          issue.competition.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [issues, search, queueFilter, categoryFilter, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="sda-panel" id="sda-issue-queue">
      <div className="sda-panel__header">
        <div>
          <h2>Issue Queue</h2>
          <p>All open sports data issues across every queue type</p>
        </div>
      </div>

      <div className="sda-filters-row">
        <input
          type="text"
          placeholder="Search issue ID, title, or competition…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          value={queueFilter}
          onChange={(event) => {
            onQueueFilterChange(event.target.value as QueueType | 'All');
            setPage(1);
          }}
        >
          <option value="All">All queue types</option>
          {QUEUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value as IssueCategory | 'All');
            setPage(1);
          }}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(event) => {
            setSeverityFilter(event.target.value as Severity | 'All');
            setPage(1);
          }}
        >
          <option value="All">All severities</option>
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as IssueStatus | 'All');
            setPage(1);
          }}
        >
          <option value="All">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="sda-table-scroll">
        <table className="sda-table">
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Queue</th>
              <th>Category</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Provider</th>
              <th>Competition</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((issue) => (
              <tr key={issue.id} onClick={() => onSelect(issue)}>
                <td>{issue.id}</td>
                <td>{issue.queueType}</td>
                <td>{issue.category}</td>
                <td className="sda-table__title-cell">{issue.title}</td>
                <td>
                  <span className={severityBadgeClass(issue.severity)}>{issue.severity}</span>
                </td>
                <td>{issue.provider}</td>
                <td>{issue.competition}</td>
                <td>
                  <span className={statusPillClass(issue.status)}>{issue.status}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="sda-btn sda-btn--outline sda-btn--sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(issue);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="sda-table__empty">
                  No issues match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sda-pagination">
        <span>
          Showing {pageItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} issues
        </span>
        <div className="sda-pagination__controls">
          <button
            type="button"
            className="sda-btn sda-btn--outline sda-btn--sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="sda-btn sda-btn--outline sda-btn--sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPETITIONS PANEL
   ============================================================ */

function CompetitionsPanel({
  competitions,
  onConfigure,
}: {
  competitions: Competition[];
  onConfigure: (competition: Competition) => void;
}) {
  return (
    <div className="sda-panel" id="sda-competitions">
      <div className="sda-panel__header">
        <div>
          <h2>Competitions</h2>
          <p>Configure which provider feeds each competition and whether it's live</p>
        </div>
      </div>

      <div className="sda-table-scroll">
        <table className="sda-table">
          <thead>
            <tr>
              <th>Competition</th>
              <th>Sport</th>
              <th>Provider</th>
              <th>Mapping</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitions.map((competition) => (
              <tr key={competition.id}>
                <td className="sda-table__title-cell">{competition.name}</td>
                <td>{competition.sport}</td>
                <td>{competition.provider}</td>
                <td>
                  <span
                    className={`sda-mapping-pill sda-mapping-pill--${competition.mappingStatus.toLowerCase()}`}
                  >
                    {competition.mappingStatus}
                  </span>
                </td>
                <td>
                  <span className={`sda-mapping-pill ${competition.active ? 'sda-mapping-pill--mapped' : 'sda-mapping-pill--unmapped'}`}>
                    {competition.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="sda-btn sda-btn--outline sda-btn--sm"
                    onClick={() => onConfigure(competition)}
                  >
                    Configure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfigureCompetitionModal({
  competition,
  onClose,
  onSave,
}: {
  competition: Competition;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Competition, 'provider' | 'active' | 'mappingStatus'>>) => void;
}) {
  const [provider, setProvider] = useState(competition.provider);
  const [active, setActive] = useState(competition.active);
  const [mappingStatus, setMappingStatus] = useState(competition.mappingStatus);

  return (
    <div className="sda-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sda-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sda-modal__header">
          <span className="sda-modal__icon sda-modal__icon--neutral">
            <FiSettings aria-hidden="true" />
          </span>
          <h3>Configure {competition.name}</h3>
        </div>

        <label className="sda-field-label" htmlFor="sda-provider">
          Data provider
        </label>
        <select id="sda-provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="ISIN">ISIN</option>
          <option value="SportsRadar">SportsRadar</option>
          <option value="OptaStats">OptaStats</option>
        </select>

        <label className="sda-field-label" htmlFor="sda-mapping-status">
          Mapping status
        </label>
        <select
          id="sda-mapping-status"
          value={mappingStatus}
          onChange={(event) => setMappingStatus(event.target.value as Competition['mappingStatus'])}
        >
          <option value="Mapped">Mapped</option>
          <option value="Partial">Partial</option>
          <option value="Unmapped">Unmapped</option>
        </select>

        <label className="sda-modal-checkbox">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Competition is active and publishing to fans
        </label>

        <div className="sda-modal__footer">
          <button type="button" className="sda-btn sda-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sda-btn sda-btn--gradient"
            onClick={() => {
              onSave({ provider, active, mappingStatus });
              onClose();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM ACTION MODAL (Approve / Reject)
   ============================================================ */

interface PendingDecision {
  label: string;
  tone: 'positive' | 'negative';
  onConfirm: (note: string) => void;
}

function ConfirmDecisionModal({ decision, onClose }: { decision: PendingDecision; onClose: () => void }) {
  const [note, setNote] = useState('');

  return (
    <div className="sda-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sda-modal" onClick={(event) => event.stopPropagation()}>
        <div className="sda-modal__header">
          <span className={`sda-modal__icon sda-modal__icon--${decision.tone}`}>
            {decision.tone === 'positive' ? <FiCheckCircle aria-hidden="true" /> : <FiX aria-hidden="true" />}
          </span>
          <h3>{decision.label}</h3>
        </div>

        <label className="sda-field-label" htmlFor="sda-decision-note">
          Note (required)
        </label>
        <textarea
          id="sda-decision-note"
          rows={3}
          placeholder="Explain the decision for the audit history…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="sda-modal__footer">
          <button type="button" className="sda-btn sda-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`sda-btn ${decision.tone === 'positive' ? 'sda-btn--gradient' : 'sda-btn--danger'}`}
            disabled={note.trim().length === 0}
            onClick={() => {
              decision.onConfirm(note.trim());
              onClose();
            }}
          >
            {decision.label}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ISSUE DETAIL DRAWER
   ============================================================ */

function IssueDetailDrawer({
  issue,
  onClose,
  onApprove,
  onReject,
  onRequestInfo,
}: {
  issue: SportsDataIssue;
  onClose: () => void;
  onApprove: (issueId: string, note: string) => void;
  onReject: (issueId: string, note: string) => void;
  onRequestInfo: (issueId: string) => void;
}) {
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const isDecided = issue.status === 'Approved' || issue.status === 'Rejected';

  return (
    <div className="sda-drawer-overlay" onClick={onClose}>
      <div className="sda-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="sda-drawer__header">
          <div>
            <h2>{issue.id}</h2>
            <span className={severityBadgeClass(issue.severity)} style={{ marginRight: 8 }}>
              {issue.severity}
            </span>
            <span className={statusPillClass(issue.status)}>{issue.status}</span>
          </div>
          <button type="button" className="sda-drawer__close" onClick={onClose} aria-label="Close issue detail">
            <FiX />
          </button>
        </div>

        <div className="sda-drawer__body">
          <div className="sda-drawer-section">
            <h3>Issue Summary</h3>
            <div className="sda-kv-grid">
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Queue</span>
                <span className="sda-kv-item__value">{issue.queueType}</span>
              </div>
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Category</span>
                <span className="sda-kv-item__value">{issue.category}</span>
              </div>
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Provider</span>
                <span className="sda-kv-item__value">{issue.provider}</span>
              </div>
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Competition</span>
                <span className="sda-kv-item__value">{issue.competition}</span>
              </div>
              {issue.club && (
                <div className="sda-kv-item">
                  <span className="sda-kv-item__key">Club</span>
                  <span className="sda-kv-item__value">{issue.club}</span>
                </div>
              )}
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Submitted By</span>
                <span className="sda-kv-item__value">{issue.submittedBy}</span>
              </div>
              <div className="sda-kv-item">
                <span className="sda-kv-item__key">Created</span>
                <span className="sda-kv-item__value">{formatDateTime(issue.createdAt)}</span>
              </div>
            </div>
            <p className="sda-drawer-description">{issue.description}</p>
          </div>

          <div className="sda-drawer-section">
            <h3>Side-by-Side Comparison</h3>
            <div className="sda-compare-table">
              <div className="sda-compare-row sda-compare-row--labels">
                <span>Field</span>
                <span>Current</span>
                <span>Incoming</span>
              </div>
              {issue.comparisons.map((comparison) => (
                <div
                  className={`sda-compare-row${comparison.current !== comparison.incoming ? ' sda-compare-row--changed' : ''}`}
                  key={comparison.field}
                >
                  <span className="sda-compare-row__field">{comparison.field}</span>
                  <span>{comparison.current}</span>
                  <span>{comparison.incoming}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sda-drawer-section">
            <h3>Audit History</h3>
            <div className="sda-timeline">
              {issue.auditHistory
                .slice()
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((event) => (
                  <div className="sda-timeline-item" key={event.id}>
                    <p className="sda-timeline-item__title">{event.action}</p>
                    <p className="sda-timeline-item__meta">
                      {event.adminUser} &middot; {formatDateTime(event.timestamp)}
                    </p>
                    {event.note && <p className="sda-timeline-item__note">{event.note}</p>}
                  </div>
                ))}
            </div>
          </div>

          <div className="sda-drawer-section">
            <h3>Decision</h3>
            <div className="sda-decision-buttons">
              <button
                type="button"
                className="sda-btn sda-btn--ghost"
                disabled={isDecided}
                onClick={() => onRequestInfo(issue.id)}
              >
                Request More Info
              </button>
              <button
                type="button"
                className="sda-btn sda-btn--danger"
                disabled={isDecided}
                onClick={() =>
                  setPendingDecision({
                    label: 'Reject Issue',
                    tone: 'negative',
                    onConfirm: (note) => onReject(issue.id, note),
                  })
                }
              >
                Reject
              </button>
              <button
                type="button"
                className="sda-btn sda-btn--gradient"
                disabled={isDecided}
                onClick={() =>
                  setPendingDecision({
                    label: 'Approve Issue',
                    tone: 'positive',
                    onConfirm: (note) => onApprove(issue.id, note),
                  })
                }
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingDecision && (
        <ConfirmDecisionModal decision={pendingDecision} onClose={() => setPendingDecision(null)} />
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

function SportsDataAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [issues, setIssues] = useState<SportsDataIssue[]>([]);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [queueFilter, setQueueFilter] = useState<QueueType | 'All'>('All');
  const [selectedIssue, setSelectedIssue] = useState<SportsDataIssue | null>(null);
  const [configuringCompetition, setConfiguringCompetition] = useState<Competition | null>(null);

  // Pure fetch — no setState inside, so it's safe to call from an effect.
  // Callers apply setState in their own .then()/.catch() callbacks, which is
  // the pattern react-hooks/set-state-in-effect expects (state updates from
  // a callback reacting to an external result, not synchronously in the
  // effect body).
  const fetchAll = () =>
    Promise.all([fetchSportsDataIssues(), fetchProviderHealth(), fetchCompetitions()]);

  useEffect(() => {
    let cancelled = false;

    fetchAll()
      .then(([issuesResult, providersResult, competitionsResult]) => {
        if (cancelled) return;
        setIssues(issuesResult);
        setProviders(providersResult);
        setCompetitions(competitionsResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load sports data. Please try again.');
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

    fetchAll()
      .then(([issuesResult, providersResult, competitionsResult]) => {
        setIssues(issuesResult);
        setProviders(providersResult);
        setCompetitions(competitionsResult);
      })
      .catch(() => {
        setLoadError('Could not load sports data. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const scrollToIssueQueue = (queue: QueueType | 'All') => {
    setQueueFilter(queue);
    document.getElementById('sda-issue-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToCompetitions = () => {
    document.getElementById('sda-competitions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleApprove = async (issueId: string, note: string) => {
    const updated = await approveIssue(issueId, note);
    setIssues((current) => current.map((issue) => (issue.id === updated.id ? updated : issue)));
    setSelectedIssue(updated);
  };

  const handleReject = async (issueId: string, note: string) => {
    const updated = await rejectIssue(issueId, note);
    setIssues((current) => current.map((issue) => (issue.id === updated.id ? updated : issue)));
    setSelectedIssue(updated);
  };

  const handleRequestInfo = async (issueId: string) => {
    const updated = await requestMoreInfo(issueId, 'Requested additional information from the submitter');
    setIssues((current) => current.map((issue) => (issue.id === updated.id ? updated : issue)));
    setSelectedIssue(updated);
  };

  const handleConfigureCompetition = async (
    competitionId: string,
    patch: Partial<Pick<Competition, 'provider' | 'active' | 'mappingStatus'>>,
  ) => {
    const updated = await updateCompetition(competitionId, patch);
    setCompetitions((current) => current.map((competition) => (competition.id === updated.id ? updated : competition)));
  };

  return (
    <>
      <AdminLayout>
        <div className="sda-content">
            <div className="sda-header">
              <div>
                <p className="sda-header__eyebrow">Welcome back</p>
                <h1>Sports Data &amp; Statistics</h1>
                <p>
                  Configure competitions, resolve provider mapping, fixture, player and statistic issues, and
                  keep shared sports data reliable across every feed.
                </p>
              </div>
              <div className="sda-header__actions">
                <span className="sda-live-badge">
                  <span className="sda-live-badge__dot" />
                  Live data
                </span>
                <button type="button" className="sda-btn sda-btn--ghost">
                  Export Dashboard
                </button>
                <button type="button" className="sda-btn sda-btn--gradient" onClick={scrollToCompetitions}>
                  Configure Competitions
                </button>
              </div>
            </div>

            {loadError && (
              <div className="sda-error-banner">
                <FiAlertTriangle aria-hidden="true" />
                <span>{loadError}</span>
                <button type="button" className="sda-btn sda-btn--outline sda-btn--sm" onClick={handleRetry}>
                  Retry
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="sda-loading">
                <FiActivity aria-hidden="true" className="sda-loading__icon" />
                Loading sports data…
              </div>
            ) : (
              <>
                <div className="sda-queue-grid">
                  {QUEUE_TYPES.map((queueType) => (
                    <QueueCard
                      key={queueType}
                      queueType={queueType}
                      issues={issues}
                      onAction={() => scrollToIssueQueue(queueType)}
                    />
                  ))}
                </div>

                <ProviderHealthPanel providers={providers} />

                <IssueQueueTable
                  issues={issues}
                  queueFilter={queueFilter}
                  onQueueFilterChange={setQueueFilter}
                  onSelect={setSelectedIssue}
                />

                <CompetitionsPanel competitions={competitions} onConfigure={setConfiguringCompetition} />
              </>
            )}
        </div>
      </AdminLayout>

      {selectedIssue && (
        <IssueDetailDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestInfo={handleRequestInfo}
        />
      )}

      {configuringCompetition && (
        <ConfigureCompetitionModal
          competition={configuringCompetition}
          onClose={() => setConfiguringCompetition(null)}
          onSave={(patch) => handleConfigureCompetition(configuringCompetition.id, patch)}
        />
      )}
    </>
  );
}

export default SportsDataAdmin;
