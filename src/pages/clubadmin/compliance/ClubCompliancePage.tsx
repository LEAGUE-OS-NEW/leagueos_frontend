import { useState, useRef } from 'react';
import {
  FiUpload, FiFileText, FiCheck, FiX, FiDownload,
  FiSend, FiTrash2, FiAlertCircle,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubCompliancePage.css';

const TABS = ['Documents', 'Compliance', 'Communications'];

const DOC_TYPES = ['Policy', 'ID / Certificate', 'License', 'Contract', 'Financial', 'Other'];

type DocFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
};

type ComplianceTask = {
  id: string;
  label: string;
  sub: string;
  done: boolean;
  category: string;
};

type CommType = 'announcement' | 'notice' | 'circular';
type CommEntry = {
  id: string;
  type: CommType;
  title: string;
  body: string;
  sentAt: string;
};

const INIT_TASKS: ComplianceTask[] = [
  { id: 'ct1', label: 'Submit FUFA Club License', sub: 'Annual license renewal for FUFA affiliation', done: false, category: 'Licensing' },
  { id: 'ct2', label: 'Upload Certificate of Registration', sub: 'Official club registration certificate', done: false, category: 'Registration' },
  { id: 'ct3', label: 'Player ID Document Verification', sub: 'All registered players must have verified IDs', done: false, category: 'Player Compliance' },
  { id: 'ct4', label: 'Financial Audit Submission', sub: 'Annual financial statements for league body', done: false, category: 'Finance' },
  { id: 'ct5', label: 'Anti-Doping Policy Acknowledgement', sub: 'Club officials must acknowledge the policy', done: false, category: 'Conduct' },
  { id: 'ct6', label: 'Stadium Safety Certificate', sub: 'Home ground safety certification', done: false, category: 'Venue' },
];

const COMM_LABELS: Record<CommType, string> = {
  announcement: 'Announcement',
  notice: 'Notice',
  circular: 'Circular',
};

const COMM_COLORS: Record<CommType, string> = {
  announcement: 'ca-pill-purple',
  notice: 'ca-pill-orange',
  circular: 'ca-pill-blue',
};

let idSeq = 100;
function nextId() { return `comp-${idSeq++}`; }

