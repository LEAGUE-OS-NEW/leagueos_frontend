import React from 'react';

export type NotificationType =
  | 'deadline'
  | 'injury'
  | 'suspension'
  | 'captain-scored'
  | 'invite'
  | 'correction'
  | 'transfer';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  timestamp: string;
}

const ICON: Record<NotificationType, string> = {
  deadline: '⏰',
  injury: '⚠️',
  suspension: '🚫',
  'captain-scored': '🎉',
  invite: '📩',
  correction: '📝',
  transfer: '🔁',
};

interface FantasyNotificationsProps {
  notifications: NotificationItem[];
  onToggleRead: (id: string) => void;
}

const FantasyNotifications: React.FC<FantasyNotificationsProps> = ({ notifications, onToggleRead }) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications">
      <div className="section-heading section-heading--tight">
        <h2>Notifications</h2>
        <p>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · deadline reminders, injury alerts, and
          scoring updates land here.
        </p>
      </div>
      <ul className="notifications__list">
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={`notifications__item${n.read ? '' : ' notifications__item--unread'}`}
              onClick={() => onToggleRead(n.id)}
              aria-pressed={n.read}
            >
              <span className="notifications__icon" aria-hidden="true">
                {ICON[n.type]}
              </span>
              <span className="notifications__body">
                <span className="notifications__message">{n.message}</span>
                <span className="notifications__time">{n.timestamp}</span>
              </span>
              {!n.read && <span className="notifications__dot" aria-hidden="true" />}
            </button>
          </li>
        ))}
        {notifications.length === 0 && <li className="notifications__empty">No notifications yet.</li>}
      </ul>
    </div>
  );
};

export default FantasyNotifications;
