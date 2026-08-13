import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import DashboardSkeleton from '../../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../../components/fan/dashboard/DashboardNotice';
import { useNotificationsStore } from '../../../../store/fanNotificationsStore';
import type { NotificationItem } from '../../../../services/fanNotificationsServices';
import './NotificationsHistorySection.css';

const PREVIEW_COUNT = 4;

type ReadFilter = 'all' | 'unread' | 'read';

const FILTERS: { id: ReadFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
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

function NotificationsHistorySection() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const items = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const load = useNotificationsStore((state) => state.load);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) markRead(item.id);
    if (item.link) navigate(item.link);
  };

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter((item) => !item.isRead);
    if (filter === 'read') return items.filter((item) => item.isRead);
    return items;
  }, [items, filter]);

  const visibleItems = isExpanded ? filteredItems : filteredItems.slice(0, PREVIEW_COUNT);
  const hasMore = filteredItems.length > PREVIEW_COUNT;

  const handleFilterChange = (nextFilter: ReadFilter) => {
    setFilter(nextFilter);
    setIsExpanded(false);
  };

  return (
    <div className="settings-panel">
      <div className="fan-notifications-header">
        <div>
          <h2 className="settings-panel-heading">Notification history</h2>
          <p className="settings-panel-subtext">Everything League OS has sent you, in one place.</p>
        </div>
        <button
          type="button"
          className="settings-btn settings-btn--outline"
          onClick={() => markAllRead()}
          disabled={isLoading || unreadCount === 0}
        >
          <FiCheckCircle /> Mark all as read
        </button>
      </div>

      <div className="notif-history-filters" role="tablist" aria-label="Filter notifications">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            className={`notif-history-filter${filter === option.id ? ' is-active' : ''}`}
            onClick={() => handleFilterChange(option.id)}
          >
            {option.label}
            {option.id === 'unread' && unreadCount > 0 && (
              <span className="notif-history-filter-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && items.length === 0 ? (
        <DashboardSkeleton rows={5} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load notifications" message={error} onRetry={load} />
      ) : filteredItems.length === 0 ? (
        <DashboardNotice
          tone="empty"
          title={filter === 'all' ? "You're all caught up" : 'Nothing here'}
          message={
            filter === 'unread'
              ? 'No unread notifications.'
              : filter === 'read'
              ? 'No read notifications yet.'
              : 'New notifications will show up here.'
          }
        />
      ) : (
        <>
          <ul className="fan-notifications-list">
            {visibleItems.map((item) => (
              <li key={item.id} className={`fan-notification-item${item.isRead ? '' : ' fan-notification-item--unread'}`}>
                <button type="button" className="fan-notification-item-btn" onClick={() => handleItemClick(item)}>
                  <span className="fan-notification-item-icon" aria-hidden="true">
                    <FiBell />
                  </span>
                  <span className="fan-notification-item-body">
                    <span className="fan-notification-item-title">{item.title}</span>
                    <span className="fan-notification-item-message">{item.message}</span>
                    <span className="fan-notification-item-time">{timeAgo(item.createdAt)}</span>
                  </span>
                  {!item.isRead && <span className="fan-notification-item-dot" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              className="notif-history-view-more"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? (
                <>
                  View less <FiChevronUp />
                </>
              ) : (
                <>
                  View all ({filteredItems.length}) <FiChevronDown />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationsHistorySection;
