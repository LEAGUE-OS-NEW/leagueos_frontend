import { FiArrowRight } from 'react-icons/fi';
import './PermissionsSummaryPanel.css';

const ROLE_CATEGORIES = [
  { label: 'System', count: 6 },
  { label: 'Administration', count: 5 },
  { label: 'Club Management', count: 4 },
  { label: 'Finance', count: 3 },
];

function PermissionsSummaryPanel() {
  return (
    <div className="admin-panel permissions-summary-panel">
      <div className="admin-panel-heading">
        <h2>Permissions Summary</h2>
        <a href="/dashboard/super-admin/roles-permissions" className="admin-panel-link">
          View all roles <FiArrowRight />
        </a>
      </div>

      <div className="permissions-summary-body">
        <div className="permissions-summary-total">
          <span className="permissions-summary-total-value">18</span>
          <span className="permissions-summary-total-label">Roles Defined</span>
        </div>

        <ul className="permissions-summary-breakdown">
          {ROLE_CATEGORIES.map((category) => (
            <li key={category.label}>
              <span>{category.label}</span>
              <b>{category.count}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="permissions-summary-footer">
        <span>Most Privileged Role</span>
        <span className="permissions-summary-pill">Super Admin</span>
        <span className="permissions-summary-users">
          Users <b>4</b>
        </span>
      </div>
    </div>
  );
}

export default PermissionsSummaryPanel;
