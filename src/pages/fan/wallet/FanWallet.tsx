import { useEffect, useState } from 'react';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import { fetchWalletDetails } from '../../../services/walletService';
import type { WalletDetails } from '../../../services/walletService';
import DepositModal from './sections/DepositModal';
import '../sections/FanDashboard.css';
import './FanWallet.css';

function FanWallet() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser } = useCurrentUser();
  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Initial load: no synchronous setState before the fetch settles, relying
  // on the useState(true)/useState('') defaults above — matches
  // useDashboardSection's effect shape so react-hooks/set-state-in-effect
  // doesn't flag it. refreshWallet (below) is for user-triggered reloads
  // (retry button, post-deposit refresh) called from event handlers, where
  // resetting loading/error synchronously first is fine.
  useEffect(() => {
    let cancelled = false;

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
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  function refreshWallet() {
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

  return (
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

            {!currentUser.isEmailVerified ? (
              <DashboardNotice
                tone="forbidden"
                title="Verify your email to unlock your wallet"
                message="Wallet balance, deposits, and transactions need a verified email."
                actionLabel="Verify email"
                actionTo="/settings"
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
                </div>

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
        <Footer />
      </div>

      {isDepositOpen && <DepositModal onClose={() => setIsDepositOpen(false)} onSuccess={handleDepositSuccess} />}
    </div>
  );
}

export default FanWallet;
