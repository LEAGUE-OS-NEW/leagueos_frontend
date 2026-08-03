import { FiArrowRight } from 'react-icons/fi';
import './SystemHealthSummaryPanel.css';

const STATS = [
  { label: 'API Uptime', value: '100%', tone: 'good' },
  { label: 'Data Latency', value: '210ms', tone: 'neutral' },
  { label: 'Error Rate', value: '0.02%', tone: 'good' },
] as const;

function SystemHealthSummaryPanel() {
  return (
    <div className="admin-panel system-health-summary-panel">
      <div className="admin-panel-heading">
        <h2>System Health</h2>
      </div>

      <p className="system-health-summary-status">
        <i aria-hidden="true" /> All Systems Operational <b>99.98%</b>
      </p>

      <div className="system-health-summary-stats">
        {STATS.map((stat) => (
          <div className="system-health-summary-stat" key={stat.label}>
            <span>{stat.label}</span>
            <b className={stat.tone === 'good' ? 'good' : ''}>{stat.value}</b>
          </div>
        ))}
      </div>

      <a href="/dashboard/general-admin" className="admin-panel-link admin-panel-link--center">
        View system status <FiArrowRight />
      </a>
    </div>
  );
}

export default SystemHealthSummaryPanel;
