import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TicketsLandingPage.css';
import BackButton from '../../../components/auth/BackButton';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import SafeImage from '../../../components/SafeImage/SafeImage';
import { getToken } from '../../../utils/tokenManager.ts';
const logo = "/images/cta-banner.png";
import {
  getPublicFixtures,
  type PublicFixtureApi,
} from '../../../services/publicDashboardService';
import {
  getMatchTicketTypes,
  type TicketTypeApi,
} from '../../../services/ticketCheckoutService';

type TicketableMatch = {
  fixture: PublicFixtureApi;
  ticketTypes: TicketTypeApi[];
};

function formatFixtureDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: 'Date to be confirmed', time: 'Time to be confirmed' };
  }

  return {
    date: new Intl.DateTimeFormat('en-UG', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-UG', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

function formatCurrency(amount: number, currency = 'UGX') {
  return `${currency} ${amount.toLocaleString()}`;
}

function getCompetitionColor(competitionName: string) {
  const normalized = competitionName.toLowerCase();

  if (normalized.includes('rugby')) return '#f97316';
  if (normalized.includes('basketball')) return '#38bdf8';
  if (normalized.includes('football') || normalized.includes('premier')) return '#a855f7';

  return '#8b35ff';
}

function getLowestTicketPrice(ticketTypes: TicketTypeApi[]) {
  const prices = ticketTypes
    .map((ticketType) => Number(ticketType.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length ? Math.min(...prices) : null;
}

function getSeatsLeft(ticketTypes: TicketTypeApi[]) {
  return ticketTypes.reduce(
    (total, ticketType) => total + Math.max(0, ticketType.remaining_quantity),
    0,
  );
}

function TeamBadge({ name, logo }: { name: string; logo?: string | null }) {
  const fallback = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="team-badge">
      <SafeImage
        src={logo}
        alt={name}
        className="team-logo"
        fallbackClassName="team-logo-placeholder"
        fallback={fallback || 'CL'}
      />
      <span className="team-name">{name}</span>
    </div>
  );
}

function LoginPromptModal({
  onClose,
  onLogin,
  onRegister,
}: {
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <img src={logo} alt="League OS" className="modal-logo" />

        <h2 className="modal-title">Sign in to buy tickets</h2>

        <p className="modal-body">
          Create an account or log in to purchase tickets, manage your bookings, and get
          match-day updates.
        </p>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onLogin}>
            Log In
          </button>
          <button className="btn-secondary" onClick={onRegister}>
            Create Account
          </button>
        </div>

        <p className="modal-footnote">Get a free account now and enjoy League OS.</p>
      </div>
    </div>
  );
}

export default function TicketsLandingPage() {
  const navigate = useNavigate();
  const [activeLeague, setActiveLeague] = useState('All Leagues');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [ticketableMatches, setTicketableMatches] = useState<TicketableMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const isLoggedIn = Boolean(getToken());

  useEffect(() => {
    let isMounted = true;

    async function loadTicketableMatches() {
      setIsLoading(true);
      setPageMessage('');

      try {
        const fixtures = await getPublicFixtures();

        const rows = await Promise.all(
          fixtures.map(async (fixture) => {
            try {
              const response = await getMatchTicketTypes(fixture.id);

              return {
                fixture,
                ticketTypes: response.ticket_types.filter(
                  (ticketType) => ticketType.status === 'ACTIVE',
                ),
              };
            } catch {
              return { fixture, ticketTypes: [] };
            }
          }),
        );

        if (!isMounted) return;

        setTicketableMatches(rows);
      } catch {
        if (!isMounted) return;

        setTicketableMatches([]);
        setPageMessage(
          'Ticket matches could not be loaded from the backend. Confirm the public fixtures and ticket types APIs are available.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTicketableMatches();

    return () => {
      isMounted = false;
    };
  }, []);

  const leagues = useMemo(() => {
    const competitionNames = Array.from(
      new Set(ticketableMatches.map((match) => match.fixture.competition_name).filter(Boolean)),
    );

    return ['All Leagues', ...competitionNames];
  }, [ticketableMatches]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredMatches = ticketableMatches.filter((match) => {
    const matchesLeague =
      activeLeague === 'All Leagues' || match.fixture.competition_name === activeLeague;

    if (!matchesLeague) return false;
    if (!normalizedSearchQuery) return true;

    return `${match.fixture.home_club_name} ${match.fixture.away_club_name} ${match.fixture.competition_name} ${match.fixture.venue}`
      .toLowerCase()
      .includes(normalizedSearchQuery);
  });

  const handleBuyTicket = (matchId: number) => {
    if (!getToken()) {
      setShowLoginPrompt(true);
      return;
    }

    navigate(`/tickets/${matchId}/checkout`);
  };

  return (
    <div className="tickets-page">
      <Navbar />

      <main className="tickets-main">
        <div className="tickets-inner">
        <div className="tickets-page-actions">
          <BackButton />

          {isLoggedIn ? (
            <div className="tickets-auth-actions">
              <button type="button" onClick={() => navigate('/dashboard/tickets')}>
                My Tickets
              </button>
              <button type="button" onClick={() => navigate('/dashboard/wallet')}>
                Wallet
              </button>
            </div>
          ) : (
            <button className="signup-btn" onClick={() => navigate('/register')}>
              Sign Up
            </button>
          )}
        </div>

        <section className="tickets-header tickets-hero-panel">
          <h1>
            <span className="tickets-header-plain">Match </span>
            <span className="tickets-header-accent">Tickets</span>
          </h1>

          <p>
            Browse available match tickets across rugby, football, basketball and community
            competitions. Compare categories, check availability and reserve your seat.
          </p>
        </section>

        {pageMessage ? <div className="tickets-empty-state">{pageMessage}</div> : null}

        <section className="tickets-browse-bar" aria-label="Ticket filters">
          <div className="tickets-filters">
            <div className="league-filters">
              {leagues.map((league) => (
                <button
                  key={league}
                  className={`league-btn ${activeLeague === league ? 'league-btn-active' : ''}`}
                  onClick={() => setActiveLeague(league)}
                >
                  {league}
                </button>
              ))}
            </div>
          </div>

          <div className="ticket-search-panel">
            <label>
              <span>Search</span>
              <input
                type="search"
                placeholder="Search by club, competition or venue..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
        </section>

        {!isLoading ? (
          <p className="tickets-results-count">
            Showing {filteredMatches.length} of {ticketableMatches.length} ticketed matches
          </p>
        ) : null}

        {isLoading ? (
          <div className="tickets-empty-state">Loading backend ticket matches...</div>
        ) : filteredMatches.length ? (
          <div className="match-grid">
            {filteredMatches.map(({ fixture, ticketTypes }) => {
              const { date, time } = formatFixtureDate(fixture.match_date);
              const seatsLeft = getSeatsLeft(ticketTypes);
              const lowestPrice = getLowestTicketPrice(ticketTypes);
              const currency = ticketTypes[0]?.currency ?? 'UGX';
              const hasTickets = ticketTypes.length > 0 && seatsLeft > 0;
              const previewTicketTypes = ticketTypes.slice(0, 2);

              return (
                <article key={fixture.id} className="match-card">
                  <div className="match-card-header">
                    <span
                      className="match-league"
                      style={{ color: getCompetitionColor(fixture.competition_name) }}
                    >
                      {fixture.competition_name}
                    </span>

                    <span className="match-date-pill">{date}</span>
                  </div>

                  <div className="match-teams">
                    <TeamBadge name={fixture.home_club_name} logo={fixture.home_club_logo_url} />
                    <span className="vs-label">VS</span>
                    <TeamBadge name={fixture.away_club_name} logo={fixture.away_club_logo_url} />
                  </div>

                  <div className="match-card-details">
                    <span>📅 {date} • {time}</span>
                    <span>📍 {fixture.venue || 'Venue to be confirmed'}</span>
                  </div>

                  {previewTicketTypes.length ? (
                    <div className="ticket-preview-list">
                      {previewTicketTypes.map((ticketType) => (
                        <div key={ticketType.id} className="ticket-preview-item">
                          <span>{ticketType.name}</span>
                          <strong>
                            {formatCurrency(Number(ticketType.price), ticketType.currency)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ticket-preview-empty">Ticket categories are being prepared.</div>
                  )}

                  <div className="match-buy-row">
                    <span className="match-buy-seats">
                      {hasTickets ? `${seatsLeft} seats left` : 'Ticket types pending'}
                      {lowestPrice ? ` • From ${formatCurrency(lowestPrice, currency)}` : ''}
                    </span>

                    <button
                      className="buy-btn buy-btn-ordinary"
                      onClick={() => handleBuyTicket(fixture.id)}
                      disabled={!hasTickets}
                    >
                      {hasTickets ? 'Buy Ticket' : 'Unavailable'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="tickets-empty-state">
            No ticketable backend fixtures are currently available.
          </div>
        )}
        </div>{/* end tickets-inner */}
      </main>

      <Footer />

      {showLoginPrompt && (
        <LoginPromptModal
          onClose={() => setShowLoginPrompt(false)}
          onLogin={() => navigate('/login')}
          onRegister={() => navigate('/register')}
        />
      )}
    </div>
  );
}
