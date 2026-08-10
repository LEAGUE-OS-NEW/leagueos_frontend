import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { useAuth } from '../../../hooks/useAuth.ts';
import {
    getSafeAuthRedirect,
    VERIFY_EMAIL_ROUTE,
    type AuthFlowState,
} from '../../../utils/authFlow.ts';
import BackButton from '../../../components/auth/BackButton.tsx';
import {
    ACCESS_UNAVAILABLE_ROUTE,
    canAccessDashboardRoute,
    getDefaultDashboardRoute,
    validateDashboardAccess,
} from '../../../utils/dashboardAccess.ts';
import {
    getDefaultDashboardRoute as getRoleDefaultDashboardRoute,
} from '../../../utils/roleRoutes.ts';
import { useAuthStore } from '../../../store/authStore.ts';
import { fetchCurrentUser } from '../../../services/authServices.ts';
import type { AuthenticatedUser } from '../../../types/dashboardAccess.ts';
import './login.css';

const leagueOsIcon = '/logos/league-os-icon-square.png';

type LoginErrors = {
    identifier?: string;
    password?: string;
    general?: string;
};

type LoginResult = {
    requires_email_verification?: boolean;
    is_new_user?: boolean;
    user?: AuthenticatedUser | null;
};

type ApiError = {
    response?: {
        data?: {
            detail?: string;
            error?: string;
            message?: string;
            non_field_errors?: string[];
            identifier?: string[];
            email?: string[];
            password?: string[];
            requires_email_verification?: boolean;
        };
    };
};

const features = [
    {
        title: 'For Fans',
        copy: 'Follow your teams, get live scores, and never miss a moment.',
        tone: 'feature-purple',
        icon: GroupsOutlinedIcon,
    },
    {
        title: 'Live Scores & Updates',
        copy: 'Real-time scores, results and match highlights.',
        tone: 'feature-orange',
        icon: EmojiEventsOutlinedIcon,
    },
    {
        title: 'Never Miss a Moment',
        copy: 'Personalized schedules and important alerts.',
        tone: 'feature-blue',
        icon: EventNoteOutlinedIcon,
    },
];

function LoginFieldIcon({ children }: { children: ReactNode }) {
    return (
        <span className="login-field-icon" aria-hidden="true">
            {children}
        </span>
    );
}

function firstMessage(value?: string | string[]) {
    if (Array.isArray(value)) return value[0];
    return value;
}

function getLoginErrorMessage(error: unknown) {
    const data = (error as ApiError).response?.data;

    if (data?.requires_email_verification) {
        return 'Please verify your email before logging in.';
    }

  return (
    firstMessage(data?.detail) ||
    firstMessage(data?.error) ||
    firstMessage(data?.message) ||
    firstMessage(data?.non_field_errors) ||
    firstMessage(data?.identifier) ||
    firstMessage(data?.email) ||
    firstMessage(data?.password) ||
    'Login failed. Please check your phone number, email, or username and password.'
  );
}

function resolvePostLoginRoute(
    result: LoginResult,
    postLoginRedirect?: string | null,
) {
    const dashboardAccess = validateDashboardAccess(
        result.user?.dashboard_access,
    );

    if (
        postLoginRedirect &&
        canAccessDashboardRoute(dashboardAccess, postLoginRedirect)
    ) {
        return postLoginRedirect;
    }

    // Prefer the canonical v1 dashboard_access contract when available.
    //
    // The current backend still sends the legacy dashboard_access shape for
    // some users. An invalid legacy contract must therefore fall back to the
    // existing role router rather than sending every authenticated user to
    // /account/access-unavailable.
    if (dashboardAccess) {
        return (
            getDefaultDashboardRoute(dashboardAccess) ??
            ACCESS_UNAVAILABLE_ROUTE
        );
    }

    return (
        getRoleDefaultDashboardRoute(result.user) ??
        ACCESS_UNAVAILABLE_ROUTE
    );
}

function getUserEmail(value: unknown) {
    return typeof value === 'string' && value.includes('@') ? value : undefined;
}

