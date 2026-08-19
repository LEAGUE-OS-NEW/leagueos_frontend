import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiTag, FiSearch } from 'react-icons/fi';
import SafeImage from '../../../components/SafeImage/SafeImage';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { getMyTickets, type TicketApi } from '../../../services/ticketingService';
import {
  getPublicFixtures,
  type PublicFixtureApi,
} from '../../../services/publicDashboardService';
import {
  getMatchTicketTypes,
  type TicketTypeApi,
} from '../../../services/ticketCheckoutService';
import '../sections/FanDashboard.css';
import './FanTicketsPage.css';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type TicketableMatch = { fixture: PublicFixtureApi; ticketTypes: TicketTypeApi[] };

function formatFixtureDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return { date: 'Date TBC', time: 'Time TBC' };
  return {
    date: new Intl.DateTimeFormat('en-UG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-UG', { hour: 'numeric', minute: '2-digit' }).format(date),
  };
}

function formatCurrency(amount: number, currency = 'UGX') {
  return `${currency} ${amount.toLocaleString()}`;
}

function getLowestPrice(types: TicketTypeApi[]) {
  const prices = types.map((t) => Number(t.price)).filter((p) => Number.isFinite(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

function getSeatsLeft(types: TicketTypeApi[]) {
  return types.reduce((n, t) => n + Math.max(0, t.remaining_quantity), 0);
}

function competitionColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes('rugby')) return '#f97316';
  if (n.includes('basketball')) return '#38bdf8';
  return '#a855f7';
}

function teamInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'LO';
}

