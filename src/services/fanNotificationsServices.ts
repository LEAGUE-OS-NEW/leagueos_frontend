import axiosInstance from './apiClient';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
}

type BackendNotification = {
  id: string;
  title: string;
  message: string;
  deep_link_path?: string;
  occurred_at?: string;
  created_at: string;
  read_at?: string | null;
};

function mapNotification(item: BackendNotification): NotificationItem {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: item.occurred_at ?? item.created_at,
    isRead: Boolean(item.read_at),
    link: item.deep_link_path || undefined,
  };
}

export async function fetchFanNotifications(): Promise<NotificationItem[]> {
  const response = await axiosInstance.get<BackendNotification[] | { results: BackendNotification[] }>('/notifications/');
  const items = Array.isArray(response.data) ? response.data : response.data.results;
  return items.map(mapNotification);
}

export async function markFanNotificationRead(id: string): Promise<NotificationItem> {
  const response = await axiosInstance.post<BackendNotification>(`/notifications/${id}/read/`);
  return mapNotification(response.data);
}

export async function markAllFanNotificationsRead(): Promise<void> {
  await axiosInstance.post('/notifications/mark-all-read/');
}
