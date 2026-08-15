import { useState } from 'react';
import {
  FiPlus, FiDownload, FiX, FiRefreshCw, FiEdit2,
  FiCheck, FiTrash2, FiUser, FiMail, FiCalendar,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import { DEMO_ENTITLEMENTS } from '../../../components/clubadmin/clubAdminData';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubMembershipsPage.css';

const TABS = ['Overview', 'Members', 'Plans', 'Renewals', 'Benefits'];

type Status = 'active' | 'expired' | 'expiring';
type Member = { name: string; email: string; plan: string; start: string; expiry: string; payment: string; status: Status; phone?: string };
type Plan = { id: string; name: string; price: string; period: string; maxMembers: number; description: string; benefits: string[] };

const STATUS_CLASS: Record<string, string> = {
  active: 'ca-pill-green', expired: 'ca-pill-red', expiring: 'ca-pill-orange',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

const BLANK_MEMBER: Omit<Member, 'status'> = { name: '', email: '', plan: '', start: '', expiry: '', payment: '', phone: '' };
const BLANK_PLAN: Omit<Plan, 'id'> = { name: '', price: '', period: '/yr', maxMembers: 1000, description: '', benefits: [] };

type ModalKind = null | 'add-member' | 'edit-plan' | 'new-plan' | 'member-detail';

let planIdCounter = 100;

export default function ClubMembershipsPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [memberForm, setMemberForm] = useState(BLANK_MEMBER);
  const [planForm, setPlanForm] = useState<Omit<Plan, 'id'>>(BLANK_PLAN);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newBenefit, setNewBenefit] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [toast, setToast] = useState('');

  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEnt = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const ents = rawEnt.length > 0 ? rawEnt : DEMO_ENTITLEMENTS;
  const current = ents.find(e => e.id === selectedEntitlementId) ?? ents[0] ?? null;
  const canManage = current?.permissions.includes('club.members.manage') ?? true;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const setM = (k: keyof typeof BLANK_MEMBER) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setMemberForm(f => ({ ...f, [k]: e.target.value }));

  const addMember = () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) return;
    const plan = plans.find(p => p.name === memberForm.plan);
    const payment = plan ? plan.price + plan.period : '';
    setMembers(prev => [...prev, { ...memberForm, payment, status: 'active' }]);
    showToast(`${memberForm.name} enrolled`);
    setModal(null);
    setMemberForm(BLANK_MEMBER);
  };

  const renewMember = (name: string) => {
    setMembers(prev => prev.map(m => m.name === name ? { ...m, status: 'active' } : m));
    showToast(`Renewal reminder sent to ${name}`);
  };

  const openNewPlan = () => { setPlanForm(BLANK_PLAN); setEditPlanId(null); setNewBenefit(''); setModal('new-plan'); };
  const openEditPlan = (plan: Plan) => { setPlanForm({ name: plan.name, price: plan.price, period: plan.period, maxMembers: plan.maxMembers, description: plan.description, benefits: [...plan.benefits] }); setEditPlanId(plan.id); setNewBenefit(''); setModal('edit-plan'); };

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setPlanForm(f => ({ ...f, benefits: [...f.benefits, newBenefit.trim()] }));
    setNewBenefit('');
  };
  const removeBenefit = (i: number) => setPlanForm(f => ({ ...f, benefits: f.benefits.filter((_, idx) => idx !== i) }));

  const savePlan = () => {
    if (!planForm.name.trim()) return;
    if (editPlanId) {
      setPlans(prev => prev.map(p => p.id === editPlanId ? { ...planForm, id: editPlanId } : p));
      showToast('Plan updated');
    } else {
      const id = `plan-${planIdCounter++}`;
      setPlans(prev => [...prev, { ...planForm, id }]);
      showToast(`Plan "${planForm.name}" created`);
    }
    setModal(null);
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    showToast('Plan removed');
    setModal(null);
  };

  const openMemberDetail = (m: Member) => { setSelectedMember(m); setModal('member-detail'); };

  const filtered = members.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'All' || m.plan === filterPlan;
    const matchStatus = filterStatus === 'All' || m.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const expiring = members.filter(m => m.status === 'expiring' || m.status === 'expired');
  const planCounts = plans.map(p => ({
    ...p,
    members: members.filter(m => m.plan === p.name).length,
    pct: Math.round(members.filter(m => m.plan === p.name).length / Math.max(members.length, 1) * 100),
  }));

  const allBenefits = plans.flatMap(p => p.benefits.map(b => ({ plan: p.name, benefit: b })));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* Add Member modal */}
      {modal === 'add-member' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Enrol New Member</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Full Name *</label>
                  <input className="ca-input" value={memberForm.name} onChange={setM('name')} placeholder="Member full name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Email *</label>
                  <input className="ca-input" type="email" value={memberForm.email} onChange={setM('email')} placeholder="email@example.com" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Phone</label>
                  <input className="ca-input" value={memberForm.phone ?? ''} onChange={setM('phone')} placeholder="+256 700 000 000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Membership Plan</label>
                  <select className="ca-select" value={memberForm.plan} onChange={setM('plan')}>
                    <option value="">— Select plan —</option>
                    {plans.map(p => <option key={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Start Date</label>
                  <input className="ca-input" type="date" value={memberForm.start} onChange={setM('start')} />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Expiry Date</label>
                  <input className="ca-input" type="date" value={memberForm.expiry} onChange={setM('expiry')} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={addMember}><FiPlus /> Enrol Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan create/edit modal */}
      {(modal === 'new-plan' || modal === 'edit-plan') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal ca-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'new-plan' ? 'Create Membership Plan' : 'Edit Membership Plan'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Plan Name *</label>
                  <input className="ca-input" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Gold" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price</label>
                  <input className="ca-input" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. UGX 120,000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Period</label>
                  <select className="ca-select" value={planForm.period} onChange={e => setPlanForm(f => ({ ...f, period: e.target.value }))}>
                    <option value="/yr">/yr (annual)</option>
                    <option value="/mo">/mo (monthly)</option>
                    <option value=" once">One-time</option>
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Max Members</label>
                  <input className="ca-input" type="number" min="1" value={planForm.maxMembers} onChange={e => setPlanForm(f => ({ ...f, maxMembers: Number(e.target.value) }))} />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description</label>
                  <textarea className="ca-textarea" rows={2} value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Briefly describe this plan…" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Benefits</label>
                  <div className="ca-benefits-list">
                    {planForm.benefits.map((b, i) => (
                      <div key={i} className="ca-benefit-item">
                        <FiCheck style={{ color: '#22c55e', fontSize: '0.75rem', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{b}</span>
                        <button type="button" className="ca-icon-btn" style={{ width: 22, height: 22 }} onClick={() => removeBenefit(i)}><FiTrash2 style={{ fontSize: '0.72rem', color: '#ef4444' }} /></button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input className="ca-input" style={{ flex: 1 }} value={newBenefit} onChange={e => setNewBenefit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addBenefit()}
                      placeholder="Add a benefit and press Enter…" />
                    <button type="button" className="ca-btn ca-btn-secondary" onClick={addBenefit}><FiPlus /></button>
                  </div>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              {modal === 'edit-plan' && editPlanId && (
                <button type="button" className="ca-btn ca-btn-danger" style={{ marginRight: 'auto' }} onClick={() => deletePlan(editPlanId)}>
                  <FiTrash2 /> Delete Plan
                </button>
              )}
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={savePlan}>
                {modal === 'new-plan' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member detail modal */}
      {modal === 'member-detail' && selectedMember && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Member Profile</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-member-profile">
                <div className="ca-member-avatar">{selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>{selectedMember.name}</p>
                  <span className={`ca-pill ${STATUS_CLASS[selectedMember.status]}`} style={{ fontSize: '0.65rem', marginTop: 4, display: 'inline-block' }}>{selectedMember.status}</span>
                </div>
              </div>
              <div className="ca-member-detail-grid">
                <div className="ca-member-detail-row"><FiMail style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} /><span>{selectedMember.email}</span></div>
                {selectedMember.phone && <div className="ca-member-detail-row"><FiUser style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} /><span>{selectedMember.phone}</span></div>}
                <div className="ca-member-detail-row"><FiCalendar style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} /><span>Joined {selectedMember.start || '—'} · Expires {selectedMember.expiry || '—'}</span></div>
              </div>
              <div className="ca-member-plan-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{selectedMember.plan}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontSize: '0.82rem' }}>{selectedMember.payment}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(plans.find(p => p.name === selectedMember.plan)?.benefits ?? []).map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      <FiCheck style={{ color: '#22c55e', fontSize: '0.72rem', flexShrink: 0 }} />{b}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Close</button>
              {canManage && (selectedMember.status === 'expired' || selectedMember.status === 'expiring') && (
                <button type="button" className="ca-btn ca-btn-primary" onClick={() => { renewMember(selectedMember.name); setModal(null); }}>
                  <FiRefreshCw /> Send Renewal Reminder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Memberships &amp; Renewals</h1>
          <p className="ca-page-subtitle">Manage club memberships, plans, renewals and member benefits.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary"
            onClick={() => exportCSV(members as unknown as Record<string, unknown>[], 'members.csv')}>
            <FiDownload /> Export
          </button>
          {canManage && (
            <button type="button" className="ca-btn ca-btn-primary" onClick={() => setModal('add-member')}><FiPlus /> Enrol Member</button>
          )}
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW / MEMBERS ── */}
      {(activeTab === 'Overview' || activeTab === 'Members') && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Member Directory</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input className="ca-input" style={{ width: 180, padding: '6px 10px', fontSize: '0.8rem' }}
                    placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                  <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                    <option value="All">All Plans</option>
                    {plans.map(p => <option key={p.id}>{p.name}</option>)}
                  </select>
                  <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expiring">Expiring</option>
                    <option value="expired">Expired</option>
                  </select>
                  <span className="ca-panel-count">{filtered.length} shown</span>
                </div>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead>
                    <tr><th>Name</th><th>Plan</th><th>Joined</th><th>Expires</th><th>Payment</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No members yet. Use "Enrol Member" to add one.</td></tr>
                    )}
                    {filtered.map((m, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => openMemberDetail(m)}>
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
              <div className="ca-panel-header"><h2 className="ca-panel-title">Plan Breakdown</h2></div>
              {planCounts.length === 0
                ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No plans created yet.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {planCounts.map(p => (
                      <div key={p.id} className="ca-plan-card">
                        <div className="ca-plan-info">
                          <span className="ca-plan-name">{p.name}</span>
                          <span className="ca-plan-price">{p.price}{p.period}</span>
                        </div>
                        <div className="ca-plan-members">{p.members}</div>
                        <div className="ca-channel-bar-wrap" style={{ width: '80px' }}>
                          <div className="ca-channel-bar" style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="ca-channel-pct">{p.pct}%</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Expiry Alerts</h2>
                <span className="ca-panel-count">{expiring.length} soon</span>
              </div>
              {expiring.length === 0
                ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No expiring memberships.</p>
                : expiring.map((e, i) => (
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
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── PLANS ── */}
      {activeTab === 'Plans' && (
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">Membership Plans</h2>
            {canManage && (
              <button type="button" className="ca-btn ca-btn-primary ca-btn-sm" onClick={openNewPlan}><FiPlus /> New Plan</button>
            )}
          </div>
          {planCounts.length === 0
            ? <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No plans yet. Create your first membership plan.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
                {planCounts.map(p => (
                  <div key={p.id} className="ca-plan-full-card">
                    <div className="ca-plan-full-header">
                      <div>
                        <p className="ca-plan-full-name">{p.name}</p>
                        <p className="ca-plan-full-price">{p.price}<span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{p.period}</span></p>
                      </div>
                      {canManage && (
                        <button type="button" className="ca-icon-btn" onClick={() => openEditPlan(p)}><FiEdit2 /></button>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{p.description}</p>
                    <div className="ca-channel-bar-wrap" style={{ marginBottom: 6, width: '100%' }}>
                      <div className="ca-channel-bar" style={{ width: `${p.pct}%` }} />
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.members} members · {p.pct}% of total · max {p.maxMembers.toLocaleString()}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {p.benefits.map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                          <FiCheck style={{ color: '#22c55e', fontSize: '0.72rem', flexShrink: 0 }} />{b}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── RENEWALS ── */}
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
                    <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', cursor: 'pointer' }} onClick={() => openMemberDetail(m)}>{m.name}</td>
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
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No renewals due.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BENEFITS ── */}
      {activeTab === 'Benefits' && (
        <div className="ca-panel">
          <div className="ca-panel-header"><h2 className="ca-panel-title">Member Benefits by Plan</h2></div>
          <div className="ca-table-wrap">
            <table className="ca-table">
              <thead><tr><th>Plan</th><th>Benefit</th></tr></thead>
              <tbody>
                {allBenefits.length === 0 && (
                  <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No benefits defined. Add benefits when creating or editing a plan.</td></tr>
                )}
                {allBenefits.map((b, i) => (
                  <tr key={i}>
                    <td><span className="ca-pill ca-pill-purple" style={{ fontSize: '0.65rem' }}>{b.plan}</span></td>
                    <td style={{ color: 'var(--color-text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiCheck style={{ color: '#22c55e', fontSize: '0.75rem', flexShrink: 0 }} />{b.benefit}
                      </div>
                    </td>
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
