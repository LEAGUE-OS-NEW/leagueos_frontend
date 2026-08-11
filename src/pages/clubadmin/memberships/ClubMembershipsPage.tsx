import { useState } from 'react';
import { FiPlus, FiDownload, FiX, FiRefreshCw } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubMembershipsPage.css';

const KPI = [
  { label: 'Total Members',   value: '8,642',      delta: '+4.1%',        up: true },
  { label: 'Active Members',  value: '7,256',      delta: '+7.7%',        up: true },
  { label: 'Due for Renewal', value: '532',        delta: 'next 30 days', up: null },
  { label: 'Expired',         value: '854',        delta: '-4.4%',        up: true },
  { label: 'Membership Rev.', value: 'UGX 124.6M', delta: '+14%',         up: true },
  { label: 'Active Rate',     value: '83.9%',      delta: '+2.1%',        up: true },
];

const TABS = ['Overview', 'Members', 'Plans', 'Renewals', 'Benefits'];

const PLANS = ['Standard', 'Premium Gold', 'Youth', 'Family'];
const PLAN_PRICES: Record<string, string> = {
  Standard: 'UGX 40,000/yr', 'Premium Gold': 'UGX 120,000/yr', Youth: 'UGX 20,000/yr', Family: 'UGX 80,000/yr',
};

type Status = 'active' | 'expired' | 'expiring';
type Member = { name: string; email: string; plan: string; start: string; expiry: string; payment: string; status: Status };

const INIT_MEMBERS: Member[] = [
  { name: 'Brian Ssempa',  email: 'b.ssempa@mail.com',  plan: 'Premium Gold', start: '10 Apr 2025', expiry: '10 Apr 2026', payment: 'UGX 120,000', status: 'active' },
  { name: 'Grace Nakirya', email: 'g.nakirya@mail.com', plan: 'Standard',     start: '15 Jan 2025', expiry: '15 Jan 2026', payment: 'UGX 40,000',  status: 'expired' },
  { name: 'David Kato',    email: 'd.kato@mail.com',    plan: 'Premium Gold', start: '5 Mar 2025',  expiry: '5 Mar 2026',  payment: 'UGX 120,000', status: 'active' },
  { name: 'Irene Nakato',  email: 'i.nakato@mail.com',  plan: 'Youth',        start: '20 Feb 2025', expiry: '20 Feb 2026', payment: 'UGX 20,000',  status: 'expiring' },
  { name: 'Peter Mugisha', email: 'p.mugisha@mail.com', plan: 'Standard',     start: '10 Nov 2024', expiry: '10 Nov 2025', payment: 'UGX 40,000',  status: 'expired' },
  { name: 'Joan Nassanga', email: 'j.nassanga@mail.com',plan: 'Family',       start: '1 Jun 2025',  expiry: '1 Jun 2026',  payment: 'UGX 80,000',  status: 'active' },
];

const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', expired: 'ca-pill-red', expiring: 'ca-pill-orange',
};

const BENEFITS = [
  { plan: 'Premium Gold', benefit: 'Priority matchday ticket access', included: true },
  { plan: 'Premium Gold', benefit: 'Exclusive behind-the-scenes content', included: true },
  { plan: 'Premium Gold', benefit: 'Free programme per home match', included: true },
  { plan: 'Standard', benefit: 'Early ticket booking access', included: true },
  { plan: 'Standard', benefit: 'Monthly newsletter', included: true },
  { plan: 'Youth', benefit: 'Youth academy newsletter', included: true },
  { plan: 'Family', benefit: 'Family zone seating priority', included: true },
  { plan: 'Family', benefit: '10% store discount', included: false },
];

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Omit<Member, 'status'> = { name: '', email: '', plan: 'Standard', start: '', expiry: '', payment: '' };

