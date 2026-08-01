export const DASHBOARD_IDENTIFIERS = [
  'FAN',
  'CLUB_ADMIN',
  'TICKETING_OFFICER',
  'GENERAL_ADMIN',
  'SPORTS_DATA_STATISTICS_ADMIN',
  'MARKET_OPERATIONS_ADMIN',
  'MARKET_APPROVAL_ADMIN',
  'RESULT_VERIFICATION_ADMIN',
  'COMPLIANCE_ADMIN',
  'FINANCE_ADMIN',
  'CUSTOMER_SUPPORT_ADMIN',
  'SUPER_ADMIN',
] as const;

export type DashboardIdentifier = (typeof DASHBOARD_IDENTIFIERS)[number];

export interface DashboardEntitlement {
  id: string;
  dashboard: DashboardIdentifier;
  route: string;
  scope_type: string | null;
  scope_id: string | number | null;
  workspace_role: string | null;
  permissions: string[];
}

export interface DashboardAccess {
  version: 1;
  default_entitlement_id: string | null;
  entitlements: DashboardEntitlement[];
}

export interface AuthenticatedUser {
  id?: string | number;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  roles?: string[];
  dashboard_access?: DashboardAccess | null;
  [key: string]: unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isDashboardIdentifier(
  value: unknown,
): value is DashboardIdentifier {
  return (
    typeof value === 'string' &&
    DASHBOARD_IDENTIFIERS.includes(value as DashboardIdentifier)
  );
}

export function isAuthenticatedUser(
  value: unknown,
): value is AuthenticatedUser {
  return isRecord(value);
}
