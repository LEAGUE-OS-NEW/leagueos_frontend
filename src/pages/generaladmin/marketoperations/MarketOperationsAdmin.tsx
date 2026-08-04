import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiFileText,
  FiPlus,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Sidebar from '../../../components/generaladmin/Sidebar';
import Topbar from '../sections/Topbar';
import {
  convertProposalToDraft,
  createDraft,
  fetchDrafts,
  fetchProposals,
  fetchVerifiedEvents,
  rejectProposal,
  requestProposalInfo,
  returnProposal,
  submitForApproval,
  type DraftStatus,
  type MarketDraft,
  type MarketProposal,
  type ProposalStatus,
  type VerificationStatus,
  type VerifiedEvent,
} from '../../../services/marketOperationsService';
import './MarketOperationsAdmin.css';

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

function verificationBadgeClass(status: VerificationStatus): string {
  switch (status) {
    case 'Verified':
      return 'moa-verify-badge moa-verify-badge--verified';
    case 'Pending':
      return 'moa-verify-badge moa-verify-badge--pending';
    case 'Unverified':
      return 'moa-verify-badge moa-verify-badge--unverified';
  }
}

function draftStatusPillClass(status: DraftStatus): string {
  switch (status) {
    case 'Draft':
      return 'moa-status-pill moa-status-pill--draft';
    case 'Ready for Approval':
      return 'moa-status-pill moa-status-pill--ready';
    case 'Submitted':
      return 'moa-status-pill moa-status-pill--submitted';
  }
}

function proposalStatusPillClass(status: ProposalStatus): string {
  switch (status) {
    case 'New':
      return 'moa-status-pill moa-status-pill--new';
    case 'Under Review':
      return 'moa-status-pill moa-status-pill--review';
    case 'Returned':
      return 'moa-status-pill moa-status-pill--returned';
    case 'Converted':
      return 'moa-status-pill moa-status-pill--converted';
    case 'Rejected':
      return 'moa-status-pill moa-status-pill--rejected';
  }
}

function separationStatus(draft: MarketDraft): { text: string; tone: 'pending' | 'waiting' | 'submitted' } {
  if (draft.status === 'Draft') {
    return { text: 'Draft — not yet submitted', tone: 'pending' };
  }
  if (draft.status === 'Ready for Approval') {
    return { text: 'Awaiting independent approval', tone: 'waiting' };
  }
  return { text: 'Submitted for settlement', tone: 'submitted' };
}

const PROPOSAL_STATUSES: ProposalStatus[] = ['New', 'Under Review', 'Returned', 'Converted', 'Rejected'];
const KNOWN_SOURCES = ['ISIN official match feed', 'SportsRadar official match feed', 'OptaStats official match feed'];
const WIZARD_STEP_LABELS = [
  'Event',
  'Question',
  'Outcomes',
  'Rules',
  'Source',
  'Timing',
  'Void Conditions',
  'Review',
  'Submit',
];

/* ============================================================
   STAT CARD
   ============================================================ */

function StatCard({ icon: Icon, value, label }: { icon: IconType; value: string | number; label: string }) {
  return (
    <article className="moa-stat-card">
      <span className="moa-stat-card__icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="moa-stat-card__value">{value}</p>
        <p className="moa-stat-card__label">{label}</p>
      </div>
    </article>
  );
}

/* ============================================================
   PROPOSALS PANEL
   ============================================================ */

