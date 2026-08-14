import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';

describe('specialist admin legacy auth hydration', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it.each([
    [
      'Market Operations & Approval Admin',
      'MARKET_OPERATIONS_ADMIN',
    ],
    [
      'Sports Data & Statistics Admin',
      'SPORTS_DATA_STATISTICS_ADMIN',
    ],
    [
      'Result Verification Admin',
      'RESULT_VERIFICATION_ADMIN',
    ],
    [
      'Compliance Admin',
      'COMPLIANCE_ADMIN',
    ],
  ])(
    'converts backend display role %s into dashboard entitlement %s',
    (roleName, expectedDashboard) => {
      useAuthStore.getState().setAuth({
        user: {
          id: 'review-user',
          email: 'review@leagueos.test',
          roles: [roleName],
          permissions: ['admin.dashboard.view'],
          // Current backend compatibility shape.
          dashboard_access: {
            entitlements: [
              {
                role: roleName,
                dashboard_url: '/dashboard/admin',
              },
            ],
            default_entitlement: roleName,
            default_route: '/dashboard/admin',
          },
        },
        access: 'test-access',
        refresh: 'test-refresh',
        requiresEmailVerification: false,
      });

      const state = useAuthStore.getState();

      expect(state.accessStatus).toBe('ready');
      expect(state.user).not.toBeNull();

      const entitlement = state.user?.dashboard_access?.entitlements[0];

      expect(entitlement?.dashboard).toBe(expectedDashboard);
      expect(entitlement?.route).toBe('/dashboard/admin');
    },
  );
});
