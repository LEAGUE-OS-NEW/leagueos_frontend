import apiClient from './apiClient.ts';
import { extractApiError, unwrapApiData } from './apiUtils.ts';

// NOTE: adjust these to match your backend's actual routes if different.
const NOTIFICATIONS_SUMMARY_PATH = '/notifications/summary/';
const NOTIFICATION_READ_PATH = (id: string) => `/notifications/${encodeURIComponent(id)}/read/`;
const NOTIFICATIONS_READ_ALL_PATH = '/notifications/read-all/';

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
  is_read: boolean;
  created_at: string;
  link?: string | null;
  event_type?: string;
}

interface NotificationSummaryApi {
  notifications: NotificationApi[];
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
    isRead: notification.is_read,
    createdAt: notification.created_at,
    link: notification.link ?? undefined,
    eventType: notification.event_type,
  };
}

export async function fetchFanNotificationSummary(): Promise<NotificationSummary> {
  try {
    const response = await apiClient.get(NOTIFICATIONS_SUMMARY_PATH);
    const data = unwrapApiData<NotificationSummaryApi>(response.data);
    return {
      notifications: data.notifications.map(adaptNotification),
      unreadCount: data.unread_count,
    };
  } catch (error) {
    throw apiError(error);
  }
}

export async function markFanNotificationRead(id: string): Promise<NotificationItem> {
  try {
    const response = await apiClient.patch(NOTIFICATION_READ_PATH(id), { is_read: true });
    const data = unwrapApiData<NotificationApi>(response.data);
    return adaptNotification(data);
  } catch (error) {
    throw apiError(error);
  }
}

export async function markAllFanNotificationsRead(): Promise<NotificationItem[]> {
  try {
    const response = await apiClient.post(NOTIFICATIONS_READ_ALL_PATH);
    const data = unwrapApiData<NotificationApi[]>(response.data);
    return data.map(adaptNotification);
  } catch (error) {
    throw apiError(error);
  }
}