const REMEMBER_ME_STORAGE_KEY = 'leagueos:rememberedIdentifier';

function getRememberedIdentifier() {
    try {
        return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) ?? '';
    } catch {
        // localStorage can throw in private-browsing / disabled-storage
        // contexts — treat that the same as "nothing remembered".
        return '';
    }
}

export default function Login() {
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    const accessStatus = useAuthStore((state) => state.accessStatus);
    const cachedUser = useAuthStore((state) => state.user);
    const setHydratedUser = useAuthStore((state) => state.setHydratedUser);

    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState(() => getRememberedIdentifier());
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<LoginErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedIdentifier()));

    const locationState = location.state as AuthFlowState | null;
    const locationMessage = locationState?.message ?? '';
    const postLoginRedirect = getSafeAuthRedirect(locationState?.postLoginRedirect);

    // Someone can land here while already signed in — e.g. clicking a
    // "Log in to your dashboard" link from a protected feature page.
    // Send them straight to their dashboard instead of making them submit
    // the form again. accessStatus === 'ready' only means *some* valid
    // entitlements are cached, not that they're current — e.g. this tab
    // could have been hydrated before an admin permission was granted —
    // so refresh from the backend before deciding where to send them.
    useEffect(() => {
        if (accessStatus !== 'ready') {
            return;
        }

        let isMounted = true;

        (async () => {
            let freshUser: AuthenticatedUser | null = cachedUser;

            try {
                const response = await fetchCurrentUser();

                if (isMounted) {
                    setHydratedUser(response.data);
                }

                freshUser = response.data;
            } catch {
                // Refresh failed (offline, backend hiccup, etc.) — freshUser
                // stays as the cached value already assigned above, so the
                // user isn't stranded on the login form.
            }

            if (!isMounted) {
                return;
            }

            const redirectRoute = resolvePostLoginRoute(
                { user: freshUser },
                postLoginRedirect,
            );

            navigate(redirectRoute, { replace: true });
        })();

        return () => {
            isMounted = false;
        };
        // This should only run once, when we discover on mount (or once
        // hydration finishes) that a session is already authenticated —
        // not on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessStatus]);

    const clearError = (field: keyof LoginErrors) => {
        setErrors((current) => ({
            ...current,
            [field]: undefined,
            general: undefined,
        }));
    };

    const handleIdentifierChange = (e: ChangeEvent<HTMLInputElement>) => {
        setIdentifier(e.target.value);
        clearError('identifier');
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        clearError('password');
    };

    const handleRememberMeChange = (e: ChangeEvent<HTMLInputElement>) => {
        setRememberMe(e.target.checked);
    };

    const validateForm = () => {
        const nextErrors: LoginErrors = {};

        if (!identifier.trim()) {
            nextErrors.identifier = 'Phone number, email, or username is required.';
        }

        if (!password) {
            nextErrors.password = 'Password is required.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const result = await login({
                identifier: identifier.trim(),
                password,
            });

            // Persist (or clear) the remembered identifier once we know the
            // credentials were accepted — never remember on a failed attempt.
            try {
                if (rememberMe) {
                    window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, identifier.trim());
                } else {
                    window.localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
                }
            } catch {
                // Ignore storage failures (private browsing, quota, etc.) —
                // remember-me is a convenience, not a hard requirement.
            }

            if (result.requires_email_verification) {
                navigate(VERIFY_EMAIL_ROUTE, {
                    replace: true,
                    state: {
                        email:
                            getUserEmail(result.user?.email) ??
                            getUserEmail(identifier.trim()),
                        message: 'Please verify your email address before continuing.',
                        postLoginRedirect: resolvePostLoginRoute(result, postLoginRedirect),
                    },
                });
                return;
            }

            const redirectRoute = resolvePostLoginRoute(
                result,
                postLoginRedirect,
            );

            navigate(redirectRoute, { replace: true });
        } catch (error) {
            const data = (error as ApiError).response?.data;

            if (data?.requires_email_verification) {
                navigate(VERIFY_EMAIL_ROUTE, {
                    replace: true,
                    state: {
                        email: getUserEmail(identifier.trim()),
                        message: 'Please verify your email address before continuing.',
                        postLoginRedirect: postLoginRedirect ?? '/dashboard',
                    },
                });
                return;
            }

            setErrors({
                general: getLoginErrorMessage(error),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // While a stored session is still being restored (accessStatus ===
    // 'loading'), or once we've detected an already-authenticated user
    // above and are in the middle of redirecting them away (accessStatus
    // === 'ready'), don't flash the sign-in form.
    if (accessStatus === 'loading' || accessStatus === 'ready') {
        return null;
    }

    return (
        <div className="login-page">
            <div className="login-back-wrap">
                <BackButton to="/" label="Back to home" />
            </div>

            <main className="login-layout">
                <section className="login-story">
                    <div className="login-hero-copy">
                        <h1>
                            <span>Every Game.</span>
                            <span>Every Fan.</span>
                            <span className="login-hero-accent">One Platform.</span>
                        </h1>
                        <p>
                            League OS is Uganda's unified platform for fans, teams, leagues and partners.
                            Follow. Engage. Support.
                        </p>
                    </div>

                    <div className="login-feature-list">
                        {features.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <article key={feature.title} className={`login-feature ${feature.tone}`}>
                                    <span className="login-feature-icon" aria-hidden="true">
                                        <Icon className="login-feature-icon-svg" />
                                    </span>
                                    <div className="login-feature-copy">
                                        <strong>{feature.title}</strong>
                                        <p>{feature.copy}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="login-card">
                    <div className="login-card-inner">
                        <div className="login-logo-badge">
                            <img
                                src={leagueOsIcon}
                                alt="League OS"
                                className="login-logo"
                            />
                        </div>

                        <header className="login-card-header">
                            <h2>
                                Welcome <span>Back!</span>
                            </h2>
                            <p>Log in to continue your League OS experience.</p>
                            {locationMessage ? (
                                <p className="auth-message auth-message-success" role="status" aria-live="polite">
                                    {locationMessage}
                                </p>
                            ) : null}
                        </header>

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            {errors.general ? (
                                <p className="auth-message auth-message-error" role="alert">
                                    {errors.general}
                                </p>
                            ) : null}

                            <label>
                                Phone Number, Email, or Username
                                <div className="login-field-shell">
                                    <LoginFieldIcon>
                                        <PersonOutlinedIcon />
                                    </LoginFieldIcon>
                                    <input
                                        type="text"
                                        placeholder="Enter phone number, email, or username"
                                        autoComplete="username"
                                        value={identifier}
                                        onChange={handleIdentifierChange}
                                        aria-invalid={Boolean(errors.identifier)}
                                        aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {errors.identifier ? (
                                    <p id="login-identifier-error" className="login-footnote login-footnote-error" role="alert">
                                        {errors.identifier}
                                    </p>
                                ) : null}
                            </label>

                            <label>
                                Password
                                <div className="login-password-shell">
                                    <LoginFieldIcon>
                                        <LockOutlinedIcon />
                                    </LoginFieldIcon>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={errors.password ? 'login-password-error' : undefined}
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((current) => !current)}
                                        disabled={isSubmitting}
                                    >
                                        {showPassword ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
                                    </button>
                                </div>
                                {errors.password ? (
                                    <p id="login-password-error" className="login-footnote login-footnote-error" role="alert">
                                        {errors.password}
                                    </p>
                                ) : null}
                            </label>

                            <div className="login-meta-row">
                                <label className="login-remember-me">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={handleRememberMeChange}
                                        disabled={isSubmitting}
                                    />
                                    Remember me
                                </label>
                                <Link className="login-forgot" to="/forgot-password">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="login-submit-loading">
                                        <span className="login-spinner" aria-hidden="true" />
                                        Logging in...
                                    </span>
                                ) : (
                                    'Log In'
                                )}
                            </button>

                            <p className="login-footnote">
                                Don't have an account? <Link to="/register">Sign Up</Link>
                            </p>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}