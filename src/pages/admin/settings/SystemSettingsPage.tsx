import { useState } from 'react';
import type { IconType } from 'react-icons';
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import RingGauge from '../../superadmin/sections/RingGauge';
import './SystemSettingsPage.css';

type Tab = 'General' | 'System Health' | 'Integrations' | 'Security';
const TABS: Tab[] = ['General', 'System Health', 'Integrations', 'Security'];

const SERVICES = [
  { name: 'Platform Services', status: 'Operational' },
  { name: 'Database', status: 'Operational' },
  { name: 'API Gateway', status: 'Operational' },
  { name: 'Background Jobs', status: 'Operational' },
  { name: 'CDN & Storage', status: 'Operational' },
];

const API_STATS = [
  { label: 'Total Requests (24h)', value: '24.8M' },
  { label: 'Failed Requests', value: '312K' },
  { label: 'Avg Response Time', value: '142ms' },
];

const TOTAL_INTEGRATIONS = 28;
const INTEGRATION_ROWS = [
  { label: 'Connected', count: 20, color: 'var(--color-open)' },
  { label: 'Pending', count: 5, color: 'var(--color-accent)' },
  { label: 'Attention Needed', count: 3, color: 'var(--color-live)' },
];

type AlertSeverity = 'critical' | 'warning';
interface SecurityAlert {
  icon: IconType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  time: string;
}
const SECURITY_ALERTS: SecurityAlert[] = [
  { icon: FiAlertOctagon, severity: 'critical', title: 'Unusual Admin Login', detail: 'admin@unknown-ip.com', time: '2m ago' },
  { icon: FiAlertTriangle, severity: 'warning', title: 'Failed Login Attempts', detail: '5 failed attempts detected', time: '15m ago' },
  { icon: FiAlertTriangle, severity: 'warning', title: 'API Key Usage Spike', detail: "Key ending in ...4f8a", time: '32m ago' },
];

function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [platformName, setPlatformName] = useState('League OS');
  const [supportEmail, setSupportEmail] = useState('support@leagueos.ug');
  const [currency, setCurrency] = useState('UGX');
  const [timezone, setTimezone] = useState('Africa/Kampala');
  const [saved, setSaved] = useState(false);

  return (
    <AdminLayout>
      <div className="ss-root">
        <div className="ss-head">
          <p className="ss-eyebrow">Welcome back</p>
          <h1>System Settings</h1>
          <p>Platform-wide configuration, health, integrations, and security — Super Admin only.</p>
        </div>

        <div className="ss-tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={`ss-tab${activeTab === tab ? ' is-active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'General' && (
          <div className="ss-panel">
            <div className="ss-field-grid">
              <label className="ss-field">
                <span>Platform name</span>
                <input type="text" value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
              </label>
              <label className="ss-field">
                <span>Support email</span>
                <input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} />
              </label>
              <label className="ss-field">
                <span>Currency</span>
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                </select>
              </label>
              <label className="ss-field">
                <span>Timezone</span>
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                </select>
              </label>
            </div>
            <div className="ss-panel__footer">
              {saved && <span className="ss-saved-note"><FiCheckCircle aria-hidden="true" /> Saved</span>}
              <button type="button" className="ss-btn ss-btn--gradient" onClick={() => setSaved(true)}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'System Health' && (
          <div className="ss-panel">
            <div className="ss-gauge-row">
              <div className="ss-gauge-block">
                <RingGauge
                  segments={[{ value: 99.98, color: 'var(--color-open)' }]}
                  centerValue="99.98%"
                  centerCaption="Uptime"
                  ariaLabel="System uptime: 99.98%"
                />
                <ul className="ss-status-list">
                  {SERVICES.map((service) => (
                    <li key={service.name}>
                      <span>{service.name}</span>
                      <span className="ss-status-ok">
                        {service.status}
                        <i className="ss-status-dot" aria-hidden="true" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ss-gauge-block">
                <RingGauge
                  segments={[{ value: 98.7, color: 'var(--color-open)' }]}
                  centerValue="98.7%"
                  centerCaption="API Success Rate"
                  ariaLabel="API success rate: 98.7%"
                />
                <div className="ss-api-stats">
                  {API_STATS.map((stat) => (
                    <div className="ss-api-stat-row" key={stat.label}>
                      <span>{stat.label}</span>
                      <b>{stat.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="ss-note">
              <FiCheckCircle aria-hidden="true" /> All systems are performing within normal thresholds.
            </p>
          </div>
        )}

        {activeTab === 'Integrations' && (
          <div className="ss-panel">
            <div className="ss-gauge-row">
              <div className="ss-gauge-block">
                <RingGauge
                  segments={INTEGRATION_ROWS.map((row) => ({ value: (row.count / TOTAL_INTEGRATIONS) * 100, color: row.color }))}
                  centerValue={String(TOTAL_INTEGRATIONS)}
                  centerCaption="Total Integrations"
                  ariaLabel={`${TOTAL_INTEGRATIONS} total integrations`}
                />
                <ul className="ss-status-list">
                  {INTEGRATION_ROWS.map((row) => (
                    <li key={row.label}>
                      <span>
                        <i className="ss-status-dot" style={{ background: row.color }} aria-hidden="true" />
                        {row.label}
                      </span>
                      <b>{row.count}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="ss-hint">
              Payment providers (MTN MoMo, Airtel Money), sports data feeds, and notification channels this platform
              depends on.
            </p>
          </div>
        )}

        {activeTab === 'Security' && (
          <div className="ss-panel">
            <ul className="ss-alert-list">
              {SECURITY_ALERTS.map((alert) => (
                <li key={alert.title}>
                  <span className={`ss-alert-icon ss-alert-icon--${alert.severity}`}>
                    <alert.icon aria-hidden="true" />
                  </span>
                  <span className="ss-alert-copy">
                    <b>{alert.title}</b>
                    <span>{alert.detail}</span>
                  </span>
                  <span className="ss-alert-time">{alert.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default SystemSettingsPage;
