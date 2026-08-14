import apiClient from './apiClient.ts';
import { extractApiError, unwrapApiData } from './apiUtils.ts';

export interface MarketEligibilityRequirements {
  minimum_age: number;
  age: number | null;
  age_eligible: boolean;
  date_of_birth_present: boolean;
  country_code: string | null;
  jurisdiction_eligible: boolean;
  kyc_status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | string;
  kyc_eligible: boolean;
  restriction_status: 'CLEAR' | 'RESTRICTED' | 'SUSPENDED' | string;
  restriction_clear: boolean;
  jurisdiction_override: string;
}

export interface MarketEligibility {
  eligible: boolean;
  evaluated_at: string;
  requirements: MarketEligibilityRequirements;
  reason_codes: string[];
  next_actions: string[];
}

export interface KYCSession {
  id: string;
  provider_code: string;
  status: string;
  provider_status: string;
  verification_level: string;
  initiated_at: string;
  expires_at: string | null;
  completed_at: string | null;
  last_event_at: string | null;
  continuation_url: string;
  failure_code: string;
  status_message: string;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

export async function fetchMarketEligibility(): Promise<MarketEligibility> {
  try {
    const response = await apiClient.get('/markets/kyc/summary/');
    return unwrapApiData<MarketEligibility>(response.data);
  } catch (error) {
    throw apiError(error);
  }
}

export async function startMarketKYCSession(idempotencyKey: string): Promise<KYCSession> {
  try {
    const response = await apiClient.post('/markets/kyc/sessions/', {
      idempotency_key: idempotencyKey,
      verification_level: 'STANDARD',
    });
    return response.data as KYCSession;
  } catch (error) {
    throw apiError(error);
  }
}
