import { useEffect, useState } from 'react';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from './Topbar';
import Footer from '../../../components/landing/Footer';
import WelcomeStats from './WelcomeStats';
import UpcomingFixtures from './UpcomingFixtures';
import MarketUpdate from './MarketUpdate';
import MyTickets from './MyTickets';
import MyFantasyTeam from './MyFantasyTeam';
import LatestNews from './LatestNews';
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
        <Footer />
      </div>
    </div>
  );
}

export default FanDashboard;
