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
      dateOfBirth: '1990-01-01', profileCountry: 'UG',
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(body.get('document_type')).toBe('NATIONAL_ID');
    expect(body.get('document_country')).toBe('UGA');
    expect(body.get('document_image')).toBe(documentImage);
    expect(body.get('selfie_image')).toBe(selfieImage);
    expect(body.get('profile_country')).toBe('UG');
  });

  it('uses the server-authoritative status response', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { id: 'kyc-1', status: 'REVIEW', attempts_count: 1 } },
    });
    await expect(fetchCanonicalKycStatus()).resolves.toMatchObject({ status: 'REVIEW' });
  });

  it('keeps existing four-field upload clients compatible with optional identity metadata', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    await submitCanonicalKyc({
      documentType: 'NATIONAL_ID', documentCountry: 'UGA',
      documentImage: new File(['id'], 'id.jpg', { type: 'image/jpeg' }),
      selfieImage: new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' }),
    });
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect([...body.keys()].sort()).toEqual([
      'document_country', 'document_image', 'document_type', 'selfie_image',
    ]);
  });

  it('sends the collected identity details with the uploaded evidence', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    await submitCanonicalKyc({
      documentType: 'NATIONAL_ID', documentCountry: 'UGA',
      documentImage: new File(['id'], 'id.jpg', { type: 'image/jpeg' }),
      selfieImage: new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' }),
      legalName: 'Synthetic Fan', identityNumber: 'AB12CD34EF5678', dateOfBirth: '1990-01-01',
    });
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(body.get('legal_name')).toBe('Synthetic Fan');
    expect(body.get('identity_number')).toBe('AB12CD34EF5678');
    expect(body.get('date_of_birth')).toBe('1990-01-01');
  });

  it('requests retry through the canonical retry endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    await requestCanonicalKycRetry();
    expect(apiClient.post).toHaveBeenCalledWith('/fans/kyc/retry/');
  });
});
