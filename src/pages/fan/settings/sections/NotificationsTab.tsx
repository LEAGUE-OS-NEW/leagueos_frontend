import { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiLock, FiMoon } from 'react-icons/fi';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import {
  NOTIFICATION_CATEGORIES,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type ChannelPreferences,
  type NotificationChannel,
  type NotificationPreferences,
} from '../../../../services/notificationPreferencesService';
import './NotificationsTab.css';

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Push' },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`notif-toggle${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="notif-toggle-thumb" />
    </button>
  );
}

function cloneRecord<T extends object>(record: T): T {
  return JSON.parse(JSON.stringify(record));
}

function NotificationsTab() {
  const { currentUser } = useCurrentUser();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotificationPreferences()
      .then((result) => {
        if (cancelled) return;
        setPreferences(result);
        setSavedPreferences(cloneRecord(result));
      })
      .catch(() => {
        if (!cancelled) setBanner({ tone: 'error', message: 'Could not load your notification preferences.' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const channelAvailability: Record<NotificationChannel, { available: boolean; reason?: string }> = {
    email: currentUser.isEmailVerified
      ? { available: true }
      : { available: false, reason: 'Verify your email address to enable email notifications.' },
    sms: currentUser.isPhoneVerified
      ? { available: true }
      : { available: false, reason: 'Verify your phone number to enable SMS notifications.' },
    push: { available: true },
  };

  const isDirty = preferences && savedPreferences ? JSON.stringify(preferences) !== JSON.stringify(savedPreferences) : false;

  const updateChannel = (categoryId: keyof NotificationPreferences['categories'], channel: NotificationChannel, value: boolean) => {
    setPreferences((current) => {
      if (!current) return current;
      const nextCategory: ChannelPreferences = { ...current.categories[categoryId], [channel]: value };
      return { ...current, categories: { ...current.categories, [categoryId]: nextCategory } };
    });
  };

  const updateQuietHours = (patch: Partial<NotificationPreferences['quietHours']>) => {
    setPreferences((current) => (current ? { ...current, quietHours: { ...current.quietHours, ...patch } } : current));
  };

  const handleCancel = () => {
    if (!savedPreferences) return;
    setPreferences(cloneRecord(savedPreferences));
    setBanner(null);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    setBanner(null);

    try {
      const result = await saveNotificationPreferences(preferences);
      setSavedPreferences(cloneRecord(result));
      setPreferences(result);
      setBanner({ tone: 'success', message: 'Your notification preferences have been saved.' });
    } catch {
      setBanner({ tone: 'error', message: 'Could not save your preferences. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !preferences || !savedPreferences) {
    return (
      <div className="settings-panel">
        <h2 className="settings-panel-heading">Notifications</h2>
        <div className="settings-loading">Loading your preferences…</div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <h2 className="settings-panel-heading">Notifications</h2>
      <p className="settings-panel-subtext">
        Choose which updates you receive from League OS and how you'd like to be reached.
      </p>

      {banner && (
        <div className={`settings-banner settings-banner--${banner.tone}`} role="status">
          {banner.tone === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {banner.message}
        </div>
      )}

      <div className="notif-mandatory">
        <FiLock aria-hidden="true" />
        <div>
          <p className="notif-mandatory-title">Security alerts &amp; compliance communications</p>
          <p className="notif-mandatory-desc">
            Account security alerts and regulatory/compliance messages are always sent by email and cannot be turned
            off — they keep your account safe and League OS compliant.
          </p>
        </div>
      </div>

      <div className="notif-category-list">
        <div className="notif-category-row notif-category-row--head" aria-hidden="true">
          <span>Category</span>
          {CHANNELS.map((channel) => (
            <span key={channel.id}>{channel.label}</span>
          ))}
        </div>

        {NOTIFICATION_CATEGORIES.map((category) => (
          <div className="notif-category-row" key={category.id}>
            <span className="notif-category-copy">
              <span className="notif-category-label">{category.label}</span>
              <span className="notif-category-desc">{category.description}</span>
            </span>
            {CHANNELS.map((channel) => {
              const availability = channelAvailability[channel.id];
              return (
                <span className="notif-channel-cell" key={channel.id}>
                  <span className="notif-channel-mobile-label">{channel.label}</span>
                  <Toggle
                    checked={availability.available && preferences.categories[category.id][channel.id]}
                    disabled={!availability.available}
                    onChange={(value) => updateChannel(category.id, channel.id, value)}
                    label={`${category.label} via ${channel.label}`}
                  />
                  {!availability.available && (
                    <span className="notif-channel-unavailable" title={availability.reason}>
                      <FiInfo aria-hidden="true" />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="notif-quiet-hours">
        <div className="notif-quiet-hours-heading">
          <FiMoon aria-hidden="true" />
          <div>
            <p className="notif-quiet-hours-title">Quiet hours</p>
            <p className="notif-quiet-hours-desc">Pause non-urgent notifications during these hours. Security alerts still come through.</p>
          </div>
          <Toggle
            checked={preferences.quietHours.enabled}
            onChange={(value) => updateQuietHours({ enabled: value })}
            label="Enable quiet hours"
          />
        </div>

        {preferences.quietHours.enabled && (
          <div className="notif-quiet-hours-times">
            <label>
              From
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(event) => updateQuietHours({ start: event.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(event) => updateQuietHours({ end: event.target.value })}
              />
            </label>
          </div>
        )}
      </div>

      <div className="settings-form-actions">
        <button type="button" className="settings-btn settings-btn--ghost" onClick={handleCancel} disabled={!isDirty || isSaving}>
          Cancel
        </button>
        <button type="button" className="settings-btn settings-btn--primary" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      <div className="notif-summary">
        <p className="notif-summary-title">Your saved configuration</p>
        <ul>
          {NOTIFICATION_CATEGORIES.map((category) => {
            const active = CHANNELS.filter((channel) => savedPreferences.categories[category.id][channel.id]).map(
              (channel) => channel.label,
            );
            return (
              <li key={category.id}>
                <strong>{category.label}:</strong> {active.length > 0 ? active.join(', ') : 'Off'}
              </li>
            );
          })}
          <li>
            <strong>Quiet hours:</strong>{' '}
            {savedPreferences.quietHours.enabled
              ? `${savedPreferences.quietHours.start} – ${savedPreferences.quietHours.end}`
              : 'Off'}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default NotificationsTab;
