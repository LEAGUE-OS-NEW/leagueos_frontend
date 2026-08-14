import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore.ts';

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('shows Log In and Sign Up when signed out', () => {
    renderNavbar();

    expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sign Up').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it.each([
    ['Fan', 'FAN', '/dashboard/fan'],
    ['Market Operations', 'MARKET_OPERATIONS_ADMIN', '/dashboard/admin'],
    ['Result Verification', 'RESULT_VERIFICATION_ADMIN', '/dashboard/admin'],
  ])('routes the %s desktop and mobile Dashboard actions authoritatively', (_label, role, route) => {
    useAuthStore.setState({ accessToken: 'fake-access-token', user: { role } });

    renderNavbar();

    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard', hidden: true });
    expect(dashboardLinks).toHaveLength(2);
    dashboardLinks.forEach((link) => expect(link).toHaveAttribute('href', route));
    expect(screen.queryByText('My Account')).not.toBeInTheDocument();
  });

  it('logs out and reverts to signed-out actions', async () => {
    useAuthStore.setState({ accessToken: 'fake-access-token', user: { role: 'FAN' } });
    renderNavbar();
    expect(screen.queryByText('Log In')).not.toBeInTheDocument();

    const [logOutButton] = screen.getAllByText('Log Out');
    await userEvent.click(logOutButton);

    expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
