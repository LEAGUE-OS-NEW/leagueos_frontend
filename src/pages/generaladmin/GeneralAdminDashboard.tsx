import { useEffect, useState } from 'react';
import Sidebar from '../../components/generaladmin/Sidebar';
import Topbar from './sections/Topbar';
import OperationsHeader from './sections/OperationsHeader';
import SpecialistModulesGrid from './sections/SpecialistModulesGrid';
import OperationalQueuesPanel from './sections/OperationalQueuesPanel';
import AdminActivityFeedPanel from './sections/AdminActivityFeedPanel';
import AlertsNotificationsPanel from './sections/AlertsNotificationsPanel';
import SystemHealthSummaryPanel from './sections/SystemHealthSummaryPanel';
import './GeneralAdminDashboard.css';

function GeneralAdminDashboard() {
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
    <div className="ga-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="ga-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="ga-content">
          <OperationsHeader />
          <SpecialistModulesGrid />

          <div className="ga-layout">
            <div className="ga-primary-column">
              <OperationalQueuesPanel />
            </div>

            <div className="ga-secondary-column">
              <AdminActivityFeedPanel />
            </div>

            <div className="ga-aside">
              <AlertsNotificationsPanel />
              <SystemHealthSummaryPanel />
            </div>
          </div>
        </div>

        <footer className="ga-footer">
          <span>League OS Admin Console &bull; All actions are logged and auditable</span>
          <span>&copy; 2026 League OS. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}

export default GeneralAdminDashboard;
