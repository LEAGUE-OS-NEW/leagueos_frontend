import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiChevronRight } from 'react-icons/fi';
import './FeaturedClubStores.css';

type ClubStore = {
  name: string;
  sport: string;
  crest?: string;
  color: string;
};

const CLUB_STORES: ClubStore[] = [
  { name: 'Vipers SC', sport: 'Football', crest: '/clubs/vipers-sc.png', color: '#dc2626' },
  { name: 'KCCA FC', sport: 'Football', crest: '/clubs/kcca-fc.png', color: '#ca8a04' },
  { name: 'SC Villa', sport: 'Football', crest: '/clubs/sc-villa.png', color: '#2563eb' },
  { name: 'Express FC', sport: 'Football', crest: '/clubs/express-fc.png', color: '#b91c1c' },
  { name: 'KOBS Rugby', sport: 'Rugby', crest: '/clubs/kobs.jpg', color: '#15803d' },
  { name: 'Black Pirates', sport: 'Rugby', crest: '/clubs/black-pirates.png', color: '#18181b' },
  { name: 'Heathens RC', sport: 'Rugby', crest: '/clubs/platinum-heathens.jpg', color: '#7f1d1d' },
  { name: 'City Oilers', sport: 'Basketball', crest: '/clubs/city-oilers.png', color: '#1d4ed8' },
  { name: 'UCU Canons', sport: 'Basketball', color: '#9f1239' },
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

function FeaturedClubStores() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
  };

  return (
    <section className="store-panel featured-club-stores" aria-labelledby="featured-club-stores-heading">
      <div className="store-panel-heading">
        <h2 id="featured-club-stores-heading">Featured Club Stores</h2>
        <Link to="/clubs" className="store-view-link">
          View all clubs
          <FiArrowRight />
        </Link>
      </div>

      <div className="club-store-row">
        <div className="club-store-scroller" ref={scrollerRef}>
          {CLUB_STORES.map((club) => (
            <Link to="/clubs" className="club-store-card" style={{ backgroundColor: club.color }} key={club.name}>
              <span className="club-store-crest">
                {club.crest ? <img src={club.crest} alt={`${club.name} crest`} /> : <CrestPlaceholder />}
              </span>
              <span className="club-store-name">{club.name}</span>
              <span className="club-store-sport">{club.sport}</span>
            </Link>
          ))}
        </div>

        <button type="button" className="club-store-scroll-btn" onClick={scrollNext} aria-label="Scroll to next club stores">
          <FiChevronRight />
        </button>
      </div>
    </section>
  );
}

export default FeaturedClubStores;
