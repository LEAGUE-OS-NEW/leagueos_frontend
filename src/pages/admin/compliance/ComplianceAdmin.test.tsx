import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComplianceAdmin from './ComplianceAdmin';
import { fetchMyAdminAccess } from '../../../services/adminUsersService';
import {
  fetchCanonicalAdminKyc,
  fetchCanonicalAdminKycDetail,
  fetchCanonicalAdminKycDocumentBlob,
  type AdminKycRecord,
} from '../../../services/canonicalKycAdminService';
import {
  fetchKYCSessions,
  fetchRiskProfiles,
  fetchRiskAssessments,
  fetchComplianceDecisions,
  updateParticipantKycStatus,
} from '../../../services/markets/complianceAdminService';

vi.mock('../../../components/admin/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/adminUsersService', () => ({ fetchMyAdminAccess: vi.fn() }));
vi.mock('../../../services/canonicalKycAdminService', () => ({
  fetchCanonicalAdminKyc: vi.fn(),
  fetchCanonicalAdminKycDetail: vi.fn(),
  fetchCanonicalAdminKycDocumentBlob: vi.fn(),
  decideCanonicalAdminKyc: vi.fn(),
}));
vi.mock('../../../services/markets/complianceAdminService', () => ({
  fetchKYCSessions: vi.fn(),
  fetchRiskProfiles: vi.fn(),
  fetchRiskAssessments: vi.fn(),
  fetchComplianceDecisions: vi.fn(),
  decideComplianceProposal: vi.fn(),
  proposeComplianceDecision: vi.fn(),
  reassessRisk: vi.fn(),
  updateParticipantKycStatus: vi.fn(),
}));

const record = (id: string, status: AdminKycRecord['status']): AdminKycRecord => ({
  id, user_id: `user-${id}`, user_email: `${id}@leagueos.test`, status,
  document_type: 'NATIONAL_ID', document_country: 'UGA', document_number_last4: '1234',
  document_expiry_date: null, extracted_full_name: `Test ${id}`,
  extracted_date_of_birth: '1990-01-01', extracted_nationality: 'UGA',
  risk_level: 'CRITICAL', risk_score: 95, rejection_reason: '', retry_reason: '',
  verification_started_at: null, verification_completed_at: null, verified_at: null,
  created_at: '2026-11-06T14:00:00Z', updated_at: '2026-11-06T14:00:00Z',
  attempts_count: 1, checks: [],
});
const emptyPage = { count: 0, next: null, previous: null, results: [] };

describe('compliance KYC entry and picture review', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    let counter = 0;
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => `blob:kyc-${++counter}`);
      static revokeObjectURL = vi.fn();
    });
    vi.mocked(fetchMyAdminAccess).mockResolvedValue({ roles: [], permissions: ['manage_compliance'] });
    vi.mocked(fetchRiskProfiles).mockResolvedValue(emptyPage);
    vi.mocked(fetchRiskAssessments).mockResolvedValue(emptyPage);
    vi.mocked(fetchComplianceDecisions).mockResolvedValue(emptyPage);
    vi.mocked(fetchCanonicalAdminKyc).mockResolvedValue([record('verified', 'VERIFIED')]);
    vi.mocked(fetchCanonicalAdminKycDetail).mockResolvedValue(record('verified', 'VERIFIED'));
    vi.mocked(fetchCanonicalAdminKycDocumentBlob).mockResolvedValue(new Blob(['synthetic']));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens both private pictures for an approved case when there are no pending reviews', async () => {
    render(<ComplianceAdmin />);
    await screen.findByText('verified@leagueos.test');
    const review = screen.getByRole('button', { name: 'Review KYC' });
    expect(review).toBeEnabled();
    await userEvent.click(review);
    await userEvent.click(screen.getByRole('button', { name: 'Verified (1)' }));
    await userEvent.click(await screen.findByText('verified@leagueos.test'));
    expect(await screen.findByAltText('Submitted ID document')).toHaveAttribute('src', 'blob:kyc-1');
    expect(screen.getByAltText('Submitted selfie')).toHaveAttribute('src', 'blob:kyc-2');
    expect(fetchCanonicalAdminKycDocumentBlob).toHaveBeenCalledWith('verified', 'document');
    expect(fetchCanonicalAdminKycDocumentBlob).toHaveBeenCalledWith('verified', 'selfie');
    expect(screen.queryByRole('button', { name: '✓ Verify' })).not.toBeInTheDocument();
    expect(fetchKYCSessions).not.toHaveBeenCalled();
  });

  it('keeps identity review available when a risk queue fails', async () => {
    vi.mocked(fetchRiskProfiles).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
    vi.mocked(fetchCanonicalAdminKyc).mockResolvedValue([
      record('verified', 'VERIFIED'), record('awaiting-review', 'REVIEW'),
    ]);
    render(<ComplianceAdmin />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load risk queues:');
    const card = screen.getByText('KYC Verification Queue').closest('.queue-card') as HTMLElement;
    const metrics = card.querySelectorAll('.queue-card__metric-value');
    expect(Array.from(metrics, (element) => element.textContent)).toEqual(['1', '1']);
    await userEvent.click(within(card).getByRole('button', { name: 'Review KYC' }));
    await userEvent.click(screen.getByRole('button', { name: 'Manual Review (1)' }));
    expect(await screen.findByText('awaiting-review@leagueos.test')).toBeInTheDocument();
  });

  it('opens the protected picture-review workspace from a KYC risk-table row', async () => {
    vi.mocked(fetchCanonicalAdminKyc).mockResolvedValue([record('awaiting-review', 'REVIEW')]);
    vi.mocked(fetchCanonicalAdminKycDetail).mockResolvedValue(record('awaiting-review', 'REVIEW'));
    render(<ComplianceAdmin />);
    await userEvent.click(await screen.findByRole('button', {
      name: 'Open case awaiting-review for Test awaiting-review',
    }));
    expect(await screen.findByRole('heading', { name: 'KYC Verification' })).toBeInTheDocument();
    expect(await screen.findByAltText('Submitted selfie')).toHaveAttribute('src', 'blob:kyc-2');
    expect(fetchCanonicalAdminKycDetail).toHaveBeenCalledWith('awaiting-review');
    expect(updateParticipantKycStatus).not.toHaveBeenCalled();
  });

  it('keeps the workspace reachable when identity loading fails', async () => {
    vi.mocked(fetchCanonicalAdminKyc).mockRejectedValue(new Error('Identity records unavailable'));
    render(<ComplianceAdmin />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load identity verification records:',
    ));
    await userEvent.click(screen.getByRole('button', { name: 'Review KYC' }));
    expect(await screen.findByText('Identity records unavailable')).toBeInTheDocument();
  });
});
