import apiClient from './apiClient';
import { normalizeApiList } from './apiUtils';

export type AdminKycStatus = 'NOT_STARTED' | 'PENDING' | 'PROCESSING' | 'REVIEW' | 'RETRY_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export interface AdminKycCheck { id: string; check_type: string; status: string; score: number | null; confidence: number | null; result_code: string; details: Record<string, unknown>; created_at: string }
export interface AdminKycRecord {
  id: string; user_id: string; user_email: string; status: AdminKycStatus; document_type: string; document_country: string;
  document_number_last4: string; document_expiry_date: string | null; extracted_full_name: string; extracted_date_of_birth: string | null;
  extracted_nationality: string; risk_level: string; risk_score: number; rejection_reason: string; retry_reason: string;
  verification_started_at: string | null; verification_completed_at: string | null; verified_at: string | null; created_at: string;
  updated_at: string; attempts_count: number; checks: AdminKycCheck[];
}

function unwrap<T>(payload: T | { data: T }): T { return typeof payload === 'object' && payload !== null && 'data' in payload ? (payload as { data: T }).data : payload as T; }

export async function fetchCanonicalAdminKyc(status?: AdminKycStatus): Promise<AdminKycRecord[]> {
  const response = await apiClient.get('/admin/kyc/verifications/', { params: status ? { status } : undefined });
  const body = unwrap(response.data) as { verifications?: AdminKycRecord[] } | AdminKycRecord[];
  return Array.isArray(body) ? body : normalizeApiList(body.verifications ?? []);
}
export async function fetchCanonicalAdminKycDetail(id: string): Promise<AdminKycRecord> {
  const response = await apiClient.get(`/admin/kyc/verifications/${encodeURIComponent(id)}/`);
  return unwrap(response.data);
}
export async function decideCanonicalAdminKyc(id: string, decision: 'VERIFIED' | 'REJECTED', notes: string): Promise<void> {
  await apiClient.post(`/admin/kyc/verifications/${encodeURIComponent(id)}/review/`, { decision, notes });
}

export type AdminKycDocumentTarget = 'document' | 'selfie';

export async function fetchCanonicalAdminKycDocumentBlob(id: string, target: AdminKycDocumentTarget): Promise<Blob> {
  const tokenResponse = await apiClient.get(`/admin/kyc/verifications/${encodeURIComponent(id)}/document-url/`, { params: { target } });
  const { token } = unwrap(tokenResponse.data) as { token: string; target: AdminKycDocumentTarget; expires_in_seconds: number };
  const fileResponse = await apiClient.get(`/admin/kyc/verifications/${encodeURIComponent(id)}/document/`, {
    params: { token, target },
    responseType: 'blob',
  });
  return fileResponse.data as Blob;
}
