import { useEffect, useState } from 'react';
import {
  FiPlus, FiDownload, FiAlertTriangle, FiX, FiEdit2,
  FiCheck, FiClock, FiAlertCircle, FiSend, FiRefreshCw,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useAuthStore } from '../../../store/authStore';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { DEMO_ENTITLEMENTS, CLUB_REGISTRY } from '../../../components/clubadmin/clubAdminData';
import { useClubSquadStore, type SquadPlayer } from '../../../store/clubSquadStore';
import { nameToSlug } from '../../../store/clubProductStore';
import {
  fetchClubPlayers,
  createClubPlayer,
  updateClubPlayer,
  type ClubPlayer,
  type ApiPlayerStatus,
} from '../../../services/clubSquadService';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubSquadPage.css';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CDM', 'CF'];

type PlayerStatus = 'fit' | 'suspended' | 'injured';
type DataSource = 'verified' | 'club_submitted' | 'pending';
type SubStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_revision';

type Player = {
  id?: string;
  name: string; pos: string; nat: string; status: PlayerStatus;
  contract: string; value: string;
  dataSource: DataSource;
  subId?: string;
};

type Submission = {
  id: string;
  type: 'player_add' | 'player_update' | 'status_change' | 'squad_list';
  subject: string;
  submittedAt: string;
  status: SubStatus;
  feedback: string;
  playerIdx?: number;
  data: Partial<Player>;
};

const STATUS_CLASS: Record<string, string> = {
  fit: 'ca-pill-green', suspended: 'ca-pill-red', injured: 'ca-pill-orange',
};

const SUB_STATUS_META: Record<SubStatus, { label: string; color: string; icon: typeof FiClock }> = {
  pending_review:  { label: 'Pending Review', color: '#eab308', icon: FiClock },
  approved:        { label: 'Approved',       color: '#22c55e', icon: FiCheck },
  rejected:        { label: 'Rejected',       color: '#ef4444', icon: FiAlertCircle },
  needs_revision:  { label: 'Needs Revision', color: '#f97316', icon: FiAlertCircle },
};

function toApiStatus(s: PlayerStatus): ApiPlayerStatus {
  return s.toUpperCase() as ApiPlayerStatus;
}

function fromApiPlayer(p: ClubPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    pos: p.position,
    nat: p.nationality,
    status: (p.status.toLowerCase() as PlayerStatus) ?? 'fit',
    contract: p.contract_end,
    value: p.market_value,
    dataSource: 'club_submitted',
  };
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK: Player = { name: '', pos: 'GK', nat: 'UG', status: 'fit', contract: '', value: '', dataSource: 'pending' };
type ModalKind = null | 'add' | 'edit' | 'revise';

let subCounter = 10;

function fromSquadStorePlayer(p: SquadPlayer): Player {
  return {
    id: p.id, name: p.name, pos: p.position, nat: p.nationality,
    status: p.status, contract: p.contract, value: p.value,
    dataSource: 'club_submitted',
  };
}

