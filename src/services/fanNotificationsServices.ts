import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils.ts';

const NOTIFICATIONS_LIST_PATH = '/notifications/';
const NOTIFICATIONS_UNREAD_COUNT_PATH = '/notifications/unread-count/';
const NOTIFICATION_READ_PATH = (id: string) => `/notifications/${encodeURIComponent(id)}/read/`;
const NOTIFICATIONS_MARK_ALL_READ_PATH = '/notifications/mark-all-read/';

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

// Backend (snake_case) shape — matches notifications.serializers.NotificationSerializer.
interface NotificationApi {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
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
    isRead: notification.read_at !== null,
    createdAt: notification.created_at,
    link: notification.deep_link_path ?? undefined,
    eventType: notification.event_type,
  };
}

// GET /notifications/ (paginated list) + GET /notifications/unread-count/ —
// there is no combined "summary" endpoint on the backend.
export async function fetchFanNotificationSummary(): Promise<NotificationSummary> {
  try {
    const [listResponse, unreadResponse] = await Promise.all([
      apiClient.get(NOTIFICATIONS_LIST_PATH),
      apiClient.get(NOTIFICATIONS_UNREAD_COUNT_PATH),
    ]);
    const notifications = normalizeApiList<NotificationApi>(listResponse.data).map(adaptNotification);
    const unreadCount = unwrapApiData<UnreadCountApi>(unreadResponse.data).unread_count;
    return { notifications, unreadCount };
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

export async function markAllFanNotificationsRead(): Promise<void> {
  try {
    await apiClient.post(NOTIFICATIONS_MARK_ALL_READ_PATH);
  } catch (error) {
    throw apiError(error);
  }
}
