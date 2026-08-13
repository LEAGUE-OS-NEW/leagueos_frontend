import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  decideResultDispute,
  fetchDisputeMarketOutcomes,
  fetchDisputes,
  type Dispute,
  type DisputeDecisionType,
  type DisputeMarketOutcome,
  type DisputeStatus,
} from '../../../services/resultVerificationService';
import type { OutcomeId } from '../../../services/marketAdminService';
import './DisputesPage.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusPillClass(status: DisputeStatus): string {
  switch (status) {
    case 'Open':
      return 'dsp-status-pill dsp-status-pill--open';
    case 'Escalated':
      return 'dsp-status-pill dsp-status-pill--escalated';
    case 'Unavailable':
      return 'dsp-status-pill';
    default:
      return 'dsp-status-pill dsp-status-pill--resolved';
  }
}

const DECISION_LABELS: Record<DisputeDecisionType, string> = {
  CONFIRM: 'Confirm the provisional result',
  CORRECT: 'Correct the winning outcome',
  VOID: 'Void the market',
  EXTEND_REVIEW: 'Extend the review window',
};

function DecisionModal({
  dispute,
  onCancel,
  onConfirm,
}: {
  dispute: Dispute;
  onCancel: () => void;
  onConfirm: (input: {
    decisionType: DisputeDecisionType;
    winningOutcomeId?: OutcomeId;
    reviewExtensionHours?: number;
    notes: string;
    evidence: string;
  }) => Promise<void>;
}) {
  const [decisionType, setDecisionType] = useState<DisputeDecisionType>('CONFIRM');
  const [outcomes, setOutcomes] = useState<DisputeMarketOutcome[]>([]);
  const [winningOutcomeId, setWinningOutcomeId] = useState<OutcomeId | ''>('');
  const [reviewExtensionHours, setReviewExtensionHours] = useState('24');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDisputeMarketOutcomes(dispute.marketId)
      .then((result) => {
        if (!cancelled) setOutcomes(result);
      })
      .catch(() => {
        /* Confirm/Correct just won't offer an outcome picker if this fails. */
      });
    return () => {
      cancelled = true;
    };
  }, [dispute.marketId]);

  const needsOutcome = decisionType === 'CONFIRM' || decisionType === 'CORRECT';
  const needsExtension = decisionType === 'EXTEND_REVIEW';

  const canSubmit =
    notes.trim() &&
    evidence.trim() &&
    (!needsOutcome || winningOutcomeId) &&
    (!needsExtension || Number(reviewExtensionHours) > 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        decisionType,
        winningOutcomeId: needsOutcome && winningOutcomeId ? winningOutcomeId : undefined,
        reviewExtensionHours: needsExtension ? Number(reviewExtensionHours) : undefined,
        notes: notes.trim(),
        evidence: evidence.trim(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record this decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dsp-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="dsp-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Decide Result — {dispute.eventLabel}</h3>
        {error && (
          <div className="dsp-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <label className="dsp-field-label" htmlFor="dsp-decision-type">
          Decision
        </label>
        <select
          id="dsp-decision-type"
          value={decisionType}
          onChange={(event) => setDecisionType(event.target.value as DisputeDecisionType)}
        >
          {(Object.keys(DECISION_LABELS) as DisputeDecisionType[]).map((type) => (
            <option key={type} value={type}>
              {DECISION_LABELS[type]}
            </option>
          ))}
        </select>

        {needsOutcome && (
          <>
            <label className="dsp-field-label" htmlFor="dsp-winning-outcome">
              Winning outcome
            </label>
            <select
              id="dsp-winning-outcome"
              value={winningOutcomeId}
              onChange={(event) => setWinningOutcomeId(event.target.value as OutcomeId)}
            >
              <option value="">Select the winning outcome…</option>
              {outcomes.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.label}
                </option>
              ))}
            </select>
          </>
        )}

        {needsExtension && (
          <>
            <label className="dsp-field-label" htmlFor="dsp-extension-hours">
              Extend review by (hours)
            </label>
            <input
              id="dsp-extension-hours"
              type="number"
              min={1}
              max={168}
              value={reviewExtensionHours}
              onChange={(event) => setReviewExtensionHours(event.target.value)}
            />
          </>
        )}

        <label className="dsp-field-label" htmlFor="dsp-notes">
          Notes
        </label>
        <textarea id="dsp-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />

        <label className="dsp-field-label" htmlFor="dsp-evidence">
          Evidence
        </label>
        <textarea
          id="dsp-evidence"
          rows={3}
          placeholder="Cite the official source used for this decision…"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
        />

        <div className="dsp-modal__footer">
          <button type="button" className="dsp-btn dsp-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="dsp-btn dsp-btn--gradient"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting…' : 'Confirm Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDispute, setPendingDispute] = useState<Dispute | null>(null);

  const loadDisputes = () => {
    setIsLoading(true);
    setLoadError(null);
    return fetchDisputes()
      .then(setDisputes)
      .catch(() => setLoadError('Could not load disputes. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchDisputes()
      .then((result) => {
        if (!cancelled) setDisputes(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load disputes. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async (input: {
    decisionType: DisputeDecisionType;
    winningOutcomeId?: OutcomeId;
    reviewExtensionHours?: number;
    notes: string;
    evidence: string;
  }) => {
    if (!pendingDispute) return;
    // Errors propagate to DecisionModal's own try/catch, which displays
    // them inline next to the fields the admin is filling in.
    await decideResultDispute(pendingDispute.marketId, input);
    setPendingDispute(null);
    setActionError(null);
    // One decision can resolve every dispute on this market, so refetch
    // the whole list rather than optimistically patch a single row.
    await loadDisputes();
  };

  return (
    <AdminLayout>
      <div className="dsp-root">
        <div className="dsp-head">
          <p className="dsp-eyebrow">Welcome back</p>
          <h1>Disputes</h1>
          <p>Market-result disputes raised by fans, shared between Verification and Compliance.</p>
        </div>

        {(loadError || actionError) && (
          <div className="dsp-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
            {loadError && (
              <button type="button" className="dsp-btn dsp-btn--outline dsp-btn--sm" onClick={loadDisputes}>
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="dsp-loading">
            <FiActivity aria-hidden="true" className="dsp-loading__icon" />
            Loading disputes…
          </div>
        ) : (
          <div className="dsp-panel">
            <div className="dsp-table-scroll">
              <table className="dsp-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Raised By</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Raised</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((dispute) => (
                    <tr key={dispute.id}>
                      <td className="dsp-table__title-cell">{dispute.eventLabel}</td>
                      <td>{dispute.raisedBy}</td>
                      <td className="dsp-table__title-cell">{dispute.reason}</td>
                      <td>
                        <span className={statusPillClass(dispute.status)}>{dispute.status}</span>
                      </td>
                      <td>{formatDateTime(dispute.createdAt)}</td>
                      <td>
                        {dispute.status !== 'Resolved' && (
                          <div className="dsp-row-actions">
                            <button
                              type="button"
                              className="dsp-btn dsp-btn--gradient dsp-btn--sm"
                              onClick={() => setPendingDispute(dispute)}
                            >
                              Decide Result
                            </button>
                          </div>
                        )}
                        {dispute.status === 'Resolved' && dispute.resolutionNote && (
                          <span className="dsp-resolution-note">{dispute.resolutionNote}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {disputes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="dsp-table__empty">
                        No disputes right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {pendingDispute && (
        <DecisionModal
          dispute={pendingDispute}
          onCancel={() => setPendingDispute(null)}
          onConfirm={handleConfirm}
        />
      )}
    </AdminLayout>
  );
}

export default DisputesPage;
