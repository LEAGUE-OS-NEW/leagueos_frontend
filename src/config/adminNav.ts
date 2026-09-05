// Single source of truth for the shared admin shell's sidebar. Super Admin
// always sees every item; every other role sees only items that list it in
// allowedRoles. An empty allowedRoles list means "Super Admin only" (Users,
// Roles & Permissions, Reports, System Settings — platform-wide concerns,
// not any one specialist role's job).
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiLock,
  FiSettings,
  FiShoppingBag,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { DashboardIdentifier } from '../types/dashboardAccess';

export interface AdminNavItem {
  label: string;
  route: string;
  icon: IconType;
  allowedRoles: DashboardIdentifier[];
}

export const ALL_SPECIALIST_ROLES: DashboardIdentifier[] = [
  'SPORTS_DATA_STATISTICS_ADMIN',
  'MARKET_OPERATIONS_ADMIN',
  'RESULT_VERIFICATION_ADMIN',
  'COMPLIANCE_ADMIN',
  'FINANCE_ADMIN',
  'CUSTOMER_SUPPORT_ADMIN',
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', route: '/dashboard/admin', icon: FiGrid, allowedRoles: ALL_SPECIALIST_ROLES },
  { label: 'Markets', route: '/dashboard/admin/markets', icon: FiTrendingUp, allowedRoles: ['MARKET_OPERATIONS_ADMIN'] },
  { label: 'Sports Data', route: '/dashboard/admin/sports-data', icon: FiActivity, allowedRoles: ['SPORTS_DATA_STATISTICS_ADMIN'] },
  { label: 'Fixtures', route: '/dashboard/admin/fixtures', icon: FiCalendar, allowedRoles: ['SPORTS_DATA_STATISTICS_ADMIN'] },
  { label: 'Fantasy', route: '/dashboard/admin/fantasy', icon: FiAward, allowedRoles: ['SPORTS_DATA_STATISTICS_ADMIN'] },
  { label: 'News', route: '/dashboard/admin/news', icon: FiFileText, allowedRoles: ['SPORTS_DATA_STATISTICS_ADMIN'] },
  { label: 'Verification', route: '/dashboard/admin/verification', icon: FiCheckSquare, allowedRoles: ['RESULT_VERIFICATION_ADMIN'] },
  { label: 'Compliance', route: '/dashboard/admin/compliance', icon: FiShield, allowedRoles: ['COMPLIANCE_ADMIN'] },
  { label: 'Finance', route: '/dashboard/admin/payments', icon: FiCreditCard, allowedRoles: ['FINANCE_ADMIN'] },
  { label: 'Store', route: '/dashboard/admin/store', icon: FiShoppingBag, allowedRoles: [] },
  { label: 'Support', route: '/dashboard/admin/support', icon: FiHeadphones, allowedRoles: ['CUSTOMER_SUPPORT_ADMIN'] },
  { label: 'Disputes', route: '/dashboard/admin/disputes', icon: FiClipboard, allowedRoles: ['RESULT_VERIFICATION_ADMIN', 'COMPLIANCE_ADMIN'] },
  { label: 'Users', route: '/dashboard/admin/users', icon: FiUsers, allowedRoles: [] },
  { label: 'Fans', route: '/dashboard/admin/fans', icon: FiUsers, allowedRoles: [] },
  { label: 'Membership', route: '/dashboard/admin/membership', icon: FiAward, allowedRoles: [] },
  { label: 'Roles & Permissions', route: '/dashboard/admin/roles-permissions', icon: FiLock, allowedRoles: [] },
  { label: 'Audit Log', route: '/dashboard/admin/audit', icon: FiClipboard, allowedRoles: [] },
  { label: 'Notifications', route: '/dashboard/admin/notifications', icon: FiBell, allowedRoles: ALL_SPECIALIST_ROLES },
  { label: 'Reports', route: '/dashboard/admin/reports', icon: FiBarChart2, allowedRoles: [] },
  { label: 'System Settings', route: '/dashboard/admin/settings', icon: FiSettings, allowedRoles: [] },
];

export const ADMIN_ROLE_LABELS: Record<DashboardIdentifier, string> = {
  FAN: 'Fan',
  CLUB_ADMIN: 'Club Admin',
  TICKETING_OFFICER: 'Ticketing Officer',
  SUPER_ADMIN: 'Super Admin',
  SPORTS_DATA_STATISTICS_ADMIN: 'Sports Data Admin',
  MARKET_OPERATIONS_ADMIN: 'Market Admin',
  RESULT_VERIFICATION_ADMIN: 'Referee / Resolution Officer',
  COMPLIANCE_ADMIN: 'Compliance Admin',
  FINANCE_ADMIN: 'Finance Admin',
  CUSTOMER_SUPPORT_ADMIN: 'Customer Support Admin',
};