function TeamBadge({ name, logo }: { name: string; logo?: string | null }) {
  return (
    <div className="ftp-team">
      <SafeImage
        src={logo}
        alt={name}
        className="ftp-team-logo"
        fallbackClassName="ftp-team-fallback"
        fallback={teamInitials(name)}
      />
      <span className="ftp-team-name">{name}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* My Ticket stub                                                      */
/* ------------------------------------------------------------------ */

function MyTicketCard({ ticket }: { ticket: TicketApi }) {
  const matchDate = ticket.match_date ? new Date(ticket.match_date) : null;
  const month = matchDate
    ? matchDate.toLocaleDateString('en-UG', { month: 'short' }).toUpperCase()
    : '—';
  const day = matchDate ? String(matchDate.getDate()).padStart(2, '0') : '—';

  return (
    <article className="ftp-stub">
      <div className="ftp-stub-date">
        <span className="ftp-stub-month">{month}</span>
        <span className="ftp-stub-day">{day}</span>
      </div>
      <div className="ftp-stub-divider" aria-hidden="true" />
      <div className="ftp-stub-info">
        <p className="ftp-stub-competition">{ticket.competition_name ?? ticket.match_label}</p>
        <p className="ftp-stub-match">{ticket.match_label}</p>
        <p className="ftp-stub-meta">
          <FiTag /> {ticket.ticket_type_name}
        </p>
        <p className="ftp-stub-meta">
          <FiCalendar /> Code: {ticket.ticket_code}
        </p>
      </div>
      <span className={`ftp-stub-status ftp-stub-status--${ticket.status.toLowerCase()}`}>
        {ticket.status}
      </span>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Match card (browse)                                                 */
/* ------------------------------------------------------------------ */

function MatchCard({
  fixture,
  ticketTypes,
  onBuy,
}: {
  fixture: PublicFixtureApi;
  ticketTypes: TicketTypeApi[];
  onBuy: () => void;
}) {
  const { date, time } = formatFixtureDate(fixture.match_date);
  const seatsLeft = getSeatsLeft(ticketTypes);
  const lowestPrice = getLowestPrice(ticketTypes);
  const currency = ticketTypes[0]?.currency ?? 'UGX';
  const hasTickets = ticketTypes.length > 0 && seatsLeft > 0;
  const preview = ticketTypes.slice(0, 2);

  return (
    <article className="ftp-match-card">
      <div className="ftp-match-card-top">
        <span className="ftp-competition" style={{ color: competitionColor(fixture.competition_name) }}>
          {fixture.competition_name}
        </span>
        <span className="ftp-date-pill">{date}</span>
      </div>

      <div className="ftp-teams">
        <TeamBadge name={fixture.home_club_name} logo={fixture.home_club_logo_url} />
        <span className="ftp-vs">VS</span>
        <TeamBadge name={fixture.away_club_name} logo={fixture.away_club_logo_url} />
      </div>

      <div className="ftp-match-meta">
        <span><FiCalendar /> {date} · {time}</span>
        <span><FiMapPin /> {fixture.venue || 'Venue TBC'}</span>
      </div>

      {preview.length > 0 ? (
        <div className="ftp-ticket-types">
          {preview.map((t) => (
            <div key={t.id} className="ftp-ticket-type">
              <span>{t.name}</span>
              <strong>{formatCurrency(Number(t.price), t.currency)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="ftp-types-pending">Ticket categories being prepared.</p>
      )}

      <div className="ftp-buy-row">
        <span className="ftp-seats-label">
          {hasTickets ? `${seatsLeft} seats left` : 'Pending'}
          {lowestPrice ? ` · From ${formatCurrency(lowestPrice, currency)}` : ''}
        </span>
        <button
          type="button"
          className={`ftp-buy-btn${hasTickets ? '' : ' disabled'}`}
          onClick={onBuy}
          disabled={!hasTickets}
        >
          {hasTickets ? 'Buy Ticket' : 'Unavailable'}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function FanTicketsPage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // My tickets (real from backend)
  const [myTickets, setMyTickets] = useState<TicketApi[]>([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(true);

  // Browse (backend)
  const [ticketableMatches, setTicketableMatches] = useState<TicketableMatch[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseMessage, setBrowseMessage] = useState('');
  const [activeLeague, setActiveLeague] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMyTicketsLoading(true);
      try {
        const tickets = await getMyTickets();
        if (!cancelled) setMyTickets(tickets);
      } catch {
        if (!cancelled) setMyTickets([]);
      } finally {
        if (!cancelled) setMyTicketsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const fixtures = await getPublicFixtures();
        const rows = await Promise.all(
          fixtures.map(async (f) => {
            try {
              const res = await getMatchTicketTypes(f.id);
              return { fixture: f, ticketTypes: res.ticket_types.filter((t) => t.status === 'ACTIVE') };
            } catch {
              return { fixture: f, ticketTypes: [] };
            }
          }),
        );
        if (!alive) return;
        setTicketableMatches(rows);
      } catch {
        if (!alive) return;
        setTicketableMatches([]);
        setBrowseMessage('Could not load matches from the backend.');
      } finally {
        if (alive) setBrowseLoading(false);
      }
    }

    void load();
    return () => { alive = false; };
  }, []);

  const leagues = useMemo(() => {
    const names = Array.from(new Set(ticketableMatches.map((m) => m.fixture.competition_name).filter(Boolean)));
    return ['All', ...names];
  }, [ticketableMatches]);

  const q = searchQuery.trim().toLowerCase();
  const filtered = ticketableMatches.filter(({ fixture }) => {
    const leagueOk = activeLeague === 'All' || fixture.competition_name === activeLeague;
    if (!leagueOk) return false;
    if (!q) return true;
    return `${fixture.home_club_name} ${fixture.away_club_name} ${fixture.competition_name} ${fixture.venue}`.toLowerCase().includes(q);
  });

  return (
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content">
          <div className="ftp-inner">

            {/* ── My Tickets ── */}
            <section className="ftp-section">
              <div className="ftp-section-head">
                <h2>My Tickets</h2>
                <span className="ftp-section-count">{myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''}</span>
              </div>

              {myTicketsLoading ? (
                <div className="ftp-loading">Loading your tickets…</div>
              ) : myTickets.length === 0 ? (
                <div className="ftp-empty">
                  <p className="ftp-empty-title">No tickets yet</p>
                  <p>Browse matches below and grab your seat.</p>
                </div>
              ) : (
                <div className="ftp-stubs-row">
                  {myTickets.map((t) => (
                    <MyTicketCard key={t.id} ticket={t} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Browse & Buy ── */}
            <section className="ftp-section">
              <div className="ftp-section-head">
                <h2>Browse &amp; Buy</h2>
                {!browseLoading && (
                  <span className="ftp-section-count">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
                )}
              </div>

              {/* Filters */}
              <div className="ftp-filters">
                <div className="ftp-league-chips">
                  {leagues.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`ftp-chip${activeLeague === l ? ' active' : ''}`}
                      onClick={() => setActiveLeague(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <label className="ftp-search">
                  <FiSearch />
                  <input
                    type="search"
                    placeholder="Search by club, competition or venue…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>

              {browseMessage && <p className="ftp-browse-msg">{browseMessage}</p>}

              {browseLoading ? (
                <div className="ftp-loading">Loading matches…</div>
              ) : filtered.length === 0 ? (
                <div className="ftp-empty">
                  <p className="ftp-empty-title">No matches found</p>
                  <p>Try adjusting your league filter or search term.</p>
                </div>
              ) : (
                <div className="ftp-match-grid">
                  {filtered.map(({ fixture, ticketTypes }) => (
                    <MatchCard
                      key={fixture.id}
                      fixture={fixture}
                      ticketTypes={ticketTypes}
                      onBuy={() => navigate(`/tickets/${fixture.id}/checkout`)}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
