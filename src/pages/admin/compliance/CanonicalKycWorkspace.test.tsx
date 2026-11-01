import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CanonicalKycWorkspace from './CanonicalKycWorkspace';
import {
  fetchCanonicalAdminKyc, fetchCanonicalAdminKycDetail, fetchCanonicalAdminKycDocumentBlob,
  type AdminKycRecord,
} from '../../../services/canonicalKycAdminService';

vi.mock('../../../services/canonicalKycAdminService', () => ({
  fetchCanonicalAdminKyc: vi.fn(), fetchCanonicalAdminKycDetail: vi.fn(),
  fetchCanonicalAdminKycDocumentBlob: vi.fn(), decideCanonicalAdminKyc: vi.fn(),
}));

const record = (id: string, status: 'REVIEW' | 'PROCESSING' = 'REVIEW') => ({
  id, user_id: id, user_email: `${id}@leagueos.test`, extracted_full_name: id,
  status, checks: [], document_country: 'UGA', document_type: 'NATIONAL_ID',
  risk_level: 'LOW', risk_score: 0, attempts_count: 1, created_at: null,
} as unknown as AdminKycRecord);

describe('compliance evidence review', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    let counter = 0;
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => `blob:evidence-${++counter}`);
      static revokeObjectURL = vi.fn();
    });
    vi.mocked(fetchCanonicalAdminKyc).mockResolvedValue([record('first'), record('second')]);
    vi.mocked(fetchCanonicalAdminKycDetail).mockImplementation(async (id) => record(id));
    vi.mocked(fetchCanonicalAdminKycDocumentBlob).mockResolvedValue(new Blob(['synthetic']));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function openQueue() {
    render(<CanonicalKycWorkspace onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Manual Review/ }));
    await screen.findByText('first@leagueos.test');
  }

  it('shows both submitted photos and revokes their URLs when the drawer closes', async () => {
    await openQueue();
    await userEvent.click(screen.getByText('first@leagueos.test'));
    expect(await screen.findByAltText('Submitted ID document')).toHaveAttribute('src', 'blob:evidence-1');
    expect(screen.getByAltText('Submitted selfie')).toHaveAttribute('src', 'blob:evidence-2');
    expect(screen.getByRole('button', { name: /Verify/ })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:evidence-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:evidence-2');
  });

  it('does not let a slow previous case replace the currently selected evidence', async () => {
    let resolveOld!: (value: Blob) => void;
    const oldEvidence = new Promise<Blob>((resolve) => { resolveOld = resolve; });
    vi.mocked(fetchCanonicalAdminKycDocumentBlob).mockImplementation(async (id) => (
      id === 'first' ? oldEvidence : new Blob(['second case'])
    ));
    await openQueue();
    await userEvent.click(screen.getByText('first@leagueos.test'));
    await waitFor(() => expect(fetchCanonicalAdminKycDocumentBlob).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: /Verify/ })).toBeDisabled();
    await userEvent.click(screen.getByText('second@leagueos.test'));
    await screen.findByAltText('Submitted ID document');
    await act(async () => { resolveOld(new Blob(['first case'])); });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.getByAltText('Submitted ID document')).toHaveAttribute('src', 'blob:evidence-1');
  });

  it('blocks approval when private evidence cannot be loaded', async () => {
    vi.mocked(fetchCanonicalAdminKycDocumentBlob).mockRejectedValue(new Error('Evidence unavailable'));
    await openQueue();
    await userEvent.click(screen.getByText('first@leagueos.test'));
    await screen.findByText('Evidence unavailable');
    expect(screen.getByRole('button', { name: /Verify/ })).toBeDisabled();
  });
});
