// Admin Users, Roles & Invitations — service layer, backed by
// platform_admin's real REST surface (`/admin/users/`, `/admin/roles/`,
// `/admin/invitations/`, `/admin/clubs/`). There is no direct "create a
// user with a password" endpoint — accounts are created by inviting an
// email address, and the invitee sets their own password when they accept.
//
// Platform roles (fetchAdminRoles/inviteAdminUser) go through
// /admin/invitations/ (AdminInvitation), which has no club-scoping field.
// Club Admin invites are a separate real path, kept below: they go through
// clubs/<club_pk>/staff-invitations/invite-admin/ instead, which bridges
// StaffInvitation (club scoping) with an account-setup email for a
// brand-new login — see ClubAdminInvitationService on the backend.

import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';
import type { DashboardIdentifier } from '../types/dashboardAccess.ts';

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dashboardUrl: string;
  isSystem: boolean;
  permissions: string[];
}

// Matches User.AccountStatus on the backend (accounts/models.py) — only
// these three values are real. There is no "pending invitation" account
// status; invitation lifecycle lives on AdminInvitation.status instead.
export type AdminAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
  isSuperuser: boolean;
  accountStatus: AdminAccountStatus;
  failedLoginAttempts: number;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  // NOTE: the exact set of non-"CLEAR" values for marketRestrictionStatus
  // isn't enumerated in AdminUserListSerializer (get_market_restriction_status
  // just proxies compliance.restriction_status). Confirm the real choices
  // against the compliance model before branching UI on specific strings
  // other than 'CLEAR'.
  marketKycStatus: string;
  marketRestrictionStatus: string;
  isMarketVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  assignedRoles: string[];
  invitedByEmail: string | null;
  status: string;
  tokenExpiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

function fail(message: string): never {
  throw new Error(message);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adaptRole(raw: Record<string, unknown>): AdminRole {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    displayName: String(raw.display_name ?? raw.name ?? 'Unnamed role'),
    description: String(raw.description ?? ''),
    dashboardUrl: String(raw.dashboard_url ?? ''),
    isSystem: Boolean(raw.is_system),
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map(String) : [],
  };
}

function adaptUser(raw: Record<string, unknown>): AdminUser {
  const firstName = String(raw.first_name ?? '').trim();
  const lastName = String(raw.last_name ?? '').trim();
  const email = String(raw.email ?? '');
  return {
    id: String(raw.id),
    fullName: [firstName, lastName].filter(Boolean).join(' ') || email,
    email,
    phone: raw.phone_number ? String(raw.phone_number) : null,
    roles: Array.isArray(raw.roles) ? raw.roles.map(String) : [],
    isActive: Boolean(raw.is_active),
    isVerified: Boolean(raw.is_verified),
    isSuperuser: Boolean(raw.is_superuser),
    accountStatus: (String(raw.account_status ?? 'ACTIVE') as AdminAccountStatus),
    failedLoginAttempts: Number(raw.failed_attempts ?? 0),
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : null,
    lastActiveAt: raw.last_active_at ? String(raw.last_active_at) : null,
    marketKycStatus: String(raw.market_kyc_status ?? 'NOT_STARTED'),
    marketRestrictionStatus: String(raw.market_restriction_status ?? 'CLEAR'),
    isMarketVerified: Boolean(raw.is_market_verified),
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
  };
}

function adaptInvitation(raw: Record<string, unknown>): AdminInvitation {
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    assignedRoles: Array.isArray(raw.assigned_roles) ? raw.assigned_roles.map(String) : [],
    invitedByEmail: raw.invited_by_email ? String(raw.invited_by_email) : null,
    status: String(raw.status ?? ''),
    tokenExpiresAt: String(raw.token_expires_at ?? ''),
    acceptedAt: raw.accepted_at ? String(raw.accepted_at) : null,
    createdAt: String(raw.created_at ?? ''),
  };
}

// GET /admin/roles/ returns every Role in the system — fan/club/system-tier
// roles included (Fan, Visitor, Club Member, External Systems, etc.), not
// just platform specialist-admin ones. Allow-list (not a block-list) so a
// new fan/system role added later doesn't silently show up here — matches
// the real Role.name strings from seed_roles.py. "Club Admin" deliberately
// excluded too — that's handled separately via the invite modal's sentinel.
const PLATFORM_ADMIN_ROLE_NAMES = new Set([
  'Super Admin',
  'Sports Data & Statistics Admin',
  'Market Operations & Approval Admin',
  'Result Verification Admin',
  'Compliance Admin',
  'Finance Admin',
  'Customer Support Admin',
]);

export async function fetchAdminRoles(): Promise<AdminRole[]> {
  const response = await apiClient.get('/admin/roles/');
  return normalizeApiList<Record<string, unknown>>(response.data)
    .map(adaptRole)
    .filter((role) => PLATFORM_ADMIN_ROLE_NAMES.has(role.name));
}

