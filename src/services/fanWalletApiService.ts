import apiClient from './apiClient.ts';
import {
  extractApiError,
  normalizeApiList,
} from './apiUtils.ts';


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


export interface WalletTransactionApi {
  id: string;
  reference: string;
  transaction_type:
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'ADJUSTMENT';
  amount: string;
  currency: string;
  status: string;
  provider_code: string | null;
  provider_reference: string;
  description: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface FanWalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'neutral';
  label: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}


function apiError(
  error: unknown,
): Error {
  const details =
    extractApiError(
      error,
    );

  return Object.assign(
    new Error(
      details.message,
    ),
    {
      status:
        details.status,
      fields:
        details.fields,
    },
  );
}


export async function fetchFanWallet(
  currency = 'UGX',
): Promise<FanWalletBalance | null> {
  try {
    const response =
      await apiClient.get(
        `/wallets/${encodeURIComponent(
          currency.toUpperCase(),
        )}/`,
      );

    const data =
      response.data as
        FanWalletApi;

    return {
      id:
        data.id,
      currency:
        data.currency,
      availableBalance:
        Number(
          data.available_balance,
        ),
      reservedBalance:
        Number(
          data.reserved_balance,
        ),
      totalBalance:
        Number(
          data.total_balance,
        ),
    };
  } catch (
    error
  ) {
    const normalized =
      apiError(
        error,
      );

    if (
      'status' in normalized &&
      normalized.status ===
        404
    ) {
      return null;
    }

    throw normalized;
  }
}


export async function fetchFanWalletTransactions(): Promise<
  FanWalletTransaction[]
> {
  try {
    const response =
      await apiClient.get(
        '/wallets/transactions/',
        {
          params: {
            page_size: 100,
          },
        },
      );

    const records =
      normalizeApiList<WalletTransactionApi>(
        response.data,
      );

    return records.map(
      (
        transaction,
      ) => {
        let type:
          | 'credit'
          | 'debit'
          | 'neutral' =
          'neutral';

        if (
          transaction
            .transaction_type ===
          'DEPOSIT'
        ) {
          type =
            'credit';
        }

        if (
          transaction
            .transaction_type ===
          'WITHDRAWAL'
        ) {
          type =
            'debit';
        }

        const label =
          transaction
            .description
            .trim() ||
          transaction
            .transaction_type
            .replaceAll(
              '_',
              ' ',
            )
            .toLowerCase()
            .replace(
              /^./,
              (
                value,
              ) =>
                value.toUpperCase(),
            );

        return {
          id:
            transaction.id,
          type,
          label,
          amount:
            Number(
              transaction.amount,
            ),
          currency:
            transaction.currency,
          status:
            transaction.status,
          createdAt:
            transaction.created_at,
        };
      },
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}
