import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiChevronDown, FiMenu, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuthStore } from '../../../store/authStore';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';
import './Topbar.css';

type TopbarProps = {
  onMenuClick: () => void;
};

function Topbar({ onMenuClick }: TopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { currentUser } = useCurrentUser();
  const displayName = currentUser?.name?.trim() || 'Fan';
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const hasLoadedNotifications = useNotificationsStore((state) => state.hasLoaded);
  const loadNotifications = useNotificationsStore((state) => state.load);

  useEffect(() => {
    if (!hasLoadedNotifications) loadNotifications();
  }, [hasLoadedNotifications, loadNotifications]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="fan-topbar">
      <button type="button" className="fan-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <label className="fan-topbar-search">
        <FiSearch className="fan-topbar-search-icon" />
        <input type="text" placeholder="Search games, teams, markets..." className="fan-topbar-search-input" />
      </label>

      <div className="fan-topbar-actions">
        <button
          type="button"
          className="fan-topbar-bell"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => navigate('/notifications')}
        >
          <FiBell />
          {unreadCount > 0 && (
            <span className="fan-topbar-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <div className="fan-topbar-user-wrap" ref={menuRef}>
          <button
            type="button"
            className="fan-topbar-user"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="fan-topbar-user-avatar" />
            ) : (
              <img src="/players/player-avatar.png" alt="" className="fan-topbar-user-avatar" />
            )}
            <span className="fan-topbar-user-name">{displayName}</span>
            <FiChevronDown className={`fan-topbar-user-chevron${isMenuOpen ? ' is-open' : ''}`} />
          </button>

          {isMenuOpen && (
            <div className="fan-topbar-user-menu" role="menu">
              <Link to="/profile" className="fan-topbar-user-menu-item" role="menuitem" onClick={() => setIsMenuOpen(false)}>
                <FiUser /> Profile
              </Link>
              <button
                type="button"
                className="fan-topbar-user-menu-item fan-topbar-user-menu-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <FiLogOut /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;