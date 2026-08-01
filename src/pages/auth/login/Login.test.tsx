import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import Login from './Login.tsx'
import { useAuthStore } from '../../../store/authStore.ts'

const navigateMock = vi.hoisted(() => vi.fn())
const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../services/authServices.ts', () => ({
  login: authMocks.login,
  fetchCurrentUser: authMocks.fetchCurrentUser,
}))

function renderLogin(initialEntries?: { pathname: string; state?: object }[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>,
  )
}

function entitlement(
  id: string,
  dashboard: 'FAN' | 'GENERAL_ADMIN' | 'MARKET_OPERATIONS_ADMIN',
  route: string,
  workspaceRole: string | null = null,
) {
  return {
    id,
    dashboard,
    route,
    scope_type: 'ACCOUNT',
    scope_id: 14,
    workspace_role: workspaceRole,
    permissions: [],
  }
}

function access(
  defaultEntitlementId: string | null,
  entitlements: ReturnType<typeof entitlement>[],
) {
  return {
    version: 1 as const,
    default_entitlement_id: defaultEntitlementId,
    entitlements,
  }
}

const fanAccess = access('fan', [
  entitlement('fan', 'FAN', '/dashboard/fan'),
])

const verifiedLoginResponse = {
  data: {
    access: 'access-token',
    refresh: 'refresh-token',
    requires_email_verification: false,
    user: {
      email: 'fan@example.com',
      role: 'FAN',
      dashboard_access: fanAccess,
    },
  },
}

const verificationRequiredResponse = {
  data: {
    access: 'access-token',
    refresh: 'refresh-token',
    requires_email_verification: true,
    user: {
      email: 'fan@example.com',
      role: 'FAN',
      dashboard_access: fanAccess,
    },
  },
}

