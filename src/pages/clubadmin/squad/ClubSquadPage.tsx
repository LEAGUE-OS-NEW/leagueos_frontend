import { useState } from 'react';
import { FiPlus, FiDownload, FiAlertTriangle, FiX, FiEdit2 } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubSquadPage.css';

const KPI = [
  { label: 'Registered Players', value: '28',        delta: '3 in academy', up: null },
  { label: 'Suspended',          value: '3',         delta: 'this round',   up: false },
  { label: 'Contract Expiry',    value: '7',         delta: 'in 60 days',   up: false },
  { label: 'Squad Value',        value: 'UGX 12.6B', delta: '+8% YoY',      up: true },
];

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CDM', 'CF'];
type PlayerStatus = 'fit' | 'suspended' | 'injured';
type Player = { name: string; pos: string; nat: string; status: PlayerStatus; contract: string; value: string };

const INIT_PLAYERS: Player[] = [
  { name: 'John Byamukama',   pos: 'GK',  nat: 'UG', status: 'fit',       contract: 'Jun 2027', value: 'UGX 420M' },
  { name: 'Brian Kalumba',    pos: 'CB',  nat: 'UG', status: 'fit',       contract: 'Jun 2026', value: 'UGX 380M' },
  { name: 'David Kato',       pos: 'CB',  nat: 'UG', status: 'suspended', contract: 'Jun 2028', value: 'UGX 350M' },
  { name: 'Oscar Mwaka',      pos: 'LB',  nat: 'UG', status: 'fit',       contract: 'Jun 2027', value: 'UGX 310M' },
  { name: 'James Alitho',     pos: 'RB',  nat: 'UG', status: 'injured',   contract: 'Jun 2026', value: 'UGX 290M' },
  { name: 'Saidi Kyeyune',    pos: 'CM',  nat: 'UG', status: 'fit',       contract: 'Jun 2028', value: 'UGX 520M' },
  { name: 'Rogers Mato',      pos: 'CM',  nat: 'UG', status: 'fit',       contract: 'Jun 2027', value: 'UGX 480M' },
  { name: 'Patrick Kaddu',    pos: 'CAM', nat: 'UG', status: 'fit',       contract: 'Jun 2029', value: 'UGX 680M' },
  { name: 'William Kizito',   pos: 'LW',  nat: 'UG', status: 'suspended', contract: 'Jun 2027', value: 'UGX 560M' },
  { name: 'Allan Okello',     pos: 'RW',  nat: 'UG', status: 'fit',       contract: 'Jun 2028', value: 'UGX 620M' },
  { name: 'Derrick Nsibambi', pos: 'ST',  nat: 'UG', status: 'fit',       contract: 'Jun 2026', value: 'UGX 750M' },
];

const STATUS_CLASS: Record<string, string> = {
  fit: 'ca-pill-green', suspended: 'ca-pill-red', injured: 'ca-pill-orange',
};

const ACTIVITY = [
  { text: 'Patrick Kaddu cleared for UPL Round 28', time: '1h ago' },
  { text: 'James Alitho injured in training — hamstring', time: '2d ago' },
  { text: 'David Kato served 1-match suspension', time: '3d ago' },
  { text: 'New player registered: Moses Sserunkuuma', time: '5d ago' },
];

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Player = { name: '', pos: 'GK', nat: 'UG', status: 'fit', contract: '', value: '' };

type ModalKind = null | 'add' | 'edit';

