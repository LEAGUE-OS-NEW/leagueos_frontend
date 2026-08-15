import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiCheck } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { fetchAdminRoles, fetchAdminUsers, type AdminRole, type AdminUser } from '../../../services/adminUsersService';
import './RolesPermissionsPage.css';

function formatPermission(name: string): string {
  const spaced = name.replace(/[._]+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RolesPermissionsPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminRoles(), fetchAdminUsers()])
      .then(([roleResult, userResult]) => {
        if (cancelled) return;
        setRoles(roleResult);
        setUsers(userResult);
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
            {roles.map((role) => {
              const activeCount = users.filter((user) => user.isActive && user.roles.includes(role.name)).length;
              return (
                <div className="rp-card" key={role.id}>
                  <div className="rp-card__header">
                    <h2>{role.displayName}</h2>
                    <span className="rp-card__count">
                      {activeCount} {activeCount === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  {role.description && <p className="rp-card__description">{role.description}</p>}
                  <ul className="rp-permission-list">
                    {role.permissions.length === 0 ? (
                      <li className="rp-permission-list__empty">No permissions configured for this role yet.</li>
                    ) : (
                      role.permissions.map((permission) => (
                        <li key={permission}>
                          <FiCheck aria-hidden="true" />
                          <span>{formatPermission(permission)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
            {roles.length === 0 && <p className="rp-empty">No roles are configured on this platform yet.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default RolesPermissionsPage;
