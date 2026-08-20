import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  approveFinanceWithdrawal,
  completeFinanceWithdrawal,
  fetchFinanceWithdrawal,
  fetchFinanceWithdrawals,
} from './FinanceWithdrawalService';

import FinanceWithdrawalQueue from './FinanceWithdrawalQueue';


vi.mock(
  './FinanceWithdrawalService',
  () => ({
    fetchFinanceWithdrawals:
      vi.fn(),
    fetchFinanceWithdrawal:
      vi.fn(),
    approveFinanceWithdrawal:
      vi.fn(),
    rejectFinanceWithdrawal:
      vi.fn(),
    startFinanceWithdrawalProcessing:
      vi.fn(),
    completeFinanceWithdrawal:
      vi.fn(),
    failFinanceWithdrawal:
      vi.fn(),
  }),
);


const pendingWithdrawal = {
  id:
    '11111111-1111-4111-8111-111111111111',
  walletId:
    'wallet-1',
  userId:
    'user-1',
  userEmail:
    'fan@example.com',
  amount:
    50_000,
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
    'PENDING_APPROVAL' as const,
  riskStatus:
    'PASSED',
  riskReasons:
    [],
  approvalMode:
    'PENDING',
  approvalPolicyVersion:
    'v1',
  approvedAt:
    null,
  approvedById:
    null,
  approvedByEmail:
    null,
  rejectionReason:
    '',
  failureReason:
    '',
  transactionId:
    'transaction-1',
  transactionStatus:
    'PENDING',
  providerReference:
    '',
  createdAt:
    '2026-08-17T00:00:00Z',
  updatedAt:
    '2026-08-17T00:00:00Z',
};


describe(
  'FinanceWithdrawalQueue',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      vi.mocked(
        fetchFinanceWithdrawals,
      ).mockResolvedValue([
        pendingWithdrawal,
      ]);

      vi.mocked(
        fetchFinanceWithdrawal,
      ).mockResolvedValue(
        pendingWithdrawal,
      );
    });


    it(
      'renders real fan withdrawal requests instead of reconciliation batches',
      async () => {
        render(
          <FinanceWithdrawalQueue
            search=""
            statusFilter="all"
          />,
        );

        expect(
          await screen.findByText(
            'fan@example.com',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'MTN · 0777123456',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'UGX 50,000',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Pending Approval',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            'Withdrawal Batch',
          ),
        ).not.toBeInTheDocument();

        expect(
          fetchFinanceWithdrawals,
        ).toHaveBeenCalledWith({
          currency:
            'UGX',
        });
      },
    );


    it(
      'approves a pending withdrawal through the privileged API',
      async () => {
        vi.mocked(
          approveFinanceWithdrawal,
        ).mockResolvedValue({
          ...pendingWithdrawal,
          status:
            'APPROVED',
          approvalMode:
            'MANUAL',
          approvedAt:
            '2026-08-17T00:05:00Z',
          approvedById:
            'finance-user',
          approvedByEmail:
            'finance@example.com',
        });

        render(
          <FinanceWithdrawalQueue
            search=""
            statusFilter="all"
          />,
        );

        fireEvent.click(
          await screen.findByRole(
            'button',
            {
              name:
                'View Details',
            },
          ),
        );

        expect(
          await screen.findByText(
            'Withdrawal Request',
          ),
        ).toBeInTheDocument();

        const approveButton =
          screen.getByRole(
            'button',
            {
              name:
                'Approve Withdrawal',
            },
          );

        await waitFor(() =>
          expect(
            approveButton,
          ).toBeEnabled(),
        );

        fireEvent.click(
          approveButton,
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Confirm Approval',
            },
          ),
        );

        await waitFor(() => {
          expect(
            approveFinanceWithdrawal,
          ).toHaveBeenCalledWith(
            pendingWithdrawal.id,
          );
        });

        expect(
          await screen.findByText(
            'Withdrawal is now Approved.',
          ),
        ).toBeInTheDocument();
      },
    );


    it(
      'completes a processing withdrawal with an external payout reference',
      async () => {
        const processingWithdrawal = {
          ...pendingWithdrawal,
          status:
            'PROCESSING' as const,
          transactionStatus:
            'PENDING',
        };

        vi.mocked(
          fetchFinanceWithdrawals,
        ).mockResolvedValue([
          processingWithdrawal,
        ]);

        vi.mocked(
          fetchFinanceWithdrawal,
        ).mockResolvedValue(
          processingWithdrawal,
        );

        vi.mocked(
          completeFinanceWithdrawal,
        ).mockResolvedValue({
          ...processingWithdrawal,
          status:
            'COMPLETED',
          transactionStatus:
            'COMPLETED',
          providerReference:
            'MTN-PAYOUT-001',
        });

        render(
          <FinanceWithdrawalQueue
            search=""
            statusFilter="all"
          />,
        );

        fireEvent.click(
          await screen.findByRole(
            'button',
            {
              name:
                'View Details',
            },
          ),
        );

        const completeButton =
          await screen.findByRole(
            'button',
            {
              name:
                'Complete Payout',
            },
          );

        await waitFor(() =>
          expect(
            completeButton,
          ).toBeEnabled(),
        );

        fireEvent.click(
          completeButton,
        );

        fireEvent.change(
          screen.getByLabelText(
            'Provider payout reference',
          ),
          {
            target: {
              value:
                'MTN-PAYOUT-001',
            },
          },
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Confirm Completion',
            },
          ),
        );

        await waitFor(() => {
          expect(
            completeFinanceWithdrawal,
          ).toHaveBeenCalledWith(
            pendingWithdrawal.id,
            'MTN-PAYOUT-001',
          );
        });

        expect(
          await screen.findByText(
            'MTN-PAYOUT-001',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Withdrawal is now Completed.',
          ),
        ).toBeInTheDocument();
      },
    );
  },
);
