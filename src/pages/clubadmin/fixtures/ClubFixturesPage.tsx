import { useState } from 'react';
import {
  FiCalendar, FiPlus, FiDownload, FiMapPin, FiCheck,
  FiAlertCircle, FiX, FiEdit2, FiSend, FiClock, FiRefreshCw,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubFixturesPage.css';

type Fixture = {
  date: string; opponent: string; comp: string; venue: string;
  h_a: string; tickets: number; result: string | null; status: string;
  dataSource: 'verified' | 'club_submitted' | 'pending';
};

type SubStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_revision';

type FixtureCorrection = {
  id: string;
  fixtureIdx: number;
  correctionType: string;
  description: string;
  submittedAt: string;
  status: SubStatus;
  feedback: string;
};

const COMPS = ['UPL', 'Uganda Cup', 'CAF CC', 'Friendly'];
const CORRECTION_TYPES = ['Result', 'Date', 'Venue', 'Opponent', 'Competition', 'Home/Away', 'Other'];

const SUB_STATUS_META: Record<SubStatus, { label: string; color: string; icon: typeof FiClock }> = {
  pending_review: { label: 'Pending Review', color: '#eab308', icon: FiClock },
  approved:       { label: 'Approved',       color: '#22c55e', icon: FiCheck },
  rejected:       { label: 'Rejected',       color: '#ef4444', icon: FiAlertCircle },
  needs_revision: { label: 'Needs Revision', color: '#f97316', icon: FiAlertCircle },
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Fixture = { date: '', opponent: '', comp: 'UPL', venue: '', h_a: 'Home', tickets: 0, result: null, status: 'upcoming', dataSource: 'pending' };

type ModalKind = null | 'add' | 'correct' | 'revise';

let corrCounter = 10;

export default function ClubFixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [corrections, setCorrections] = useState<FixtureCorrection[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [form, setForm] = useState<Fixture>(BLANK);
  const [correctFixtureIdx, setCorrectFixtureIdx] = useState<number | null>(null);
  const [corrType, setCorrType] = useState(CORRECTION_TYPES[0]);
  const [corrDesc, setCorrDesc] = useState('');
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const set = (k: keyof Fixture) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addFixture = () => {
    if (!form.opponent.trim() || !form.date.trim()) return;
    setFixtures(prev => [{ ...form, dataSource: 'pending' }, ...prev]);
    showToast(`Fixture vs ${form.opponent} submitted for review`);
    setModal(null);
    setForm(BLANK);
  };

  const openCorrect = (idx: number) => {
    setCorrectFixtureIdx(idx);
    setCorrType(CORRECTION_TYPES[0]);
    setCorrDesc('');
    setReviseId(null);
    setModal('correct');
  };

  const openRevise = (corr: FixtureCorrection) => {
    setCorrectFixtureIdx(corr.fixtureIdx);
    setCorrType(corr.correctionType);
    setCorrDesc(corr.description);
    setReviseId(corr.id);
    setModal('revise');
  };

  const submitCorrection = () => {
    if (correctFixtureIdx === null || !corrDesc.trim()) return;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const fix = fixtures[correctFixtureIdx];

    if (reviseId) {
      setCorrections(prev => prev.map(c => c.id === reviseId
        ? { ...c, correctionType: corrType, description: corrDesc, status: 'pending_review', feedback: '', submittedAt: today }
        : c));
      showToast('Correction resubmitted to League OS');
    } else {
      const newId = `fc-${String(corrCounter++).padStart(3, '0')}`;
      setCorrections(prev => [...prev, {
        id: newId, fixtureIdx: correctFixtureIdx,
        correctionType: corrType, description: corrDesc,
        submittedAt: today, status: 'pending_review', feedback: '',
      }]);
      showToast(`Correction for ${fix.opponent} submitted`);
    }
    setModal(null);
  };

  const pendingCorr = corrections.filter(c => c.status === 'pending_review').length;
  const needsRevision = corrections.filter(c => c.status === 'needs_revision');

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Add Fixture modal */}
      {modal === 'add' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Add Fixture</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Opponent *</label>
                  <input className="ca-input" value={form.opponent} onChange={set('opponent')} placeholder="Opponent club name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Date *</label>
                  <input className="ca-input" value={form.date} onChange={set('date')} placeholder="e.g. Sun 18 May 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Competition</label>
                  <select className="ca-select" value={form.comp} onChange={set('comp')}>
                    {COMPS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Venue</label>
                  <input className="ca-input" value={form.venue} onChange={set('venue')} placeholder="Stadium name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Home / Away</label>
                  <select className="ca-select" value={form.h_a} onChange={set('h_a')}>
                    <option value="Home">Home</option>
                    <option value="Away">Away</option>
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Expected Tickets</label>
                  <input className="ca-input" type="number" value={form.tickets}
                    onChange={e => setForm(f => ({ ...f, tickets: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={addFixture}>
                <FiSend /> Submit to League OS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixture Correction / Revise modal */}
      {(modal === 'correct' || modal === 'revise') && correctFixtureIdx !== null && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'revise' ? 'Revise Correction' : 'Submit Fixture Correction'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>

            {modal === 'revise' && reviseId && (() => {
              const corr = corrections.find(c => c.id === reviseId);
              return corr?.feedback ? (
                <div className="ca-revision-banner">
                  <FiAlertCircle style={{ color: '#f97316', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reviewer Feedback</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{corr.feedback}</p>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="ca-modal-body">
              <div className="ca-correction-fixture-ref">
                <FiCalendar style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    vs {fixtures[correctFixtureIdx].opponent}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {fixtures[correctFixtureIdx].date} · {fixtures[correctFixtureIdx].comp}
                  </p>
                </div>
                <span className="ca-data-badge ca-data-badge-verified" style={{ marginLeft: 'auto' }}>
                  <FiCheck style={{ fontSize: '0.7rem' }} /> Verified
                </span>
              </div>

              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Correction Type *</label>
                  <select className="ca-select" value={corrType} onChange={e => setCorrType(e.target.value)}>
                    {CORRECTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description of Correction *</label>
                  <textarea
                    className="ca-textarea"
                    rows={4}
                    value={corrDesc}
                    onChange={e => setCorrDesc(e.target.value)}
                    placeholder="Describe the error and what the correct information should be…"
                  />
                </div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Corrections are reviewed by League OS data administrators before being published to fans.
              </p>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={submitCorrection}>
                <FiSend /> {modal === 'revise' ? 'Resubmit Correction' : 'Submit Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Fixtures &amp; Match Operations</h1>
          <p className="ca-page-subtitle">Plan, schedule and submit fixture information for League OS review.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(fixtures as unknown as Record<string, unknown>[], 'fixtures.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => { setForm(BLANK); setModal('add'); }}>
            <FiPlus /> Add Fixture
          </button>
        </div>
      </div>

      {needsRevision.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {needsRevision.map(corr => (
            <div key={corr.id} className="ca-revision-alert">
              <FiAlertCircle style={{ color: '#f97316', fontSize: '1rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>
                  Revision required: {corr.correctionType} correction — {fixtures[corr.fixtureIdx]?.opponent ?? 'fixture'}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {corr.feedback}
                </p>
              </div>
              <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => openRevise(corr)}>
                <FiRefreshCw /> Revise
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">All Fixtures</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="ca-panel-count">{fixtures.length} fixtures</span>
                <div className="ca-legend">
                  <span className="ca-legend-dot" style={{ background: '#22c55e' }} /><span>Verified</span>
                  <span className="ca-legend-dot" style={{ background: '#eab308', marginLeft: 8 }} /><span>Pending</span>
                </div>
              </div>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Date</th><th>Opponent</th><th>Comp</th><th>Venue</th><th>H/A</th><th>Result</th><th>Data</th><th></th></tr>
                </thead>
                <tbody>
                  {fixtures.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No fixtures added yet. Use "Add Fixture" to submit one.</td></tr>
                  )}
                  {fixtures.map((f, i) => (
                    <tr key={i} className={f.dataSource === 'pending' ? 'ca-row-pending' : ''}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        <FiCalendar style={{ marginRight: 5, opacity: 0.5 }} />{f.date}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{f.opponent}</td>
                      <td>{f.comp}</td>
                      <td><FiMapPin style={{ marginRight: 4, opacity: 0.5 }} />{f.venue || '—'}</td>
                      <td><span className={`ca-pill ${f.h_a === 'Home' ? 'ca-pill-purple' : 'ca-pill-blue'}`}>{f.h_a}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{f.result || '—'}</td>
                      <td>
                        {f.dataSource === 'verified'
                          ? <span className="ca-data-badge ca-data-badge-verified"><FiCheck style={{ fontSize: '0.7rem' }} /> Verified</span>
                          : <span className="ca-data-badge ca-data-badge-pending"><FiClock style={{ fontSize: '0.7rem' }} /> Pending</span>
                        }
                      </td>
                      <td>
                        <button type="button" className="ca-icon-btn" title="Submit Correction" onClick={() => openCorrect(i)}>
                          <FiEdit2 />
                        </button>
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
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Correction Queue</h2>
              <span className="ca-panel-count">{pendingCorr} pending</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {corrections.length === 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>No corrections submitted.</p>
              )}
              {corrections.map(corr => {
                const meta = SUB_STATUS_META[corr.status];
                const Icon = meta.icon;
                const fix = fixtures[corr.fixtureIdx];
                return (
                  <div key={corr.id} className="ca-sub-item">
                    <div className="ca-sub-item-top">
                      <Icon style={{ color: meta.color, fontSize: '0.9rem', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                          {corr.correctionType} — {fix?.opponent ?? 'fixture'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {fix?.date} · submitted {corr.submittedAt}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', flexShrink: 0 }}>
                        {meta.label}
                      </span>
                    </div>
                    {corr.feedback && (
                      <div className="ca-sub-feedback">
                        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                          <strong style={{ color: '#f97316' }}>Reviewer: </strong>{corr.feedback}
                        </p>
                        {corr.status === 'needs_revision' && (
                          <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" style={{ marginTop: 6 }} onClick={() => openRevise(corr)}>
                            <FiRefreshCw /> Revise &amp; Resubmit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
