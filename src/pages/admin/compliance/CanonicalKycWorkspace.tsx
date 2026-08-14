import { useEffect, useMemo, useState } from 'react';
import { decideCanonicalAdminKyc, fetchCanonicalAdminKyc, fetchCanonicalAdminKycDetail, type AdminKycRecord } from '../../../services/canonicalKycAdminService';

type Tab = 'Pending / Processing' | 'Manual Review' | 'Retry Required' | 'Verified' | 'Rejected';
const TABS: Tab[] = ['Pending / Processing', 'Manual Review', 'Retry Required', 'Verified', 'Rejected'];
function inTab(row: AdminKycRecord, tab: Tab) {
  if (tab === 'Pending / Processing') return ['NOT_STARTED', 'PENDING', 'PROCESSING'].includes(row.status);
  if (tab === 'Manual Review') return row.status === 'REVIEW';
  if (tab === 'Retry Required') return row.status === 'RETRY_REQUIRED';
  if (tab === 'Verified') return row.status === 'VERIFIED';
  return ['REJECTED', 'EXPIRED'].includes(row.status);
}
const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—';

export default function CanonicalKycWorkspace({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AdminKycRecord[]>([]); const [tab, setTab] = useState<Tab>('Pending / Processing');
  const [selected, setSelected] = useState<AdminKycRecord | null>(null); const [error, setError] = useState(''); const [notes, setNotes] = useState('');
  const load = () => fetchCanonicalAdminKyc().then(setRows).catch((value) => setError(value instanceof Error ? value.message : 'Could not load canonical KYC records.'));
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => rows.filter((row) => inTab(row, tab)), [rows, tab]);
  const open = async (row: AdminKycRecord) => { setError(''); try { setSelected(await fetchCanonicalAdminKycDetail(row.id)); } catch (value) { setError(value instanceof Error ? value.message : 'Could not load KYC details.'); } };
  const decide = async (decision: 'VERIFIED' | 'REJECTED') => { if (!selected) return; try { await decideCanonicalAdminKyc(selected.id, decision, notes); setSelected(null); setNotes(''); await load(); } catch (value) { setError(value instanceof Error ? value.message : 'Could not save the KYC decision.'); } };
  return <div className="panel">
    <div className="panel__header"><div><h2>Canonical KYC Workspace</h2><p>Identity records from the file-based canonical verification service.</p></div><button className="btn btn-outline btn-sm" onClick={onClose}>Back to all queues</button></div>
    {error && <div className="empty-state" role="alert">{error}</div>}
    <div className="filters-row" role="tablist">{TABS.map((name) => <button className={`btn btn-sm ${tab === name ? 'btn-gradient' : 'btn-outline'}`} key={name} onClick={() => setTab(name)}>{name} ({rows.filter((row) => inTab(row, name)).length})</button>)}</div>
    <div className="table-scroll"><table className="risk-table"><thead><tr><th>User</th><th>Email</th><th>Document</th><th>Country</th><th>Attempts</th><th>Risk</th><th>Submitted</th><th>Status</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} role="button" tabIndex={0} onClick={() => void open(row)}><td>{row.extracted_full_name || `User ${row.user_id.slice(0, 8)}…`}</td><td>{row.user_email}</td><td>{row.document_type || '—'}</td><td>{row.document_country}</td><td>{row.attempts_count}</td><td>{row.risk_level} ({row.risk_score})</td><td>{date(row.created_at)}</td><td>{row.status}</td></tr>)}</tbody></table></div>
    {selected && <div className="case-drawer"><div className="case-drawer__header"><h2>{selected.extracted_full_name || selected.user_email}</h2><button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button></div>
      <div className="wiz-kv-grid"><p><b>DOB:</b> {selected.extracted_date_of_birth || '—'}</p><p><b>Nationality:</b> {selected.extracted_nationality || '—'}</p><p><b>Document:</b> {selected.document_type} ••••{selected.document_number_last4 || '—'}</p><p><b>Expiry:</b> {selected.document_expiry_date || '—'}</p><p><b>Risk:</b> {selected.risk_level} ({selected.risk_score})</p><p><b>Attempts:</b> {selected.attempts_count}</p><p><b>Retry reason:</b> {selected.retry_reason || '—'}</p><p><b>Rejection reason:</b> {selected.rejection_reason || '—'}</p><p><b>Started:</b> {date(selected.verification_started_at)}</p><p><b>Completed:</b> {date(selected.verification_completed_at)}</p><p><b>Verified:</b> {date(selected.verified_at)}</p></div>
      <h3>Automated checks</h3><div className="table-scroll"><table className="risk-table"><thead><tr><th>Check</th><th>Status</th><th>Score</th><th>Confidence</th></tr></thead><tbody>{selected.checks.map((check) => <tr key={check.id}><td>{check.check_type}</td><td>{check.status}</td><td>{check.score ?? '—'}</td><td>{check.confidence ?? '—'}</td></tr>)}</tbody></table></div>
      {selected.status === 'REVIEW' && <><label className="wiz-field"><span>Decision notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="case-actions"><button className="btn btn-gradient" onClick={() => void decide('VERIFIED')}>Verify</button><button className="btn btn-danger" onClick={() => void decide('REJECTED')}>Reject</button></div></>}
      {selected.status === 'RETRY_REQUIRED' && <p>Retry was requested by the verification service. No safe admin Request Retry endpoint is available.</p>}
    </div>}
  </div>;
}
