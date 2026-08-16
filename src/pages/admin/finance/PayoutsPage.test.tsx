import type {
  ReactNode,
} from 'react';

import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import PayoutsPage from './PayoutsPage';


vi.mock(
  '../../../components/admin/AdminLayout',
  () => ({
    default: ({
      children,
    }: {
      children: ReactNode;
    }) => (
      <div data-testid="admin-layout">
        {children}
      </div>
    ),
  }),
);


vi.mock(
  './FinanceWithdrawalQueue',
  () => ({
    default: ({
      search,
      statusFilter,
    }: {
      search: string;
      statusFilter: string;
    }) => (
      <div
        data-testid="withdrawal-queue"
        data-search={search}
        data-status={statusFilter}
      >
        Real withdrawal queue
      </div>
    ),
  }),
);


describe(
  'PayoutsPage',
  () => {
    it(
      'renders the dedicated real withdrawal workflow without reconciliation mock sections',
      () => {
        render(
          <PayoutsPage />,
        );

        expect(
          screen.getByRole(
            'heading',
            {
              name:
                'Wallet Payouts',
            },
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Withdrawal Requests',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByTestId(
            'withdrawal-queue',
          ),
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            'Financial Oversight & Reconciliation',
          ),
        ).not.toBeInTheDocument();

        expect(
          screen.queryByText(
            'Fund Segregation Report',
          ),
        ).not.toBeInTheDocument();

        expect(
          screen.queryByText(
            'Controlled Refund Approvals',
          ),
        ).not.toBeInTheDocument();
      },
    );


    it(
      'passes search and status filters to the real withdrawal queue',
      () => {
        render(
          <PayoutsPage />,
        );

        const search =
          screen.getByRole(
            'searchbox',
            {
              name:
                'Search withdrawal requests',
            },
          );

        fireEvent.change(
          search,
          {
            target: {
              value:
                'fan.b.local',
            },
          },
        );

        const status =
          screen.getByRole(
            'combobox',
            {
              name:
                'Filter withdrawal status',
            },
          );

        fireEvent.change(
          status,
          {
            target: {
              value:
                'PENDING_APPROVAL',
            },
          },
        );

        expect(
          screen.getByTestId(
            'withdrawal-queue',
          ),
        ).toHaveAttribute(
          'data-search',
          'fan.b.local',
        );

        expect(
          screen.getByTestId(
            'withdrawal-queue',
          ),
        ).toHaveAttribute(
          'data-status',
          'PENDING_APPROVAL',
        );
      },
    );
  },
);
