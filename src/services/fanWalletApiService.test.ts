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
      'loads canonical ledger-backed wallet activity',
      async () => {
        vi.mocked(
          apiClient.get,
        ).mockResolvedValue({
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id:
                  'ledger-1',
                entry_type:
                  'CREDIT',
                debit_account:
                  'REVENUE',
                credit_account:
                  'USER_WALLET',
                amount:
                  '16528.9256',
                currency:
                  'UGX',
                available_balance_before:
                  '179834.7107',
                available_balance_after:
                  '196363.6363',
                reserved_balance_before:
                  '0.0000',
                reserved_balance_after:
                  '0.0000',
                idempotency_reference:
                  '941dbc7c-f5e5-5a29-92a2-5fe216d94713',
                market:
                  '71b0bcb3-f1f0-4da3-97ae-3b3c1d54e7c4',
                market_question:
                  'LOCAL QA: Will City Oilers beat Namuwongo Blazers?',
                order:
                  null,
                fill:
                  null,
                transaction_reference:
                  null,
                created_at:
                  '2026-09-07T17:01:18Z',
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
            label:
              'Market winnings · LOCAL QA: Will City Oilers beat Namuwongo Blazers?',
            amount:
              16528.9256,
            status:
              'COMPLETED',
          }),
        ]);

        expect(
          apiClient.get,
        ).toHaveBeenCalledWith(
          '/wallets/UGX/ledger/',
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
