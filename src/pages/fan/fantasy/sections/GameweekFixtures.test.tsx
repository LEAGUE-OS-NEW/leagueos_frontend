import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import GameweekFixtures from './GameweekFixtures';
import * as service from '../../../../services/fantasyService';
import { competitionFromApi } from '../data';
import type { FantasyCompetition, FantasyGameweek } from '../../../../services/fantasyService';

vi.mock('../../../../services/fantasyService', async () => {
  const actual = await vi.importActual('../../../../services/fantasyService');
  return { ...actual, fetchFantasyGameweeks: vi.fn() };
});

// ── Shared fixtures ──────────────────────────────────────────────────────────

const api = {
  id: 'c1', sport: 'football', name: 'UPL Fantasy', description: '',
  season: 's1', season_name: '2026/27', enabled: true,
  registration_state: 'OPEN', visibility: 'PUBLIC',
  squad_size: 1, starting_lineup_size: 1, bench_size: 0,
  initial_budget: '100', max_players_per_team: 3, captain_multiplier: '2',
  vice_captain_fallback: true, free_transfers_per_gameweek: 1, transfer_penalty: 4,
  position_rules: { GK: 1 }, formation_rules: { GK: { min: 1, max: 1 } },
  tie_break_rules: [], gameweek_rules: {}, registration_deadline: null,
  prize_metadata: {}, scoring_rules: [], competition: 'real',
  current_gameweek: null, entries: 0, total_gameweeks: 3,
} as const;

const competition = competitionFromApi(api as unknown as FantasyCompetition);

