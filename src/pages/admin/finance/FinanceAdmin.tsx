import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import AdminLayout from '../../../components/admin/AdminLayout';

import {
  getFinancePage,
  type FinancePage,
  type FinanceResource,
} from './FinanceService';

import './FinanceAdmin.css';


type FinanceRow =
  Record<string, unknown>;

type Column = {
  label: string;
  className?: string;
  render: (
    row: FinanceRow,
  ) => ReactNode;
};


const queues: Array<{
  key: FinanceResource;
  label: string;
}> = [
  {
    key: 'deposits',
    label: 'Deposits',
  },
  {
    key: 'wallet_transactions',
    label: 'Wallet Transactions',
  },
  {
    key: 'settlements',
    label: 'Settlements',
  },
  {
    key: 'settlement_participants',
    label: 'Settlement Participants',
  },
  {
    key: 'refunds',
    label: 'Void Refunds',
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
  },
  {
    key: 'club_commerce',
    label: 'Club Commerce',
  },
  {
    key: 'reconciliation_exceptions',
    label: 'Reconciliation Exceptions',
  },
];


function pick(
  row: FinanceRow,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    const value =
      row[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
}


function text(
  value: unknown,
): string {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—';
  }

  return String(
    value,
  );
}


function formatMoney(
  value: unknown,
  currency = 'UGX',
): string {
  const amount =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      amount,
    )
  ) {
    return '—';
  }

  return `${currency} ${Math.round(
    amount,
  ).toLocaleString(
    'en-UG',
  )}`;
}


function formatDate(
  value: unknown,
): string {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      String(
        value,
      ),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(
      value,
    );
  }

  return date.toLocaleString(
    'en-UG',
    {
      day:
        'numeric',
      month:
        'short',
      year:
        'numeric',
      hour:
        '2-digit',
      minute:
        '2-digit',
    },
  );
}


