import { useState } from 'react';
import { FiDownload, FiCheck, FiTrendingUp, FiUsers, FiCalendar, FiShoppingBag } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubAnalyticsPage.css';

const SEASONS = ['2025/26', '2024/25', '2023/24'];
const QUARTERS = ['Full Season', 'Q1', 'Q2', 'Q3', 'Q4'];
const TABS = ['Revenue', 'Members', 'Attendance', 'Store'];

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
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

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