const makeGw = (overrides: Partial<FantasyGameweek> = {}): FantasyGameweek => ({
  id: 'gw1', fantasy_competition: 'c1', number: 1, name: 'Gameweek 1',
  starts_at: '2026-09-12T10:00:00Z',
  deadline_at: '2026-09-12T15:30:00Z',
  ends_at: '2026-09-15T22:00:00Z',
  status: 'OPEN',
  fixtures: ['f1'],
  fixture_details: [
    {
      id: 'f1', name: 'Vipers SC vs KCCA FC',
      home_team: 'Vipers SC', away_team: 'KCCA FC',
      starts_at: '2026-09-12T16:00:00Z',
      status: 'SCHEDULED',
      venue: 'FUFA Technical Centre',
      home_score: null, away_score: null,
    },
    {
      id: 'f2', name: 'URA FC vs Villa FC',
      home_team: 'URA FC', away_team: 'Villa FC',
      starts_at: '2026-09-13T17:00:00Z',
      status: 'SCHEDULED',
      venue: 'Mandela National Stadium',
      home_score: null, away_score: null,
    },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GameweekFixtures', () => {
  it('shows a loading state while fetching', () => {
    vi.mocked(service.fetchFantasyGameweeks).mockReturnValue(new Promise(() => {}));
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    // Skeleton rows rendered during load
    expect(document.querySelectorAll('.gw-fixture-skeleton-row').length).toBeGreaterThan(0);
  });

  it('renders current gameweek name and status after load', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([makeGw()]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText('Gameweek 1')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders fixture home and away teams', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([makeGw()]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText('Vipers SC')).toBeInTheDocument();
    expect(screen.getByText('KCCA FC')).toBeInTheDocument();
    expect(screen.getByText('URA FC')).toBeInTheDocument();
    expect(screen.getByText('Villa FC')).toBeInTheDocument();
  });

  it('renders fixture venues', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([makeGw()]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText('FUFA Technical Centre')).toBeInTheDocument();
    expect(screen.getByText('Mandela National Stadium')).toBeInTheDocument();
  });

  it('renders score when a fixture is completed', async () => {
    const gw = makeGw({
      fixture_details: [{
        id: 'f3', name: 'Team A vs Team B',
        home_team: 'Team A', away_team: 'Team B',
        starts_at: '2026-09-10T16:00:00Z',
        status: 'COMPLETED',
        venue: null,
        home_score: 2, away_score: 1,
      }],
    });
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([gw]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText('2 – 1')).toBeInTheDocument();
  });

  it('shows empty state when gameweek has no fixtures', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ fixtures: [], fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText(/no fixtures assigned/i)).toBeInTheDocument();
  });

  it('shows error state and retry button on API failure', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockRejectedValue(new Error('Network error'));
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText(/could not load gameweek fixtures/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows empty state when there are no gameweeks', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    expect(await screen.findByText(/no gameweeks yet/i)).toBeInTheDocument();
  });

  it('renders prev/next navigation buttons', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ id: 'gw1', number: 1, name: 'Gameweek 1', status: 'FINALIZED' }),
      makeGw({ id: 'gw2', number: 2, name: 'Gameweek 2', status: 'OPEN' }),
      makeGw({ id: 'gw3', number: 3, name: 'Gameweek 3', status: 'DRAFT' }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('Gameweek 2'); // defaults to OPEN gw
    expect(screen.getByLabelText('Previous gameweek')).toBeInTheDocument();
    expect(screen.getByLabelText('Next gameweek')).toBeInTheDocument();
  });

  it('navigates to previous gameweek when prev button clicked', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ id: 'gw1', number: 1, name: 'Gameweek 1', status: 'FINALIZED', fixture_details: [] }),
      makeGw({ id: 'gw2', number: 2, name: 'Gameweek 2', status: 'OPEN', fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('Gameweek 2'); // defaults to OPEN gw (index 1)
    await userEvent.click(screen.getByLabelText('Previous gameweek'));
    expect(screen.getByText('Gameweek 1')).toBeInTheDocument();
  });

  it('navigates to next gameweek when next button clicked', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ id: 'gw1', number: 1, name: 'Gameweek 1', status: 'OPEN', fixture_details: [] }),
      makeGw({ id: 'gw2', number: 2, name: 'Gameweek 2', status: 'DRAFT', fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('Gameweek 1');
    await userEvent.click(screen.getByLabelText('Next gameweek'));
    expect(screen.getByText('Gameweek 2')).toBeInTheDocument();
  });

  it('disables prev button on first gameweek', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ id: 'gw1', number: 1, name: 'Gameweek 1', status: 'OPEN', fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('Gameweek 1');
    expect(screen.getByLabelText('Previous gameweek')).toBeDisabled();
    expect(screen.getByLabelText('Next gameweek')).toBeDisabled();
  });

  it('shows progress dots matching the number of gameweeks', async () => {
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ id: 'gw1', number: 1, name: 'GW1', status: 'FINALIZED', fixture_details: [] }),
      makeGw({ id: 'gw2', number: 2, name: 'GW2', status: 'OPEN', fixture_details: [] }),
      makeGw({ id: 'gw3', number: 3, name: 'GW3', status: 'DRAFT', fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('GW2');
    const dots = document.querySelectorAll('.gw-dot');
    expect(dots.length).toBe(3);
  });

  it('collapses long fixture lists and shows "Show all" button', async () => {
    const manyFixtures = Array.from({ length: 7 }, (_, i) => ({
      id: `f${i}`, name: `Team ${i} vs Team ${i + 1}`,
      home_team: `Team ${i}`, away_team: `Team ${i + 1}`,
      starts_at: '2026-09-12T16:00:00Z', status: 'SCHEDULED',
      venue: null, home_score: null, away_score: null,
    }));
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ fixture_details: manyFixtures }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await screen.findByText('Team 0');
    // Only first 4 shown initially
    expect(screen.queryByText('Team 5')).not.toBeInTheDocument();
    expect(screen.getByText(/show all 7 fixtures/i)).toBeInTheDocument();
  });

  it('expands to show all fixtures when "Show all" is clicked', async () => {
    const manyFixtures = Array.from({ length: 6 }, (_, i) => ({
      id: `f${i}`, name: `Team ${i} vs Team ${i + 1}`,
      home_team: `Team ${i}`, away_team: `Team ${i + 1}`,
      starts_at: '2026-09-12T16:00:00Z', status: 'SCHEDULED',
      venue: null, home_score: null, away_score: null,
    }));
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ fixture_details: manyFixtures }),
    ]);
    render(<GameweekFixtures competition={competition} onManageTeam={() => {}} />);
    await userEvent.click(await screen.findByText(/show all 6 fixtures/i));
    expect(screen.getAllByText('Team 5')).toHaveLength(2);
    expect(screen.getByText(/show fewer/i)).toBeInTheDocument();
  });

  it('calls onManageTeam when Manage team button is clicked', async () => {
    const onManageTeam = vi.fn();
    const team = {
      id: 't1', competitionId: 'c1', teamName: 'My XI', managerName: 'Me',
      budgetRemaining: 10, squad: [], captainId: null, viceCaptainId: null,
      freeTransfers: 1, totalPoints: 42, gwPoints: 8, overallRank: null,
      submitted: true, score: undefined,
    } as never;
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([
      makeGw({ fixture_details: [] }),
    ]);
    render(<GameweekFixtures competition={competition} team={team} onManageTeam={onManageTeam} />);
    await userEvent.click(await screen.findByRole('button', { name: /manage team/i }));
    expect(onManageTeam).toHaveBeenCalled();
  });

  it('renders points bar with correct values when team is provided', async () => {
    const team = {
      id: 't1', competitionId: 'c1', teamName: 'My XI', managerName: 'Me',
      budgetRemaining: 10, squad: [], captainId: null, viceCaptainId: null,
      freeTransfers: 2, totalPoints: 55, gwPoints: 12, overallRank: null,
      submitted: true, score: undefined,
    } as never;
    vi.mocked(service.fetchFantasyGameweeks).mockResolvedValue([makeGw({ fixture_details: [] })]);
    render(<GameweekFixtures competition={competition} team={team} onManageTeam={() => {}} />);
    await screen.findByText(/gameweek 1/i);
    expect(screen.getByText('12')).toBeInTheDocument();  // GW points
    expect(screen.getByText('55')).toBeInTheDocument();  // Season total
    expect(screen.getByText('2')).toBeInTheDocument();   // Free transfers
  });
});
