import {
  useEffect,
  useState,
} from 'react';

import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheckCircle,
} from 'react-icons/fi';

import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';

import {
  useMarketEligibility,
} from '../../../hooks/useMarketEligibility';

import {
  useFanWallet,
} from '../../../hooks/useFanWallet';

import {
  fetchFanWalletTransactions,
  type FanWalletTransaction,
} from '../../../services/fanWalletApiService';

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


function FanWallet() {
  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] =
    useState(
      false,
    );

  const {
    isEligible,
    isLoading:
      isEligibilityLoading,
    error:
      eligibilityError,
    refresh:
      refreshEligibility,
  } =
    useMarketEligibility();

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
      isEligible,
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

    if (
      !isEligible
    ) {
      return;
    }

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
  }, [
    isEligible,
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


  const retryWallet =
    () => {
      void refreshEligibility();

      void refreshWallet();
    };


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


              {isEligibilityLoading ? (
                <DashboardSkeleton
                  rows={
                    4
                  }
                />
              ) : eligibilityError ? (
                <DashboardNotice
                  tone="error"
                  title="Couldn't confirm wallet access"
                  message={
                    'Your verification has not been reset. ' +
                    'We could not confirm your current Markets eligibility.'
                  }
                  onRetry={
                    retryWallet
                  }
                />
              ) : !isEligible ? (
                <DashboardNotice
                  tone="forbidden"
                  title="Identity verification required"
                  message="Complete identity verification before accessing your League OS wallet."
                  actionLabel="Continue verification"
                  actionTo="/fan/verify"
                />
              ) : isWalletLoading ? (
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
                          Verified wallet
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
    </div>
  );
}


export default FanWallet;
