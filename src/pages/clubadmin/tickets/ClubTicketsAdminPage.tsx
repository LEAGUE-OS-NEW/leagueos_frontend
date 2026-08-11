import { useState } from 'react';
import { FiPlus, FiDownload, FiSettings, FiX } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubTicketsAdminPage.css';

const KPI = [
  { label: 'Active Events',  value: '4',           delta: 'this month', up: null },
  { label: 'Ticket Types',   value: '4',           delta: 'categories', up: null },
  { label: 'Tickets Sold',   value: '12,842',      delta: '+8.3%', up: true },
  { label: 'Ticket Revenue', value: 'UGX 256.4M',  delta: '+11%', up: true },
  { label: 'Checked In',     value: '9,241',       delta: '72% rate', up: true },
];

type EventStatus = 'on sale' | 'pending' | 'sold out';
type MatchEvent = { match: string; date: string; sold: number; cap: number; rev: string; status: EventStatus };

const INIT_EVENTS: MatchEvent[] = [
  { match: 'KCCA FC vs SC Villa',   date: '18 May 2026', sold: 4200, cap: 6000, rev: 'UGX 84M',  status: 'on sale' },
  { match: 'KCCA FC vs BUL FC',     date: '28 May 2026', sold: 1800, cap: 6000, rev: 'UGX 36M',  status: 'on sale' },
  { match: 'KCCA FC vs Maroons FC', date: '8 Jun 2026',  sold: 0,    cap: 6000, rev: '—',         status: 'pending' },
  { match: 'KCCA FC vs Vipers SC',  date: '22 Jun 2026', sold: 0,    cap: 6000, rev: '—',         status: 'pending' },
];

const TICKET_TYPES = [
  { name: 'VIP Lounge',    price: 'UGX 50,000', sold: 320,  cap: 400  },
  { name: 'East Stand',    price: 'UGX 30,000', sold: 1840, cap: 2500 },
  { name: 'West Stand',    price: 'UGX 20,000', sold: 1560, cap: 2000 },
  { name: 'North Terrace', price: 'UGX 10,000', sold: 480,  cap: 1100 },
];

const SALES_BY_CAT = [
  { cat: 'VIP Lounge',    pct: 80, color: '#7c3aed' },
  { cat: 'East Stand',    pct: 74, color: '#3b82f6' },
  { cat: 'West Stand',    pct: 78, color: '#22c55e' },
  { cat: 'North Terrace', pct: 44, color: '#f97316' },
];

const ACTIVITY = [
  { text: '4,200 tickets sold — KCCA FC vs SC Villa', time: '2h ago' },
  { text: 'Refund processed for Order #TK-8821', time: '4h ago' },
  { text: 'VIP Lounge almost full — 80% capacity', time: '6h ago' },
  { text: 'Group booking of 120 seats confirmed', time: '1d ago' },
];

