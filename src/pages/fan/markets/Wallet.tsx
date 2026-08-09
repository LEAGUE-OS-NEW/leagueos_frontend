import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { formatUgx } from '../../../utils/rules.ts';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanTradeWallet.css';

export interface WalletSummaryData {
  availableBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  winnings: number;
}

// TODO: swap for a real fetch (e.g. useDashboardSection(fetchWalletSummary)).
const SAMPLE_WALLET: WalletSummaryData = {
  availableBalance: 125_000,
  totalDeposits: 200_000,
  totalWithdrawals: 50_000,
  winnings: 75_000,
};

function Wallet({ wallet = SAMPLE_WALLET }: { wallet?: WalletSummaryData }) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content flow-page-content">
          <button type="button" className="flow-back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>

          <section className="dashboard-card flow-card wallet-balance-card">
            <h1 className="flow-card-title">My Wallet</h1>
            <span>Available Balance</span>
            <b>{formatUgx(wallet.availableBalance)}</b>

            <div className="wallet-balance-actions">
              <Link to="/fan/wallet/deposit" className="flow-primary-btn flow-success-btn">
                Deposit
              </Link>
              <Link to="/fan/wallet/withdraw" className="wallet-withdraw-btn">
                Withdraw
              </Link>
            </div>
          </section>

          <section className="dashboard-card flow-card">
            <h2 className="wallet-summary-title">Wallet Summary</h2>
            <div className="flow-meta-list">
              <div className="flow-meta-row">
                <span>Total Deposits</span>
                <b>{formatUgx(wallet.totalDeposits)}</b>
              </div>
              <div className="flow-meta-row">
                <span>Total Withdrawals</span>
                <b>{formatUgx(wallet.totalWithdrawals)}</b>
              </div>
              <div className="flow-meta-row">
                <span>Winnings</span>
                <b className="up">{formatUgx(wallet.winnings)}</b>
              </div>
            </div>
            <Link to="/fan/wallet/transactions" className="dashboard-card-link">
              View Transactions
            </Link>
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default Wallet;