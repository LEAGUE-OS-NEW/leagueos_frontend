import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchMarketUpdate } from '../../../services/fanDashboardService';
import './MarketUpdate.css';

function MarketUpdate() {
  const { currentUser } = useCurrentUser();
  const { data: market, isLoading, error, retry } = useDashboardSection(fetchMarketUpdate);

  return (
    <div className="market-update dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Market Update</h2>
        <Link to="/markets" className="dashboard-card-link">
          View markets
        </Link>
      </div>

      {!currentUser.isEmailVerified ? (
        <DashboardNotice
          tone="forbidden"
          title="Verify your email to unlock markets"
          message="Betting markets need a verified email before you can trade."
          actionLabel="Verify email"
          actionTo="/settings"
        />
      ) : isLoading ? (
        <DashboardSkeleton rows={3} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load the market update" message={error} onRetry={retry} />
      ) : market ? (
        <>
          <span className="market-trending-badge">
            <FiStar />
            Trending
          </span>

          <p className="market-question">
            <strong>{market.teamA} to win</strong>
            <br />
            vs {market.teamB}
          </p>

          <div className="market-chart">
            <img src="/images/stadium-bg.png" alt="" className="market-chart-bg" aria-hidden="true" />
            <div className="market-chart-overlay" aria-hidden="true" />
            <div className="market-chart-content">
              <div className="market-price-row">
                <span className="market-price">{market.price}</span>
                <span className="market-price-change">▲ {market.priceChangePct}%</span>
              </div>
              <div className="market-chart-graphic">
                <svg className="market-chart-svg" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
                  <polyline
                    points={market.chartPoints}
                    fill="none"
                    stroke="var(--color-primary-light)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="market-chart-axis">
                  <span>2.00</span>
                  <span>1.50</span>
                  <span>1.00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="market-stats-row">
            <div className="market-stat">
              <span className="market-stat-label">24h volume</span>
              <span className="market-stat-value">{market.volume24h}</span>
            </div>
            <div className="market-stat">
              <span className="market-stat-label">24h trades</span>
              <span className="market-stat-value">{market.trades24h}</span>
            </div>
          </div>

          <Link to="/markets" className="market-explore-btn">
            Explore Markets
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default MarketUpdate;
