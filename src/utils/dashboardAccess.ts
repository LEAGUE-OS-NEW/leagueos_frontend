import {
  type DashboardAccess,
  type DashboardEntitlement,
  type DashboardIdentifier,
  isDashboardIdentifier,
  isRecord,
} from '../types/dashboardAccess.js';

export const ACCESS_UNAVAILABLE_ROUTE = '/account/access-unavailable';

export interface WorkspaceOption {
  entitlementId: string;
  dashboard: DashboardIdentifier;
  route: string;
  scopeType: string | null;
  scopeId: string | number | null;
  workspaceRole: string | null;
  permissions: string[];
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isScopeId(
  value: unknown,
): value is string | number | null {
  return (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function validateEntitlement(value: unknown): DashboardEntitlement | null {
  if (!isRecord(value)) return null;

  const {
    id,
    dashboard,
    route,
    scope_type,
    scope_id,
    workspace_role,
    permissions,
  } = value;

  if (
    typeof id !== 'string' ||
    !id.trim() ||
    !isDashboardIdentifier(dashboard) ||
    typeof route !== 'string' ||
    !route.startsWith('/') ||
    route.startsWith('//') ||
    !isStringOrNull(scope_type) ||
    !isScopeId(scope_id) ||
    !isStringOrNull(workspace_role) ||
    !Array.isArray(permissions) ||
    !permissions.every((permission) => typeof permission === 'string')
  ) {
    return null;
  }

  return {
    id,
    dashboard,
    route,
    scope_type,
    scope_id,
    workspace_role,
    permissions: [...permissions],
  };
}

export function validateDashboardAccess(value: unknown): DashboardAccess | null {
  if (!isRecord(value) || value.version !== 1) return null;

  const rawDefaultId = value.default_entitlement_id;
  const rawEntitlements = value.entitlements;

  if (!Array.isArray(rawEntitlements)) {
    return null;
  }

  let defaultId: string | null;
  if (rawDefaultId === null) {
    defaultId = null;
  } else if (typeof rawDefaultId === 'string') {
    defaultId = rawDefaultId;
  } else {
    return null;
  }

  const entitlements: DashboardEntitlement[] = [];
  const ids = new Set<string>();

  for (const rawEntitlement of rawEntitlements) {
    const entitlement = validateEntitlement(rawEntitlement);

    if (!entitlement || ids.has(entitlement.id)) return null;

    ids.add(entitlement.id);
    entitlements.push(entitlement);
  }

  if (entitlements.length === 0) {
    if (defaultId !== null) return null;
  } else if (defaultId === null || !ids.has(defaultId)) {
    return null;
  }

  return {
    version: 1,
    default_entitlement_id: defaultId,
    entitlements,
  };
}

export function getDefaultEntitlement(
  value: unknown,
): DashboardEntitlement | null {
  const access = validateDashboardAccess(value);

  if (!access?.default_entitlement_id) return null;

  return (
    access.entitlements.find(
      (entitlement) => entitlement.id === access.default_entitlement_id,
    ) ?? null
  );
}

export function getDefaultDashboardRoute(value: unknown): string | null {
  return getDefaultEntitlement(value)?.route ?? null;
}

export function getEntitlementsForDashboard(
  value: unknown,
  dashboard: DashboardIdentifier,
): DashboardEntitlement[] {
  const access = validateDashboardAccess(value);

  return (
    access?.entitlements.filter(
      (entitlement) => entitlement.dashboard === dashboard,
    ) ?? []
  );
}

export function hasDashboardEntitlement(
  value: unknown,
  dashboard: DashboardIdentifier,
): boolean {
  return getEntitlementsForDashboard(value, dashboard).length > 0;
}

export function getAvailableWorkspaceOptions(
  value: unknown,
  dashboard?: DashboardIdentifier,
): WorkspaceOption[] {
  const access = validateDashboardAccess(value);

  if (!access) return [];

  return access.entitlements
    .filter(
      (entitlement) =>
        (!dashboard || entitlement.dashboard === dashboard) &&
        entitlement.scope_id !== null,
    )
    .map((entitlement) => ({
      entitlementId: entitlement.id,
      dashboard: entitlement.dashboard,
      route: entitlement.route,
      scopeType: entitlement.scope_type,
      scopeId: entitlement.scope_id,
      workspaceRole: entitlement.workspace_role,
      permissions: [...entitlement.permissions],
    }));
}

function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function normalizePathname(value: string) {
  return value.split(/[?#]/, 1)[0] || '/';
}

function isFanCapability(pathname: string) {
  return (
    matchesPath(pathname, '/dashboard/fan') ||
    matchesPath(pathname, '/dashboard/wallet') ||
    matchesPath(pathname, '/dashboard/memberships') ||
    matchesPath(pathname, '/dashboard/tickets') ||
    matchesPath(pathname, '/memberships') ||
    matchesPath(pathname, '/fan/polls') ||
    matchesPath(pathname, '/fan/mvp-voting') ||
    matchesPath(pathname, '/fantasy') ||
    pathname === '/payments' ||
    /^\/tickets\/[^/]+\/checkout(?:\/|$)/.test(pathname) ||
    matchesPath(pathname, '/tickets/payment')
  );
}

const NORMAL_CLUB_WORKSPACE_ROLES = new Set([
  'CLUB_ADMIN',
  'CLUB_OWNER',
  'CLUB_SPECIALIST_STAFF',
  'CONTENT_MANAGER',
  'MEMBERSHIP_MANAGER',
  'TEAM_MANAGER',
  'TICKETING_OFFICER',
  'STORE_MANAGER',
  'ANALYST',
]);

const NORMAL_CLUB_LEGACY_ALIASES = [
  {
    routes: ['/club-admin/content-manager', '/dashboard/content-manager'],
    roles: ['CONTENT_MANAGER'],
  },
  {
    routes: ['/club-admin/membership-manager', '/dashboard/membership-manager'],
    roles: ['MEMBERSHIP_MANAGER'],
  },
  {
    routes: ['/club-admin/team-manager', '/dashboard/team-manager'],
    roles: ['TEAM_MANAGER'],
  },
  {
    routes: ['/club-admin/store-manager', '/dashboard/store-manager'],
    roles: ['STORE_MANAGER'],
  },
  {
    routes: ['/club-admin/analyst', '/dashboard/analyst'],
    roles: ['ANALYST'],
  },
] as const;

function isCanonicalNormalClubEntitlement(
  entitlement: DashboardEntitlement,
) {
  return (
    entitlement.dashboard === 'CLUB_ADMIN' &&
    entitlement.route === '/dashboard/club-admin' &&
    entitlement.scope_type === 'CLUB' &&
    entitlement.scope_id !== null &&
    Boolean(
      entitlement.workspace_role &&
        NORMAL_CLUB_WORKSPACE_ROLES.has(entitlement.workspace_role),
    )
  );
}

function normalClubRouteMatches(
  entitlement: DashboardEntitlement,
  pathname: string,
) {
  if (!isCanonicalNormalClubEntitlement(entitlement)) return false;

  if (
    matchesPath(pathname, '/dashboard/club-admin') ||
    pathname === '/club-admin'
  ) {
    return true;
  }

  return NORMAL_CLUB_LEGACY_ALIASES.some(
    ({ routes, roles }) =>
      roles.some(
        (role) => role === entitlement.workspace_role,
      ) &&
      routes.some((route) => matchesPath(pathname, route)),
  );
}

function ticketingClubRouteMatches(
  entitlement: DashboardEntitlement,
  pathname: string,
) {
  if (
    entitlement.dashboard !== 'TICKETING_OFFICER' ||
    entitlement.route !== '/dashboard/ticketing-officer' ||
    entitlement.scope_type !== 'CLUB' ||
    entitlement.scope_id === null ||
    entitlement.workspace_role !== 'TICKETING_OFFICER'
  ) {
    return false;
  }

  return (
    matchesPath(pathname, '/dashboard/ticketing-officer') ||
    matchesPath(pathname, '/club-admin/ticketing-officer')
  );
}

function entitlementAuthorizesPath(
  entitlement: DashboardEntitlement,
  pathname: string,
) {
  if (
    entitlement.dashboard !== 'CLUB_ADMIN' &&
    entitlement.dashboard !== 'TICKETING_OFFICER' &&
    matchesPath(pathname, entitlement.route)
  ) {
    return true;
  }

  switch (entitlement.dashboard) {
    case 'FAN':
      return isFanCapability(pathname);
    case 'SUPER_ADMIN':
      return (
        matchesPath(pathname, '/super-admin') ||
        matchesPath(pathname, '/dashboard/super-admin')
      );
    case 'CLUB_ADMIN':
      return normalClubRouteMatches(entitlement, pathname);
    case 'TICKETING_OFFICER':
      return ticketingClubRouteMatches(entitlement, pathname);
  }

  return false;
}

export function canAccessDashboardRoute(
  value: unknown,
  route: string,
): boolean {
  const access = validateDashboardAccess(value);

  if (
    !access ||
    typeof route !== 'string' ||
    !route.startsWith('/') ||
    route.startsWith('//')
  ) {
    return false;
  }

  const pathname = normalizePathname(route);

  if (
    matchesPath(pathname, '/profile') ||
    pathname === '/edit-profile' ||
    pathname === '/support'
  ) {
    return true;
  }

  return access.entitlements.some((entitlement) =>
    entitlementAuthorizesPath(entitlement, pathname),
  );
}

export interface EntitlementCriteria {
  dashboard: DashboardIdentifier;
  workspaceRole?: string | readonly string[];
  permission?: string;
  scopeType?: string;
  requireScopeId?: boolean;
}

export function getMatchingEntitlements(
  value: unknown,
  criteria: EntitlementCriteria,
): DashboardEntitlement[] {
  const requestedRoles = criteria.workspaceRole;
  const roles =
    typeof requestedRoles === 'string'
      ? [requestedRoles.toUpperCase()]
      : requestedRoles?.map((role) => role.toUpperCase()) ?? null;

  return getEntitlementsForDashboard(value, criteria.dashboard).filter(
    (entitlement) => {
      if (
        roles &&
        (!entitlement.workspace_role ||
          !roles.includes(entitlement.workspace_role.toUpperCase()))
      ) {
        return false;
      }

      if (
        criteria.scopeType &&
        entitlement.scope_type !== criteria.scopeType
      ) {
        return false;
      }

      if (
        criteria.requireScopeId &&
        entitlement.scope_id === null
      ) {
        return false;
      }

      return (
        !criteria.permission ||
        entitlement.permissions.includes(criteria.permission)
      );
    },
  );
}
