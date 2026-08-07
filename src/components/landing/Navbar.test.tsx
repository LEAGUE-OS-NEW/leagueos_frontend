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
    expect(screen.queryByText('My Account')).not.toBeInTheDocument();
  });

  it('shows My Account and Log Out when signed in, and logging out reverts to signed-out actions', async () => {
    useAuthStore.setState({ accessToken: 'fake-access-token' });

    renderNavbar();

    expect(screen.getAllByText('My Account').length).toBeGreaterThan(0);
    expect(screen.queryByText('Log In')).not.toBeInTheDocument();

    const [logOutButton] = screen.getAllByText('Log Out');
    await userEvent.click(logOutButton);

    expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
    expect(screen.queryByText('My Account')).not.toBeInTheDocument();
  });
});
