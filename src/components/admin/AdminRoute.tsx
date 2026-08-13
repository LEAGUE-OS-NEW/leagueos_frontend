import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getEntitlementsForDashboard } from '../../utils/dashboardAccess';
import { ADMIN_ROLES } from '../../hooks/useActiveAdminRole';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for all /dashboard/admin/* pages.
 *
 * Rules:
 *  - accessStatus === 'unauthenticated' → redirect to /login, preserving
 *    the attempted URL so the login page can send the user straight back.
 *  - accessStatus === 'loading'         → render nothing while the stored
 *    session is being restored (avoids a flash redirect on hard refresh).
 *  - No entitlement for any admin dashboard (Super Admin or a specialist
 *    role) → redirect to /unauthorized.
 *  - Otherwise                          → render children.
 *
 * Mirrors src/components/clubadmin/ClubAdminRoute.tsx. Unlike
 * useActiveAdminRole's "default to full Super Admin visibility" fallback
 * (a UI affordance for the shared shell, not a security control), this is
 * the actual gate deciding whether the admin area renders at all.
 */
export default function AdminRoute({ children }: Props) {
  const location = useLocation();
  const accessStatus = useAuthStore((s) => s.accessStatus);
  const user = useAuthStore((s) => s.user);

  // Session still being hydrated from storage — wait silently.
  if (accessStatus === 'loading') {
    return null;
  }

  // Not logged in — send to login with a return URL.
  if (accessStatus === 'unauthenticated' || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          postLoginRedirect: location.pathname + location.search,
          message: 'Please log in to access the admin area.',
        }}
      />
    );
  }

  // Logged in but no entitlement for any admin dashboard on this account.
  const hasAdminAccess = ADMIN_ROLES.some(
    (role) => getEntitlementsForDashboard(user.dashboard_access, role).length > 0,
  );

  if (!hasAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
