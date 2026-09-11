import apiClient from './apiClient.ts';
import { extractApiError } from './apiUtils.ts';

export type CanonicalKycStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'REVIEW'
  | 'RETRY_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export interface CanonicalKycState {
  id: string;
  status: CanonicalKycStatus;
  verification_source: 'PROVIDER' | 'MANUAL' | 'DEVELOPMENT_BYPASS';
  document_type: string;
  document_country: string;
  can_retry: boolean;
  attempts_count: number;
  max_attempts: number;
  rejection_reason: string;
  retry_reason: string;
  submitted_at: string;
  completed_at: string | null;
  verified_at: string | null;
}

function unwrap<T>(payload: T | { data: T }): T {
  return typeof payload === 'object' && payload !== null && 'data' in payload
    ? (payload as { data: T }).data
    : (payload as T);
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

export async function submitCanonicalKyc(input: {
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVING_LICENCE';
  documentCountry: string;
  documentImage: File;
  selfieImage: File;
  legalName: string;
  identityNumber: string;
  dateOfBirth: string;
}): Promise<void> {
  const body = new FormData();
  body.append('document_type', input.documentType);
  body.append('document_country', input.documentCountry);
  body.append('document_image', input.documentImage);
  body.append('selfie_image', input.selfieImage);
  body.append('legal_name', input.legalName);
  body.append('identity_number', input.identityNumber);
  body.append('date_of_birth', input.dateOfBirth);
  try {
    await apiClient.post('/fans/kyc/', body);
  } catch (error) {
    throw apiError(error);
  }
}

export async function fetchCanonicalKycStatus(): Promise<CanonicalKycState> {
  try {
    const response = await apiClient.get('/fans/kyc/status/');
    return unwrap(response.data);
  } catch (error) {
    throw apiError(error);
  }
}

export async function requestCanonicalKycRetry(): Promise<void> {
  try {
    await apiClient.post('/fans/kyc/retry/');
  } catch (error) {
    throw apiError(error);
  }
}

export async function bypassCanonicalKycForDevelopment(): Promise<CanonicalKycState> {
  try {
    const response = await apiClient.post('/fans/kyc/dev-bypass/');
    return unwrap(response.data);
  } catch (error) {
    throw apiError(error);
  }
}
