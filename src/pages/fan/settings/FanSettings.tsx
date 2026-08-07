import { useEffect, useState } from 'react';
import { FiActivity, FiBell, FiShield, FiUser } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import SecurityTab from './sections/SecurityTab';
import NotificationsTab from './sections/NotificationsTab';
import ActivityTab from './sections/ActivityTab';
import AccountTab from './sections/AccountTab';
import './FanSettings.css';

type TabId = 'security' | 'notifications' | 'activity' | 'account';

const TABS: { id: TabId; label: string; icon: typeof FiShield }[] = [
  { id: 'security', label: 'Security', icon: FiShield },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'activity', label: 'Activity', icon: FiActivity },
  { id: 'account', label: 'Account', icon: FiUser },
];

function FanSettings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('security');

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="fan-settings">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-settings-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-settings-content">
          <div className="fan-settings-inner">
            <div className="fan-settings-header">
              <p className="fan-settings-eyebrow">Account</p>
              <h1>Settings</h1>
              <p>Manage your password, notification preferences, account activity, and account status.</p>
            </div>

            <div className="settings-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`settings-tab${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon /> {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'account' && <AccountTab />}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanSettings;
