import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './FeaturedClubs.css';

type Club = {
  name: string;
  sport: string;
  league: string;
  crest?: string;
};

const CLUBS: Club[] = [
  { name: 'Vipers SC', sport: 'Football', league: 'UPL', crest: '/clubs/vipers-sc.png' },
  { name: 'KCCA FC', sport: 'Football', league: 'UPL', crest: '/clubs/kcca-fc.png' },
  { name: 'SC Villa', sport: 'Football', league: 'UPL', crest: '/clubs/sc-villa.png' },
  { name: 'Express FC', sport: 'Football', league: 'UPL', crest: '/clubs/express-fc.png' },
  { name: 'Kobs Rugby', sport: 'Rugby', league: 'Rugby Africa', crest: '/clubs/kobs.jpg' },
  { name: 'Black Pirates', sport: 'Rugby', league: 'Rugby Africa', crest: '/clubs/black-pirates.png' },
  { name: 'City Oilers', sport: 'Basketball', league: 'NBL', crest: '/clubs/city-oilers.png' },
  { name: 'UCU Canons', sport: 'Basketball', league: 'NBL' },
];

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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeaturedClubs() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const toggleFollow = (name: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const scrollByAmount = (amount: number) => {
    trackRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

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
            <ArrowIcon />
          </Link>
        </div>

        <div className="clubs-carousel">
          <button
            type="button"
            className="clubs-nav clubs-nav-prev"
            aria-label="Scroll clubs left"
            onClick={() => scrollByAmount(-320)}
          >
            <ChevronLeftIcon />
          </button>

          <div className="clubs-track" ref={trackRef}>
            {CLUBS.map((club) => {
              const isFollowing = followed.has(club.name);
              return (
                <div className="club-card" key={club.name}>
                  <ClubCrest src={club.crest} name={club.name} />
                  <p className="club-name">{club.name}</p>
                  <p className="club-meta">
                    {club.sport} · {club.league}
                  </p>
                  <button
                    type="button"
                    className={`club-follow-btn${isFollowing ? ' following' : ''}`}
                    aria-pressed={isFollowing}
                    onClick={() => toggleFollow(club.name)}
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
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

export default FeaturedClubs;
