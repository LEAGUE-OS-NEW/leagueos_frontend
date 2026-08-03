import { useState } from 'react';
import type { IconType } from 'react-icons';
import { FiAlertOctagon, FiAlertTriangle, FiArrowRight, FiInfo, FiX } from 'react-icons/fi';
import './AlertsNotificationsPanel.css';

type Severity = 'high' | 'warning' | 'info';

type Alert = {
  severity: Severity;
  icon: IconType;
  title: string;
  detail: string;
  time: string;
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High',
  warning: 'Warning',
  info: 'Info',
};

const ALERTS: Alert[] = [
  {
    severity: 'high',
    icon: FiAlertOctagon,
    title: '5 critical result disputes require attention',
    detail: 'Affecting 5 matches and 2,450 users',
    time: '23m ago',
  },
  {
    severity: 'warning',
    icon: FiAlertTriangle,
    title: 'SLA breach: KYC review overdue',
    detail: '15 cases exceeding 24h',
    time: '45m ago',
  },
  {
    severity: 'info',
    icon: FiInfo,
    title: 'Settlement batch ready for processing',
    detail: 'UGX 2.45B across 6 batches',
    time: '1h ago',
  },
  {
    severity: 'info',
    icon: FiInfo,
    title: 'Fantasy scoring update completed',
    detail: 'All leagues synchronized',
    time: '2h ago',
  },
];

const VISIBLE_COUNT = 2;

function AlertsNotificationsPanel() {
  const [openAlertIndex, setOpenAlertIndex] = useState<number | null>(null);
  const openAlert = openAlertIndex !== null ? ALERTS[openAlertIndex] : null;

  return (
    <div className="admin-panel alerts-panel">
      <div className="admin-panel-heading">
        <h2>Alerts &amp; Notifications</h2>
        <a href="/dashboard/general-admin" className="admin-panel-link">
          View all <FiArrowRight />
        </a>
      </div>

      <ul className="alerts-list">
        {ALERTS.slice(0, VISIBLE_COUNT).map((alert, index) => (
          <li key={index}>
            <button type="button" className="alerts-row-btn" onClick={() => setOpenAlertIndex(index)}>
              <span className={`alerts-icon alerts-icon--${alert.severity}`}>
                <alert.icon aria-hidden="true" />
              </span>
              <span className="alerts-copy">
                <span className={`alerts-severity alerts-severity--${alert.severity}`}>
                  {SEVERITY_LABEL[alert.severity]}
                </span>
                <b>{alert.title}</b>
                <span>{alert.detail}</span>
              </span>
              <span className="alerts-time">{alert.time}</span>
            </button>
          </li>
        ))}
      </ul>

      {openAlert && (
        <>
          <div className="alerts-modal-backdrop" onClick={() => setOpenAlertIndex(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Alert details" className="alerts-modal">
            <button
              type="button"
              className="alerts-modal-close"
              aria-label="Close"
              onClick={() => setOpenAlertIndex(null)}
            >
              <FiX />
            </button>

            <span className={`alerts-icon alerts-icon--${openAlert.severity} alerts-modal-icon`}>
              <openAlert.icon aria-hidden="true" />
            </span>

            <span className={`alerts-severity alerts-severity--${openAlert.severity}`}>
              {SEVERITY_LABEL[openAlert.severity]}
            </span>
            <h3 className="alerts-modal-title">{openAlert.title}</h3>
            <p className="alerts-modal-detail">{openAlert.detail}</p>
            <p className="alerts-modal-time">{openAlert.time}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default AlertsNotificationsPanel;
