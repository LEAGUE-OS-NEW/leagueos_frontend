import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { formatUgx } from '../../../utils/rules.ts';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanTradeWallet.css';

const PERCENT_PRESETS = [25, 50, 75, 100];

export interface SellPositionData {
  id: string;
  marketQuestion: string;
  outcome: 'Yes' | 'No';
  contractsOwned: number;
  currentPrice: number;
}

// TODO: replace with a real fetch (fetchPositionById) once available.
const SAMPLE_POSITION: SellPositionData = {
  id: 'pos_1',
  marketQuestion: 'SC Villa Clean Sheet?',
  outcome: 'Yes',
  contractsOwned: 20,
  currentPrice: 2.15,
};


function SellPosition({ position = SAMPLE_POSITION }: { position?: SellPositionData }) {
  const navigate = useNavigate();
  const { positionId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contractsToSell, setContractsToSell] = useState(String(position.contractsOwned));
  const [contractsError, setContractsError] = useState('');

  const numericContracts = useMemo(() => {
    const parsed = Number(contractsToSell);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, position.contractsOwned)) : 0;
  }, [contractsToSell, position.contractsOwned]);
  const contractValidationMessage = useMemo(() => {
    if (!contractsToSell) return '';
    const parsed = Number(contractsToSell);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 'Enter a positive number of contracts to sell.';
    }
    if (parsed > position.contractsOwned) {
      return 'You cannot sell more contracts than you own.';
    }
    return '';
  }, [contractsToSell, position.contractsOwned]);

  const activePreset = useMemo(() => {
    const pct = position.contractsOwned === 0 ? 0 : (numericContracts / position.contractsOwned) * 100;
    return PERCENT_PRESETS.find((preset) => Math.round(pct) === preset) ?? null;
  }, [numericContracts, position.contractsOwned]);

  const youWillReceive = numericContracts * position.currentPrice * 10_000;

  const applyPreset = (pct: number) => {
    const next = Math.round((position.contractsOwned * pct) / 100);
    setContractsToSell(String(next));
  };

  const handleReview = () => {
    if (contractValidationMessage) {
      setContractsError(contractValidationMessage);
      return;
    }
    if (numericContracts <= 0) {
      setContractsError('Enter the number of contracts you want to sell.');
      return;
    }
    navigate(`/fan/positions/${positionId ?? position.id}/sell/confirm`, {
      state: { contracts: numericContracts },
    });
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
            <h1 className="flow-card-title">Sell Your Position</h1>
            <p className="flow-card-subtitle">You have {position.contractsOwned} contracts</p>

            <div className="flow-meta-list">
              <div className="flow-meta-row">
                <span>Market</span>
                <b>{position.marketQuestion}</b>
              </div>
              <div className="flow-meta-row">
                <span>Outcome</span>
                <b className={position.outcome === 'Yes' ? 'up' : 'down'}>{position.outcome}</b>
              </div>
              <div className="flow-meta-row">
                <span>Current Price ({position.outcome})</span>
                <b>{position.currentPrice.toFixed(2)}</b>
              </div>
            </div>

            <div className="sell-amount-field">
              <label htmlFor="contracts-to-sell">
                Contracts to Sell <span className="required-star">*</span>
              </label>
              <input
                id="contracts-to-sell"
                type="number"
                min={1}
                max={position.contractsOwned}
                value={contractsToSell}
                onChange={(event) => {
                  setContractsToSell(event.target.value);
                  setContractsError('');
                }}
              />
              {(contractsError || contractValidationMessage) && (
                <p className="field-error">{contractsError || contractValidationMessage}</p>
              )}
              <div className="sell-preset-chips">
                {PERCENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={activePreset === preset ? 'active' : ''}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="sell-receive-row">
              <span>You will receive (UGX)</span>
              <b>{formatUgx(youWillReceive)}</b>
            </div>

            <button type="button" className="flow-danger-btn" disabled={numericContracts <= 0} onClick={handleReview}>
              Review Sell Order
            </button>
          </section>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default SellPosition;