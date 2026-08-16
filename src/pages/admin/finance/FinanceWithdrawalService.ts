import apiClient from '../../../services/apiClient.ts';
import {
  extractApiError,
  normalizeApiList,
} from '../../../services/apiUtils.ts';


export type FinanceWithdrawalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';


interface FinanceWithdrawalApi {
  id: string;
  wallet_id: string;
  user_id: string;
  user_email: string;
  amount: string;
  currency: string;
  destination: Record<string, unknown>;
  status: string;
  risk_status: string;
  risk_reasons: unknown[];
  approval_mode: string;
  approval_policy_version: string;
  approved_at: string | null;
  approved_by_id: string | null;
  approved_by_email: string | null;
  rejection_reason: string;
  failure_reason: string;
  transaction_id: string | null;
  transaction_status: string | null;
  provider_reference: string;
  created_at: string;
  updated_at: string;
}


export interface FinanceWithdrawal {
  id: string;
  walletId: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  destination: Record<string, unknown>;
  status: FinanceWithdrawalStatus;
  riskStatus: string;
  riskReasons: unknown[];
  approvalMode: string;
  approvalPolicyVersion: string;
  approvedAt: string | null;
  approvedById: string | null;
  approvedByEmail: string | null;
  rejectionReason: string;
  failureReason: string;
  transactionId: string | null;
  transactionStatus: string | null;
  providerReference: string;
  createdAt: string;
  updatedAt: string;
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


function normalizeStatus(
  value: string,
): FinanceWithdrawalStatus {
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


function mapWithdrawal(
  data: FinanceWithdrawalApi,
): FinanceWithdrawal {
  return {
    id:
      data.id,
    walletId:
      data.wallet_id,
    userId:
      data.user_id,
    userEmail:
      data.user_email,
    amount:
      Number(
        data.amount,
      ),
    currency:
      data.currency,
    destination:
      data.destination,
    status:
      normalizeStatus(
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
    approvedById:
      data.approved_by_id,
    approvedByEmail:
      data.approved_by_email,
    rejectionReason:
      data.rejection_reason ?? '',
    failureReason:
      data.failure_reason ?? '',
    transactionId:
      data.transaction_id,
    transactionStatus:
      data.transaction_status,
    providerReference:
      data.provider_reference ?? '',
    createdAt:
      data.created_at,
    updatedAt:
      data.updated_at,
  };
}


export async function fetchFinanceWithdrawals(
  options: {
    status?: FinanceWithdrawalStatus;
    currency?: string;
  } = {},
): Promise<FinanceWithdrawal[]> {
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
        '/wallets/admin/withdrawals/',
        {
          params,
        },
      );

    return normalizeApiList<FinanceWithdrawalApi>(
      response.data,
    ).map(
      mapWithdrawal,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function fetchFinanceWithdrawal(
  withdrawalId: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.get(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/`,
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function approveFinanceWithdrawal(
  withdrawalId: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.post(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/approve/`,
        {},
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function rejectFinanceWithdrawal(
  withdrawalId: string,
  reason: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.post(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/reject/`,
        {
          reason:
            reason.trim(),
        },
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function startFinanceWithdrawalProcessing(
  withdrawalId: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.post(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/processing/`,
        {},
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function completeFinanceWithdrawal(
  withdrawalId: string,
  providerReference: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.post(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/complete/`,
        {
          provider_reference:
            providerReference.trim(),
        },
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}


export async function failFinanceWithdrawal(
  withdrawalId: string,
  reason: string,
): Promise<FinanceWithdrawal> {
  try {
    const response =
      await apiClient.post(
        `/wallets/admin/withdrawals/${encodeURIComponent(
          withdrawalId,
        )}/fail/`,
        {
          reason:
            reason.trim(),
        },
      );

    return mapWithdrawal(
      response.data as
        FinanceWithdrawalApi,
    );
  } catch (
    error
  ) {
    throw apiError(
      error,
    );
  }
}
