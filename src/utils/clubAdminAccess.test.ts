import { describe, expect, it } from 'vitest';
import type {
  AuthenticatedUser,
  DashboardEntitlement,
} from '../types/dashboardAccess';
import {
  canAccessClubSection,
  getSelectedClubId,
} from './clubAdminAccess';

const entitlement: DashboardEntitlement = {
  id: 'club-admin',
  dashboard: 'CLUB_ADMIN',
  route: '/club-admin',
  scope_type: null,
  scope_id: null,
  workspace_role: 'Club Admin',
  permissions: [],
};

describe('clubAdminAccess', () => {
  it('treats human-formatted club admin roles as full club admins', () => {
    expect(
      canAccessClubSection(
        entitlement,
        'club.profile.view',
      ),
    ).toBe(true);
  });

  it('falls back to user.club.id when the entitlement has no scope id', () => {
    const user: AuthenticatedUser = {
      club: {
        id: 'club-uuid-1',
        name: 'Mess FC',
      },
    };

    expect(
      getSelectedClubId(
        entitlement,
        user,
      ),
    ).toBe('club-uuid-1');
  });
});
