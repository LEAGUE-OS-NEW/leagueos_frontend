import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiSearch,
  FiShield,
  FiShieldOff,
  FiTrash2,
  FiUsers,
  FiUserX,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  deleteAdminUser,
  fetchAdminUsers,
  isStaffAccount,
  setAdminUserActive,
  type AdminUser,
} from '../../../services/adminUsersService';
import './FansPage.css';

type FanTab = 'all' | 'registered' | 'verified_trader' | 'unauthorized' | 'suspended' | 'deactivated';

const TABS: { key: FanTab; label: string }[] = [
  { key: 'all', label: 'All Fans' },
  { key: 'registered', label: 'Registered Fans' },
  { key: 'verified_trader', label: 'Verified Market Traders' },
  { key: 'unauthorized', label: 'Unauthorized Access' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'deactivated', label: 'Deactivated' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fanCode(id: string): string {
  const tail = id.replace(/\D/g, '').slice(-5).padStart(5, '0');
  return `#FAN-${tail || id.slice(0, 5).toUpperCase()}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function getFanStatus(fan: AdminUser): 'active' | 'suspended' | 'blocked' | 'deactivated' {
  if (fan.accountStatus === 'DEACTIVATED') return 'deactivated';
  if (fan.accountStatus === 'SUSPENDED' || !fan.isActive) return 'suspended';
  // NOTE: marketRestrictionStatus's real non-'CLEAR' values aren't confirmed
  // against the backend yet — verify these two strings before relying on
  // the "Market Blocked" pill.
  if (fan.marketRestrictionStatus === 'RESTRICTED' || fan.marketRestrictionStatus === 'SUSPENDED') return 'blocked';
  return 'active';
}

function getFanType(fan: AdminUser): 'registered' | 'verified_trader' | 'unauthorized' {
  if (fan.failedLoginAttempts > 0) return 'unauthorized';
  if (fan.isMarketVerified) return 'verified_trader';
  return 'registered';
}

function matchesTab(fan: AdminUser, tab: FanTab): boolean {
  const type = getFanType(fan);
  const status = getFanStatus(fan);
  switch (tab) {
    case 'all':
      return status !== 'deactivated';
    case 'registered':
      return type === 'registered' && status !== 'deactivated';
    case 'verified_trader':
      return type === 'verified_trader' && status !== 'deactivated';
    case 'unauthorized':
      return type === 'unauthorized';
    case 'suspended':
      return status === 'suspended';
    case 'deactivated':
      return status === 'deactivated';
    default:
      return true;
  }
}

function FansPage() {
  const [fans, setFans] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FanTab>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteFan, setConfirmDeleteFan] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);
    return fetchAdminUsers()
      .then((result) => setFans(result.filter((user) => !isStaffAccount(user))))
      .catch(() => setLoadError('Could not load fan accounts. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchAdminUsers()
      .then((result) => {
        if (!cancelled) setFans(result.filter((user) => !isStaffAccount(user)));
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

  const handleConfirmDelete = async () => {
    if (!confirmDeleteFan) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      const updated = await deleteAdminUser(confirmDeleteFan.id);
      setFans((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setConfirmDeleteFan(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete this account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const live = fans.filter((fan) => getFanStatus(fan) !== 'deactivated');
    return {
      totalRegistered: live.filter((fan) => getFanType(fan) === 'registered').length,
      verifiedTraders: live.filter((fan) => getFanType(fan) === 'verified_trader').length,
      unauthorized: fans.reduce((sum, fan) => sum + fan.failedLoginAttempts, 0),
      suspended: live.filter((fan) => getFanStatus(fan) === 'suspended').length,
      activity: live.filter((fan) => fan.lastActiveAt).length,
    };
  }, [fans]);

  const filteredFans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return fans
      .filter((fan) => matchesTab(fan, activeTab))
      .filter((fan) => {
        if (!query) return true;
        return (
          fan.fullName.toLowerCase().includes(query) ||
          fan.email.toLowerCase().includes(query) ||
          (fan.phone ?? '').toLowerCase().includes(query)
        );
      });
  }, [fans, activeTab, search]);

  const handleExport = () => {
    const rows = filteredFans.map((fan) => ({
      id: fan.id,
      name: fan.fullName,
      email: fan.email,
      phone: fan.phone ?? '',
      type: getFanType(fan),
      verified: fan.isVerified ? 'Yes' : 'No',
      marketKyc: fan.marketKycStatus,
      status: getFanStatus(fan),
      joined: fan.createdAt,
      lastActive: fan.lastActiveAt ?? '',
    }));
    const header = Object.keys(rows[0] ?? { id: '', name: '', email: '', phone: '', type: '', verified: '', marketKyc: '', status: '', joined: '', lastActive: '' });
    const csv = [header.join(','), ...rows.map((row) => header.map((key) => `"${String((row as Record<string, string>)[key]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fans-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(filteredFans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleFans = filteredFans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <AdminLayout>
      <div className="fp-root">
        <div className="fp-head">
          <div>
            <p className="fp-eyebrow">Super admin</p>
            <h1>Fans</h1>
            <p>
              Registered fans, verified market traders, failed access attempts, suspended accounts, and recent
              activity are pulled automatically from the backend.
            </p>
          </div>
          <div className="fp-head-actions">
            <button type="button" className="fp-btn fp-btn--outline" onClick={handleExport} disabled={filteredFans.length === 0}>
              <FiDownload aria-hidden="true" />
              Export
            </button>
          </div>
        </div>

        <div className="fp-stats">
          <div className="fp-stat-card">
            <span className="fp-stat-icon fp-stat-icon--violet">
              <FiUsers aria-hidden="true" />
            </span>
            <div>
              <p className="fp-stat-label">Total Registered Fans</p>
              <p className="fp-stat-value">{stats.totalRegistered.toLocaleString()}</p>
            </div>
          </div>
          <div className="fp-stat-card">
            <span className="fp-stat-icon fp-stat-icon--green">
              <FiShield aria-hidden="true" />
            </span>
            <div>
              <p className="fp-stat-label">Verified Market Traders</p>
              <p className="fp-stat-value">{stats.verifiedTraders.toLocaleString()}</p>
            </div>
          </div>
          <div className="fp-stat-card">
            <span className="fp-stat-icon fp-stat-icon--amber">
              <FiShieldOff aria-hidden="true" />
            </span>
            <div>
              <p className="fp-stat-label">Unauthorized Access Attempts</p>
              <p className="fp-stat-value">{stats.unauthorized.toLocaleString()}</p>
            </div>
          </div>
          <div className="fp-stat-card">
            <span className="fp-stat-icon fp-stat-icon--blue">
              <FiUserX aria-hidden="true" />
            </span>
            <div>
              <p className="fp-stat-label">Suspended Fans</p>
              <p className="fp-stat-value">{stats.suspended.toLocaleString()}</p>
            </div>
          </div>
          <div className="fp-stat-card">
            <span className="fp-stat-icon fp-stat-icon--neutral">
              <FiActivity aria-hidden="true" />
            </span>
            <div>
              <p className="fp-stat-label">Fans With Activity</p>
              <p className="fp-stat-value">{stats.activity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="fp-toolbar">
          <div className="fp-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`fp-tab${activeTab === tab.key ? ' fp-tab--active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="fp-search-wrap">
            <FiSearch aria-hidden="true" className="fp-search-icon" />
            <input
              type="text"
              className="fp-search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

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
            Loading fan accounts...
          </div>
        ) : (
          <div className="fp-panel">
            <div className="fp-table-scroll">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Fan</th>
                    <th>Email / Phone</th>
                    <th>Type</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFans.map((fan) => {
                    const type = getFanType(fan);
                    const status = getFanStatus(fan);
                    return (
                      <tr key={fan.id}>
                        <td>
                          <div className="fp-fan-cell">
                            {fan.avatarUrl ? (
                              <img src={fan.avatarUrl} alt="" className="fp-avatar" />
                            ) : (
                              <span className="fp-avatar fp-avatar--fallback">{initials(fan.fullName)}</span>
                            )}
                            <div>
                              <p className="fp-fan-name">{fan.fullName || 'Unknown User'}</p>
                              <p className="fp-fan-code">{fanCode(fan.id)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fp-contact-cell">
                            <span>{fan.email || '-'}</span>
                            {fan.phone && <span className="fp-contact-secondary">{fan.phone}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`fp-type-pill fp-type-pill--${type}`}>
                            {type === 'registered' && 'Registered Fan'}
                            {type === 'verified_trader' && 'Verified Market Trader'}
                            {type === 'unauthorized' && `${fan.failedLoginAttempts} Failed Attempts`}
                          </span>
                        </td>
                        <td>
                          <span className={`fp-verified-pill fp-verified-pill--${fan.isVerified ? 'yes' : 'no'}`}>
                            {fan.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td>
                          <span className={`fp-status-pill fp-status-pill--${status}`}>
                            {status === 'active' && 'Active'}
                            {status === 'suspended' && 'Suspended'}
                            {status === 'blocked' && 'Market Blocked'}
                            {status === 'deactivated' && 'Deactivated'}
                          </span>
                        </td>
                        <td>{formatDateTime(fan.createdAt)}</td>
                        <td>{formatDateTime(fan.lastActiveAt)}</td>
                        <td>
                          <div className="fp-actions-cell">
                            {status !== 'deactivated' && (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={fan.isActive}
                                aria-label={fan.isActive ? `Suspend ${fan.fullName}` : `Reactivate ${fan.fullName}`}
                                className={`fp-switch${fan.isActive ? ' fp-switch--on' : ''}`}
                                onClick={() => handleToggleActive(fan)}
                              >
                                <span className="fp-switch__thumb" />
                              </button>
                            )}
                            {status !== 'deactivated' && (
                              <button
                                type="button"
                                className="fp-icon-btn fp-icon-btn--danger"
                                aria-label={`Delete ${fan.fullName}`}
                                onClick={() => setConfirmDeleteFan(fan)}
                                title="Delete account"
                              >
                                <FiTrash2 aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleFans.length === 0 && (
                    <tr>
                      <td colSpan={8} className="fp-table__empty">
                        {fans.length === 0 ? 'No fan accounts yet.' : 'No fans match this filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredFans.length > 0 && (
              <div className="fp-pagination">
                <div className="fp-pagination__summary">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredFans.length)} of {filteredFans.length} fans
                </div>
                <div className="fp-pagination__controls">
                  <select
                    className="fp-page-size"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} per page
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="fp-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft aria-hidden="true" />
                  </button>
                  {pageNumbers.map((num, idx) =>
                    num === '...' ? (
                      <span key={`ellipsis-${idx}`} className="fp-page-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={num}
                        type="button"
                        className={`fp-page-btn${num === currentPage ? ' fp-page-btn--active' : ''}`}
                        onClick={() => setPage(num)}
                      >
                        {num}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className="fp-page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <FiChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDeleteFan && (
        <div className="fp-modal-overlay" role="dialog" aria-modal="true" onClick={() => !isDeleting && setConfirmDeleteFan(null)}>
          <div className="fp-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete Account</h3>
            <p>
              Are you sure you want to delete <strong>{confirmDeleteFan.fullName || confirmDeleteFan.email}</strong>?
              This deactivates their account and signs them out everywhere — it can be reversed by reactivating them
              later, but should only be done for accounts you don't want using the platform.
            </p>
            <div className="fp-modal__footer">
              <button
                type="button"
                className="fp-btn fp-btn--outline"
                onClick={() => setConfirmDeleteFan(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button type="button" className="fp-btn fp-btn--danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default FansPage;