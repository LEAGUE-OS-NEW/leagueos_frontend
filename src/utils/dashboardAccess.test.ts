import { describe, expect, it } from 'vitest';

import {
  canAccessDashboardRoute,
  getDefaultDashboardRoute,
  getDefaultEntitlement,
  hasDashboardEntitlement,
  validateDashboardAccess,
} from './dashboardAccess';

const fanEntitlement = {
  id: 'fan',
  dashboard: 'FAN',
  route: '/dashboard/fan',
  scope_type: 'ACCOUNT',
  scope_id: 14,
  workspace_role: null,
  permissions: [],
};

function clubEntitlement(
  workspaceRole: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `club-${workspaceRole.toLowerCase()}`,
    dashboard: 'CLUB_ADMIN',
    route: '/dashboard/club-admin',
    scope_type: 'CLUB',
    scope_id: 7,
    workspace_role: workspaceRole,
    permissions: ['dashboard.club_admin'],
    ...overrides,
  };
}

describe('dashboard access contract', () => {
  it('validates the numeric backend version and resolves an explicit Fan default', () => {
    const access = validateDashboardAccess({
      version: 1,
      default_entitlement_id: 'fan',
      entitlements: [fanEntitlement],
    });

    expect(access).not.toBeNull();
    expect(getDefaultEntitlement(access)).toEqual(fanEntitlement);
    expect(getDefaultDashboardRoute(access)).toBe('/dashboard/fan');
    expect(hasDashboardEntitlement(access, 'FAN')).toBe(true);
  });

  it.each([
    {
      version: '1',
      default_entitlement_id: 'fan',
      entitlements: [fanEntitlement],
    },
    {
      version: 1,
      default_entitlement_id: 'missing',
      entitlements: [fanEntitlement],
    },
    {
      version: 1,
      default_entitlement_id: null,
      entitlements: [fanEntitlement],
    },
    {
      version: 1,
      default_entitlement_id: 'fan',
      entitlements: [
        fanEntitlement,
        { ...fanEntitlement, route: '/dashboard/another-fan' },
      ],
    },
    {
      version: 1,
      default_entitlement_id: 'fan',
      entitlements: [{ ...fanEntitlement, route: 'dashboard/fan' }],
    },
  ])('rejects malformed or unsupported contracts', (value) => {
    expect(validateDashboardAccess(value)).toBeNull();
    expect(getDefaultDashboardRoute(value)).toBeNull();
  });

  it('accepts an explicit empty access contract without manufacturing Fan', () => {
    const access = validateDashboardAccess({
      version: 1,
      default_entitlement_id: null,
      entitlements: [],
    });

    expect(access).not.toBeNull();
    expect(getDefaultEntitlement(access)).toBeNull();
    expect(getDefaultDashboardRoute(access)).toBeNull();
    expect(hasDashboardEntitlement(access, 'FAN')).toBe(false);
  });

  it.each([
    'CLUB_ADMIN',
    'TEAM_MANAGER',
  ])(
    'keeps the %s workspace role on the shared Club route',
    (workspaceRole) => {
      const entitlement = clubEntitlement(workspaceRole);
      const access = {
        version: 1,
        default_entitlement_id: entitlement.id,
        entitlements: [entitlement],
      };

      expect(getDefaultDashboardRoute(access)).toBe(
        '/dashboard/club-admin',
      );
      expect(
        canAccessDashboardRoute(access, '/dashboard/club-admin/teams'),
      ).toBe(true);
    },
  );

  it('keeps Club Ticketing on its canonical shared-shell route', () => {
    const ticketing = {
      id: 'club-ticketing-7',
      dashboard: 'TICKETING_OFFICER',
      route: '/dashboard/ticketing-officer',
      scope_type: 'CLUB',
      scope_id: 7,
      workspace_role: 'TICKETING_OFFICER',
      permissions: ['dashboard.ticketing_officer'],
    };
    const access = {
      version: 1,
      default_entitlement_id: ticketing.id,
      entitlements: [ticketing],
    };

    expect(getDefaultDashboardRoute(access)).toBe(
      '/dashboard/ticketing-officer',
    );
    expect(
      canAccessDashboardRoute(
        access,
        '/dashboard/ticketing-officer/scanner',
      ),
    ).toBe(true);
    expect(
      canAccessDashboardRoute(access, '/dashboard/club-admin'),
    ).toBe(false);
  });

  it.each([
    ['TEAM_MANAGER', '/club-admin/team-manager'],
    ['TEAM_MANAGER', '/dashboard/team-manager'],
  ])(
    'authorizes the %s legacy alias only for its matching entitlement',
    (workspaceRole, alias) => {
      const matching = clubEntitlement(workspaceRole);
      const different = clubEntitlement('CLUB_ADMIN');

      expect(
        canAccessDashboardRoute(
          {
            version: 1,
            default_entitlement_id: matching.id,
            entitlements: [matching],
          },
          alias,
        ),
      ).toBe(true);
      expect(
        canAccessDashboardRoute(
          {
            version: 1,
            default_entitlement_id: different.id,
            entitlements: [different],
          },
          alias,
        ),
      ).toBe(false);
    },
  );

  it('does not let a normal Club entitlement authorize the ticketing alias', () => {
    const normalClub = clubEntitlement('CHAIRMAN');
    const ticketing = {
      id: 'club-ticketing-7',
      dashboard: 'TICKETING_OFFICER',
      route: '/dashboard/ticketing-officer',
      scope_type: 'CLUB',
      scope_id: 7,
      workspace_role: 'TICKETING_OFFICER',
      permissions: ['dashboard.ticketing_officer'],
    };

    expect(
      canAccessDashboardRoute(
        {
          version: 1,
          default_entitlement_id: normalClub.id,
          entitlements: [normalClub],
        },
        '/club-admin/ticketing-officer',
      ),
    ).toBe(false);
    expect(
      canAccessDashboardRoute(
        {
          version: 1,
          default_entitlement_id: ticketing.id,
          entitlements: [ticketing],
        },
        '/club-admin/ticketing-officer',
      ),
    ).toBe(true);
  });

  it.each([
    { scope_type: 'LEAGUE' },
    { scope_id: null },
    { route: '/club-admin/chairman' },
    { workspace_role: null },
  ])('rejects malformed Club capability routing: %j', (overrides) => {
    const malformed = clubEntitlement('CHAIRMAN', overrides);

    expect(
      canAccessDashboardRoute(
        {
          version: 1,
          default_entitlement_id: malformed.id,
          entitlements: [malformed],
        },
        '/dashboard/club-admin',
      ),
    ).toBe(false);
  });
});