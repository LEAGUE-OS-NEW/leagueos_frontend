import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  approveFinanceWithdrawal,
  completeFinanceWithdrawal,
  failFinanceWithdrawal,
  fetchFinanceWithdrawal,
  fetchFinanceWithdrawals,
  rejectFinanceWithdrawal,
  startFinanceWithdrawalProcessing,
  type FinanceWithdrawal,
} from './FinanceWithdrawalService';


interface FinanceWithdrawalQueueProps {
  search: string;
  statusFilter: string;
}


type WithdrawalAction =
  | 'approve'
  | 'reject'
  | 'processing'
  | 'complete'
  | 'fail';


interface WithdrawalActionDraft {
  type: WithdrawalAction;
  withdrawalId: string;
  value: string;
}


function formatUGX(
  value: number,
): string {
  return `UGX ${Math.round(
    value,
  ).toLocaleString(
    'en-UG',
  )}`;
}


function formatDate(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
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


function statusLabel(
  status: string,
): string {
  return status
    .replaceAll(
      '_',
      ' ',
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        value,
      ) =>
        value.toUpperCase(),
    );
}


function destinationValue(
  withdrawal: FinanceWithdrawal,
  key: string,
): string {
  const value =
    withdrawal.destination[
      key
    ];

  return typeof value ===
    'string'
    ? value
    : '';
}


function StatusPill({
  status,
}: {
  status: string;
}) {
  const className =
    status
      .toLowerCase()
      .replaceAll(
        '_',
        '-',
      );

  return (
    <span
      className={
        `fa-pill fa-pill--${className}`
      }
    >
      {statusLabel(
        status,
      )}
    </span>
  );
}


