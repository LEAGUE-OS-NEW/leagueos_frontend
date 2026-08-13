import apiClient from './apiClient.ts';
import { extractApiError, normalizeApiList, unwrapApiData } from './apiUtils.ts';

const NOTIFICATIONS_PATH = '/notifications/';
const UNREAD_COUNT_PATH = '/notifications/unread-count/';
const NOTIFICATION_READ_PATH = (id: string) => `/notifications/${encodeURIComponent(id)}/read/`;
const NOTIFICATIONS_MARK_ALL_READ_PATH = '/notifications/mark-all-read/';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
}

export interface NotificationSummary {
  notifications: NotificationItem[];
  unreadCount: number;
}

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  deep_link_path?: string | null;
  occurred_at?: string | null;
  created_at: string;
  read_at?: string | null;
}

interface UnreadCountResponse {
  unread_count: number;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

function adaptNotification(notification: BackendNotification): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.occurred_at ?? notification.created_at,
    isRead: Boolean(notification.read_at),
    link: notification.deep_link_path ?? undefined,
  };
}

export async function fetchFanNotifications(): Promise<NotificationItem[]> {
  try {
    const response = await apiClient.get(NOTIFICATIONS_PATH);
    return normalizeApiList<BackendNotification>(response.data).map(adaptNotification);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchFanUnreadNotificationCount(): Promise<number> {
  try {
    const response = await apiClient.get(UNREAD_COUNT_PATH);
    const data = unwrapApiData<UnreadCountResponse>(response.data);
    return data.unread_count;
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchFanNotificationSummary(): Promise<NotificationSummary> {
  const [notifications, unreadCount] = await Promise.all([
    fetchFanNotifications(),
    fetchFanUnreadNotificationCount(),
  ]);

  return { notifications, unreadCount };
}

export async function markFanNotificationRead(id: string): Promise<NotificationItem> {
  try {
    const response = await apiClient.post(NOTIFICATION_READ_PATH(id));
    const data = unwrapApiData<BackendNotification>(response.data);
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