export default function ClubCompliancePage() {
  const [activeTab, setActiveTab] = useState('Documents');
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [tasks, setTasks] = useState<ComplianceTask[]>(INIT_TASKS);
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [commType, setCommType] = useState<CommType>('announcement');
  const [commTitle, setCommTitle] = useState('');
  const [commBody, setCommBody] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFilePick = (files: FileList | null) => {
    if (!files) return;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const newDocs: DocFile[] = Array.from(files).map(f => ({
      id: nextId(),
      name: f.name,
      type: docType,
      size: f.size > 1_048_576
        ? `${(f.size / 1_048_576).toFixed(1)} MB`
        : `${Math.round(f.size / 1024)} KB`,
      uploadedAt: today,
    }));
    setDocs(prev => [...prev, ...newDocs]);
    showToast(`${newDocs.length} document${newDocs.length > 1 ? 's' : ''} uploaded`);
  };

  const removeDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    showToast('Document removed');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const sendComm = () => {
    if (!commTitle.trim() || !commBody.trim()) return;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setComms(prev => [
      { id: nextId(), type: commType, title: commTitle, body: commBody, sentAt: today },
      ...prev,
    ]);
    setCommTitle('');
    setCommBody('');
    showToast(`${COMM_LABELS[commType]} sent`);
  };

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Compliance, Documents &amp; Communication</h1>
          <p className="ca-page-subtitle">Upload club documents, manage compliance checklists and send announcements.</p>
        </div>
        <div className="ca-page-actions">
          {activeTab === 'Documents' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={() => fileRef.current?.click()}>
              <FiUpload /> Upload Document
            </button>
          )}
          {activeTab === 'Communications' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={sendComm} disabled={!commTitle.trim() || !commBody.trim()}
              style={{ opacity: commTitle.trim() && commBody.trim() ? 1 : 0.5 }}>
              <FiSend /> Send
            </button>
          )}
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── DOCUMENTS TAB ── */}
      {activeTab === 'Documents' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <input
              ref={fileRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFilePick(e.target.files)}
            />
            <div
              className="ca-doc-upload-area"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
            >
              <div className="ca-doc-upload-icon"><FiUpload /></div>
              <p className="ca-doc-upload-label">Click to upload or drag &amp; drop</p>
              <p className="ca-doc-upload-hint">PDF, DOCX, JPG, PNG · Max 20 MB per file</p>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Uploaded Documents</h2>
                <span className="ca-panel-count">{docs.length} files</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>File Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th></th></tr>
                  </thead>
                  <tbody>
                    {docs.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No documents uploaded yet.</td></tr>
                    )}
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FiFileText style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />{d.name}
                        </td>
                        <td><span className="ca-doc-type-badge">{d.type}</span></td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{d.size}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{d.uploadedAt}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className="ca-icon-btn" title="Download" onClick={() => showToast(`Downloading ${d.name}…`)}><FiDownload /></button>
                            <button type="button" className="ca-icon-btn" title="Remove" onClick={() => removeDoc(d.id)}><FiTrash2 /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Document Type</h2></div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>Select type before uploading</p>
              <select className="ca-select" value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Document Summary</h2></div>
              {DOC_TYPES.map(type => {
                const count = docs.filter(d => d.type === type).length;
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{type}</span>
                    <span style={{ fontWeight: 700, color: count > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLIANCE TAB ── */}
      {activeTab === 'Compliance' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Compliance Checklist</h2>
                <span className="ca-panel-count">{doneCount} / {tasks.length} complete</span>
              </div>
              {tasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  className="ca-checklist-item"
                  onClick={() => toggleTask(task.id)}
                >
                  <div className={`ca-checklist-box${task.done ? ' done' : ''}`}>
                    {task.done && <FiCheck style={{ color: '#fff', fontSize: '0.7rem' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className={`ca-checklist-label${task.done ? ' done-text' : ''}`}>{task.label}</p>
                    <p className="ca-checklist-sub">{task.sub}</p>
                  </div>
                  <span className="ca-pill ca-pill-muted" style={{ fontSize: '0.62rem', flexShrink: 0 }}>{task.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Compliance Progress</h2></div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Overall Completion</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="ca-fill-bar-wrap" style={{ width: '100%' }}>
                  <div
                    className="ca-fill-bar"
                    style={{
                      width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%`,
                      background: doneCount === tasks.length ? '#22c55e' : 'var(--color-primary-light)',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>Completed</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{doneCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#f97316', fontWeight: 600 }}>Remaining</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{tasks.length - doneCount}</span>
                </div>
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Important Notes</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'All documents must be current and valid',
                  'FUFA license renewals are due annually',
                  'Player ID verification must be completed before fixtures',
                ].map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)', alignItems: 'flex-start' }}>
                    <FiAlertCircle style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMUNICATIONS TAB ── */}
      {activeTab === 'Communications' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Compose</h2></div>
              <div className="ca-comms-compose">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label className="ca-label" style={{ minWidth: 60, margin: 0 }}>Type</label>
                  <select className="ca-select" value={commType} onChange={e => setCommType(e.target.value as CommType)}>
                    <option value="announcement">Announcement</option>
                    <option value="notice">Notice</option>
                    <option value="circular">Circular</option>
                  </select>
                </div>
                <div>
                  <label className="ca-label">Title *</label>
                  <input className="ca-input" value={commTitle} onChange={e => setCommTitle(e.target.value)} placeholder="Communication title…" />
                </div>
                <div>
                  <label className="ca-label">Message *</label>
                  <textarea className="ca-textarea" rows={4} value={commBody} onChange={e => setCommBody(e.target.value)} placeholder="Write your message here…" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="ca-btn ca-btn-primary"
                    onClick={sendComm}
                    disabled={!commTitle.trim() || !commBody.trim()}
                    style={{ opacity: commTitle.trim() && commBody.trim() ? 1 : 0.5 }}
                  >
                    <FiSend /> Send {COMM_LABELS[commType]}
                  </button>
                </div>
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Communication History</h2>
                <span className="ca-panel-count">{comms.length} sent</span>
              </div>
              {comms.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No communications sent yet.</p>
              )}
              {comms.map(c => (
                <div key={c.id} className="ca-comms-log-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`ca-pill ${COMM_COLORS[c.type]}`} style={{ fontSize: '0.62rem' }}>{COMM_LABELS[c.type]}</span>
                    <span className="ca-comms-log-title">{c.title}</span>
                    <button type="button" className="ca-icon-btn" style={{ marginLeft: 'auto' }}
                      onClick={() => { setComms(prev => prev.filter(x => x.id !== c.id)); showToast('Removed from log'); }}>
                      <FiX />
                    </button>
                  </div>
                  <p className="ca-comms-log-body">{c.body}</p>
                  <span className="ca-comms-log-meta">Sent {c.sentAt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Communication Types</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {([
                  ['announcement', 'Announcement', 'General club news and updates for staff'],
                  ['notice', 'Notice', 'Official notices requiring attention'],
                  ['circular', 'Circular', 'Routine information for all parties'],
                ] as [CommType, string, string][]).map(([type, label, desc]) => (
                  <div key={type}>
                    <span className={`ca-pill ${COMM_COLORS[type]}`} style={{ fontSize: '0.62rem', marginBottom: 4, display: 'inline-block' }}>{label}</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Summary</h2></div>
              {(['announcement', 'notice', 'circular'] as CommType[]).map(type => {
                const count = comms.filter(c => c.type === type).length;
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{type}s</span>
                    <span style={{ fontWeight: 700, color: count > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
