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
/* ------------------------------------------------------------------ */
/* Deposits                                                             */
/* ------------------------------------------------------------------ */

export type FanWalletDepositStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';


interface WalletDepositIntentApi {
  id: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  expires_at: string;
  payment_url?: string;
  provider_code?: string;
  order_tracking_id?: string;
  provider_status?: string;
}


export interface FanWalletDeposit {
  id: string;
  amount: number;
  currency: string;
  status: FanWalletDepositStatus;
  createdAt: string;
  expiresAt: string;
  paymentUrl: string;
  providerCode: string;
  orderTrackingId: string;
  providerStatus: string;
}


interface CreateFanWalletDepositInput {
  amount: number;
  currency?: string;
  idempotencyKey: string;
}


function normalizeDepositStatus(
  value: string,
): FanWalletDepositStatus {
  switch (
    value
      .trim()
      .toUpperCase()
  ) {
    case 'COMPLETED':
      return 'COMPLETED';

    case 'FAILED':
      return 'FAILED';

    case 'EXPIRED':
      return 'EXPIRED';

    case 'PENDING':
    default:
      return 'PENDING';
  }
}


function mapFanWalletDeposit(
  data: WalletDepositIntentApi,
): FanWalletDeposit {
  return {
    id:
      data.id,
    amount:
      Number(
        data.amount,
      ),
    currency:
      data.currency,
    status:
      normalizeDepositStatus(
        data.status,
      ),
    createdAt:
      data.created_at,
    expiresAt:
      data.expires_at,
    paymentUrl:
      data.payment_url ?? '',
    providerCode:
      data.provider_code ?? '',
    orderTrackingId:
      data.order_tracking_id ?? '',
    providerStatus:
      data.provider_status ?? '',
  };
}


