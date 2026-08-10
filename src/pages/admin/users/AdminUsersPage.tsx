import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiPlus } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { ADMIN_ROLE_LABELS } from '../../../config/adminNav';
import {
  ASSIGNABLE_ADMIN_ROLES,
  createAdminUser,
  deactivateAdminUser,
  fetchAdminUsers,
  updateAdminUserRole,
  type AdminRole,
  type AdminUser,
} from '../../../services/adminUsersService';
import { fetchClubs, type ClubSummary } from '../../../services/clubsService';
import './AdminUsersPage.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AddUserModal({
  clubs,
  onCancel,
  onCreate,
}: {
  clubs: ClubSummary[];
  onCancel: () => void;
  onCreate: (input: { fullName: string; email: string; role: AdminRole; password: string; clubSlug?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>(ASSIGNABLE_ADMIN_ROLES[1] ?? 'SUPER_ADMIN');
  const [password, setPassword] = useState('');
  const [clubSlug, setClubSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (role === 'CLUB_ADMIN' && !clubSlug) {
      setError('Select a club for this Club Admin.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({ fullName, email, role, password, clubSlug: role === 'CLUB_ADMIN' ? clubSlug : undefined });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not add this user.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="au-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="au-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Add User</h3>
        {error && (
          <div className="au-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <label className="au-field">
          <span>Full name</span>
          <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jane Doe" />
        </label>
        <label className="au-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane.doe@leagueos.ug" />
        </label>
        <label className="au-field">
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>
            {ASSIGNABLE_ADMIN_ROLES.map((option) => (
              <option key={option} value={option}>
                {ADMIN_ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        {role === 'CLUB_ADMIN' && (
          <label className="au-field">
            <span>Club</span>
            <select value={clubSlug} onChange={(event) => setClubSlug(event.target.value)}>
              <option value="">Select a club…</option>
              {clubs.map((club) => (
                <option key={club.slug} value={club.slug}>
                  {club.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="au-field">
          <span>Temporary password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        </label>
        <div className="au-modal__footer">
          <button type="button" className="au-btn au-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="au-btn au-btn--gradient" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? 'Adding…' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdminUsers()
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load admin users. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    fetchClubs().then((result) => {
      if (!cancelled) setClubs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchAdminUsers()
      .then(setUsers)
      .catch(() => setLoadError('Could not load admin users. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const handleCreate = async (input: { fullName: string; email: string; role: AdminRole; password: string; clubSlug?: string }) => {
    const created = await createAdminUser(input);
    setUsers((current) => [created, ...current]);
    setShowAddModal(false);
  };

  const handleRoleChange = async (id: string, role: AdminRole, clubSlug?: string) => {
    setActionError(null);
    try {
      const updated = await updateAdminUserRole(id, role, clubSlug);
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this user.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    setActionError(null);
    try {
      const updated = await deactivateAdminUser(id);
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this user.');
    }
  };

  return (
    <AdminLayout>
      <div className="au-root">
        <div className="au-head">
          <div>
            <p className="au-eyebrow">Welcome back</p>
            <h1>Users</h1>
            <p>Assign League OS staff to a specialist role — see Roles &amp; Permissions for what each role can do.</p>
          </div>
          <button type="button" className="au-btn au-btn--gradient" onClick={() => setShowAddModal(true)}>
            <FiPlus /> Add User
          </button>
        </div>

        {(loadError || actionError) && (
          <div className="au-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
            {loadError && (
              <button type="button" className="au-btn au-btn--outline au-btn--sm" onClick={handleRetry}>
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="au-loading">
            <FiActivity aria-hidden="true" className="au-loading__icon" />
            Loading admin users…
          </div>
        ) : (
          <div className="au-panel">
            <div className="au-table-scroll">
              <table className="au-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Club</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as AdminRole;
                            handleRoleChange(
                              user.id,
                              nextRole,
                              nextRole === 'CLUB_ADMIN' ? (user.clubSlug ?? clubs[0]?.slug) : undefined,
                            );
                          }}
                        >
                          {ASSIGNABLE_ADMIN_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ADMIN_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {user.role === 'CLUB_ADMIN' ? (
                          <select
                            value={user.clubSlug ?? ''}
                            onChange={(event) => handleRoleChange(user.id, user.role, event.target.value)}
                          >
                            {clubs.map((club) => (
                              <option key={club.slug} value={club.slug}>
                                {club.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`au-status-pill au-status-pill--${user.status.toLowerCase()}`}>{user.status}</span>
                      </td>
                      <td>{user.lastActiveAt ? formatDateTime(user.lastActiveAt) : '—'}</td>
                      <td>
                        <button type="button" className="au-btn au-btn--outline au-btn--sm" onClick={() => handleToggleStatus(user.id)}>
                          {user.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="au-table__empty">
                        No admin users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && <AddUserModal clubs={clubs} onCancel={() => setShowAddModal(false)} onCreate={handleCreate} />}
    </AdminLayout>
  );
}

export default AdminUsersPage;
