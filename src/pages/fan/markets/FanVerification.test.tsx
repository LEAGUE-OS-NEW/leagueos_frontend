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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAuthStore.setState({ user: { email: 'fan@example.com', role: 'FAN' }, accessToken: 'token' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
  });

  // ── test 1 ─────────────────────────────────────────────────────────────
  // VERIFIED: the <h2> renders `isEligible ? 'Identity Verified' : marketEligibilityTitle(eligibility)`.
  // The global mock has isEligible=false and eligibility=null, so the <h2> renders
  // 'Market access unavailable'. However, the <ul class="verify-checklist"><li>
  // always renders the text "Identity Verified" unconditionally (the KYC indicator).
  // We assert that text is present (substring match for the icon sibling) and that
  // none of the non-verified status headings are present.
  it('VERIFIED: renders the verified checklist and not any in-progress / review heading', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z', verification_source: 'PROVIDER' }),
    );
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    // waitFor handles the two-effect async chain:
    // on-mount fetch → setCanonicalKyc → goToStep('status') useEffect → re-render
    await waitFor(() => {
      // The checklist <li> always renders "Identity Verified" on the VERIFIED branch.
      // RTL getByText with exact:false matches even when an icon SVG is a sibling node.
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
  it('REVIEW: shows "Compliance Review Required" heading and review body text', async () => {
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
  // Critical regression: REVIEW → VERIFIED via the 5-second poll.
  // After the poll fires, the UI must transition without a page reload.
  it('REVIEW → VERIFIED via poll: UI transitions to verified checklist', async () => {
    vi.mocked(fetchCanonicalKycStatus)
      .mockResolvedValueOnce(kycState('REVIEW'))
      .mockResolvedValueOnce(kycState('VERIFIED', { verified_at: '2026-08-02T11:00:00Z' }));
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    // First: REVIEW state must be visible
    await waitFor(() => {
      expect(screen.getByText('Compliance Review Required')).toBeInTheDocument();
    });

    // Advance the 5-second polling interval and flush promises
    await act(async () => {
      vi.advanceTimersByTime(5100);
      // flush the resolved mock promise
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
  // KYC VERIFIED but market eligibility still PENDING (backend sync lag).
  // The Identity Verification page must enter the VERIFIED branch because
  // canonicalKyc.status === VERIFIED — market eligibility is irrelevant here.
  // The <h2> will say 'Market access unavailable' (correct — isEligible=false),
  // but the verified checklist item must be present.
  it('VERIFIED + market eligibility PENDING: renders verified checklist, not in-progress', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockResolvedValue(
      kycState('VERIFIED', { verified_at: '2026-08-02T10:00:00Z' }),
    );
    refreshEligibility.mockResolvedValue({ eligible: false });

    renderPage();

    await waitFor(() => {
      // Verified checklist item is always rendered on the VERIFIED branch.
      expect(screen.getByText('Identity Verified', { exact: false })).toBeInTheDocument();
    });

    // None of the non-verified status headings must be visible.
    expect(screen.queryByText('Verification In Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance Review Required')).not.toBeInTheDocument();
    // The page is in the VERIFIED branch even though market access is unavailable.
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
  it('NOT_STARTED (fetch fails): stays on intro step, does not show status headings', async () => {
    vi.mocked(fetchCanonicalKycStatus).mockRejectedValue(new Error('No KYC session'));
    renderPage();

    // The intro heading must be present; no status headings.
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
