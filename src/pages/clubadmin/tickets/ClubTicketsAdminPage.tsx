import { useState, useRef } from 'react';
import {
  FiPlus, FiDownload, FiX, FiEdit2, FiCheck, FiAlertCircle,
  FiClock, FiUsers, FiZap, FiSave,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import { DEMO_ENTITLEMENTS } from '../../../components/clubadmin/clubAdminData';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubTicketsAdminPage.css';

const TABS = ['Events', 'Ticket Types', 'Scanner'];

type EventStatus = 'on sale' | 'pending' | 'sold out' | 'closed';
type MatchEvent = { id: string; match: string; date: string; sold: number; cap: number; rev: string; status: EventStatus };
type TicketType = { id: string; name: string; price: string; sold: number; cap: number; color: string };
type CheckIn = { id: string; holder: string; type: string; time: string; valid: boolean };

const STATUS_CLASS: Record<string, string> = {
  'on sale': 'ca-pill-green', pending: 'ca-pill-orange', 'sold out': 'ca-pill-red', closed: 'ca-pill-muted',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK_EVENT: Omit<MatchEvent, 'id'> = { match: '', date: '', sold: 0, cap: 6000, rev: '—', status: 'pending' };
const BLANK_TYPE: Omit<TicketType, 'id'> = { name: '', price: '', sold: 0, cap: 500, color: '#3b82f6' };

type ModalKind = null | 'event' | 'type';
let idCounter = 200;

export default function ClubTicketsAdminPage() {
  const [activeTab, setActiveTab] = useState('Events');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Omit<MatchEvent, 'id'>>(BLANK_EVENT);
  const [typeForm, setTypeForm] = useState<Omit<TicketType, 'id'>>(BLANK_TYPE);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<null | { valid: boolean; message: string; holder?: string; type?: string }>(null);
  const [toast, setToast] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEnt = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const ents = rawEnt.length > 0 ? rawEnt : DEMO_ENTITLEMENTS;
  const current = ents.find(e => e.id === selectedEntitlementId) ?? ents[0] ?? null;
  const canManage = current?.permissions.includes('club.ticketing.manage') ?? true;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openNewEvent = () => { setEventForm(BLANK_EVENT); setEditEventId(null); setModal('event'); };
  const openEditEvent = (ev: MatchEvent) => { setEventForm({ match: ev.match, date: ev.date, sold: ev.sold, cap: ev.cap, rev: ev.rev, status: ev.status }); setEditEventId(ev.id); setModal('event'); };

  const saveEvent = () => {
    if (!eventForm.match.trim() || !eventForm.date.trim()) return;
    if (editEventId) {
      setEvents(prev => prev.map(e => e.id === editEventId ? { ...eventForm, id: editEventId } : e));
      showToast('Event updated');
    } else {
      const id = `ev-${idCounter++}`;
      setEvents(prev => [...prev, { ...eventForm, id }]);
      showToast(`Event "${eventForm.match}" created`);
    }
    setModal(null);
  };

  const openNewType = () => { setTypeForm(BLANK_TYPE); setEditTypeId(null); setModal('type'); };
  const openEditType = (t: TicketType) => { setTypeForm({ name: t.name, price: t.price, sold: t.sold, cap: t.cap, color: t.color }); setEditTypeId(t.id); setModal('type'); };

  const saveType = () => {
    if (!typeForm.name.trim()) return;
    if (editTypeId) {
      setTicketTypes(prev => prev.map(t => t.id === editTypeId ? { ...typeForm, id: editTypeId } : t));
      showToast('Ticket type updated');
    } else {
      const id = `tt-${idCounter++}`;
      setTicketTypes(prev => [...prev, { ...typeForm, id }]);
      showToast(`Ticket type "${typeForm.name}" added`);
    }
    setModal(null);
  };

  const handleScan = () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    const alreadyScanned = checkIns.find(c => c.id === code);
    if (alreadyScanned) {
      setScanResult({ valid: false, message: `Ticket ${code} already used at ${alreadyScanned.time}.` });
    } else if (code.startsWith('TK-') && code.length >= 8) {
      const types = ticketTypes.map(t => t.name);
      const type = types.length > 0 ? types[Math.floor(Math.random() * types.length)] : '—';
      const newCheckIn: CheckIn = { id: code, holder: 'Fan', type, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), valid: true };
      setCheckIns(prev => [newCheckIn, ...prev]);
      setScanResult({ valid: true, message: `Valid ticket${type !== '—' ? ` — ${type}` : ''}`, holder: 'Fan', type });
    } else {
      setScanResult({ valid: false, message: `Invalid ticket code: ${code}` });
    }
    setScanInput('');
    setTimeout(() => setScanResult(null), 4000);
    scanRef.current?.focus();
  };

  const totalCapacity = events.reduce((s, e) => s + e.cap, 0);
  const totalCheckedIn = checkIns.filter(c => c.valid).length;
  const scanPct = totalCapacity > 0 ? Math.round((totalCheckedIn / totalCapacity) * 100) : 0;

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Event modal */}
      {modal === 'event' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{editEventId ? 'Edit Match Event' : 'Create Match Event'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Match *</label>
                  <input className="ca-input" value={eventForm.match} onChange={e => setEventForm(f => ({ ...f, match: e.target.value }))} placeholder="e.g. Club A vs Club B" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Date *</label>
                  <input className="ca-input" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} placeholder="e.g. 18 May 2026" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Total Capacity</label>
                  <input className="ca-input" type="number" min="1" value={eventForm.cap} onChange={e => setEventForm(f => ({ ...f, cap: Number(e.target.value) }))} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={eventForm.status} onChange={e => setEventForm(f => ({ ...f, status: e.target.value as EventStatus }))}>
                    <option value="pending">Pending</option>
                    <option value="on sale">On Sale</option>
                    <option value="sold out">Sold Out</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveEvent}>
                {editEventId ? <><FiSave /> Save Changes</> : <><FiPlus /> Create Event</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket type modal */}
      {modal === 'type' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{editTypeId ? 'Edit Ticket Type' : 'Add Ticket Type'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Type Name *</label>
                  <input className="ca-input" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. VIP Lounge" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price</label>
                  <input className="ca-input" value={typeForm.price} onChange={e => setTypeForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. UGX 50,000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Capacity</label>
                  <input className="ca-input" type="number" min="1" value={typeForm.cap} onChange={e => setTypeForm(f => ({ ...f, cap: Number(e.target.value) }))} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Color</label>
                  <input className="ca-input" type="color" value={typeForm.color} style={{ padding: '4px', height: 38 }} onChange={e => setTypeForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveType}>
                {editTypeId ? 'Save Changes' : 'Add Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Ticketing &amp; Match Events</h1>
          <p className="ca-page-subtitle">Manage match events, ticket types, seating and match-day check-in.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(events as unknown as Record<string, unknown>[], 'events.csv')}>
            <FiDownload /> Export
          </button>
          {canManage && activeTab === 'Events' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={openNewEvent}><FiPlus /> Create Event</button>
          )}
          {canManage && activeTab === 'Ticket Types' && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={openNewType}><FiPlus /> Add Type</button>
          )}
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── EVENTS TAB ── */}
      {activeTab === 'Events' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Match Events</h2>
                <span className="ca-panel-count">{events.length} events</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Match</th><th>Date</th><th>Sold</th><th>Capacity</th><th>Revenue</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No events yet. Create a match event to get started.</td></tr>
                    )}
                    {events.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{e.match}</td>
                        <td>{e.date}</td>
                        <td>{e.sold > 0 ? e.sold.toLocaleString() : '—'}</td>
                        <td>{e.cap.toLocaleString()}</td>
                        <td>{e.rev}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[e.status]}`}>{e.status}</span></td>
                        <td>
                          {canManage && (
                            <button type="button" className="ca-icon-btn" onClick={() => openEditEvent(e)}><FiEdit2 /></button>
                          )}
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Sales by Category</h2></div>
              {ticketTypes.length === 0
                ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No ticket types configured.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ticketTypes.map(t => {
                      const pct = Math.round(t.sold / Math.max(t.cap, 1) * 100);
                      return (
                        <div key={t.id} className="ca-channel-row">
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                          <span className="ca-channel-label" style={{ width: 100 }}>{t.name}</span>
                          <div className="ca-channel-bar-wrap" style={{ flex: 1 }}>
                            <div className="ca-channel-bar" style={{ width: `${pct}%`, background: t.color }} />
                          </div>
                          <span className="ca-channel-pct">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TICKET TYPES TAB ── */}
      {activeTab === 'Ticket Types' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Ticket Types &amp; Pricing</h2>
                <span className="ca-panel-count">{ticketTypes.length} types</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Type</th><th>Price</th><th>Sold</th><th>Capacity</th><th>Fill Rate</th><th></th></tr></thead>
                  <tbody>
                    {ticketTypes.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No ticket types yet. Add a type to define seating categories.</td></tr>
                    )}
                    {ticketTypes.map(t => {
                      const pct = Math.round(t.sold / Math.max(t.cap, 1) * 100);
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                              {t.name}
                            </div>
                          </td>
                          <td>{t.price}</td>
                          <td>{t.sold.toLocaleString()}</td>
                          <td>{t.cap.toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="ca-fill-bar-wrap">
                                <div className="ca-fill-bar" style={{ width: `${pct}%`, background: t.color }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{pct}%</span>
                            </div>
                          </td>
                          <td>
                            {canManage && <button type="button" className="ca-icon-btn" onClick={() => openEditType(t)}><FiEdit2 /></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Capacity Overview</h2></div>
              {ticketTypes.length === 0
                ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No ticket types to display.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ticketTypes.map(t => {
                      const pct = Math.round(t.sold / Math.max(t.cap, 1) * 100);
                      return (
                        <div key={t.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{t.name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{t.sold.toLocaleString()} / {t.cap.toLocaleString()}</span>
                          </div>
                          <div className="ca-fill-bar-wrap" style={{ width: '100%' }}>
                            <div className="ca-fill-bar" style={{ width: `${pct}%`, background: t.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── SCANNER TAB ── */}
      {activeTab === 'Scanner' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Ticket Scanner</h2>
                <span className="ca-pill ca-pill-green" style={{ fontSize: '0.68rem' }}><FiZap style={{ fontSize: '0.7rem' }} /> Live</span>
              </div>
              <div className="ca-scanner-box">
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Scan a QR code or enter a ticket ID manually and press Enter
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={scanRef}
                    className="ca-input ca-scanner-input"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    placeholder="TK-XXXXXXXX"
                    autoFocus
                  />
                  <button type="button" className="ca-btn ca-btn-primary" onClick={handleScan}>Scan</button>
                </div>

                {scanResult && (
                  <div className={`ca-scan-result ${scanResult.valid ? 'ca-scan-valid' : 'ca-scan-invalid'}`}>
                    {scanResult.valid
                      ? <FiCheck style={{ fontSize: '1.1rem', color: '#22c55e', flexShrink: 0 }} />
                      : <FiAlertCircle style={{ fontSize: '1.1rem', color: '#ef4444', flexShrink: 0 }} />
                    }
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: scanResult.valid ? '#22c55e' : '#ef4444', fontSize: '0.85rem' }}>
                        {scanResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{scanResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="ca-scanner-stats">
                <div className="ca-scanner-stat">
                  <FiUsers style={{ color: '#22c55e', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{totalCheckedIn.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Checked In</p>
                </div>
                <div className="ca-scanner-stat">
                  <FiClock style={{ color: '#f97316', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{Math.max(totalCapacity - totalCheckedIn, 0).toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Remaining</p>
                </div>
                <div className="ca-scanner-stat">
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>{scanPct}%</div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Attendance Rate</p>
                </div>
              </div>
              <div className="ca-fill-bar-wrap" style={{ width: '100%', marginTop: 6 }}>
                <div className="ca-fill-bar" style={{ width: `${scanPct}%` }} />
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Recent Check-ins</h2>
                <span className="ca-panel-count">{checkIns.length} scanned</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Ticket ID</th><th>Holder</th><th>Type</th><th>Time</th><th>Result</th></tr></thead>
                  <tbody>
                    {checkIns.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No tickets scanned yet.</td></tr>
                    )}
                    {checkIns.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.id}</td>
                        <td style={{ color: 'var(--color-text-primary)' }}>{c.holder}</td>
                        <td>{c.type}</td>
                        <td>{c.time}</td>
                        <td>
                          {c.valid
                            ? <span className="ca-pill ca-pill-green" style={{ fontSize: '0.65rem' }}><FiCheck style={{ fontSize: '0.6rem' }} /> Valid</span>
                            : <span className="ca-pill ca-pill-red" style={{ fontSize: '0.65rem' }}><FiAlertCircle style={{ fontSize: '0.6rem' }} /> Invalid</span>
                          }
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Scanner Tips</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Valid ticket IDs start with TK-',
                  'Each ticket can only be scanned once',
                  'Invalid scans are logged for review',
                  'Press Enter to scan quickly',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    <FiCheck style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: 2 }} />{tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
