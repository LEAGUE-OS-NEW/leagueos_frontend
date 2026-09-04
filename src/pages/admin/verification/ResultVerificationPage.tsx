import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiCheckCircle, FiShield, FiXCircle } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  fetchAwaitingResult,
  closeMarket,
  endDisputeWindowForDevelopment,
  refundResult,
  resolveResult,
  settleResult,
  verifyResult,
  voidMarket,
  type ResultVerification,
} from '../../../services/resultVerificationService';
import {
  fetchFixtureResultVerifications,
  rejectFixtureResult,
  verifyFixtureResult,
  type FixtureResultVerification,
} from '../../../services/fixtureResultVerificationService';
import type { OutcomeId } from '../../../services/marketAdminService';
import { useAuthStore } from '../../../store/authStore.ts';
import { canUseReviewWorkflowTools } from '../../../utils/reviewWorkflowTools.ts';
import './ResultVerificationPage.css';

type ActiveTab = 'active' | 'completed' | 'fixtureResults';

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
    case 'Ready to Close':
    case 'Provisional Result':
    case 'Dispute Window':
    case 'Ready to Resolve':
    case 'Ready to Settle':
    case 'Ready to Refund':
      return 'rv-stage-pill rv-stage-pill--verified';
    case 'Settled':
    case 'Refunded':
      return 'rv-stage-pill rv-stage-pill--finalised';
    default:
      return 'rv-stage-pill rv-stage-pill--awaiting';
  }
}

function fixtureStatusPillClass(status: FixtureResultVerification['status']): string {
  switch (status) {
    case 'VERIFIED':
      return 'rv-stage-pill rv-stage-pill--finalised';
    case 'REJECTED':
      return 'rv-stage-pill rv-stage-pill--awaiting';
    default:
      return 'rv-stage-pill rv-stage-pill--verified';
  }
}

