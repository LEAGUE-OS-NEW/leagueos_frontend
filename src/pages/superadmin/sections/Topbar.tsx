import { FiBell, FiChevronDown, FiHelpCircle, FiMenu, FiSearch, FiShield } from 'react-icons/fi';
import HomeLogo from '../../../components/landing/HomeLogo';
import './Topbar.css';

type TopbarProps = {
  onMenuClick: () => void;
};

function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button type="button" className="admin-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
          <FiMenu />
        </button>

        <div className="admin-topbar-brand">
          <HomeLogo className="admin-topbar-logo" imageClassName="admin-topbar-logo-image" />
          <span className="admin-topbar-tagline">Unified Fan Engagement &amp; League Platform</span>
        </div>
      </div>

      <label className="admin-topbar-search">
        <FiSearch className="admin-topbar-search-icon" />
        <input type="text" placeholder="Search anything..." className="admin-topbar-search-input" />
      </label>

      <div className="admin-topbar-actions">
        <button type="button" className="admin-topbar-icon-btn" aria-label="Notifications, 7 unread">
          <FiBell />
          <span className="admin-topbar-badge">7</span>
        </button>
        <button type="button" className="admin-topbar-icon-btn" aria-label="Security center">
          <FiShield />
        </button>
        <button type="button" className="admin-topbar-icon-btn" aria-label="Help">
          <FiHelpCircle />
        </button>

        <button type="button" className="admin-topbar-user">
          <FiChevronDown className="admin-topbar-user-chevron" />
          <span className="admin-topbar-user-avatar" aria-hidden="true">
            SA
          </span>
          <span className="admin-topbar-user-copy">
            <span className="admin-topbar-user-name">Super Admin</span>
            <span className="admin-topbar-user-role">Platform Owner</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
