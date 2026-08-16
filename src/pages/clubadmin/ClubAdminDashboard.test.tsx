import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClubAdminDashboard from './ClubAdminDashboard';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../components/clubadmin/ClubAdminSidebar', () => ({ default: () => null }));
vi.mock('../../components/clubadmin/ClubAdminTopbar', () => ({ default: () => null }));
vi.mock('../../components/landing/Footer', () => ({ default: () => null }));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ClubAdminDashboard />
    </MemoryRouter>,
  );
}

describe('ClubAdminDashboard club identity', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('shows the real club from a genuine CLUB_ADMIN entitlement, not the demo one', () => {
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

    renderDashboard();

    expect(screen.getByText('Mess FC')).toBeInTheDocument();
    expect(screen.queryByText('KCCA FC')).not.toBeInTheDocument();
    // No real league/season data yet — must not show fabricated copy.
    expect(screen.queryByText(/Uganda Premier League/)).not.toBeInTheDocument();
  });

  it('falls back to the demo club when there is no real entitlement', () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });

    renderDashboard();

    expect(screen.getByText('KCCA FC')).toBeInTheDocument();
  });
});
