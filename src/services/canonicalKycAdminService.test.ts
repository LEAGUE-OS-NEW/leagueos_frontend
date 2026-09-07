import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient';
import { countCanonicalKycReviewQueue, decideCanonicalAdminKyc, fetchCanonicalAdminKyc } from './canonicalKycAdminService';
vi.mock('./apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
describe('canonical compliance KYC service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reads canonical verification records', async () => { vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { verifications: [{ id: 'k1', status: 'REVIEW' }] } } }); await expect(fetchCanonicalAdminKyc()).resolves.toEqual([{ id: 'k1', status: 'REVIEW' }]); });
  it('uses the protected manual review action', async () => { vi.mocked(apiClient.post).mockResolvedValue({}); await decideCanonicalAdminKyc('k1', 'REJECTED', 'Mismatch'); expect(apiClient.post).toHaveBeenCalledWith('/admin/kyc/verifications/k1/review/', { decision: 'REJECTED', notes: 'Mismatch' }); });
  it('counts only canonical REVIEW records for the dashboard action', () => {
    const record = (status: string) => ({ status } as never);
    expect(countCanonicalKycReviewQueue([record('REVIEW'), record('PENDING'), record('REJECTED')])).toBe(1);
  });
});
