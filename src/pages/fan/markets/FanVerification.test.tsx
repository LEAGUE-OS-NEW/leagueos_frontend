import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
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
  useMarketEligibility: () => ({ eligibility: null, refresh: refreshEligibility, isEligible: false, isLoading: false, isPending: false, isRejected: false, needsKyc: true, needsProfile: false, status: 'NOT_STARTED' }),
}));
vi.mock('../../../services/fanIdentityVerificationService.ts', () => ({
  bypassCanonicalKycForDevelopment: vi.fn(), fetchCanonicalKycStatus: vi.fn(), requestCanonicalKycRetry: vi.fn(), submitCanonicalKyc: vi.fn(),
}));
vi.mock('../../../components/fan/Sidebar', () => ({ default: () => null }));
vi.mock('../sections/Topbar', () => ({ default: () => null }));
vi.mock('../../../components/landing/Footer', () => ({ default: () => null }));

function renderPage() {
  return render(<MemoryRouter initialEntries={['/fan/verify?returnTo=%2Ffan%2Fmarkets%2Fm1%2Ftrade%3Fside%3DYES']}><Routes><Route path="/fan/verify" element={<FanVerification />} /><Route path="/fan/markets/m1/trade" element={<div>Returned trade flow</div>} /></Routes></MemoryRouter>);
}

describe('staging KYC review control', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REVIEW_WORKFLOW_TOOLS_ENABLED', 'true');
    refreshEligibility.mockResolvedValue({ eligible: true });
    vi.mocked(bypassCanonicalKycForDevelopment).mockResolvedValue({} as never);
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue({ status: 'VERIFIED', verification_source: 'DEVELOPMENT_BYPASS' } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  it('never shows the staging bypass to an ordinary account', () => {
    useAuthStore.setState({ user: { email: 'fan@example.com', role: 'FAN' }, accessToken: 'token' });
    renderPage();
    expect(screen.queryByRole('button', { name: 'Skip verification for staging review' })).not.toBeInTheDocument();
  });

  it('shows it to a synthetic account and returns to the safe intended trade flow after canonical refresh', async () => {
    useAuthStore.setState({ user: { email: 'reviewer@leagueos.test', role: 'FAN' }, accessToken: 'token' });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Skip verification for staging review' }));
    expect(bypassCanonicalKycForDevelopment).toHaveBeenCalledTimes(1);
    expect(fetchCanonicalKycStatus).toHaveBeenCalled();
    expect(refreshEligibility).toHaveBeenCalled();
    expect(await screen.findByText('Returned trade flow')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Regression tests — KYC status → Identity Verification UI mapping
// ---------------------------------------------------------------------------

/** Minimal valid CanonicalKycState fixture. */
function kycState(status: CanonicalKycState['status'], overrides: Partial<CanonicalKycState> = {}): CanonicalKycState {
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

describe('KYC status → Identity Verification UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({ user: { email: 'fan@example.com', role: 'FAN' }, accessToken: 'token' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  // ── test 1 ─────────────────────────────────────────────────────────────
  it('VERIFIED: shows "Identity Verified" — not "Verification In Progress"', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z', verification_source: 'PROVIDER' }),
    );
    refreshEligibility.mockResolvedValue({ eligible: true });

    renderPage();
    // on-mount fetch fires; wait for component to settle
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Identity Verified')).toBeInTheDocument();
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
  });

  // ── test 2 ─────────────────────────────────────────────────────────────
  it('PENDING: shows "Verification In Progress"', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(kycState('PENDING'));
    renderPage();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Verification In Progress')).toBeInTheDocument();
  });

  // ── test 3 ─────────────────────────────────────────────────────────────
  it('REVIEW: shows "Compliance Review Required"', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(kycState('REVIEW'));
    renderPage();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Compliance Review Required')).toBeInTheDocument();
  });

  // ── test 4 ─────────────────────────────────────────────────────────────
  it('REVIEW → VERIFIED via poll: UI transitions to verified without page reload', async () => {
    // First fetch: REVIEW
    vi.mocked(fetchCanonicalKycStatus)
      .mockResolvedValueOnce(kycState('REVIEW'))
      // Second fetch (via 5-second poll): VERIFIED
      .mockResolvedValueOnce(kycState('VERIFIED', { verified_at: '2026-08-02T11:00:00Z' }));
    refreshEligibility.mockResolvedValue({ eligible: true });

    renderPage();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Compliance Review Required')).toBeInTheDocument();

    // Advance past the 5-second polling interval
    await act(async () => {
      vi.advanceTimersByTime(5100);
      await Promise.resolve();
    });

    expect(screen.getByText('Identity Verified')).toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
  });

  // ── test 5 ─────────────────────────────────────────────────────────────
  it('VERIFIED + market eligibility PENDING: Identity page shows verified (not blocked)', async () => {
    // KYC is verified, but the market eligibility hook still says not eligible
    // (the two records are out of sync — market compliance sync lag).
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z' }),
    );
    // Market eligibility still pending — simulate the lag
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();
    await act(async () => { await Promise.resolve(); });

    // Identity page must show "verified" because canonicalKyc.status === VERIFIED,
    // regardless of useMarketEligibility().
    expect(screen.getByRole('heading', { name: /Identity Verified/i })).toBeInTheDocument();
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
  });

  // ── test 6 ─────────────────────────────────────────────────────────────
  it('REJECTED: shows rejection heading', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('REJECTED', { rejection_reason: 'Document quality too low.' }),
    );
    renderPage();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Identity Verification Rejected')).toBeInTheDocument();
  });

  // ── test 7 ─────────────────────────────────────────────────────────────
  it('NOT_STARTED: stays on intro step (does not redirect to status)', async () => {
    // fetchCanonicalKycStatus throws (no session exists yet) — same as
    // a fan who has never submitted; the on-mount fetch fails, canonicalKyc
    // stays null, and the intro step remains.
    vi.mocked(fetchCanonicalKycStatus).mockRejectedValue(new Error('No KYC session'));
    renderPage();
    await act(async () => { await Promise.resolve(); });

    // Intro step content should be visible
    expect(screen.getByText('Verification Required')).toBeInTheDocument();
    // Status step content should NOT be visible
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
  });

  // ── test 8 (bonus) ──────────────────────────────────────────────────────
  it('RETRY_REQUIRED: shows retry heading with retry button when can_retry is true', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('RETRY_REQUIRED', { can_retry: true, retry_reason: 'Face match failed.' }),
    );
    renderPage();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Another Attempt Is Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Verification' })).toBeInTheDocument();
  });
});
