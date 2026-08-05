import { useEffect, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiClock, FiMapPin, FiMonitor } from 'react-icons/fi';
import { fetchAccountActivity, type AccountActivityEntry } from '../../../../services/accountService';
import './ActivityTab.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityTab() {
  const [activity, setActivity] = useState<AccountActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccountActivity()
      .then((result) => {
        if (!cancelled) setActivity(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load your account activity. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="settings-panel">
      <h2 className="settings-panel-heading">Account Activity</h2>
      <p className="settings-panel-subtext">A record of recent sign-ins and changes to your account.</p>

      {loadError && (
        <div className="settings-banner settings-banner--error" role="status">
          <FiAlertTriangle /> {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="settings-loading">
          <FiActivity className="settings-loading__icon" aria-hidden="true" />
          Loading activity…
        </div>
      ) : (
        <ul className="activity-list">
          {activity.map((entry) => (
            <li className="activity-item" key={entry.id}>
              <span className="activity-item-action">{entry.action}</span>
              <span className="activity-item-meta">
                <span>
                  <FiClock aria-hidden="true" /> {formatDateTime(entry.timestamp)}
                </span>
                <span>
                  <FiMonitor aria-hidden="true" /> {entry.device}
                </span>
                <span>
                  <FiMapPin aria-hidden="true" /> {entry.location}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ActivityTab;
