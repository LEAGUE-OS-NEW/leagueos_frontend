import { useState } from 'react';
import { FiDownload, FiCheck, FiTrendingUp, FiUsers, FiCalendar, FiShoppingBag, FiFileText, FiPlus, FiX } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubAnalyticsPage.css';

const SEASONS = ['2025/26', '2024/25', '2023/24'];
const QUARTERS = ['Full Season', 'Q1', 'Q2', 'Q3', 'Q4'];
const TABS = ['Revenue', 'Members', 'Attendance', 'Store', 'Invoices', 'Audit Log'];

type KpiItem        = { label: string; value: string; delta: string; up: boolean | null };
type FinancialRow   = { category: string; q1: string; q2: string; q3: string; q4: string };
type Transaction    = { ref: string; desc: string; amt: string; date: string; type: 'credit' | 'debit' };
type BudgetItem     = { label: string; spent: number; total: number };
type TopProduct     = { name: string; rev: string; units: number };
type MemberStat     = { label: string; value: string; delta: string; up: boolean | null };
type PlanBreakdown  = { name: string; count: number; pct: number; color: string };
type RenewalRate    = { period: string; rate: number };
type MatchAttendance = { match: string; date: string; attendance: number; cap: number };
type ActivityItem   = { text: string; time: string };
type Invoice        = { id: string; ref: string; desc: string; amount: string; date: string; status: 'paid' | 'pending' | 'overdue' };
type AuditEntry     = { id: string; action: string; actor: string; target: string; timestamp: string };

// All data starts empty — will be populated from API
const KPI: KpiItem[] = [];
const FINANCIALS: Record<string, FinancialRow[]> = {};
const TRANSACTIONS: Transaction[] = [];
const BUDGET: BudgetItem[] = [];
const TOP_PRODUCTS: TopProduct[] = [];
const MEMBER_STATS: MemberStat[] = [];
const PLAN_BREAKDOWN: PlanBreakdown[] = [];
const RENEWAL_RATE: RenewalRate[] = [];
const MATCH_ATTENDANCE: MatchAttendance[] = [];
const ACTIVITY: ActivityItem[] = [];

const INV_STATUS_CLASS: Record<string, string> = {
  paid: 'ca-pill-green', pending: 'ca-pill-orange', overdue: 'ca-pill-red',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click();
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="ca-empty-state">
      <div className="ca-empty-icon">{icon}</div>
      <p className="ca-empty-title">{title}</p>
      <p className="ca-empty-sub">{sub}</p>
    </div>
  );
}

