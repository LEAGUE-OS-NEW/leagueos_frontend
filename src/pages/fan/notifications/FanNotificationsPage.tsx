import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheckCircle } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';
import type { NotificationItem } from '../../../services/fanNotificationsServices';
import { useState } from 'react';
import './FanNotificationsPage.css';

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

function FanNotificationsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const items = useNotificationsStore((state) => state.items);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const load = useNotificationsStore((state) => state.load);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) markRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="fan-notifications-page">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-notifications-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-notifications-content">
          <div className="fan-notifications-inner">
            <div className="fan-notifications-header">
              <div>
                <p className="fan-notifications-eyebrow">Account</p>
                <h1>Notifications</h1>
                <p>Everything League OS has sent you, in one place.</p>
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

            <div className="settings-panel">
              {isLoading && items.length === 0 ? (
                <DashboardSkeleton rows={5} />
              ) : error ? (
                <DashboardNotice tone="error" title="Couldn't load notifications" message={error} onRetry={load} />
              ) : items.length === 0 ? (
                <DashboardNotice
                  tone="empty"
                  title="You're all caught up"
                  message="New notifications will show up here."
                />
              ) : (
                <ul className="fan-notifications-list">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`fan-notification-item${item.isRead ? '' : ' fan-notification-item--unread'}`}
                    >
                      <button
                        type="button"
                        className="fan-notification-item-btn"
                        onClick={() => handleItemClick(item)}
                      >
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
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanNotificationsPage;