// Fan notification & communication preferences — service layer (US-2.2).
//
// No real backend endpoint exists for this yet, so this is mock-backed,
// following the same convention as accountService.ts / the General Admin
// services: typed interfaces, in-memory mock data, async delay()-wrapped
// functions, shaped so a real backend swap later only touches this file.

export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotificationCategoryId =
  | 'fixtures'
  | 'fantasy'
  | 'markets'
  | 'clubUpdates'
  | 'memberships'
  | 'tickets'
  | 'merchandise'
  | 'promotions';

export interface NotificationCategoryMeta {
  id: NotificationCategoryId;
  label: string;
  description: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  { id: 'fixtures', label: 'Fixtures & Match Updates', description: 'Kickoffs, live score updates, and full-time results.' },
  { id: 'fantasy', label: 'Fantasy Competitions', description: 'Gameweek deadlines, points updates, and league standings.' },
  { id: 'markets', label: 'Betting Markets', description: 'Market openings, price moves, and settlement results.' },
  { id: 'clubUpdates', label: 'Club Updates', description: 'News and announcements from clubs you follow.' },
  { id: 'memberships', label: 'Memberships', description: 'Renewal reminders and membership benefit updates.' },
  { id: 'tickets', label: 'Ticket Purchases', description: 'Order confirmations and event reminders.' },
  { id: 'merchandise', label: 'Merchandise Orders', description: 'Order status, shipping, and delivery updates.' },
  { id: 'promotions', label: 'Promotional Campaigns', description: 'Offers, discounts, and League OS marketing updates.' },
];

export type ChannelPreferences = Record<NotificationChannel, boolean>;

export type NotificationPreferences = {
  categories: Record<NotificationCategoryId, ChannelPreferences>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
};

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function defaultChannelPreferences(overrides: Partial<ChannelPreferences> = {}): ChannelPreferences {
  return { email: true, sms: false, push: true, ...overrides };
}

let preferences: NotificationPreferences = {
  categories: {
    fixtures: defaultChannelPreferences(),
    fantasy: defaultChannelPreferences(),
    markets: defaultChannelPreferences({ push: false }),
    clubUpdates: defaultChannelPreferences(),
    memberships: defaultChannelPreferences({ sms: true }),
    tickets: defaultChannelPreferences({ sms: true }),
    merchandise: defaultChannelPreferences(),
    promotions: defaultChannelPreferences({ email: false, push: false }),
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
};

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return delay(JSON.parse(JSON.stringify(preferences)));
}

export async function saveNotificationPreferences(next: NotificationPreferences): Promise<NotificationPreferences> {
  preferences = JSON.parse(JSON.stringify(next));
  return delay(JSON.parse(JSON.stringify(preferences)));
}
