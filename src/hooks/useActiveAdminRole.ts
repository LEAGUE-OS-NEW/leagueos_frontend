import { useEffect, useState } from 'react';
import { fetchMyAdminAccess } from '../services/adminUsersService.ts';
import type { DashboardIdentifier } from '../types/dashboardAccess.ts';

export const ADMIN_ROLES: DashboardIdentifier[] = [
  'SUPER_ADMIN',
  'SPORTS_DATA_STATISTICS_ADMIN',
  'MARKET_OPERATIONS_ADMIN',
  'RESULT_VERIFICATION_ADMIN',
  'COMPLIANCE_ADMIN',
  'FINANCE_ADMIN',
  'CUSTOMER_SUPPORT_ADMIN',
];

interface UseActiveAdminRole {
  activeRole: DashboardIdentifier;
  availableRoles: DashboardIdentifier[];
  switchRole: (role: DashboardIdentifier) => void;
  isLoading: boolean;
}

// Picks which admin role the shared shell renders for right now, and lets
// an admin holding more than one specialist role switch between them (the
// workbook's "Active Permission Group switcher").
//
// Backed by the real GET /admin/me/ (via fetchMyAdminAccess) — the
// logged-in admin's actual roles, not the dashboard_access entitlements
// captured once at login, which can drift from what the backend currently
// grants this account. AdminRoute.tsx remains the real security gate for
// whether this user belongs in the admin shell at all; this hook only
// decides which of possibly-several specialist views to show once they're
// already in.
export function useActiveAdminRole(): UseActiveAdminRole {
  const [availableRoles, setAvailableRoles] = useState<DashboardIdentifier[]>(['SUPER_ADMIN']);
  const [manualRole, setManualRole] = useState<DashboardIdentifier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMyAdminAccess()
      .then((access) => {
        if (cancelled) return;
        // access.roles is the real, current set — replaces the initial
        // ['SUPER_ADMIN'] placeholder even when it turns out to be a
        // single, non-Super-Admin specialist role.
        if (access.roles.length > 0) setAvailableRoles(access.roles);
      })
      .catch(() => {
        // Real fetch failure — leave the placeholder rather than guess.
        // AdminRoute already gated entry to this shell, so this doesn't
        // grant access; it only affects which nav items render.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRole =
    (manualRole && availableRoles.includes(manualRole) ? manualRole : null) ??
    (availableRoles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : availableRoles[0]);

  return {
    activeRole,
    availableRoles,
    switchRole: setManualRole,
    isLoading,
  };
}
