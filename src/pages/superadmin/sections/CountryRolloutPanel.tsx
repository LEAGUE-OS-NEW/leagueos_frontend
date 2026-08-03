import { FiArrowRight } from 'react-icons/fi';
import './CountryRolloutPanel.css';

const ROLLOUT_BREAKDOWN = [
  { label: 'Fully Rolled Out', count: 78, className: 'done' },
  { label: 'In Progress', count: 32, className: 'progress' },
  { label: 'Planned', count: 18, className: 'planned' },
];

const NEW_ROLLOUT_FLAGS = [
  { code: 'uganda', name: 'Uganda' },
  { code: 'kenya', name: 'Kenya' },
  { code: 'tanzania', name: 'Tanzania' },
  { code: 'rwanda', name: 'Rwanda' },
];

function CountryRolloutPanel() {
  return (
    <div className="admin-panel country-rollout-panel">
      <div className="admin-panel-heading">
        <h2>Country Rollout</h2>
        <a href="/dashboard/super-admin/countries" className="admin-panel-link">
          Manage Countries <FiArrowRight />
        </a>
      </div>

      <div className="country-rollout-body">
        <div className="country-rollout-total">
          <span className="country-rollout-total-value">128</span>
          <span className="country-rollout-total-label">Countries Enabled</span>
        </div>

        <ul className="country-rollout-breakdown">
          {ROLLOUT_BREAKDOWN.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <b className={row.className}>{row.count}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="country-rollout-footer">
        <span>New Rollouts</span>
        <div className="country-rollout-flags">
          {NEW_ROLLOUT_FLAGS.map((flag) => (
            <img key={flag.code} src={`/flags/${flag.code}.png`} alt={flag.name} className="country-rollout-flag" />
          ))}
          <span className="country-rollout-flag country-rollout-flag--overflow">+27</span>
        </div>
      </div>
    </div>
  );
}

export default CountryRolloutPanel;