function FinanceWithdrawalQueue({
  search,
  statusFilter,
}: FinanceWithdrawalQueueProps) {
  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<
      FinanceWithdrawal[]
    >(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    loadError,
    setLoadError,
  ] =
    useState(
      '',
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false,
    );

  const [
    detailError,
    setDetailError,
  ] =
    useState(
      '',
    );

  const [
    processingId,
    setProcessingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    actionDraft,
    setActionDraft,
  ] =
    useState<WithdrawalActionDraft | null>(
      null,
    );

  const [
    actionError,
    setActionError,
  ] =
    useState(
      '',
    );

  const [
    actionNotice,
    setActionNotice,
  ] =
    useState(
      '',
    );


  useEffect(() => {
    let cancelled =
      false;

    fetchFinanceWithdrawals({
      currency:
        'UGX',
    })
      .then(
        (
          records,
        ) => {
          if (
            !cancelled
          ) {
            setWithdrawals(
              records,
            );
          }
        },
      )
      .catch(
        (
          error,
        ) => {
          if (
            !cancelled
          ) {
            setLoadError(
              error instanceof
              Error
                ? error.message
                : 'Could not load withdrawal requests.',
            );
          }
        },
      )
      .finally(() => {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, []);


  const filteredWithdrawals =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return withdrawals.filter(
        (
          withdrawal,
        ) => {
          if (
            statusFilter !==
              'all' &&
            withdrawal.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            !query
          ) {
            return true;
          }

          const searchable = [
            withdrawal.id,
            withdrawal.userEmail,
            destinationValue(
              withdrawal,
              'network',
            ),
            destinationValue(
              withdrawal,
              'mobile_money_number',
            ),
            destinationValue(
              withdrawal,
              'account_name',
            ),
            withdrawal.providerReference,
          ]
            .join(
              ' ',
            )
            .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      withdrawals,
      search,
      statusFilter,
    ]);


  const selectedWithdrawal =
    useMemo(
      () =>
        withdrawals.find(
          (
            withdrawal,
          ) =>
            withdrawal.id ===
            selectedId,
        ) ?? null,
      [
        withdrawals,
        selectedId,
      ],
    );


  function replaceWithdrawal(
    updated: FinanceWithdrawal,
  ) {
    setWithdrawals(
      (
        current,
      ) =>
        current.map(
          (
            withdrawal,
          ) =>
            withdrawal.id ===
            updated.id
              ? updated
              : withdrawal,
        ),
    );
  }


  async function openWithdrawal(
    withdrawalId: string,
  ) {
    setSelectedId(
      withdrawalId,
    );

    setDetailLoading(
      true,
    );

    setDetailError(
      '',
    );

    setActionNotice(
      '',
    );

    try {
      const detail =
        await fetchFinanceWithdrawal(
          withdrawalId,
        );

      replaceWithdrawal(
        detail,
      );
    } catch (
      error
    ) {
      setDetailError(
        error instanceof
        Error
          ? error.message
          : 'Could not refresh this withdrawal request.',
      );
    } finally {
      setDetailLoading(
        false,
      );
    }
  }


  function beginAction(
    type: WithdrawalAction,
    withdrawalId: string,
  ) {
    setActionError(
      '',
    );

    setActionNotice(
      '',
    );

    setActionDraft({
      type,
      withdrawalId,
      value:
        '',
    });
  }


  function actionTitle(
    type: WithdrawalAction,
  ): string {
    switch (
      type
    ) {
      case 'approve':
        return 'Approve withdrawal';

      case 'reject':
        return 'Reject withdrawal';

      case 'processing':
        return 'Start payout processing';

      case 'complete':
        return 'Complete payout';

      case 'fail':
        return 'Mark payout failed';
    }
  }


  function actionDescription(
    type: WithdrawalAction,
  ): string {
    switch (
      type
    ) {
      case 'approve':
        return 'Approve this withdrawal request. Funds will remain reserved until payout completion or failure.';

      case 'reject':
        return 'Reject this request and return the reserved amount to the fan wallet.';

      case 'processing':
        return 'Confirm that manual payout processing is now starting.';

      case 'complete':
        return 'Enter the external Mobile Money payout reference before completing the withdrawal.';

      case 'fail':
        return 'Record why the payout failed. Reserved funds will be returned to the fan wallet.';
    }
  }


  function actionConfirmLabel(
    type: WithdrawalAction,
  ): string {
    switch (
      type
    ) {
      case 'approve':
        return 'Confirm Approval';

      case 'reject':
        return 'Reject Withdrawal';

      case 'processing':
        return 'Start Processing';

      case 'complete':
        return 'Confirm Completion';

      case 'fail':
        return 'Mark Failed';
    }
  }


  function actionNeedsValue(
    type: WithdrawalAction,
  ): boolean {
    return (
      type ===
        'reject' ||
      type ===
        'complete' ||
      type ===
        'fail'
    );
  }


  async function submitAction() {
    if (
      !actionDraft
    ) {
      return;
    }

    const value =
      actionDraft.value.trim();

    if (
      actionNeedsValue(
        actionDraft.type,
      ) &&
      !value
    ) {
      setActionError(
        actionDraft.type ===
        'complete'
          ? 'Enter the external payout reference.'
          : 'Enter a reason before continuing.',
      );

      return;
    }

    setProcessingId(
      actionDraft.withdrawalId,
    );

    setActionError(
      '',
    );

    setActionNotice(
      '',
    );

    try {
      let updated:
        FinanceWithdrawal;

      switch (
        actionDraft.type
      ) {
        case 'approve':
          updated =
            await approveFinanceWithdrawal(
              actionDraft.withdrawalId,
            );
          break;

        case 'reject':
          updated =
            await rejectFinanceWithdrawal(
              actionDraft.withdrawalId,
              value,
            );
          break;

        case 'processing':
          updated =
            await startFinanceWithdrawalProcessing(
              actionDraft.withdrawalId,
            );
          break;

        case 'complete':
          updated =
            await completeFinanceWithdrawal(
              actionDraft.withdrawalId,
              value,
            );
          break;

        case 'fail':
          updated =
            await failFinanceWithdrawal(
              actionDraft.withdrawalId,
              value,
            );
          break;
      }

      replaceWithdrawal(
        updated,
      );

      setActionNotice(
        `Withdrawal is now ${statusLabel(
          updated.status,
        )}.`,
      );

      setActionDraft(
        null,
      );
    } catch (
      error
    ) {
      setActionError(
        error instanceof
        Error
          ? error.message
          : 'Could not update this withdrawal request.',
      );
    } finally {
      setProcessingId(
        null,
      );
    }
  }


  return (
    <>
      <table className="fa-table">
        <thead>
          <tr>
            <th>
              Request
            </th>

            <th>
              Fan
            </th>

            <th>
              Destination
            </th>

            <th>
              Amount
            </th>

            <th>
              Risk
            </th>

            <th>
              Status
            </th>

            <th>
              Requested
            </th>

            <th>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={
                  8
                }
                className="fa-empty"
              >
                Loading withdrawal requests…
              </td>
            </tr>
          ) : loadError ? (
            <tr>
              <td
                colSpan={
                  8
                }
                className="fa-empty"
              >
                {loadError}
              </td>
            </tr>
          ) : filteredWithdrawals.length ===
            0 ? (
            <tr>
              <td
                colSpan={
                  8
                }
                className="fa-empty"
              >
                No withdrawal requests match your filters.
              </td>
            </tr>
          ) : (
            filteredWithdrawals.map(
              (
                withdrawal,
              ) => (
                <tr
                  key={
                    withdrawal.id
                  }
                  className="fa-row-static"
                >
                  <td className="fa-mono">
                    {withdrawal.id}
                  </td>

                  <td>
                    {withdrawal.userEmail}
                  </td>

                  <td>
                    {destinationValue(
                      withdrawal,
                      'network',
                    ) || 'Mobile Money'}
                    {' · '}
                    {destinationValue(
                      withdrawal,
                      'mobile_money_number',
                    ) || 'Unavailable'}
                  </td>

                  <td>
                    {formatUGX(
                      withdrawal.amount,
                    )}
                  </td>

                  <td>
                    {withdrawal.riskStatus ||
                      'Not assessed'}
                  </td>

                  <td>
                    <StatusPill
                      status={
                        withdrawal.status
                      }
                    />
                  </td>

                  <td>
                    {formatDate(
                      withdrawal.createdAt,
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="fa-btn fa-btn--ghost"
                      onClick={() => {
                        void openWithdrawal(
                          withdrawal.id,
                        );
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
      </table>


      {selectedWithdrawal && (
        <div
          className="fa-drawer-overlay"
          onClick={() =>
            setSelectedId(
              null,
            )
          }
        >
          <div
            className="fa-drawer"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="fa-drawer__header">
              <h3>
                Withdrawal Request
              </h3>

              <button
                type="button"
                className="fa-drawer__close"
                aria-label="Close withdrawal details"
                onClick={() =>
                  setSelectedId(
                    null,
                  )
                }
              >
                ✕
              </button>
            </div>

            <div className="fa-drawer__section">
              <h4>
                Request Information
              </h4>

              <div className="fa-drawer__grid">
                <div>
                  <span className="fa-label">
                    Request ID
                  </span>

                  <span className="fa-mono">
                    {selectedWithdrawal.id}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Fan
                  </span>

                  <span>
                    {selectedWithdrawal.userEmail}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Amount
                  </span>

                  <span>
                    {formatUGX(
                      selectedWithdrawal.amount,
                    )}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Status
                  </span>

                  <StatusPill
                    status={
                      selectedWithdrawal.status
                    }
                  />
                </div>

                <div>
                  <span className="fa-label">
                    Network
                  </span>

                  <span>
                    {destinationValue(
                      selectedWithdrawal,
                      'network',
                    ) || 'Mobile Money'}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Mobile Money Number
                  </span>

                  <span>
                    {destinationValue(
                      selectedWithdrawal,
                      'mobile_money_number',
                    ) || 'Unavailable'}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Account Name
                  </span>

                  <span>
                    {destinationValue(
                      selectedWithdrawal,
                      'account_name',
                    ) || 'Unavailable'}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Risk Status
                  </span>

                  <span>
                    {selectedWithdrawal.riskStatus ||
                      'Not assessed'}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Transaction Status
                  </span>

                  <span>
                    {selectedWithdrawal.transactionStatus ||
                      'Pending'}
                  </span>
                </div>

                <div>
                  <span className="fa-label">
                    Requested
                  </span>

                  <span>
                    {formatDate(
                      selectedWithdrawal.createdAt,
                    )}
                  </span>
                </div>

                {selectedWithdrawal.approvedByEmail && (
                  <div>
                    <span className="fa-label">
                      Approved By
                    </span>

                    <span>
                      {selectedWithdrawal.approvedByEmail}
                    </span>
                  </div>
                )}

                {selectedWithdrawal.providerReference && (
                  <div>
                    <span className="fa-label">
                      Payout Reference
                    </span>

                    <span className="fa-mono">
                      {selectedWithdrawal.providerReference}
                    </span>
                  </div>
                )}
              </div>

              {detailLoading && (
                <p className="fa-panel__note">
                  Refreshing authoritative withdrawal detail…
                </p>
              )}

              {detailError && (
                <p
                  className="fa-withdrawal-error"
                  role="alert"
                >
                  {detailError}
                </p>
              )}
            </div>


            {(selectedWithdrawal.rejectionReason ||
              selectedWithdrawal.failureReason) && (
              <div className="fa-drawer__section">
                <h4>
                  Outcome
                </h4>

                {selectedWithdrawal.rejectionReason && (
                  <p className="fa-withdrawal-error">
                    Rejected:{' '}
                    {
                      selectedWithdrawal.rejectionReason
                    }
                  </p>
                )}

                {selectedWithdrawal.failureReason && (
                  <p className="fa-withdrawal-error">
                    Failed:{' '}
                    {
                      selectedWithdrawal.failureReason
                    }
                  </p>
                )}
              </div>
            )}


            <div className="fa-drawer__section">
              <h4>
                Actions
              </h4>

              {actionNotice && (
                <p className="fa-panel__note">
                  {actionNotice}
                </p>
              )}

              <div className="fa-actions">
                {selectedWithdrawal.status ===
                  'PENDING_APPROVAL' && (
                  <>
                    <button
                      type="button"
                      className="fa-btn fa-btn--primary"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'approve',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Approve Withdrawal
                    </button>

                    <button
                      type="button"
                      className="fa-btn fa-btn--danger"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'reject',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Reject
                    </button>
                  </>
                )}

                {selectedWithdrawal.status ===
                  'APPROVED' && (
                  <>
                    <button
                      type="button"
                      className="fa-btn fa-btn--primary"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'processing',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Start Processing
                    </button>

                    <button
                      type="button"
                      className="fa-btn fa-btn--danger"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'fail',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Fail Payout
                    </button>
                  </>
                )}

                {selectedWithdrawal.status ===
                  'PROCESSING' && (
                  <>
                    <button
                      type="button"
                      className="fa-btn fa-btn--success"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'complete',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Complete Payout
                    </button>

                    <button
                      type="button"
                      className="fa-btn fa-btn--danger"
                      disabled={
                        processingId ===
                        selectedWithdrawal.id
                      }
                      onClick={() =>
                        beginAction(
                          'fail',
                          selectedWithdrawal.id,
                        )
                      }
                    >
                      Fail Payout
                    </button>
                  </>
                )}

                {[
                  'COMPLETED',
                  'REJECTED',
                  'FAILED',
                ].includes(
                  selectedWithdrawal.status,
                ) && (
                  <span className="fa-panel__note">
                    This withdrawal is in a final state.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {actionDraft && (
        <div className="fa-modal-overlay">
          <div
            className="fa-modal"
            role="dialog"
            aria-modal="true"
          >
            <h3>
              {actionTitle(
                actionDraft.type,
              )}
            </h3>

            <p>
              {actionDescription(
                actionDraft.type,
              )}
            </p>

            {actionDraft.type ===
              'complete' && (
              <textarea
                className="fa-modal__textarea"
                aria-label="Provider payout reference"
                placeholder="External payout reference..."
                value={
                  actionDraft.value
                }
                onChange={(
                  event,
                ) =>
                  setActionDraft({
                    ...actionDraft,
                    value:
                      event.target.value,
                  })
                }
              />
            )}

            {(actionDraft.type ===
              'reject' ||
              actionDraft.type ===
                'fail') && (
              <textarea
                className="fa-modal__textarea"
                aria-label="Withdrawal action reason"
                placeholder="Reason..."
                value={
                  actionDraft.value
                }
                onChange={(
                  event,
                ) =>
                  setActionDraft({
                    ...actionDraft,
                    value:
                      event.target.value,
                  })
                }
              />
            )}

            {actionError && (
              <p
                className="fa-withdrawal-error"
                role="alert"
              >
                {actionError}
              </p>
            )}

            <div className="fa-modal__actions">
              <button
                type="button"
                className="fa-btn fa-btn--ghost"
                disabled={
                  processingId ===
                  actionDraft.withdrawalId
                }
                onClick={() => {
                  setActionDraft(
                    null,
                  );

                  setActionError(
                    '',
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  actionDraft.type ===
                      'reject' ||
                    actionDraft.type ===
                      'fail'
                    ? 'fa-btn fa-btn--danger'
                    : actionDraft.type ===
                        'complete'
                      ? 'fa-btn fa-btn--success'
                      : 'fa-btn fa-btn--primary'
                }
                disabled={
                  processingId ===
                    actionDraft.withdrawalId ||
                  (
                    actionNeedsValue(
                      actionDraft.type,
                    ) &&
                    !actionDraft.value.trim()
                  )
                }
                onClick={() => {
                  void submitAction();
                }}
              >
                {processingId ===
                actionDraft.withdrawalId
                  ? 'Processing…'
                  : actionConfirmLabel(
                      actionDraft.type,
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default FinanceWithdrawalQueue;
