import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiCheck } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { ADMIN_ROLE_LABELS } from '../../../config/adminNav';
import {
  ASSIGNABLE_ADMIN_ROLES,
  fetchAdminUsers,
  ROLE_PERMISSIONS,
  type AdminUser,
} from '../../../services/adminUsersService';
import './RolesPermissionsPage.css';

function RolesPermissionsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminUsers()
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load role assignments. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="rp-root">
        <div className="rp-head">
          <p className="rp-eyebrow">Welcome back</p>
          <h1>Roles &amp; Permissions</h1>
          <p>
            A fixed set of roles keeps the platform's separation of duties clear — permissions here are for
            reference. Assign staff to a role from Users.
          </p>
        </div>

        {loadError && (
          <div className="rp-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="rp-loading">
            <FiActivity aria-hidden="true" className="rp-loading__icon" />
            Loading roles…
          </div>
        ) : (
          <div className="rp-grid">
            {ASSIGNABLE_ADMIN_ROLES.map((role) => {
              const activeCount = users.filter((user) => user.role === role && user.status === 'Active').length;
              return (
                <div className="rp-card" key={role}>
                  <div className="rp-card__header">
                    <h2>{ADMIN_ROLE_LABELS[role]}</h2>
                    <span className="rp-card__count">
                      {activeCount} {activeCount === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  <ul className="rp-permission-list">
                    {ROLE_PERMISSIONS[role].map((permission) => (
                      <li key={permission}>
                        <FiCheck aria-hidden="true" />
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default RolesPermissionsPage;
