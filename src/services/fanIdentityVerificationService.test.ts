import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from './apiClient.ts';
import { fetchCanonicalKycStatus, requestCanonicalKycRetry, submitCanonicalKyc } from './fanIdentityVerificationService.ts';

vi.mock('./apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('canonical fan KYC service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits the actual document and selfie as multipart data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    const documentImage = new File(['document'], 'document.jpg', { type: 'image/jpeg' });
    const selfieImage = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' });

    await submitCanonicalKyc({
      documentType: 'NATIONAL_ID', documentCountry: 'UGA', documentImage, selfieImage,
      legalName: 'Normal Fan', identityNumber: 'CM12345678',
      dateOfBirth: '1990-01-01',
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(body.get('document_type')).toBe('NATIONAL_ID');
    expect(body.get('document_country')).toBe('UGA');
    expect(body.get('document_image')).toBe(documentImage);
    expect(body.get('selfie_image')).toBe(selfieImage);
  });

  it('uses the server-authoritative status response', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { id: 'kyc-1', status: 'REVIEW', attempts_count: 1 } },
    });
    await expect(fetchCanonicalKycStatus()).resolves.toMatchObject({ status: 'REVIEW' });
  });

  it('requests retry through the canonical retry endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    await requestCanonicalKycRetry();
    expect(apiClient.post).toHaveBeenCalledWith('/fans/kyc/retry/');
  });
});
