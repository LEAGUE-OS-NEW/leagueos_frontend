import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiChevronDown, FiMenu, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuthStore } from '../../../store/authStore';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useNotificationsStore } from '../../../store/fanNotificationsStore';
import { fetchMarkets as fetchFanMarkets } from '../../../services/fanMarketsServices';
import { fetchFavouriteClubs, fetchFixtures, fetchNews } from '../../../services/fanDashboardService';
import './Topbar.css';

type TopbarProps = {
  onMenuClick: () => void;
};

type SearchResult = {
  id: string;
  title: string;
  label: string;
  route: string;
};

const STATIC_SEARCH_RESULTS: SearchResult[] = [
  { id: 'home', title: 'Fan home', label: 'Dashboard', route: '/dashboard/fan' },
  { id: 'markets', title: 'Markets', label: 'Trading', route: '/fan/markets' },
  { id: 'fantasy', title: 'Fantasy', label: 'Fantasy', route: '/fan/fantasy' },
  { id: 'clubs', title: 'Clubs', label: 'Clubs', route: '/fan/clubs' },
  { id: 'tickets', title: 'Tickets', label: 'Tickets', route: '/fan/tickets' },
  { id: 'memberships', title: 'Memberships', label: 'Memberships', route: '/memberships' },
  { id: 'store', title: 'Store', label: 'Store', route: '/fan/store' },
  { id: 'news', title: 'News', label: 'News', route: '/fan/news' },
  { id: 'notifications', title: 'Notifications', label: 'Account', route: '/settings?tab=notifications' },
  { id: 'profile', title: 'Profile', label: 'Account', route: '/profile' },
  { id: 'settings', title: 'Settings', label: 'Account', route: '/settings' },
];

function resultMatches(result: SearchResult, query: string): boolean {
  const haystack = `${result.title} ${result.label}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function Topbar({ onMenuClick }: TopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
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

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      Promise.allSettled([fetchFanMarkets(), fetchFixtures(), fetchFavouriteClubs(), fetchNews()])
        .then(([marketsResult, fixturesResult, clubsResult, newsResult]) => {
          if (cancelled) return;

          const dynamicResults: SearchResult[] = [
            ...(marketsResult.status === 'fulfilled'
              ? marketsResult.value.map((market) => ({
                  id: `market-${market.id}`,
                  title: market.question,
                  label: `${market.teamA} vs ${market.teamB}`,
                  route: `/fan/markets/${market.id}`,
                }))
              : []),
            ...(fixturesResult.status === 'fulfilled'
              ? fixturesResult.value.map((fixture, index) => ({
                  id: `fixture-${index}`,
                  title: `${fixture.teamA} vs ${fixture.teamB}`,
                  label: `${fixture.competition} · ${fixture.time}`,
                  route: '/dashboard/fan',
                }))
              : []),
            ...(clubsResult.status === 'fulfilled'
              ? clubsResult.value.map((club) => ({
                  id: `club-${club.id}`,
                  title: club.name,
                  label: `${club.sport} club`,
                  route: '/fan/clubs',
                }))
              : []),
            ...(newsResult.status === 'fulfilled'
              ? newsResult.value.map((item) => ({
                  id: `news-${item.id}`,
                  title: item.headline,
                  label: item.categoryLabel,
                  route: `/fan/news/${item.id}`,
                }))
              : []),
          ];

          const results = [...STATIC_SEARCH_RESULTS, ...dynamicResults]
            .filter((result) => resultMatches(result, query))
            .slice(0, 6);

          setSearchResults(results);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchText]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    clearAuth();
    navigate('/login');
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchText.trim();
    if (!query) return;
    const firstResult = searchResults[0] ?? STATIC_SEARCH_RESULTS.find((result) => resultMatches(result, query));
    if (!firstResult) return;
    setIsSearchOpen(false);
    setSearchText('');
    navigate(firstResult.route);
  };

  const goToSearchResult = (result: SearchResult) => {
    setIsSearchOpen(false);
    setSearchText('');
    navigate(result.route);
  };

  return (
    <header className="fan-topbar">
      <button type="button" className="fan-topbar-menu" aria-label="Open menu" onClick={onMenuClick}>
        <FiMenu />
      </button>

      <form className="fan-topbar-search" role="search" onSubmit={handleSearchSubmit} ref={searchRef}>
        <FiSearch className="fan-topbar-search-icon" />
        <input
          type="search"
          placeholder="Search games, teams, markets..."
          className="fan-topbar-search-input"
          aria-label="Search League OS"
          enterKeyHint="search"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(searchText.trim().length >= 2)}
        />

        {isSearchOpen && searchText.trim().length >= 2 && (
          <div className="fan-topbar-search-panel">
            {isSearching ? (
              <p className="fan-topbar-search-state">Searching fan account...</p>
            ) : searchResults.length > 0 ? (
              <ul className="fan-topbar-search-results">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button type="button" className="fan-topbar-search-result" onClick={() => goToSearchResult(result)}>
                      <span>{result.title}</span>
                      <small>{result.label}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fan-topbar-search-state">No fan account results found.</p>
            )}
          </div>
        )}
      </form>

      <div className="fan-topbar-actions">
        <button
          type="button"
          className="fan-topbar-bell"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onClick={() => navigate('/settings?tab=notifications')}
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
