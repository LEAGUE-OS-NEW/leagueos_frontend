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
  createFanWalletWithdrawal,
} from '../../../../services/fanWalletApiService';

import WithdrawModal from './WithdrawModal';


vi.mock(
  '../../../../services/fanWalletApiService',
  () => ({
    createFanWalletWithdrawal:
      vi.fn(),
  }),
);


describe(
  'WithdrawModal',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      vi.mocked(
        createFanWalletWithdrawal,
      ).mockResolvedValue({
        id:
          'withdrawal-1',
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
          'PENDING_APPROVAL',
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
        rejectionReason:
          '',
        failureReason:
          '',
        createdAt:
          '2026-08-16T20:00:00Z',
        updatedAt:
          '2026-08-16T20:00:00Z',
        transactionId:
          'transaction-1',
      });
    });


    it(
      'submits a Mobile Money withdrawal and reports the reserved request',
      async () => {
        const onSubmitted =
          vi.fn();

        render(
          <WithdrawModal
            availableBalance={
              100_000
            }
            onClose={
              vi.fn()
            }
            onSubmitted={
              onSubmitted
            }
          />,
        );

        fireEvent.change(
          screen.getByLabelText(
            'Mobile Money number',
          ),
          {
            target: {
              value:
                '0777 123 456',
            },
          },
        );

        fireEvent.change(
          screen.getByLabelText(
            'Account holder name',
          ),
          {
            target: {
              value:
                'Test Fan',
            },
          },
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Continue',
            },
          ),
        );

        fireEvent.change(
          screen.getByLabelText(
            'Amount to withdraw',
          ),
          {
            target: {
              value:
                '50000',
            },
          },
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Review withdrawal',
            },
          ),
        );

        expect(
          screen.getByText(
            'Balance after reservation',
          ),
        ).toBeInTheDocument();

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Submit withdrawal',
            },
          ),
        );

        expect(
          await screen.findByText(
            'Withdrawal request submitted',
          ),
        ).toBeInTheDocument();

        expect(
          createFanWalletWithdrawal,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            amount:
              50_000,
            currency:
              'UGX',
            network:
              'MTN',
            phoneNumber:
              '0777123456',
            accountName:
              'Test Fan',
            idempotencyKey:
              expect.any(
                String,
              ),
          }),
        );

        await waitFor(() => {
          expect(
            onSubmitted,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              id:
                'withdrawal-1',
              status:
                'PENDING_APPROVAL',
            }),
          );
        });
      },
    );


    it(
      'prevents a withdrawal above the available balance',
      () => {
        render(
          <WithdrawModal
            availableBalance={
              25_000
            }
            onClose={
              vi.fn()
            }
            onSubmitted={
              vi.fn()
            }
          />,
        );

        fireEvent.change(
          screen.getByLabelText(
            'Mobile Money number',
          ),
          {
            target: {
              value:
                '0777123456',
            },
          },
        );

        fireEvent.change(
          screen.getByLabelText(
            'Account holder name',
          ),
          {
            target: {
              value:
                'Test Fan',
            },
          },
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Continue',
            },
          ),
        );

        fireEvent.change(
          screen.getByLabelText(
            'Amount to withdraw',
          ),
          {
            target: {
              value:
                '50000',
            },
          },
        );

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Review withdrawal',
            },
          ),
        );

        expect(
          screen.getByText(
            'Your available balance is UGX 25,000.',
          ),
        ).toBeInTheDocument();

        expect(
          createFanWalletWithdrawal,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
