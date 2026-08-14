import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for fan-only pages (e.g. /fan/onboarding).
 *
 * Rules:
 *  - accessStatus === 'loading'         → render nothing (session hydrating from storage).
 *  - accessStatus === 'unauthenticated' → redirect to /login with return URL.
 *  - Otherwise                          → render children.
 *
 * Does NOT require a specific role — any authenticated user can pass.
 * Mirrors the same pattern used by ClubAdminRoute.
 */
export default function FanRoute({ children }: Props) {
  const location = useLocation();
  const accessStatus = useAuthStore((s) => s.accessStatus);
  const user = useAuthStore((s) => s.user);

  // Still hydrating stored session — wait silently to avoid flash redirect.
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
          message: 'Please log in to continue.',
        }}
      />
    );
  }

  return <>{children}</>;
}
