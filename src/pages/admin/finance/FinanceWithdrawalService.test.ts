import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import apiClient from '../../../services/apiClient.ts';

import {
  approveFinanceWithdrawal,
  completeFinanceWithdrawal,
  failFinanceWithdrawal,
  fetchFinanceWithdrawal,
  fetchFinanceWithdrawals,
  rejectFinanceWithdrawal,
  startFinanceWithdrawalProcessing,
} from './FinanceWithdrawalService.ts';


vi.mock(
  '../../../services/apiClient.ts',
  () => ({
    default: {
      get:
        vi.fn(),
      post:
        vi.fn(),
    },
  }),
);


const withdrawalRecord = {
  id:
    '11111111-1111-4111-8111-111111111111',
  wallet_id:
    '22222222-2222-4222-8222-222222222222',
  user_id:
    '33333333-3333-4333-8333-333333333333',
  user_email:
    'fan@example.com',
  amount:
    '50000.0000',
  currency:
    'UGX',
  destination: {
    method:
      'MOBILE_MONEY',
    network:
      'MTN',
    mobile_money_number:
      '0777123456',
    account_name:
      'Test Fan',
  },
  status:
    'PENDING_APPROVAL',
  risk_status:
    'PASSED',
  risk_reasons:
    [],
  approval_mode:
    'PENDING',
  approval_policy_version:
    'v1',
  approved_at:
    null,
  approved_by_id:
    null,
  approved_by_email:
    null,
  rejection_reason:
    '',
  failure_reason:
    '',
  transaction_id:
    '44444444-4444-4444-8444-444444444444',
  transaction_status:
    'PENDING',
  provider_reference:
    '',
  created_at:
    '2026-08-17T00:00:00Z',
  updated_at:
    '2026-08-17T00:00:00Z',
};


describe(
  'FinanceWithdrawalService',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });


    it(
      'loads the canonical Finance withdrawal queue',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data: {
            count:
              1,
            next:
              null,
            previous:
              null,
            results: [
              withdrawalRecord,
            ],
          },
        });

        await expect(
          fetchFinanceWithdrawals({
            currency:
              'ugx',
          }),
        ).resolves.toEqual([
          expect.objectContaining({
            id:
              withdrawalRecord.id,
            userEmail:
              'fan@example.com',
            amount:
              50_000,
            status:
              'PENDING_APPROVAL',
            riskStatus:
              'PASSED',
          }),
        ]);

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          '/wallets/admin/withdrawals/',
          {
            params: {
              page_size:
                100,
              currency:
                'UGX',
            },
          },
        );
      },
    );


    it(
      'loads one Finance withdrawal detail',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data:
            withdrawalRecord,
        });

        await expect(
          fetchFinanceWithdrawal(
            withdrawalRecord.id,
          ),
        ).resolves.toMatchObject({
          id:
            withdrawalRecord.id,
          destination: {
            network:
              'MTN',
          },
        });

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/`,
        );
      },
    );


    it(
      'approves a withdrawal',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            ...withdrawalRecord,
            status:
              'APPROVED',
          },
        });

        await expect(
          approveFinanceWithdrawal(
            withdrawalRecord.id,
          ),
        ).resolves.toMatchObject({
          status:
            'APPROVED',
        });

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/approve/`,
          {},
        );
      },
    );


    it(
      'rejects a withdrawal with a reason',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            ...withdrawalRecord,
            status:
              'REJECTED',
            rejection_reason:
              'Destination could not be verified.',
          },
        });

        await rejectFinanceWithdrawal(
          withdrawalRecord.id,
          ' Destination could not be verified. ',
        );

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/reject/`,
          {
            reason:
              'Destination could not be verified.',
          },
        );
      },
    );


    it(
      'moves an approved withdrawal into processing',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            ...withdrawalRecord,
            status:
              'PROCESSING',
          },
        });

        await startFinanceWithdrawalProcessing(
          withdrawalRecord.id,
        );

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/processing/`,
          {},
        );
      },
    );


    it(
      'completes a processed withdrawal with the external payout reference',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            ...withdrawalRecord,
            status:
              'COMPLETED',
            provider_reference:
              'MTN-PAYOUT-001',
          },
        });

        await expect(
          completeFinanceWithdrawal(
            withdrawalRecord.id,
            ' MTN-PAYOUT-001 ',
          ),
        ).resolves.toMatchObject({
          status:
            'COMPLETED',
          providerReference:
            'MTN-PAYOUT-001',
        });

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/complete/`,
          {
            provider_reference:
              'MTN-PAYOUT-001',
          },
        );
      },
    );


    it(
      'fails a withdrawal with a payout reason',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            ...withdrawalRecord,
            status:
              'FAILED',
            failure_reason:
              'Mobile Money payout failed.',
          },
        });

        await failFinanceWithdrawal(
          withdrawalRecord.id,
          ' Mobile Money payout failed. ',
        );

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          `/wallets/admin/withdrawals/${withdrawalRecord.id}/fail/`,
          {
            reason:
              'Mobile Money payout failed.',
          },
        );
      },
    );
  },
);
