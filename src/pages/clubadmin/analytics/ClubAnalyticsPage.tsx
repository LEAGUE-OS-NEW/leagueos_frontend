import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubAnalyticsPage.css';

const KPI = [
  { label: 'Monthly Revenue',   value: 'UGX 214.8M', delta: '+9.3%', up: true },
  { label: 'Fan Assets',        value: 'UGX 98.4M',  delta: '+12%',  up: true },
  { label: 'Trust Balance',     value: 'UGX 42.1M',  delta: 'club trust', up: null },
  { label: 'Store Revenue',     value: 'UGX 124.6M', delta: '+18%',  up: true },
  { label: 'Sponsorship Rev.',  value: 'UGX 110.0M', delta: '+5%',   up: true },
];

const FINANCIALS = [
  { category: 'Ticket Sales',     q1: 'UGX 42M',  q2: 'UGX 56M',  q3: 'UGX 38M',  q4: 'UGX 79M'  },
  { category: 'Memberships',      q1: 'UGX 28M',  q2: 'UGX 31M',  q3: 'UGX 30M',  q4: 'UGX 36M'  },
  { category: 'Store',            q1: 'UGX 18M',  q2: 'UGX 24M',  q3: 'UGX 29M',  q4: 'UGX 54M'  },
  { category: 'Sponsorship',      q1: 'UGX 27M',  q2: 'UGX 27M',  q3: 'UGX 28M',  q4: 'UGX 28M'  },
  { category: 'Total',            q1: 'UGX 115M', q2: 'UGX 138M', q3: 'UGX 125M', q4: 'UGX 197M' },
];

const TRANSACTIONS = [
  { ref: 'TXN-9921', desc: 'Ticket sales — KCCA vs SC Villa',    amt: 'UGX 84.0M', date: '18 May 2026', type: 'credit' },
  { ref: 'TXN-9920', desc: 'Store payout — Q1 earnings',         amt: 'UGX 18.0M', date: '15 May 2026', type: 'credit' },
  { ref: 'TXN-9919', desc: 'Player salary disbursement',         amt: 'UGX 42.0M', date: '1 May 2026',  type: 'debit' },
  { ref: 'TXN-9918', desc: 'Airtel Uganda sponsorship inflow',   amt: 'UGX 27.5M', date: '28 Apr 2026', type: 'credit' },
  { ref: 'TXN-9917', desc: 'Stadium maintenance cost',           amt: 'UGX 6.0M',  date: '25 Apr 2026', type: 'debit' },
];

const BUDGET = [
  { label: 'Player Wages',   spent: 78, total: 100 },
  { label: 'Operations',     spent: 52, total: 100 },
  { label: 'Marketing',      spent: 34, total: 100 },
  { label: 'Travel',         spent: 61, total: 100 },
];

const TOP_PRODUCTS = [
  { name: 'Home Jersey 2025/26', rev: 'UGX 100.8M' },
  { name: 'Training Kit',        rev: 'UGX 30.8M'  },
  { name: 'KCCA FC Scarf',       rev: 'UGX 9.5M'   },
  { name: 'Away Jersey',         rev: 'UGX 6.6M'   },
];

const ACTIVITY = [
  { text: 'Monthly report generated — April 2026', time: '1d ago' },
  { text: 'Membership revenue surpassed UGX 124M', time: '3d ago' },
  { text: 'Q1 financial reconciliation completed', time: '1w ago' },
  { text: 'Budget allocated for CAF CC travel', time: '2w ago' },
];

export default function ClubAnalyticsPage() {
  return (
    <ClubAdminLayout>
      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-08</p>
          <h1 className="ca-page-title">Club Analytics &amp; Finance</h1>
          <p className="ca-page-subtitle">Track club performance metrics and financial data to drive decisions.</p>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map((k) => (
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
          {/* Financial summary */}
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Financial Summary</h2>
              <span className="ca-panel-count">Season 2025/26</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Category</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>
                </thead>
                <tbody>
                  {FINANCIALS.map((r, i) => (
                    <tr key={i} style={i === FINANCIALS.length - 1 ? { borderTop: '1px solid var(--color-border)' } : {}}>
                      <td style={{ fontWeight: i === FINANCIALS.length - 1 ? 800 : 600, color: 'var(--color-text-primary)' }}>{r.category}</td>
                      <td>{r.q1}</td><td>{r.q2}</td><td>{r.q3}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{r.q4}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Recent Transactions</h2>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Ref</th><th>Description</th><th>Amount</th><th>Date</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{t.ref}</td>
                      <td style={{ color: 'var(--color-text-primary)' }}>{t.desc}</td>
                      <td style={{ fontWeight: 700, color: t.type === 'credit' ? '#22c55e' : '#ef4444' }}>
                        {t.type === 'debit' ? '−' : '+'} {t.amt}
                      </td>
                      <td>{t.date}</td>
                      <td><span className={`ca-pill ${t.type === 'credit' ? 'ca-pill-green' : 'ca-pill-red'}`}>{t.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          {/* Top products */}
          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Top Revenue Products</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TOP_PRODUCTS.map((p, i) => (
                <div key={i} className="ca-bestseller-row">
                  <span className="ca-bestseller-rank">#{i + 1}</span>
                  <span className="ca-bestseller-name">{p.name}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' }}>{p.rev}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget reconciliation */}
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Budget Utilisation</h2>
              <span className="ca-panel-count">68% overall</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BUDGET.map((b) => (
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
          </div>

          {/* Activity */}
          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Finance Activity</h2></div>
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
