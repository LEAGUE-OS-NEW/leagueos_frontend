// Admin Users & Roles — service layer.
//
// No backend endpoint exists for admin user management yet, so this is
// in-memory mock, following the same convention as every other admin
// service this pass: typed async functions, delay()-wrapped, shaped for a
// drop-in real-backend swap later.
//
// Per explicit instruction, this does not build a free-form permission
// builder — each role's permission set is fixed (see ROLE_PERMISSIONS) and
// only assignment (which user holds which of the existing roles) is
// editable. The team wants fewer roles, not a way to invent more.

import { ALL_SPECIALIST_ROLES } from '../config/adminNav';
import type { DashboardIdentifier } from '../types/dashboardAccess';
import { fetchClubs, type ClubSummary } from './clubsService';

export type AdminRole = Exclude<DashboardIdentifier, 'FAN' | 'TICKETING_OFFICER'>;
export const ASSIGNABLE_ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', ...ALL_SPECIALIST_ROLES, 'CLUB_ADMIN'] as AdminRole[];

export type AdminUserStatus = 'Active' | 'Inactive';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: AdminUserStatus;
  createdAt: string;
  lastActiveAt?: string;
  clubSlug?: string;
  clubName?: string;
}

export interface CreateAdminUserInput {
  fullName: string;
  email: string;
  role: AdminRole;
  password: string;
  clubSlug?: string;
}

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: [
    'Assign and deactivate admin users across every role',
    'Full access to every module, including all specialist workspaces',
    'Publish or cancel any market, regardless of who created it',
    'Configure platform-wide System Settings',
  ],
  SPORTS_DATA_STATISTICS_ADMIN: [
    'Manage competitions and provider mappings',
    'Resolve fixture, player and statistic data issues',
    'Approve or reject incoming data-provider changes',
  ],
  MARKET_OPERATIONS_ADMIN: [
    'Create markets from verified sporting events',
    'Define outcomes and set trading parameters',
    'Review fan-submitted market proposals',
    'Publish markets so they appear on the landing page and Markets page',
  ],
  RESULT_VERIFICATION_ADMIN: [
    'Verify real-world results against an official source',
    'Finalise markets, which triggers fan payouts',
    'Escalate or resolve market-result disputes',
  ],
  COMPLIANCE_ADMIN: [
    'Review KYC sessions and reassess participant risk',
    'Propose and countersign compliance decisions',
    'Apply account restrictions for responsible participation',
  ],
  FINANCE_ADMIN: [
    'Reconcile provider and ledger totals',
    'Investigate and resolve settlement mismatches',
    'Approve refunds under dual control',
    'View fund segregation and payout reports',
  ],
  CUSTOMER_SUPPORT_ADMIN: [
    'Read-only access to support cases and case history',
    'Assign, escalate and reply to fan support tickets',
    'Cannot approve KYC, modify balances, or decide market results',
  ],
  CLUB_ADMIN: [
    "Manage their own club's profile, squad, and fixtures",
    'Scoped to exactly one club — cannot see or affect other clubs',
    'Assigned and revoked only by a Super Admin',
  ],
};

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

async function resolveClub(clubSlug: string | undefined): Promise<ClubSummary> {
  if (!clubSlug) fail('Select a club for this Club Admin.');
  const clubs = await fetchClubs();
  const club = clubs.find((item) => item.slug === clubSlug);
  if (!club) fail('Select a club for this Club Admin.');
  return club;
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const users: AdminUser[] = [
  {
    id: genId('user'),
    fullName: 'Grace Nabirye',
    email: 'grace.nabirye@leagueos.ug',
    role: 'SUPER_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(2000),
    lastActiveAt: hoursAgo(1),
  },
  {
    id: genId('user'),
    fullName: 'Dennis Kato',
    email: 'dennis.kato@leagueos.ug',
    role: 'MARKET_OPERATIONS_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(1500),
    lastActiveAt: hoursAgo(3),
  },
  {
    id: genId('user'),
    fullName: 'Dennis Kato',
    email: 'dennis.kato@leagueos.ug',
    role: 'SPORTS_DATA_STATISTICS_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(1500),
    lastActiveAt: hoursAgo(6),
  },
  {
    id: genId('user'),
    fullName: 'Dawa Nakato',
    email: 'dawa.nakato@leagueos.ug',
    role: 'RESULT_VERIFICATION_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(1200),
    lastActiveAt: hoursAgo(20),
  },
  {
    id: genId('user'),
    fullName: 'Merab Aceng',
    email: 'merab.aceng@leagueos.ug',
    role: 'COMPLIANCE_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(900),
    lastActiveAt: hoursAgo(5),
  },
  {
    id: genId('user'),
    fullName: 'Merab Aceng',
    email: 'merab.aceng@leagueos.ug',
    role: 'FINANCE_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(900),
    lastActiveAt: hoursAgo(30),
  },
  {
    id: genId('user'),
    fullName: 'Marble Ochieng',
    email: 'marble.ochieng@leagueos.ug',
    role: 'CUSTOMER_SUPPORT_ADMIN',
    status: 'Active',
    createdAt: hoursAgo(700),
    lastActiveAt: hoursAgo(2),
  },
];

function cloneUser(user: AdminUser): AdminUser {
  return { ...user };
}

function findUserOrThrow(id: string): AdminUser {
  const user = users.find((item) => item.id === id);
  if (!user) fail(`Admin user ${id} was not found.`);
  return user;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return delay(users.map(cloneUser));
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  if (!input.fullName.trim()) fail('Enter the admin\'s full name.');
  if (!EMAIL_PATTERN.test(input.email.trim())) fail('Enter a valid email address.');
  if (input.password.trim().length < 8) fail('Password must be at least 8 characters.');
  if (users.some((user) => user.email.toLowerCase() === input.email.trim().toLowerCase() && user.role === input.role)) {
    fail('This person already holds that role.');
  }

  const club = input.role === 'CLUB_ADMIN' ? await resolveClub(input.clubSlug) : null;

  const user: AdminUser = {
    id: genId('user'),
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    role: input.role,
    status: 'Active',
    createdAt: nowIso(),
    clubSlug: club?.slug,
    clubName: club?.name,
  };
  users.unshift(user);
  return delay(cloneUser(user));
}

export async function updateAdminUserRole(id: string, role: AdminRole, clubSlug?: string): Promise<AdminUser> {
  const user = findUserOrThrow(id);
  const club = role === 'CLUB_ADMIN' ? await resolveClub(clubSlug ?? user.clubSlug) : null;
  user.role = role;
  user.clubSlug = club?.slug;
  user.clubName = club?.name;
  return delay(cloneUser(user));
}

export async function deactivateAdminUser(id: string): Promise<AdminUser> {
  const user = findUserOrThrow(id);
  user.status = user.status === 'Active' ? 'Inactive' : 'Active';
  return delay(cloneUser(user));
}
