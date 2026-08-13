import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { fetchAdminUsers, setAdminUserActive, type AdminUser } from '../../../services/adminUsersService';
import './FansPage.css';

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FansPage() {
  const [fans, setFans] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);
    return fetchAdminUsers()
      .then((result) => setFans(result.filter((user) => user.roles.length === 0)))
      .catch(() => setLoadError('Could not load fan accounts. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchAdminUsers()
      .then((result) => {
        if (!cancelled) setFans(result.filter((user) => user.roles.length === 0));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load fan accounts. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleActive = async (fan: AdminUser) => {
    setActionError(null);
    try {
      const updated = await setAdminUserActive(fan.id, !fan.isActive);
      setFans((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this account.');
    }
  };

  const visibleFans = fans.filter((fan) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return fan.fullName.toLowerCase().includes(query) || fan.email.toLowerCase().includes(query);
  });

  return (
    <AdminLayout>
      <div className="fp-root">
        <div className="fp-head">
          <div>
            <p className="fp-eyebrow">Welcome back</p>
            <h1>Fans</h1>
            <p>
              Every registered fan account, separate from staff on the Users page. Suspending an account immediately
              blocks login — reactivating restores it.
            </p>
          </div>
        </div>

        <input
          type="text"
          className="fp-search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {(loadError || actionError) && (
          <div className="fp-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
            {loadError && (
              <button type="button" className="fp-btn fp-btn--outline fp-btn--sm" onClick={load}>
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="fp-loading">
            <FiActivity aria-hidden="true" className="fp-loading__icon" />
            Loading fan accounts…
          </div>
        ) : (
          <div className="fp-panel">
            <div className="fp-table-scroll">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFans.map((fan) => (
                    <tr key={fan.id}>
                      <td>{fan.fullName}</td>
                      <td>{fan.email}</td>
                      <td>{fan.isVerified ? 'Yes' : 'No'}</td>
                      <td>
                        <span className={`fp-status-pill fp-status-pill--${fan.isActive ? 'active' : 'suspended'}`}>
                          {fan.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>{formatDateTime(fan.createdAt)}</td>
                      <td>
                        <button type="button" className="fp-btn fp-btn--outline fp-btn--sm" onClick={() => handleToggleActive(fan)}>
                          {fan.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleFans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="fp-table__empty">
                        {fans.length === 0 ? 'No fan accounts yet.' : 'No fans match this search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default FansPage;