export default function ClubAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('Revenue');
  const [season, setSeason]   = useState('2025/26');
  const [quarter, setQuarter] = useState('Full Season');
  const [txnFilter, setTxnFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showInvModal, setShowInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ ref: '', desc: '', amount: '', date: '', status: 'pending' as Invoice['status'] });
  const [toast, setToast] = useState('');
  let invSeq = 300;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const saveInvoice = () => {
    if (!invForm.ref.trim() || !invForm.desc.trim()) return;
    const id = `inv-${invSeq++}`;
    setInvoices(prev => [...prev, { id, ...invForm }]);
    const entry: AuditEntry = {
      id: `aud-${invSeq++}`,
      action: 'Invoice Created',
      actor: 'Club Admin',
      target: invForm.ref,
      timestamp: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setAuditLog(prev => [entry, ...prev]);
    setInvForm({ ref: '', desc: '', amount: '', date: '', status: 'pending' });
    setShowInvModal(false);
    showToast('Invoice added');
  };

  const financials = FINANCIALS[quarter] ?? [];
  const filteredTxns = txnFilter === 'all' ? TRANSACTIONS : TRANSACTIONS.filter(t => t.type === txnFilter);

  const handleExport = () => {
    if (activeTab === 'Revenue') {
      exportCSV(financials as unknown as Record<string, unknown>[], `club-revenue-${season}-${quarter}.csv`);
    } else if (activeTab === 'Members') {
      exportCSV(PLAN_BREAKDOWN as unknown as Record<string, unknown>[], `club-members-${season}.csv`);
    } else if (activeTab === 'Attendance') {
      exportCSV(MATCH_ATTENDANCE as unknown as Record<string, unknown>[], `club-attendance-${season}.csv`);
    } else {
      exportCSV(TOP_PRODUCTS as unknown as Record<string, unknown>[], `club-store-${season}.csv`);
    }
    showToast('Report exported as CSV');
  };

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {showInvModal && (
        <div className="ca-modal-overlay" onClick={() => setShowInvModal(false)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Add Invoice / Receipt</h2>
              <button type="button" className="ca-modal-close" onClick={() => setShowInvModal(false)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field">
                  <label className="ca-label">Invoice Ref *</label>
                  <input className="ca-input" value={invForm.ref} onChange={e => setInvForm(f => ({ ...f, ref: e.target.value }))} placeholder="e.g. INV-2026-001" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Date</label>
                  <input className="ca-input" value={invForm.date} onChange={e => setInvForm(f => ({ ...f, date: e.target.value }))} placeholder="e.g. 15 Jan 2026" />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description *</label>
                  <input className="ca-input" value={invForm.desc} onChange={e => setInvForm(f => ({ ...f, desc: e.target.value }))} placeholder="Invoice description" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Amount</label>
                  <input className="ca-input" value={invForm.amount} onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. UGX 500,000" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={invForm.status} onChange={e => setInvForm(f => ({ ...f, status: e.target.value as Invoice['status'] }))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setShowInvModal(false)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveInvoice}><FiPlus /> Add Invoice</button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Club Analytics &amp; Reports</h1>
          <p className="ca-page-subtitle">Club-scoped performance and financial data. Platform-wide fund metrics are not shown here.</p>
        </div>
        <div className="ca-page-actions">
          <select className="ca-select" style={{ padding: '7px 12px', fontSize: '0.82rem' }} value={season} onChange={e => setSeason(e.target.value)}>
            {SEASONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="ca-select" style={{ padding: '7px 12px', fontSize: '0.82rem' }} value={quarter} onChange={e => setQuarter(e.target.value)}>
            {QUARTERS.map(q => <option key={q}>{q}</option>)}
          </select>
          <button type="button" className="ca-btn ca-btn-secondary" onClick={handleExport}>
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI bar — only rendered when there's data */}
      {KPI.length > 0 && (
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
      )}

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── REVENUE TAB ── */}
      {activeTab === 'Revenue' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Revenue Breakdown</h2>
                <span className="ca-panel-count">Season {season} · {quarter}</span>
              </div>
              {financials.length === 0 ? (
                <EmptyState
                  icon={<FiTrendingUp />}
                  title="No revenue data"
                  sub="Revenue breakdown will appear here once financial data is available for this season."
                />
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead>
                      <tr><th>Category</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>
                    </thead>
                    <tbody>
                      {financials.map((r, i) => (
                        <tr key={i} style={i === financials.length - 1 ? { borderTop: '1px solid var(--color-border)' } : {}}>
                          <td style={{ fontWeight: i === financials.length - 1 ? 800 : 600, color: 'var(--color-text-primary)' }}>{r.category}</td>
                          <td>{r.q1}</td><td>{r.q2}</td><td>{r.q3}</td>
                          <td style={{ fontWeight: 700, color: i === financials.length - 1 ? 'var(--color-primary-light)' : undefined }}>{r.q4}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Transactions</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="ca-select" style={{ padding: '5px 8px', fontSize: '0.78rem' }} value={txnFilter} onChange={e => setTxnFilter(e.target.value as typeof txnFilter)}>
                    <option value="all">All</option>
                    <option value="credit">Credits</option>
                    <option value="debit">Debits</option>
                  </select>
                  <span className="ca-panel-count">{filteredTxns.length} entries</span>
                </div>
              </div>
              {filteredTxns.length === 0 ? (
                <EmptyState
                  icon={<FiTrendingUp />}
                  title="No transactions"
                  sub="Financial transactions will appear here once activity is recorded."
                />
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead>
                      <tr><th>Ref</th><th>Description</th><th>Amount</th><th>Date</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                      {filteredTxns.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{t.ref}</td>
                          <td style={{ color: 'var(--color-text-primary)' }}>{t.desc}</td>
                          <td style={{ fontWeight: 700, color: t.type === 'credit' ? '#22c55e' : '#ef4444' }}>
                            {t.type === 'debit' ? '− ' : '+ '}{t.amt}
                          </td>
                          <td>{t.date}</td>
                          <td><span className={`ca-pill ${t.type === 'credit' ? 'ca-pill-green' : 'ca-pill-red'}`}>{t.type}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Budget Utilisation</h2>
              </div>
              {BUDGET.length === 0 ? (
                <EmptyState icon={<FiTrendingUp />} title="No budget data" sub="Budget allocation data will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {BUDGET.map(b => (
                    <div key={b.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{b.label}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.spent > 70 ? '#f97316' : '#22c55e' }}>{b.spent}%</span>
                      </div>
                      <div className="ca-budget-bar-wrap">
                        <div className="ca-budget-bar" style={{ width: `${b.spent}%`, background: b.spent > 70 ? 'linear-gradient(90deg,#f97316,#ef4444)' : 'var(--gradient-primary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Finance Activity</h2></div>
              {ACTIVITY.length === 0 ? (
                <EmptyState icon={<FiTrendingUp />} title="No recent activity" sub="Recent financial activity will be listed here." />
              ) : (
                <div className="ca-activity-list">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="ca-activity-item">
                      <div className="ca-activity-dot" />
                      <div><p className="ca-activity-text">{a.text}</p><p className="ca-activity-time">{a.time}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ── */}
      {activeTab === 'Members' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            {MEMBER_STATS.length > 0 && (
              <div className="ca-kpi-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 0 }}>
                {MEMBER_STATS.map(s => (
                  <div key={s.label} className="ca-kpi-card">
                    <p className="ca-kpi-label">{s.label}</p>
                    <p className="ca-kpi-value">{s.value}</p>
                    <span className={`ca-kpi-delta ${s.up === true ? 'up' : s.up === false ? 'down' : 'neutral'}`}>{s.up === true ? '↑ ' : ''}{s.delta}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Membership Plan Distribution</h2></div>
              {PLAN_BREAKDOWN.length === 0 ? (
                <EmptyState icon={<FiUsers />} title="No membership data" sub="Membership plan distribution will appear here once members join." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {PLAN_BREAKDOWN.map(p => (
                    <div key={p.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.count.toLocaleString()} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({p.pct}%)</span></span>
                      </div>
                      <div className="ca-budget-bar-wrap">
                        <div className="ca-budget-bar" style={{ width: `${p.pct}%`, background: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Renewal Rate Trend</h2></div>
              {RENEWAL_RATE.length === 0 ? (
                <EmptyState icon={<FiUsers />} title="No renewal data" sub="Membership renewal rates will be shown here across seasons." />
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead><tr><th>Period</th><th>Renewal Rate</th><th>Trend</th></tr></thead>
                    <tbody>
                      {RENEWAL_RATE.map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--color-text-primary)', fontWeight: i === RENEWAL_RATE.length - 1 ? 700 : undefined }}>{r.period}</td>
                          <td style={{ fontWeight: 800, color: '#22c55e' }}>{r.rate}%</td>
                          <td>
                            <div className="ca-budget-bar-wrap">
                              <div className="ca-budget-bar" style={{ width: `${r.rate}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Finance Activity</h2></div>
              {ACTIVITY.length === 0 ? (
                <EmptyState icon={<FiUsers />} title="No recent activity" sub="Recent financial activity will be listed here." />
              ) : (
                <div className="ca-activity-list">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="ca-activity-item">
                      <div className="ca-activity-dot" />
                      <div><p className="ca-activity-text">{a.text}</p><p className="ca-activity-time">{a.time}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'Attendance' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Match Attendance</h2>
                <span className="ca-panel-count">{MATCH_ATTENDANCE.length} matches</span>
              </div>
              {MATCH_ATTENDANCE.length === 0 ? (
                <EmptyState icon={<FiCalendar />} title="No attendance records" sub="Match attendance figures will appear here after fixtures are played." />
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead><tr><th>Match</th><th>Date</th><th>Attendance</th><th>Capacity</th><th>Fill Rate</th></tr></thead>
                    <tbody>
                      {MATCH_ATTENDANCE.map((m, i) => {
                        const pct = Math.round(m.attendance / m.cap * 100);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{m.match}</td>
                            <td>{m.date}</td>
                            <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{m.attendance.toLocaleString()}</td>
                            <td>{m.cap.toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="ca-budget-bar-wrap" style={{ flex: 1, minWidth: 60 }}>
                                  <div className="ca-budget-bar" style={{ width: `${pct}%`, background: pct > 85 ? 'var(--gradient-primary)' : pct > 60 ? 'linear-gradient(90deg,#3b82f6,#22c55e)' : 'linear-gradient(90deg,#f97316,#eab308)' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Season Avg. Fill Rate</h2></div>
              <EmptyState icon={<FiCalendar />} title="No data yet" sub="Season fill rate will be calculated once matches are played." />
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Finance Activity</h2></div>
              {ACTIVITY.length === 0 ? (
                <EmptyState icon={<FiCalendar />} title="No recent activity" sub="Recent financial activity will be listed here." />
              ) : (
                <div className="ca-activity-list">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="ca-activity-item">
                      <div className="ca-activity-dot" />
                      <div><p className="ca-activity-text">{a.text}</p><p className="ca-activity-time">{a.time}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICES TAB ── */}
      {activeTab === 'Invoices' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button type="button" className="ca-btn ca-btn-primary" onClick={() => setShowInvModal(true)}><FiPlus /> Add Invoice</button>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Invoices &amp; Receipts</h2>
                <span className="ca-panel-count">{invoices.length} records</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Ref</th><th>Description</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No invoices yet. Add an invoice to start tracking.</td></tr>
                    )}
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{inv.ref}</td>
                        <td style={{ color: 'var(--color-text-primary)' }}>{inv.desc}</td>
                        <td style={{ fontWeight: 700 }}>{inv.amount || '—'}</td>
                        <td>{inv.date || '—'}</td>
                        <td><span className={`ca-pill ${INV_STATUS_CLASS[inv.status]}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Summary</h2></div>
              {(['paid', 'pending', 'overdue'] as Invoice['status'][]).map(status => {
                const count = invoices.filter(i => i.status === status).length;
                return (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{status}</span>
                    <span className={`ca-pill ${INV_STATUS_CLASS[status]}`} style={{ fontSize: '0.65rem' }}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Ticketing Payments</h2></div>
              <EmptyState icon={<FiFileText />} title="No ticketing payments" sub="Ticket sale payments will appear here once events are published." />
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {activeTab === 'Audit Log' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Audit Trail &amp; Logs</h2>
                <span className="ca-panel-count">{auditLog.length} entries</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Timestamp</th></tr></thead>
                  <tbody>
                    {auditLog.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No audit entries yet. Actions taken in this dashboard are logged here.</td></tr>
                    )}
                    {auditLog.map(entry => (
                      <tr key={entry.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{entry.action}</td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{entry.actor}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>{entry.target}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{entry.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">About Audit Logs</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Actions you take in this dashboard generate audit entries',
                  'Logs include invoices, staff changes, and squad submissions',
                  'Entries are timestamped with actor and target',
                ].map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)', alignItems: 'flex-start' }}>
                    <FiFileText style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: 2 }} />{note}
                  </div>
                ))}
              </div>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Income &amp; Expense Summary</h2></div>
              <EmptyState icon={<FiTrendingUp />} title="No financial summary" sub="Income and expense totals will appear here once transactions are recorded." />
            </div>
          </div>
        </div>
      )}

      {/* ── STORE TAB ── */}
      {activeTab === 'Store' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Top Revenue Products</h2></div>
              {TOP_PRODUCTS.length === 0 ? (
                <EmptyState icon={<FiShoppingBag />} title="No store data" sub="Top-selling products and revenue figures will appear here once sales are recorded." />
              ) : (
                <div className="ca-table-wrap">
                  <table className="ca-table">
                    <thead><tr><th>Rank</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {TOP_PRODUCTS.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 800, color: 'var(--color-primary-light)' }}>#{i + 1}</td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</td>
                          <td>{p.units.toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: '#22c55e' }}>{p.rev}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Store Revenue</h2></div>
              <EmptyState icon={<FiShoppingBag />} title="No revenue yet" sub="Store revenue totals will appear here once products are sold." />
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Finance Activity</h2></div>
              {ACTIVITY.length === 0 ? (
                <EmptyState icon={<FiShoppingBag />} title="No recent activity" sub="Recent financial activity will be listed here." />
              ) : (
                <div className="ca-activity-list">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="ca-activity-item">
                      <div className="ca-activity-dot" />
                      <div><p className="ca-activity-text">{a.text}</p><p className="ca-activity-time">{a.time}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