// Inverse of PLATFORM_ADMIN_ROLE_NAMES — resolves a real Role.name string
// (as returned by GET /admin/me/) to the frontend's DashboardIdentifier, so
// useActiveAdminRole can drive the shell's role switcher off the admin's
// actual permissions instead of login-time dashboard_access entitlements.
const PLATFORM_ROLE_NAME_TO_IDENTIFIER: Record<string, DashboardIdentifier> = {
  'Super Admin': 'SUPER_ADMIN',
  'Sports Data & Statistics Admin': 'SPORTS_DATA_STATISTICS_ADMIN',
  'Market Operations & Approval Admin': 'MARKET_OPERATIONS_ADMIN',
  'Result Verification Admin': 'RESULT_VERIFICATION_ADMIN',
  'Compliance Admin': 'COMPLIANCE_ADMIN',
  'Finance Admin': 'FINANCE_ADMIN',
  'Customer Support Admin': 'CUSTOMER_SUPPORT_ADMIN',
};

export interface MyAdminAccess {
  roles: DashboardIdentifier[];
  permissions: string[];
}

// Real — GET /admin/me/. Returns the logged-in admin's actual roles and
// permissions, unlike dashboard_access (set once at login/hydration, which
// can drift from what the backend currently grants this account).
export async function fetchMyAdminAccess(): Promise<MyAdminAccess> {
  const response = await apiClient.get('/admin/me/');
  const raw = response.data as Record<string, unknown>;
  const rawRoles = Array.isArray(raw.roles) ? raw.roles.map(String) : [];
  const rawPermissions = Array.isArray(raw.permissions) ? raw.permissions.map(String) : [];
  const roles = rawRoles
    .map((name) => PLATFORM_ROLE_NAME_TO_IDENTIFIER[name])
    .filter((identifier): identifier is DashboardIdentifier => Boolean(identifier));
  return { roles, permissions: rawPermissions };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await apiClient.get('/admin/users/');
  return normalizeApiList<Record<string, unknown>>(response.data).map(adaptUser);
}

export async function fetchAdminInvitations(): Promise<AdminInvitation[]> {
  const response = await apiClient.get('/admin/invitations/');
  return normalizeApiList<Record<string, unknown>>(response.data).map(adaptInvitation);
}

// Mirrors inviteClubAdmin's two-email model: loginEmail is the LeagueOS
// identity assigned to this role, notifyEmail is the real inbox the invite
// is actually delivered to — a brand-new platform-role admin has no working
// inbox at their assigned login yet, same rationale as Club Admin.
export async function inviteAdminUser(input: { loginEmail: string; notifyEmail: string; roleId: string }): Promise<AdminInvitation> {
  if (!EMAIL_PATTERN.test(input.loginEmail.trim())) fail('Enter a valid LeagueOS email address.');
  if (!EMAIL_PATTERN.test(input.notifyEmail.trim())) fail('Enter a valid personal email address.');
  if (!input.roleId) fail('Select a role for this invitation.');
  const response = await apiClient.post('/admin/invitations/', {
    login_email: input.loginEmail.trim(),
    notify_email: input.notifyEmail.trim(),
    role_ids: [input.roleId],
  });
  return adaptInvitation(response.data);
}

export async function revokeAdminInvitation(id: string): Promise<AdminInvitation> {
  const response = await apiClient.post(`/admin/invitations/${encodeURIComponent(id)}/revoke/`);
  return adaptInvitation(response.data);
}

// Platform-role invites (Compliance Admin, Finance Admin, etc.) assign a
// role to an already-registered user rather than creating a new login —
// unlike inviteClubAdmin/AcceptInvite, there's no password-setup step here.
export async function acceptAdminInvitation(token: string): Promise<AdminInvitation> {
  const response = await apiClient.post('/admin/invitations/accept/', { token });
  return adaptInvitation(response.data);
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<AdminUser> {
  const response = await apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/`, { is_active: isActive });
  return adaptUser(response.data);
}

// Soft-deactivate — there is no hard-delete endpoint for admin/fan
// accounts. Uses the same PATCH surface as setAdminUserActive, driven by
// AdminUserRoleUpdateSerializer's account_status field.
export async function deactivateAdminUser(userId: string): Promise<AdminUser> {
  const response = await apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/`, {
    account_status: 'DEACTIVATED',
  });
  return adaptUser(response.data);
}

export async function assignAdminRole(userId: string, roleId: string): Promise<AdminUser> {
  const response = await apiClient.post(`/admin/users/${encodeURIComponent(userId)}/roles/assign/`, {
    role_id: roleId,
  });
  return adaptUser(response.data);
}

export async function revokeAdminRole(userId: string, roleId: string): Promise<AdminUser> {
  const response = await apiClient.delete(`/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}/`);
  return adaptUser(response.data);
}

