import type { IconType } from 'react-icons';
import { FiActivity, FiDollarSign, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { ADMIN_NAV_ITEMS, ADMIN_ROLE_LABELS } from '../../config/adminNav';
import { useActiveAdminRole } from '../../hooks/useActiveAdminRole';
import './AdminDashboard.css';

function StatCard({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <article className="admin-dash-stat">
      <span className="admin-dash-stat__icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="admin-dash-stat__value">{value}</p>
        <p className="admin-dash-stat__label">{label}</p>
      </div>
    </article>
  );
}

function AdminDashboard() {
  const { activeRole } = useActiveAdminRole();
  const isSuperAdmin = activeRole === 'SUPER_ADMIN';

  const myModules = ADMIN_NAV_ITEMS.filter(
    (item) => !isSuperAdmin && item.allowedRoles.includes(activeRole),
  );

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="admin-dashboard__header">
          <p className="admin-dashboard__eyebrow">Welcome back</p>
          <h1>{isSuperAdmin ? 'Platform Overview' : `${ADMIN_ROLE_LABELS[activeRole]} Overview`}</h1>
          <p>
            {isSuperAdmin
              ? 'A snapshot of markets, users and platform health across League OS.'
              : 'Your queues and workspace at a glance.'}
          </p>
        </div>

        <div className="admin-dashboard__stats">
          <StatCard icon={FiTrendingUp} label="Total Markets" value="24" />
          <StatCard icon={FiActivity} label="Active Contracts" value="156" />
          <StatCard icon={FiDollarSign} label="Total Trading Volume" value="UGX 456.7M" />
          <StatCard icon={FiUsers} label="Total Users" value="3,892" />
        </div>

        {!isSuperAdmin && myModules.length > 0 && (
          <div className="admin-dashboard__panel">
            <h2>Your workspace</h2>
            <div className="admin-dashboard__module-links">
              {myModules.map((item) => (
                <Link to={item.route} className="admin-dashboard__module-link" key={item.route}>
                  <span className="admin-dashboard__module-icon">
                    <item.icon aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="admin-dashboard__panel">
            <h2>Specialist roles</h2>
            <p className="admin-dashboard__panel-note">
              Assign admins to a specialist role from Users, or review each role's fixed permission set under
              Roles &amp; Permissions.
            </p>
            <div className="admin-dashboard__module-links">
              {Object.entries(ADMIN_ROLE_LABELS)
                .filter(([role]) => role !== 'SUPER_ADMIN' && !['FAN', 'CLUB_ADMIN', 'TICKETING_OFFICER'].includes(role))
                .map(([role, label]) => (
                  <span className="admin-dashboard__role-chip" key={role}>
                    {label}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
