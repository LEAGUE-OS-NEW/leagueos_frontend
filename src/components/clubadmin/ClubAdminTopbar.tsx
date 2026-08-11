import { FiBell, FiMenu, FiSearch, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/authStore';
import './ClubAdminTopbar.css';

interface Props { onMenuClick: () => void; }

export default function ClubAdminTopbar({ onMenuClick }: Props) {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.full_name || user?.email || 'Club Admin';

  return (
    <header className="ca-topbar">
      <button type="button" className="ca-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <label className="ca-topbar-search">
        <FiSearch />
        <input type="search" placeholder="Search members, players, tickets…" />
      </label>

      <div className="ca-topbar-actions">
        <button type="button" className="ca-topbar-icon-btn" aria-label="Notifications">
          <FiBell />
          <span className="ca-topbar-badge">3</span>
        </button>
        <span className="ca-topbar-identity">
          <FiUser aria-hidden="true" />
          {displayName}
        </span>
      </div>
    </header>
  );
}
