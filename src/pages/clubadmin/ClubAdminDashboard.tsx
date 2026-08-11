import { FiUsers, FiCalendar, FiTrendingUp, FiTag, FiShoppingCart, FiStar, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ClubAdminLayout from '../../components/clubadmin/ClubAdminLayout';
import '../../components/clubadmin/ClubAdminLayout.css';
import './ClubAdminDashboard.css';

const QUICK_STATS = [
  { label: 'Total Members',   value: '8,642',     delta: '+4.1%', up: true,  icon: FiUsers },
  { label: 'Upcoming Fixtures', value: '6',       delta: 'next 30 days', up: null, icon: FiCalendar },
  { label: 'Monthly Revenue', value: 'UGX 214.8M', delta: '+12%', up: true,  icon: FiTrendingUp },
  { label: 'Tickets Sold',    value: '12,842',    delta: '+8.3%', up: true,  icon: FiTag },
  { label: 'Store Orders',    value: '36',        delta: 'pending', up: null, icon: FiShoppingCart },
  { label: 'Active Sponsors', value: '12',        delta: '6 agreements', up: null, icon: FiStar },
];

const QUICK_LINKS = [
  { label: 'Club Profile & Branding',   route: '/club-admin/profile',     code: 'CA-01' },
  { label: 'Fixtures & Match Ops',      route: '/club-admin/fixtures',     code: 'CA-02' },
  { label: 'Squad & Team Management',   route: '/club-admin/squad',        code: 'CA-03' },
  { label: 'News & Communications',     route: '/club-admin/news',         code: 'CA-04' },
  { label: 'Memberships & Renewals',    route: '/club-admin/memberships',  code: 'CA-05' },
  { label: 'Ticketing & Match Events',  route: '/club-admin/tickets',      code: 'CA-06' },
  { label: 'Store & Orders',            route: '/club-admin/store',        code: 'CA-07' },
  { label: 'Analytics & Finance',       route: '/club-admin/analytics',    code: 'CA-08' },
  { label: 'Staff & Permissions',       route: '/club-admin/staff',        code: 'CA-09' },
  { label: 'Sponsors & Partnerships',   route: '/club-admin/sponsors',     code: 'CA-10' },
];

const RECENT = [
  { text: 'Membership renewed — Brian Ssempa (Premium Gold)', time: '5m ago' },
  { text: 'New fixture added vs SC Villa — 18 May 2026', time: '1h ago' },
  { text: 'Store order #4821 placed — KCCA Jersey (XL)', time: '2h ago' },
  { text: 'Squad submitted for CAF CC Round 2', time: '3h ago' },
  { text: 'Sponsor agreement renewed — Airtel Uganda', time: 'Yesterday' },
];

export default function ClubAdminDashboard() {
  return (
    <ClubAdminLayout>
      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">Club Admin</p>
          <h1 className="ca-page-title">Dashboard</h1>
          <p className="ca-page-subtitle">KCCA FC · Uganda Premier League · Season 2025/26</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="ca-kpi-bar">
        {QUICK_STATS.map((s) => (
          <div key={s.label} className="ca-kpi-card">
            <s.icon style={{ color: 'var(--color-primary-light)', fontSize: '1.1rem' }} />
            <p className="ca-kpi-label">{s.label}</p>
            <p className="ca-kpi-value">{s.value}</p>
            {s.delta && (
              <span className={`ca-kpi-delta ${s.up === true ? 'up' : s.up === false ? 'down' : 'neutral'}`}>
                {s.up === true ? '↑' : s.up === false ? '↓' : ''} {s.delta}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="ca-dash-grid">
        {/* Quick links */}
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">All Sections</h2>
          </div>
          <div className="ca-dash-modules">
            {QUICK_LINKS.map((l) => (
              <Link key={l.route} to={l.route} className="ca-dash-module-link">
                <span className="ca-dash-module-code">{l.code}</span>
                <span className="ca-dash-module-label">{l.label}</span>
                <FiArrowRight className="ca-dash-module-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">Recent Activity</h2>
          </div>
          <div className="ca-activity-list">
            {RECENT.map((r, i) => (
              <div key={i} className="ca-activity-item">
                <div className="ca-activity-dot" />
                <div>
                  <p className="ca-activity-text">{r.text}</p>
                  <p className="ca-activity-time">{r.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
