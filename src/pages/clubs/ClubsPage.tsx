import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  fetchClubs,
  fetchFollowedClubSlugs,
  followClub,
  unfollowClub,
  type ClubSummary,
} from '../../services/clubsService';
import './ClubsPage.css';

const SPORTS = ['All', 'Football', 'Rugby', 'Basketball'] as const;
type Filter = (typeof SPORTS)[number];

function CrestPlaceholder() {
  return (
    <div className="club-info-card__crest-placeholder" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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

function ClubCard({
  club,
  isFollowing,
  isLoggedIn,
  onToggleFollow,
  onRequireSignup,
}: {
  club: ClubSummary;
  isFollowing: boolean;
  isLoggedIn: boolean;
  onToggleFollow: (slug: string) => void;
  onRequireSignup: () => void;
}) {
  const badgeClass = `club-info-card__sport-badge club-info-card__sport-badge--${club.sport.toLowerCase()}`;

  return (
    <article className="club-info-card">
      {club.crest ? (
        <img src={club.crest} alt={`${club.name} crest`} className="club-info-card__crest" />
      ) : (
        <CrestPlaceholder />
      )}

      <h3 className="club-info-card__name">{club.name}</h3>
      <span className={badgeClass}>{club.sport}</span>

      <div className="club-info-card__divider" />

      <div className="club-info-card__meta">
        <div className="club-info-card__meta-row">
          <span className="club-info-card__meta-label">League</span>
          <span className="club-info-card__meta-value">{club.league}</span>
        </div>
        <div className="club-info-card__meta-row">
          <span className="club-info-card__meta-label">Founded</span>
          <span className="club-info-card__meta-value">{club.founded}</span>
        </div>
        <div className="club-info-card__meta-row">
          <span className="club-info-card__meta-label">Stadium</span>
          <span className="club-info-card__meta-value">{club.stadium}</span>
        </div>
      </div>

      <p className="club-info-card__desc">{club.description}</p>

      <div className="club-info-card__actions">
        <Link to={`/clubs/${club.slug}`} className="club-info-card__btn club-info-card__btn--outline">
          View Profile
        </Link>
        <button
          type="button"
          className={`club-info-card__btn${isFollowing ? ' club-info-card__btn--following' : ''}`}
          onClick={() => (isLoggedIn ? onToggleFollow(club.slug) : onRequireSignup())}
        >
          {isFollowing ? 'Following' : 'Follow Club'}
        </button>
      </div>
    </article>
  );
}

function ClubsPage() {
  const { profile } = useCurrentUser();
  const isLoggedIn = Boolean(profile);

  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [followedSlugs, setFollowedSlugs] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchClubs().then((result) => {
      if (!cancelled) setClubs(result);
    });
    if (isLoggedIn) {
      fetchFollowedClubSlugs().then((slugs) => {
        if (!cancelled) setFollowedSlugs(new Set(slugs));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleToggleFollow = async (slug: string) => {
    try {
      if (followedSlugs.has(slug)) {
        await unfollowClub(slug);
        setFollowedSlugs((current) => {
          const next = new Set(current);
          next.delete(slug);
          return next;
        });
      } else {
        await followClub(slug);
        setFollowedSlugs((current) => new Set(current).add(slug));
      }
    } catch {
      // Follow/unfollow failed — leave the button in its previous state.
    }
  };

  const searched = search.trim()
    ? clubs.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : clubs;
  const filtered = activeFilter === 'All' ? searched : searched.filter((c) => c.sport === activeFilter);

  const grouped = (['Football', 'Rugby', 'Basketball'] as const)
    .map((sport) => ({
      sport,
      clubs: filtered.filter((c) => c.sport === sport),
    }))
    .filter((g) => g.clubs.length > 0);

  return (
    <div className="clubs-page">
      <Navbar />

      <main>
        <div className="clubs-hero">
          <span className="clubs-hero__eyebrow">Ugandan Sport</span>
          <h1 className="clubs-hero__title">
            Meet the <span>Clubs</span>
          </h1>
          <p className="clubs-hero__sub">
            Follow your favourite clubs across football, rugby, and basketball — all in one place.
          </p>
        </div>

        <div className="clubs-search">
          <input
            type="search"
            className="clubs-search__input"
            placeholder="Search clubs by name…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search clubs by name"
          />
        </div>

        <div className="clubs-filters">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`clubs-filter-btn${activeFilter === s ? ' active' : ''}`}
              onClick={() => setActiveFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {grouped.length === 0 && <p className="clubs-empty">No clubs found.</p>}

        {grouped.map(({ sport, clubs: sportClubs }) => (
          <div className="clubs-group" key={sport}>
            <p className="clubs-group__label">{sport}</p>
            <div className="clubs-grid">
              {sportClubs.map((club) => (
                <ClubCard
                  key={club.slug}
                  club={club}
                  isFollowing={followedSlugs.has(club.slug)}
                  isLoggedIn={isLoggedIn}
                  onToggleFollow={handleToggleFollow}
                  onRequireSignup={() => setShowPrompt(true)}
                />
              ))}
            </div>
          </div>
        ))}
      </main>

      {showPrompt && (
        <>
          <div className="clubs-signup-overlay" onClick={() => setShowPrompt(false)} aria-hidden="true" />
          <div className="clubs-signup-modal" role="dialog" aria-modal="true" aria-label="Sign up to follow clubs">
            <h3 className="clubs-signup-modal__title">Sign up to follow clubs</h3>
            <p className="clubs-signup-modal__body">
              Create a free League OS account to follow clubs and never miss a moment.
            </p>
            <a href="/signup" className="clubs-signup-modal__cta">
              Sign Up Free
            </a>
            <button type="button" onClick={() => setShowPrompt(false)} className="clubs-signup-modal__dismiss">
              Maybe later
            </button>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

export default ClubsPage;
