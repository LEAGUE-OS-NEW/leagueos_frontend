import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FanVerification from './FanVerification';
import { useAuthStore } from '../../../store/authStore.ts';
import {
  bypassCanonicalKycForDevelopment,
  fetchCanonicalKycStatus,
  type CanonicalKycState,
} from '../../../services/fanIdentityVerificationService.ts';

const refreshEligibility = vi.fn();

vi.mock('../../../hooks/useMarketEligibility.ts', () => ({
  useMarketEligibility: () => ({
    eligibility: null,
    refresh: refreshEligibility,
    isEligible: false,
    isLoading: false,
    isPending: false,
    isRejected: false,
    needsKyc: true,
    needsProfile: false,
    status: 'NOT_STARTED',
  }),
}));
vi.mock('../../../services/fanIdentityVerificationService.ts', () => ({
  bypassCanonicalKycForDevelopment: vi.fn(),
  fetchCanonicalKycStatus: vi.fn(),
  requestCanonicalKycRetry: vi.fn(),
  submitCanonicalKyc: vi.fn(),
}));
vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fan/verify?returnTo=%2Ffan%2Fmarkets%2Fm1%2Ftrade%3Fside%3DYES']}>
      <Routes>
        <Route path="/fan/verify" element={<FanVerification />} />
        <Route path="/fan/markets/m1/trade" element={<div>Returned trade flow</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Minimal valid CanonicalKycState fixture. */
function kycState(
  status: CanonicalKycState['status'],
  overrides: Partial<CanonicalKycState> = {},
): CanonicalKycState {
  return {
    id: 'kyc-1',
    status,
    verification_source: 'PROVIDER',
    document_type: 'NATIONAL_ID',
    document_country: 'UGA',
    can_retry: false,
    attempts_count: 1,
    max_attempts: 3,
    rejection_reason: '',
    retry_reason: '',
    submitted_at: '2026-08-01T10:00:00Z',
    completed_at: null,
    verified_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Staging KYC review control
// ---------------------------------------------------------------------------

describe('staging KYC review control', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REVIEW_WORKFLOW_TOOLS_ENABLED', 'true');
    refreshEligibility.mockResolvedValue({ eligible: true });
    vi.mocked(bypassCanonicalKycForDevelopment).mockResolvedValue({} as never);
    // On-mount fetch: reject so the component stays on intro step (no prior session).
    // Post-bypass fetch: return VERIFIED so the redirect-after-bypass works.
    vi.mocked(fetchCanonicalKycStatus)
      .mockRejectedValueOnce(new Error('No KYC session'))
      .mockResolvedValue(kycState('VERIFIED', { verification_source: 'DEVELOPMENT_BYPASS' }) as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('never shows the staging bypass to an ordinary account', async () => {
    useAuthStore.setState({ user: { email: 'fan@example.com', role: 'FAN' }, accessToken: 'token' });
    renderPage();
    // Wait for the on-mount rejection to settle so the intro step is stable.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Verification Required' })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Skip verification for staging review' })).not.toBeInTheDocument();
  });

  it('shows it to a synthetic account and returns to the safe intended trade flow after canonical refresh', async () => {
    await act(async () => {
      useAuthStore.setState({ user: { email: 'reviewer@leagueos.test', role: 'FAN' }, accessToken: 'token' });
    });
    renderPage();
    // Wait for the on-mount rejection to settle — button shows idle label.
    const bypassBtn = await screen.findByRole('button', { name: 'Skip verification for staging review' }, { timeout: 3000 });
    await userEvent.click(bypassBtn);
    expect(bypassCanonicalKycForDevelopment).toHaveBeenCalledTimes(1);
    expect(fetchCanonicalKycStatus).toHaveBeenCalled();
    expect(refreshEligibility).toHaveBeenCalled();
    expect(await screen.findByText('Returned trade flow')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// KYC status → Identity Verification UI  (regression tests)
// ---------------------------------------------------------------------------

describe('KYC status → Identity Verification UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAuthStore.setState({ user: { email: 'fan@example.com', role: 'FAN' }, accessToken: 'token' });
  });

  afterEach(() => {
    vi.useRealTimers();
    // clearAllMocks only clears call history, not implementations — a plain
    // mockResolvedValue(...) from an earlier test in this block would stay
    // as the fallback once a later test's mockResolvedValueOnce queue runs
    // out (shouldAdvanceTime can let the 5s poll interval fire more times
    // than a test explicitly queues for). resetAllMocks clears both.
    vi.resetAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  // ── test 1 ─────────────────────────────────────────────────────────────
  // When KYC = VERIFIED the component must show the verified branch regardless
  // of market eligibility. The mock keeps isEligible=false / eligibility=null
  // so the <h2> renders marketEligibilityTitle(null) = 'Market access unavailable',
  // but the checklist <li> "Identity Verified" is unconditional and is the
  // canonical indicator that the verified branch rendered.
  it('VERIFIED: renders the verified checklist item — not any pending heading', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z', verification_source: 'PROVIDER' }),
    );
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Identity Verified', { exact: false })).toBeInTheDocument();
    });
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
  });

  // ── test 2 ─────────────────────────────────────────────────────────────
  it('PENDING: shows "Verification In Progress" heading', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(kycState('PENDING'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Verification In Progress')).toBeInTheDocument();
    });
  });

  // ── test 3 ─────────────────────────────────────────────────────────────
  it('REVIEW: shows "Compliance Review Required" heading and body text', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(kycState('REVIEW'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Compliance Review Required')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Compliance will review your submission. No action is needed from you.'),
    ).toBeInTheDocument();
  });

  // ── test 4 ─────────────────────────────────────────────────────────────
  // Critical regression: after admin approves, poll returns VERIFIED → UI
  // must transition to verified WITHOUT a page reload.
  it('REVIEW → VERIFIED via poll: UI transitions to verified checklist', async () => {
    vi.mocked(fetchCanonicalKycStatus)
      .mockResolvedValueOnce(kycState('REVIEW'))
      .mockResolvedValueOnce(kycState('VERIFIED', { verified_at: '2026-08-02T11:00:00Z' }));
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    // First: REVIEW state visible
    await waitFor(() => {
      expect(screen.getByText('Compliance Review Required')).toBeInTheDocument();
    });

    // Advance the 5-second polling interval and flush promises
    await act(async () => {
      vi.advanceTimersByTime(5100);
      await Promise.resolve();
      await Promise.resolve();
    });

    // REVIEW heading gone; verified checklist present
    await waitFor(() => {
      expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
      expect(screen.getByText('Identity Verified', { exact: false })).toBeInTheDocument();
    });
  });

  // ── test 5 ─────────────────────────────────────────────────────────────
  // KEY REGRESSION: KYC VERIFIED but market eligibility PENDING (sync lag).
  // The Identity Verification page must show VERIFIED because canonicalKyc.status
  // === VERIFIED — market eligibility is irrelevant for this page.
  it('VERIFIED + market eligibility PENDING: renders verified checklist, not in-progress', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z' }),
    );
    // Market eligibility still pending — simulate the compliance sync lag.
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Identity Verified', { exact: false })).toBeInTheDocument();
    });
    // The verified branch renders even though isEligible=false
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
    // The h2 will say "Market access unavailable" (eligibility copy) — that is
    // correct, since trading is not yet unlocked, but KYC IS verified.
    expect(screen.getByText('Market access unavailable')).toBeInTheDocument();
  });

  // ── test 6 ─────────────────────────────────────────────────────────────
  it('REJECTED: shows "Identity Verification Rejected" heading', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('REJECTED', { rejection_reason: 'Document quality too low.' }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Identity Verification Rejected')).toBeInTheDocument();
    });
  });

  // ── test 7 ─────────────────────────────────────────────────────────────
  it('NOT_STARTED (fetch fails): stays on intro step', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockRejectedValue(new Error('No KYC session'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Verification Required' })).toBeInTheDocument();
    });
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
  });

  // ── test 8 ─────────────────────────────────────────────────────────────
  it('RETRY_REQUIRED: shows retry heading and Retry Verification button when can_retry is true', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('RETRY_REQUIRED', { can_retry: true, retry_reason: 'Face match failed.' }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Another Attempt Is Required')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry Verification' })).toBeInTheDocument();
  });
});
