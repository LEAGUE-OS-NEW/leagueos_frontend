import { FiArrowRight } from 'react-icons/fi';
import './AdminUsersPanel.css';

const ROLE_BREAKDOWN = [
  { label: 'Super Admins', count: 4 },
  { label: 'Platform Admins', count: 12 },
  { label: 'Support Admins', count: 14 },
  { label: 'Read Only', count: 12 },
];

const RECENT_ADMIN_INITIALS = ['JD', 'MK', 'AS', 'RT', 'PL'];

function AdminUsersPanel() {
  return (
    <div className="admin-panel admin-users-panel">
      <div className="admin-panel-heading">
        <h2>Admin Users</h2>
        <a href="/dashboard/super-admin/admin-users" className="admin-panel-link">
          View all users <FiArrowRight />
        </a>
      </div>

      <div className="admin-users-body">
        <div className="admin-users-total">
          <span className="admin-users-total-value">42</span>
          <span className="admin-users-total-label">Total Admin Users</span>
        </div>

        <ul className="admin-users-breakdown">
          {ROLE_BREAKDOWN.map((role) => (
            <li key={role.label}>
              <span>{role.label}</span>
              <b>{role.count}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-users-recent">
        <span className="admin-users-recent-label">Recent Admins</span>
        <div className="admin-users-avatars">
          {RECENT_ADMIN_INITIALS.map((initials) => (
            <span className="admin-users-avatar" key={initials}>
              {initials}
            </span>
          ))}
          <span className="admin-users-avatar admin-users-avatar--overflow">+37</span>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPanel;
