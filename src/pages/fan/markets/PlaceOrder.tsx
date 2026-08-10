import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiTrendingUp } from 'react-icons/fi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { formatUgx } from '../../../utils/rules.ts';
import { fetchMarket } from '../../../services/fanMarketsServices';
import type { Market, OutcomeId } from '../../../services/fanMarketsServices';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
// NOTE: adjust these relative imports to match wherever this page actually
// lives in the tree (assumed here to sit alongside Markets.tsx at
// src/pages/fan/markets/).
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import '../sections/FanDashboard.css';
import '../markets/Markets.css';
import './FanMarketDetail.css';

const PLATFORM_PAYOUT_PER_CONTRACT = 10_000; // UGX per winning share — see marketAdminService.sellContract/resolveMarket

interface TradeNavState {
  outcomeId?: OutcomeId;
}

function PlaceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { marketId } = useParams<{ marketId: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const isVerified = Boolean(currentUser.isVerified);

  const navState = (location.state as TradeNavState | null) ?? {};

  useEffect(() => {
    if (!isUserLoading && !isVerified) {
      navigate('/fan/verify');
    }
  }, [isUserLoading, isVerified, navigate]);

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    // marketId can change between market trade pages, so loading/error need
    // to reset synchronously here to avoid flashing stale state from the
    // previous market before the new fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setLoadError('');
    fetchMarket(marketId)
      .then((result) => {
        if (!cancelled) setMarket(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setLoadError(fetchError instanceof Error ? fetchError.message : 'Market not found.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  const [outcomeId, setOutcomeId] = useState<OutcomeId>(navState.outcomeId ?? 'YES');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  const outcome = market?.outcomes.find((item) => item.id === outcomeId);
  const price = outcome?.price ?? 0;
  const numericAmount = Number(amount);

  const amountValidationMessage = useMemo(() => {
    if (!amount || !market) return '';
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return 'Enter a valid positive amount.';
    }
    if (numericAmount < market.parameters.minTradeUgx) {
      return `Minimum trade is ${formatUgx(market.parameters.minTradeUgx)}.`;
    }
    if (numericAmount > market.parameters.maxTradeUgx) {
      return `Maximum trade is ${formatUgx(market.parameters.maxTradeUgx)}.`;
    }
    return '';
  }, [amount, numericAmount, market]);

  const contracts = useMemo(() => (numericAmount > 0 && price > 0 ? numericAmount / price : 0), [numericAmount, price]);
  const potentialReturn = useMemo(() => contracts * PLATFORM_PAYOUT_PER_CONTRACT, [contracts]);

  const canReview = Boolean(market) && numericAmount > 0 && !amountValidationMessage;
  const presetAmounts = market
    ? [market.parameters.minTradeUgx, market.parameters.minTradeUgx * 5, market.parameters.minTradeUgx * 20, market.parameters.maxTradeUgx].filter(
        (value, index, all) => all.indexOf(value) === index,
      )
    : [];

  const goToReview = () => {
    if (!market) return;
    if (amountValidationMessage) {
      setAmountError(amountValidationMessage);
      return;
    }
    if (!canReview) {
      setAmountError('Enter a valid amount before reviewing your order.');
      return;
    }
    navigate(`/fan/markets/${market.id}/review`, {
      state: {
        marketId: market.id,
        outcomeId,
        price,
        amount: numericAmount,
        contracts,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="fan-dashboard">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="fan-dashboard-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="fan-dashboard-content market-detail-page">
            <DashboardSkeleton rows={5} />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (loadError || !market || !outcome) {
    return (
      <div className="fan-dashboard">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="fan-dashboard-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <div className="fan-dashboard-content market-detail-page">
            <DashboardNotice
              tone="error"
              title="Couldn't load this market"
              message={loadError || 'This market may have been removed.'}
              actionLabel="Back to Markets"
              actionTo="/fan/trade"
            />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content market-detail-page">
          <div className="market-detail-grid">
            <main className="market-detail-main">
              <section className="dashboard-card trade-ticket">
                <button
                  type="button"
                  className="market-back-btn trade-ticket-back"
                  onClick={() => navigate(`/fan/markets/${market.id}`)}
                >
                  <FiArrowLeft /> Back
                </button>

                <h2 className="trade-ticket-question">{market.question}</h2>

                <div className="trade-tabs" role="tablist" aria-label="Outcome">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={outcomeId === 'YES'}
                    className={outcomeId === 'YES' ? 'active' : ''}
                    onClick={() => setOutcomeId('YES')}
                  >
                    Buy Yes
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={outcomeId === 'NO'}
                    className={outcomeId === 'NO' ? 'active' : ''}
                    onClick={() => setOutcomeId('NO')}
                  >
                    Buy No
                  </button>
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>Current {outcome.label} Price</span>
                    <b>
                      UGX {price.toLocaleString()} <FiTrendingUp className="up" />{' '}
                      <span className="up">{outcome.probabilityPct}% probability</span>
                    </b>
                  </div>
                </div>

                <label className="trade-amount-label" htmlFor="place-order-amount">
                  Amount (UGX) <span className="required-star">*</span>
                </label>
                <input
                  id="place-order-amount"
                  type="number"
                  min="0"
                  placeholder="Enter amount"
                  className="trade-amount-input"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setAmountError('');
                  }}
                />
                {amountError && <p className="field-error">{amountError}</p>}
                {!amountError && amountValidationMessage && <p className="field-error">{amountValidationMessage}</p>}

                <div className="preset-chips">
                  {presetAmounts.map((preset) => (
                    <button key={preset} type="button" onClick={() => setAmount(String(preset))}>
                      {preset >= 1000 ? `${preset / 1000}K` : preset}
                    </button>
                  ))}
                </div>

                <div className="market-detail-stat-row">
                  <div>
                    <span>You will receive (est.)</span>
                    <b>{contracts.toFixed(2)} Contracts</b>
                  </div>
                  <div>
                    <span>Potential Return (if {outcome.label} Wins)</span>
                    <b>{formatUgx(potentialReturn)}</b>
                  </div>
                </div>

                <button type="button" className="verify-btn verify-btn--primary" disabled={!canReview} onClick={goToReview}>
                  Review Order
                </button>

                <div className="trade-ticket-balance-row">
                  <div>
                    <span>Trade Limits</span>
                    <b>
                      {formatUgx(market.parameters.minTradeUgx)} &ndash; {formatUgx(market.parameters.maxTradeUgx)}
                    </b>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default PlaceOrder;