import {
  DASHBOARD_IDENTIFIERS,
  type AuthenticatedUser,
  type DashboardIdentifier,
} from '../types/dashboardAccess.js';

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

const LEGACY_ROLE_ALIASES: Record<string, DashboardIdentifier> = {
  ADMIN: 'GENERAL_ADMIN',
  CLUB_OWNER: 'CLUB_ADMIN',
  CLUB_SPECIALIST_STAFF: 'CLUB_ADMIN',
  CONTENT_MANAGER: 'CLUB_ADMIN',
  MEMBERSHIP_MANAGER: 'CLUB_ADMIN',
  TEAM_MANAGER: 'CLUB_ADMIN',
  STORE_MANAGER: 'CLUB_ADMIN',
  ANALYST: 'CLUB_ADMIN',
};

const DASHBOARD_IDENTIFIER_SET = new Set<string>(DASHBOARD_IDENTIFIERS);

function normalizeRole(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[\s-]+/g, '_')
    : '';
}

function getDashboardIdentifierForRole(role: unknown): DashboardIdentifier | null {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) return null;

  if (DASHBOARD_IDENTIFIER_SET.has(normalizedRole)) {
    return normalizedRole as DashboardIdentifier;
  }

  return LEGACY_ROLE_ALIASES[normalizedRole] ?? null;
}

function getUserRoles(user: AuthenticatedUser | null | undefined) {
  if (!user) return [];

  return [
    user.role,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];
}

export function getDefaultDashboardRoute(
  user: AuthenticatedUser | null | undefined,
): string | null {
  const dashboard = getUserRoles(user)
    .map(getDashboardIdentifierForRole)
    .find((value): value is DashboardIdentifier => value !== null);

  return dashboard ? ROLE_DASHBOARD_ROUTES[dashboard] : null;
}
