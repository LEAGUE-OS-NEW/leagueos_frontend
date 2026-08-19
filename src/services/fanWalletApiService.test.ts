import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import apiClient from './apiClient.ts';

import {
  createFanWalletDeposit,
  fetchFanWallet,
  fetchFanWalletDeposit,
  fetchFanWalletTransactions,
} from './fanWalletApiService.ts';


vi.mock(
  './apiClient.ts',
  () => ({
    default: {
      get:
        vi.fn(),
      post:
        vi.fn(),
    },
  }),
);


describe(
  'fan wallet API service',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });


    it(
      'loads the real UGX wallet',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data: {
            id:
              'wallet-1',
            currency:
              'UGX',
            available_balance:
              '1000000.0000',
            reserved_balance:
              '0.0000',
            total_balance:
              '1000000.0000',
          },
        });

        await expect(
          fetchFanWallet(),
        ).resolves.toMatchObject({
          availableBalance:
            1_000_000,
          reservedBalance:
            0,
          totalBalance:
            1_000_000,
        });

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          '/wallets/UGX/',
        );
      },
    );


    it(
      'loads canonical wallet transactions',
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
              {
                id:
                  'tx-1',
                reference:
                  'DEP-1',
                transaction_type:
                  'DEPOSIT',
                amount:
                  '50000.0000',
                currency:
                  'UGX',
                status:
                  'COMPLETED',
                provider_code:
                  'PESAPAL_SANDBOX',
                provider_reference:
                  '',
                description:
                  'Pesapal wallet deposit',
                completed_at:
                  '2026-08-15T12:00:00Z',
                created_at:
                  '2026-08-15T12:00:00Z',
                updated_at:
                  '2026-08-15T12:00:00Z',
              },
            ],
          },
        });

        await expect(
          fetchFanWalletTransactions(),
        ).resolves.toEqual([
          expect.objectContaining({
            type:
              'credit',
            amount:
              50_000,
            status:
              'COMPLETED',
          }),
        ]);

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          '/wallets/transactions/',
          {
            params: {
              page_size:
                100,
            },
          },
        );
      },
    );


    it(
      'treats settlement payouts and void refunds as credits',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data: {
            count:
              2,
            next:
              null,
            previous:
              null,
            results: [
              {
                id:
                  'tx-2',
                reference:
                  'SETTLE-1',
                transaction_type:
                  'SETTLEMENT_PAYOUT',
                amount:
                  '9600.0000',
                currency:
                  'UGX',
                status:
                  'COMPLETED',
                provider_code:
                  null,
                provider_reference:
                  '',
                description:
                  'Market settlement payout — Will KCCA win?',
                completed_at:
                  '2026-08-19T12:00:00Z',
                created_at:
                  '2026-08-19T12:00:00Z',
                updated_at:
                  '2026-08-19T12:00:00Z',
              },
              {
                id:
                  'tx-3',
                reference:
                  'REFUND-1',
                transaction_type:
                  'VOID_REFUND',
                amount:
                  '2000.0000',
                currency:
                  'UGX',
                status:
                  'COMPLETED',
                provider_code:
                  null,
                provider_reference:
                  '',
                description:
                  '',
                completed_at:
                  '2026-08-19T12:05:00Z',
                created_at:
                  '2026-08-19T12:05:00Z',
                updated_at:
                  '2026-08-19T12:05:00Z',
              },
            ],
          },
        });

        await expect(
          fetchFanWalletTransactions(),
        ).resolves.toEqual([
          expect.objectContaining({
            type:
              'credit',
            amount:
              9_600,
            label:
              'Market settlement payout — Will KCCA win?',
          }),
          expect.objectContaining({
            type:
              'credit',
            amount:
              2_000,
            label:
              'Void refund',
          }),
        ]);
      },
    );


    it(
      'creates a Pesapal Sandbox wallet deposit through the backend',
      async () => {
        vi.mocked(
          apiClient.post,
        ).mockResolvedValue({
          data: {
            id:
              '4d4439cb-3c90-4e19-b490-fd595277d81d',
            amount:
              '50000.0000',
            currency:
              'UGX',
            status:
              'PENDING',
            created_at:
              '2026-08-16T10:00:00Z',
            expires_at:
              '2026-08-16T10:30:00Z',
            payment_url:
              'https://pay.pesapal.com/checkout/example',
            provider_code:
              'PESAPAL_SANDBOX',
            order_tracking_id:
              'tracking-123',
            provider_status:
              'PENDING',
          },
        });

        const idempotencyKey =
          '2b604cdb-64d3-4baf-ae2a-2b190e543ee5';

        await expect(
          createFanWalletDeposit({
            amount:
              50_000,
            currency:
              'UGX',
            idempotencyKey,
          }),
        ).resolves.toMatchObject({
          amount:
            50_000,
          currency:
            'UGX',
          status:
            'PENDING',
          paymentUrl:
            'https://pay.pesapal.com/checkout/example',
          providerCode:
            'PESAPAL_SANDBOX',
        });

        expect(
          apiClient.post,
        ).toHaveBeenCalledWith(
          '/wallets/deposits/',
          {
            provider_code:
              'PESAPAL_SANDBOX',
            amount:
              50_000,
            currency:
              'UGX',
            idempotency_key:
              idempotencyKey,
          },
        );
      },
    );


    it(
      'loads the authoritative backend status for a deposit intent',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data: {
            id:
              '4d4439cb-3c90-4e19-b490-fd595277d81d',
            amount:
              '50000.0000',
            currency:
              'UGX',
            status:
              'COMPLETED',
            created_at:
              '2026-08-16T10:00:00Z',
            expires_at:
              '2026-08-16T10:30:00Z',
            payment_url:
              'https://pay.pesapal.com/checkout/example',
            provider_code:
              'PESAPAL_SANDBOX',
            order_tracking_id:
              'tracking-123',
            provider_status:
              'COMPLETED',
          },
        });

        await expect(
          fetchFanWalletDeposit(
            '4d4439cb-3c90-4e19-b490-fd595277d81d',
          ),
        ).resolves.toMatchObject({
          status:
            'COMPLETED',
          amount:
            50_000,
          orderTrackingId:
            'tracking-123',
        });

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          '/wallets/deposits/4d4439cb-3c90-4e19-b490-fd595277d81d/',
        );
      },
    );
  },
);
