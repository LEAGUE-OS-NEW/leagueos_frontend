import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for all /club-admin/* pages.
 *
 * In development (import.meta.env.DEV) the guard is bypassed entirely so
 * the UI can be worked on without a login session. Demo entitlements in
 * ClubAdminLayout/Sidebar provide the club context.
 *
 * In production:
 *  - unauthenticated → redirect to /login (preserving the return URL)
 *  - loading         → render nothing while the stored session hydrates
 *  - no CLUB_ADMIN entitlement → redirect to /unauthorized
 *  - otherwise → render children
 */
export default function ClubAdminRoute({ children }: Props) {
  const location = useLocation();
  const accessStatus = useAuthStore((s) => s.accessStatus);
  const user = useAuthStore((s) => s.user);

  // ── Skip auth in local development ──────────────────────────────────────
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

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
          message: 'Please log in to access the Club Admin area.',
        }}
      />
    );
  }

  // Logged in but no CLUB_ADMIN entitlement on this account.
  const hasClubAdminAccess =
    user.dashboard_access?.entitlements.some(
      (e) => e.dashboard === 'CLUB_ADMIN',
    ) ?? false;

  if (!hasClubAdminAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
