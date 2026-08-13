import { Link } from 'react-router-dom';
import './TipsStats.css';

const BAR_HEIGHTS = [30, 45, 65, 90];
const TREND_POINTS = '0,38 20,34 40,36 60,24 80,20 100,6';

function TipsStats() {
  return (
    <section className="fantasy-panel tips-stats" aria-labelledby="tips-stats-heading">
      <div className="fantasy-panel-heading">
        <h2 id="tips-stats-heading">Tips & Stats to Win Big</h2>
      </div>

      <div className="tip-cards">
        <div className="tip-card">
          <span className="tip-card-label">Top Scoring Position</span>
          <div className="tip-card-row">
            <span className="tip-card-value">MID</span>
            <div className="tip-chart tip-chart--bars" aria-hidden="true">
              {BAR_HEIGHTS.map((height, index) => (
                <span className="tip-bar" style={{ height: `${height}%` }} key={index} />
              ))}
            </div>
          </div>
          <p className="tip-card-desc">Midfielders score 28% more points on average.</p>
        </div>

        <div className="tip-card">
          <span className="tip-card-label">Form Matters</span>
          <div className="tip-card-row">
            <span className="tip-card-value">87%</span>
            <div
              className="tip-chart tip-chart--donut"
              style={{ background: 'conic-gradient(var(--color-accent) 0% 87%, var(--color-border) 87% 100%)' }}
              aria-hidden="true"
            >
              <span className="tip-chart-donut-hole" />
            </div>
          </div>
          <p className="tip-card-desc">Managers with in-form players rank higher.</p>
        </div>

        <div className="tip-card">
          <span className="tip-card-label">Captain Boost</span>
          <div className="tip-card-row">
            <span className="tip-card-value">2.3x</span>
            <svg className="tip-chart tip-chart--trend" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                points={TREND_POINTS}
                fill="none"
                stroke="var(--color-primary-light)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="tip-card-desc">Captains earn 2.3x more points on average.</p>
        </div>

        <Link to="/fantasy" className="tip-card tip-card--clickable">
          <span className="tip-card-label">Popular Pick</span>
          <div className="tip-card-row">
            <span className="tip-card-value">A. Kigozi</span>
            <img className="tip-chart tip-chart--player" src="/players/player-avatar.png" alt="" aria-hidden="true" />
          </div>
          <p className="tip-card-desc">Most selected player this Gameweek.</p>
        </Link>
      </div>
    </section>
  );
}

export default TipsStats;