export default function ClubSquadPage() {
  const [players, setPlayers] = useState<Player[]>(INIT_PLAYERS);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Player>(BLANK);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k: keyof Player) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => { setForm(BLANK); setEditIdx(null); setModal('add'); };
  const openEdit = (idx: number) => { setForm({ ...players[idx] }); setEditIdx(idx); setModal('edit'); };

  const savePlayer = () => {
    if (!form.name.trim()) return;
    if (editIdx !== null) {
      setPlayers(prev => prev.map((p, i) => i === editIdx ? form : p));
      showToast(`${form.name} updated`);
    } else {
      setPlayers(prev => [...prev, form]);
      showToast(`${form.name} added to squad`);
    }
    setModal(null);
  };

  const updateStatus = (idx: number, status: PlayerStatus) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, status } : p));
    showToast(`${players[idx].name} status updated to ${status}`);
  };

  const contractAlerts = players.filter(p => p.contract.includes('2026'));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {(modal === 'add' || modal === 'edit') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'add' ? 'Add Player' : 'Edit Player'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Full Name *</label>
                  <input className="ca-input" value={form.name} onChange={set('name')} placeholder="Player full name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Position</label>
                  <select className="ca-select" value={form.pos} onChange={set('pos')}>
                    {POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Nationality</label>
                  <input className="ca-input" value={form.nat} onChange={set('nat')} placeholder="e.g. UG" maxLength={3} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={form.status} onChange={set('status')}>
                    <option value="fit">Fit</option>
                    <option value="injured">Injured</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Contract End</label>
                  <input className="ca-input" value={form.contract} onChange={set('contract')} placeholder="e.g. Jun 2027" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Market Value</label>
                  <input className="ca-input" value={form.value} onChange={set('value')} placeholder="e.g. UGX 400M" />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={savePlayer}>
                {modal === 'add' ? 'Add Player' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-03</p>
          <h1 className="ca-page-title">Squad &amp; Team Management</h1>
          <p className="ca-page-subtitle">Manage players, staff, contracts, and optimise squad performance.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(players as unknown as Record<string, unknown>[], 'squad.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={openAdd}><FiPlus /> Add Player</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className={`ca-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : 'neutral'}`}>
              {k.up === false ? '↓ ' : k.up === true ? '↑ ' : ''}{k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Squad Roster</h2>
              <span className="ca-panel-count">{players.length} players</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Player</th><th>Pos</th><th>Nat</th><th>Status</th><th>Contract Ends</th><th>Value</th><th></th></tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</td>
                      <td><span className="ca-pill ca-pill-muted">{p.pos}</span></td>
                      <td>{p.nat}</td>
                      <td>
                        <select
                          className="ca-pill"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: STATUS_CLASS[p.status].includes('green') ? '#22c55e' : STATUS_CLASS[p.status].includes('red') ? '#ef4444' : '#f97316', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                          value={p.status}
                          onChange={e => updateStatus(i, e.target.value as PlayerStatus)}
                        >
                          <option value="fit">fit</option>
                          <option value="injured">injured</option>
                          <option value="suspended">suspended</option>
                        </select>
                      </td>
                      <td>{p.contract}</td>
                      <td style={{ fontWeight: 700 }}>{p.value}</td>
                      <td>
                        <button type="button" className="ca-icon-btn" onClick={() => openEdit(i)}><FiEdit2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel ca-formation-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Formation</h2>
              <span className="ca-panel-count">4-3-3</span>
            </div>
            <div className="ca-formation-pitch">
              <div className="ca-pitch-row"><span className="ca-pitch-dot" /></div>
              <div className="ca-pitch-row">
                <span className="ca-pitch-dot" /><span className="ca-pitch-dot" /><span className="ca-pitch-dot" />
              </div>
              <div className="ca-pitch-row">
                <span className="ca-pitch-dot" /><span className="ca-pitch-dot" /><span className="ca-pitch-dot" />
              </div>
              <div className="ca-pitch-row">
                <span className="ca-pitch-dot" /><span className="ca-pitch-dot" /><span className="ca-pitch-dot" /><span className="ca-pitch-dot" />
              </div>
              <div className="ca-pitch-row"><span className="ca-pitch-dot ca-pitch-dot-gk" /></div>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Contract Alerts</h2>
              <span className="ca-panel-count">{contractAlerts.length} expiring</span>
            </div>
            {contractAlerts.map((c, i) => (
              <div key={i} className="ca-alert-item" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div className="ca-alert-dot-orange" />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Expires {c.contract}</p>
                  </div>
                </div>
                <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm"
                  onClick={() => showToast(`Contract offer sent to ${c.name}`)}>
                  Offer
                </button>
                <FiAlertTriangle style={{ color: '#f97316', fontSize: '0.9rem', marginLeft: 4 }} />
              </div>
            ))}
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Squad Activity</h2></div>
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
