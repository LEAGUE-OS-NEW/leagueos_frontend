import { FiArrowRight } from 'react-icons/fi';
import RingGauge from './RingGauge';
import './IntegrationsOverviewPanel.css';

const TOTAL_INTEGRATIONS = 28;

const STATUS_ROWS = [
  { label: 'Connected', count: 20, className: 'connected' },
  { label: 'Pending', count: 5, className: 'pending' },
  { label: 'Attention Needed', count: 3, className: 'attention' },
];

function IntegrationsOverviewPanel() {
  return (
    <div className="admin-panel integrations-overview-panel">
      <div className="admin-panel-heading">
        <h2>Integrations Overview</h2>
        <a href="/dashboard/super-admin/integrations" className="admin-panel-link">
          View all integrations <FiArrowRight />
        </a>
      </div>

      <div className="integrations-overview-body">
        <RingGauge
          segments={[
            { value: (20 / TOTAL_INTEGRATIONS) * 100, color: 'var(--color-open)' },
            { value: (5 / TOTAL_INTEGRATIONS) * 100, color: 'var(--color-accent)' },
            { value: (3 / TOTAL_INTEGRATIONS) * 100, color: 'var(--color-live)' },
          ]}
          centerValue={String(TOTAL_INTEGRATIONS)}
          centerCaption="Total Integrations"
          ariaLabel={`${TOTAL_INTEGRATIONS} total integrations: 20 connected, 5 pending, 3 needing attention`}
        />

        <ul className="integrations-status-list">
          {STATUS_ROWS.map((row) => (
            <li key={row.label}>
              <span className="integrations-status-label">
                <i className={`integrations-status-dot ${row.className}`} aria-hidden="true" />
                {row.label}
              </span>
              <span className={`integrations-status-count ${row.className}`}>{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default IntegrationsOverviewPanel;
