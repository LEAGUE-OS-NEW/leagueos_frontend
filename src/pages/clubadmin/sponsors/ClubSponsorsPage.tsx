import { useState } from 'react';
import { FiPlus, FiDownload, FiX } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubSponsorsPage.css';

const TIERS = ['Title', 'Gold', 'Silver', 'Bronze'];
type SponsorStatus = 'active' | 'negotiating' | 'pending';
type Sponsor = { name: string; tier: string; value: string; start: string; end: string; status: SponsorStatus };
type BenefitItem = { sponsor: string; benefit: string; done: boolean };


const TIER_CLASS: Record<string, string> = {
  Title: 'ca-pill-purple', Gold: 'ca-pill-orange', Silver: 'ca-pill-blue', Bronze: 'ca-pill-muted',
};
const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', negotiating: 'ca-pill-orange', pending: 'ca-pill-muted',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Sponsor = { name: '', tier: 'Gold', value: '', start: '', end: '', status: 'pending' };

export default function ClubSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Sponsor>(BLANK);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof Sponsor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addSponsor = () => {
    if (!form.name.trim()) return;
    setSponsors(prev => [...prev, form]);
    showToast(`${form.name} added as sponsor`);
    setShowModal(false);
    setForm(BLANK);
  };

  const toggleBenefit = (idx: number) => {
    setBenefits(prev => prev.map((b, i) => i === idx ? { ...b, done: !b.done } : b));
    showToast('Benefit status updated');
  };

  const doneCount = benefits.filter(b => b.done).length;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {showModal && (
        <div className="ca-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Add Sponsor</h2>
              <button type="button" className="ca-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Company Name *</label>
                  <input className="ca-input" value={form.name} onChange={set('name')} placeholder="Sponsor company name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Tier</label>
                  <select className="ca-select" value={form.tier} onChange={set('tier')}>
                    {TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Contract Value</label>
                  <input className="ca-input" value={form.value} onChange={set('value')} placeholder="e.g. UGX 20M" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Start Date</label>
                  <input className="ca-input" value={form.start} onChange={set('start')} placeholder="e.g. 1 Jan 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">End Date</label>
                  <input className="ca-input" value={form.end} onChange={set('end')} placeholder="e.g. 31 Dec 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={form.status} onChange={set('status')}>
                    <option value="pending">Pending</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={addSponsor}><FiPlus /> Add Sponsor</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>

          <h1 className="ca-page-title">Sponsors &amp; Partnerships</h1>
          <p className="ca-page-subtitle">Manage sponsorships, agreements, partnerships and benefit delivery.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(sponsors as unknown as Record<string, unknown>[], 'sponsors.csv')}>
            <FiDownload /> Export Pipeline
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Sponsor</button>
        </div>
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Sponsor Directory</h2>
              <span className="ca-panel-count">{sponsors.length} sponsors</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Sponsor</th><th>Tier</th><th>Value</th><th>Start</th><th>End</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {sponsors.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No sponsors yet. Add a sponsor to track partnerships.</td></tr>
                  )}
                  {sponsors.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.name}</td>
                      <td><span className={`ca-pill ${TIER_CLASS[s.tier]}`}>{s.tier}</span></td>
                      <td style={{ fontWeight: 700 }}>{s.value}</td>
                      <td>{s.start}</td>
                      <td>{s.end}</td>
                      <td><span className={`ca-pill ${STATUS_CLASS[s.status]}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Benefit Delivery Checklist</h2>
              <span className="ca-panel-count">{doneCount} / {benefits.length} delivered</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {benefits.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className="ca-benefit-row"
                  onClick={() => toggleBenefit(i)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div className={`ca-benefit-dot ${b.done ? 'done' : ''}`} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{b.sponsor}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>—</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginLeft: 4 }}>{b.benefit}</span>
                  </div>
                  <span className={`ca-pill ${b.done ? 'ca-pill-green' : 'ca-pill-orange'}`} style={{ fontSize: '0.62rem' }}>
                    {b.done ? 'Done' : 'Pending'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Partnership Pipeline</h2></div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
              No pipeline deals yet. Add a sponsor to start tracking partnerships.
            </p>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Renewal Alerts</h2>
              <span className="ca-panel-count">0 upcoming</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
              No upcoming renewals.
            </p>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Sponsorship Activity</h2></div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
              No recent activity.
            </p>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
