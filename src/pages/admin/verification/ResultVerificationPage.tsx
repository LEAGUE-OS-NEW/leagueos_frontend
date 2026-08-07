import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiCheckCircle, FiShield } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  fetchAwaitingResult,
  finalizeResult,
  verifyResult,
  type ResultVerification,
} from '../../../services/resultVerificationService';
import type { OutcomeId } from '../../../services/marketAdminService';
import './ResultVerificationPage.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stagePillClass(stage: ResultVerification['stage']): string {
  switch (stage) {
    case 'Verified':
      return 'rv-stage-pill rv-stage-pill--verified';
    case 'Finalised':
      return 'rv-stage-pill rv-stage-pill--finalised';
    default:
      return 'rv-stage-pill rv-stage-pill--awaiting';
  }
}

function ResultVerificationPage() {
  const [items, setItems] = useState<ResultVerification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formSyncedId, setFormSyncedId] = useState<string | null>(null);
  const [winningOutcomeId, setWinningOutcomeId] = useState<OutcomeId | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');

  const fetchAll = () => fetchAwaitingResult();

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setSelectedId((current) => current ?? result[0]?.marketId ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the verification queue. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => items.find((item) => item.marketId === selectedId) ?? null, [items, selectedId]);

  // Reset the form whenever the selected market changes — done during render
  // (React's documented pattern for this) rather than in an effect, so
  // switching rows doesn't cost an extra render-then-effect cascade.
  if (selected && selected.marketId !== formSyncedId) {
    setFormSyncedId(selected.marketId);
    setWinningOutcomeId(selected.proposedWinningOutcomeId ?? null);
    setEvidenceNote(selected.evidenceNote ?? '');
  }

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchAll()
      .then(setItems)
      .catch(() => setLoadError('Could not load the verification queue. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const handleVerify = async () => {
    if (!selected || !winningOutcomeId) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await verifyResult(selected.marketId, { winningOutcomeId, evidenceNote });
      setItems((current) => current.map((item) => (item.marketId === updated.marketId ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not verify this result.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!selected) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await finalizeResult(selected.marketId);
      const remaining = await fetchAll();
      setItems(remaining);
      setSelectedId(remaining[0]?.marketId ?? null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not finalise this market.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rv-root">
        <div className="rv-head">
          <p className="rv-eyebrow">Welcome back</p>
          <h1>Result Verification</h1>
          <p>Verify real-world outcomes against an official source, then finalise to trigger fan payouts.</p>
        </div>

        {(loadError || actionError) && (
          <div className="rv-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
            {loadError && (
              <button type="button" className="rv-btn rv-btn--outline rv-btn--sm" onClick={handleRetry}>
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="rv-loading">
            <FiActivity aria-hidden="true" className="rv-loading__icon" />
            Loading the verification queue…
          </div>
        ) : (
          <div className="rv-layout">
            <div className="rv-panel rv-queue">
              <div className="rv-panel__header">
                <h2>Awaiting a Result</h2>
                <p>Markets whose kickoff has passed, sorted by how long they've waited.</p>
              </div>
              <div className="rv-table-scroll">
                <table className="rv-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Kickoff</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.marketId}
                        className={item.marketId === selectedId ? 'is-selected' : ''}
                        onClick={() => setSelectedId(item.marketId)}
                      >
                        <td className="rv-table__title-cell">
                          <strong>{item.eventLabel}</strong>
                          <span>{item.question}</span>
                        </td>
                        <td>{formatDateTime(item.kickoff)}</td>
                        <td>
                          <span className={stagePillClass(item.stage)}>{item.stage}</span>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={3} className="rv-table__empty">
                          Nothing is waiting on a result right now.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selected && (
              <div className="rv-panel rv-detail">
                <div className="rv-panel__header">
                  <h2>{selected.eventLabel}</h2>
                  <p>{selected.question}</p>
                </div>

                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Resolution source / rules</span>
                  <span className="rv-kv-item__value">{selected.officialSource}</span>
                </div>

                <div className="rv-outcome-picker">
                  {selected.outcomes.map((outcome) => (
                    <button
                      type="button"
                      key={outcome.id}
                      className={`rv-outcome-choice${winningOutcomeId === outcome.id ? ' is-selected' : ''}`}
                      disabled={selected.stage === 'Finalised'}
                      onClick={() => setWinningOutcomeId(outcome.id)}
                    >
                      {outcome.id === 'YES' ? <FiCheckCircle aria-hidden="true" /> : <FiShield aria-hidden="true" />}
                      {outcome.label}
                    </button>
                  ))}
                </div>

                <label className="rv-field">
                  <span>Evidence / official source note</span>
                  <textarea
                    rows={3}
                    value={evidenceNote}
                    disabled={selected.stage === 'Finalised'}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    placeholder="e.g. Confirmed via FUFA official match report."
                  />
                </label>

                {selected.verifiedBy && (
                  <p className="rv-verified-meta">
                    Verified by {selected.verifiedBy} — {selected.verifiedAt && formatDateTime(selected.verifiedAt)}
                  </p>
                )}

                <div className="rv-detail__actions">
                  <button
                    type="button"
                    className="rv-btn rv-btn--outline"
                    disabled={!winningOutcomeId || !evidenceNote.trim() || isSaving}
                    onClick={handleVerify}
                  >
                    {selected.stage === 'Awaiting Result' ? 'Verify Result' : 'Update Verification'}
                  </button>
                  <button
                    type="button"
                    className="rv-btn rv-btn--gradient"
                    disabled={selected.stage !== 'Verified' || isSaving}
                    onClick={handleFinalize}
                  >
                    Finalise &amp; Send Payouts
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ResultVerificationPage;
