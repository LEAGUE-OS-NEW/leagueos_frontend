import { Link } from 'react-router-dom';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchWalletSummary } from '../../../services/fanDashboardService';
import './Wallet.css';

function Wallet() {
  const { currentUser } = useCurrentUser();
  const { data: wallet, isLoading, error, retry } = useDashboardSection(fetchWalletSummary);

  return (
    <div className="wallet-card dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Wallet</h2>
        <Link to="/wallet" className="dashboard-card-link">
          View wallet
        </Link>
      </div>

      {!currentUser.isEmailVerified ? (
        <DashboardNotice
          tone="forbidden"
          title="Verify your email to unlock your wallet"
          message="Wallet balance and transactions need a verified email."
          actionLabel="Verify email"
          actionTo="/settings"
        />
      ) : isLoading ? (
        <DashboardSkeleton rows={4} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your wallet" message={error} onRetry={retry} />
      ) : wallet ? (
        <div className="dashboard-wallet">
          <div className="wallet-balance-row">
            <div>
              <p className="wallet-balance-label">Available balance</p>
              <p className="wallet-balance-value">{wallet.balance}</p>
            </div>
            <Link to="/wallet" className="wallet-topup-btn">
              Top Up
            </Link>
          </div>

          {wallet.pendingWithdrawals !== 'UGX 0' && (
            <p className="wallet-pending-note">Pending withdrawals: {wallet.pendingWithdrawals}</p>
          )}

          <ul className="dashboard-list wallet-transaction-list">
            {wallet.recentTransactions.map((txn) => (
              <li className="dashboard-list-row" key={txn.id}>
                <span className={`wallet-transaction-icon wallet-transaction-icon--${txn.type}`}>
                  {txn.type === 'credit' ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                </span>
                <div>
                  <p className="dashboard-list-primary">{txn.label}</p>
                  <p className="dashboard-list-meta">{txn.timestamp}</p>
                </div>
                <span className={`wallet-transaction-amount wallet-transaction-amount--${txn.type}`}>{txn.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default Wallet;
