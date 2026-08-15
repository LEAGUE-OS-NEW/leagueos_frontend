import apiClient from './apiClient.ts';
import { extractApiError } from './apiUtils.ts';

export interface ResponsibleParticipationStatus {
  limits: Record<string, string | number | null>;
  utilization: Record<string, string | number | null>;
  cooling_off_until: string | null;
  cooling_off_active: boolean;
  self_exclusion_until: string | null;
  self_exclusion_active: boolean;
  self_excluded_indefinitely: boolean;
  administrative_block_active: boolean;
  buy_allowed: boolean;
  sell_allowed: boolean;
  participation_allowed: boolean;
  buy_reason_codes: string[];
  sell_reason_codes: string[];
  next_actions: string[];
  evaluated_at: string;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);
  return Object.assign(new Error(details.message), { status: details.status, fields: details.fields });
}

export async function fetchResponsibleParticipationStatus(): Promise<ResponsibleParticipationStatus> {
  try {
    const response = await apiClient.get('/markets/responsible-participation/');
    return response.data as ResponsibleParticipationStatus;
  } catch (error) {
    throw apiError(error);
  }
}

