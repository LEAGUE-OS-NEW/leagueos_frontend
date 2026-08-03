import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import RingGauge from './RingGauge';
import './ApiStatusPanel.css';

const STATS = [
  { label: 'Total Requests (24h)', value: '24.8M' },
  { label: 'Failed Requests', value: '312K' },
  { label: 'Avg Response Time', value: '142ms' },
];

const SPARKLINE_POINTS = '0,20 10,16 20,18 30,10 40,14 50,6 60,12 70,8 80,4 90,9 100,3';

function ApiStatusPanel() {
  return (
    <div className="admin-panel api-status-panel">
      <div className="admin-panel-heading">
        <h2>API Status</h2>
        <a href="/dashboard/super-admin/system-health" className="admin-panel-link">
          View API Docs <FiArrowRight />
        </a>
      </div>

      <div className="api-status-body">
        <RingGauge
          segments={[{ value: 98.7, color: 'var(--color-open)' }]}
          centerValue="98.7%"
          centerCaption="Success Rate"
          ariaLabel="API success rate: 98.7%"
        />

        <div className="api-status-stats">
          {STATS.map((stat) => (
            <div className="api-status-row" key={stat.label}>
              <span>{stat.label}</span>
              <b>{stat.value}</b>
            </div>
          ))}

          <svg className="api-status-sparkline" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={SPARKLINE_POINTS} fill="none" stroke="var(--color-primary-light)" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <p className="api-status-note">
        <FiCheckCircle aria-hidden="true" /> All systems are performing within normal thresholds.
      </p>
    </div>
  );
}

export default ApiStatusPanel;
