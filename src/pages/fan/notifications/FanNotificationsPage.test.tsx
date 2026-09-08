import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FanNotificationsPage from './FanNotificationsPage';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';

vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));

const baseState = {
  items: [] as ReturnType<typeof useNotificationsStore.getState>['items'],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasLoaded: true,
  load: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
};

vi.mock('../../../store/fanNotificationsStore', () => ({
  useNotificationsStore: vi.fn(),
}));

function mockStore(items: (typeof baseState)['items']) {
  vi.mocked(useNotificationsStore).mockImplementation((selector) =>
    selector({ ...baseState, items }),
  );
}

describe('FanNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gives settlement win/loss/void notifications a distinct icon tone, leaving everything else generic', () => {
    mockStore([
      { id: '1', title: 'You won!', message: 'Settlement completed — you won 9.6.', isRead: false, createdAt: '2026-08-19T12:00:00Z', eventType: 'SETTLEMENT_WIN' },
      { id: '2', title: 'Market settled', message: "didn't win", isRead: false, createdAt: '2026-08-19T12:00:00Z', eventType: 'SETTLEMENT_LOSS' },
      { id: '3', title: 'Void refund', message: 'refunded', isRead: false, createdAt: '2026-08-19T12:00:00Z', eventType: 'VOID_REFUND' },
      { id: '4', title: 'Order filled', message: 'Your order received a market fill.', isRead: false, createdAt: '2026-08-19T12:00:00Z', eventType: 'ORDER_FULLY_FILLED' },
    ]);

    const { container } = render(
      <MemoryRouter>
        <FanNotificationsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('You won!')).toBeInTheDocument();
    expect(container.querySelector('.fan-notification-item-icon--won')).not.toBeNull();
    expect(container.querySelector('.fan-notification-item-icon--lost')).not.toBeNull();
    expect(container.querySelector('.fan-notification-item-icon--voided')).not.toBeNull();

    const icons = container.querySelectorAll('.fan-notification-item-icon');
    expect(icons).toHaveLength(4);
    const generic = Array.from(icons).filter(
      (icon) =>
        !icon.classList.contains('fan-notification-item-icon--won') &&
        !icon.classList.contains('fan-notification-item-icon--lost') &&
        !icon.classList.contains('fan-notification-item-icon--voided'),
    );
    expect(generic).toHaveLength(1);
  });
});
