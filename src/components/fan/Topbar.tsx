import { FiSearch, FiBell, FiChevronDown } from 'react-icons/fi';
import './Topbar.css';

function Topbar() {
  return (
    <header className="fan-topbar">
      <label className="fan-topbar-search">
        <FiSearch className="fan-topbar-search-icon" />
        <input type="text" placeholder="Search games, teams, markets..." className="fan-topbar-search-input" />
      </label>

      <div className="fan-topbar-actions">
        <button type="button" className="fan-topbar-bell" aria-label="Notifications, 3 unread">
          <FiBell />
          <span className="fan-topbar-bell-badge">3</span>
        </button>

        <button type="button" className="fan-topbar-user">
          <img src="/players/player-avatar.png" alt="" className="fan-topbar-user-avatar" />
          <span className="fan-topbar-user-name">John D.</span>
          <FiChevronDown className="fan-topbar-user-chevron" />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
