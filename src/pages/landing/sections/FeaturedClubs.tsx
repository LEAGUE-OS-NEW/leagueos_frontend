import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { fetchClubs, fetchFollowedClubSlugs, followClub, unfollowClub, type ClubSummary } from '../../../services/clubsService';
import './FeaturedClubs.css';

function CrestPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function ClubCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="club-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="club-crest club-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function FeaturedClubs() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [followedSlugs, setFollowedSlugs] = useState<Set<string>>(new Set());

  const { profile } = useCurrentUser();
  const isLoggedIn = Boolean(profile);

  const closePrompt = () => setIsPromptOpen(false);

  const scrollByAmount = (amount: number) => {
    trackRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  useEffect(() => {
    let cancelled = false;

    fetchClubs({ ordering: '-created_at' }).then((result) => {
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
      // Follow/unfollow failed silently — the button just stays in its
      // previous state, matching this page's existing no-toast pattern.
    }
  };

  useEffect(() => {
    document.body.style.overflow = isPromptOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPromptOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPromptOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="featured-clubs">
      <div className="featured-clubs-inner">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Featured Clubs</h2>
            <p className="section-subheading">Follow your favorite clubs and never miss a moment.</p>
          </div>
          <Link to="/clubs" className="section-link">
            View all clubs
          </Link>
        </div>

        <div className="clubs-carousel">
          <button
            type="button"
            className="clubs-nav clubs-nav-prev"
            aria-label="Scroll clubs left"
            onClick={() => scrollByAmount(-320)}
          >
            <FiChevronLeft />
          </button>

          <div className="clubs-track" ref={trackRef}>
            {clubs.map((club) => {
              const isFollowing = followedSlugs.has(club.slug);
              return (
                <div className="club-card" key={club.slug}>
                  <ClubCrest src={club.crest} name={club.name} />
                  <p className="club-name">{club.name}</p>
                  <p className="club-meta">
                    {club.sport} · {club.league}
                  </p>
                  <button
                    type="button"
                    className="club-follow-btn"
                    onClick={() => (isLoggedIn ? void handleToggleFollow(club.slug) : setIsPromptOpen(true))}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="clubs-nav clubs-nav-next"
            aria-label="Scroll clubs right"
            onClick={() => scrollByAmount(320)}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {isPromptOpen && (
        <>
          <div className="signup-prompt-backdrop" onClick={closePrompt} aria-hidden="true" />
          <div className="signup-prompt" role="dialog" aria-modal="true" aria-label="Sign up to follow clubs">
            <button type="button" className="signup-prompt-close" aria-label="Close" onClick={closePrompt}>
              <FiX />
            </button>
            <h3 className="signup-prompt-title">Sign up to follow clubs</h3>
            <p className="signup-prompt-text">
              Create a free League OS account to follow clubs and get real-time updates on your favorite teams.
            </p>
            <Link to="/signup" className="signup-prompt-btn" onClick={closePrompt}>
              Sign Up
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export default FeaturedClubs;
