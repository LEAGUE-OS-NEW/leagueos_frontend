import { useState } from 'react';
import { FiCalendar, FiPlus, FiDownload, FiMapPin, FiCheck, FiAlertCircle, FiX } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubFixturesPage.css';

const KPI = [
  { label: 'Upcoming Fixtures', value: '6',   delta: 'next 30 days', up: null },
  { label: 'Home Matches',      value: '3',   delta: 'at Lugogo',    up: null },
  { label: 'Away Matches',      value: '3',   delta: 'on the road',  up: null },
  { label: 'Matchday Views',    value: '42K', delta: '+18%', up: true },
  { label: 'Completion Rate',   value: '78%', delta: '+5%',  up: true },
];

type Fixture = { date: string; opponent: string; comp: string; venue: string; h_a: string; tickets: number; result: string | null; status: string };

const INIT_FIXTURES: Fixture[] = [
  { date: 'Sun 18 May 2026', opponent: 'SC Villa',      comp: 'UPL',        venue: 'Lugogo',      h_a: 'Home', tickets: 4200, result: null,    status: 'upcoming' },
  { date: 'Sat 24 May 2026', opponent: 'Police FC',     comp: 'UPL',        venue: 'MTN Phillip', h_a: 'Away', tickets: 0,    result: null,    status: 'upcoming' },
  { date: 'Wed 28 May 2026', opponent: 'BUL FC',        comp: 'UPL',        venue: 'Lugogo',      h_a: 'Home', tickets: 3150, result: null,    status: 'upcoming' },
  { date: 'Sat 31 May 2026', opponent: 'Bright Stars',  comp: 'UPL',        venue: 'Kavumba',     h_a: 'Away', tickets: 0,    result: null,    status: 'upcoming' },
  { date: 'Sun 4 May 2026',  opponent: 'Wakiso Giants', comp: 'UPL',        venue: 'Lugogo',      h_a: 'Home', tickets: 5100, result: '2 – 1', status: 'played' },
  { date: 'Sun 27 Apr 2026', opponent: 'Onduparaka',    comp: 'Uganda Cup', venue: 'Arua Hill',   h_a: 'Away', tickets: 0,    result: '1 – 1', status: 'played' },
];

const INIT_CHECKLIST = [
  { item: 'Match squad submitted to FUFA', done: true },
  { item: 'Ticket types published',        done: true },
  { item: 'Venue safety check completed',  done: true },
  { item: 'Media accreditation issued',    done: false },
  { item: 'Broadcast feed confirmed',      done: false },
];

const ACTIVITY = [
  { text: 'Fixture vs SC Villa published to fans', time: '2h ago' },
  { text: 'Squad list submitted for BUL FC match', time: '5h ago' },
  { text: 'Ticket sales opened for home fixtures', time: '1d ago' },
  { text: 'Wakiso Giants result confirmed 2–1',    time: '3d ago' },
];

const COMPS = ['UPL', 'Uganda Cup', 'CAF CC', 'Friendly'];

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Fixture = { date: '', opponent: '', comp: 'UPL', venue: '', h_a: 'Home', tickets: 0, result: null, status: 'upcoming' };

export default function ClubFixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>(INIT_FIXTURES);
  const [checklist, setChecklist] = useState(INIT_CHECKLIST);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Fixture>(BLANK);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof Fixture) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const addFixture = () => {
    if (!form.opponent.trim() || !form.date.trim()) return;
    setFixtures(prev => [form, ...prev]);
    showToast(`Fixture vs ${form.opponent} added`);
    setShowModal(false);
    setForm(BLANK);
  };

  const toggleCheck = (idx: number) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, done: !c.done } : c));
  };

  const doneCount = checklist.filter(c => c.done).length;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {showModal && (
        <div className="ca-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Add Fixture</h2>
              <button type="button" className="ca-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
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
                  <input className="ca-input" type="number" value={form.tickets} onChange={e => setForm(f => ({ ...f, tickets: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={addFixture}><FiPlus /> Add Fixture</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-02</p>
          <h1 className="ca-page-title">Fixtures &amp; Match Operations</h1>
          <p className="ca-page-subtitle">Plan, schedule and manage match-day operations, results and fan touchpoints.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(fixtures as unknown as Record<string, unknown>[], 'fixtures.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Fixture</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className={`ca-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : 'neutral'}`}>
              {k.up === true ? '↑ ' : k.up === false ? '↓ ' : ''}{k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">All Fixtures</h2>
              <span className="ca-panel-count">{fixtures.length} fixtures</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Date</th><th>Opponent</th><th>Competition</th><th>Venue</th><th>H/A</th><th>Tickets</th><th>Result</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {fixtures.map((f, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap' }}><FiCalendar style={{ marginRight: 5, opacity: 0.5 }} />{f.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{f.opponent}</td>
                      <td>{f.comp}</td>
                      <td><FiMapPin style={{ marginRight: 4, opacity: 0.5 }} />{f.venue || '—'}</td>
                      <td><span className={`ca-pill ${f.h_a === 'Home' ? 'ca-pill-purple' : 'ca-pill-blue'}`}>{f.h_a}</span></td>
                      <td>{f.tickets > 0 ? f.tickets.toLocaleString() : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{f.result || '—'}</td>
                      <td><span className={`ca-pill ${f.status === 'played' ? 'ca-pill-green' : 'ca-pill-orange'}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel ca-next-match">
            <p className="ca-panel-title" style={{ marginBottom: 12 }}>Next Match</p>
            <div className="ca-match-teams">
              <div className="ca-match-team">
                <div className="ca-match-badge">KC</div>
                <span>KCCA FC</span>
              </div>
              <span className="ca-match-vs">VS</span>
              <div className="ca-match-team">
                <div className="ca-match-badge ca-match-badge-away">SV</div>
                <span>SC Villa</span>
              </div>
            </div>
            <p className="ca-match-detail"><FiCalendar /> Sun 18 May 2026 · 16:00</p>
            <p className="ca-match-detail"><FiMapPin /> StarTimes Stadium, Lugogo</p>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Matchday Checklist</h2>
              <span className="ca-panel-count">{doneCount} / {checklist.length} done</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklist.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="ca-checklist-row"
                  onClick={() => toggleCheck(i)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <span className={`ca-check-icon ${c.done ? 'done' : ''}`}>
                    {c.done ? <FiCheck /> : <FiAlertCircle />}
                  </span>
                  <span className={`ca-check-text ${c.done ? 'done' : ''}`}>{c.item}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Fixture Activity</h2></div>
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
