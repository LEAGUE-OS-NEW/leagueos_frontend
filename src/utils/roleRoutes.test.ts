import { describe, it, expect } from 'vitest';
import { getDefaultDashboardRoute } from './roleRoutes.ts';
import type { AuthenticatedUser } from '../types/dashboardAccess.ts';

const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
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

const LEGACY_ROLE_ALIASES: Record<string, string> = {
  ADMIN: 'GENERAL_ADMIN',
  CLUB_OWNER: 'CLUB_ADMIN',
  CLUB_SPECIALIST_STAFF: 'CLUB_ADMIN',
  CONTENT_MANAGER: 'CLUB_ADMIN',
  MEMBERSHIP_MANAGER: 'CLUB_ADMIN',
  TEAM_MANAGER: 'CLUB_ADMIN',
  STORE_MANAGER: 'CLUB_ADMIN',
  ANALYST: 'CLUB_ADMIN',
};

function user(overrides: Partial<AuthenticatedUser>): AuthenticatedUser {
  return { email: 'person@example.com', ...overrides };
}

describe('getDefaultDashboardRoute', () => {
  it('returns null for a null or undefined user', () => {
    expect(getDefaultDashboardRoute(null)).toBeNull();
    expect(getDefaultDashboardRoute(undefined)).toBeNull();
  });

  it('returns null when the user has no role and no roles array', () => {
    expect(getDefaultDashboardRoute(user({}))).toBeNull();
  });

  it('returns null for a completely unrecognized role', () => {
    expect(getDefaultDashboardRoute(user({ role: 'MASCOT' }))).toBeNull();
  });

  it.each(Object.entries(ROLE_DASHBOARD_ROUTES))(
    'maps role %s to its dashboard route %s',
    (role, route) => {
      expect(getDefaultDashboardRoute(user({ role }))).toBe(route);
    },
  );

  it.each(Object.entries(LEGACY_ROLE_ALIASES))(
    'maps legacy alias %s to the %s dashboard route',
    (alias, canonicalRole) => {
      expect(getDefaultDashboardRoute(user({ role: alias }))).toBe(
        ROLE_DASHBOARD_ROUTES[canonicalRole],
      );
    },
  );

  it('normalizes case before matching', () => {
    expect(getDefaultDashboardRoute(user({ role: 'fan' }))).toBe('/dashboard/fan');
    expect(getDefaultDashboardRoute(user({ role: 'General_Admin' }))).toBe(
      '/dashboard/general-admin',
    );
  });

  it('normalizes surrounding whitespace and internal spaces/dashes before matching', () => {
    expect(getDefaultDashboardRoute(user({ role: '  fan  ' }))).toBe('/dashboard/fan');
    expect(getDefaultDashboardRoute(user({ role: 'general-admin' }))).toBe(
      '/dashboard/general-admin',
    );
    expect(getDefaultDashboardRoute(user({ role: 'general admin' }))).toBe(
      '/dashboard/general-admin',
    );
  });

  it('falls back to the roles array when role is missing', () => {
    expect(
      getDefaultDashboardRoute(user({ roles: ['GENERAL_ADMIN'] })),
    ).toBe('/dashboard/general-admin');
  });

  it('falls back to the roles array when role is unrecognized', () => {
    expect(
      getDefaultDashboardRoute(
        user({ role: 'MASCOT', roles: ['TICKETING_OFFICER'] }),
      ),
    ).toBe('/dashboard/ticketing-officer');
  });

  it('takes the first resolvable entry rather than prioritizing admin roles', () => {
    // getUserRoles puts `role` ahead of `roles`, and getDefaultDashboardRoute
    // takes the first match — it does not prefer non-fan/admin roles over
    // fan. This test documents that current behavior explicitly so a future
    // change to the priority logic doesn't slip by silently.
    expect(
      getDefaultDashboardRoute(
        user({ role: 'FAN', roles: ['FAN', 'GENERAL_ADMIN'] }),
      ),
    ).toBe('/dashboard/fan');
  });

  it('checks entries in the roles array in order when role does not resolve', () => {
    expect(
      getDefaultDashboardRoute(
        user({ role: 'MASCOT', roles: ['ALSO_UNKNOWN', 'FINANCE_ADMIN', 'SUPER_ADMIN'] }),
      ),
    ).toBe('/dashboard/finance');
  });

  it('safely ignores non-string entries in the roles array', () => {
    expect(
      getDefaultDashboardRoute(
        user({
          role: undefined,
          // @ts-expect-error deliberately malformed input to prove this doesn't throw
          roles: [123, null, undefined, 'FAN'],
        }),
      ),
    ).toBe('/dashboard/fan');
  });

  it('returns null when roles is present but empty and role is missing', () => {
    expect(getDefaultDashboardRoute(user({ roles: [] }))).toBeNull();
  });
});