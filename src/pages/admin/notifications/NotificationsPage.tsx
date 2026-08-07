import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiActivity, FiSend } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useAuthStore } from '../../../store/authStore';
import {
  fetchNotifications,
  NOTIFICATION_AUDIENCES,
  sendNotification,
  type AdminNotification,
  type NotificationAudience,
} from '../../../services/notificationsService';
import './NotificationsPage.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationsPage() {
  const currentAdmin = useAuthStore((state) => state.user?.full_name || state.user?.email || 'You');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('All Fans');

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((result) => {
        if (!cancelled) setNotifications(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load notifications. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async () => {
    setIsSending(true);
    setActionError(null);
    try {
      const sent = await sendNotification({ title, message, audience, sentBy: currentAdmin });
      setNotifications((current) => [sent, ...current]);
      setTitle('');
      setMessage('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not send this notification.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="np-root">
        <div className="np-head">
          <p className="np-eyebrow">Welcome back</p>
          <h1>Notifications</h1>
          <p>Send platform announcements to fans or fellow admins.</p>
        </div>

        {(loadError || actionError) && (
          <div className="np-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
          </div>
        )}

        <div className="np-panel">
          <h2>Send Notification</h2>
          <div className="np-field-grid">
            <label className="np-field">
              <span>Title</span>
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New market: Vipers SC vs Express FC" />
            </label>
            <label className="np-field">
              <span>Audience</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value as NotificationAudience)}>
                {NOTIFICATION_AUDIENCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="np-field">
            <span>Message</span>
            <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="A new market just went live ahead of kickoff." />
          </label>
          <div className="np-panel__footer">
            <button type="button" className="np-btn np-btn--gradient" disabled={isSending} onClick={handleSend}>
              <FiSend /> {isSending ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="np-loading">
            <FiActivity aria-hidden="true" className="np-loading__icon" />
            Loading notifications…
          </div>
        ) : (
          <div className="np-panel">
            <h2>Recent Notifications</h2>
            <ul className="np-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <div className="np-list__row">
                    <strong>{notification.title}</strong>
                    <span className="np-list__time">{formatDateTime(notification.sentAt)}</span>
                  </div>
                  <p className="np-list__message">{notification.message}</p>
                  <span className="np-list__meta">
                    {notification.audience} &middot; sent by {notification.sentBy}
                  </span>
                </li>
              ))}
              {notifications.length === 0 && <li className="np-empty">No notifications sent yet.</li>}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default NotificationsPage;
