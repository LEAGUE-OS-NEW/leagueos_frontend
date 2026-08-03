import type { IconType } from 'react-icons';
import { FiActivity, FiArrowRight, FiBarChart2, FiBell, FiCreditCard, FiUserCheck } from 'react-icons/fi';
import './KeyIntegrationsPanel.css';

type IntegrationStatus = 'connected' | 'pending' | 'attention';

type IntegrationCard = {
  category: string;
  brand: string;
  icon: IconType;
  status: IntegrationStatus;
  stats: { label: string; value: string }[];
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  pending: 'Pending',
  attention: 'Attention',
};

const INTEGRATIONS: IntegrationCard[] = [
  {
    category: 'Sports Data Provider',
    brand: 'ISIN',
    icon: FiActivity,
    status: 'connected',
    stats: [
      { label: 'API Status', value: 'Healthy' },
      { label: 'Last Sync', value: '2m ago' },
      { label: 'Data Coverage', value: '98.6%' },
    ],
  },
  {
    category: 'Payment Providers',
    brand: 'Stripe',
    icon: FiCreditCard,
    status: 'connected',
    stats: [
      { label: 'Transactions (24h)', value: '18,392' },
      { label: 'Success Rate', value: '99.3%' },
      { label: 'Last Payout', value: '2h ago' },
    ],
  },
  {
    category: 'Identity Verification',
    brand: 'Veriff',
    icon: FiUserCheck,
    status: 'pending',
    stats: [
      { label: 'Verifications (24h)', value: '1,284' },
      { label: 'Success Rate', value: '92.1%' },
      { label: 'Last Sync', value: '15m ago' },
    ],
  },
  {
    category: 'Notification Provider',
    brand: 'SendGrid',
    icon: FiBell,
    status: 'connected',
    stats: [
      { label: 'Emails (24h)', value: '125,842' },
      { label: 'Delivery Rate', value: '99.2%' },
      { label: 'Last Sync', value: '3m ago' },
    ],
  },
  {
    category: 'Reporting & Analytics',
    brand: 'AWS',
    icon: FiBarChart2,
    status: 'attention',
    stats: [
      { label: 'Reports Generated', value: '1,204' },
      { label: 'Jobs Completed', value: '892' },
      { label: 'Last Run', value: '32m ago' },
    ],
  },
];

function KeyIntegrationsPanel() {
  return (
    <div className="admin-panel key-integrations-panel">
      <div className="admin-panel-heading">
        <h2>Key Integrations</h2>
        <a href="/dashboard/super-admin/integrations" className="admin-panel-link">
          Manage Integrations <FiArrowRight />
        </a>
      </div>

      <div className="key-integrations-grid">
        {INTEGRATIONS.map((integration) => (
          <article className="key-integration-card" key={integration.brand}>
            <div className="key-integration-top">
              <span className="key-integration-category">
                <integration.icon aria-hidden="true" /> {integration.category}
              </span>
              <span className={`key-integration-status key-integration-status--${integration.status}`}>
                {STATUS_LABEL[integration.status]}
              </span>
            </div>

            <p className="key-integration-brand">{integration.brand}</p>

            <div className="key-integration-stats">
              {integration.stats.map((stat) => (
                <div className="key-integration-stat-row" key={stat.label}>
                  <span>{stat.label}</span>
                  <b>{stat.value}</b>
                </div>
              ))}
            </div>

            <a href="/dashboard/super-admin/integrations" className="admin-panel-link">
              Configure <FiArrowRight />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

export default KeyIntegrationsPanel;
