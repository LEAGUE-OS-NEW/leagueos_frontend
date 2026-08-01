import {
  DASHBOARD_IDENTIFIERS,
  type AuthenticatedUser,
  type DashboardIdentifier,
} from '../types/dashboardAccess.js';
import {
  canAccessDashboardRoute,
  validateDashboardAccess,
} from './dashboardAccess.js';


const ROLE_DASHBOARD_ROUTES: Record<DashboardIdentifier, string> = {
  FAN: '/dashboard/fan',
  CLUB_ADMIN: '/dashboard/club-admin',
  TICKETING_OFFICER: '/dashboard/ticketing-officer',
  GENERAL_ADMIN: '/dashboard/general-admin',
  SPORTS_DATA_STATISTICS_ADMIN: '/dashboard/sports-data-statistics',
  MARKET_OPERATIONS_ADMIN: '/dashboard/market-operations',
  MARKET_APPROVAL_ADMIN: '/dashboard/market-approval',
  RESULT_VERIFICATION_ADMIN: '/dashboard/result-verification',
  COMPLIANCE_ADMIN: '/dashboard/compliance',
  FINANCE_ADMIN: '/dashboard/finance',
  CUSTOMER_SUPPORT_ADMIN: '/dashboard/customer-support',
  SUPER_ADMIN: '/dashboard/super-admin',
};


const OFFICIAL_DASHBOARD_ROUTE = '/dashboard/referee';
const LEAGUE_ADMIN_DASHBOARD_ROUTE = '/dashboard/league-admin';

const SPECIAL_CASE_ROUTES: Record<string, string> = {
  REFEREE: OFFICIAL_DASHBOARD_ROUTE,
  MATCH_OFFICIAL: OFFICIAL_DASHBOARD_ROUTE,
  LEAGUE_ADMIN: LEAGUE_ADMIN_DASHBOARD_ROUTE,
};


const LEGACY_ROLE_ALIASES: Record<string, DashboardIdentifier> = {
  ADMIN: 'GENERAL_ADMIN',
  CLUB_OWNER: 'CLUB_ADMIN',
  CLUB_SPECIALIST_STAFF: 'CLUB_ADMIN',
  CONTENT_MANAGER: 'CLUB_ADMIN',
  MEMBERSHIP_MANAGER: 'CLUB_ADMIN',
  TEAM_MANAGER: 'CLUB_ADMIN',
  STORE_MANAGER: 'CLUB_ADMIN',
  ANALYST: 'CLUB_ADMIN',
  CHAIRMAN: 'CLUB_ADMIN',
  TREASURER: 'CLUB_ADMIN',
  CUSTOM: 'CLUB_ADMIN',
  CUSTOM_ADMIN: 'CLUB_ADMIN',
};


const RESTRICTED_DASHBOARD_IDENTIFIERS = new Set<DashboardIdentifier>([
  'CLUB_ADMIN',
  'TICKETING_OFFICER',
]);

const DASHBOARD_IDENTIFIER_SET = new Set<string>(DASHBOARD_IDENTIFIERS);

export function normalizeRole(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[\s-]+/g, '_')
    : '';
}

function getDashboardIdentifierForRole(
  normalizedRole: string,
): DashboardIdentifier | null {
  if (!normalizedRole) return null;

  if (DASHBOARD_IDENTIFIER_SET.has(normalizedRole)) {
    return normalizedRole as DashboardIdentifier;
  }

  return LEGACY_ROLE_ALIASES[normalizedRole] ?? null;
}

function resolveRouteForNormalizedRole(normalizedRole: string): string | null {
  if (!normalizedRole) return null;

  if (SPECIAL_CASE_ROUTES[normalizedRole]) {
    return SPECIAL_CASE_ROUTES[normalizedRole];
  }

  const dashboard = getDashboardIdentifierForRole(normalizedRole);
  return dashboard ? ROLE_DASHBOARD_ROUTES[dashboard] : null;
}

type RoleInput =
  | AuthenticatedUser
  | Record<string, unknown>
  | string
  | string[]
  | null
  | undefined;

function getRawRoles(input: RoleInput): unknown[] {
  if (input === null || input === undefined) return [];
  if (typeof input === 'string') return [input];
  if (Array.isArray(input)) return input;

  if (typeof input === 'object') {
    const record = input as { role?: unknown; roles?: unknown };
    const roles: unknown[] = [];

    if (record.role !== undefined) roles.push(record.role);
    if (Array.isArray(record.roles)) roles.push(...record.roles);

    return roles;
  }

  return [];
}

function getNormalizedRoles(input: RoleInput): string[] {
  return getRawRoles(input)
    .map(normalizeRole)
    .filter((role): role is string => role.length > 0);
}



export function getDefaultDashboardRoute(input: RoleInput): string | null {
  const normalizedRoles = getNormalizedRoles(input);

  let fanRoute: string | null = null;
  let priorityRoute: string | null = null;

  for (const role of normalizedRoles) {
    const route = resolveRouteForNormalizedRole(role);
    if (!route) continue;

    if (role === 'FAN') {
      fanRoute = fanRoute ?? route;
    } else {
      priorityRoute = priorityRoute ?? route;
    }
  }

  return priorityRoute ?? fanRoute ?? null;
}


 export function canRoleAccessRedirect(
  input: RoleInput,
  route: string,
): boolean {
  const hasDashboardAccessContract =
    typeof input === 'object' &&
    input !== null &&
    !Array.isArray(input) &&
    Object.prototype.hasOwnProperty.call(input, 'dashboard_access');

  if (hasDashboardAccessContract) {
    const dashboardAccess = validateDashboardAccess(
      (input as { dashboard_access?: unknown }).dashboard_access,
    );

    return canAccessDashboardRoute(dashboardAccess, route);
  }

  const normalizedRoles = getNormalizedRoles(input);

  return normalizedRoles.some((role) => {
    const dashboard = getDashboardIdentifierForRole(role);

    if (dashboard && RESTRICTED_DASHBOARD_IDENTIFIERS.has(dashboard)) {
      return false;
    }

    const resolvedRoute = resolveRouteForNormalizedRole(role);
    return resolvedRoute !== null && resolvedRoute === route;
  });
}