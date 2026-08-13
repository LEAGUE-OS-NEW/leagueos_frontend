// Admin Users, Roles & Invitations — service layer, backed by
// platform_admin's real REST surface (`/admin/users/`, `/admin/roles/`,
// `/admin/invitations/`). There is no direct "create a user with a
// password" endpoint — accounts are created by inviting an email address
// to one or more platform roles; the invitee sets their own password when
// they accept.
//
// Platform roles (fetchAdminRoles/inviteAdminUser) are real end-to-end.
// Club Admin invites are a special case, kept separate below: the backend's
// generic Role/UserRole system has no club-scoping field, so a real Club
// Admin invite needs backend work that doesn't exist yet (see
// inviteClubAdmin's own comment) — that path is mock-backed for now, not
// wired to /admin/invitations/.

import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dashboardUrl: string;
  isSystem: boolean;
  permissions: string[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
  isSuperuser: boolean;
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
    roles: Array.isArray(raw.roles) ? raw.roles.map(String) : [],
    isActive: Boolean(raw.is_active),
    isVerified: Boolean(raw.is_verified),
    isSuperuser: Boolean(raw.is_superuser),
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

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await apiClient.get('/admin/users/');
  return normalizeApiList<Record<string, unknown>>(response.data).map(adaptUser);
}

export async function fetchAdminInvitations(): Promise<AdminInvitation[]> {
  const response = await apiClient.get('/admin/invitations/');
  return normalizeApiList<Record<string, unknown>>(response.data).map(adaptInvitation);
}

export async function inviteAdminUser(input: { email: string; roleId: string }): Promise<AdminInvitation> {
  if (!EMAIL_PATTERN.test(input.email.trim())) fail('Enter a valid email address.');
  if (!input.roleId) fail('Select a role for this invitation.');
  const response = await apiClient.post('/admin/invitations/', {
    email: input.email.trim(),
    role_ids: [input.roleId],
  });
  return adaptInvitation(response.data);
}

export async function revokeAdminInvitation(id: string): Promise<AdminInvitation> {
  const response = await apiClient.post(`/admin/invitations/${encodeURIComponent(id)}/revoke/`);
  return adaptInvitation(response.data);
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<AdminUser> {
  const response = await apiClient.patch(`/admin/users/${encodeURIComponent(userId)}/`, { is_active: isActive });
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
/* Club Admin invites — a special case, see file header                */
/* ------------------------------------------------------------------ */

export interface RealClubSummary {
  id: string;
  name: string;
  slug: string;
}

// Real — GET /profiles/clubs/. Deliberately not clubsService.ts's
// fetchClubs(), which is 100% hardcoded mock data and doesn't reflect
// what clubs actually exist in the database.
export async function fetchRealClubs(): Promise<RealClubSummary[]> {
  const response = await apiClient.get('/profiles/clubs/');
  return normalizeApiList<Record<string, unknown>>(response.data).map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
  }));
}

export interface MockClubAdminInvite {
  email: string;
  notifyEmail: string;
  clubName: string;
  createdAt: string;
}

// Mock-backed — there is no real endpoint for this yet. The real
// /admin/invitations/ endpoint accepts only email + role_ids, with no
// club-scoping field and no separate delivery-address field, so a Club
// Admin invite can't actually be sent via it today. This simulates the
// target flow (create the club if new, "send" the scoped invite to the
// personal address) so the UI is ready to swap in a real call once the
// backend adds club-scoping + a notify_email field to invitations (see the
// plan/backend report for the exact service points needed).
export async function inviteClubAdmin(input: { email: string; notifyEmail: string; clubName: string }): Promise<MockClubAdminInvite> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input.email.trim())) {
    throw new Error('Enter a valid LeagueOS email address.');
  }
  if (!emailPattern.test(input.notifyEmail.trim())) {
    throw new Error('Enter a valid personal email address.');
  }
  if (!input.clubName.trim()) {
    throw new Error('A club is required for a Club Admin invite.');
  }
  const result: MockClubAdminInvite = {
    email: input.email.trim(),
    notifyEmail: input.notifyEmail.trim(),
    clubName: input.clubName.trim(),
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve) => setTimeout(() => resolve(result), 300));
}
