import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ClubAdminSidebar from './ClubAdminSidebar';
import { useAuthStore } from '../../store/authStore';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <ClubAdminSidebar isOpen={true} onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe('ClubAdminSidebar club identity', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('shows the real club from a genuine CLUB_ADMIN entitlement, not a demo one', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: 'user-1',
        roles: ['Club Admin'],
        club: { id: 'club-uuid-1', name: 'Mess FC' },
        dashboard_access: {
          version: 1,
          entitlements: [
            {
              id: 'legacy-club_admin',
              dashboard: 'CLUB_ADMIN',
              route: '/club-admin',
              scope_type: 'CLUB',
              scope_id: 'club-uuid-1',
              workspace_role: 'CLUB_ADMIN',
              permissions: ['club.profile.view'],
            },
          ],
          default_entitlement_id: 'legacy-club_admin',
        },
      },
    });

    renderSidebar();

    expect(screen.getByText('Mess FC')).toBeInTheDocument();
    expect(screen.queryByText('KCCA FC')).not.toBeInTheDocument();
    // No real league data yet — must not show fabricated copy.
    expect(screen.queryByText(/Uganda Premier League/)).not.toBeInTheDocument();
  });

  it('falls back to the demo club when there is no real entitlement', () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });

    renderSidebar();

    expect(screen.getByText('KCCA FC')).toBeInTheDocument();
  });
});
