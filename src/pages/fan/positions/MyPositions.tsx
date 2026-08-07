import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import { fetchMyPositions, sellPosition, type Position } from '../../../services/tradingService';
import '../sections/FanDashboard.css';
import './MyPositions.css';

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MyPositions() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser } = useCurrentUser();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMyPositions()
      .then((result) => {
        if (!cancelled) setPositions(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your positions.");
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

  function refreshPositions() {
    setIsLoading(true);
    setError('');
    fetchMyPositions()
      .then(setPositions)
      .catch(() => setError("Couldn't load your positions."))
      .finally(() => setIsLoading(false));
  }

  const handleSell = async (contractId: string) => {
    setSellingId(contractId);
    setSellError('');
    try {
      await sellPosition(contractId);
      refreshPositions();
    } catch (sellException) {
      setSellError(sellException instanceof Error ? sellException.message : 'Could not sell this position.');
    } finally {
      setSellingId(null);
    }
  };

  const openPositions = positions.filter((position) => position.contract.status === 'Open');
  const settledPositions = positions.filter((position) => position.contract.status !== 'Open');

  return (
    <div className="my-positions">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="my-positions-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="my-positions-content">
          <div className="my-positions-inner">
            <div className="my-positions-header">
              <p className="my-positions-eyebrow">Account</p>
              <h1>My Positions</h1>
              <p>Track the markets you've backed, and cash out early before they resolve.</p>
            </div>

            {!currentUser.isEmailVerified ? (
              <DashboardNotice
                tone="forbidden"
                title="Verify your email to trade"
                message="Placing orders and tracking positions needs a verified email."
                actionLabel="Verify email"
                actionTo="/settings"
              />
            ) : isLoading ? (
              <DashboardSkeleton rows={4} />
            ) : error ? (
              <DashboardNotice tone="error" title="Couldn't load your positions" message={error} onRetry={refreshPositions} />
            ) : positions.length === 0 ? (
              <DashboardNotice
                tone="empty"
                title="No positions yet"
                message="Browse open markets and place your first order."
                actionLabel="Explore Markets"
                actionTo="/markets"
              />
            ) : (
              <>
                {sellError && (
                  <div className="my-positions-error">{sellError}</div>
                )}

                {openPositions.length > 0 && (
                  <section className="my-positions-section">
                    <h2>Open</h2>
                    <ul className="my-positions-list">
                      {openPositions.map((position) => (
                        <li className="my-positions-row" key={position.contract.id}>
                          <Link to={`/markets/${position.market.id}`} className="my-positions-market">
                            <strong>{position.market.eventLabel}</strong>
                            <span>{position.market.question}</span>
                          </Link>
                          <span className={`my-positions-outcome my-positions-outcome--${position.contract.outcomeId.toLowerCase()}`}>
                            {position.contract.outcomeId}
                          </span>
                          <span className="my-positions-stake">{formatUgx(position.contract.quantityUgx)}</span>
                          <span className="my-positions-time">{formatDateTime(position.contract.matchedAt)}</span>
                          {position.market.status === 'Live' ? (
                            <button
                              type="button"
                              className="my-positions-sell-btn"
                              disabled={sellingId === position.contract.id}
                              onClick={() => handleSell(position.contract.id)}
                            >
                              {sellingId === position.contract.id ? 'Selling…' : 'Sell'}
                            </button>
                          ) : (
                            <span className="my-positions-waiting">Awaiting result</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {settledPositions.length > 0 && (
                  <section className="my-positions-section">
                    <h2>Settled</h2>
                    <ul className="my-positions-list">
                      {settledPositions.map((position) => (
                        <li className="my-positions-row" key={position.contract.id}>
                          <Link to={`/markets/${position.market.id}`} className="my-positions-market">
                            <strong>{position.market.eventLabel}</strong>
                            <span>{position.market.question}</span>
                          </Link>
                          <span className={`my-positions-outcome my-positions-outcome--${position.contract.outcomeId.toLowerCase()}`}>
                            {position.contract.outcomeId}
                          </span>
                          <span className="my-positions-stake">{formatUgx(position.contract.quantityUgx)}</span>
                          <span className="my-positions-payout">{formatUgx(position.contract.payoutUgx ?? 0)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default MyPositions;
