import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiAlertOctagon,
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiSettings,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import RingGauge from '../../superadmin/sections/RingGauge';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';
import type { NotificationItem } from '../../../services/fanNotificationsServices';
import './SystemSettingsPage.css';

type TabId = 'general' | 'system-health' | 'integrations' | 'security' | 'notifications';
type ReadFilter = 'all' | 'unread' | 'read';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'system-health', label: 'System Health' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
];

const FILTERS: { id: ReadFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

const PREVIEW_COUNT = 8;

const SERVICES = [
  { name: 'Platform Services', status: 'Operational' },
  { name: 'Database', status: 'Operational' },
  { name: 'API Gateway', status: 'Operational' },
  { name: 'Background Jobs', status: 'Operational' },
  { name: 'CDN & Storage', status: 'Operational' },
];

const API_STATS = [
  { label: 'Total Requests (24h)', value: '24.8M' },
  { label: 'Failed Requests', value: '312K' },
  { label: 'Avg Response Time', value: '142ms' },
];

const TOTAL_INTEGRATIONS = 28;
const INTEGRATION_ROWS = [
  { label: 'Connected', count: 20, color: 'var(--color-open)' },
  { label: 'Pending', count: 5, color: 'var(--color-accent)' },
  { label: 'Attention Needed', count: 3, color: 'var(--color-live)' },
];

type AlertSeverity = 'critical' | 'warning';
interface SecurityAlert {
  icon: IconType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  time: string;
}
const SECURITY_ALERTS: SecurityAlert[] = [
  { icon: FiAlertOctagon, severity: 'critical', title: 'Unusual Admin Login', detail: 'admin@unknown-ip.com', time: '2m ago' },
  { icon: FiAlertTriangle, severity: 'warning', title: 'Failed Login Attempts', detail: '5 failed attempts detected', time: '15m ago' },
  { icon: FiAlertTriangle, severity: 'warning', title: 'API Key Usage Spike', detail: "Key ending in ...4f8a", time: '32m ago' },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function SystemSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [platformName, setPlatformName] = useState('League OS');
  const [supportEmail, setSupportEmail] = useState('support@leagueos.ug');
  const [currency, setCurrency] = useState('UGX');
  const [timezone, setTimezone] = useState('Africa/Kampala');
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && TABS.some((tab) => tab.id === tabParam) ? tabParam : 'general';

  const items = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const load = useNotificationsStore((state) => state.load);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  useEffect(() => {
    if (activeTab === 'notifications') load();
  }, [activeTab, load]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter((item) => !item.isRead);
    if (filter === 'read') return items.filter((item) => item.isRead);
    return items;
  }, [items, filter]);

  const visibleItems = isExpanded ? filteredItems : filteredItems.slice(0, PREVIEW_COUNT);
  const hasMore = filteredItems.length > PREVIEW_COUNT;

  const handleTabChange = (tabId: TabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  const handleFilterChange = (nextFilter: ReadFilter) => {
    setFilter(nextFilter);
    setIsExpanded(false);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) void markRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <AdminLayout>
      <div className="ss-root">
        <div className="ss-head">
          <p className="ss-eyebrow">Welcome back</p>
          <h1>System Settings</h1>
          <p>Platform-wide configuration, health, integrations, and security — Super Admin only.</p>
        </div>

        <div className="ss-tabs" role="tablist" aria-label="System settings">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ss-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
              {tab.id === 'notifications' && unreadCount > 0 && (
                <span className="ss-tab-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="ss-panel">
            <div className="ss-field-grid">
              <label className="ss-field">
                <span>Platform name</span>
                <input type="text" value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
              </label>
              <label className="ss-field">
                <span>Support email</span>
                <input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} />
              </label>
              <label className="ss-field">
                <span>Currency</span>
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                </select>
              </label>
              <label className="ss-field">
                <span>Timezone</span>
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                </select>
              </label>
            </div>
            <div className="ss-panel__footer">
              {saved && <span className="ss-saved-note"><FiCheckCircle aria-hidden="true" /> Saved</span>}
              <button type="button" className="ss-btn ss-btn--gradient" onClick={() => setSaved(true)}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'system-health' && (
          <div className="ss-panel">
            <div className="ss-gauge-row">
              <div className="ss-gauge-block">
                <RingGauge
                  segments={[{ value: 99.98, color: 'var(--color-open)' }]}
                  centerValue="99.98%"
                  centerCaption="Uptime"
                  ariaLabel="System uptime: 99.98%"
                />
                <ul className="ss-status-list">
                  {SERVICES.map((service) => (
                    <li key={service.name}>
                      <span>{service.name}</span>
                      <span className="ss-status-ok">
                        {service.status}
                        <i className="ss-status-dot" aria-hidden="true" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ss-gauge-block">
                <RingGauge
                  segments={[{ value: 98.7, color: 'var(--color-open)' }]}
                  centerValue="98.7%"
                  centerCaption="API Success Rate"
                  ariaLabel="API success rate: 98.7%"
                />
                <div className="ss-api-stats">
                  {API_STATS.map((stat) => (
                    <div className="ss-api-stat-row" key={stat.label}>
                      <span>{stat.label}</span>
                      <b>{stat.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="ss-note">
              <FiCheckCircle aria-hidden="true" /> All systems are performing within normal thresholds.
            </p>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="ss-panel">
            <div className="ss-gauge-row">
              <div className="ss-gauge-block">
                <RingGauge
                  segments={INTEGRATION_ROWS.map((row) => ({ value: (row.count / TOTAL_INTEGRATIONS) * 100, color: row.color }))}
                  centerValue={String(TOTAL_INTEGRATIONS)}
                  centerCaption="Total Integrations"
                  ariaLabel={`${TOTAL_INTEGRATIONS} total integrations`}
                />
                <ul className="ss-status-list">
                  {INTEGRATION_ROWS.map((row) => (
                    <li key={row.label}>
                      <span>
                        <i className="ss-status-dot" style={{ background: row.color }} aria-hidden="true" />
                        {row.label}
                      </span>
                      <b>{row.count}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="ss-hint">
              Payment providers (MTN MoMo, Airtel Money), sports data feeds, and notification channels this platform
              depends on.
            </p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="ss-panel">
            <ul className="ss-alert-list">
              {SECURITY_ALERTS.map((alert) => (
                <li key={alert.title}>
                  <span className={`ss-alert-icon ss-alert-icon--${alert.severity}`}>
                    <alert.icon aria-hidden="true" />
                  </span>
                  <span className="ss-alert-copy">
                    <b>{alert.title}</b>
                    <span>{alert.detail}</span>
                  </span>
                  <span className="ss-alert-time">{alert.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="ss-panel">
            <div className="ss-panel-heading">
              <div>
                <h2>Notification History</h2>
                <p>Real backend notifications sent to this Super Admin account.</p>
              </div>
              <button
                type="button"
                className="ss-btn"
                onClick={() => markAllRead()}
                disabled={isLoading || unreadCount === 0}
              >
                <FiCheckCircle aria-hidden="true" /> Mark all as read
              </button>
            </div>

            <div className="ss-notification-filters" role="tablist" aria-label="Filter notifications">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === option.id}
                  className={`ss-filter${filter === option.id ? ' is-active' : ''}`}
                  onClick={() => handleFilterChange(option.id)}
                >
                  {option.label}
                  {option.id === 'unread' && unreadCount > 0 && (
                    <span className="ss-filter-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            {isLoading && items.length === 0 ? (
              <div className="ss-notification-state">
                <FiSettings className="ss-spinner" aria-hidden="true" />
                Loading notifications...
              </div>
            ) : error ? (
              <div className="ss-notification-state ss-notification-state--error">
                <p>{error}</p>
                <button type="button" className="ss-btn" onClick={load}>Try again</button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="ss-notification-state">
                {filter === 'unread'
                  ? 'No unread notifications.'
                  : filter === 'read'
                    ? 'No read notifications yet.'
                    : 'New notifications will show up here.'}
              </div>
            ) : (
              <>
                <ul className="ss-notification-list">
                  {visibleItems.map((item) => (
                    <li key={item.id} className={`ss-notification-item${item.isRead ? '' : ' is-unread'}`}>
                      <button type="button" className="ss-notification-button" onClick={() => handleNotificationClick(item)}>
                        <span className="ss-notification-icon" aria-hidden="true"><FiBell /></span>
                        <span className="ss-notification-copy">
                          <span className="ss-notification-title">{item.title}</span>
                          <span className="ss-notification-message">{item.message}</span>
                          <span className="ss-notification-time">{timeAgo(item.createdAt)}</span>
                        </span>
                        {!item.isRead && <span className="ss-notification-dot" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>

                {hasMore && (
                  <button
                    type="button"
                    className="ss-view-more"
                    onClick={() => setIsExpanded((current) => !current)}
                  >
                    {isExpanded ? <>View less <FiChevronUp aria-hidden="true" /></> : <>View all ({filteredItems.length}) <FiChevronDown aria-hidden="true" /></>}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default SystemSettingsPage;
