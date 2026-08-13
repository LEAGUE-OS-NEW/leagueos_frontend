import { useState } from 'react';
import {
  FiPlus, FiMail, FiX, FiRefreshCw, FiXCircle,
  FiAlertTriangle, FiShield, FiCheck, FiSearch, FiUser,
  FiAlertCircle,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubStaffPage.css';

const TABS = ['Staff', 'Permissions', 'Audit'];
const ROLES = ['Club Admin', 'Communications', 'Finance Officer', 'Ticketing Manager', 'Store Manager', 'Team Manager', 'Club Doctor', 'Content Creator'];
const DEPARTMENTS = ['Management', 'Media', 'Finance', 'Technical', 'Medical', 'Operations'];

type Risk = 'normal' | 'high' | 'critical';
type Permission = { key: string; label: string; description: string; group: string; risk: Risk; riskNote?: string };

const ALL_PERMISSIONS: Permission[] = [
  // Profile
  { key: 'club.profile.view',    label: 'View Club Profile',        description: 'Read club branding, contacts and info.',                                    group: 'Profile',      risk: 'normal' },
  { key: 'club.profile.manage',  label: 'Edit Club Profile',        description: 'Update club branding, logo, contacts and social links.',                    group: 'Profile',      risk: 'normal' },
  // Communications
  { key: 'club.communications.manage', label: 'Manage Communications', description: 'Publish news, schedule articles and manage the media library.',          group: 'Content',      risk: 'normal' },
  // Squad & Fixtures
  { key: 'club.squad.manage',    label: 'Manage Squad',             description: 'Add/edit players and submit squad corrections to League OS.',               group: 'Operations',   risk: 'normal' },
  { key: 'club.matches.manage',  label: 'Manage Fixtures',          description: 'Submit fixture information and corrections to League OS.',                  group: 'Operations',   risk: 'normal' },
  // Members & Ticketing
  { key: 'club.ticketing.manage',label: 'Manage Ticketing',         description: 'Create match events, configure ticket types and operate match-day scanner.', group: 'Revenue',      risk: 'normal' },
  // Reports
  { key: 'club.reports.view',    label: 'View Analytics & Reports', description: 'Access club revenue, attendance and financial summary reports.',             group: 'Finance',      risk: 'normal' },
  // Admin (high-risk)
  { key: 'club.admin.manage',    label: 'Staff & Permissions Admin', description: 'Invite staff, assign roles and modify any permission settings.',           group: 'Administration', risk: 'critical',
    riskNote: 'This permission allows the holder to grant themselves or others elevated access, including this permission. Only assign to trusted club administrators. Changes are logged in the audit trail.' },
  // Finance (critical)
  { key: 'club.finance.manage',  label: 'Financial Administration', description: 'Approve disbursements, reconcile accounts and manage budget allocations.',  group: 'Finance',      risk: 'critical',
    riskNote: 'Grants direct access to club financial controls. Any disbursement action requires dual-approval from the Club Owner. Misuse may result in permanent revocation.' },
];

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  'Club Admin':         ALL_PERMISSIONS.map(p => p.key),
  'Communications':     ['club.profile.view', 'club.communications.manage'],
  'Finance Officer':    ['club.profile.view', 'club.reports.view', 'club.finance.manage'],
  'Ticketing Manager':  ['club.profile.view', 'club.ticketing.manage', 'club.reports.view'],
  'Store Manager':      ['club.profile.view'],
  'Team Manager':       ['club.profile.view', 'club.squad.manage', 'club.matches.manage'],
  'Club Doctor':        ['club.profile.view', 'club.squad.manage'],
  'Content Creator':    ['club.profile.view', 'club.communications.manage'],
};

type StaffStatus = 'active' | 'inactive';
type StaffMember = { id: string; name: string; dept: string; role: string; status: StaffStatus; last: string; email: string; permissions: string[] };
type Invite = { name: string; role: string; email: string; dept: string; sent: string };
type AuditEntry = { actor: string; action: string; module: string; date: string; time: string; ip: string };