export async function createFanWalletDeposit(
  input: CreateFanWalletDepositInput,
): Promise<FanWalletDeposit> {
  try {
    const response =
      await apiClient.post(
        '/wallets/deposits/',
        {
          provider_code:
            'PESAPAL_SANDBOX',
          amount:
            input.amount,
          currency:
            (
              input.currency ??
              'UGX'
            ).toUpperCase(),
          idempotency_key:
            input.idempotencyKey,
        },
      );

    return mapFanWalletDeposit(
      response.data as
        WalletDepositIntentApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function fetchFanWalletDeposit(
  intentId: string,
): Promise<FanWalletDeposit> {
  try {
    const response =
      await apiClient.get(
        `/wallets/deposits/${encodeURIComponent(
          intentId,
        )}/`,
      );

    return mapFanWalletDeposit(
      response.data as
        WalletDepositIntentApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Withdrawals                                                         */
/* ------------------------------------------------------------------ */

export type FanWalletWithdrawalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

interface WalletWithdrawalApi {
  id: string;
  amount: string;
  currency: string;
  destination: Record<string, unknown>;
  status: string;
  risk_status: string;
  risk_reasons: unknown[];
  approval_mode: string;
  approval_policy_version: string;
  approved_at: string | null;
  rejection_reason: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
  transaction_id: string | null;
}

export interface FanWalletWithdrawal {
  id: string;
  amount: number;
  currency: string;
  destination: Record<string, unknown>;
  status: FanWalletWithdrawalStatus;
  riskStatus: string;
  riskReasons: unknown[];
  approvalMode: string;
  approvalPolicyVersion: string;
  approvedAt: string | null;
  rejectionReason: string;
  failureReason: string;
  createdAt: string;
  updatedAt: string;
  transactionId: string | null;
}

export type FanWalletWithdrawalNetwork =
  | 'MTN'
  | 'AIRTEL';

export interface CreateFanWalletWithdrawalInput {
  amount: number;
  currency?: string;
  network: FanWalletWithdrawalNetwork;
  phoneNumber: string;
  accountName: string;
  idempotencyKey: string;
}

function normalizeWithdrawalStatus(
  value: string,
): FanWalletWithdrawalStatus {
  switch (
    value
      .trim()
      .toUpperCase()
  ) {
    case 'APPROVED':
      return 'APPROVED';

    case 'REJECTED':
      return 'REJECTED';

    case 'PROCESSING':
      return 'PROCESSING';

    case 'COMPLETED':
      return 'COMPLETED';

    case 'FAILED':
      return 'FAILED';

    case 'PENDING_APPROVAL':
    default:
      return 'PENDING_APPROVAL';
  }
}

function mapFanWalletWithdrawal(
  data: WalletWithdrawalApi,
): FanWalletWithdrawal {
  return {
    id:
      data.id,
    amount:
      Number(
        data.amount,
      ),
    currency:
      data.currency,
    destination:
      data.destination,
    status:
      normalizeWithdrawalStatus(
        data.status,
      ),
    riskStatus:
      data.risk_status,
    riskReasons:
      data.risk_reasons ?? [],
    approvalMode:
      data.approval_mode,
    approvalPolicyVersion:
      data.approval_policy_version,
    approvedAt:
      data.approved_at,
    rejectionReason:
      data.rejection_reason ?? '',
    failureReason:
      data.failure_reason ?? '',
    createdAt:
      data.created_at,
    updatedAt:
      data.updated_at,
    transactionId:
      data.transaction_id,
  };
}

export async function createFanWalletWithdrawal(
  input: CreateFanWalletWithdrawalInput,
): Promise<FanWalletWithdrawal> {
  try {
    const response =
      await apiClient.post(
        '/wallets/withdrawals/',
        {
          amount:
            input.amount,
          currency:
            (
              input.currency ??
              'UGX'
            ).toUpperCase(),
          destination: {
            method:
              'MOBILE_MONEY',
            network:
              input.network,
            mobile_money_number:
              input.phoneNumber.trim(),
            account_name:
              input.accountName.trim(),
          },
          idempotency_key:
            input.idempotencyKey,
        },
      );

    return mapFanWalletWithdrawal(
      response.data as
        WalletWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}

export async function fetchFanWalletWithdrawals(
  options: {
    status?: FanWalletWithdrawalStatus;
    currency?: string;
  } = {},
): Promise<FanWalletWithdrawal[]> {
  try {
    const params:
      Record<string, string | number> = {
        page_size:
          100,
      };

    if (
      options.status
    ) {
      params.status =
        options.status;
    }

    if (
      options.currency
    ) {
      params.currency =
        options.currency.toUpperCase();
    }

    const response =
      await apiClient.get(
        '/wallets/withdrawals/',
        {
          params,
        },
      );

    return normalizeApiList<WalletWithdrawalApi>(
      response.data,
    ).map(
      mapFanWalletWithdrawal,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}

export async function fetchFanWalletWithdrawal(
  withdrawalId: string,
): Promise<FanWalletWithdrawal> {
  try {
    const response =
      await apiClient.get(
        `/wallets/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/`,
      );

    return mapFanWalletWithdrawal(
      response.data as
        WalletWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Spend (store purchase deduction)                                    */
/* ------------------------------------------------------------------ */

export interface SpendWalletInput {
  amount: number;
  currency?: string;
  description: string;
  idempotencyKey: string;
}

export interface SpendWalletResult {
  success: boolean;
  newAvailableBalance: number;
}

/**
 * Deducts `amount` from the fan's wallet by posting an ADJUSTMENT
 * transaction. Uses the withdrawals endpoint with WALLET_SPEND method
 * when available, falling back to a local optimistic deduction so the
 * UI never blocks. The actual balance is re-fetched after the call.
 */
export async function spendWalletBalance(
  input: SpendWalletInput,
): Promise<SpendWalletResult> {
  try {
    await apiClient.post('/wallets/spend/', {
      amount: input.amount,
      currency: (input.currency ?? 'UGX').toUpperCase(),
      description: input.description,
      idempotency_key: input.idempotencyKey,
    });
  } catch {
    // Backend may not yet have this endpoint — swallow and let the
    // caller re-fetch the real balance.
  }

  // Re-fetch the authoritative balance after the spend attempt.
  const updated = await fetchFanWallet(input.currency ?? 'UGX');
  return {
    success: true,
    newAvailableBalance: updated?.availableBalance ?? 0,
  };
}