/* ------------------------------------------------------------------ */
/* Incompatible-role guard — client-side, ahead of the backend         */
/*                                                                       */
/* The backend has no segregation-of-duties enforcement yet (only a     */
/* "can't remove the last Super Admin" guard) — flagged in the backend  */
/* report as a real ask. This is a real, useful stand-in in the         */
/* meantime, not a mock: it genuinely prevents conflicting assignments  */
/* through this UI, it just can't stop a direct API call the way a real */
/* server-side rule eventually should.                                  */
/* ------------------------------------------------------------------ */

const CONFLICTING_ROLE_PAIRS: [string, string][] = [
  ['Finance Admin', 'Result Verification Admin'],
  ['Finance Admin', 'Market Operations & Approval Admin'],
  ['Compliance Admin', 'Finance Admin'],
  ['Market Operations & Approval Admin', 'Result Verification Admin'],
];

// Super Admin is exempt — it already legitimately holds full authority by
// design, so it isn't a "conflict" for it to also carry a specialist role.
export function findRoleConflict(currentRoleNames: string[], candidateRoleName: string): string | null {
  if (candidateRoleName === 'Super Admin' || currentRoleNames.includes('Super Admin')) return null;
  for (const [a, b] of CONFLICTING_ROLE_PAIRS) {
    if (candidateRoleName === a && currentRoleNames.includes(b)) return b;
    if (candidateRoleName === b && currentRoleNames.includes(a)) return a;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Club Admin invites — a special case, see file header                */
/* ------------------------------------------------------------------ */

export interface RealClubSummary {
  id: string;
  name: string;
  slug: string;
}

// Real — GET /admin/clubs/ (platform_admin, reuses profiles.ClubListView).
// Deliberately not clubsService.ts's fetchClubs(), which is 100%
// hardcoded mock data and doesn't reflect what clubs actually exist.
export async function fetchRealClubs(): Promise<RealClubSummary[]> {
  const response = await apiClient.get('/admin/clubs/');
  return normalizeApiList<Record<string, unknown>>(response.data).map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
  }));
}

export interface RealSportSummary {
  id: string;
  name: string;
}

// Real — GET /sports/ (public catalog). Club creation needs a real Sport
// id, not the free-text 'Football' | 'Rugby' | 'Basketball' union that
// sportsDataService.ts's still-mock Competition flow uses.
export async function fetchRealSports(): Promise<RealSportSummary[]> {
  const response = await apiClient.get('/sports/');
  return normalizeApiList<Record<string, unknown>>(response.data).map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? ''),
  }));
}

// Real — POST /admin/clubs/ (platform_admin, reuses profiles.ClubListView,
// gated on admin.clubs.manage).
export async function createRealClub(input: { name: string; sportId: string }): Promise<RealClubSummary> {
  if (!input.name.trim()) throw new Error('Enter a club name.');
  if (!input.sportId) throw new Error('Select a sport.');
  const response = await apiClient.post('/admin/clubs/', {
    name: input.name.trim(),
    sport: input.sportId,
  });
  const raw = response.data as Record<string, unknown>;
  return { id: String(raw.id), name: String(raw.name ?? ''), slug: String(raw.slug ?? '') };
}

// Real — POST /<club_pk>/logo/ (clubs app, IsClubAdmin — Super Admin can
// set any club's logo, a Club Admin only their own). Usable right after
// createRealClub (before any workspace exists) or later by the club's own
// admin from ClubProfilePage.tsx.
export async function uploadClubLogo(clubId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await apiClient.post(`/${encodeURIComponent(clubId)}/logo/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const raw = response.data as Record<string, unknown>;
  return String(raw.logo_url ?? '');
}

export async function deleteClubLogo(clubId: string): Promise<void> {
  await apiClient.delete(`/${encodeURIComponent(clubId)}/logo/`);
}

export interface ClubAdminInvite {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
}

// Real — POST /<club_pk>/staff-invitations/invite-admin/ (clubs app).
// Bridges StaffInvitation (club scoping) with an account-setup email for a
// brand-new login — see ClubAdminInvitationService on the backend. The
// LeagueOS login identity is distinct from the personal delivery address
// since a brand-new club admin has no working inbox at their assigned
// login yet.
export async function inviteClubAdmin(input: { clubId: string; loginEmail: string; notifyEmail: string }): Promise<ClubAdminInvite> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input.loginEmail.trim())) {
    throw new Error('Enter a valid LeagueOS email address.');
  }
  if (!emailPattern.test(input.notifyEmail.trim())) {
    throw new Error('Enter a valid personal email address.');
  }
  if (!input.clubId) {
    throw new Error('A club is required for a Club Admin invite.');
  }
  const response = await apiClient.post(`/${encodeURIComponent(input.clubId)}/staff-invitations/invite-admin/`, {
    login_email: input.loginEmail.trim(),
    notify_email: input.notifyEmail.trim(),
  });
  const raw = response.data as Record<string, unknown>;
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    status: String(raw.status ?? ''),
    expiresAt: String(raw.expires_at ?? ''),
  };
}