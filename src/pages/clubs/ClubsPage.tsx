import { useState } from 'react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './ClubsPage.css';

type Club = {
  name: string;
  sport: 'Football' | 'Rugby' | 'Basketball';
  league: string;
  crest?: string;
  founded: string;
  stadium: string;
  description: string;
};

const CLUBS: Club[] = [
  {
    name: 'Vipers SC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/vipers-sc.png',
    founded: '2008',
    stadium: "St. Mary's Stadium, Kitende",
    description: 'Record-breaking UPL champions and dominant force in Ugandan football.',
  },
  {
    name: 'KCCA FC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/kcca-fc.png',
    founded: '2008',
    stadium: 'StarTimes Stadium, Lugogo',
    description: 'Kampala Capital City Authority FC — one of Uganda\'s most celebrated clubs.',
  },
  {
    name: 'SC Villa',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/sc-villa.png',
    founded: '1975',
    stadium: 'Mandela National Stadium',
    description: 'The most decorated club in Ugandan football history with over 16 league titles.',
  },
  {
    name: 'Express FC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/express-fc.png',
    founded: '1948',
    stadium: 'Mutesa II Stadium, Wankulukuku',
    description: 'One of Uganda\'s oldest clubs, known as the Red Eagles, with a passionate fanbase.',
  },
  {
    name: 'Kobs Rugby',
    sport: 'Rugby',
    league: 'Rugby Africa',
    crest: '/clubs/kobs.jpg',
    founded: '1953',
    stadium: 'Kyadondo Rugby Club',
    description: 'Uganda\'s most successful rugby club and perennial Rugby Africa Cup contenders.',
  },
  {
    name: 'Black Pirates',
    sport: 'Rugby',
    league: 'Rugby Africa',
    crest: '/clubs/black-pirates.png',
    founded: '1980',
    stadium: 'Legends Rugby Club',
    description: 'Fierce rivals of the Kobs and a powerhouse in Ugandan club rugby.',
  },
  {
    name: 'City Oilers',
    sport: 'Basketball',
    league: 'NBL Uganda',
    crest: '/clubs/city-oilers.png',
    founded: '2012',
    stadium: 'Lugogo Indoor Stadium',
    description: 'The most successful basketball club in East Africa and NBL Uganda\'s flagship team.',
  },
  {
    name: 'UCU Canons',
    sport: 'Basketball',
    league: 'NBL Uganda',
    crest: undefined,
    founded: '2014',
    stadium: 'UCU Main Campus',
    description: 'Uganda Christian University\'s competitive NBL side and City Oilers\' greatest rivals.',
  },
];

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

function ClubCard({ club, onFollow }: { club: Club; onFollow: () => void }) {
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

      <button type="button" className="club-info-card__btn" onClick={onFollow}>
        Follow Club
      </button>
    </article>
  );
}

function ClubsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [showPrompt, setShowPrompt] = useState(false);

  const filtered =
    activeFilter === 'All' ? CLUBS : CLUBS.filter((c) => c.sport === activeFilter);

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

        {grouped.length === 0 && (
          <p className="clubs-empty">No clubs found.</p>
        )}

        {grouped.map(({ sport, clubs }) => (
          <div className="clubs-group" key={sport}>
            <p className="clubs-group__label">{sport}</p>
            <div className="clubs-grid">
              {clubs.map((club) => (
                <ClubCard key={club.name} club={club} onFollow={() => setShowPrompt(true)} />
              ))}
            </div>
          </div>
        ))}
      </main>

      {showPrompt && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5,3,10,0.75)',
              zIndex: 1000,
            }}
            onClick={() => setShowPrompt(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sign up to follow clubs"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              background: '#0d1020',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20,
              padding: '36px 32px',
              maxWidth: 380,
              width: '90vw',
              zIndex: 1001,
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 700 }}>
              Sign up to follow clubs
            </h3>
            <p style={{ color: '#b8bfd8', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.6 }}>
              Create a free League OS account to follow clubs and never miss a moment.
            </p>
            <a
              href="/signup"
              style={{
                display: 'block',
                padding: '11px 0',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#6d5efc,#9d7bff)',
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Sign Up Free
            </a>
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7d84a3',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
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
