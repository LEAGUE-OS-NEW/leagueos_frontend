import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import {
  fetchFanNotificationSummary,
  markAllFanNotificationsRead,
  markFanNotificationRead,
} from './fanNotificationsServices.ts';

vi.mock('./apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('fan notifications service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the notification list and unread count as two real endpoints, not a fake summary endpoint', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/notifications/') {
        return Promise.resolve({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: 'note-1',
                title: 'You won!',
                message: 'Settlement completed — you won 9.6000.',
                read_at: null,
                created_at: '2026-08-19T12:00:00Z',
                deep_link_path: '/fan/positions',
                event_type: 'SETTLEMENT_WIN',
              },
            ],
          },
        });
      }
      if (url === '/notifications/unread-count/') {
        return Promise.resolve({ data: { unread_count: 3 } });
      }
      throw new Error(`unexpected GET ${url}`);
    });

    const result = await fetchFanNotificationSummary();

    expect(apiClient.get).toHaveBeenCalledWith('/notifications/');
    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count/');
    expect(result.unreadCount).toBe(3);
    expect(result.notifications).toEqual([
      {
        id: 'note-1',
        title: 'You won!',
        message: 'Settlement completed — you won 9.6000.',
        isRead: false,
        createdAt: '2026-08-19T12:00:00Z',
        link: '/fan/positions',
        eventType: 'SETTLEMENT_WIN',
      },
    ]);
  });

  it('derives isRead from the real read_at timestamp field, not a nonexistent is_read boolean', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/notifications/') {
        return Promise.resolve({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: 'note-2',
                title: 'Market settled',
                message: "Settlement completed — your pick didn't win. Net payout: 0.0000.",
                read_at: '2026-08-19T13:00:00Z',
                created_at: '2026-08-19T12:00:00Z',
                deep_link_path: null,
                event_type: 'SETTLEMENT_LOSS',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { unread_count: 0 } });
    });

    const result = await fetchFanNotificationSummary();

    expect(result.notifications[0]).toMatchObject({ isRead: true, link: undefined });
  });

  it('marks a single notification read via POST, not PATCH', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'note-1',
        title: 'You won!',
        message: 'Settlement completed — you won 9.6000.',
        read_at: '2026-08-19T13:05:00Z',
        created_at: '2026-08-19T12:00:00Z',
        deep_link_path: null,
        event_type: 'SETTLEMENT_WIN',
      },
    });

    const result = await markFanNotificationRead('note-1');

    expect(apiClient.post).toHaveBeenCalledWith('/notifications/note-1/read/');
    expect(result.isRead).toBe(true);
  });

  it('marks all notifications read at the real mark-all-read path without assuming an array response', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { updated: 5 } });

    await expect(markAllFanNotificationsRead()).resolves.toBeUndefined();

    expect(apiClient.post).toHaveBeenCalledWith('/notifications/mark-all-read/');
  });
});
