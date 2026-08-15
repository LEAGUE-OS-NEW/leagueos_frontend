import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FanVerification from './FanVerification';
import { useAuthStore } from '../../../store/authStore.ts';
import { bypassCanonicalKycForDevelopment, fetchCanonicalKycStatus } from '../../../services/fanIdentityVerificationService.ts';

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
