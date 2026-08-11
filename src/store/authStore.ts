import { create } from 'zustand';
import {
  type DashboardAccess,
  type AuthenticatedUser,
  isAuthenticatedUser,
  isDashboardIdentifier,
} from '../types/dashboardAccess.js';
import { validateDashboardAccess } from '../utils/dashboardAccess.ts';
import { getDefaultDashboardRoute as getRoleDefaultDashboardRoute } from '../utils/roleRoutes.ts';
import { useClubWorkspaceStore } from './clubWorkspaceStore.ts';
import {
  clearAuthStorage,
  getRefreshToken,
  getStoredUser,
  getToken,
  setRefreshToken,
  setStoredUser,
  setToken,
} from '../utils/tokenManager.ts';

const CLUB_ADMIN_PERMISSIONS = [
  'dashboard.club_admin',
  'dashboard.me',
  'club.profile.view',
  'club.profile.edit',
  'club.squad.manage',
  'club.members.manage',
  'club.ticketing.manage',
  'club.ticketing.validate',
  'club.events.manage',
  'club.matches.manage',
  'club.reports.view',
  'club.finance.view',
  'club.finance.manage',
  'club.admin.manage',
  'club.settings.manage',
  'club.sponsorship.view',
  'club.sponsorship.manage',
  'club.training.manage',
  'club.communications.manage',
];

const CLUB_WORKSPACE_ROLES = new Set([
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

function normalizeRole(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[\s-]+/g, '_')
    : '';
}

function getLegacyClubId(user: AuthenticatedUser) {
  const club = user.club;

  if (
    club &&
    typeof club === 'object' &&
    'id' in club &&
    (typeof club.id === 'number' || typeof club.id === 'string') &&
    String(club.id).trim()
  ) {
    return club.id;
  }

  return 1;
}

function buildLegacyDashboardAccess(user: AuthenticatedUser): DashboardAccess | null {
  const role = normalizeRole(user.role);

  if (!CLUB_WORKSPACE_ROLES.has(role)) {
    return null;
  }

  return {
    version: 1,
    default_entitlement_id: 'legacy-club-admin',
    entitlements: [
      {
        id: 'legacy-club-admin',
        dashboard: 'CLUB_ADMIN',
        route: '/dashboard/club-admin',
        scope_type: 'CLUB',
        scope_id: getLegacyClubId(user),
        workspace_role: role || 'CLUB_ADMIN',
        permissions: CLUB_ADMIN_PERMISSIONS,
      },
    ],
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];
}

// user.role is often absent on the current backend payload — it sends
// roles: ["Fan"] instead — so fall back to the first normalizable entry
// in that array.
function getUserRoleFallback(user: AuthenticatedUser): string {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return (
    roles.map(normalizeRole).find((normalized) => isDashboardIdentifier(normalized)) ?? ''
  );
}

// TEMPORARY SHIM: covers any role the backend sends in its legacy shape
// (single `role`/`roles` array, no proper dashboard_access contract) that
// isn't a club workspace role — FAN today, but also catches any admin
// role that slips through with a malformed contract. Reuses
// roleRoutes.ts's existing role→route map instead of duplicating it.
// Remove once the backend ships the real dashboard_access contract for
// every role (see dashboardAccess.test.ts for the target shape).
function buildGenericLegacyDashboardAccess(user: AuthenticatedUser): DashboardAccess | null {
  const normalizedRole = normalizeRole(user.role);
  const role = isDashboardIdentifier(normalizedRole)
    ? normalizedRole
    : getUserRoleFallback(user);

  if (!role || !isDashboardIdentifier(role)) {
    return null;
  }

  const route = getRoleDefaultDashboardRoute(user);

  if (!route) {
    return null;
  }

  const id = `legacy-${role.toLowerCase()}`;

  return {
    version: 1,
    default_entitlement_id: id,
    entitlements: [
      {
        id,
        dashboard: role,
        route,
        scope_type: null,
        scope_id: null,
        workspace_role: null,
        permissions: toStringArray(user.permissions),
      },
    ],
  };
}

export type AuthUser = AuthenticatedUser | null;
export type AccessStatus =
  | 'unauthenticated'
  | 'loading'
  | 'ready'
  | 'unavailable';

type AuthStore = {
  user: AuthUser;
  accessToken: string | null;
  refreshToken: string | null;
  requiresEmailVerification: boolean;
  accessStatus: AccessStatus;
  setAuth: (payload: {
    user: unknown;
    access: string;
    refresh: string;
    requiresEmailVerification: boolean;
  }) => void;
  setHydratedUser: (user: unknown) => void;
  setAccessUnavailable: () => void;
  updateTokens: (access: string, refresh?: string) => void;
  clearAuth: () => void;
};

function sanitizeUser(value: unknown) {
  if (!isAuthenticatedUser(value)) {
    return {
      user: null,
      hasValidAccess: false,
    };
  }

  const dashboardAccess =
    validateDashboardAccess(value.dashboard_access) ??
    buildLegacyDashboardAccess(value) ??
    buildGenericLegacyDashboardAccess(value);

  return {
    user: {
      ...value,
      dashboard_access: dashboardAccess,
    },
    hasValidAccess: dashboardAccess !== null,
  };
}

function getAccessStatus(
  hasValidAccess: boolean,
  user: AuthUser,
): Exclude<AccessStatus, 'unauthenticated' | 'loading'> {
  if (
    hasValidAccess &&
    user?.dashboard_access &&
    user.dashboard_access.entitlements.length > 0
  ) {
    return 'ready';
  }

  return 'unavailable';
}

const initialAccessToken = getToken();
const initialRefreshToken = getRefreshToken();
const initialUser = sanitizeUser(getStoredUser<unknown>());

export const useAuthStore = create<AuthStore>()((set) => ({
  user: initialAccessToken ? initialUser.user : null,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  requiresEmailVerification: false,
  accessStatus: !initialAccessToken
    ? 'unauthenticated'
    : initialUser.hasValidAccess
      ? getAccessStatus(true, initialUser.user)
      : 'loading',

  setAuth: ({ user, access, refresh, requiresEmailVerification }) => {
    const sanitized = sanitizeUser(user);

    useClubWorkspaceStore.getState().clearSelection();
    setToken(access);
    setRefreshToken(refresh);
    setStoredUser(sanitized.user);

    set({
      user: sanitized.user,
      accessToken: access,
      refreshToken: refresh,
      requiresEmailVerification,
      accessStatus: getAccessStatus(
        sanitized.hasValidAccess,
        sanitized.user,
      ),
    });
  },

  setHydratedUser: (user) => {
    const sanitized = sanitizeUser(user);

    setStoredUser(sanitized.user);
    set({
      user: sanitized.user,
      accessStatus: getAccessStatus(
        sanitized.hasValidAccess,
        sanitized.user,
      ),
    });
  },

  setAccessUnavailable: () => {
    set({ accessStatus: 'unavailable' });
  },

  updateTokens: (access, refresh) => {
    setToken(access);
    if (refresh) setRefreshToken(refresh);
    set((state) => ({ accessToken: access, refreshToken: refresh ?? state.refreshToken }));
  },

  clearAuth: () => {
    useClubWorkspaceStore.getState().clearSelection();
    clearAuthStorage();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      requiresEmailVerification: false,
      accessStatus: 'unauthenticated',
    });
  },
}));