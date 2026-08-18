import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiBell, FiCheckCircle, FiChevronDown, FiChevronUp, FiSettings } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';
import type { NotificationItem } from '../../../services/fanNotificationsServices';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubSettingsPage.css';

type TabId = 'notifications';
type ReadFilter = 'all' | 'unread' | 'read';

const TABS: { id: TabId; label: string; icon: typeof FiBell }[] = [
  { id: 'notifications', label: 'Notifications', icon: FiBell },
];

const FILTERS: { id: ReadFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

const PREVIEW_COUNT = 8;

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

export default function ClubSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && TABS.some((tab) => tab.id === tabParam) ? tabParam : 'notifications';

  const items = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const load = useNotificationsStore((state) => state.load);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  useEffect(() => {
    load();
  }, [load]);

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
    <ClubAdminLayout>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Settings</h1>
          <p className="ca-page-subtitle">Manage club admin account settings and notification history.</p>
        </div>
      </div>

      <div className="ca-tabs" role="tablist" aria-label="Club settings">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ca-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <tab.icon /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'notifications' && (
        <div className="ca-panel ca-settings-panel">
          <div className="ca-settings-panel-header">
            <div>
              <h2 className="ca-panel-title">Notification History</h2>
              <p className="ca-settings-subtext">Real backend notifications sent to this club admin account.</p>
            </div>
            <button
              type="button"
              className="ca-btn ca-btn-secondary"
              onClick={() => markAllRead()}
              disabled={isLoading || unreadCount === 0}
            >
              <FiCheckCircle /> Mark all as read
            </button>
          </div>

          <div className="ca-settings-filters" role="tablist" aria-label="Filter notifications">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={filter === option.id}
                className={`ca-settings-filter${filter === option.id ? ' active' : ''}`}
                onClick={() => handleFilterChange(option.id)}
              >
                {option.label}
                {option.id === 'unread' && unreadCount > 0 && (
                  <span className="ca-settings-filter-count">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {isLoading && items.length === 0 ? (
            <div className="ca-settings-state">
              <FiSettings className="ca-settings-spinner" />
              Loading notifications...
            </div>
          ) : error ? (
            <div className="ca-settings-state ca-settings-state-error">
              <p>{error}</p>
              <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={load}>Try again</button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="ca-settings-state">
              {filter === 'unread' ? 'No unread notifications.' : filter === 'read' ? 'No read notifications yet.' : 'New notifications will show up here.'}
            </div>
          ) : (
            <>
              <ul className="ca-notification-list">
                {visibleItems.map((item) => (
                  <li key={item.id} className={`ca-notification-item${item.isRead ? '' : ' unread'}`}>
                    <button type="button" className="ca-notification-button" onClick={() => handleNotificationClick(item)}>
                      <span className="ca-notification-icon" aria-hidden="true"><FiBell /></span>
                      <span className="ca-notification-body">
                        <span className="ca-notification-title">{item.title}</span>
                        <span className="ca-notification-message">{item.message}</span>
                        <span className="ca-notification-time">{timeAgo(item.createdAt)}</span>
                      </span>
                      {!item.isRead && <span className="ca-notification-dot" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  className="ca-settings-view-more"
                  onClick={() => setIsExpanded((current) => !current)}
                >
                  {isExpanded ? <>View less <FiChevronUp /></> : <>View all ({filteredItems.length}) <FiChevronDown /></>}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ClubAdminLayout>
  );
}
