// Fan account management — service layer (US-1.4).
//
// Backed by the real API via axiosInstance (see authClient.ts for the
// shared Bearer-token/refresh interceptor setup). Profile/avatar still
// live in authServices.ts — deliberately not duplicated here.

import axiosInstance from './apiClient'
import { unwrapApiData, normalizeApiList, extractApiError } from './apiUtils';
import type { ApiEnvelope, PaginatedResponse } from '../types/api';

export type AccountStatus = 'Active' | 'Pending Deletion' | 'Deactivated';

export interface AccountActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  device: string;
  location: string;
}

// Centralized so paths are easy to correct against the real backend routes.
const ENDPOINTS = {
  status: '/account/status/',
  activity: '/account/activity/',
  changePassword: '/account/password/change/',
  deactivate: '/account/deactivate/',
  reactivate: '/account/reactivate/',
  requestDeletion: '/account/delete/request/',
  cancelDeletion: '/account/delete/cancel/',
};

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function fetchAccountStatus(): Promise<AccountStatus> {
  try {
    const response = await axiosInstance.get<ApiEnvelope<{ status: AccountStatus }> | { status: AccountStatus }>(
      ENDPOINTS.status,
    );
    const data = unwrapApiData(response.data);
    return data.status;
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

export async function fetchAccountActivity(): Promise<AccountActivityEntry[]> {
  try {
    const response = await axiosInstance.get<
      AccountActivityEntry[] | PaginatedResponse<AccountActivityEntry> | ApiEnvelope<AccountActivityEntry[] | PaginatedResponse<AccountActivityEntry>>
    >(ENDPOINTS.activity);
    return normalizeApiList(response.data);
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw new Error('Current and new password are required.');
  }
  try {
    await axiosInstance.post(ENDPOINTS.changePassword, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

export async function requestDeactivation(): Promise<AccountStatus> {
  try {
    const response = await axiosInstance.post<ApiEnvelope<{ status: AccountStatus }> | { status: AccountStatus }>(
      ENDPOINTS.deactivate,
    );
    return unwrapApiData(response.data).status;
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

export async function reactivateAccount(): Promise<AccountStatus> {
  try {
    const response = await axiosInstance.post<ApiEnvelope<{ status: AccountStatus }> | { status: AccountStatus }>(
      ENDPOINTS.reactivate,
    );
    return unwrapApiData(response.data).status;
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

export async function requestDeletion(): Promise<AccountStatus> {
  try {
    const response = await axiosInstance.post<ApiEnvelope<{ status: AccountStatus }> | { status: AccountStatus }>(
      ENDPOINTS.requestDeletion,
    );
    return unwrapApiData(response.data).status;
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}

export async function cancelDeletion(): Promise<AccountStatus> {
  try {
    const response = await axiosInstance.post<ApiEnvelope<{ status: AccountStatus }> | { status: AccountStatus }>(
      ENDPOINTS.cancelDeletion,
    );
    return unwrapApiData(response.data).status;
  } catch (error) {
    throw new Error(extractApiError(error).message);
  }
}