function ResultVerificationPage() {
  const [items, setItems] = useState<ResultVerification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fixtureItems, setFixtureItems] = useState<FixtureResultVerification[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFixture, setIsSavingFixture] = useState(false);
  const [fixtureReviewNote, setFixtureReviewNote] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const user = useAuthStore((state) => state.user);
  const localAcceleratorVisible = import.meta.env.DEV && import.meta.env.VITE_DEV_RESULT_ACCELERATOR === 'true';
  const reviewAcceleratorVisible = canUseReviewWorkflowTools(user);

  const [formSyncedId, setFormSyncedId] = useState<string | null>(null);
  const [winningOutcomeId, setWinningOutcomeId] = useState<OutcomeId | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  const fetchAll = () => Promise.all([fetchAwaitingResult(), fetchFixtureResultVerifications()]);

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then(([marketResult, fixtureResult]) => {
        if (cancelled) return;
        setItems(marketResult);
        setFixtureItems(fixtureResult);
        setSelectedId((current) => current ?? marketResult[0]?.marketId ?? null);
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

  const visibleItems = useMemo(
    () => items.filter((item) => ['Settled', 'Voided / Refunded'].includes(item.stage) === (activeTab === 'completed')),
    [items, activeTab],
  );
  const selected = useMemo(() => visibleItems.find((item) => item.marketId === selectedId) ?? null, [visibleItems, selectedId]);
  const selectedFixture = useMemo(
    () => fixtureItems.find((item) => item.id === selectedFixtureId) ?? null,
    [fixtureItems, selectedFixtureId],
  );
  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ResultVerification['stage'], number>> = {};
    for (const item of items) counts[item.stage] = (counts[item.stage] ?? 0) + 1;
    return counts;
  }, [items]);

  // Reset the form whenever the selected market changes — done during render
  // (React's documented pattern for this) rather than in an effect, so
  // switching rows doesn't cost an extra render-then-effect cascade.
  if (selected && selected.marketId !== formSyncedId) {
    setFormSyncedId(selected.marketId);
    setWinningOutcomeId(selected.proposedWinningOutcomeId ?? null);
    setEvidenceNote(selected.evidenceNote ?? '');
    setActionNotes('');
  }

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchAll()
      .then(([marketResult, fixtureResult]) => {
        setItems(marketResult);
        setFixtureItems(fixtureResult);
      })
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

  const refreshQueue = async () => {
    const remaining = await fetchAwaitingResult();
    setItems(remaining);
    setSelectedId((current) => remaining.some((item) => item.marketId === current) ? current : remaining[0]?.marketId ?? null);
  };

  const handleResolve = async () => {
    if (!selected) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await resolveResult(selected.marketId);
      await refreshQueue();
      setActionSuccess('Result resolved. No payouts were settled by this action.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not finalise this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettle = async () => {
    if (!selected) return;
    const impact = selected.settlement?.totalPositionCount === undefined
      ? 'This will settle all eligible positions and apply the resulting payouts.'
      : `This will settle ${selected.settlement.totalPositionCount} positions and apply the resulting payouts.`;
    if (!window.confirm(`${impact} Continue?`)) return;
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const settlement = await settleResult(selected.marketId);
      await refreshQueue();
      setActionSuccess(`Settlement ${settlement.status.toLowerCase()}${settlement.reference ? ` — reference ${settlement.reference}` : ''}${settlement.totalPositionCount === undefined ? '' : ` — ${settlement.totalPositionCount} positions`}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not settle this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    if (!window.confirm('Close this market for trading? No new orders will be accepted after this.')) return;
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await closeMarket(selected.marketId, actionNotes);
      await refreshQueue();
      setActionNotes('');
      setActionSuccess('Market closed.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not close this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!selected) return;
    if (!window.confirm('Void this market? This cannot be undone, and positions will need to be refunded next.')) return;
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await voidMarket(selected.marketId, { notes: actionNotes, evidence: evidenceNote });
      await refreshQueue();
      setActionNotes('');
      setEvidenceNote('');
      setActionSuccess('Market voided. Positions are ready to be refunded.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not void this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!selected) return;
    if (!window.confirm('Refund all reserved funds and open positions for this voided market?')) return;
    setIsSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const refund = await refundResult(selected.marketId);
      await refreshQueue();
      setActionSuccess(`Refund complete${refund.reference ? ` — reference ${refund.reference}` : ''}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not refund this market.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEndWindow = async () => {
    if (!selected || !window.confirm('End this synthetic staging review dispute window? This does not resolve the result or settle funds.')) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await endDisputeWindowForDevelopment(selected.marketId);
      setItems(await fetchAwaitingResult());
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Development accelerator is unavailable.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyFixture = async () => {
    if (!selectedFixture) return;
    setIsSavingFixture(true);
    setActionError(null);
    try {
      const updated = await verifyFixtureResult(selectedFixture.id, fixtureReviewNote);
      setFixtureItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not verify this fixture result.');
    } finally {
      setIsSavingFixture(false);
    }
  };

  const handleRejectFixture = async () => {
    if (!selectedFixture) return;
    setIsSavingFixture(true);
    setActionError(null);
    try {
      const updated = await rejectFixtureResult(selectedFixture.id, fixtureReviewNote);
      setFixtureItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not reject this fixture result.');
    } finally {
      setIsSavingFixture(false);
    }
  };

  const pendingFixtureCount = fixtureItems.filter((item) => item.status === 'PENDING').length;

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
        {actionSuccess && <div className="rv-error-banner" role="status"><FiCheckCircle aria-hidden="true" /><span>{actionSuccess}</span></div>}

        {isLoading ? (
          <div className="rv-loading">
            <FiActivity aria-hidden="true" className="rv-loading__icon" />
            Loading the verification queue…
          </div>
        ) : (
          <>
          <div className="rv-summary-cards">
            {([
              ['Ready to Close', stageCounts['Ready to Close'] ?? 0],
              ['Ready to Resolve', stageCounts['Ready to Resolve'] ?? 0],
              ['Disputed', stageCounts.Disputed ?? 0],
              ['Ready to Settle', stageCounts['Ready to Settle'] ?? 0],
              ['Ready to Refund', stageCounts['Ready to Refund'] ?? 0],
            ] as const).map(([label, count]) => (
              <div className="rv-summary-card" key={label}>
                <span className="rv-summary-card__count">{count}</span>
                <span className="rv-summary-card__label">{label}</span>
              </div>
            ))}
          </div>
          <div className="rv-layout">
            <div className="rv-panel rv-queue">
              <div className="rv-panel__header">
                <h2>
                  {activeTab === 'fixtureResults'
                    ? 'Fixture Results'
                    : activeTab === 'completed'
                      ? 'Completed / History'
                      : 'Active Result Workflow'}
                </h2>
                <p>
                  {activeTab === 'fixtureResults'
                    ? 'Completed fixtures submitted for a final-score QA check.'
                    : 'Closed markets and authoritative provisional, dispute, resolution, settlement and refund states.'}
                </p>
                <div className="rv-tab-row">
                  <button
                    type="button"
                    className={`rv-tab${activeTab === 'active' ? ' rv-tab--active' : ''}`}
                    onClick={() => { setActiveTab('active'); setSelectedId(null); }}
                  >
                    Show Active Queue
                  </button>
                  <button
                    type="button"
                    className={`rv-tab${activeTab === 'completed' ? ' rv-tab--active' : ''}`}
                    onClick={() => { setActiveTab('completed'); setSelectedId(null); }}
                  >
                    Show Completed History
                  </button>
                  <button
                    type="button"
                    className={`rv-tab${activeTab === 'fixtureResults' ? ' rv-tab--active' : ''}`}
                    onClick={() => setActiveTab('fixtureResults')}
                  >
                    Fixture Results
                    {pendingFixtureCount > 0 && <span className="rv-tab__badge">{pendingFixtureCount}</span>}
                  </button>
                </div>
              </div>

              {activeTab === 'fixtureResults' ? (
                <div className="rv-table-scroll">
                  <table className="rv-table">
                    <thead>
                      <tr>
                        <th>Match</th>
                        <th>Kickoff</th>
                        <th>Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixtureItems.map((item) => (
                        <tr
                          key={item.id}
                          className={item.id === selectedFixtureId ? 'is-selected' : ''}
                          onClick={() => { setSelectedFixtureId(item.id); setFixtureReviewNote(''); }}
                        >
                          <td className="rv-table__title-cell">
                            <strong>{item.fixtureName}</strong>
                            <span>{item.sportName}{item.competitionName ? ` · ${item.competitionName}` : ''}</span>
                          </td>
                          <td>{formatDateTime(item.startsAt)}</td>
                          <td>{item.homeScore ?? '—'} - {item.awayScore ?? '—'}</td>
                          <td>
                            <span className={fixtureStatusPillClass(item.status)}>{item.status}</span>
                          </td>
                        </tr>
                      ))}
                      {fixtureItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="rv-table__empty">
                            No fixture results have been submitted for verification yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
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
                      {visibleItems.map((item) => (
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
                      {visibleItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="rv-table__empty">
                            Nothing is waiting on a result right now.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {activeTab === 'fixtureResults' && selectedFixture && (
              <div className="rv-panel rv-detail">
                <div className="rv-panel__header">
                  <h2>{selectedFixture.fixtureName}</h2>
                  <p>{selectedFixture.sportName}{selectedFixture.competitionName ? ` · ${selectedFixture.competitionName}` : ''}</p>
                </div>

                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Kickoff</span>
                  <span className="rv-kv-item__value">{formatDateTime(selectedFixture.startsAt)}</span>
                </div>
                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Final score</span>
                  <span className="rv-kv-item__value">{selectedFixture.homeScore ?? '—'} - {selectedFixture.awayScore ?? '—'}</span>
                </div>
                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Submitted by</span>
                  <span className="rv-kv-item__value">{selectedFixture.submittedByEmail ?? '—'} — {formatDateTime(selectedFixture.submittedAt)}</span>
                </div>
                {selectedFixture.reviewedAt && (
                  <div className="rv-kv-item">
                    <span className="rv-kv-item__key">Reviewed by</span>
                    <span className="rv-kv-item__value">{selectedFixture.reviewedByEmail ?? '—'} — {formatDateTime(selectedFixture.reviewedAt)}</span>
                  </div>
                )}

                <label className="rv-field">
                  <span>Review note (optional)</span>
                  <textarea
                    rows={3}
                    value={fixtureReviewNote}
                    disabled={selectedFixture.status !== 'PENDING'}
                    onChange={(event) => setFixtureReviewNote(event.target.value)}
                    placeholder="e.g. Score confirmed against the official match report."
                  />
                </label>

                {selectedFixture.status !== 'PENDING' && selectedFixture.reviewNote && (
                  <p className="rv-verified-meta">{selectedFixture.reviewNote}</p>
                )}

                <div className="rv-detail__actions">
                  <button
                    type="button"
                    className="rv-btn rv-btn--outline"
                    disabled={selectedFixture.status !== 'PENDING' || isSavingFixture}
                    onClick={() => void handleRejectFixture()}
                  >
                    <FiXCircle aria-hidden="true" /> Reject
                  </button>
                  <button
                    type="button"
                    className="rv-btn rv-btn--gradient"
                    disabled={selectedFixture.status !== 'PENDING' || isSavingFixture}
                    onClick={() => void handleVerifyFixture()}
                  >
                    <FiCheckCircle aria-hidden="true" /> Verify
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'fixtureResults' && selected && (
              <div className="rv-panel rv-detail">
                <div className="rv-panel__header">
                  <h2>{selected.eventLabel}</h2>
                  <p>{selected.question}</p>
                </div>

                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Kickoff</span>
                  <span className="rv-kv-item__value">{formatDateTime(selected.kickoff)}</span>
                </div>
                {selected.tradingClose && <div className="rv-kv-item"><span className="rv-kv-item__key">Trading Close</span><span className="rv-kv-item__value">{formatDateTime(selected.tradingClose)}</span></div>}
                {selected.settlementTarget && <div className="rv-kv-item"><span className="rv-kv-item__key">Settlement Target</span><span className="rv-kv-item__value">{formatDateTime(selected.settlementTarget)}</span></div>}
                <div className="rv-kv-item">
                  <span className="rv-kv-item__key">Resolution source / rules</span>
                  <span className="rv-kv-item__value">{selected.officialSource}</span>
                </div>
                {selected.disputeDeadline && <div className="rv-kv-item"><span className="rv-kv-item__key">Dispute Deadline</span><span className="rv-kv-item__value">{formatDateTime(selected.disputeDeadline)}</span></div>}
                <div className="rv-kv-item"><span className="rv-kv-item__key">Dispute window</span><span className="rv-kv-item__value">{selected.disputeWindowHours === undefined ? 'Backend-configured default' : `${selected.disputeWindowHours} hours`}</span></div>
                <div className="rv-kv-item"><span className="rv-kv-item__key">Open disputes</span><span className="rv-kv-item__value">{selected.openDisputeCount ?? 0}</span></div>

                <div className="rv-outcome-picker">
                  {selected.outcomes.map((outcome) => (
                    <button
                      type="button"
                      key={outcome.id}
                      className={`rv-outcome-choice${winningOutcomeId === outcome.id ? ' is-selected' : ''}`}
                      disabled={selected.stage !== 'Awaiting Result'}
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
                    disabled={selected.stage !== 'Awaiting Result' && !selected.canVoid}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    placeholder="e.g. Confirmed via FUFA official match report."
                  />
                </label>

                {(selected.canClose || selected.canVoid) && (
                  <label className="rv-field">
                    <span>Action notes</span>
                    <textarea
                      rows={2}
                      value={actionNotes}
                      onChange={(event) => setActionNotes(event.target.value)}
                      placeholder="Reason for closing or voiding this market."
                    />
                  </label>
                )}

                {selected.refund && (
                  <p className="rv-verified-meta">
                    Refunded — reference {selected.refund.reference}
                    {selected.refund.executedAt && ` — ${formatDateTime(selected.refund.executedAt)}`}
                  </p>
                )}

                {selected.verifiedBy && (
                  <p className="rv-verified-meta">
                    Verified by {selected.verifiedBy} — {selected.verifiedAt && formatDateTime(selected.verifiedAt)}
                  </p>
                )}

                <div className="rv-detail__actions">
                  {(reviewAcceleratorVisible || localAcceleratorVisible) && selected.stage === 'Dispute Window' && (
                    <button type="button" className="rv-btn rv-btn--outline" disabled={isSaving} onClick={() => void handleEndWindow()}>
                      {reviewAcceleratorVisible ? 'End dispute window for staging review' : 'End dispute window now (development only)'}
                    </button>
                  )}
                  {reviewAcceleratorVisible && selected.stage === 'Dispute Window' && <p>Synthetic staging review only. This does not resolve the result and does not settle funds.</p>}
                  {selected.canClose && (
                    <button
                      type="button"
                      className="rv-btn rv-btn--outline"
                      disabled={!actionNotes.trim() || isSaving}
                      onClick={() => void handleClose()}
                    >
                      Close Market
                    </button>
                  )}
                  {selected.canVoid && (
                    <button
                      type="button"
                      className="rv-btn rv-btn--outline"
                      disabled={!actionNotes.trim() || !evidenceNote.trim() || isSaving}
                      onClick={() => void handleVoid()}
                    >
                      Void Market
                    </button>
                  )}
                  <button
                    type="button"
                    className="rv-btn rv-btn--outline"
                    disabled={!selected.canPublishProvisional || !winningOutcomeId || !evidenceNote.trim() || isSaving}
                    onClick={handleVerify}
                  >
                    Publish Provisional Result
                  </button>
                  <button
                    type="button"
                    className="rv-btn rv-btn--gradient"
                    disabled={!selected.canResolve || isSaving}
                    onClick={handleResolve}
                  >
                    Resolve Result
                  </button>
                  <button
                    type="button"
                    className="rv-btn rv-btn--gradient"
                    disabled={!selected.canSettle || isSaving}
                    onClick={handleSettle}
                  >
                    Settle Payouts
                  </button>
                  {selected.canRefund && (
                    <button
                      type="button"
                      className="rv-btn rv-btn--gradient"
                      disabled={isSaving}
                      onClick={() => void handleRefund()}
                    >
                      Refund Positions
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default ResultVerificationPage;
