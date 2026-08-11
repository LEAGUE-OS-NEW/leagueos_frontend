import { create } from 'zustand';
import {
  fetchFanNotificationSummary,
  markFanNotificationRead,
  markAllFanNotificationsRead,
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
        hasLoaded: true,
      });
    } catch {
      set({ isLoading: false, error: 'Could not load your recent notifications.', hasLoaded: true });
    }
  },

  markRead: async (id: string) => {
    const previous = get().items;
    set({
      items: previous.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      unreadCount: previous.filter((item) => !item.isRead && item.id !== id).length,
    });
    try {
      await markFanNotificationRead(id);
    } catch {
      set({ items: previous, unreadCount: previous.filter((item) => !item.isRead).length });
    }
  },

  markAllRead: async () => {
    const previous = get().items;
    set({ items: previous.map((item) => ({ ...item, isRead: true })), unreadCount: 0 });
    try {
      await markAllFanNotificationsRead();
    } catch {
      set({ items: previous, unreadCount: previous.filter((item) => !item.isRead).length });
    }
  },
}));