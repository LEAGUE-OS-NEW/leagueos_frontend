import { useEffect, useState } from 'react';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from './Topbar';
import Footer from '../../../components/landing/Footer';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchAccountStatus, type AccountStatus } from '../../../services/accountService';
import WelcomeStats from './WelcomeStats';
import UpcomingFixtures from './UpcomingFixtures';
import MarketUpdate from './MarketUpdate';
import MyTickets from './MyTickets';
import MyFantasyTeam from './MyFantasyTeam';
import FavouriteClubs from './FavouriteClubs';
import StorePicks from './StorePicks';
import Wallet from './Wallet';
import NotificationsPreview from './NotificationsPreview';
import Memberships from './Memberships';
import LatestNews from './LatestNews';
import './FanDashboard.css';

function FanDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    fetchAccountStatus().then((status) => {
      if (!cancelled) setAccountStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isRestricted = accountStatus === 'Deactivated' || accountStatus === 'Pending Deletion';

  return (
    <div className="fan-dashboard-shell">
      <div className="fan-dashboard">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="fan-dashboard-main">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content">
          {isRestricted ? (
            <DashboardNotice
              tone="forbidden"
              title={accountStatus === 'Deactivated' ? 'Your account is deactivated' : 'Your account is scheduled for deletion'}
              message={
                accountStatus === 'Deactivated'
                  ? 'Reactivate your account in Settings to see your personalised dashboard again.'
                  : 'Cancel the deletion request in Settings to keep using League OS.'
              }
              actionLabel="Go to Account Settings"
              actionTo="/settings"
            />
          ) : (
            <>
              <WelcomeStats />
              <div className="dashboard-columns">
                <div className="dashboard-column">
                  <UpcomingFixtures />
                  <div className="dashboard-two-col">
                    <MarketUpdate />
                    <MyTickets />
                  </div>
                  <div className="dashboard-two-col">
                    <FavouriteClubs />
                    <StorePicks />
                  </div>
                </div>
                <div className="dashboard-column">
                  <MyFantasyTeam />
                  <Wallet />
                  <NotificationsPreview />
                  <Memberships />
                  <LatestNews />
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default FanDashboard;
