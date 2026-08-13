import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiFilter } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { fetchAuditLog, type AuditLogEntry } from '../../../services/auditLogService';
import './AuditLogPage.css';

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '—';
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
}

interface Filters {
  action: string;
  resourceType: string;
  userId: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FILTERS: Filters = { action: '', resourceType: '', userId: '', startDate: '', endDate: '' };

function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = (filters: Filters) => {
    setIsLoading(true);
    setLoadError(null);
    return fetchAuditLog({
      action: filters.action.trim() || undefined,
      resourceType: filters.resourceType.trim() || undefined,
      userId: filters.userId.trim() || undefined,
      startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
      endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
    })
      .then(setEntries)
      .catch(() => setLoadError('Could not load the audit log. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetchAuditLog()
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the audit log. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    load(draftFilters);
  };

  const handleClearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  };

  return (
    <AdminLayout>
      <div className="al-root">
        <div className="al-head">
          <p className="al-eyebrow">Welcome back</p>
          <h1>Audit Log</h1>
          <p>A read-only record of administrative actions across the platform — capped at the 200 most recent matching entries.</p>
        </div>

        <div className="al-panel al-filters">
          <div className="al-filters__grid">
            <label className="al-field">
              <span>Action</span>
              <input
                type="text"
                placeholder="e.g. ROLE_ASSIGNED"
                value={draftFilters.action}
                onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))}
              />
            </label>
            <label className="al-field">
              <span>Resource Type</span>
              <input
                type="text"
                placeholder="e.g. user"
                value={draftFilters.resourceType}
                onChange={(event) => setDraftFilters((current) => ({ ...current, resourceType: event.target.value }))}
              />
            </label>
            <label className="al-field">
              <span>User ID</span>
              <input
                type="text"
                placeholder="Actor's user id"
                value={draftFilters.userId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, userId: event.target.value }))}
              />
            </label>
            <label className="al-field">
              <span>From</span>
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>
            <label className="al-field">
              <span>To</span>
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))}
              />
            </label>
          </div>
          <div className="al-filters__actions">
            <button type="button" className="al-btn al-btn--ghost" onClick={handleClearFilters}>
              Clear
            </button>
            <button type="button" className="al-btn al-btn--gradient" onClick={handleApplyFilters}>
              <FiFilter /> Apply Filters
            </button>
          </div>
        </div>

        {loadError && (
          <div className="al-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" className="al-btn al-btn--outline al-btn--sm" onClick={() => load(appliedFilters)}>
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="al-loading">
            <FiActivity aria-hidden="true" className="al-loading__icon" />
            Loading audit log…
          </div>
        ) : (
          <div className="al-panel">
            <div className="al-table-scroll">
              <table className="al-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.timestamp)}</td>
                      <td>{entry.actorEmail ?? 'System'}</td>
                      <td>
                        <span className="al-action-pill">{entry.action}</span>
                      </td>
                      <td>
                        {entry.resourceType}
                        {entry.resourceId ? ` · ${entry.resourceId}` : ''}
                      </td>
                      <td className="al-table__metadata" title={formatMetadata(entry.metadata)}>
                        {formatMetadata(entry.metadata)}
                      </td>
                      <td>{entry.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="al-table__empty">
                        No audit entries match these filters.
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

export default AuditLogPage;