function formatStatus(
  value: unknown,
): string {
  return text(
    value,
  )
    .replaceAll(
      '_',
      ' ',
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}


function statusClass(
  value: unknown,
): string {
  return text(
    value,
  )
    .toLowerCase()
    .replaceAll(
      '_',
      '-',
    )
    .replaceAll(
      ' ',
      '-',
    );
}


function StatusPill({
  value,
}: {
  value: unknown;
}) {
  return (
    <span
      className={
        `fa-pill fa-pill--${statusClass(
          value,
        )}`
      }
    >
      {formatStatus(
        value,
      )}
    </span>
  );
}


function moneyFromRow(
  row: FinanceRow,
  ...keys: string[]
): string {
  return formatMoney(
    pick(
      row,
      ...keys,
    ),
    text(
      pick(
        row,
        'currency',
      ),
    ) === '—'
      ? 'UGX'
      : text(
          row.currency,
        ),
  );
}


function columnsFor(
  resource: FinanceResource,
): Column[] {
  switch (
    resource
  ) {
    case 'deposits':
    case 'wallet_transactions':
      return [
        {
          label:
            'User',
          render:
            (row) =>
              text(
                row.fan,
              ),
        },
        {
          label:
            'Type',
          render:
            (row) =>
              formatStatus(
                pick(
                  row,
                  'type',
                ),
              ),
        },
        {
          label:
            'Amount',
          render:
            (row) =>
              moneyFromRow(
                row,
                'amount',
              ),
        },
        {
          label:
            'Status',
          render:
            (row) => (
              <StatusPill
                value={
                  row.status
                }
              />
            ),
        },
        {
          label:
            'Provider',
          render:
            (row) =>
              text(
                row.provider,
              ),
        },
        {
          label:
            'Reference',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                pick(
                  row,
                  'internal_reference',
                  'reference',
                  'provider_reference',
                ),
              ),
        },
        {
          label:
            'Date',
          render:
            (row) =>
              formatDate(
                pick(
                  row,
                  'completed_at',
                  'created_at',
                ),
              ),
        },
      ];

    case 'settlements':
      return [
        {
          label:
            'Market',
          render:
            (row) =>
              text(
                row.market,
              ),
        },
        {
          label:
            'Winning Outcome',
          render:
            (row) =>
              text(
                row.winning_outcome,
              ),
        },
        {
          label:
            'Participants',
          render:
            (row) =>
              text(
                row.participant_count,
              ),
        },
        {
          label:
            'Gross Payout',
          render:
            (row) =>
              formatMoney(
                row.gross_payout,
              ),
        },
        {
          label:
            'Settlement ID',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                row.id,
              ),
        },
        {
          label:
            'Settled',
          render:
            (row) =>
              formatDate(
                row.settled_at,
              ),
        },
      ];

    case 'settlement_participants':
      return [
        {
          label:
            'Fan',
          render:
            (row) =>
              text(
                row.fan,
              ),
        },
        {
          label:
            'Market',
          render:
            (row) =>
              text(
                row.market,
              ),
        },
        {
          label:
            'Outcome',
          render:
            (row) =>
              text(
                row.outcome,
              ),
        },
        {
          label:
            'Result',
          render:
            (row) => (
              <StatusPill
                value={
                  row.status
                }
              />
            ),
        },
        {
          label:
            'Quantity',
          render:
            (row) =>
              text(
                row.quantity,
              ),
        },
        {
          label:
            'Gross',
          render:
            (row) =>
              formatMoney(
                row.gross,
              ),
        },
        {
          label:
            'Fees',
          render:
            (row) =>
              formatMoney(
                row.fees,
              ),
        },
        {
          label:
            'Net',
          render:
            (row) =>
              formatMoney(
                row.net,
              ),
        },
        {
          label:
            'Ledger Reference',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                row.ledger_reference,
              ),
        },
        {
          label:
            'Date',
          render:
            (row) =>
              formatDate(
                row.created_at,
              ),
        },
      ];

    case 'refunds':
      return [
        {
          label:
            'Fan',
          render:
            (row) =>
              text(
                row.fan,
              ),
        },
        {
          label:
            'Market',
          render:
            (row) =>
              text(
                row.market,
              ),
        },
        {
          label:
            'Gross Refund',
          render:
            (row) =>
              formatMoney(
                row.gross,
              ),
        },
        {
          label:
            'Fees',
          render:
            (row) =>
              formatMoney(
                row.fees,
              ),
        },
        {
          label:
            'Net Refund',
          render:
            (row) =>
              formatMoney(
                row.net,
              ),
        },
        {
          label:
            'Ledger Reference',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                row.ledger_reference,
              ),
        },
        {
          label:
            'Date',
          render:
            (row) =>
              formatDate(
                row.created_at,
              ),
        },
      ];

    case 'withdrawals':
      return [
        {
          label:
            'Fan',
          render:
            (row) =>
              text(
                row.fan,
              ),
        },
        {
          label:
            'Amount',
          render:
            (row) =>
              moneyFromRow(
                row,
                'amount',
              ),
        },
        {
          label:
            'Status',
          render:
            (row) => (
              <StatusPill
                value={
                  row.status
                }
              />
            ),
        },
        {
          label:
            'Risk',
          render:
            (row) =>
              formatStatus(
                row.risk_status,
              ),
        },
        {
          label:
            'Reference',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                pick(
                  row,
                  'reference',
                  'transaction_reference',
                  'id',
                ),
              ),
        },
        {
          label:
            'Date',
          render:
            (row) =>
              formatDate(
                pick(
                  row,
                  'created_at',
                  'updated_at',
                ),
              ),
        },
      ];

    case 'club_commerce':
      return [
        {
          label:
            'Club',
          render:
            (row) =>
              text(
                row.club,
              ),
        },
        {
          label:
            'Fan',
          render:
            (row) =>
              text(
                row.fan,
              ),
        },
        {
          label:
            'Amount',
          render:
            (row) =>
              moneyFromRow(
                row,
                'total_amount',
                'amount',
              ),
        },
        {
          label:
            'Status',
          render:
            (row) => (
              <StatusPill
                value={
                  pick(
                    row,
                    'status',
                    'payment_status',
                  )
                }
              />
            ),
        },
        {
          label:
            'Payment Reference',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                pick(
                  row,
                  'payment_reference',
                  'reference',
                  'id',
                ),
              ),
        },
        {
          label:
            'Date',
          render:
            (row) =>
              formatDate(
                row.created_at,
              ),
        },
      ];

    case 'reconciliation_exceptions':
      return [
        {
          label:
            'Code',
          className:
            'fa-mono',
          render:
            (row) =>
              text(
                pick(
                  row,
                  'code',
                  'id',
                ),
              ),
        },
        {
          label:
            'Market / Source',
          render:
            (row) =>
              text(
                pick(
                  row,
                  'market',
                  'source_id',
                  'description',
                ),
              ),
        },
        {
          label:
            'Status',
          render:
            (row) => (
              <StatusPill
                value={
                  pick(
                    row,
                    'status',
                    'severity',
                    'OPEN',
                  )
                }
              />
            ),
        },
        {
          label:
            'Detected',
          render:
            (row) =>
              formatDate(
                pick(
                  row,
                  'detected_at',
                  'created_at',
                ),
              ),
        },
      ];
  }
}


