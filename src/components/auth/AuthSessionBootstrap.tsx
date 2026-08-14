import { useEffect, type ReactNode } from 'react';
import { fetchCurrentUser } from '../../services/authServices.ts';
import { useAuthStore } from '../../store/authStore.ts';
import { getRefreshToken, getToken } from '../../utils/tokenManager.ts';

export default function AuthSessionBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!getToken() && !getRefreshToken()) return;

    let active = true;
    void fetchCurrentUser()
      .then((response) => {
        if (active) useAuthStore.getState().setHydratedUser(response.data);
      })
      .catch(() => {
        // apiClient clears auth only for a confirmed invalid refresh. For a
        // transient failure, retain cached identity/tokens and the hydrating
        // state so guards never manufacture a logout or redirect loop.
      });
    return () => { active = false; };
  }, []);

  return <>{children}</>;
}
