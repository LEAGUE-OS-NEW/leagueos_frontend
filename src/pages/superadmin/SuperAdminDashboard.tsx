import { useEffect, useState } from 'react';
import Sidebar from '../../components/superadmin/Sidebar';
import Topbar from './sections/Topbar';
import PlatformOverviewHeader from './sections/PlatformOverviewHeader';
import SystemHealthPanel from './sections/SystemHealthPanel';
import IntegrationsOverviewPanel from './sections/IntegrationsOverviewPanel';
import ApiStatusPanel from './sections/ApiStatusPanel';
import KeyIntegrationsPanel from './sections/KeyIntegrationsPanel';
import SecurityAlertsPanel from './sections/SecurityAlertsPanel';
import AdminUsersPanel from './sections/AdminUsersPanel';
import PermissionsSummaryPanel from './sections/PermissionsSummaryPanel';
import CountryRolloutPanel from './sections/CountryRolloutPanel';
import AuditLogPanel from './sections/AuditLogPanel';
import './SuperAdminDashboard.css';

function SuperAdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="super-admin-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="super-admin-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="super-admin-content">
          <PlatformOverviewHeader />

          <div className="platform-status-row">
            <SystemHealthPanel />
            <IntegrationsOverviewPanel />
            <ApiStatusPanel />
          </div>

          <div className="platform-layout">
            <div className="platform-primary-column">
              <KeyIntegrationsPanel />

              <div className="platform-secondary-row">
                <AdminUsersPanel />
                <PermissionsSummaryPanel />
                <CountryRolloutPanel />
              </div>
            </div>

            <div className="platform-aside">
              <SecurityAlertsPanel />
              <AuditLogPanel />
            </div>
          </div>
        </div>

        <footer className="super-admin-footer">
          <span>League OS Platform &bull; Version 2.5.1 (Build 4582)</span>
          <span>&copy; 2026 League OS. All rights reserved.</span>
          <span className="super-admin-footer-status">
            <i aria-hidden="true" /> All Systems Operational
          </span>
          <span>Data Center: AWS us-east-1</span>
        </footer>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
