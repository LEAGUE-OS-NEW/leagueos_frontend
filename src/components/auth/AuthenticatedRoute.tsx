import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.ts';

export default function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { accessStatus, user } = useAuthStore();
  if (accessStatus === 'loading') return null;
  if (accessStatus === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ postLoginRedirect: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
