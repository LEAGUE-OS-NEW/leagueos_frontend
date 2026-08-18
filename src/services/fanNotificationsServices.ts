import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils.ts';

const NOTIFICATIONS_PATH = '/notifications/';
const NOTIFICATIONS_UNREAD_COUNT_PATH = '/notifications/unread-count/';
const NOTIFICATION_READ_PATH = (id: string) => `/notifications/${encodeURIComponent(id)}/read/`;
const NOTIFICATIONS_READ_ALL_PATH = '/notifications/mark-all-read/';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  eventType?: string;
}

export interface NotificationSummary {
  notifications: NotificationItem[];
  unreadCount: number;
}

// Backend (snake_case) shapes — adjust field names here if they differ.
interface NotificationApi {
  id: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
  occurred_at?: string;
  deep_link_path?: string | null;
  event_type?: string;
}

interface UnreadCountApi {
  unread_count: number;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

function adaptNotification(notification: NotificationApi): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.read_at),
    createdAt: notification.occurred_at || notification.created_at,
    link: notification.deep_link_path ?? undefined,
    eventType: notification.event_type,
  };
}

export async function fetchFanNotificationSummary(): Promise<NotificationSummary> {
  try {
    const [notificationsResponse, unreadResponse] = await Promise.all([
      apiClient.get(NOTIFICATIONS_PATH),
      apiClient.get(NOTIFICATIONS_UNREAD_COUNT_PATH),
    ]);
    const notifications = normalizeApiList<NotificationApi>(notificationsResponse.data);
    const unread = unwrapApiData<UnreadCountApi>(unreadResponse.data);
    return {
      notifications: notifications.map(adaptNotification),
      unreadCount: unread.unread_count,
    };
  } catch (error) {
    throw apiError(error);
  }
}

export async function markFanNotificationRead(id: string): Promise<NotificationItem> {
  try {
    const response = await apiClient.post(NOTIFICATION_READ_PATH(id));
    const data = unwrapApiData<NotificationApi>(response.data);
    return adaptNotification(data);
  } catch (error) {
    throw apiError(error);
  }
}

export async function markAllFanNotificationsRead(): Promise<NotificationItem[]> {
  try {
    await apiClient.post(NOTIFICATIONS_READ_ALL_PATH);
    const response = await apiClient.get(NOTIFICATIONS_PATH);
    return normalizeApiList<NotificationApi>(response.data).map(adaptNotification);
  } catch (error) {
    throw apiError(error);
  }
}
