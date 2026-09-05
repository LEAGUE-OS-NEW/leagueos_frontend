import { useEffect, useMemo, useRef, useState } from 'react';
import {
  decideCanonicalAdminKyc,
  fetchCanonicalAdminKyc,
  fetchCanonicalAdminKycDetail,
  fetchCanonicalAdminKycDocumentBlob,
  type AdminKycRecord,
  type AdminKycStatus,
} from '../../../services/canonicalKycAdminService';

/* ─── helpers ─────────────────────────────────────────────── */

type Tab = 'Pending / Processing' | 'Manual Review' | 'Retry Required' | 'Verified' | 'Rejected';
const TABS: Tab[] = ['Pending / Processing', 'Manual Review', 'Retry Required', 'Verified', 'Rejected'];

function inTab(row: AdminKycRecord, tab: Tab) {
  if (tab === 'Pending / Processing') return ['NOT_STARTED', 'PENDING', 'PROCESSING'].includes(row.status);
  if (tab === 'Manual Review')  return row.status === 'REVIEW';
  if (tab === 'Retry Required') return row.status === 'RETRY_REQUIRED';
  if (tab === 'Verified')       return row.status === 'VERIFIED';
  return ['REJECTED', 'EXPIRED'].includes(row.status);
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');

/** Statuses where an admin may force a VERIFIED or REJECTED decision. */
const DECIDABLE: AdminKycStatus[] = ['REVIEW', 'PENDING', 'PROCESSING', 'RETRY_REQUIRED'];

const STATUS_COLORS: Partial<Record<AdminKycStatus, string>> = {
  NOT_STARTED:   '#6b7595',
  PENDING:       '#f97316',
  PROCESSING:    '#2563eb',
  REVIEW:        '#a855f7',
  RETRY_REQUIRED:'#f97316',
  VERIFIED:      '#22c55e',
  REJECTED:      '#ef4444',
  EXPIRED:       '#6b7595',
};

function StatusBadge({ status }: { status: AdminKycStatus }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#fff',
      background: STATUS_COLORS[status] ?? '#6b7595',
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ─── component ───────────────────────────────────────────── */

export default function CanonicalKycWorkspace({ onClose }: { onClose: () => void }) {
  const [rows,     setRows]     = useState<AdminKycRecord[]>([]);
  const [tab,      setTab]      = useState<Tab>('Pending / Processing');
  const [selected, setSelected] = useState<AdminKycRecord | null>(null);
  const [notes,    setNotes]    = useState('');
  const [error,    setError]    = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [decideError, setDecideError] = useState('');
  const [documentImageUrl, setDocumentImageUrl] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  const revokeEvidenceUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  };

  const load = async () => {
    try {
      setRows(await fetchCanonicalAdminKyc());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load KYC records.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => revokeEvidenceUrls();
  }, []);

  const visible = useMemo(() => rows.filter((row) => inTab(row, tab)), [rows, tab]);

  const open = async (row: AdminKycRecord) => {
    setError('');
    setDecideError('');
    setNotes('');
    revokeEvidenceUrls();
    setDocumentImageUrl(null);
    setSelfieImageUrl(null);
    setEvidenceError('');
    try {
      const detail = await fetchCanonicalAdminKycDetail(row.id);
      setSelected(detail);
      setIsLoadingEvidence(true);
      try {
        const [documentBlob, selfieBlob] = await Promise.all([
          fetchCanonicalAdminKycDocumentBlob(detail.id, 'document'),
          fetchCanonicalAdminKycDocumentBlob(detail.id, 'selfie'),
        ]);
        const documentUrl = URL.createObjectURL(documentBlob);
        const selfieUrl = URL.createObjectURL(selfieBlob);
        objectUrlsRef.current = [documentUrl, selfieUrl];
        setDocumentImageUrl(documentUrl);
        setSelfieImageUrl(selfieUrl);
      } catch (e) {
        setEvidenceError(e instanceof Error ? e.message : 'Could not load submitted document images.');
      } finally {
        setIsLoadingEvidence(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load KYC details.');
    }
  };

  const closeDrawer = () => {
    revokeEvidenceUrls();
    setDocumentImageUrl(null);
    setSelfieImageUrl(null);
    setSelected(null);
  };

  const decide = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (!selected) return;
    if (decision === 'REJECTED' && !notes.trim()) {
      setDecideError('A rejection reason is required.');
      return;
    }
    setDecideError('');
    setIsDeciding(true);
    try {
      await decideCanonicalAdminKyc(selected.id, decision, notes.trim());
      closeDrawer();
      setNotes('');
      await load();
    } catch (e) {
      setDecideError(e instanceof Error ? e.message : 'Could not save the KYC decision.');
    } finally {
      setIsDeciding(false);
    }
  };

  const canDecide = selected ? DECIDABLE.includes(selected.status) : false;

  return (
    <div className="panel">
      {/* ── header ── */}
      <div className="panel__header">
        <div>
          <h2>Canonical KYC Workspace</h2>
          <p>Identity records from the file-based canonical verification service.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onClose}>
          Back to all queues
        </button>
      </div>

      {error && <div className="empty-state" role="alert">{error}</div>}

      {/* ── tabs ── */}
      <div className="filters-row" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            className={`btn btn-sm ${tab === name ? 'btn-gradient' : 'btn-outline'}`}
            onClick={() => setTab(name)}
          >
            {name} ({rows.filter((row) => inTab(row, name)).length})
          </button>
        ))}
      </div>

      {/* ── list table ── */}
      <div className="table-scroll">
        <table className="risk-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Document</th>
              <th>Country</th>
              <th>Attempts</th>
              <th>Risk</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  No records in this tab.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr
                key={row.id}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                className={selected?.id === row.id ? 'row--selected' : ''}
                onClick={() => void open(row)}
                onKeyDown={(e) => e.key === 'Enter' && void open(row)}
              >
                <td>{row.extracted_full_name || `User ${row.user_id.slice(0, 8)}…`}</td>
                <td>{row.user_email}</td>
                <td>{row.document_type || '—'}</td>
                <td>{row.document_country}</td>
                <td>{row.attempts_count}</td>
                <td>{row.risk_level} ({row.risk_score})</td>
                <td>{fmt(row.created_at)}</td>
                <td><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── detail drawer ── */}
      {selected && (
        <div className="case-drawer">
          {/* drawer header */}
          <div className="case-drawer__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0 }}>
                {selected.extracted_full_name || selected.user_email}
              </h2>
              <StatusBadge status={selected.status} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={closeDrawer}>
              Close
            </button>
          </div>

          {/* submitted evidence */}
          <h3 style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Submitted Evidence
          </h3>
          {isLoadingEvidence && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading document and selfie…</p>}
          {evidenceError && <p style={{ fontSize: 13, color: 'var(--red-primary)' }} role="alert">{evidenceError}</p>}
          {!isLoadingEvidence && !evidenceError && (documentImageUrl || selfieImageUrl) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div>
                <span className="kyc-detail-label" style={{ display: 'block', marginBottom: 6 }}>ID Document</span>
                {documentImageUrl
                  ? <img src={documentImageUrl} alt="Submitted ID document" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                  : <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not available</span>}
              </div>
              <div>
                <span className="kyc-detail-label" style={{ display: 'block', marginBottom: 6 }}>Selfie</span>
                {selfieImageUrl
                  ? <img src={selfieImageUrl} alt="Submitted selfie" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                  : <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not available</span>}
              </div>
            </div>
          )}

          {/* personal / document details */}
          <div className="kyc-detail-grid">
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Email</span>
              <span>{selected.user_email}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Date of Birth</span>
              <span>{selected.extracted_date_of_birth || '—'}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Nationality</span>
              <span>{selected.extracted_nationality || '—'}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Document Type</span>
              <span>{selected.document_type || '—'}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Document Number</span>
              <span>••••{selected.document_number_last4 || '—'}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Expiry Date</span>
              <span>{selected.document_expiry_date || '—'}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Risk Level</span>
              <span>{selected.risk_level} ({selected.risk_score})</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Attempts</span>
              <span>{selected.attempts_count}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Country</span>
              <span>{selected.document_country}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Started</span>
              <span>{fmt(selected.verification_started_at)}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Completed</span>
              <span>{fmt(selected.verification_completed_at)}</span>
            </div>
            <div className="kyc-detail-field">
              <span className="kyc-detail-label">Verified</span>
              <span>{fmt(selected.verified_at)}</span>
            </div>
            {selected.retry_reason && (
              <div className="kyc-detail-field kyc-detail-field--full">
                <span className="kyc-detail-label">Retry Reason</span>
                <span>{selected.retry_reason}</span>
              </div>
            )}
            {selected.rejection_reason && (
              <div className="kyc-detail-field kyc-detail-field--full">
                <span className="kyc-detail-label">Rejection Reason</span>
                <span style={{ color: 'var(--red-primary)' }}>{selected.rejection_reason}</span>
              </div>
            )}
          </div>

          {/* automated checks */}
          {selected.checks.length > 0 && (
            <>
              <h3 style={{ margin: '20px 0 10px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Automated Checks
              </h3>
              <div className="table-scroll">
                <table className="risk-table">
                  <thead>
                    <tr>
                      <th>Check</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.checks.map((check) => (
                      <tr key={check.id}>
                        <td>{check.check_type}</td>
                        <td>{check.status}</td>
                        <td>{check.score ?? '—'}</td>
                        <td>{check.confidence ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* decision panel — shown for all decidable statuses */}
          {canDecide && (
            <div className="case-decision-panel">
              <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Admin Decision
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                {selected.status === 'REVIEW'
                  ? 'This submission is awaiting manual review. Verify or reject below.'
                  : `Current status is ${selected.status}. You can override this with an admin decision.`}
              </p>

              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Decision Notes{selected.status !== 'REVIEW' ? '' : ' — required for rejection'}
                </span>
                <textarea
                  className="case-notes-textarea"
                  rows={3}
                  placeholder="Enter notes or reason for this decision…"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setDecideError(''); }}
                />
              </label>

              {decideError && (
                <p style={{ color: 'var(--red-primary)', fontSize: 13, margin: '0 0 12px' }} role="alert">
                  {decideError}
                </p>
              )}

              <div className="case-actions">
                <button
                  className="btn btn-gradient"
                  disabled={isDeciding}
                  onClick={() => void decide('VERIFIED')}
                >
                  {isDeciding ? 'Saving…' : '✓ Verify'}
                </button>
                <button
                  className="btn btn-danger"
                  disabled={isDeciding}
                  onClick={() => void decide('REJECTED')}
                >
                  {isDeciding ? 'Saving…' : '✕ Reject'}
                </button>
              </div>
            </div>
          )}

          {/* read-only status for non-decidable records */}
          {!canDecide && (
            <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {selected.status === 'VERIFIED'
                ? 'This identity has been verified. No further action is required.'
                : selected.status === 'EXPIRED'
                  ? 'This verification session has expired. The fan will need to re-submit.'
                  : 'No admin action is available for this status.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
