import Sidebar from '../../components/fan/Sidebar';
import Topbar from '../../components/fan/Topbar';
import WelcomeStats from './sections/WelcomeStats';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="fan-dashboard">
      <Sidebar />
      <div className="fan-dashboard-main">
        <Topbar />
        <div className="fan-dashboard-content">
          <WelcomeStats />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
