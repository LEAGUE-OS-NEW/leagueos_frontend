import { create } from 'zustand';
import {
  fetchFanNotificationSummary,
  markAllFanNotificationsRead,
  markFanNotificationRead,
  type NotificationItem,
} from '../services/fanNotificationsServices';

type NotificationsState = {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const countUnread = (items: NotificationItem[]) => items.filter((item) => !item.isRead).length;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasLoaded: false,

  load: async () => {
    set({ isLoading: true, error: null });

    try {
      const summary = await fetchFanNotificationSummary();
      set({
        items: summary.notifications,
        unreadCount: summary.unreadCount,
        isLoading: false,
        error: null,
        hasLoaded: true,
      });
    } catch {
      set({
        isLoading: false,
        error: 'Could not load your notifications.',
        hasLoaded: true,
      });
    }
  },

  markRead: async (id) => {
    const previous = get().items;
    const optimistic = previous.map((item) => (item.id === id ? { ...item, isRead: true } : item));
    set({ items: optimistic, unreadCount: countUnread(optimistic), error: null });

    try {
      const updated = await markFanNotificationRead(id);
      const next = get().items.map((item) => (item.id === id ? updated : item));
      set({ items: next, unreadCount: countUnread(next), error: null });
    } catch {
      set({
        items: previous,
        unreadCount: countUnread(previous),
        error: 'Could not mark notification as read.',
      });
    }
  },

  markAllRead: async () => {
    const previous = get().items;
    const optimistic = previous.map((item) => ({ ...item, isRead: true }));
    set({ items: optimistic, unreadCount: 0, error: null });

    try {
      await markAllFanNotificationsRead();
    } catch {
      set({
        items: previous,
        unreadCount: countUnread(previous),
        error: 'Could not mark notifications as read.',
      });
    }
  },
}));
