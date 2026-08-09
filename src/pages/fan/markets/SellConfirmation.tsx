import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { formatUgx } from '../../../utils/rules.ts';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanTradeWallet.css';

const PLATFORM_FEE_RATE = 0.02;

export interface SellConfirmationData {
  id: string;
  marketQuestion: string;
  outcome: 'Yes' | 'No';
  sellPrice: number;
  contracts: number;
  contractsOwned: number;
}


const SAMPLE_ORDER: SellConfirmationData = {
  id: 'pos_1',
  marketQuestion: 'SC Villa Clean Sheet?',
  outcome: 'Yes',
  sellPrice: 2.15,
  contracts: 20,
  contractsOwned: 20,
};


function SellConfirmation({ order = SAMPLE_ORDER }: { order?: SellConfirmationData }) {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contracts = (location.state as { contracts?: number } | null)?.contracts ?? order.contracts;

  const { grossProceeds, platformFee, netTotal, remainingContracts } = useMemo(() => {
    const gross = contracts * order.sellPrice * 10_000;
    const fee = gross * PLATFORM_FEE_RATE;
    return {
      grossProceeds: gross,
      platformFee: fee,
      netTotal: gross - fee,
      remainingContracts: Math.max(0, order.contractsOwned - contracts),
    };
  }, [contracts, order.contractsOwned, order.sellPrice]);

  const handleConfirm = () => {
    setIsSubmitting(true);
    // TODO: call the sell-position mutation here, then navigate on success.
    navigate('/positions', { state: { soldPositionId: positionId ?? order.id } });
  };

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content flow-page-content">
          <button type="button" className="flow-back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>

          <section className="dashboard-card flow-card">
            <h1 className="flow-card-title">Confirm Sell Order</h1>

            <div className="flow-meta-list">
              <div className="flow-meta-row">
                <span>Market</span>
                <b>{order.marketQuestion}</b>
              </div>
              <div className="flow-meta-row">
                <span>Outcome</span>
                <b className={order.outcome === 'Yes' ? 'up' : 'down'}>{order.outcome}</b>
              </div>
              <div className="flow-meta-row">
                <span>Sell Price (UGX)</span>
                <b>{order.sellPrice.toFixed(2)}</b>
              </div>
              <div className="flow-meta-row">
                <span>Contracts</span>
                <b>{contracts}</b>
              </div>
              <div className="flow-meta-row">
                <span>You will receive (UGX)</span>
                <b>{formatUgx(grossProceeds)}</b>
              </div>
              <div className="flow-meta-row">
                <span>Platform Fee (2%)</span>
                <b>{formatUgx(platformFee)}</b>
              </div>
              <div className="flow-meta-row flow-meta-row--total">
                <span>Total (UGX)</span>
                <b>{formatUgx(netTotal)}</b>
              </div>
              <div className="flow-meta-row">
                <span>Remaining Contracts</span>
                <b>{remainingContracts}</b>
              </div>
            </div>

            <button type="button" className="flow-danger-btn" disabled={isSubmitting} onClick={handleConfirm}>
              {isSubmitting ? 'Confirming…' : 'Confirm & Sell'}
            </button>
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default SellConfirmation;