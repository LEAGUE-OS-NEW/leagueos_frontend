import { useEffect, useState } from 'react';
import Sidebar from '../../components/fan/Sidebar';
import Topbar from '../../components/fan/Topbar';
import WelcomeStats from './sections/WelcomeStats';
import UpcomingFixtures from './sections/UpcomingFixtures';
import MarketUpdate from './sections/MarketUpdate';
import MyTickets from './sections/MyTickets';
import MyFantasyTeam from './sections/MyFantasyTeam';
import LatestNews from './sections/LatestNews';
import './FanDashboard.css';

function FanDashboard() {
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
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content">
          <WelcomeStats />
          <div className="dashboard-columns">
            <div className="dashboard-column">
              <UpcomingFixtures />
              <div className="dashboard-two-col">
                <MarketUpdate />
                <MyTickets />
              </div>
            </div>
            <div className="dashboard-column">
              <MyFantasyTeam />
              <LatestNews />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FanDashboard;
