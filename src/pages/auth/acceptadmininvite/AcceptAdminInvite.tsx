import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { acceptAdminInvitation } from '../../../services/adminUsersService.ts';
import { fetchCurrentUser } from '../../../services/authServices.ts';
import { useAuthStore } from '../../../store/authStore.ts';
import { getDefaultDashboardRoute } from '../../../utils/roleRoutes.ts';
import '../acceptinvite/acceptinvite.css';

type ApiError = {
  response?: {
    data?: Record<string, string | string[] | undefined>;
  };
};

function firstApiMessage(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getAcceptErrorMessage(error: unknown) {
  const data = (error as ApiError).response?.data;
  return firstApiMessage(data?.detail) || firstApiMessage(data?.token) || 'Something went wrong accepting this invitation. Please try again.';
}

export default function AcceptAdminInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const user = useAuthStore((state) => state.user);
  const setHydratedUser = useAuthStore((state) => state.setHydratedUser);

  const [status, setStatus] = useState<'idle' | 'accepting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user || !token || status !== 'idle') return;

    let cancelled = false;
    setStatus('accepting');

    acceptAdminInvitation(token)
      .then(async () => {
        // Roles/dashboard_access were only granted server-side by the accept
        // call above — the locally cached user is stale until re-fetched,
        // same pattern Login.tsx uses after a fresh sign-in.
        const response = await fetchCurrentUser();
        if (cancelled) return;
        setHydratedUser(response.data);
        setStatus('done');
        const destination = getDefaultDashboardRoute(response.data) ?? '/dashboard';
        window.setTimeout(() => navigate(destination, { replace: true }), 1200);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getAcceptErrorMessage(error));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, status, navigate, setHydratedUser]);

  return (
    <div className="ai-page">
      <section className="ai-card">
        <div className="ai-card-inner">
          <header className="ai-header">
            <h2>
              Accept Your <span>Invitation</span>
            </h2>
            <p>You've been invited to League OS administration.</p>
          </header>

          {!token ? (
            <p className="ai-message ai-message-error" role="alert">
              This invite link is missing its token. Ask for a new invite.
            </p>
          ) : !user ? (
            <>
              <p>Log in with the account this invitation was sent to, then come back to this link to accept it.</p>
              <Link
                to="/login"
                state={{ postLoginRedirect: `/accept-admin-invite?token=${encodeURIComponent(token)}` }}
                className="ai-submit"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Log In to Continue
              </Link>
            </>
          ) : status === 'error' ? (
            <p className="ai-message ai-message-error" role="alert">
              {errorMessage}
            </p>
          ) : status === 'done' ? (
            <div className="ai-success" role="status" aria-live="polite">
              <h3>You're all set</h3>
              <p>Redirecting to your dashboard…</p>
            </div>
          ) : (
            <p role="status" aria-live="polite">
              Accepting your invitation…
            </p>
          )}

          <p className="ai-footnote">
            Wrong account? <Link to="/login">Log in as someone else</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
