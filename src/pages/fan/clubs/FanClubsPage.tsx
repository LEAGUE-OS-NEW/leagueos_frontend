import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiCheckCircle, FiMapPin, FiCalendar } from 'react-icons/fi';
import { GiTrophy } from 'react-icons/gi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import {
  fetchClubs,
  fetchFollowedClubSlugs,
  fetchClubFixtures,
  followClub,
  unfollowClub,
  type ClubSummary,
  type Sport,
} from '../../../services/clubsService';
import '../sections/FanDashboard.css';
import './FanClubsPage.css';

const SPORT_FILTERS = ['All', 'Football', 'Rugby', 'Basketball'] as const;
type SportFilter = (typeof SPORT_FILTERS)[number];

const SPORT_COLOR: Record<Sport, string> = {
  Football: 'football',
  Rugby: 'rugby',
  Basketball: 'basketball',
};

function CrestPlaceholder() {
  return (
    <div className="fcp-crest-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="2.5 2.5"
        />
      </svg>
    </div>
  );
}

function MyClubCard({
  club,
  nextFixture,
  onUnfollow,
}: {
  club: ClubSummary;
  nextFixture: string;
  onUnfollow: (slug: string) => void;
}) {
  return (
    <div className="fcp-my-card">
      <div className="fcp-my-card-header">
        {club.crest ? (
          <img src={club.crest} alt={club.name} className="fcp-my-crest" />
        ) : (
          <CrestPlaceholder />
        )}
        <div className="fcp-my-card-info">
          <div className="fcp-my-card-name-row">
            <p className="fcp-my-card-name">{club.name}</p>
            {club.verificationStatus === 'Verified' && (
              <FiCheckCircle className="fcp-verified-icon" aria-label="Verified" />
            )}
          </div>
          <span className={`fcp-sport-badge fcp-sport-badge--${SPORT_COLOR[club.sport]}`}>
            {club.sport}
          </span>
        </div>
      </div>

      {nextFixture && (
        <p className="fcp-my-fixture">
          <FiCalendar className="fcp-meta-icon" />
          {nextFixture}
        </p>
      )}

      <div className="fcp-my-actions">
        <Link to={`/fan/clubs/${club.slug}`} className="fcp-btn fcp-btn--outline">
          View Profile
        </Link>
        <button
          type="button"
          className="fcp-btn fcp-btn--unfollow"
          onClick={() => onUnfollow(club.slug)}
        >
          Unfollow
        </button>
      </div>
    </div>
  );
}

function ClubCard({
  club,
  isFollowing,
  onToggleFollow,
}: {
  club: ClubSummary;
  isFollowing: boolean;
  onToggleFollow: (slug: string) => void;
}) {
  return (
    <article className={`fcp-card${isFollowing ? ' fcp-card--following' : ''}`}>
      <div className="fcp-card-top">
        {club.crest ? (
          <img src={club.crest} alt={club.name} className="fcp-card-crest" />
        ) : (
          <CrestPlaceholder />
        )}
        <div className="fcp-card-identity">
          <div className="fcp-card-name-row">
            <p className="fcp-card-name">{club.name}</p>
            {club.verificationStatus === 'Verified' && (
              <FiCheckCircle className="fcp-verified-icon" aria-label="Verified" />
            )}
          </div>
          <span className={`fcp-sport-badge fcp-sport-badge--${SPORT_COLOR[club.sport]}`}>
            {club.sport}
          </span>
        </div>
      </div>

      <div className="fcp-card-meta">
        <p className="fcp-card-meta-row">
          <GiTrophy className="fcp-meta-icon" />
          {club.league}
        </p>
        <p className="fcp-card-meta-row">
          <FiMapPin className="fcp-meta-icon" />
          {club.stadium}
        </p>
      </div>

      {club.honours.length > 0 && (
        <p className="fcp-card-honours">{club.honours[0]}</p>
      )}

      <div className="fcp-card-actions">
        <Link to={`/fan/clubs/${club.slug}`} className="fcp-btn fcp-btn--outline">
          View Profile
        </Link>
        <button
          type="button"
          className={`fcp-btn${isFollowing ? ' fcp-btn--following' : ' fcp-btn--follow'}`}
          onClick={() => onToggleFollow(club.slug)}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </article>
  );
}

function FanClubsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [followedSlugs, setFollowedSlugs] = useState<Set<string>>(new Set());
  const [nextFixtures, setNextFixtures] = useState<Record<string, string>>({});
  const [sport, setSport] = useState<SportFilter>('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClubs(), fetchFollowedClubSlugs()]).then(([allClubs, slugs]) => {
      if (cancelled) return;
      setClubs(allClubs);
      setFollowedSlugs(new Set(slugs));
      setIsLoading(false);
      allClubs.forEach((club) => {
        fetchClubFixtures(club.slug).then((fixtures) => {
          if (!cancelled && fixtures.length > 0) {
            setNextFixtures((prev) => ({
              ...prev,
              [club.slug]: `${fixtures[0].isHome ? 'vs' : '@'} ${fixtures[0].opponent} — ${fixtures[0].time}`,
            }));
          }
        });
      });
    });
    return () => { cancelled = true; };
  }, []);

  const handleToggleFollow = async (slug: string) => {
    if (followedSlugs.has(slug)) {
      await unfollowClub(slug);
      setFollowedSlugs((prev) => { const n = new Set(prev); n.delete(slug); return n; });
    } else {
      await followClub(slug);
      setFollowedSlugs((prev) => new Set(prev).add(slug));
    }
  };

  const myClubs = clubs.filter((c) => followedSlugs.has(c.slug));

  const discoverClubs = clubs.filter((c) => {
    const matchesSport = sport === 'All' || c.sport === sport;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content fcp-content">

          <div className="fcp-header">
            <h1 className="fcp-title">Clubs</h1>
            <p className="fcp-sub">Follow your favourite clubs across football, rugby, and basketball.</p>
          </div>

          {/* My Clubs */}
          <section className="fcp-section">
            <h2 className="fcp-section-heading">My Clubs</h2>
            {isLoading ? (
              <p className="fcp-loading">Loading…</p>
            ) : myClubs.length === 0 ? (
              <div className="fcp-empty">
                <p>You haven't followed any clubs yet. Browse below to get started.</p>
              </div>
            ) : (
              <div className="fcp-my-clubs-grid">
                {myClubs.map((club) => (
                  <MyClubCard
                    key={club.slug}
                    club={club}
                    nextFixture={nextFixtures[club.slug] ?? ''}
                    onUnfollow={handleToggleFollow}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Discover */}
          <section className="fcp-section">
            <div className="fcp-discover-header">
              <h2 className="fcp-section-heading">Discover Clubs</h2>
              <div className="fcp-search-wrap">
                <FiSearch className="fcp-search-icon" />
                <input
                  type="text"
                  className="fcp-search"
                  placeholder="Search clubs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="fcp-sport-filters">
              {SPORT_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`fcp-filter-btn${sport === s ? ' active' : ''}`}
                  onClick={() => setSport(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {discoverClubs.length === 0 ? (
              <p className="fcp-empty-text">No clubs match your search.</p>
            ) : (
              <div className="fcp-clubs-grid">
                {discoverClubs.map((club) => (
                  <ClubCard
                    key={club.slug}
                    club={club}
                    isFollowing={followedSlugs.has(club.slug)}
                    onToggleFollow={handleToggleFollow}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanClubsPage;
