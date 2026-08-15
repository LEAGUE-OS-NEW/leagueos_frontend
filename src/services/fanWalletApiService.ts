import apiClient from './apiClient.ts';
import { extractApiError } from './apiUtils.ts';

export interface FanWalletApi {
  id: string;
  currency: string;
  available_balance: string;
  reserved_balance: string;
  total_balance: string;
  created_at: string;
  updated_at: string;
}

export interface FanWalletBalance {
  id: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
}

function apiError(error: unknown): Error {
  const details = extractApiError(error);

  return Object.assign(
    new Error(details.message),
    {
      status: details.status,
      fields: details.fields,
    },
  );
}

export async function fetchFanWallet(
  currency = 'UGX',
): Promise<FanWalletBalance | null> {
  try {
    const response = await apiClient.get(
      `/wallets/${encodeURIComponent(currency.toUpperCase())}/`,
    );

    const data = response.data as FanWalletApi;

    return {
      id: data.id,
      currency: data.currency,
      availableBalance: Number(data.available_balance),
      reservedBalance: Number(data.reserved_balance),
      totalBalance: Number(data.total_balance),
    };
  } catch (error) {
    const normalized = apiError(error);

    if (
      'status' in normalized &&
      normalized.status === 404
    ) {
      return null;
    }

    throw normalized;
  }
}
