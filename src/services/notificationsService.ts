// Admin Notifications — service layer. No backend endpoint exists yet, so
// this is in-memory mock, following the same delay()-wrapped async
// convention as every other admin service this pass.

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

export const NOTIFICATION_AUDIENCES = ['All Fans', 'Market Admins', 'Compliance Admins', 'Finance Admins'] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  sentBy: string;
  sentAt: string;
}

export interface SendNotificationInput {
  title: string;
  message: string;
  audience: NotificationAudience;
  sentBy: string;
}

const notifications: AdminNotification[] = [
  {
    id: genId('note'),
    title: 'New market: Vipers SC vs Express FC',
    message: 'A new market just went live ahead of kickoff.',
    audience: 'All Fans',
    sentBy: 'Dennis Kato',
    sentAt: hoursAgo(2),
  },
  {
    id: genId('note'),
    title: 'Scheduled maintenance',
    message: 'Trading will briefly pause tonight at 23:00 EAT for a routine deploy.',
    audience: 'All Fans',
    sentBy: 'Grace Nabirye',
    sentAt: hoursAgo(20),
  },
];

export async function fetchNotifications(): Promise<AdminNotification[]> {
  return delay([...notifications]);
}

export async function sendNotification(input: SendNotificationInput): Promise<AdminNotification> {
  if (!input.title.trim()) fail('Enter a notification title.');
  if (!input.message.trim()) fail('Enter a notification message.');

  const notification: AdminNotification = {
    id: genId('note'),
    title: input.title.trim(),
    message: input.message.trim(),
    audience: input.audience,
    sentBy: input.sentBy,
    sentAt: new Date().toISOString(),
  };
  notifications.unshift(notification);
  return delay({ ...notification });
}