const RISK_META: Record<Risk, { label: string; color: string; bgColor: string; borderColor: string }> = {
  normal:   { label: 'Standard',  color: '#22c55e', bgColor: 'rgba(34,197,94,0.06)',   borderColor: 'rgba(34,197,94,0.2)' },
  high:     { label: 'High Risk', color: '#f97316', bgColor: 'rgba(249,115,22,0.06)',  borderColor: 'rgba(249,115,22,0.25)' },
  critical: { label: 'Critical',  color: '#ef4444', bgColor: 'rgba(239,68,68,0.06)',   borderColor: 'rgba(239,68,68,0.25)' },
};

const PERM_GROUPS = ['Profile', 'Content', 'Operations', 'Revenue', 'Finance', 'Administration'];

const BLANK_INVITE = { name: '', role: ROLES[0], email: '', dept: DEPARTMENTS[0], sent: '' };
type ModalKind = null | 'invite' | 'staff-detail' | 'confirm-perm' | 'confirm-deactivate';

export default function ClubStaffPage() {
  const [activeTab, setActiveTab] = useState('Staff');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [inviteForm, setInviteForm] = useState(BLANK_INVITE);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [pendingPermToggle, setPendingPermToggle] = useState<{ staffId: string; permKey: string; adding: boolean } | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [auditActor, setAuditActor] = useState('All');
  const [auditModule, setAuditModule] = useState('All');
  const [staffSearch, setStaffSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const setInv = (k: keyof typeof BLANK_INVITE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInviteForm(f => ({ ...f, [k]: e.target.value }));

  const addAuditEntry = (actor: string, action: string, module: string) => {
    const now = new Date();
    setAudit(prev => [{
      actor, action, module,
      date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      ip: '—',
    }, ...prev]);
  };

  const sendInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setInvites(prev => [...prev, { ...inviteForm, sent: today }]);
    addAuditEntry('You', `Invited ${inviteForm.name} as ${inviteForm.role}`, 'Staff');
    showToast(`Invite sent to ${inviteForm.name}`);
    setModal(null);
    setInviteForm(BLANK_INVITE);
  };

  const cancelInvite = (email: string) => {
    const inv = invites.find(i => i.email === email);
    setInvites(prev => prev.filter(i => i.email !== email));
    if (inv) addAuditEntry('You', `Cancelled invite for ${inv.name}`, 'Staff');
    showToast('Invite cancelled');
  };

  const resendInvite = (name: string) => {
    addAuditEntry('You', `Resent invite to ${name}`, 'Staff');
    showToast(`Invite resent to ${name}`);
  };

  const openStaffDetail = (s: StaffMember) => { setSelectedStaff(s); setEditingPermId(s.id); setModal('staff-detail'); };

  // Toggle permission with confirmation gate for high-risk
  const requestPermToggle = (staffId: string, permKey: string, adding: boolean) => {
    const perm = ALL_PERMISSIONS.find(p => p.key === permKey);
    if (!perm) return;
    if (perm.risk === 'high' || perm.risk === 'critical') {
      setPendingPermToggle({ staffId, permKey, adding });
      setModal('confirm-perm');
    } else {
      applyPermToggle(staffId, permKey, adding, perm.label);
    }
  };

  const applyPermToggle = (staffId: string, permKey: string, adding: boolean, permLabel: string) => {
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      const permissions = adding
        ? [...s.permissions, permKey]
        : s.permissions.filter(p => p !== permKey);
      return { ...s, permissions };
    }));
    const s = staff.find(s => s.id === staffId);
    if (s) addAuditEntry('You', `${adding ? 'Granted' : 'Revoked'} "${permLabel}" for ${s.name}`, 'Staff');
    showToast(`Permission ${adding ? 'granted' : 'revoked'}`);
  };

  const confirmPermToggle = () => {
    if (!pendingPermToggle) return;
    const { staffId, permKey, adding } = pendingPermToggle;
    const perm = ALL_PERMISSIONS.find(p => p.key === permKey);
    if (perm) applyPermToggle(staffId, permKey, adding, perm.label);
    setPendingPermToggle(null);
    setModal('staff-detail');
  };

  const requestDeactivate = (id: string) => { setConfirmDeactivateId(id); setModal('confirm-deactivate'); };
  const confirmDeactivate = () => {
    if (!confirmDeactivateId) return;
    const s = staff.find(s => s.id === confirmDeactivateId);
    const newStatus = s?.status === 'active' ? 'inactive' : 'active';
    setStaff(prev => prev.map(s => s.id === confirmDeactivateId ? { ...s, status: newStatus } : s));
    if (s) addAuditEntry('You', `${newStatus === 'inactive' ? 'Deactivated' : 'Reactivated'} ${s.name}`, 'Staff');
    showToast(`Account ${newStatus === 'inactive' ? 'deactivated' : 'reactivated'}`);
    setConfirmDeactivateId(null);
    setModal(null);
  };

  const applyRolePreset = (staffId: string, role: string) => {
    const presetPerms = ROLE_PERMISSION_MAP[role] ?? [];
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, role, permissions: presetPerms } : s));
    const s = staff.find(s => s.id === staffId);
    if (s) addAuditEntry('You', `Changed ${s.name}'s role to ${role} (permissions reset to preset)`, 'Staff');
    showToast(`Role updated to ${role}`);
  };

  const filteredStaff = staff.filter(s =>
    !staffSearch || s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.dept.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const permStaff = staff.find(s => s.id === editingPermId) ?? staff[0] ?? null;

  const filteredAudit = audit.filter(a =>
    (auditActor === 'All' || a.actor === auditActor) &&
    (auditModule === 'All' || a.module === auditModule)
  );

  const auditActors = ['All', ...Array.from(new Set(audit.map(a => a.actor)))];
  const auditModules = ['All', ...Array.from(new Set(audit.map(a => a.module)))];

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Invite modal */}
      {modal === 'invite' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Invite Staff Member</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Full Name *</label>
                  <input className="ca-input" value={inviteForm.name} onChange={setInv('name')} placeholder="Staff full name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Email *</label>
                  <input className="ca-input" type="email" value={inviteForm.email} onChange={setInv('email')} placeholder="email@kccafc.co.ug" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Role</label>
                  <select className="ca-select" value={inviteForm.role} onChange={setInv('role')}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Department</label>
                  <select className="ca-select" value={inviteForm.dept} onChange={setInv('dept')}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {/* Role permission preview */}
              {inviteForm.role && (
                <div className="ca-invite-perm-preview">
                  <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Default permissions for {inviteForm.role}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(ROLE_PERMISSION_MAP[inviteForm.role] ?? []).map(pk => {
                      const p = ALL_PERMISSIONS.find(p => p.key === pk);
                      return p ? (
                        <span key={pk} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                          {p.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={sendInvite}><FiMail /> Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff detail + permission editor modal */}
      {modal === 'staff-detail' && selectedStaff && permStaff && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal ca-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Staff Profile — {selectedStaff.name}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              {/* Profile row */}
              <div className="ca-staff-profile">
                <div className="ca-staff-avatar">{selectedStaff.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{selectedStaff.name}</p>
                  <p style={{ margin: '2px 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{selectedStaff.email} · {selectedStaff.dept}</p>
                  <span className={`ca-pill ${selectedStaff.status === 'active' ? 'ca-pill-green' : 'ca-pill-muted'}`} style={{ fontSize: '0.65rem', marginTop: 4, display: 'inline-block' }}>{selectedStaff.status}</span>
                </div>
                {/* Role preset picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <label className="ca-label" style={{ margin: 0 }}>Role Preset</label>
                  <select className="ca-select" style={{ fontSize: '0.78rem' }} value={selectedStaff.role}
                    onChange={e => { applyRolePreset(selectedStaff.id, e.target.value); setSelectedStaff(prev => prev ? { ...prev, role: e.target.value, permissions: ROLE_PERMISSION_MAP[e.target.value] ?? [] } : prev); }}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Per-group permission toggles */}
              <p style={{ margin: '16px 0 10px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Individual Permissions</p>
              {PERM_GROUPS.map(group => {
                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                return (
                  <div key={group} className="ca-perm-group">
                    <p className="ca-perm-group-label">{group}</p>
                    {groupPerms.map(perm => {
                      const has = (staff.find(s => s.id === selectedStaff.id)?.permissions ?? []).includes(perm.key);
                      const meta = RISK_META[perm.risk];
                      return (
                        <div key={perm.key} className="ca-perm-row" style={perm.risk !== 'normal' ? { borderColor: meta.borderColor, background: meta.bgColor } : {}}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{perm.label}</span>
                              {perm.risk !== 'normal' && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  {perm.risk === 'critical' ? <FiAlertCircle style={{ fontSize: '0.65rem' }} /> : <FiAlertTriangle style={{ fontSize: '0.65rem' }} />}
                                  {meta.label}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{perm.description}</p>
                          </div>
                          <button
                            type="button"
                            className={`ca-perm-toggle ${has ? 'ca-perm-toggle-on' : ''}`}
                            onClick={() => requestPermToggle(selectedStaff.id, perm.key, !has)}
                            aria-label={`${has ? 'Revoke' : 'Grant'} ${perm.label}`}
                          >
                            <span className="ca-perm-toggle-knob" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-danger" onClick={() => requestDeactivate(selectedStaff.id)}>
                <FiXCircle /> {selectedStaff.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
              </button>
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* High-risk permission confirmation */}
      {modal === 'confirm-perm' && pendingPermToggle && (() => {
        const perm = ALL_PERMISSIONS.find(p => p.key === pendingPermToggle.permKey);
        const target = staff.find(s => s.id === pendingPermToggle.staffId);
        const meta = perm ? RISK_META[perm.risk] : null;
        return (
          <div className="ca-modal-overlay" onClick={() => { setPendingPermToggle(null); setModal('staff-detail'); }}>
            <div className="ca-modal" onClick={e => e.stopPropagation()}>
              <div className="ca-modal-header">
                <h2 className="ca-modal-title" style={{ color: meta?.color }}>
                  {perm?.risk === 'critical' ? <FiAlertCircle style={{ marginRight: 8 }} /> : <FiAlertTriangle style={{ marginRight: 8 }} />}
                  Confirm Permission Change
                </h2>
                <button type="button" className="ca-modal-close" onClick={() => { setPendingPermToggle(null); setModal('staff-detail'); }}><FiX /></button>
              </div>
              <div className="ca-modal-body">
                {perm && meta && (
                  <div style={{ padding: '14px', borderRadius: 10, border: `1px solid ${meta.borderColor}`, background: meta.bgColor, marginBottom: 14 }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 800, color: meta.color, fontSize: '0.85rem' }}>
                      {meta.label} Permission
                    </p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{perm.riskNote}</p>
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  You are about to <strong>{pendingPermToggle.adding ? 'grant' : 'revoke'}</strong> <strong>"{perm?.label}"</strong> for <strong>{target?.name}</strong>.
                  This action will be recorded in the audit log.
                </p>
              </div>
              <div className="ca-modal-footer">
                <button type="button" className="ca-btn ca-btn-secondary" onClick={() => { setPendingPermToggle(null); setModal('staff-detail'); }}>Cancel</button>
                <button type="button" className="ca-btn ca-btn-primary" style={{ background: meta?.color, borderColor: meta?.color }} onClick={confirmPermToggle}>
                  <FiShield /> Confirm &amp; Apply
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Deactivate confirmation */}
      {modal === 'confirm-deactivate' && confirmDeactivateId && (() => {
        const target = staff.find(s => s.id === confirmDeactivateId);
        const isDeactivating = target?.status === 'active';
        return (
          <div className="ca-modal-overlay" onClick={() => { setConfirmDeactivateId(null); setModal(null); }}>
            <div className="ca-modal" onClick={e => e.stopPropagation()}>
              <div className="ca-modal-header">
                <h2 className="ca-modal-title" style={{ color: isDeactivating ? '#ef4444' : '#22c55e' }}>
                  {isDeactivating ? 'Deactivate Account' : 'Reactivate Account'}
                </h2>
                <button type="button" className="ca-modal-close" onClick={() => { setConfirmDeactivateId(null); setModal(null); }}><FiX /></button>
              </div>
              <div className="ca-modal-body">
                {isDeactivating && (
                  <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#ef4444', lineHeight: 1.5 }}>
                      Deactivating this account immediately revokes all permissions and prevents login. The account can be reactivated at any time.
                    </p>
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  {isDeactivating
                    ? `Are you sure you want to deactivate ${target?.name}'s account?`
                    : `Reactivate ${target?.name}'s account and restore their permissions?`}
                </p>
              </div>
              <div className="ca-modal-footer">
                <button type="button" className="ca-btn ca-btn-secondary" onClick={() => { setConfirmDeactivateId(null); setModal(null); }}>Cancel</button>
                <button type="button" className={`ca-btn ${isDeactivating ? 'ca-btn-danger' : 'ca-btn-primary'}`} onClick={confirmDeactivate}>
                  {isDeactivating ? <><FiXCircle /> Deactivate</> : <><FiCheck /> Reactivate</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="ca-page-header">
        <div>

          <h1 className="ca-page-title">Staff, Roles &amp; Permissions</h1>
          <p className="ca-page-subtitle">Manage staff accounts, role presets, granular permissions and the audit trail.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setModal('invite')}><FiPlus /> Invite Staff</button>
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {activeTab === 'Staff' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Staff Directory</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.82rem' }} />
                    <input className="ca-input" style={{ paddingLeft: 28, width: 180, fontSize: '0.8rem', padding: '6px 10px 6px 28px' }}
                      placeholder="Search…" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
                  </div>
                  <span className="ca-panel-count">{filteredStaff.length} staff</span>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Name</th><th>Department</th><th>Role</th><th>Status</th><th>Last Active</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredStaff.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No staff members yet. Invite a staff member to get started.</td></tr>
                    )}
                    {filteredStaff.map(s => (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openStaffDetail(s)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="ca-staff-avatar-sm">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.82rem' }}>{s.name}</p>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>{s.dept}</td>
                        <td><span className="ca-pill ca-pill-purple" style={{ fontSize: '0.65rem' }}>{s.role}</span></td>
                        <td><span className={`ca-pill ${s.status === 'active' ? 'ca-pill-green' : 'ca-pill-muted'}`} style={{ fontSize: '0.65rem' }}>{s.status}</span></td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{s.last}</td>
                        <td>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-primary-light)', fontWeight: 600 }}>{s.permissions.length} perms</span>
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
                <h2 className="ca-panel-title">Pending Invitations</h2>
                <span className="ca-panel-count">{invites.length}</span>
              </div>
              {invites.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No pending invitations.</p>}
              {invites.map((inv, i) => (
                <div key={i} className="ca-alert-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div className="ca-alert-dot-yellow" />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{inv.name}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{inv.role} · sent {inv.sent}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiMail style={{ fontSize: '0.7rem' }} /> {inv.email}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, paddingLeft: 18 }}>
                    <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => resendInvite(inv.name)}><FiRefreshCw /> Resend</button>
                    <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" style={{ color: '#ef4444' }} onClick={() => cancelInvite(inv.email)}><FiXCircle /> Cancel</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Staff Status</h2></div>
              {[
                { label: 'Active',   value: staff.filter(s => s.status === 'active').length,   color: '#22c55e' },
                { label: 'Pending',  value: invites.length,                                     color: '#eab308' },
                { label: 'Inactive', value: staff.filter(s => s.status === 'inactive').length,  color: 'var(--color-text-muted)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} /> {s.label}
                  </span>
                  <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PERMISSIONS TAB ── */}
      {activeTab === 'Permissions' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Permission Editor</h2>
                {staff.length > 0 && (
                  <select className="ca-select" style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    value={editingPermId ?? ''} onChange={e => setEditingPermId(e.target.value)}>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                )}
              </div>
              {staff.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No staff members yet. Invite staff to manage their permissions.</p>
              )}

              {/* High-risk banner */}
              <div className="ca-perm-risk-banner">
                <FiShield style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Permission changes are audited.</strong> High-risk and critical permissions require an extra confirmation step and are logged to the audit trail with your identity and timestamp.
                </p>
              </div>

              {permStaff && PERM_GROUPS.map(group => {
                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                return (
                  <div key={group} className="ca-perm-group">
                    <p className="ca-perm-group-label">{group}</p>
                    {groupPerms.map(perm => {
                      const has = permStaff.permissions.includes(perm.key);
                      const meta = RISK_META[perm.risk];
                      return (
                        <div key={perm.key} className="ca-perm-row" style={perm.risk !== 'normal' ? { borderColor: meta.borderColor, background: meta.bgColor } : {}}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{perm.label}</span>
                              {perm.risk !== 'normal' && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  {perm.risk === 'critical' ? <FiAlertCircle style={{ fontSize: '0.65rem' }} /> : <FiAlertTriangle style={{ fontSize: '0.65rem' }} />}
                                  {meta.label}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{perm.description}</p>
                            {perm.riskNote && (
                              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: meta.color, lineHeight: 1.4, fontStyle: 'italic' }}>{perm.riskNote}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`ca-perm-toggle ${has ? 'ca-perm-toggle-on' : ''}`}
                            onClick={() => requestPermToggle(permStaff.id, perm.key, !has)}
                          >
                            <span className="ca-perm-toggle-knob" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Permission Legend</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['normal', 'high', 'critical'] as Risk[]).map(r => {
                  const meta = RISK_META[r];
                  return (
                    <div key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${meta.borderColor}`, background: meta.bgColor }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem', color: meta.color }}>{meta.label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          {r === 'normal' && 'Standard operational access. No additional confirmation required.'}
                          {r === 'high' && 'Creates financial or legal commitments. Requires confirmation before applying.'}
                          {r === 'critical' && 'Full control or financial disbursement. Requires confirmation and is always audited. Restrict to trusted admins only.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Role Presets</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(ROLE_PERMISSION_MAP).map(([role, perms]) => (
                  <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{role}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{perms.length} perms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TAB ── */}
      {activeTab === 'Audit' && (
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">Audit Trail</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={auditActor} onChange={e => setAuditActor(e.target.value)}>
                {auditActors.map(a => <option key={a}>{a}</option>)}
              </select>
              <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={auditModule} onChange={e => setAuditModule(e.target.value)}>
                {auditModules.map(m => <option key={m}>{m}</option>)}
              </select>
              <span className="ca-panel-count">{filteredAudit.length} entries</span>
            </div>
          </div>
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead>
                <tr><th>Actor</th><th>Action</th><th>Module</th><th>Date</th><th>Time</th><th>IP</th></tr>
              </thead>
              <tbody>
                {filteredAudit.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUser style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.8rem' }}>{a.actor}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', maxWidth: 300 }}>{a.action}</td>
                    <td><span className="ca-pill ca-pill-purple" style={{ fontSize: '0.65rem' }}>{a.module}</span></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{a.date}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{a.time}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{a.ip}</td>
                  </tr>
                ))}
                {filteredAudit.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>No entries match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