function ProposalsPanel({
  proposals,
  drafts,
  statusFilter,
  onStatusFilterChange,
  onSelect,
}: {
  proposals: MarketProposal[];
  drafts: MarketDraft[];
  statusFilter: ProposalStatus | 'All';
  onStatusFilterChange: (value: ProposalStatus | 'All') => void;
  onSelect: (proposal: MarketProposal) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return proposals
      .filter((proposal) => (statusFilter === 'All' ? true : proposal.status === statusFilter))
      .filter((proposal) => {
        if (!query) return true;
        return (
          proposal.id.toLowerCase().includes(query) ||
          proposal.eventLabel.toLowerCase().includes(query) ||
          proposal.suggestedQuestion.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, search, statusFilter]);

  return (
    <div className="moa-panel" id="moa-proposals">
      <div className="moa-panel__header">
        <div>
          <h2>Proposals Queue</h2>
          <p>User- and club-submitted market ideas awaiting review</p>
        </div>
      </div>

      <div className="moa-filters-row">
        <input
          type="text"
          placeholder="Search proposal ID, event, or question…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as ProposalStatus | 'All')}
        >
          <option value="All">All statuses</option>
          {PROPOSAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="moa-table-scroll">
        <table className="moa-table">
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Event</th>
              <th>Suggested Question</th>
              <th>Submitted By</th>
              <th>Duplicate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((proposal) => {
              const duplicate = proposal.duplicateOfDraftId
                ? drafts.find((draft) => draft.id === proposal.duplicateOfDraftId)
                : undefined;

              return (
                <tr key={proposal.id} onClick={() => onSelect(proposal)}>
                  <td>{proposal.id}</td>
                  <td className="moa-table__title-cell">{proposal.eventLabel}</td>
                  <td className="moa-table__title-cell">{proposal.suggestedQuestion}</td>
                  <td>{proposal.submittedBy}</td>
                  <td>
                    {duplicate ? (
                      <span className="moa-duplicate-flag" title={`Matches ${duplicate.id}`}>
                        <FiCopy aria-hidden="true" /> {duplicate.id}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={proposalStatusPillClass(proposal.status)}>{proposal.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="moa-btn moa-btn--outline moa-btn--sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(proposal);
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="moa-table__empty">
                  No proposals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   DRAFTS PANEL
   ============================================================ */

function DraftsPanel({
  drafts,
  onSubmitForApproval,
}: {
  drafts: MarketDraft[];
  onSubmitForApproval: (draftId: string) => void;
}) {
  const sorted = useMemo(
    () => [...drafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [drafts],
  );

  return (
    <div className="moa-panel" id="moa-drafts">
      <div className="moa-panel__header">
        <div>
          <h2>Market Drafts</h2>
          <p>Drafts created from verified events, pending independent approval</p>
        </div>
      </div>

      <div className="moa-table-scroll">
        <table className="moa-table">
          <thead>
            <tr>
              <th>Draft</th>
              <th>Event</th>
              <th>Question</th>
              <th>Status</th>
              <th>Separation of Duties</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((draft) => {
              const separation = separationStatus(draft);
              return (
                <tr key={draft.id}>
                  <td>{draft.id}</td>
                  <td className="moa-table__title-cell">
                    {draft.eventLabel}
                    {draft.duplicateOfDraftId && (
                      <span className="moa-duplicate-flag" title={`Duplicate of ${draft.duplicateOfDraftId}`}>
                        <FiCopy aria-hidden="true" /> Duplicate
                      </span>
                    )}
                  </td>
                  <td className="moa-table__title-cell">{draft.question}</td>
                  <td>
                    <span className={draftStatusPillClass(draft.status)}>{draft.status}</span>
                  </td>
                  <td>
                    <span className={`moa-separation-badge moa-separation-badge--${separation.tone}`}>
                      {separation.text}
                    </span>
                    <span className="moa-separation-badge__creator">by {draft.createdBy}</span>
                  </td>
                  <td>
                    {draft.status === 'Draft' ? (
                      <button
                        type="button"
                        className="moa-btn moa-btn--outline moa-btn--sm"
                        onClick={() => onSubmitForApproval(draft.id)}
                      >
                        Submit for Approval
                      </button>
                    ) : (
                      <span className="moa-table__muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="moa-table__empty">
                  No drafts yet — create a market from a verified event.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM MODAL (Return / Reject / Request Info)
   ============================================================ */

interface PendingProposalDecision {
  title: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: (note: string) => void;
}

function MoaConfirmModal({ decision, onClose }: { decision: PendingProposalDecision; onClose: () => void }) {
  const [note, setNote] = useState('');

  return (
    <div className="moa-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="moa-modal" onClick={(event) => event.stopPropagation()}>
        <div className="moa-modal__header">
          <span className="moa-modal__icon moa-modal__icon--neutral">
            <FiAlertTriangle aria-hidden="true" />
          </span>
          <h3>{decision.title}</h3>
        </div>

        <label className="moa-field-label" htmlFor="moa-decision-note">
          Note (required)
        </label>
        <textarea
          id="moa-decision-note"
          rows={3}
          placeholder="Explain the decision for the audit history…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="moa-modal__footer">
          <button type="button" className="moa-btn moa-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`moa-btn ${decision.confirmClassName}`}
            disabled={note.trim().length === 0}
            onClick={() => {
              decision.onConfirm(note.trim());
              onClose();
            }}
          >
            {decision.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROPOSAL DETAIL DRAWER
   ============================================================ */

function ProposalDetailDrawer({
  proposal,
  event,
  duplicateDraft,
  onClose,
  onConvert,
  onReturn,
  onReject,
  onRequestInfo,
}: {
  proposal: MarketProposal;
  event?: VerifiedEvent;
  duplicateDraft?: MarketDraft;
  onClose: () => void;
  onConvert: (proposal: MarketProposal) => void;
  onReturn: (proposalId: string, note: string) => void;
  onReject: (proposalId: string, note: string) => void;
  onRequestInfo: (proposalId: string, note: string) => void;
}) {
  const [pendingDecision, setPendingDecision] = useState<PendingProposalDecision | null>(null);
  const isDecided = proposal.status === 'Converted' || proposal.status === 'Rejected';

  return (
    <div className="moa-drawer-overlay" onClick={onClose}>
      <div className="moa-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="moa-drawer__header">
          <div>
            <h2>{proposal.id}</h2>
            <span className={proposalStatusPillClass(proposal.status)}>{proposal.status}</span>
          </div>
          <button type="button" className="moa-drawer__close" onClick={onClose} aria-label="Close proposal detail">
            <FiX />
          </button>
        </div>

        <div className="moa-drawer__body">
          {event && event.verificationStatus !== 'Verified' && (
            <div className="moa-warning-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>
                This proposal&apos;s event is still <b>{event.verificationStatus}</b> verification. Review the
                source before converting it into a real-money market.
              </span>
            </div>
          )}

          <div className="moa-drawer-section">
            <h3>Proposal Summary</h3>
            <div className="moa-kv-grid">
              <div className="moa-kv-item">
                <span className="moa-kv-item__key">Event</span>
                <span className="moa-kv-item__value">{proposal.eventLabel}</span>
              </div>
              <div className="moa-kv-item">
                <span className="moa-kv-item__key">Submitted By</span>
                <span className="moa-kv-item__value">{proposal.submittedBy}</span>
              </div>
              <div className="moa-kv-item">
                <span className="moa-kv-item__key">Submitted</span>
                <span className="moa-kv-item__value">{formatDateTime(proposal.createdAt)}</span>
              </div>
              {event && (
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Source</span>
                  <span className="moa-kv-item__value">{event.provider}</span>
                </div>
              )}
            </div>
          </div>

          <div className="moa-drawer-section">
            <h3>Suggested Market</h3>
            <p className="moa-drawer-description">
              <b>Question:</b> {proposal.suggestedQuestion}
            </p>
            <p className="moa-drawer-description">
              <b>Rules:</b> {proposal.suggestedRules || 'Not provided by the submitter.'}
            </p>
          </div>

          <div className="moa-drawer-section">
            <h3>Duplicate Check</h3>
            {duplicateDraft ? (
              <div className="moa-warning-banner">
                <FiCopy aria-hidden="true" />
                <span>
                  Matches existing draft <b>{duplicateDraft.id}</b> — &quot;{duplicateDraft.question}&quot; (
                  {duplicateDraft.status}).
                </span>
              </div>
            ) : (
              <p className="moa-drawer-description">No existing draft found for this event.</p>
            )}
          </div>

          <div className="moa-drawer-section">
            <h3>Review History</h3>
            <div className="moa-timeline">
              {proposal.auditHistory
                .slice()
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((auditEvent) => (
                  <div className="moa-timeline-item" key={auditEvent.id}>
                    <p className="moa-timeline-item__title">{auditEvent.action}</p>
                    <p className="moa-timeline-item__meta">
                      {auditEvent.adminUser} &middot; {formatDateTime(auditEvent.timestamp)}
                    </p>
                    {auditEvent.note && <p className="moa-timeline-item__note">{auditEvent.note}</p>}
                  </div>
                ))}
            </div>
          </div>

          <div className="moa-drawer-section">
            <h3>Decision</h3>
            <div className="moa-decision-buttons">
              <button
                type="button"
                className="moa-btn moa-btn--ghost"
                disabled={isDecided}
                onClick={() =>
                  setPendingDecision({
                    title: 'Request More Information',
                    confirmLabel: 'Request Info',
                    confirmClassName: 'moa-btn--gradient',
                    onConfirm: (note) => onRequestInfo(proposal.id, note),
                  })
                }
              >
                Request More Info
              </button>
              <button
                type="button"
                className="moa-btn moa-btn--warning"
                disabled={isDecided}
                onClick={() =>
                  setPendingDecision({
                    title: 'Return for Changes',
                    confirmLabel: 'Return',
                    confirmClassName: 'moa-btn--warning',
                    onConfirm: (note) => onReturn(proposal.id, note),
                  })
                }
              >
                Return for Changes
              </button>
              <button
                type="button"
                className="moa-btn moa-btn--danger"
                disabled={isDecided}
                onClick={() =>
                  setPendingDecision({
                    title: 'Reject Proposal',
                    confirmLabel: 'Reject',
                    confirmClassName: 'moa-btn--danger',
                    onConfirm: (note) => onReject(proposal.id, note),
                  })
                }
              >
                Reject
              </button>
              <button
                type="button"
                className="moa-btn moa-btn--gradient"
                disabled={isDecided}
                onClick={() => onConvert(proposal)}
              >
                Convert to Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingDecision && <MoaConfirmModal decision={pendingDecision} onClose={() => setPendingDecision(null)} />}
    </div>
  );
}

/* ============================================================
   MARKET DRAFT EDITOR (MO-03 — 9-step wizard)
   ============================================================ */

interface EditorSeed {
  eventId?: string;
  question?: string;
  resolutionRules?: string;
  startStep?: number;
  sourceProposalId?: string;
}

interface DraftFormState {
  eventId: string;
  question: string;
  resolutionRules: string;
  officialSource: string;
  opensAt: string;
  closesAt: string;
  voidConditions: string;
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isStepValid(step: number, form: DraftFormState): boolean {
  switch (step) {
    case 0:
      return form.eventId.length > 0;
    case 1:
      return form.question.trim().length > 6 && form.question.trim().endsWith('?');
    case 3:
      return form.resolutionRules.trim().length > 0;
    case 4:
      return form.officialSource.trim().length > 0;
    case 5:
      return (
        form.opensAt.length > 0 &&
        form.closesAt.length > 0 &&
        new Date(form.closesAt).getTime() > new Date(form.opensAt).getTime()
      );
    case 6:
      return form.voidConditions.trim().length > 0;
    default:
      return true;
  }
}

function MarketDraftEditor({
  events,
  drafts,
  seed,
  onClose,
  onSubmitted,
}: {
  events: VerifiedEvent[];
  drafts: MarketDraft[];
  seed: EditorSeed | null;
  onClose: () => void;
  onSubmitted: (draft: MarketDraft) => void;
}) {
  const [step, setStep] = useState(seed?.startStep ?? 0);
  const [form, setForm] = useState<DraftFormState>({
    eventId: seed?.eventId ?? '',
    question: seed?.question ?? '',
    resolutionRules: seed?.resolutionRules ?? '',
    officialSource: '',
    opensAt: toLocalInputValue(new Date()),
    closesAt: '',
    voidConditions: '',
  });
  const [dismissedDuplicateWarning, setDismissedDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedDraft, setSubmittedDraft] = useState<MarketDraft | null>(null);

  const selectedEvent = events.find((item) => item.id === form.eventId);
  const duplicateDraft = form.eventId ? drafts.find((draft) => draft.eventId === form.eventId) : undefined;
  const canGoNext = isStepValid(step, form);

  const handleSelectEvent = (event: VerifiedEvent) => {
    setForm((current) => ({
      ...current,
      eventId: event.id,
      officialSource: current.officialSource || `${event.provider} official match feed`,
    }));
    setDismissedDuplicateWarning(false);
  };

  const handleSubmit = async () => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createDraft({
        eventId: selectedEvent.id,
        eventLabel: `${selectedEvent.teamA} vs ${selectedEvent.teamB}`,
        question: form.question.trim(),
        resolutionRules: form.resolutionRules.trim(),
        officialSource: form.officialSource.trim(),
        opensAt: new Date(form.opensAt).toISOString(),
        closesAt: new Date(form.closesAt).toISOString(),
        voidConditions: form.voidConditions.trim(),
      });
      const submitted = await submitForApproval(created.id);
      setSubmittedDraft(submitted);
      onSubmitted(submitted);
      setStep(8);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit this draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="moa-editor">
      <div className="moa-editor__head">
        <div>
          <p className="moa-header__eyebrow">Market Draft Editor</p>
          <h1>{selectedEvent ? `${selectedEvent.teamA} vs ${selectedEvent.teamB}` : 'Create a Market'}</h1>
        </div>
        {step < 8 && (
          <button type="button" className="moa-btn moa-btn--ghost" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>

      <div className="moa-stepper">
        {WIZARD_STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className={`moa-stepper__step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
          >
            <span className="moa-stepper__circle">
              {index < step ? <FiCheckCircle aria-hidden="true" /> : index + 1}
            </span>
            <span className="moa-stepper__label">{label}</span>
          </div>
        ))}
      </div>

      <div className="moa-editor__body">
        <div className="moa-editor__form">
          {step < 8 && selectedEvent && selectedEvent.verificationStatus !== 'Verified' && (
            <div className="moa-warning-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>
                This event is still <b>{selectedEvent.verificationStatus}</b> verification. Only fully verified
                fixtures should be used for real-money markets — proceed with caution.
              </span>
            </div>
          )}

          {step < 8 && duplicateDraft && !dismissedDuplicateWarning && (
            <div className="moa-warning-banner">
              <FiCopy aria-hidden="true" />
              <span>
                A draft already exists for this event: <b>{duplicateDraft.id}</b> — &quot;{duplicateDraft.question}
                &quot; ({duplicateDraft.status}).
              </span>
              <button
                type="button"
                className="moa-warning-banner__dismiss"
                aria-label="Dismiss duplicate warning"
                onClick={() => setDismissedDuplicateWarning(true)}
              >
                <FiX />
              </button>
            </div>
          )}

          {step === 0 && (
            <div className="moa-step">
              <h3>Select a Verified Event</h3>
              <p className="moa-step__hint">Choose the fixture this market will be based on.</p>
              <div className="moa-event-list">
                {events.map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    className={`moa-event-card${form.eventId === event.id ? ' is-selected' : ''}`}
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="moa-event-card__top">
                      <span className="moa-event-card__teams">
                        {event.teamA} vs {event.teamB}
                      </span>
                      <span className={verificationBadgeClass(event.verificationStatus)}>
                        {event.verificationStatus !== 'Verified' && <FiAlertTriangle aria-hidden="true" />}
                        {event.verificationStatus}
                      </span>
                    </div>
                    <p className="moa-event-card__meta">
                      {event.sport} &middot; {event.competition} &middot; {event.venue}
                    </p>
                    <p className="moa-event-card__meta">
                      {formatDateTime(event.kickoff)} &middot; Source: {event.provider}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="moa-step">
              <h3>Write the Market Question</h3>
              <p className="moa-step__hint">A single, unambiguous YES/NO question fans can settle on.</p>
              <label className="moa-field-label" htmlFor="moa-question">
                Question
              </label>
              <input
                id="moa-question"
                type="text"
                placeholder="Will Vipers SC beat Express FC?"
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
              />
              {form.question.trim().length > 0 && !form.question.trim().endsWith('?') && (
                <p className="moa-field-error">The question must end with a question mark.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="moa-step">
              <h3>Confirm Outcomes</h3>
              <p className="moa-step__hint">
                Every League OS market resolves to exactly one of two fixed outcomes — this keeps settlement fast
                and unambiguous for fans. Custom outcome labels aren&apos;t supported.
              </p>
              <div className="moa-outcomes-confirm">
                <span className="moa-outcome-card moa-outcome-card--yes">YES</span>
                <span className="moa-outcome-card moa-outcome-card--no">NO</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="moa-step">
              <h3>Define Resolution Rules</h3>
              <p className="moa-step__hint">Explain exactly how YES and NO will be determined.</p>
              <label className="moa-field-label" htmlFor="moa-rules">
                Resolution rules
              </label>
              <textarea
                id="moa-rules"
                rows={4}
                placeholder="Resolves YES if…"
                value={form.resolutionRules}
                onChange={(event) => setForm((current) => ({ ...current, resolutionRules: event.target.value }))}
              />
            </div>
          )}

          {step === 4 && (
            <div className="moa-step">
              <h3>Select the Official Source</h3>
              <p className="moa-step__hint">Where the result will be verified from.</p>
              <label className="moa-field-label" htmlFor="moa-source">
                Official source
              </label>
              <input
                id="moa-source"
                type="text"
                list="moa-source-options"
                placeholder="e.g. ISIN official match feed"
                value={form.officialSource}
                onChange={(event) => setForm((current) => ({ ...current, officialSource: event.target.value }))}
              />
              <datalist id="moa-source-options">
                {KNOWN_SOURCES.map((source) => (
                  <option value={source} key={source} />
                ))}
              </datalist>
            </div>
          )}

          {step === 5 && (
            <div className="moa-step">
              <h3>Set Open &amp; Close Time</h3>
              <p className="moa-step__hint">When trading opens and when it closes ahead of kickoff.</p>
              <label className="moa-field-label" htmlFor="moa-opens">
                Opens at
              </label>
              <input
                id="moa-opens"
                type="datetime-local"
                value={form.opensAt}
                onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
              />
              <label className="moa-field-label" htmlFor="moa-closes">
                Closes at
              </label>
              <input
                id="moa-closes"
                type="datetime-local"
                value={form.closesAt}
                onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
              />
              {form.opensAt &&
                form.closesAt &&
                new Date(form.closesAt).getTime() <= new Date(form.opensAt).getTime() && (
                  <p className="moa-field-error">Close time must be after open time.</p>
                )}
            </div>
          )}

          {step === 6 && (
            <div className="moa-step">
              <h3>Define Void Conditions</h3>
              <p className="moa-step__hint">When should this market be voided and stakes refunded?</p>
              <label className="moa-field-label" htmlFor="moa-void">
                Void conditions
              </label>
              <textarea
                id="moa-void"
                rows={4}
                placeholder="Voided if…"
                value={form.voidConditions}
                onChange={(event) => setForm((current) => ({ ...current, voidConditions: event.target.value }))}
              />
            </div>
          )}

          {step === 7 && selectedEvent && (
            <div className="moa-step">
              <h3>Review</h3>
              <div className="moa-kv-grid">
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Event</span>
                  <span className="moa-kv-item__value">
                    {selectedEvent.teamA} vs {selectedEvent.teamB}
                  </span>
                </div>
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Question</span>
                  <span className="moa-kv-item__value">{form.question}</span>
                </div>
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Official Source</span>
                  <span className="moa-kv-item__value">{form.officialSource}</span>
                </div>
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Opens</span>
                  <span className="moa-kv-item__value">{formatDateTime(form.opensAt)}</span>
                </div>
                <div className="moa-kv-item">
                  <span className="moa-kv-item__key">Closes</span>
                  <span className="moa-kv-item__value">{formatDateTime(form.closesAt)}</span>
                </div>
              </div>
              <p className="moa-drawer-description">
                <b>Resolution rules:</b> {form.resolutionRules}
              </p>
              <p className="moa-drawer-description">
                <b>Void conditions:</b> {form.voidConditions}
              </p>
              <div className="moa-separation-notice">
                Created by <b>You</b> — this market must be approved by a different Market Approval Admin before it
                can go live.
              </div>
              {submitError && <p className="moa-field-error">{submitError}</p>}
            </div>
          )}

          {step === 8 && (
            <div className="moa-step moa-step--success">
              <span className="moa-success-icon">
                <FiCheckCircle aria-hidden="true" />
              </span>
              <h3>Submitted for Approval</h3>
              <p>
                <b>{submittedDraft?.id}</b> has been sent to the Market Approval queue. It was created by{' '}
                <b>{submittedDraft?.createdBy}</b> and must now be reviewed by a different Market Approval Admin
                before it can go live.
              </p>
              <button type="button" className="moa-btn moa-btn--gradient" onClick={onClose}>
                Back to Queue
              </button>
            </div>
          )}
        </div>

        {step < 8 && (
          <div className="moa-rule-preview">
            <span className="moa-rule-preview__label">Live Preview</span>
            <div className="moa-market-card">
              <p className="moa-market-card__event">
                {selectedEvent ? `${selectedEvent.teamA} vs ${selectedEvent.teamB}` : 'Select an event'}
              </p>
              <h4 className="moa-market-card__question">
                {form.question || 'Your YES/NO question will appear here'}
              </h4>
              <div className="moa-market-card__outcomes">
                <span className="moa-outcome moa-outcome--yes">YES</span>
                <span className="moa-outcome moa-outcome--no">NO</span>
              </div>
              <dl className="moa-market-card__meta">
                <div>
                  <dt>Resolution</dt>
                  <dd>{form.resolutionRules || '—'}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{form.officialSource || '—'}</dd>
                </div>
                <div>
                  <dt>Closes</dt>
                  <dd>{form.closesAt ? formatDateTime(form.closesAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Void if</dt>
                  <dd>{form.voidConditions || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {step < 8 && (
        <div className="moa-editor__footer">
          <button
            type="button"
            className="moa-btn moa-btn--outline"
            disabled={step === 0}
            onClick={() => setStep((current) => current - 1)}
          >
            <FiChevronLeft /> Back
          </button>
          {step < 7 ? (
            <button
              type="button"
              className="moa-btn moa-btn--gradient"
              disabled={!canGoNext}
              onClick={() => setStep((current) => current + 1)}
            >
              Next <FiChevronRight />
            </button>
          ) : (
            <button
              type="button"
              className="moa-btn moa-btn--gradient"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

function MarketOperationsAdmin() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [events, setEvents] = useState<VerifiedEvent[]>([]);
  const [drafts, setDrafts] = useState<MarketDraft[]>([]);
  const [proposals, setProposals] = useState<MarketProposal[]>([]);

  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'All'>('All');
  const [selectedProposal, setSelectedProposal] = useState<MarketProposal | null>(null);

  const [view, setView] = useState<'queue' | 'editor'>('queue');
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);

  // Pure fetch — no setState inside, so it's safe to call from an effect.
  const fetchAll = () => Promise.all([fetchVerifiedEvents(), fetchDrafts(), fetchProposals()]);

  useEffect(() => {
    let cancelled = false;

    fetchAll()
      .then(([eventsResult, draftsResult, proposalsResult]) => {
        if (cancelled) return;
        setEvents(eventsResult);
        setDrafts(draftsResult);
        setProposals(proposalsResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load market operations data. Please try again.');
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
      .then(([eventsResult, draftsResult, proposalsResult]) => {
        setEvents(eventsResult);
        setDrafts(draftsResult);
        setProposals(proposalsResult);
      })
      .catch(() => {
        setLoadError('Could not load market operations data. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCreateMarket = () => {
    setEditorSeed(null);
    setView('editor');
  };

  const handleConvertToDraft = (proposal: MarketProposal) => {
    // The proposal itself isn't marked Converted here — only once the wizard
    // actually produces a draft (see handleDraftSubmitted). Otherwise
    // cancelling out of the wizard would strand the proposal in a terminal
    // "Converted" state with no draft to show for it.
    setSelectedProposal(null);
    setEditorSeed({
      eventId: proposal.eventId,
      question: proposal.suggestedQuestion,
      resolutionRules: proposal.suggestedRules ?? '',
      startStep: 1,
      sourceProposalId: proposal.id,
    });
    setView('editor');
  };

  const handleReturnProposal = async (proposalId: string, note: string) => {
    const updated = await returnProposal(proposalId, note);
    setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProposal(updated);
  };

  const handleRejectProposal = async (proposalId: string, note: string) => {
    const updated = await rejectProposal(proposalId, note);
    setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProposal(updated);
  };

  const handleRequestProposalInfo = async (proposalId: string, note: string) => {
    const updated = await requestProposalInfo(proposalId, note);
    setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProposal(updated);
  };

  const handleSubmitDraftRow = async (draftId: string) => {
    const updated = await submitForApproval(draftId);
    setDrafts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDraftSubmitted = async (draft: MarketDraft) => {
    setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);

    const sourceProposalId = editorSeed?.sourceProposalId;
    if (sourceProposalId) {
      const updated = await convertProposalToDraft(sourceProposalId);
      setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }
  };

  const handleCloseEditor = () => {
    setView('queue');
    setEditorSeed(null);
  };

  const verifiedCount = events.filter((event) => event.verificationStatus === 'Verified').length;
  const readyCount = drafts.filter((draft) => draft.status === 'Ready for Approval').length;
  const pendingProposalsCount = proposals.filter(
    (proposal) => proposal.status === 'New' || proposal.status === 'Under Review',
  ).length;

  const selectedProposalEvent = selectedProposal
    ? events.find((event) => event.id === selectedProposal.eventId)
    : undefined;
  const selectedProposalDuplicate = selectedProposal?.duplicateOfDraftId
    ? drafts.find((draft) => draft.id === selectedProposal.duplicateOfDraftId)
    : undefined;

  return (
    <div className="moa-root">
      <div className="moa-shell">
        <aside className={`moa-sidebar${isSidebarOpen ? ' is-open' : ''}`}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </aside>

        {isSidebarOpen && <div className="moa-sidebar-scrim" onClick={() => setIsSidebarOpen(false)} />}

        <div className="moa-main">
          <header className="moa-topbar">
            <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          </header>

          <main className="moa-content">
            {view === 'editor' ? (
              <MarketDraftEditor
                events={events}
                drafts={drafts}
                seed={editorSeed}
                onClose={handleCloseEditor}
                onSubmitted={handleDraftSubmitted}
              />
            ) : (
              <>
                <div className="moa-header">
                  <div>
                    <p className="moa-header__eyebrow">Welcome back</p>
                    <h1>Market Operations</h1>
                    <p>
                      Create binary markets from verified events, review user-submitted proposals, and prepare
                      clear local sports markets for approval.
                    </p>
                  </div>
                  <div className="moa-header__actions">
                    <button type="button" className="moa-btn moa-btn--ghost">
                      Export Dashboard
                    </button>
                    <button type="button" className="moa-btn moa-btn--gradient" onClick={handleCreateMarket}>
                      <FiPlus /> Create Market
                    </button>
                  </div>
                </div>

                {loadError && (
                  <div className="moa-error-banner">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>{loadError}</span>
                    <button type="button" className="moa-btn moa-btn--outline moa-btn--sm" onClick={handleRetry}>
                      Retry
                    </button>
                  </div>
                )}

                {isLoading ? (
                  <div className="moa-loading">
                    <FiActivity aria-hidden="true" className="moa-loading__icon" />
                    Loading market operations data…
                  </div>
                ) : (
                  <>
                    <div className="moa-stat-grid">
                      <StatCard
                        icon={FiCheckCircle}
                        value={`${verifiedCount}/${events.length}`}
                        label="Verified events available"
                      />
                      <StatCard icon={FiFileText} value={drafts.length} label="Total drafts" />
                      <StatCard icon={FiTrendingUp} value={readyCount} label="Ready for approval" />
                      <StatCard icon={FiUsers} value={pendingProposalsCount} label="Pending proposals" />
                    </div>

                    <ProposalsPanel
                      proposals={proposals}
                      drafts={drafts}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      onSelect={setSelectedProposal}
                    />

                    <DraftsPanel drafts={drafts} onSubmitForApproval={handleSubmitDraftRow} />
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {selectedProposal && (
        <ProposalDetailDrawer
          proposal={selectedProposal}
          event={selectedProposalEvent}
          duplicateDraft={selectedProposalDuplicate}
          onClose={() => setSelectedProposal(null)}
          onConvert={handleConvertToDraft}
          onReturn={handleReturnProposal}
          onReject={handleRejectProposal}
          onRequestInfo={handleRequestProposalInfo}
        />
      )}
    </div>
  );
}

export default MarketOperationsAdmin;