export default function ClubSquadPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [form, setForm] = useState<Player>(BLANK);
  const [submitNote, setSubmitNote] = useState('');
  const [toast, setToast] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEnt = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const ents = rawEnt.length > 0 ? rawEnt : DEMO_ENTITLEMENTS;
  const current = ents.find(e => e.id === selectedEntitlementId) ?? ents[0] ?? null;

  const clubId = typeof current?.scope_id === 'string' ? current.scope_id : null;
  const scopeId = current?.scope_id ?? 1;
  const clubInfo = CLUB_REGISTRY[scopeId] ?? { name: `Club #${scopeId}`, league: '', season: '', badge: '' };
  const clubSlug = nameToSlug(clubInfo.name);

  const { players: storePlayers, addPlayer: addStorePlayer, updatePlayer: updateStorePlayer } = useClubSquadStore();

  // No real club UUID (demo/mock session) — seed from the persisted local
  // store instead of an empty array, mirroring ClubStorePage's fix for the
  // same refresh-loses-data issue. Lazy-initialized, not an effect, since
  // this is a pure sync read.
  const [players, setPlayers] = useState<Player[]>(() =>
    clubId ? [] : storePlayers.filter(p => p.clubSlug === clubSlug).map(fromSquadStorePlayer),
  );

  const isLoadingData = !!clubId && !hasFetched;

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const set = (k: keyof Player) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    fetchClubPlayers(clubId)
      .then(apiPlayers => {
        if (cancelled) return;
        setPlayers(apiPlayers.map(fromApiPlayer));
        setHasFetched(true);
      })
      .catch(() => {
        if (!cancelled) setHasFetched(true);
      });
    return () => { cancelled = true; };
  }, [clubId]);

  const openAdd = () => { setForm(BLANK); setEditIdx(null); setSubmitNote(''); setModal('add'); };
  const openEdit = (idx: number) => { setForm({ ...players[idx] }); setEditIdx(idx); setSubmitNote(''); setModal('edit'); };
  const openRevise = (sub: Submission) => {
    setReviseId(sub.id);
    if (sub.playerIdx !== undefined) setForm({ ...players[sub.playerIdx] });
    else setForm({ ...BLANK, ...sub.data } as Player);
    setSubmitNote('');
    setModal('revise');
  };

  const submitPlayer = async (asDraft = false) => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    try {
      if (modal === 'add') {
        if (asDraft || !clubId) {
          // Save draft locally only — persisted so it survives a refresh.
          const id = `local-${Date.now()}-${subCounter++}`;
          const draftPlayer: Player = { ...form, id, dataSource: 'club_submitted' };
          setPlayers(prev => [...prev, draftPlayer]);
          addStorePlayer({
            id, clubSlug, name: form.name, position: form.pos, nationality: form.nat,
            status: form.status, contract: form.contract, value: form.value,
            createdAt: Date.now(),
          });
          notify(`${form.name} saved as draft`);
        } else {
          // Submit to backend
          const created = await createClubPlayer(clubId, {
            name: form.name,
            position: form.pos,
            nationality: form.nat,
            status: toApiStatus(form.status),
            contract_end: form.contract,
            market_value: form.value,
          });
          const newId = `sub-${String(subCounter++).padStart(3, '0')}`;
          const displayPlayer = fromApiPlayer(created);
          displayPlayer.dataSource = 'pending';
          displayPlayer.subId = newId;
          setPlayers(prev => [...prev, displayPlayer]);
          setSubmissions(prev => [...prev, {
            id: newId, type: 'player_add',
            subject: `New player: ${form.name} (${form.pos})`,
            submittedAt: today, status: 'pending_review', feedback: '',
            playerIdx: players.length, data: { ...form },
          }]);
          notify(`${form.name} submitted to League OS for review`);
        }
      } else if ((modal === 'edit' || modal === 'revise') && editIdx !== null) {
        const player = players[editIdx];
        if (clubId && player.id) {
          await updateClubPlayer(clubId, player.id, {
            name: form.name,
            position: form.pos,
            nationality: form.nat,
            status: toApiStatus(form.status),
            contract_end: form.contract,
            market_value: form.value,
          });
        } else if (player.id) {
          updateStorePlayer(player.id, {
            name: form.name, position: form.pos, nationality: form.nat,
            status: form.status, contract: form.contract, value: form.value,
          });
        }
        const newId = `sub-${String(subCounter++).padStart(3, '0')}`;
        setPlayers(prev => prev.map((p, i) => i === editIdx ? { ...form, id: player.id, dataSource: 'pending', subId: newId } : p));
        if (modal === 'revise' && reviseId) {
          setSubmissions(prev => prev.map(s => s.id === reviseId ? { ...s, status: 'pending_review', feedback: '', submittedAt: today } : s));
          notify('Resubmission sent to League OS');
        } else {
          setSubmissions(prev => [...prev, {
            id: newId, type: 'player_update',
            subject: `${form.name} — player update`,
            submittedAt: today, status: 'pending_review', feedback: '',
            playerIdx: editIdx, data: { ...form },
          }]);
          notify(`Update for ${form.name} submitted for review`);
        }
      }
      setModal(null);
    } catch {
      notify('Failed to save player. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitSquadList = () => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setSubmissions(prev => [...prev, {
      id: `sub-${String(subCounter++).padStart(3, '0')}`,
      type: 'squad_list',
      subject: `Squad list submitted — ${today}`,
      submittedAt: today, status: 'pending_review', feedback: '', data: {},
    }]);
    notify('Squad list submitted to League OS');
  };

  const contractAlerts = players.filter(p => p.contract.includes('2026'));
  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;
  const needsRevision = submissions.filter(s => s.status === 'needs_revision');

  const modalTitle = modal === 'add' ? 'Add Player' : modal === 'revise' ? 'Revise & Resubmit' : 'Edit Player';

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Add / Edit / Revise modal */}
      {(modal === 'add' || modal === 'edit' || modal === 'revise') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modalTitle}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>

            {/* Revision context banner */}
            {modal === 'revise' && reviseId && (() => {
              const sub = submissions.find(s => s.id === reviseId);
              return sub?.feedback ? (
                <div className="ca-revision-banner">
                  <FiAlertCircle style={{ color: '#f97316', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reviewer Feedback</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{sub.feedback}</p>
                  </div>
                </div>
              ) : null;
            })()}

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
                <div className="ca-field">
                  <label className="ca-label">Market Value</label>
                  <input className="ca-input" value={form.value} onChange={set('value')} placeholder="e.g. UGX 400M" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Submission Note {modal === 'revise' ? '(required)' : '(optional)'}</label>
                  <textarea
                    className="ca-textarea"
                    rows={2}
                    value={submitNote}
                    onChange={e => setSubmitNote(e.target.value)}
                    placeholder={modal === 'revise' ? 'Explain the changes made in response to feedback…' : 'Any notes for the League OS reviewer…'}
                  />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              {modal === 'add' && (
                <button type="button" className="ca-btn ca-btn-secondary" onClick={() => void submitPlayer(true)} disabled={isSaving}>
                  Save as Draft
                </button>
              )}
              <button type="button" className="ca-btn ca-btn-primary" onClick={() => void submitPlayer(false)} disabled={isSaving}>
                <FiSend /> {isSaving ? 'Saving…' : modal === 'revise' ? 'Resubmit' : 'Submit to League OS'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Squad &amp; Team Management</h1>
          <p className="ca-page-subtitle">Manage players, submit updates to League OS and track review status.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={submitSquadList}>
            <FiSend /> Submit Squad List
          </button>
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(players as unknown as Record<string, unknown>[], 'squad.csv')}>
            <FiDownload /> Export
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={openAdd}><FiPlus /> Add Player</button>
        </div>
      </div>

      {/* Needs revision alerts */}
      {needsRevision.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {needsRevision.map(sub => (
            <div key={sub.id} className="ca-revision-alert">
              <FiAlertCircle style={{ color: '#f97316', fontSize: '1rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>
                  Revision required: {sub.subject}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {sub.feedback}
                </p>
              </div>
              <button
                type="button"
                className="ca-btn ca-btn-secondary ca-btn-sm"
                onClick={() => {
                  const idx = sub.playerIdx;
                  if (idx !== undefined) { setEditIdx(idx); openRevise(sub); }
                }}
              >
                <FiRefreshCw /> Revise
              </button>
            </div>
          ))}
        </div>
      )}

      {isLoadingData && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', padding: '24px 0' }}>Loading squad…</p>
      )}

      {!isLoadingData && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Squad Roster</h2>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="ca-panel-count">{players.length} players</span>
                  <div className="ca-legend">
                    <span className="ca-legend-dot" style={{ background: '#22c55e' }} /><span>Verified</span>
                    <span className="ca-legend-dot" style={{ background: '#eab308', marginLeft: 8 }} /><span>Pending</span>
                    <span className="ca-legend-dot" style={{ background: 'rgba(255,255,255,0.2)', marginLeft: 8 }} /><span>Draft</span>
                  </div>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Player</th><th>Pos</th><th>Nat</th><th>Status</th><th>Contract</th><th>Value</th><th>Data</th><th></th></tr>
                  </thead>
                  <tbody>
                    {players.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No players yet. Add a player to build your squad roster.</td></tr>
                    )}
                    {players.map((p, i) => (
                      <tr key={p.id ?? i} className={p.dataSource === 'pending' ? 'ca-row-pending' : p.dataSource === 'club_submitted' ? 'ca-row-draft' : ''}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</td>
                        <td><span className="ca-pill ca-pill-muted">{p.pos}</span></td>
                        <td>{p.nat}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                        <td>{p.contract}</td>
                        <td style={{ fontWeight: 700 }}>{p.value}</td>
                        <td>
                          {p.dataSource === 'verified' && (
                            <span className="ca-data-badge ca-data-badge-verified"><FiCheck style={{ fontSize: '0.7rem' }} /> Verified</span>
                          )}
                          {p.dataSource === 'pending' && (
                            <span className="ca-data-badge ca-data-badge-pending"><FiClock style={{ fontSize: '0.7rem' }} /> Pending</span>
                          )}
                          {p.dataSource === 'club_submitted' && (
                            <span className="ca-data-badge ca-data-badge-draft">Draft</span>
                          )}
                        </td>
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
            {/* Submission queue */}
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Submission Queue</h2>
                <span className="ca-panel-count">{pendingCount} pending</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {submissions.map(sub => {
                  const meta = SUB_STATUS_META[sub.status];
                  const Icon = meta.icon;
                  return (
                    <div key={sub.id} className="ca-sub-item">
                      <div className="ca-sub-item-top">
                        <Icon style={{ color: meta.color, fontSize: '0.9rem', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{sub.subject}</p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{sub.submittedAt}</p>
                        </div>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', flexShrink: 0 }}>
                          {meta.label}
                        </span>
                      </div>
                      {sub.feedback && (
                        <div className="ca-sub-feedback">
                          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                            <strong style={{ color: '#f97316' }}>Reviewer: </strong>{sub.feedback}
                          </p>
                          {sub.status === 'needs_revision' && sub.playerIdx !== undefined && (
                            <button
                              type="button"
                              className="ca-btn ca-btn-secondary ca-btn-sm"
                              style={{ marginTop: 6 }}
                              onClick={() => { setEditIdx(sub.playerIdx!); openRevise(sub); }}
                            >
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
                    onClick={() => notify(`Contract offer sent to ${c.name}`)}>Offer</button>
                  <FiAlertTriangle style={{ color: '#f97316', fontSize: '0.9rem', marginLeft: 4 }} />
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
