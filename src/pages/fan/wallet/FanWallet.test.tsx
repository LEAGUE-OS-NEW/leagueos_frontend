import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FanWallet from './FanWallet';
import { useFanWallet } from '../../../hooks/useFanWallet';
import {
  fetchFanWalletDeposit,
  fetchFanWalletTransactions,
  fetchFanWalletWithdrawals,
} from '../../../services/fanWalletApiService';

vi.mock('../../../components/fan/Sidebar', () => ({
  default: () => null,
}));

vi.mock('../sections/Topbar', () => ({
  default: () => null,
}));

vi.mock('../../../components/landing/Footer', () => ({
  default: () => null,
}));

vi.mock('../../../hooks/useFanWallet', () => ({
  useFanWallet: vi.fn(),
}));

vi.mock('../../../services/fanWalletApiService', () => ({
  fetchFanWalletTransactions: vi.fn(),
  fetchFanWalletDeposit: vi.fn(),
  createFanWalletDeposit: vi.fn(),
  createFanWalletWithdrawal: vi.fn(),
  fetchFanWalletWithdrawals: vi.fn(),
}));

describe('FanWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFanWallet).mockReturnValue({
      wallet: null,
      isLoading: false,
      error: '',
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(fetchFanWalletTransactions).mockResolvedValue([]);
    vi.mocked(fetchFanWalletWithdrawals).mockResolvedValue([]);

    vi.mocked(fetchFanWalletDeposit).mockResolvedValue({
      id:
        'deposit-default',
      amount:
        50_000,
      currency:
        'UGX',
      status:
        'PENDING',
      createdAt:
        '2026-08-16T10:00:00Z',
      expiresAt:
        '2026-08-16T10:30:00Z',
      paymentUrl:
        '',
      providerCode:
        'PESAPAL_SANDBOX',
      orderTrackingId:
        '',
      providerStatus:
        'PENDING',
    });
  });


  it(
    'reconciles a completed Pesapal return and refreshes the wallet',
    async () => {
      const refreshWallet =
        vi.fn()
          .mockResolvedValue(
            undefined,
          );

      vi.mocked(
        useFanWallet,
      ).mockReturnValue({
        wallet: {
          id:
            'wallet-1',
          currency:
            'UGX',
          availableBalance:
            100_000,
          reservedBalance:
            0,
          totalBalance:
            100_000,
        },
        isLoading:
          false,
        error:
          '',
        refresh:
          refreshWallet,
      });

      vi.mocked(
        fetchFanWalletDeposit,
      ).mockResolvedValue({
        id:
          '4d4439cb-3c90-4e19-b490-fd595277d81d',
        amount:
          50_000,
        currency:
          'UGX',
        status:
          'COMPLETED',
        createdAt:
          '2026-08-16T10:00:00Z',
        expiresAt:
          '2026-08-16T10:30:00Z',
        paymentUrl:
          '',
        providerCode:
          'PESAPAL_SANDBOX',
        orderTrackingId:
          'tracking-123',
        providerStatus:
          'COMPLETED',
      });

      render(
        <MemoryRouter
          initialEntries={[
            '/wallet?deposit=4d4439cb-3c90-4e19-b490-fd595277d81d&status=completed',
          ]}
        >
          <FanWallet />
        </MemoryRouter>,
      );

      expect(
        await screen.findByText(
          'Wallet top-up completed',
        ),
      ).toBeInTheDocument();

      expect(
        fetchFanWalletDeposit,
      ).toHaveBeenCalledWith(
        '4d4439cb-3c90-4e19-b490-fd595277d81d',
      );

      expect(
        refreshWallet,
      ).toHaveBeenCalledTimes(
        1,
      );
    },
  );


  it('loads the wallet without requiring Markets eligibility', async () => {
    render(
      <MemoryRouter>
        <FanWallet />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No UGX wallet found'),
    ).toBeInTheDocument();

    expect(useFanWallet).toHaveBeenCalledWith('UGX');

    expect(
      screen.queryByText('Identity verification required'),
    ).not.toBeInTheDocument();

    expect(
      fetchFanWalletTransactions,
    ).toHaveBeenCalledTimes(1);
  });


  it(
    'shows authoritative withdrawal request status and failure context',
    async () => {
      vi.mocked(
        useFanWallet,
      ).mockReturnValue({
        wallet: {
          id:
            'wallet-1',
          currency:
            'UGX',
          availableBalance:
            75_000,
          reservedBalance:
            25_000,
          totalBalance:
            100_000,
        },
        isLoading:
          false,
        error:
          '',
        refresh:
          vi.fn().mockResolvedValue(
            undefined,
          ),
      });

      vi.mocked(
        fetchFanWalletWithdrawals,
      ).mockResolvedValue([
        {
          id:
            'withdrawal-1',
          amount:
            25_000,
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
            'FAILED',
          riskStatus:
            'PASSED',
          riskReasons:
            [],
          approvalMode:
            'MANUAL',
          approvalPolicyVersion:
            'v1',
          approvedAt:
            '2026-08-16T20:05:00Z',
          rejectionReason:
            '',
          failureReason:
            'Manual Mobile Money payout failed.',
          createdAt:
            '2026-08-16T20:00:00Z',
          updatedAt:
            '2026-08-16T20:10:00Z',
          transactionId:
            'transaction-1',
        },
      ]);

      render(
        <MemoryRouter>
          <FanWallet />
        </MemoryRouter>,
      );

      expect(
        await screen.findByText(
          'Withdrawal Requests',
        ),
      ).toBeInTheDocument();

      expect(
        await screen.findByText(
          'UGX 25,000',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'MTN · 0777123456',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Failed',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Failed: Manual Mobile Money payout failed.',
        ),
      ).toBeInTheDocument();

      expect(
        fetchFanWalletWithdrawals,
      ).toHaveBeenCalledWith({
        currency:
          'UGX',
      });
    },
  );
});
