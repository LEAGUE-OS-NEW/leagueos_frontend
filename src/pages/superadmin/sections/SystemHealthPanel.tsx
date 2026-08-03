import { FiActivity } from 'react-icons/fi';
import RingGauge from './RingGauge';
import './SystemHealthPanel.css';

const SERVICES = [
  { name: 'Platform Services', status: 'Operational' },
  { name: 'Database', status: 'Operational' },
  { name: 'API Gateway', status: 'Operational' },
  { name: 'Background Jobs', status: 'Operational' },
  { name: 'CDN & Storage', status: 'Operational' },
];

function SystemHealthPanel() {
  return (
    <div className="admin-panel system-health-panel">
      <div className="admin-panel-heading">
        <h2>
          <FiActivity aria-hidden="true" /> System Health
        </h2>
        <span className="admin-panel-subtext">All critical systems operational</span>
      </div>

      <div className="system-health-body">
        <RingGauge
          segments={[{ value: 99.98, color: 'var(--color-open)' }]}
          centerValue="99.98%"
          centerCaption="Uptime"
          ariaLabel="System uptime: 99.98%"
        />

        <ul className="system-health-list">
          {SERVICES.map((service) => (
            <li key={service.name}>
              <span>{service.name}</span>
              <span className="system-health-status">
                {service.status}
                <i className="system-health-dot" aria-hidden="true" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <a href="/dashboard/super-admin/system-health" className="admin-panel-link admin-panel-link--center">
        View System Health &rarr;
      </a>
    </div>
  );
}

export default SystemHealthPanel;
