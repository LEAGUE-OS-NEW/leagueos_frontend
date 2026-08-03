import { FiArrowRight } from 'react-icons/fi';
import './AuditLogPanel.css';

const AUDIT_ENTRIES = [
  { role: 'Super Admin', roleClass: 'super-admin', action: 'Updated payment provider', time: '2m ago' },
  { role: 'Platform Admin', roleClass: 'platform-admin', action: 'Enabled feature flag', time: '12m ago' },
  { role: 'Support Admin', roleClass: 'support-admin', action: 'Viewed user analytics', time: '28m ago' },
  { role: 'Club Admin', roleClass: 'club-admin', action: 'Updated club settings', time: '45m ago' },
  { role: 'Platform Admin', roleClass: 'platform-admin', action: 'Modified role permissions', time: '1h ago' },
];

function AuditLogPanel() {
  return (
    <div className="admin-panel audit-log-panel">
      <div className="admin-panel-heading">
        <h2>Audit Log</h2>
        <a href="/dashboard/super-admin/audit" className="admin-panel-link">
          View full audit log <FiArrowRight />
        </a>
      </div>

      <ul className="audit-log-list">
        {AUDIT_ENTRIES.map((entry, index) => (
          <li key={`${entry.role}-${index}`}>
            <i className={`audit-log-dot audit-log-dot--${entry.roleClass}`} aria-hidden="true" />
            <span className="audit-log-copy">
              <b>{entry.role}</b>
              <span>{entry.action}</span>
            </span>
            <span className="audit-log-time">{entry.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AuditLogPanel;
