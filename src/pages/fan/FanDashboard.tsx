import Sidebar from '../../components/fan/Sidebar';
import Topbar from '../../components/fan/Topbar';
import WelcomeStats from './sections/WelcomeStats';
import UpcomingFixtures from './sections/UpcomingFixtures';
import MarketUpdate from './sections/MarketUpdate';
import MyTickets from './sections/MyTickets';
import './FanDashboard.css';

function FanDashboard() {
  return (
    <div className="fan-dashboard">
      <Sidebar />
      <div className="fan-dashboard-main">
        <Topbar />
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default FanDashboard;
