import {
  DASHBOARD_IDENTIFIERS,
  type AuthenticatedUser,
  type DashboardIdentifier,
} from '../types/dashboardAccess.js';

// Every admin-side identifier lands on the shared, permission-aware admin
// shell at /dashboard/admin — the Dashboard page itself is role-aware and
// shows a scoped work-queue per role, so there's no need for each specialist
// role to have its own distinct landing route (see src/config/adminNav.ts).
const ROLE_DASHBOARD_ROUTES: Record<DashboardIdentifier, string> = {
  FAN: '/dashboard/fan',
  CLUB_ADMIN: '/dashboard/club-admin',
  TICKETING_OFFICER: '/dashboard/ticketing-officer',
  SPORTS_DATA_STATISTICS_ADMIN: '/dashboard/admin',
  MARKET_OPERATIONS_ADMIN: '/dashboard/admin',
  RESULT_VERIFICATION_ADMIN: '/dashboard/admin',
  COMPLIANCE_ADMIN: '/dashboard/admin',
  FINANCE_ADMIN: '/dashboard/admin',
  CUSTOMER_SUPPORT_ADMIN: '/dashboard/admin',
  SUPER_ADMIN: '/dashboard/admin',
};

const LEGACY_ROLE_ALIASES: Record<string, DashboardIdentifier> = {
  // No successor for the old GENERAL_ADMIN role specifically — a legacy
  // "ADMIN" string now falls back to full Super Admin visibility rather
  // than a dead-end, since General Admin no longer exists as its own tier.
  ADMIN: 'SUPER_ADMIN',
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
