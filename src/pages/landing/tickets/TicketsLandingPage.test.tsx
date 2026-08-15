import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TicketsLandingPage from './TicketsLandingPage';
import { getPublicFixtures } from '../../../services/publicDashboardService';
import { getMatchTicketTypes } from '../../../services/ticketCheckoutService';

vi.mock('../../../services/publicDashboardService', () => ({
  getPublicFixtures: vi.fn(),
}));

vi.mock('../../../services/ticketCheckoutService', () => ({
  getMatchTicketTypes: vi.fn(),
}));

const backendFixtures = [
  {
    id: 1,
    competition: 1,
    competition_name: 'Nile Special Rugby Premiership 2026',
    home_club: 1,
    home_club_name: 'KCB KOBS',
    home_club_slug: 'kobs',
    home_club_logo_url: '',
    away_club: 2,
    away_club_name: 'Platinum Credit Heathens',
    away_club_slug: 'heathens-rfc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-14T20:10:00Z',
    venue: 'Legends Rugby Grounds',
  },
  {
    id: 2,
    competition: 1,
    competition_name: 'Nile Special Rugby Premiership 2026',
    home_club: 3,
    home_club_name: 'Black Pirates',
    home_club_slug: 'black-pirates',
    home_club_logo_url: '',
    away_club: 4,
    away_club_name: 'Impis RFC',
    away_club_slug: 'impis-rfc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-15T20:10:00Z',
    venue: 'Kings Park Arena',
  },
  {
    id: 3,
    competition: 2,
    competition_name: 'StarTimes Uganda Premier League 2026',
    home_club: 5,
    home_club_name: 'KCCA FC',
    home_club_slug: 'kcca-fc',
    home_club_logo_url: '',
    away_club: 6,
    away_club_name: 'SC Villa',
    away_club_slug: 'sc-villa',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-16T20:10:00Z',
    venue: 'MTN Omondi Stadium',
  },
  {
    id: 4,
    competition: 2,
    competition_name: 'StarTimes Uganda Premier League 2026',
    home_club: 7,
    home_club_name: 'Vipers SC',
    home_club_slug: 'vipers-sc',
    home_club_logo_url: '',
    away_club: 8,
    away_club_name: 'Express FC',
    away_club_slug: 'express-fc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-17T20:10:00Z',
    venue: "St Mary's Stadium",
  },
  {
    id: 5,
    competition: 3,
    competition_name: 'National Basketball League 2026',
    home_club: 9,
    home_club_name: 'City Oilers',
    home_club_slug: 'city-oilers',
    home_club_logo_url: '',
    away_club: 10,
    away_club_name: 'KIU Titans',
    away_club_slug: 'kiu-titans',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-18T20:10:00Z',
    venue: 'Lugogo Indoor Arena',
  },
  {
    id: 6,
    competition: 3,
    competition_name: 'National Basketball League 2026',
    home_club: 11,
    home_club_name: 'Namuwongo Blazers',
    home_club_slug: 'namuwongo-blazers',
    home_club_logo_url: '',
    away_club: 12,
    away_club_name: 'UCU Canons',
    away_club_slug: 'ucu-canons',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-19T20:10:00Z',
    venue: 'Lugogo Indoor Arena',
  },
  {
    id: 7,
    competition: 1,
    competition_name: 'Nile Special Rugby Premiership 2026',
    home_club: 13,
    home_club_name: 'Rams RFC',
    home_club_slug: 'rams-rfc',
    home_club_logo_url: '',
    away_club: 14,
    away_club_name: 'Mongers RFC',
    away_club_slug: 'mongers-rfc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-20T20:10:00Z',
    venue: 'Makerere Rugby Grounds',
  },
  {
    id: 8,
    competition: 2,
    competition_name: 'StarTimes Uganda Premier League 2026',
    home_club: 15,
    home_club_name: 'BUL FC',
    home_club_slug: 'bul-fc',
    home_club_logo_url: '',
    away_club: 16,
    away_club_name: 'Kitara FC',
    away_club_slug: 'kitara-fc',
    away_club_logo_url: '',
    status: 'SCHEDULED',
    match_date: '2026-07-21T20:10:00Z',
    venue: 'FUFA Technical Centre, Njeru',
  },
];

function buildTicketTypes(matchId: number) {
  return {
    match: {
      id: matchId,
      label: `Fixture ${matchId}`,
      venue: 'Backend venue',
      match_date: '2026-07-14T20:10:00Z',
      status: 'SCHEDULED',
    },
    count: 2,
    ticket_types: [
      {
        id: matchId * 10 + 1,
        match: matchId,
        match_label: `Fixture ${matchId}`,
        name: 'Regular',
        description: 'Backend regular ticket',
        price: '20000.00',
        currency: 'UGX',
        quantity_available: 500,
        quantity_sold: 25,
        active_reserved_quantity: 0,
        remaining_quantity: 475,
        status: 'ACTIVE',
      },
      {
        id: matchId * 10 + 2,
        match: matchId,
        match_label: `Fixture ${matchId}`,
        name: 'VIP Stand',
        description: 'Backend VIP ticket',
        price: '60000.00',
        currency: 'UGX',
        quantity_available: 120,
        quantity_sold: 5,
        active_reserved_quantity: 0,
        remaining_quantity: 115,
        status: 'ACTIVE',
      },
    ],
  };
}

function renderTicketsPage() {
  return render(
    <MemoryRouter>
      <TicketsLandingPage />
    </MemoryRouter>,
  );
}

describe('TicketsLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicFixtures).mockResolvedValue(backendFixtures);
    vi.mocked(getMatchTicketTypes).mockImplementation((matchId) =>
      Promise.resolve(buildTicketTypes(Number(matchId))),
    );
  });

  it('renders ticket filters and available matches', async () => {
    renderTicketsPage();

    expect(screen.getByText(/match/i, { selector: '.tickets-header-plain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /all leagues/i })).toBeInTheDocument();
    expect(await screen.findByText(/kcca fc/i)).toBeInTheDocument();
    expect(screen.getByText(/kcb kobs/i)).toBeInTheDocument();
    expect(screen.getByText(/city oilers/i)).toBeInTheDocument();
  });

  it('filters matches by league', async () => {
    const user = userEvent.setup();

    renderTicketsPage();

    await user.click(await screen.findByRole('button', { name: /nile special rugby premiership/i }));

    expect(await screen.findByText(/kcb kobs/i)).toBeInTheDocument();
    expect(screen.getByText(/platinum credit heathens/i)).toBeInTheDocument();
    expect(screen.queryByText(/kcca fc/i)).not.toBeInTheDocument();
  });

  it('shows seats left count on each card', async () => {
    renderTicketsPage();

    const seatsLeftItems = await screen.findAllByText(/seats left/i);
    expect(seatsLeftItems.length).toBeGreaterThan(0);
  });

  it('shows a single Buy Ticket button per match card', async () => {
    renderTicketsPage();

    const buyButtons = await screen.findAllByRole('button', { name: /^buy ticket$/i });
    expect(buyButtons.length).toBe(8);
  });

  it('prompts guests to sign in before buying a ticket', async () => {
    const user = userEvent.setup();

    renderTicketsPage();

    await user.click((await screen.findAllByRole('button', { name: /^buy ticket$/i }))[0]);

    expect(screen.getByRole('heading', { name: /sign in to buy tickets/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /log in/i })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});