import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import apiClient from './apiClient.ts';

import {
  fetchFanWallet,
  fetchFanWalletTransactions,
} from './fanWalletApiService.ts';


vi.mock(
  './apiClient.ts',
  () => ({
    default: {
      get:
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
                  'PESAPAL',
                provider_reference:
                  '',
                description:
                  'Wallet deposit',
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
  },
);
