import { useEffect, useState } from 'react';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useIdentityVerificationStore } from '../../../store/identityVerificationStore';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import { fetchWalletDetails, getWalletAvailableBalanceUgx, recordWithdrawalTransaction } from '../../../services/walletService';
import type { WalletDetails } from '../../../services/walletService';
import DepositModal from './sections/DepositModal';
import '../sections/FanDashboard.css';
import './FanWallet.css';

function FanWallet() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isIdentityVerified = useIdentityVerificationStore((state) => state.isVerified);
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const isVerified = Boolean(!isUserLoading && currentUser.isVerified);
  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  // Initial load: no synchronous setState before the fetch settles, relying
  // on the useState(true)/useState('') defaults above — matches
  // FanTradeHub's effect shape so react-hooks/set-state-in-effect doesn't
  // flag it. isLoading is never read while !isVerified (the render ternary
  // below checks !isVerified/!isIdentityVerified first), so the early
  // return doesn't need to touch it. refreshWallet (below) is for
  // user-triggered reloads (retry button, post-deposit refresh) called from
  // event handlers, where resetting loading/error synchronously first is
  // fine.
  useEffect(() => {
    let cancelled = false;

    if (!isVerified) {
      return;
    }

    fetchWalletDetails()
      .then((data) => {
        if (!cancelled) setWallet(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your wallet.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVerified]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  function refreshWallet() {
    if (!isVerified) return;
    setIsLoading(true);
    setError('');
    fetchWalletDetails()
      .then((data) => setWallet(data))
      .catch(() => setError("Couldn't load your wallet."))
      .finally(() => setIsLoading(false));
  }

  const handleDepositSuccess = () => {
    setIsDepositOpen(false);
    refreshWallet();
  };

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setWithdrawError('Enter a valid withdrawal amount.');
      return;
    }
    if (amount > getWalletAvailableBalanceUgx()) {
      setWithdrawError('Withdrawal amount exceeds your available balance.');
      return;
    }

    recordWithdrawalTransaction(amount, withdrawDestination.trim() || 'Mobile Money');
    setWithdrawAmount('');
    setWithdrawDestination('');
    setWithdrawError('');
    setIsWithdrawOpen(false);
    refreshWallet();
  };

  return (
    <div className="fan-wallet-shell">
      <div className="fan-wallet">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="fan-wallet-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-wallet-content">
          <div className="fan-wallet-inner">
            <div className="fan-wallet-header">
              <p className="fan-wallet-eyebrow">Account</p>
              <h1>My Wallet</h1>
              <p>Manage your League OS balance, deposits, and transaction history.</p>
            </div>
            {!isVerified ? (
              <DashboardNotice
                tone={isUserLoading ? 'empty' : 'forbidden'}
                title={isUserLoading ? 'Loading your account…' : 'Verify your account to unlock your wallet'}
                message={isUserLoading ? 'Checking your verification status.' : 'Only verified accounts can view balances, deposit funds, and withdraw earnings.'}
                actionLabel={isUserLoading ? undefined : 'Verify identity'}
                actionTo={isUserLoading ? undefined : '/fan/verify'}
              />
            ) : !isIdentityVerified ? (
              <DashboardNotice
                tone="forbidden"
                title="Verify your identity to unlock your wallet"
                message="Wallet balance, deposits, and transactions need identity verification."
                actionLabel="Verify identity"
                actionTo="/fan/verify"
              />
            ) : isLoading ? (
              <DashboardSkeleton rows={6} />
            ) : error ? (
              <DashboardNotice tone="error" title="Couldn't load your wallet" message={error} onRetry={refreshWallet} />
            ) : wallet ? (
              <>
                <div className="fan-wallet-balance-card">
                  <div>
                    <p className="fan-wallet-balance-label">Available balance</p>
                    <p className="fan-wallet-balance-value">{wallet.balance}</p>
                    {wallet.pendingWithdrawals !== 'UGX 0' && (
                      <p className="fan-wallet-pending-note">Pending withdrawals: {wallet.pendingWithdrawals}</p>
                    )}
                  </div>
                  <button type="button" className="fan-wallet-topup-btn" onClick={() => setIsDepositOpen(true)}>
                    Top Up
                  </button>
                  <button type="button" className="fan-wallet-withdraw-btn" onClick={() => setIsWithdrawOpen(true)}>
                    Withdraw
                  </button>
                </div>

                {isWithdrawOpen && (
                  <div className="fan-wallet-withdraw-panel">
                    <h2>Withdraw Funds</h2>
                    <label>
                      Amount (UGX)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={withdrawAmount}
                        onChange={(event) => {
                          setWithdrawAmount(event.target.value.replace(/[^\d]/g, ''));
                          setWithdrawError('');
                        }}
                        placeholder="e.g. 50000"
                      />
                    </label>
                    <label>
                      Destination
                      <input
                        type="text"
                        value={withdrawDestination}
                        onChange={(event) => setWithdrawDestination(event.target.value)}
                        placeholder="MTN 0771234567"
                      />
                    </label>
                    {withdrawError && <p className="fan-wallet-withdraw-error">{withdrawError}</p>}
                    <div className="fan-wallet-withdraw-actions">
                      <button type="button" onClick={() => setIsWithdrawOpen(false)}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleWithdraw}>
                        Submit Withdrawal
                      </button>
                    </div>
                  </div>
                )}

                <div className="fan-wallet-history">
                  <h2>Transaction History</h2>
                  <ul className="fan-wallet-transaction-list">
                    {wallet.transactions.map((txn) => (
                      <li className="fan-wallet-transaction-row" key={txn.id}>
                        <span className={`fan-wallet-transaction-icon fan-wallet-transaction-icon--${txn.type}`}>
                          {txn.type === 'credit' ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                        </span>
                        <div>
                          <p className="fan-wallet-transaction-label">{txn.label}</p>
                          <p className="fan-wallet-transaction-time">{txn.timestamp}</p>
                        </div>
                        <span className={`fan-wallet-transaction-amount fan-wallet-transaction-amount--${txn.type}`}>
                          {txn.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </div>
        </div>
      </div>
      <Footer />

      {isDepositOpen && <DepositModal onClose={() => setIsDepositOpen(false)} onSuccess={handleDepositSuccess} />}
    </div>
  );
}

export default FanWallet;
