// Fan account management — service layer (US-1.4).
//
// Security/activity/lifecycle have no real backend endpoint yet, so this is
// mock-backed (same async-over-mock-data shape as sportsDataService.ts /
// marketOperationsService.ts / marketApprovalService.ts) so a real backend
// swap later only touches this file. Profile/avatar reuse the *real*
// endpoints already in authServices.ts — deliberately not duplicated here.

export type AccountStatus = 'Active' | 'Pending Deletion' | 'Deactivated';

export interface AccountActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  device: string;
  location: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nowIso() {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

let accountStatus: AccountStatus = 'Active';

let activity: AccountActivityEntry[] = [
  {
    id: 'ACT-1',
    timestamp: '2026-08-05T08:12:00Z',
    action: 'Signed in',
    device: 'Chrome on Windows',
    location: 'Kampala, Uganda',
  },
  {
    id: 'ACT-2',
    timestamp: '2026-08-04T19:40:00Z',
    action: 'Password changed',
    device: 'Chrome on Windows',
    location: 'Kampala, Uganda',
  },
  {
    id: 'ACT-3',
    timestamp: '2026-08-03T07:05:00Z',
    action: 'Signed in',
    device: 'Safari on iPhone',
    location: 'Entebbe, Uganda',
  },
  {
    id: 'ACT-4',
    timestamp: '2026-08-01T14:22:00Z',
    action: 'Profile updated',
    device: 'Chrome on Windows',
    location: 'Kampala, Uganda',
  },
];

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function fetchAccountStatus(): Promise<AccountStatus> {
  return delay(accountStatus);
}

export async function fetchAccountActivity(): Promise<AccountActivityEntry[]> {
  return delay([...activity]);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

function logActivity(action: string) {
  activity = [
    { id: `ACT-${activity.length + 1}`, timestamp: nowIso(), action, device: 'Chrome on Windows', location: 'Kampala, Uganda' },
    ...activity,
  ];
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw new Error('Current and new password are required.');
  }
  logActivity('Password changed');
  return delay(undefined);
}

export async function requestDeactivation(): Promise<AccountStatus> {
  accountStatus = 'Deactivated';
  logActivity('Account deactivated');
  return delay(accountStatus);
}

export async function reactivateAccount(): Promise<AccountStatus> {
  accountStatus = 'Active';
  logActivity('Account reactivated');
  return delay(accountStatus);
}

export async function requestDeletion(): Promise<AccountStatus> {
  accountStatus = 'Pending Deletion';
  logActivity('Account deletion requested');
  return delay(accountStatus);
}

export async function cancelDeletion(): Promise<AccountStatus> {
  accountStatus = 'Active';
  logActivity('Account deletion cancelled');
  return delay(accountStatus);
}
