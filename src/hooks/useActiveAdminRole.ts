import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore.ts';
import { getEntitlementsForDashboard } from '../utils/dashboardAccess.ts';
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
}

// Picks which admin role the shared shell renders for right now, and lets
// an admin holding more than one specialist entitlement switch between
// them (the workbook's "Active Permission Group switcher").
//
// Frontend-only affordance, not a security control: while the backend's
// dashboard_access payload for these merged/rebuilt admin roles is still
// catching up, this defaults to full Super Admin visibility whenever no
// matching entitlement is present, so the shell stays fully navigable for
// review and demo purposes. Once real entitlements arrive it reflects them.
export function useActiveAdminRole(): UseActiveAdminRole {
  const dashboardAccess = useAuthStore((state) => state.user?.dashboard_access);
  const [manualRole, setManualRole] = useState<DashboardIdentifier | null>(null);

  const availableRoles = useMemo(() => {
    const found = ADMIN_ROLES.filter(
      (role) => getEntitlementsForDashboard(dashboardAccess, role).length > 0,
    );
    return found.length > 0 ? found : (['SUPER_ADMIN'] as DashboardIdentifier[]);
  }, [dashboardAccess]);

  const activeRole =
    (manualRole && availableRoles.includes(manualRole) ? manualRole : null) ??
    (availableRoles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : availableRoles[0]);

  return {
    activeRole,
    availableRoles,
    switchRole: setManualRole,
  };
}