describe('Login page', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    authMocks.login.mockReset()
    authMocks.fetchCurrentUser.mockReset()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      requiresEmailVerification: false,
      accessStatus: 'unauthenticated',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks();
  })

  it('renders the sign-in form and toggles password visibility', async () => {
    const user = userEvent.setup()

    renderLogin()

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter phone number, email, or username')).toBeInTheDocument()

    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const toggleButton = screen.getByRole('button', { name: /show password/i })

    expect(passwordInput).toHaveAttribute('type', 'password')
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('shows a success message passed from email verification', () => {
    renderLogin([{ pathname: '/login', state: { message: 'Your email has been verified. You can now sign in.' } }])

    expect(screen.getByRole('status')).toHaveTextContent(/email has been verified/i)
  })

  it('redirects users who still need email verification to the OTP page', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce(verificationRequiredResponse)

    renderLogin([{ pathname: '/login', state: { postLoginRedirect: '/profile' } }])

    await user.type(screen.getByPlaceholderText('Enter phone number, email, or username'), 'fan@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'StrongPassword123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/verify-email', {
        replace: true,
        state: {
          email: 'fan@example.com',
          message: 'Please verify your email address before continuing.',
          postLoginRedirect: '/profile',
        },
      })
    })
  })

  it('redirects backend verification-required errors to the OTP page', async () => {
    const user = userEvent.setup()

    authMocks.login.mockRejectedValueOnce({
      response: {
        data: {
          requires_email_verification: true,
          detail: 'Email verification required.',
        },
      },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter phone number, email, or username'), 'fan@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'StrongPassword123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/verify-email', {
        replace: true,
        state: {
          email: 'fan@example.com',
          message: 'Please verify your email address before continuing.',
          postLoginRedirect: '/dashboard',
        },
      })
    })
  })

  it('does not submit or redirect when the login form is empty', async () => {
    const user = userEvent.setup()

    renderLogin()

    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(authMocks.login).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByText(/phone number, email, or username is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('shows backend errors and does not redirect for invalid credentials', async () => {
    const user = userEvent.setup()

    authMocks.login.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'No active account found with the given credentials.',
        },
      },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter phone number, email, or username'), 'wrong@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'WrongPassword123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(authMocks.login).toHaveBeenCalledWith({
      identifier: 'wrong@example.com',
      password: 'WrongPassword123',
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/no active account/i)
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('submits valid credentials and redirects to the explicit backend default', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce(verifiedLoginResponse)

    renderLogin()

    await user.type(screen.getByPlaceholderText('Enter phone number, email, or username'), 'fan@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'StrongPassword123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(authMocks.login).toHaveBeenCalledWith({
      identifier: 'fan@example.com',
      password: 'StrongPassword123',
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/fan', { replace: true })
    })
  })

  it('routes an operational user from the General Admin entitlement, not legacy roles', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce({
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        requires_email_verification: false,
        user: {
          email: 'ops.admin@leagueos.test',
          role: 'FAN',
          roles: ['FAN', 'GENERAL_ADMIN'],
          dashboard_access: access('general-admin', [
            entitlement(
              'general-admin',
              'GENERAL_ADMIN',
              '/dashboard/general-admin',
            ),
          ]),
        },
      },
    })

    renderLogin()

    await user.type(
      screen.getByPlaceholderText('Enter phone number, email, or username'),
      'ops.admin@leagueos.test',
    )
    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'StrongPassword123',
    )
    await user.click(
      screen.getByRole('button', { name: /^log in$/i }),
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/dashboard/general-admin',
        { replace: true },
      )
    })
  })

  it('returns verified users to their requested protected page', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce(verifiedLoginResponse)

    renderLogin([{ pathname: '/login', state: { postLoginRedirect: '/memberships' } }])

    await user.type(screen.getByPlaceholderText('Enter phone number, email, or username'), 'fan@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'StrongPassword123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/memberships', { replace: true })
    })
  })

  it('rejects a saved Fan redirect for an operational user', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce({
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        requires_email_verification: false,
        user: {
          email: 'official@example.com',
          dashboard_access: access('general-admin', [
            entitlement(
              'general-admin',
              'GENERAL_ADMIN',
              '/dashboard/general-admin',
            ),
          ]),
        },
      },
    })

    renderLogin([{
      pathname: '/login',
      state: { postLoginRedirect: '/dashboard/fan' },
    }])

    await user.type(
      screen.getByPlaceholderText('Enter phone number, email, or username'),
      'official@example.com',
    )
    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'StrongPassword123',
    )
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/dashboard/general-admin',
        { replace: true },
      )
    })
  })

  it('rejects a saved admin redirect for a Fan', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce(verifiedLoginResponse)
    renderLogin([{
      pathname: '/login',
      state: { postLoginRedirect: '/dashboard/general-admin' },
    }])

    await user.type(
      screen.getByPlaceholderText('Enter phone number, email, or username'),
      'fan@example.com',
    )
    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'StrongPassword123',
    )
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/fan', {
        replace: true,
      })
    })
  })

  it('fails closed when the authenticated response has no usable access', async () => {
    const user = userEvent.setup()

    authMocks.login.mockResolvedValueOnce({
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        requires_email_verification: false,
        user: {
          email: 'unscoped@example.com',
          role: 'GENERAL_ADMIN',
          dashboard_access: access(null, []),
        },
      },
    })

    renderLogin()
    await user.type(
      screen.getByPlaceholderText('Enter phone number, email, or username'),
      'unscoped@example.com',
    )
    await user.type(
      screen.getByPlaceholderText('Enter your password'),
      'StrongPassword123',
    )
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/account/access-unavailable',
        { replace: true },
      )
    })
  })

  it('sends an already-authenticated user straight to their default dashboard instead of showing the form', async () => {
    useAuthStore.setState({
      user: { email: 'fan@example.com', dashboard_access: fanAccess },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresEmailVerification: false,
      accessStatus: 'ready',
    })
    authMocks.fetchCurrentUser.mockResolvedValueOnce({
      data: { email: 'fan@example.com', dashboard_access: fanAccess },
    })

    renderLogin()

    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/fan', { replace: true })
    })
  })

  it('honors a postLoginRedirect to an admin dashboard once a refresh confirms the admin entitlement', async () => {
    // The cached store still only knows about the Fan entitlement, but a
    // fresh fetch reveals the admin entitlement now exists.
    const adminAccess = access('market-operations', [
      entitlement('market-operations', 'MARKET_OPERATIONS_ADMIN', '/dashboard/market-operations'),
      entitlement('fan', 'FAN', '/dashboard/fan'),
    ])

    useAuthStore.setState({
      user: { email: 'admin@example.com', dashboard_access: fanAccess },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresEmailVerification: false,
      accessStatus: 'ready',
    })
    authMocks.fetchCurrentUser.mockResolvedValueOnce({
      data: { email: 'admin@example.com', dashboard_access: adminAccess },
    })

    renderLogin([
      { pathname: '/login', state: { postLoginRedirect: '/dashboard/market-operations' } },
    ])

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/market-operations', { replace: true })
    })
    expect(useAuthStore.getState().user).toEqual({
      email: 'admin@example.com',
      dashboard_access: adminAccess,
    })
  })

  it('falls back to the default dashboard when a refresh confirms the user still lacks the requested entitlement', async () => {
    useAuthStore.setState({
      user: { email: 'fan@example.com', dashboard_access: fanAccess },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresEmailVerification: false,
      accessStatus: 'ready',
    })
    authMocks.fetchCurrentUser.mockResolvedValueOnce({
      data: { email: 'fan@example.com', dashboard_access: fanAccess },
    })

    renderLogin([
      { pathname: '/login', state: { postLoginRedirect: '/dashboard/market-operations' } },
    ])

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/fan', { replace: true })
    })
  })

  it('falls back to the cached entitlements if the refresh request fails', async () => {
    useAuthStore.setState({
      user: { email: 'fan@example.com', dashboard_access: fanAccess },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresEmailVerification: false,
      accessStatus: 'ready',
    })
    authMocks.fetchCurrentUser.mockRejectedValueOnce(new Error('network error'))

    renderLogin()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/fan', { replace: true })
    })
  })

  it('does not show the sign-in form while a stored session is still being restored', () => {
    useAuthStore.setState({
      user: null,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresEmailVerification: false,
      accessStatus: 'loading',
    })

    renderLogin()

    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})