import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  FiArrowRight,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiGrid,
  FiHeadphones,
  FiLock,
  FiMail,
  FiMap,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSmartphone,
  FiStar,
  FiZap,
} from 'react-icons/fi';
import { GiBasketballBall, GiRugbyConversion, GiSoccerBall } from 'react-icons/gi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import { useAuthStore } from '../../store/authStore';
import {
  TICKET_EVENTS,
  FEATURED_EVENTS,
  POPULAR_EVENTS,
  getLeagueSlug,
  formatUGX,
  type Sport,
} from '../../data/ticketEvents';
import './TicketsPage.css';

type SportFilter = 'All Sports' | Sport;
type PriceFilter = 'Any Price' | 'Under 20,000' | '20,000+';

const SPORT_ICON: Record<Sport, IconType> = {
  Football: GiSoccerBall,
  Rugby: GiRugbyConversion,
  Basketball: GiBasketballBall,
};

const SPORT_FILTERS: SportFilter[] = ['All Sports', 'Football', 'Rugby', 'Basketball'];
const PRICE_FILTERS: PriceFilter[] = ['Any Price', 'Under 20,000', '20,000+'];
const VENUES = ['All Venues', ...new Set(TICKET_EVENTS.map((event) => event.venue))];
const CITIES = ['All Cities', ...new Set(TICKET_EVENTS.map((event) => event.city))];

const TRUST_BADGES: { icon: IconType; title: string; description: string }[] = [
  { icon: FiShield, title: 'Official Tickets', description: '100% verified & secure' },
  { icon: FiStar, title: 'Best Seats', description: 'Great views. Great vibes.' },
  { icon: FiZap, title: 'Instant Delivery', description: 'E-tickets to your phone' },
];

const HOW_IT_WORKS_STEPS: { icon: IconType; title: string; description: string }[] = [
  { icon: FiSearch, title: 'Browse', description: 'Find your match and choose the game you want to attend.' },
  { icon: FiGrid, title: 'Choose Your Seat', description: 'Pick your preferred section and number of tickets.' },
  { icon: FiCreditCard, title: 'Pay Securely', description: 'Checkout safely using mobile money or card.' },
  { icon: FiSmartphone, title: 'Scan & Enter', description: 'Receive your e-ticket with QR code and scan at the gate.' },
];

const TRUST_STRIP: { icon: IconType; title: string; description: string }[] = [
  { icon: FiShield, title: '100% Official', description: 'Verified tickets from trusted organizers.' },
  { icon: FiLock, title: 'Secure Payments', description: 'Safe, encrypted payments you can trust.' },
  { icon: FiZap, title: 'Instant Delivery', description: 'E-tickets delivered instantly.' },
  { icon: FiHeadphones, title: 'Fan Support', description: "We're here to help 24/7." },
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

function TeamCrest({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <span className="ticket-crest">
        <CrestPlaceholder />
      </span>
    );
  }

  return (
    <span className="ticket-crest ticket-crest-image">
      <img src={src} alt={`${name} crest`} />
    </span>
  );
}

function SportIcon({ sport }: { sport: Sport }) {
  const Icon = SPORT_ICON[sport];
  return <Icon aria-hidden="true" />;
}

function TicketsPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [sportFilter, setSportFilter] = useState<SportFilter>('All Sports');
  const [venueFilter, setVenueFilter] = useState('All Venues');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('Any Price');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  const popularTrackRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return TICKET_EVENTS.filter((event) => {
      if (sportFilter !== 'All Sports' && event.sport !== sportFilter) return false;
      if (venueFilter !== 'All Venues' && event.venue !== venueFilter) return false;
      if (cityFilter !== 'All Cities' && event.city !== cityFilter) return false;
      if (priceFilter === 'Under 20,000' && event.priceFrom >= 20000) return false;
      if (priceFilter === '20,000+' && event.priceFrom < 20000) return false;
      if (query) {
        const haystack = `${event.teamA} ${event.teamB} ${event.venue} ${event.city}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [sportFilter, venueFilter, cityFilter, priceFilter, searchQuery]);

  const visibleEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 5);

  const resetFilters = () => {
    setSportFilter('All Sports');
    setVenueFilter('All Venues');
    setCityFilter('All Cities');
    setPriceFilter('Any Price');
    setSearchQuery('');
    setShowAllEvents(false);
  };

  const handleBuyClick = (eventId: string) => {
    if (accessToken) {
      navigate(`/tickets/${eventId}/checkout`);
    } else {
      setShowSignupPrompt(true);
    }
  };

  const scrollPopular = (direction: 'left' | 'right') => {
    const track = popularTrackRef.current;
    if (!track) return;
    const amount = track.clientWidth * 0.8 * (direction === 'left' ? -1 : 1);
    track.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="tickets-page">
      <Navbar />

      <main className="tickets-main">
        <div className="tickets-main-inner">
          <section className="tickets-hero">
            <img className="tickets-hero-image" src="/images/fantasy2.png" alt="" aria-hidden="true" />
            <div className="tickets-hero-overlay" aria-hidden="true" />
            <div className="tickets-hero-inner">
              <h1 className="tickets-heading">
                Tickets for
                <br />
                <span className="tickets-heading-gradient">Uganda&rsquo;s Biggest Games.</span>
              </h1>
              <p className="tickets-subtext">
                Browse upcoming fixtures, choose your section and get match-ready.
              </p>

              <div className="tickets-hero-badges">
                {TRUST_BADGES.map((badge) => (
                  <div className="tickets-hero-badge" key={badge.title}>
                    <badge.icon aria-hidden="true" />
                    <div>
                      <b>{badge.title}</b>
                      <span>{badge.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="tickets-filters" aria-label="Filter tickets">
            <label className="tickets-filter">
              <span>Sport</span>
              <select value={sportFilter} onChange={(event) => setSportFilter(event.target.value as SportFilter)}>
                {SPORT_FILTERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="tickets-filter">
              <span>Venue</span>
              <select value={venueFilter} onChange={(event) => setVenueFilter(event.target.value)}>
                {VENUES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="tickets-filter">
              <span>City</span>
              <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
                {CITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="tickets-filter">
              <span>Price</span>
              <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}>
                {PRICE_FILTERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="tickets-reset-btn" onClick={resetFilters}>
              <FiRefreshCw /> Reset Filters
            </button>

            <label className="tickets-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search teams or venues"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </section>

          <section className="ticket-panel featured-matches-panel" aria-labelledby="featured-matches-heading">
            <div className="ticket-panel-heading">
              <h2 id="featured-matches-heading">Featured Matches</h2>
              <a href="#upcoming-events" className="ticket-view-link">
                View all tickets
              </a>
            </div>

            <div className="featured-matches-grid">
              {FEATURED_EVENTS.map((event) => {
                const slug = getLeagueSlug(event.league);
                return (
                  <article className="featured-match-card" key={event.id}>
                    <div className="featured-match-top">
                      <span className={`league-badge league-badge--${slug}`}>{event.league}</span>
                      <span className="featured-match-datetime">
                        {event.date.toUpperCase()} &bull; {event.time}
                      </span>
                    </div>

                    <div className="featured-match-teams">
                      <div className="featured-match-team">
                        <TeamCrest src={event.crestA} name={event.teamA} />
                        <span>{event.teamA}</span>
                      </div>
                      <span className="featured-match-vs">vs</span>
                      <div className="featured-match-team">
                        <TeamCrest src={event.crestB} name={event.teamB} />
                        <span>{event.teamB}</span>
                      </div>
                    </div>

                    <div className="featured-match-location">
                      <span>
                        <FiMapPin /> {event.venue}
                      </span>
                      <span>
                        <FiMap /> {event.city}
                      </span>
                    </div>

                    <div className="featured-match-footer">
                      <span className={`league-price league-price--${slug}`}>
                        From {formatUGX(event.priceFrom)}
                      </span>
                      <button type="button" className="ticket-get-btn" onClick={() => handleBuyClick(event.id)}>
                        Get Tickets <FiArrowRight />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ticket-panel popular-panel" aria-labelledby="popular-heading">
            <div className="ticket-panel-heading">
              <h2 id="popular-heading">
                <FiZap /> Popular This Week
              </h2>
              <a href="#upcoming-events" className="ticket-view-link">
                View all popular
              </a>
            </div>

            <div className="popular-carousel">
              <button
                type="button"
                className="popular-carousel-nav popular-carousel-nav--prev"
                aria-label="Scroll to previous matches"
                onClick={() => scrollPopular('left')}
              >
                <FiChevronLeft />
              </button>

              <div className="popular-track" ref={popularTrackRef}>
                {POPULAR_EVENTS.map((event) => {
                  const slug = getLeagueSlug(event.league);
                  return (
                    <article
                      className="popular-card"
                      key={event.id}
                      onClick={() => handleBuyClick(event.id)}
                    >
                      <div className="popular-card-top">
                        <span className={`league-tag league-tag--${slug}`}>
                          <SportIcon sport={event.sport} /> {event.sport}
                        </span>
                        <span className="popular-card-datetime">
                          {event.date.toUpperCase()} &bull; {event.time}
                        </span>
                      </div>
                      <p className="popular-card-match">
                        {event.teamA} <span>vs</span> {event.teamB}
                      </p>
                      <p className="popular-card-venue">{event.venue}</p>
                      <span className={`league-price league-price--${slug}`}>
                        From {formatUGX(event.priceFrom)}
                      </span>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                className="popular-carousel-nav popular-carousel-nav--next"
                aria-label="Scroll to next matches"
                onClick={() => scrollPopular('right')}
              >
                <FiChevronRight />
              </button>
            </div>
          </section>

          <section className="ticket-panel upcoming-panel" id="upcoming-events" aria-labelledby="upcoming-heading">
            <div className="ticket-panel-heading">
              <h2 id="upcoming-heading">
                <FiCalendar /> Upcoming Events
              </h2>
              <a href="#upcoming-events" className="ticket-view-link">
                View full calendar
              </a>
            </div>

            <div className="upcoming-table" role="table" aria-label="Upcoming ticketed events">
              <div className="upcoming-row upcoming-labels" role="row">
                <span>Date &amp; Time</span>
                <span>Match</span>
                <span>Competition</span>
                <span>Venue</span>
                <span>City</span>
                <span>Tickets From</span>
              </div>

              {visibleEvents.map((event) => (
                <button
                  type="button"
                  className="upcoming-row"
                  role="row"
                  key={event.id}
                  onClick={() => handleBuyClick(event.id)}
                >
                  <span role="cell" className="upcoming-datetime">
                    {event.date} &bull; {event.time}
                  </span>
                  <span role="cell" className="upcoming-match">
                    {event.teamA} vs {event.teamB}
                  </span>
                  <span role="cell" className="upcoming-competition">
                    {event.league}
                  </span>
                  <span role="cell">{event.venue}</span>
                  <span role="cell">{event.city}</span>
                  <span role="cell" className="upcoming-price">
                    {formatUGX(event.priceFrom)} <FiChevronRight />
                  </span>
                </button>
              ))}

              {visibleEvents.length === 0 && (
                <p className="upcoming-empty">No events match these filters right now.</p>
              )}
            </div>

            {filteredEvents.length > 5 && (
              <button type="button" className="upcoming-show-more" onClick={() => setShowAllEvents((v) => !v)}>
                {showAllEvents ? 'Show fewer events' : 'Show more events'}
                <FiChevronDown className={showAllEvents ? 'flipped' : ''} />
              </button>
            )}
          </section>

          <section className="how-ticketing" aria-labelledby="how-ticketing-heading">
            <div className="how-ticketing-intro">
              <span className="how-ticketing-dash" aria-hidden="true" />
              <h2 id="how-ticketing-heading">How Ticketing Works</h2>
              <span className="how-ticketing-dash" aria-hidden="true" />
            </div>

            <div className="how-ticketing-steps">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <article key={step.title}>
                  <span className="how-ticketing-icon">
                    <step.icon aria-hidden="true" />
                  </span>
                  <h3>
                    {index + 1}. {step.title}
                  </h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>

            <div className="how-ticketing-notes">
              <span>
                <FiSmartphone /> <FiMonitor /> Mobile &amp; web checkout supported
              </span>
              <span>
                <FiMail /> Instant e-tickets delivered to your phone or email
              </span>
            </div>
          </section>

          <section className="trust-strip" aria-label="Why buy tickets on League OS">
            {TRUST_STRIP.map((item) => (
              <article key={item.title}>
                <item.icon aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>

      {showSignupPrompt && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5,3,10,0.75)',
              zIndex: 1000,
            }}
            onClick={() => setShowSignupPrompt(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sign up to buy tickets"
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
              Sign up to buy tickets
            </h3>
            <p style={{ color: '#b8bfd8', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.6 }}>
              Create a free League OS account to buy tickets and manage them in one place.
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
              onClick={() => setShowSignupPrompt(false)}
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

export default TicketsPage;
