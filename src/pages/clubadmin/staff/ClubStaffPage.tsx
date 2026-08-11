import { useState } from 'react';
import { FiPlus, FiUserCheck, FiMail, FiX, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubStaffPage.css';

const KPI = [
  { label: 'Total Staff',     value: '48', delta: '5 new this season',  up: null },
  { label: 'Active Roles',    value: '11', delta: 'role types',          up: null },
  { label: 'Pending Invites', value: '7',  delta: 'awaiting response',   up: null },
  { label: 'Deactivated',     value: '23', delta: 'all seasons',         up: null },
];

const ROLES = ['Club Admin', 'Communications', 'Finance Officer', 'Ticketing Manager', 'Store Manager', 'Team Manager', 'Club Doctor', 'Content Creator', 'Membership Officer'];
const DEPARTMENTS = ['Management', 'Media', 'Finance', 'Technical', 'Medical', 'Memberships', 'Operations'];

type StaffStatus = 'active' | 'inactive';
type Staff = { name: string; dept: string; role: string; status: StaffStatus; last: string };
type Invite = { name: string; role: string; email: string; sent: string };

const INIT_STAFF: Staff[] = [
  { name: 'James Okello',  dept: 'Management',  role: 'Club Admin',         status: 'active',   last: '10 May 2026' },
  { name: 'Sarah Nambi',   dept: 'Media',       role: 'Communications',     status: 'active',   last: '10 May 2026' },
  { name: 'Mark Ssali',    dept: 'Media',       role: 'Content Creator',    status: 'active',   last: '9 May 2026' },
  { name: 'Grace Tibita',  dept: 'Finance',     role: 'Finance Officer',    status: 'active',   last: '8 May 2026' },
  { name: 'Robert Tendo',  dept: 'Technical',   role: 'Team Manager',       status: 'active',   last: '7 May 2026' },
  { name: 'Fred Mukobi',   dept: 'Medical',     role: 'Club Doctor',        status: 'active',   last: '5 May 2026' },
  { name: 'Patricia Apio', dept: 'Memberships', role: 'Membership Officer', status: 'inactive', last: '1 Apr 2026' },
];

const INIT_INVITES: Invite[] = [
  { name: 'David Wasswa', role: 'Ticketing Manager', email: 'd.wasswa@kccafc.co.ug', sent: '8 May 2026' },
  { name: 'Lydia Nakato', role: 'Store Manager',     email: 'l.nakato@kccafc.co.ug', sent: '7 May 2026' },
];

const PRESETS = [
  { role: 'Club Admin',        perms: ['Full Access'],          color: 'purple' },
  { role: 'Communications',    perms: ['News', 'Social'],       color: 'blue' },
  { role: 'Finance Officer',   perms: ['Analytics', 'Reports'], color: 'green' },
  { role: 'Ticketing Manager', perms: ['Tickets', 'Events'],    color: 'orange' },
  { role: 'Store Manager',     perms: ['Store', 'Orders'],      color: 'orange' },
];

const PILL_COLOR: Record<string, string> = {
  purple: 'ca-pill-purple', blue: 'ca-pill-blue', green: 'ca-pill-green', orange: 'ca-pill-orange',
};

const AUDIT = [
  { text: 'James Okello updated fixture vs SC Villa', time: '2h ago' },
  { text: 'Sarah Nambi published article on Patrick Kaddu', time: '4h ago' },
  { text: 'Grace Tibita generated Q1 financial report', time: '1d ago' },
  { text: 'David Wasswa invite sent (Ticketing Manager)', time: '2d ago' },
];

const BLANK_INVITE = { name: '', role: ROLES[0], email: '', sent: '' };
const BLANK_ROLE = { staffName: '', role: ROLES[0] };

type ModalKind = null | 'invite' | 'assignRole';

export default function ClubStaffPage() {
  const [staff, setStaff] = useState<Staff[]>(INIT_STAFF);
  const [invites, setInvites] = useState<Invite[]>(INIT_INVITES);
  const [modal, setModal] = useState<ModalKind>(null);
  const [inviteForm, setInviteForm] = useState(BLANK_INVITE);
  const [roleForm, setRoleForm] = useState(BLANK_ROLE);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const setInv = (k: keyof typeof BLANK_INVITE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInviteForm(f => ({ ...f, [k]: e.target.value }));

  const sendInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    setInvites(prev => [...prev, { ...inviteForm, sent: today }]);
    showToast(`Invite sent to ${inviteForm.name}`);
    setModal(null);
    setInviteForm(BLANK_INVITE);
  };

  const assignRole = () => {
    if (!roleForm.staffName) return;
    setStaff(prev => prev.map(s => s.name === roleForm.staffName ? { ...s, role: roleForm.role } : s));
    showToast(`Role updated for ${roleForm.staffName}`);
    setModal(null);
  };

  const cancelInvite = (email: string) => {
    setInvites(prev => prev.filter(i => i.email !== email));
    showToast('Invite cancelled');
  };

  const resendInvite = (name: string) => {
    showToast(`Invite resent to ${name}`);
  };

  const toggleStatus = (idx: number) => {
    setStaff(prev => prev.map((s, i) => i === idx ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
  };

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

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
                  <select className="ca-select">
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={sendInvite}><FiMail /> Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'assignRole' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Assign Role</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Staff Member</label>
                  <select className="ca-select" value={roleForm.staffName} onChange={e => setRoleForm(f => ({ ...f, staffName: e.target.value }))}>
                    <option value="">Select staff member…</option>
                    {staff.map(s => <option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">New Role</label>
                  <select className="ca-select" value={roleForm.role} onChange={e => setRoleForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={assignRole}><FiUserCheck /> Assign Role</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-09</p>
          <h1 className="ca-page-title">Staff, Roles &amp; Permissions</h1>
          <p className="ca-page-subtitle">Manage staff accounts, roles, access levels and system permissions.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal('assignRole')}><FiUserCheck /> Assign Role</button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={() => setModal('invite')}><FiPlus /> Invite Staff</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className="ca-kpi-delta neutral">{k.delta}</span>
          </div>
        ))}
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Staff Directory</h2>
              <span className="ca-panel-count">{staff.length} staff</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Name</th><th>Department</th><th>Role</th><th>Status</th><th>Last Active</th><th></th></tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.name}</td>
                      <td>{s.dept}</td>
                      <td>{s.role}</td>
                      <td><span className={`ca-pill ${s.status === 'active' ? 'ca-pill-green' : 'ca-pill-muted'}`}>{s.status}</span></td>
                      <td>{s.last}</td>
                      <td>
                        <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => toggleStatus(i)}>
                          {s.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Audit Activity</h2></div>
            <div className="ca-activity-list">
              {AUDIT.map((a, i) => (
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

        <div className="ca-content-aside">
          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Permission Presets</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PRESETS.map((p, i) => (
                <div key={i} className="ca-preset-row">
                  <span className={`ca-pill ${PILL_COLOR[p.color]}`}>{p.role}</span>
                  <span className="ca-preset-perms">{p.perms.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>

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
                  <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => resendInvite(inv.name)}>
                    <FiRefreshCw /> Resend
                  </button>
                  <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" style={{ color: '#ef4444' }} onClick={() => cancelInvite(inv.email)}>
                    <FiXCircle /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Staff Status</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Active',   value: staff.filter(s => s.status === 'active').length,   color: '#22c55e' },
                { label: 'Pending',  value: invites.length,                                     color: '#eab308' },
                { label: 'Inactive', value: staff.filter(s => s.status === 'inactive').length,  color: 'var(--color-text-muted)' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label}
                  </span>
                  <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
