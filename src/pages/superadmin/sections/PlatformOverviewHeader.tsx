import type { IconType } from 'react-icons';
import { FiCalendar, FiDownload, FiTrendingUp, FiUser, FiUsers } from 'react-icons/fi';
import './PlatformOverviewHeader.css';

type Accent = 'purple' | 'orange' | 'blue';

type StatCard = {
  label: string;
  value: string;
  delta: string;
  icon: IconType;
  accent: Accent;
};

const STATS: StatCard[] = [
  { label: 'Active Clubs', value: '1,248', delta: '+18 this month', icon: FiUsers, accent: 'purple' },
  { label: 'Registered Users', value: '12.46M', delta: '+6.2% this month', icon: FiUsers, accent: 'orange' },
  { label: 'API Requests (24h)', value: '24.8M', delta: '+12.4% vs yesterday', icon: FiTrendingUp, accent: 'blue' },
];

function PlatformOverviewHeader() {
  return (
    <section className="platform-header">
      <div className="platform-header-title">
        <h1>
          <FiUser aria-hidden="true" /> Super Admin
        </h1>
        <p>Manage and configure the entire League OS platform.</p>
      </div>

      <div className="platform-header-stats">
        {STATS.map((stat) => (
          <div className={`platform-stat-card platform-stat-card--${stat.accent}`} key={stat.label}>
            <div className="platform-stat-top">
              <span className="platform-stat-label">{stat.label}</span>
              <stat.icon className="platform-stat-icon" aria-hidden="true" />
            </div>
            <span className="platform-stat-value">{stat.value}</span>
            <span className="platform-stat-delta">{stat.delta}</span>
          </div>
        ))}
      </div>

      <div className="platform-header-actions">
        <label className="platform-range-select">
          <FiCalendar aria-hidden="true" />
          <select defaultValue="7">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>

        <button type="button" className="platform-export-btn">
          <FiDownload aria-hidden="true" /> Export Report
        </button>
      </div>
    </section>
  );
}

export default PlatformOverviewHeader;