const STATUS_CLASS: Record<string, string> = {
  'on sale': 'ca-pill-green', pending: 'ca-pill-orange', 'sold out': 'ca-pill-red',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: MatchEvent = { match: '', date: '', sold: 0, cap: 6000, rev: '—', status: 'pending' };
type ModalKind = null | 'create' | 'seating';

export default function ClubTicketsAdminPage() {
  const [events, setEvents] = useState<MatchEvent[]>(INIT_EVENTS);
  const [modal, setModal] = useState<ModalKind>(null);
  const [form, setForm] = useState<MatchEvent>(BLANK);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof MatchEvent) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: k === 'cap' ? Number(e.target.value) : e.target.value }));

  const createEvent = () => {
    if (!form.match.trim() || !form.date.trim()) return;
    setEvents(prev => [...prev, form]);
    showToast(`Event "${form.match}" created`);
    setModal(null);
    setForm(BLANK);
  };

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {modal === 'create' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Create Match Event</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Match *</label>
                  <input className="ca-input" value={form.match} onChange={set('match')} placeholder="e.g. KCCA FC vs SC Villa" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Match Date *</label>
                  <input className="ca-input" value={form.date} onChange={set('date')} placeholder="e.g. 18 May 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Capacity</label>
                  <input className="ca-input" type="number" min="1" value={form.cap} onChange={e => setForm(f => ({ ...f, cap: Number(e.target.value) }))} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={form.status} onChange={set('status')}>
                    <option value="pending">Pending</option>
                    <option value="on sale">On Sale</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={createEvent}><FiPlus /> Create Event</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'seating' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Manage Seating</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TICKET_TYPES.map(t => (
                  <div key={t.name} className="ca-panel" style={{ margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{t.name}</p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--color-primary-light)', fontWeight: 700 }}>{t.price}</p>
                    <div className="ca-fill-bar-wrap" style={{ width: '100%' }}>
                      <div className="ca-fill-bar" style={{ width: `${Math.round(t.sold / t.cap * 100)}%` }} />
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t.sold.toLocaleString()} / {t.cap.toLocaleString()} sold</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-primary" onClick={() => { showToast('Seating config saved'); setModal(null); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-06</p>
          <h1 className="ca-page-title">Ticketing &amp; Match Events</h1>
          <p className="ca-page-subtitle">Manage match events, ticket types, seating and match-day check-in.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal('seating')}><FiSettings /> Manage Seating</button>
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(events as unknown as Record<string, unknown>[], 'events.csv')}>
            <FiDownload /> Export Data
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setModal('create')}><FiPlus /> Create Event</button>
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

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Upcoming Match Events</h2>
              <span className="ca-panel-count">{events.length} events</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Match</th><th>Date</th><th>Sold</th><th>Capacity</th><th>Revenue</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{e.match}</td>
                      <td>{e.date}</td>
                      <td>{e.sold > 0 ? e.sold.toLocaleString() : '—'}</td>
                      <td>{e.cap.toLocaleString()}</td>
                      <td>{e.rev}</td>
                      <td><span className={`ca-pill ${STATUS_CLASS[e.status]}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Ticket Types &amp; Pricing</h2></div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Category</th><th>Price</th><th>Sold</th><th>Capacity</th><th>Fill Rate</th></tr>
                </thead>
                <tbody>
                  {TICKET_TYPES.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.name}</td>
                      <td>{t.price}</td>
                      <td>{t.sold.toLocaleString()}</td>
                      <td>{t.cap.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="ca-fill-bar-wrap">
                            <div className="ca-fill-bar" style={{ width: `${Math.round(t.sold / t.cap * 100)}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{Math.round(t.sold / t.cap * 100)}%</span>
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
          <div className="ca-panel ca-next-match" style={{ textAlign: 'center' }}>
            <p className="ca-panel-title" style={{ marginBottom: 10 }}>Next Event</p>
            <div className="ca-match-teams">
              <div className="ca-match-team"><div className="ca-match-badge">KC</div><span>KCCA FC</span></div>
              <span className="ca-match-vs">VS</span>
              <div className="ca-match-team"><div className="ca-match-badge ca-match-badge-away">SV</div><span>SC Villa</span></div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '4px 0' }}>18 May 2026 · 16:00</p>
            <div className="ca-event-tickets-row">
              <div><p className="ca-kpi-label">Sold</p><p style={{ fontWeight: 800, color: '#22c55e' }}>4,200</p></div>
              <div><p className="ca-kpi-label">Left</p><p style={{ fontWeight: 800, color: '#f97316' }}>1,800</p></div>
              <div><p className="ca-kpi-label">Rev</p><p style={{ fontWeight: 800, color: 'var(--color-primary-light)' }}>UGX 84M</p></div>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Sales by Category</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SALES_BY_CAT.map(s => (
                <div key={s.cat} className="ca-channel-row">
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span className="ca-channel-label" style={{ width: 100 }}>{s.cat}</span>
                  <div className="ca-channel-bar-wrap" style={{ flex: 1 }}>
                    <div className="ca-channel-bar" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                  <span className="ca-channel-pct">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Ticketing Activity</h2></div>
            <div className="ca-activity-list">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="ca-activity-item">
                  <div className="ca-activity-dot" />
                  <div>
                    <p className="ca-activity-text">{a.text}</p>
                    <p className="ca-activity-time">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
