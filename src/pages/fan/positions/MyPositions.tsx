import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import {
  fetchFanPositions,
  fetchSettledActivity,
  type Position,
  type SettledPositionActivity,
} from '../../../services/fanMarketsServices';
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

function isSettled(position: Position): boolean {
  return position.market.status === 'Resolved' || position.contract.status.toUpperCase() === 'SETTLED';
}

function outcomeLabel(outcome: SettledPositionActivity['outcome']): string {
  if (outcome === 'WON') return 'Won';
  if (outcome === 'VOIDED') return 'Voided';
  return 'Lost';
}

function MyPositions() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [settledActivity, setSettledActivity] = useState<SettledPositionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  function loadPositions() {
    setIsLoading(true);
    setError('');
    Promise.all([fetchFanPositions(), fetchSettledActivity()])
      .then(([openResult, settledResult]) => {
        setPositions(openResult);
        setSettledActivity(settledResult);
      })
      .catch(() => setError("Couldn't load your positions."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFanPositions(), fetchSettledActivity()])
      .then(([openResult, settledResult]) => {
        if (cancelled) return;
        setPositions(openResult);
        setSettledActivity(settledResult);
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

  const openPositions = positions.filter((position) => !isSettled(position));
  const hasAnyPositions = openPositions.length > 0 || settledActivity.length > 0;

  return (
    <div className="my-positions-shell">
      <div className="my-positions">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="my-positions-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="my-positions-content">
          <div className="my-positions-inner">
            <div className="my-positions-header">
              <p className="my-positions-eyebrow">Account</p>
              <h1>My Positions</h1>
              <p>Track the markets you've backed and review outcomes after settlement.</p>
            </div>

            {isLoading ? (
              <DashboardSkeleton rows={4} />
            ) : error ? (
              <DashboardNotice tone="error" title="Couldn't load your positions" message={error} onRetry={loadPositions} />
            ) : !hasAnyPositions ? (
              <DashboardNotice
                tone="empty"
                title="No positions yet"
                message="Browse open markets and place your first order."
                actionLabel="Explore Markets"
                actionTo="/fan/trade"
              />
            ) : (
              <>
                {openPositions.length > 0 && (
                  <section className="my-positions-section">
                    <h2>Open</h2>
                    <ul className="my-positions-list">
                      {openPositions.map((position) => (
                        <li className="my-positions-row" key={position.contract.id}>
                          <Link to={`/fan/markets/${position.market.id}`} className="my-positions-market">
                            <strong>{position.market.eventLabel}</strong>
                            <span>{position.market.question}</span>
                          </Link>
                          <span className={`my-positions-outcome my-positions-outcome--${position.contract.outcomeId.toLowerCase()}`}>
                            {position.contract.outcomeId}
                          </span>
                          <span className="my-positions-stake">{formatUgx(position.contract.quantityUgx)}</span>
                          <span className="my-positions-time">{formatDateTime(position.contract.matchedAt)}</span>
                          <span className="my-positions-waiting">{position.contract.status}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {settledActivity.length > 0 && (
                  <section className="my-positions-section">
                    <h2>Settled</h2>
                    <ul className="my-positions-list">
                      {settledActivity.map((activity) => (
                        <li className="my-positions-row" key={activity.id}>
                          <Link to={`/fan/markets/${activity.marketId}`} className="my-positions-market">
                            <strong>{activity.marketQuestion}</strong>
                          </Link>
                          <span className={`my-positions-outcome my-positions-outcome--${activity.outcomeId.toLowerCase()}`}>
                            {activity.outcomeId}
                          </span>
                          <span className={`my-positions-result my-positions-result--${activity.outcome.toLowerCase()}`}>
                            {outcomeLabel(activity.outcome)}
                          </span>
                          <span className="my-positions-time">{formatDateTime(activity.occurredAt)}</span>
                          <span className="my-positions-payout">{formatUgx(activity.payoutUgx)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  );
}

export default MyPositions;
