import type {
  AuthenticatedUser,
  DashboardEntitlement,
} from '../types/dashboardAccess';

export const FULL_CLUB_ADMIN_ROLES = new Set([
  'CLUB_ADMIN',
  'CLUB_OWNER',
]);

export function normalizeWorkspaceRole(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[\s-]+/g, '_')
    : '';
}

export function getClubAdminEntitlements(
  user: AuthenticatedUser | null,
) {
  return (
    user?.dashboard_access?.entitlements.filter(
      entitlement => entitlement.dashboard === 'CLUB_ADMIN',
    ) ?? []
  );
}

export function getSelectedClubAdminEntitlement(
  entitlements: DashboardEntitlement[],
  selectedEntitlementId: string | null,
) {
  return (
    entitlements.find(
      entitlement => entitlement.id === selectedEntitlementId,
    ) ??
    entitlements[0] ??
    null
  );
}

export function getUserClub(
  user: AuthenticatedUser | null,
) {
  const club = user?.club;

  if (
    club &&
    typeof club === 'object' &&
    'id' in club &&
    'name' in club &&
    (typeof club.id === 'string' || typeof club.id === 'number') &&
    typeof club.name === 'string' &&
    String(club.id).trim() &&
    club.name.trim()
  ) {
    return {
      id: club.id,
      name: club.name,
    };
  }

  return null;
}

export function isFullClubAdmin(
  entitlement: DashboardEntitlement | null,
) {
  if (!entitlement) return false;

  return (
    FULL_CLUB_ADMIN_ROLES.has(
      normalizeWorkspaceRole(entitlement.workspace_role),
    ) ||
    entitlement.permissions.includes('dashboard.club_admin')
  );
}

export function canAccessClubSection(
  entitlement: DashboardEntitlement | null,
  permission: string | null,
) {
  if (!permission) return true;
  if (!entitlement) return false;
  if (isFullClubAdmin(entitlement)) return true;

  return entitlement.permissions.includes(permission);
}

export function getSelectedClubId(
  entitlement: DashboardEntitlement | null,
  user: AuthenticatedUser | null,
) {
  const scopeId = entitlement?.scope_id;

  if (scopeId !== null && scopeId !== undefined && String(scopeId).trim()) {
    return String(scopeId);
  }

  const club = getUserClub(user);

  return club ? String(club.id) : '';
}
