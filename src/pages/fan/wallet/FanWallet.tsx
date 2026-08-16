import {
  useEffect,
  useState,
} from 'react';

import {
  useSearchParams,
} from 'react-router-dom';

import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheckCircle,
} from 'react-icons/fi';

import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';

import {
  useFanWallet,
} from '../../../hooks/useFanWallet';

import {
  fetchFanWalletDeposit,
  fetchFanWalletTransactions,
  fetchFanWalletWithdrawals,
  type FanWalletTransaction,
  type FanWalletWithdrawal,
} from '../../../services/fanWalletApiService';

import DepositModal from './sections/DepositModal';
import WithdrawModal from './sections/WithdrawModal';

import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';

import '../sections/FanDashboard.css';
import './FanWallet.css';


function formatUgx(
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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}


function withdrawalStatusLabel(
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
  withdrawal: FanWalletWithdrawal,
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


function FanWallet() {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const depositReturnId =
    searchParams.get(
      'deposit',
    )?.trim() ?? '';

  const depositReturnStatus =
    searchParams.get(
      'status',
    )?.trim().toLowerCase() ?? '';

  const [
    depositReturnNotice,
    setDepositReturnNotice,
  ] =
    useState<{
      tone:
        | 'success'
        | 'pending'
        | 'error';
      title: string;
      message: string;
    } | null>(() => {
      if (
        depositReturnId
      ) {
        return {
          tone:
            'pending',
          title:
            'Checking your wallet top-up',
          message:
            'Confirming the payment result with League OS.',
        };
      }

      if (
        depositReturnStatus ===
        'error'
      ) {
        return {
          tone:
            'error',
          title:
            'Wallet top-up could not be confirmed',
          message:
            'Pesapal returned without a confirmed deposit. No wallet credit has been applied.',
        };
      }

      return null;
    });

  const [
    isDepositOpen,
    setIsDepositOpen,
  ] =
    useState(
      false,
    );

  const [
    isWithdrawOpen,
    setIsWithdrawOpen,
  ] =
    useState(
      false,
    );

  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] =
    useState(
      false,
    );

  const {
    wallet,
    isLoading:
      isWalletLoading,
    error:
      walletError,
    refresh:
      refreshWallet,
  } =
    useFanWallet(
      'UGX',
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      FanWalletTransaction[]
    >(
      [],
    );

  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<
      FanWalletWithdrawal[]
    >(
      [],
    );

  const [
    withdrawalsLoading,
    setWithdrawalsLoading,
  ] =
    useState(
      true,
    );

  const [
    withdrawalsError,
    setWithdrawalsError,
  ] =
    useState(
      '',
    );

  const [
    transactionsLoading,
    setTransactionsLoading,
  ] =
    useState(
      true,
    );

  const [
    transactionsError,
    setTransactionsError,
  ] =
    useState(
      '',
    );


  useEffect(() => {
    let cancelled =
      false;

    fetchFanWalletWithdrawals({
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
            setWithdrawalsError(
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
          setWithdrawalsLoading(
            false,
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, []);


  useEffect(() => {
    let cancelled =
      false;

    fetchFanWalletTransactions()
      .then(
        (
          records,
        ) => {
          if (
            !cancelled
          ) {
            setTransactions(
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
            setTransactionsError(
              error instanceof
              Error
                ? error.message
                : 'Could not load wallet transactions.',
            );
          }
        },
      )
      .finally(() => {
        if (
          !cancelled
        ) {
          setTransactionsLoading(
            false,
          );
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, []);


  useEffect(() => {
    let cancelled =
      false;

    function clearReturnParams() {
      const next =
        new URLSearchParams(
          window.location.search,
        );

      next.delete(
        'deposit',
      );

      next.delete(
        'status',
      );

      setSearchParams(
        next,
        {
          replace:
            true,
        },
      );
    }


    if (
      !depositReturnId
    ) {
      if (
        depositReturnStatus ===
        'error'
      ) {
        clearReturnParams();
      }

      return () => {
        cancelled =
          true;
      };
    }


    fetchFanWalletDeposit(
      depositReturnId,
    )
      .then(
        async (
          deposit,
        ) => {
          if (
            cancelled
          ) {
            return;
          }


          try {
            sessionStorage.removeItem(
              'leagueos.wallet.pendingDepositId',
            );

            sessionStorage.removeItem(
              'leagueos.wallet.depositReturnPath',
            );
          } catch {
            // Storage can be unavailable in privacy-restricted browsers.
          }


          if (
            deposit.status ===
            'COMPLETED'
          ) {
            const refreshedTransactions =
              await fetchFanWalletTransactions();

            if (
              cancelled
            ) {
              return;
            }

            setTransactions(
              refreshedTransactions,
            );

            setTransactionsError(
              '',
            );

            await refreshWallet();

            if (
              cancelled
            ) {
              return;
            }

            setDepositReturnNotice({
              tone:
                'success',
              title:
                'Wallet top-up completed',
              message:
                `UGX ${Math.round(
                  deposit.amount,
                ).toLocaleString(
                  'en-UG',
                )} has been credited to your wallet.`,
            });
          } else if (
            deposit.status ===
              'FAILED' ||
            deposit.status ===
              'EXPIRED'
          ) {
            setDepositReturnNotice({
              tone:
                'error',
              title:
                deposit.status ===
                'EXPIRED'
                  ? 'Wallet top-up expired'
                  : 'Wallet top-up failed',
              message:
                'The payment was not credited to your wallet. You can start a new top-up when ready.',
            });
          } else {
            setDepositReturnNotice({
              tone:
                'pending',
              title:
                'Wallet top-up is still pending',
              message:
                'League OS has not yet received final payment confirmation. Your wallet will only be credited after provider confirmation.',
            });
          }

          clearReturnParams();
        },
      )
      .catch(
        (
          error,
        ) => {
          if (
            cancelled
          ) {
            return;
          }

          setDepositReturnNotice({
            tone:
              'error',
            title:
              'Could not verify wallet top-up',
            message:
              error instanceof
              Error
                ? error.message
                : 'League OS could not confirm this deposit.',
          });

          clearReturnParams();
        },
      );


    return () => {
      cancelled =
        true;
    };
  }, [
    depositReturnId,
    depositReturnStatus,
    refreshWallet,
    setSearchParams,
  ]);


  useEffect(() => {
    document.body.style.overflow =
      isSidebarOpen
        ? 'hidden'
        : '';

    return () => {
      document.body.style.overflow =
        '';
    };
  }, [
    isSidebarOpen,
  ]);


  return (
    <div className="fan-wallet-shell">
      <div className="fan-wallet">
        <Sidebar
          isOpen={
            isSidebarOpen
          }
          onClose={() =>
            setIsSidebarOpen(
              false,
            )
          }
        />

        <div className="fan-wallet-main">
          <Topbar
            onMenuClick={() =>
              setIsSidebarOpen(
                true,
              )
            }
          />

          <div className="fan-wallet-content">
            <div className="fan-wallet-inner">
              <div className="fan-wallet-header">
                <p className="fan-wallet-eyebrow">
                  Account
                </p>

                <h1>
                  My Wallet
                </h1>

                <p>
                  Manage your League OS balance
                  and review wallet activity.
                </p>
              </div>


              {depositReturnNotice && (
                <div
                  className={
                    `fan-wallet-deposit-return ` +
                    `fan-wallet-deposit-return--${depositReturnNotice.tone}`
                  }
                  role={
                    depositReturnNotice.tone ===
                    'error'
                      ? 'alert'
                      : 'status'
                  }
                >
                  <strong>
                    {
                      depositReturnNotice.title
                    }
                  </strong>

                  <span>
                    {
                      depositReturnNotice.message
                    }
                  </span>
                </div>
              )}


              {isWalletLoading ? (
                <DashboardSkeleton
                  rows={
                    6
                  }
                />
              ) : walletError ? (
                <DashboardNotice
                  tone="error"
                  title="Couldn't load your wallet"
                  message={
                    walletError
                  }
                  onRetry={
                    refreshWallet
                  }
                />
              ) : wallet ? (
                <>
                  <div className="fan-wallet-balance-card">
                    <div>
                      <div className="fan-wallet-verified-row">
                        <FiCheckCircle
                          aria-hidden="true"
                        />

                        <span>
                          Wallet balance
                        </span>
                      </div>

                      <p className="fan-wallet-balance-label">
                        Available balance
                      </p>

                      <p className="fan-wallet-balance-value">
                        {formatUgx(
                          wallet.availableBalance,
                        )}
                      </p>

                      <p className="fan-wallet-pending-note">
                        Reserved:{' '}
                        {formatUgx(
                          wallet.reservedBalance,
                        )}
                        {' · '}
                        Total:{' '}
                        {formatUgx(
                          wallet.totalBalance,
                        )}
                      </p>
                    </div>

                    <div className="fan-wallet-balance-actions">
                      <button
                        type="button"
                        className="fan-wallet-topup-btn"
                        onClick={() =>
                          setIsDepositOpen(
                            true,
                          )
                        }
                      >
                        Top Up
                      </button>

                      <button
                        type="button"
                        className="fan-wallet-withdraw-btn"
                        disabled={
                          wallet.availableBalance <=
                          0
                        }
                        onClick={() =>
                          setIsWithdrawOpen(
                            true,
                          )
                        }
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>


                  <div className="fan-wallet-demo-note">
                    <strong>
                      Staging wallet
                    </strong>

                    <span>
                      This prototype is using the
                      real backend UGX wallet.
                      Test funding is managed through
                      the staging environment.
                    </span>
                  </div>


                  <div className="fan-wallet-withdrawal-history">
                    <div className="fan-wallet-section-heading">
                      <div>
                        <h2>
                          Withdrawal Requests
                        </h2>

                        <p>
                          Track the Finance review and payout status
                          of your withdrawal requests.
                        </p>
                      </div>
                    </div>

                    {withdrawalsLoading ? (
                      <DashboardSkeleton
                        rows={
                          3
                        }
                      />
                    ) : withdrawalsError ? (
                      <DashboardNotice
                        tone="error"
                        title="Couldn't load withdrawal requests"
                        message={
                          withdrawalsError
                        }
                      />
                    ) : withdrawals.length ===
                      0 ? (
                      <DashboardNotice
                        tone="empty"
                        title="No withdrawal requests yet"
                        message="Your withdrawal requests will appear here after you submit one."
                      />
                    ) : (
                      <ul className="fan-wallet-withdrawal-list">
                        {withdrawals.map(
                          (
                            withdrawal,
                          ) => (
                            <li
                              className="fan-wallet-withdrawal-row"
                              key={
                                withdrawal.id
                              }
                            >
                              <div className="fan-wallet-withdrawal-main">
                                <div>
                                  <strong>
                                    {formatUgx(
                                      withdrawal.amount,
                                    )}
                                  </strong>

                                  <span>
                                    {destinationValue(
                                      withdrawal,
                                      'network',
                                    ) || 'Mobile Money'}
                                    {' · '}
                                    {destinationValue(
                                      withdrawal,
                                      'mobile_money_number',
                                    ) || 'Destination unavailable'}
                                  </span>
                                </div>

                                <span
                                  className={
                                    `fan-wallet-withdrawal-status ` +
                                    `fan-wallet-withdrawal-status--${withdrawal.status.toLowerCase()}`
                                  }
                                >
                                  {withdrawalStatusLabel(
                                    withdrawal.status,
                                  )}
                                </span>
                              </div>

                              <div className="fan-wallet-withdrawal-meta">
                                <span>
                                  Requested{' '}
                                  {formatDate(
                                    withdrawal.createdAt,
                                  )}
                                </span>

                                {withdrawal.rejectionReason && (
                                  <span className="fan-wallet-withdrawal-reason">
                                    Rejected:{' '}
                                    {
                                      withdrawal.rejectionReason
                                    }
                                  </span>
                                )}

                                {withdrawal.failureReason && (
                                  <span className="fan-wallet-withdrawal-reason">
                                    Failed:{' '}
                                    {
                                      withdrawal.failureReason
                                    }
                                  </span>
                                )}
                              </div>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>


                  <div className="fan-wallet-history">
                    <h2>
                      Transaction History
                    </h2>

                    {transactionsLoading ? (
                      <DashboardSkeleton
                        rows={
                          4
                        }
                      />
                    ) : transactionsError ? (
                      <DashboardNotice
                        tone="error"
                        title="Couldn't load transaction history"
                        message={
                          transactionsError
                        }
                      />
                    ) : transactions.length ===
                      0 ? (
                      <DashboardNotice
                        tone="empty"
                        title="No payment transactions yet"
                        message="Deposits and withdrawals will appear here when they are recorded."
                      />
                    ) : (
                      <ul className="fan-wallet-transaction-list">
                        {transactions.map(
                          (
                            transaction,
                          ) => (
                            <li
                              className="fan-wallet-transaction-row"
                              key={
                                transaction.id
                              }
                            >
                              <span
                                className={
                                  `fan-wallet-transaction-icon ` +
                                  `fan-wallet-transaction-icon--${
                                    transaction.type ===
                                    'credit'
                                      ? 'credit'
                                      : 'debit'
                                  }`
                                }
                              >
                                {transaction.type ===
                                'credit' ? (
                                  <FiArrowDownLeft />
                                ) : (
                                  <FiArrowUpRight />
                                )}
                              </span>

                              <div>
                                <p className="fan-wallet-transaction-label">
                                  {
                                    transaction.label
                                  }
                                </p>

                                <p className="fan-wallet-transaction-time">
                                  {formatDate(
                                    transaction.createdAt,
                                  )}
                                  {' · '}
                                  {
                                    transaction.status
                                  }
                                </p>
                              </div>

                              <span
                                className={
                                  `fan-wallet-transaction-amount ` +
                                  `fan-wallet-transaction-amount--${
                                    transaction.type ===
                                    'credit'
                                      ? 'credit'
                                      : 'debit'
                                  }`
                                }
                              >
                                {transaction.type ===
                                'credit'
                                  ? '+'
                                  : transaction.type ===
                                      'debit'
                                    ? '-'
                                    : ''}
                                {formatUgx(
                                  transaction.amount,
                                )}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <DashboardNotice
                  tone="empty"
                  title="No UGX wallet found"
                  message="Your account does not currently have an active UGX wallet."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {isDepositOpen && (
        <DepositModal
          onClose={() =>
            setIsDepositOpen(
              false,
            )
          }
        />
      )}

      {isWithdrawOpen &&
        wallet && (
          <WithdrawModal
            availableBalance={
              wallet.availableBalance
            }
            onClose={() =>
              setIsWithdrawOpen(
                false,
              )
            }
            onSubmitted={() => {
              void refreshWallet();

              void fetchFanWalletWithdrawals({
                currency:
                  'UGX',
              })
                .then(
                  (
                    records,
                  ) => {
                    setWithdrawals(
                      records,
                    );

                    setWithdrawalsError(
                      '',
                    );
                  },
                )
                .catch(
                  (
                    error,
                  ) => {
                    setWithdrawalsError(
                      error instanceof
                      Error
                        ? error.message
                        : 'Could not refresh withdrawal requests.',
                    );
                  },
                );

              void fetchFanWalletTransactions()
                .then(
                  (
                    records,
                  ) => {
                    setTransactions(
                      records,
                    );

                    setTransactionsError(
                      '',
                    );
                  },
                )
                .catch(
                  (
                    error,
                  ) => {
                    setTransactionsError(
                      error instanceof
                      Error
                        ? error.message
                        : 'Could not refresh wallet transactions.',
                    );
                  },
                );
            }}
          />
        )}
    </div>
  );
}


export default FanWallet;
