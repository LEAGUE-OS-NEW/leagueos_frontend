import Sidebar from '../../components/fan/Sidebar';
import Topbar from '../../components/fan/Topbar';
import WelcomeStats from './sections/WelcomeStats';
import UpcomingFixtures from './sections/UpcomingFixtures';
import './FanDashboard.css';

function FanDashboard() {
  return (
    <div className="fan-dashboard">
      <Sidebar />
      <div className="fan-dashboard-main">
        <Topbar />
        <div className="fan-dashboard-content">
          <WelcomeStats />
          <UpcomingFixtures />
        </div>
      </div>
    </div>
  );
}

export default FanDashboard;
