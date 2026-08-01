import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import './MarketUpdate.css';

const CHART_POINTS = '0,78 25,68 50,72 75,58 100,62 125,45 150,50 175,32 200,38 225,20 250,26 275,8 300,14';

function MarketUpdate() {
  return (
    <div className="market-update dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">Market Update</h2>
        <Link to="/markets" className="dashboard-card-link">
          View markets
        </Link>
      </div>

      <span className="market-trending-badge">
        <FiStar />
        Trending
      </span>

      <p className="market-question">
        <strong>Vipers SC to win</strong>
        <br />
        vs Express FC
      </p>

      <div className="market-chart">
        <img src="/images/stadium-bg.png" alt="" className="market-chart-bg" aria-hidden="true" />
        <div className="market-chart-overlay" aria-hidden="true" />
        <div className="market-chart-content">
          <div className="market-price-row">
            <span className="market-price">1.85</span>
            <span className="market-price-change">▲ 8.2%</span>
          </div>
          <div className="market-chart-graphic">
            <svg className="market-chart-svg" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                points={CHART_POINTS}
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
          <span className="market-stat-value">$12,450</span>
        </div>
        <div className="market-stat">
          <span className="market-stat-label">24h trades</span>
          <span className="market-stat-value">342</span>
        </div>
      </div>

      <Link to="/markets" className="market-explore-btn">
        Explore Markets
      </Link>
    </div>
  );
}

export default MarketUpdate;
