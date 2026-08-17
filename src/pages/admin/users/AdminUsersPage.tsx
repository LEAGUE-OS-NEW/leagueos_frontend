import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiPlus, FiX } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractApiError } from '../../../services/apiUtils';
import {
  assignAdminRole,
  createRealClub,
  fetchAdminInvitations,
  fetchAdminRoles,
  fetchAdminUsers,
  fetchRealClubs,
  fetchRealSports,
  findRoleConflict,
  inviteAdminUser,
  inviteClubAdmin,
  revokeAdminInvitation,
  revokeAdminRole,
  setAdminUserActive,
  uploadClubLogo,
  type AdminInvitation,
  type AdminRole,
  type AdminUser,
  type RealClubSummary,
  type RealSportSummary,
} from '../../../services/adminUsersService';
import './AdminUsersPage.css';

const CLUB_ADMIN_SENTINEL = '__CLUB_ADMIN__';

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleDisplayName(roles: AdminRole[], name: string): string {
  return roles.find((role) => role.name === name)?.displayName ?? name;
}

function InviteModal({
  roles,
  onCancel,
  onInvite,
}: {
  roles: AdminRole[];
  onCancel: () => void;
  onInvite: (input: { loginEmail: string; notifyEmail: string; roleId: string }) => Promise<AdminInvitation>;
}) {
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [clubs, setClubs] = useState<RealClubSummary[]>([]);
  const [sports, setSports] = useState<RealSportSummary[]>([]);
  const [clubMode, setClubMode] = useState<'existing' | 'new'>('existing');
  const [clubId, setClubId] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [newClubSportId, setNewClubSportId] = useState('');
  const [newClubLogo, setNewClubLogo] = useState<File | null>(null);

  const isClubAdmin = roleId === CLUB_ADMIN_SENTINEL;

  useEffect(() => {
    if (!isClubAdmin) return;
    let cancelled = false;
    // Fetched independently — a failure fetching sports (needed only for
    // the "new club" branch) must not take the club dropdown down with it.
    fetchRealClubs()
      .then((clubResult) => {
        if (cancelled) return;
        setClubs(clubResult);
        if (clubResult.length === 0) setClubMode('new');
      })
      .catch(() => {
        // Non-fatal — existing-club dropdown just stays empty; "new club" still works.
      });
    fetchRealSports()
      .then((sportResult) => {
        if (cancelled) return;
        setSports(sportResult);
        if (sportResult.length > 0) setNewClubSportId(sportResult[0].id);
      })
      .catch(() => {
        // Non-fatal — "new club" sport dropdown just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [isClubAdmin]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (isClubAdmin) {
        if (!personalEmail.trim()) throw new Error('Enter a personal email to send the invite to.');
        let resolvedClubId = clubId;
        if (clubMode === 'new') {
          const club = await createRealClub({ name: newClubName, sportId: newClubSportId });
          resolvedClubId = club.id;
          if (newClubLogo) {
            // Best-effort — a failed logo upload shouldn't block the club
            // admin invite itself; the club admin can add one later from
            // their own Club Profile page.
            try {
              await uploadClubLogo(club.id, newClubLogo);
            } catch {
              // ignored
            }
          }
        } else if (!resolvedClubId) {
          throw new Error('Select a club.');
        }
        const invite = await inviteClubAdmin({ clubId: resolvedClubId, loginEmail: email, notifyEmail: personalEmail });
        setSuccessMessage(
          `Invite sent to ${personalEmail.trim()} — they'll set a password for the ${email.trim()} login and land in their Club Admin dashboard once accepted (invitation ${invite.status.toLowerCase()}, expires ${new Date(invite.expiresAt).toLocaleDateString()}).`,
        );
      } else {
        if (!personalEmail.trim()) throw new Error('Enter a personal email to send the invite to.');
        const invite = await onInvite({ loginEmail: email, notifyEmail: personalEmail, roleId });
        setSuccessMessage(
          `Invite sent to ${personalEmail.trim()} — they'll set a password for the ${email.trim()} login and land in their admin dashboard once accepted (invitation ${invite.status.toLowerCase()}, expires ${new Date(invite.tokenExpiresAt).toLocaleDateString()}).`,
        );
      }
    } catch (submitError) {
      setError(extractApiError(submitError).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (successMessage) {
    return (
      <div className="au-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
        <div className="au-modal" onClick={(event) => event.stopPropagation()}>
          <h3>Invite Prepared</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.86rem' }}>{successMessage}</p>
          <div className="au-modal__footer">
            <button type="button" className="au-btn au-btn--gradient" onClick={onCancel}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="au-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="au-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Invite Admin</h3>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
          They'll get an email at the personal address below with a link to set a password for their LeagueOS login, then land in
          {isClubAdmin ? ' their Club Admin dashboard.' : ' the admin dashboard for their role.'}
        </p>
        {error && (
          <div className="au-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <label className="au-field">
          <span>LeagueOS email (login identity)</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="clubadminkcca@leagueos.africa" />
        </label>
        <label className="au-field">
          <span>Personal email (invite sent here)</span>
          <input
            type="email"
            value={personalEmail}
            onChange={(event) => setPersonalEmail(event.target.value)}
            placeholder="jane.doe@gmail.com"
          />
        </label>
        <label className="au-field">
          <span>Role</span>
          <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            <optgroup label="Platform roles">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName}
                </option>
              ))}
            </optgroup>
            <optgroup label="Club-scoped">
              <option value={CLUB_ADMIN_SENTINEL}>Club Admin</option>
            </optgroup>
          </select>
        </label>

        {isClubAdmin && (
          <>
            <div className="au-toggle-row">
              <button
                type="button"
                className={`au-toggle${clubMode === 'existing' ? ' is-active' : ''}`}
                onClick={() => setClubMode('existing')}
                disabled={clubs.length === 0}
              >
                Existing club
              </button>
              <button
                type="button"
                className={`au-toggle${clubMode === 'new' ? ' is-active' : ''}`}
                onClick={() => setClubMode('new')}
              >
                New club
              </button>
            </div>

            {clubMode === 'existing' ? (
              <label className="au-field">
                <span>Club</span>
                <select value={clubId} onChange={(event) => setClubId(event.target.value)}>
                  <option value="">Select a club…</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="au-field">
                  <span>Club name</span>
                  <input type="text" value={newClubName} onChange={(event) => setNewClubName(event.target.value)} placeholder="KCCA FC" />
                </label>
                <label className="au-field">
                  <span>Sport</span>
                  <select value={newClubSportId} onChange={(event) => setNewClubSportId(event.target.value)}>
                    <option value="">Select a sport…</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="au-field">
                  <span>Club logo (optional — can also be added later by the club admin)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setNewClubLogo(event.target.files?.[0] ?? null)}
                  />
                </label>
              </>
            )}
          </>
        )}

        <div className="au-modal__footer">
          <button type="button" className="au-btn au-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="au-btn au-btn--gradient" disabled={isSaving || !roleId} onClick={handleSubmit}>
            {isSaving ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [addRoleFor, setAddRoleFor] = useState<string | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminUsers(), fetchAdminRoles(), fetchAdminInvitations()])
      .then(([userResult, roleResult, invitationResult]) => {
        if (cancelled) return;
        // Staff only — fans (no platform role assigned) are managed on the
        // dedicated Fans page instead, so the same person isn't shown twice.
        setUsers(userResult.filter((user) => user.roles.length > 0));
        setRoles(roleResult);
        setInvitations(invitationResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load admin users. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([fetchAdminUsers(), fetchAdminRoles(), fetchAdminInvitations()])
      .then(([userResult, roleResult, invitationResult]) => {
        setUsers(userResult.filter((user) => user.roles.length > 0));
        setRoles(roleResult);
        setInvitations(invitationResult);
      })
      .catch(() => setLoadError('Could not load admin users. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const handleInvite = async (input: { loginEmail: string; notifyEmail: string; roleId: string }) => {
    const created = await inviteAdminUser(input);
    setInvitations((current) => [created, ...current]);
    return created;
  };

  const handleRevokeInvitation = async (id: string) => {
    setActionError(null);
    try {
      const updated = await revokeAdminInvitation(id);
      setInvitations((current) => current.map((invitation) => (invitation.id === updated.id ? updated : invitation)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not revoke this invitation.');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setActionError(null);
    try {
      const updated = await setAdminUserActive(user.id, !user.isActive);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this user.');
    }
  };

  const handleAddRole = async (userId: string) => {
    if (!pendingRoleId) return;
    setActionError(null);

    const targetUser = users.find((item) => item.id === userId);
    const candidateRole = roles.find((item) => item.id === pendingRoleId);
    if (targetUser && candidateRole) {
      const conflict = findRoleConflict(targetUser.roles, candidateRole.name);
      if (conflict) {
        setActionError(`Can't add ${candidateRole.displayName} — conflicts with ${conflict}, already held by this admin.`);
        return;
      }
    }

    try {
      const updated = await assignAdminRole(userId, pendingRoleId);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setAddRoleFor(null);
      setPendingRoleId('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not assign this role.');
    }
  };

  const handleRemoveRole = async (userId: string, roleName: string) => {
    const role = roles.find((item) => item.name === roleName);
    if (!role) return;
    setActionError(null);
    try {
      const updated = await revokeAdminRole(userId, role.id);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not remove this role.');
    }
  };

  return (
    <AdminLayout>
      <div className="au-root">
        <div className="au-head">
          <div>
            <p className="au-eyebrow">Welcome back</p>
            <h1>Users</h1>
            <p>Invite League OS staff and assign specialist roles — see Roles &amp; Permissions for what each role can do.</p>
          </div>
          <button type="button" className="au-btn au-btn--gradient" onClick={() => setShowInviteModal(true)} disabled={roles.length === 0}>
            <FiPlus /> Invite Admin
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
          <>
            <div className="au-panel">
              <div className="au-table-scroll">
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const availableRoles = roles.filter((role) => !user.roles.includes(role.name));
                      return (
                        <tr key={user.id}>
                          <td>{user.fullName}</td>
                          <td>{user.email}</td>
                          <td>
                            <div className="au-role-chips">
                              {user.roles.map((roleName) => (
                                <span className="au-role-chip" key={roleName}>
                                  {roleDisplayName(roles, roleName)}
                                  <button
                                    type="button"
                                    aria-label={`Remove ${roleDisplayName(roles, roleName)}`}
                                    onClick={() => handleRemoveRole(user.id, roleName)}
                                  >
                                    <FiX />
                                  </button>
                                </span>
                              ))}
                              {addRoleFor === user.id ? (
                                <span className="au-role-chip au-role-chip--add">
                                  <select value={pendingRoleId} onChange={(event) => setPendingRoleId(event.target.value)}>
                                    <option value="">Select role…</option>
                                    {availableRoles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.displayName}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="button" className="au-btn au-btn--outline au-btn--sm" onClick={() => handleAddRole(user.id)}>
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    className="au-btn au-btn--ghost au-btn--sm"
                                    onClick={() => {
                                      setAddRoleFor(null);
                                      setPendingRoleId('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                availableRoles.length > 0 && (
                                  <button
                                    type="button"
                                    className="au-role-chip au-role-chip--ghost"
                                    onClick={() => setAddRoleFor(user.id)}
                                  >
                                    <FiPlus /> Add role
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`au-status-pill au-status-pill--${user.isActive ? 'active' : 'inactive'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{formatDateTime(user.createdAt)}</td>
                          <td>
                            <button type="button" className="au-btn au-btn--outline au-btn--sm" onClick={() => handleToggleActive(user)}>
                              {user.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="au-table__empty">
                          No admin users yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="au-panel">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Pending Invitations</h2>
              <div className="au-table-scroll">
                <table className="au-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Invited By</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invitation) => (
                      <tr key={invitation.id}>
                        <td>{invitation.email}</td>
                        <td>{invitation.assignedRoles.join(', ') || '—'}</td>
                        <td>{invitation.invitedByEmail ?? '—'}</td>
                        <td>{invitation.status}</td>
                        <td>{formatDateTime(invitation.tokenExpiresAt)}</td>
                        <td>
                          {invitation.status === 'PENDING' && (
                            <button
                              type="button"
                              className="au-btn au-btn--outline au-btn--sm"
                              onClick={() => handleRevokeInvitation(invitation.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {invitations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="au-table__empty">
                          No pending invitations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showInviteModal && <InviteModal roles={roles} onCancel={() => setShowInviteModal(false)} onInvite={handleInvite} />}
    </AdminLayout>
  );
}

export default AdminUsersPage;
