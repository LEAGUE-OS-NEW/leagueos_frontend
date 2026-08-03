import type { IconType } from 'react-icons';
import { FiAlertOctagon, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import './SecurityAlertsPanel.css';

type AlertSeverity = 'critical' | 'warning';

type SecurityAlert = {
  icon: IconType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  time: string;
};

const ALERTS: SecurityAlert[] = [
  {
    icon: FiAlertOctagon,
    severity: 'critical',
    title: 'Unusual Admin Login',
    detail: 'admin@unknown-ip.com',
    time: '2m ago',
  },
  {
    icon: FiAlertTriangle,
    severity: 'warning',
    title: 'Failed Login Attempts',
    detail: '5 failed attempts detected',
    time: '15m ago',
  },
  {
    icon: FiAlertTriangle,
    severity: 'warning',
    title: 'API Key Usage Spike',
    detail: 'Key ending in ...4f8a',
    time: '32m ago',
  },
];

function SecurityAlertsPanel() {
  return (
    <div className="admin-panel security-alerts-panel">
      <div className="admin-panel-heading">
        <h2>Security Alerts</h2>
        <a href="/dashboard/super-admin/security" className="admin-panel-link">
          View all <FiArrowRight />
        </a>
      </div>

      <ul className="security-alerts-list">
        {ALERTS.map((alert) => (
          <li key={alert.title}>
            <span className={`security-alert-icon security-alert-icon--${alert.severity}`}>
              <alert.icon aria-hidden="true" />
            </span>
            <span className="security-alert-copy">
              <b>{alert.title}</b>
              <span>{alert.detail}</span>
            </span>
            <span className="security-alert-time">{alert.time}</span>
          </li>
        ))}
      </ul>

      <a href="/dashboard/super-admin/security" className="admin-panel-link admin-panel-link--center">
        Go to Security Center <FiArrowRight />
      </a>
    </div>
  );
}

export default SecurityAlertsPanel;
