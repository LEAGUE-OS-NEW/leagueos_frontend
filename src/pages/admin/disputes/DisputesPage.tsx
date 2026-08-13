import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  escalateDispute,
  fetchDisputes,
  resolveDispute,
  type Dispute,
  type DisputeStatus,
} from '../../../services/resultVerificationService';
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

function NoteModal({
  title,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="dsp-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="dsp-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <label className="dsp-field-label" htmlFor="dsp-note">
          Note
        </label>
        <textarea id="dsp-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="dsp-modal__footer">
          <button type="button" className="dsp-btn dsp-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="dsp-btn dsp-btn--gradient" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>
            {confirmLabel}
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
  const [pendingAction, setPendingAction] = useState<{ kind: 'escalate' | 'resolve'; dispute: Dispute } | null>(null);

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

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchDisputes()
      .then(setDisputes)
      .catch(() => setLoadError('Could not load disputes. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const handleConfirm = async (note: string) => {
    if (!pendingAction) return;
    try {
      const updated =
        pendingAction.kind === 'escalate'
          ? await escalateDispute(pendingAction.dispute.id, note)
          : await resolveDispute(pendingAction.dispute.id, note);
      setDisputes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPendingAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this dispute.');
    }
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
              <button type="button" className="dsp-btn dsp-btn--outline dsp-btn--sm" onClick={handleRetry}>
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
                            {dispute.status === 'Open' && (
                              <button
                                type="button"
                                className="dsp-btn dsp-btn--outline dsp-btn--sm"
                                onClick={() => setPendingAction({ kind: 'escalate', dispute })}
                              >
                                Escalate
                              </button>
                            )}
                            <button
                              type="button"
                              className="dsp-btn dsp-btn--gradient dsp-btn--sm"
                              onClick={() => setPendingAction({ kind: 'resolve', dispute })}
                            >
                              Resolve
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

      {pendingAction && (
        <NoteModal
          title={pendingAction.kind === 'escalate' ? 'Escalate Dispute' : 'Resolve Dispute'}
          confirmLabel={pendingAction.kind === 'escalate' ? 'Escalate' : 'Resolve'}
          onCancel={() => setPendingAction(null)}
          onConfirm={handleConfirm}
        />
      )}
    </AdminLayout>
  );
}

export default DisputesPage;