export default function ClubMembershipsPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [members, setMembers] = useState<Member[]>(INIT_MEMBERS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addMember = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const payment = PLAN_PRICES[form.plan] ?? '';
    setMembers(prev => [...prev, { ...form, payment, status: 'active' }]);
    showToast(`${form.name} added as member`);
    setShowModal(false);
    setForm(BLANK);
  };

  const renewMember = (name: string) => {
    setMembers(prev => prev.map(m => m.name === name ? { ...m, status: 'active' } : m));
    showToast(`Renewal reminder sent to ${name}`);
  };

  const filtered = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.plan.toLowerCase().includes(search.toLowerCase()));
  const expiring = members.filter(m => m.status === 'expiring' || m.status === 'expired');

  const planCounts = PLANS.map(p => ({
    name: p, price: PLAN_PRICES[p], members: members.filter(m => m.plan === p).length,
    pct: Math.round(members.filter(m => m.plan === p).length / Math.max(members.length, 1) * 100),
  }));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {showModal && (
        <div className="ca-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Add Member</h2>
              <button type="button" className="ca-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Full Name *</label>
                  <input className="ca-input" value={form.name} onChange={set('name')} placeholder="Member full name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Email *</label>
                  <input className="ca-input" type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Membership Plan</label>
                  <select className="ca-select" value={form.plan} onChange={set('plan')}>
                    {PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Start Date</label>
                  <input className="ca-input" type="date" value={form.start} onChange={set('start')} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Expiry Date</label>
                  <input className="ca-input" type="date" value={form.expiry} onChange={set('expiry')} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={addMember}><FiPlus /> Add Member</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-05</p>
          <h1 className="ca-page-title">Memberships &amp; Renewals</h1>
          <p className="ca-page-subtitle">Manage club memberships, plans, renewals and member benefits.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(members as unknown as Record<string, unknown>[], 'members.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Member</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className={`ca-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : 'neutral'}`}>
              {k.up === true ? '↑ ' : ''}{k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW & MEMBERS */}
      {(activeTab === 'Overview' || activeTab === 'Members') && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Member Directory</h2>
                {activeTab === 'Members' && (
                  <input className="ca-input" style={{ maxWidth: 220, padding: '6px 10px', fontSize: '0.8rem' }}
                    placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
                )}
                <span className="ca-panel-count">{filtered.length} shown</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Name</th><th>Plan</th><th>Joined</th><th>Expires</th><th>Payment</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.name}</td>
                        <td>{m.plan}</td>
                        <td>{m.start || '—'}</td>
                        <td>{m.expiry || '—'}</td>
                        <td>{m.payment}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[m.status]}`}>{m.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Membership Plans</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {planCounts.map(p => (
                  <div key={p.name} className="ca-plan-card">
                    <div className="ca-plan-info">
                      <span className="ca-plan-name">{p.name}</span>
                      <span className="ca-plan-price">{p.price}</span>
                    </div>
                    <div className="ca-plan-members">{p.members.toLocaleString()}</div>
                    <div className="ca-channel-bar-wrap" style={{ width: '80px' }}>
                      <div className="ca-channel-bar" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="ca-channel-pct">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Expiry Alerts</h2>
                <span className="ca-panel-count">{expiring.length} soon</span>
              </div>
              {expiring.map((e, i) => (
                <div key={i} className="ca-alert-item" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div className="ca-alert-dot-orange" />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{e.name}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{e.plan} · expires {e.expiry}</p>
                    </div>
                  </div>
                  <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => renewMember(e.name)}>
                    <FiRefreshCw /> Remind
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLANS */}
      {activeTab === 'Plans' && (
        <div className="ca-panel">
          <div className="ca-panel-header"><h2 className="ca-panel-title">Membership Plans</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
            {planCounts.map(p => (
              <div key={p.name} className="ca-panel" style={{ background: 'rgba(255,255,255,0.03)', margin: 0 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{p.name}</p>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>{p.price}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  <span>Members</span><span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{p.members}</span>
                </div>
                <div className="ca-channel-bar-wrap" style={{ marginTop: 10, width: '100%' }}>
                  <div className="ca-channel-bar" style={{ width: `${p.pct}%` }} />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.pct}% of total members</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENEWALS */}
      {activeTab === 'Renewals' && (
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">Members Due for Renewal</h2>
            <span className="ca-panel-count">{expiring.length} members</span>
          </div>
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead><tr><th>Name</th><th>Plan</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {expiring.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.name}</td>
                    <td>{m.plan}</td>
                    <td>{m.expiry}</td>
                    <td><span className={`ca-pill ${STATUS_CLASS[m.status]}`}>{m.status}</span></td>
                    <td>
                      <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => renewMember(m.name)}>
                        <FiRefreshCw /> Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
                {expiring.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No renewals due. All members are active.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BENEFITS */}
      {activeTab === 'Benefits' && (
        <div className="ca-panel">
          <div className="ca-panel-header"><h2 className="ca-panel-title">Member Benefits by Plan</h2></div>
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead><tr><th>Plan</th><th>Benefit</th><th>Status</th></tr></thead>
              <tbody>
                {BENEFITS.map((b, i) => (
                  <tr key={i}>
                    <td><span className="ca-pill ca-pill-purple" style={{ fontSize: '0.65rem' }}>{b.plan}</span></td>
                    <td style={{ color: 'var(--color-text-primary)' }}>{b.benefit}</td>
                    <td><span className={`ca-pill ${b.included ? 'ca-pill-green' : 'ca-pill-muted'}`}>{b.included ? 'Included' : 'Not Included'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