export default function FinanceAdminDashboard() {
  const [
    resource,
    setResource,
  ] =
    useState<FinanceResource>(
      'deposits',
    );

  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      '',
    );

  const [
    status,
    setStatus,
  ] =
    useState(
      '',
    );

  const [
    dateFrom,
    setDateFrom,
  ] =
    useState(
      '',
    );

  const [
    dateTo,
    setDateTo,
  ] =
    useState(
      '',
    );

  const [
    data,
    setData,
  ] =
    useState<FinancePage | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState(
      '',
    );


  useEffect(() => {
    let active =
      true;

    queueMicrotask(() => {
      if (!active) {
        return;
      }

      setLoading(
        true,
      );

      setError(
        '',
      );

      /*
       * Deliberately clear the previous resource so that a failed
       * request cannot leave stale table rows or pagination visible.
       */
      setData(
        null,
      );
    });

    getFinancePage({
      resource,
      page,
      page_size:
        25,
      search,
      status,
      date_from:
        dateFrom,
      date_to:
        dateTo,
    })
      .then(
        (
          value,
        ) => {
          if (
            active
          ) {
            setData(
              value,
            );
          }
        },
      )
      .catch(
        (
          reason: unknown,
        ) => {
          if (
            active
          ) {
            setError(
              reason instanceof
              Error
                ? reason.message
                : 'Could not load finance data.',
            );
          }
        },
      )
      .finally(
        () => {
          if (
            active
          ) {
            setLoading(
              false,
            );
          }
        },
      );

    return () => {
      active =
        false;
    };
  }, [
    resource,
    page,
    search,
    status,
    dateFrom,
    dateTo,
  ]);


  const changeQueue = (
    value: FinanceResource,
  ) => {
    setResource(
      value,
    );

    setPage(
      1,
    );

    setStatus(
      '',
    );

    setSearch(
      '',
    );
  };


  const columns =
    columnsFor(
      resource,
    );


  return (
    <AdminLayout>
      <main className="finance-admin-dashboard fa-content">
        <header className="fa-header">
          <div>
            <h1 className="fa-header__title">
              Finance
            </h1>

            <p className="fa-header__subtitle">
              Canonical wallet, market settlement,
              withdrawal and club-commerce oversight.
              Financial records are ledger-backed and auditable.
            </p>
          </div>

          <div className="fa-header__meta">
            <span className="fa-header__badge">
              Read-only financial oversight
            </span>

            <span className="fa-header__updated">
              No direct wallet-balance editing
            </span>
          </div>
        </header>


        {data && (
          <section className="fa-grid--cards">
            <article className="fa-card">
              <div className="fa-card__value">
                {formatMoney(
                  data.overview.deposit_total,
                )}
              </div>

              <div className="fa-card__title">
                Deposits
              </div>

              <div className="fa-card__desc">
                {data.overview.deposit_count}{' '}
                recorded deposits
              </div>
            </article>


            <article className="fa-card">
              <div className="fa-card__value">
                {formatMoney(
                  data.overview.settlement_gross_total,
                )}
              </div>

              <div className="fa-card__title">
                Market Settlements
              </div>

              <div className="fa-card__desc">
                {data.overview.settlement_count}{' '}
                completed settlement batches
              </div>
            </article>


            <article className="fa-card">
              <div className="fa-card__value">
                {formatMoney(
                  data.overview.withdrawal_total,
                )}
              </div>

              <div className="fa-card__title">
                Withdrawals
              </div>

              <div className="fa-card__desc">
                {data.overview.withdrawal_count}{' '}
                withdrawal requests
              </div>
            </article>


            <article className="fa-card">
              <div className="fa-card__value">
                {formatMoney(
                  data.overview.refund_total,
                )}
              </div>

              <div className="fa-card__title">
                Void Refunds
              </div>

              <div className="fa-card__desc">
                {data.overview.refund_count}{' '}
                completed refunds
              </div>
            </article>


            <article className="fa-card">
              <div className="fa-card__value">
                {formatMoney(
                  data.overview.club_commerce_total,
                )}
              </div>

              <div className="fa-card__title">
                Club Commerce
              </div>

              <div className="fa-card__desc">
                {data.overview.club_commerce_count}{' '}
                commerce records
              </div>
            </article>


            <article className="fa-card">
              <div className="fa-card__value">
                {
                  data.overview
                    .reconciliation_exception_count
                }
              </div>

              <div className="fa-card__title">
                Reconciliation Exceptions
              </div>

              <div className="fa-card__desc">
                Items requiring financial review
              </div>
            </article>
          </section>
        )}


        <section className="fa-panel">
          <div className="fa-panel__header">
            <div>
              <h2>
                Financial Records
              </h2>

              <span className="fa-panel__hint">
                Search and inspect authoritative
                records without changing balances.
              </span>
            </div>
          </div>


          <nav
            className="fa-tabs"
            aria-label="Finance reports"
          >
            {queues.map(
              (
                queue,
              ) => (
                <button
                  key={
                    queue.key
                  }
                  type="button"
                  className={
                    resource ===
                    queue.key
                      ? 'fa-tab fa-tab--active'
                      : 'fa-tab'
                  }
                  onClick={() =>
                    changeQueue(
                      queue.key,
                    )
                  }
                >
                  {
                    queue.label
                  }
                </button>
              ),
            )}
          </nav>


          <div className="fa-filters">
            <input
              className="fa-filters__search"
              aria-label="Search finance"
              placeholder="User, market, reference, provider or club"
              value={
                search
              }
              onChange={
                (
                  event,
                ) => {
                  setSearch(
                    event.target.value,
                  );

                  setPage(
                    1,
                  );
                }
              }
            />

            <input
              className="fa-filters__select"
              aria-label="Date from"
              type="date"
              value={
                dateFrom
              }
              onChange={
                (
                  event,
                ) => {
                  setDateFrom(
                    event.target.value,
                  );

                  setPage(
                    1,
                  );
                }
              }
            />

            <input
              className="fa-filters__select"
              aria-label="Date to"
              type="date"
              value={
                dateTo
              }
              onChange={
                (
                  event,
                ) => {
                  setDateTo(
                    event.target.value,
                  );

                  setPage(
                    1,
                  );
                }
              }
            />

            <input
              className="fa-filters__select"
              aria-label="Status"
              placeholder="Status"
              value={
                status
              }
              onChange={
                (
                  event,
                ) => {
                  setStatus(
                    event.target.value,
                  );

                  setPage(
                    1,
                  );
                }
              }
            />
          </div>


          {resource ===
            'refunds' && (
            <p className="fa-panel__note">
              Void refunds are completed canonical
              ledger records. They are not manually
              editable from this report.
            </p>
          )}


          {resource ===
            'reconciliation_exceptions' && (
            <p className="fa-panel__note">
              Reconciliation exceptions remain
              read-only until a persisted case
              workflow is available.
            </p>
          )}


          {error ? (
            <div
              role="alert"
              className="fa-error"
            >
              {error}
            </div>
          ) : loading ? (
            <div className="fa-loading">
              Loading finance records…
            </div>
          ) : !data ? (
            <div className="fa-empty--panel">
              Finance data is unavailable.
            </div>
          ) : data.results.length ===
            0 ? (
            <div className="fa-empty--panel">
              No records match these filters.
            </div>
          ) : (
            <div className="fa-table-wrap">
              <table className="fa-table">
                <thead>
                  <tr>
                    {columns.map(
                      (
                        column,
                      ) => (
                        <th
                          key={
                            column.label
                          }
                        >
                          {
                            column.label
                          }
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {data.results.map(
                    (
                      row,
                      index,
                    ) => (
                      <tr
                        key={
                          text(
                            row.id ??
                              index,
                          )
                        }
                        className="fa-row-static"
                      >
                        {columns.map(
                          (
                            column,
                          ) => (
                            <td
                              key={
                                column.label
                              }
                              className={
                                column.className
                              }
                            >
                              {
                                column.render(
                                  row,
                                )
                              }
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}


          {data && (
            <footer className="fa-pagination">
              <button
                type="button"
                className="fa-btn fa-btn--ghost"
                disabled={
                  page <=
                  1
                }
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      current -
                      1,
                  )
                }
              >
                Previous
              </button>

              <span>
                Page{' '}
                {
                  data.page
                }{' '}
                of{' '}
                {
                  data.total_pages
                }
                {' · '}
                {
                  data.count
                }{' '}
                records
              </span>

              <button
                type="button"
                className="fa-btn fa-btn--ghost"
                disabled={
                  page >=
                  data.total_pages
                }
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      current +
                      1,
                  )
                }
              >
                Next
              </button>
            </footer>
          )}
        </section>
      </main>
    </AdminLayout>
  );
}
