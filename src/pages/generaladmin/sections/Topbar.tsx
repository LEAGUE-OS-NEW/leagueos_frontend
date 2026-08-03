import { FiBell, FiChevronDown, FiMenu, FiSearch, FiShield } from 'react-icons/fi';
import HomeLogo from '../../../components/landing/HomeLogo';
import './Topbar.css';

type TopbarProps = {
  onMenuClick: () => void;
};

function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="ga-topbar">
      <div className="ga-topbar-left">
        <HomeLogo className="ga-topbar-logo" imageClassName="ga-topbar-logo-image" />

        <button type="button" className="ga-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
          <FiMenu />
        </button>

        <span className="ga-topbar-breadcrumb">Administration</span>
      </div>

      <label className="ga-topbar-search">
        <FiSearch className="ga-topbar-search-icon" />
        <input type="text" placeholder="Search users, teams, markets, tickets..." className="ga-topbar-search-input" />
        <kbd className="ga-topbar-search-kbd">&#8984;K</kbd>
      </label>

      <div className="ga-topbar-actions">
        <button type="button" className="ga-topbar-icon-btn" aria-label="Notifications, 8 unread">
          <FiBell />
          <span className="ga-topbar-badge">8</span>
        </button>

        <button type="button" className="ga-topbar-scope-pill" aria-label="Admin scope: Super Admin">
          <FiShield /> Super Admin <FiChevronDown />
        </button>

        <button type="button" className="ga-topbar-user">
          <span className="ga-topbar-user-avatar" aria-hidden="true">
            N
          </span>
          <span className="ga-topbar-user-copy">
            <span className="ga-topbar-user-name">Nalubega</span>
            <span className="ga-topbar-user-role">General Admin</span>
          </span>
          <FiChevronDown className="ga-topbar-user-chevron" />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
