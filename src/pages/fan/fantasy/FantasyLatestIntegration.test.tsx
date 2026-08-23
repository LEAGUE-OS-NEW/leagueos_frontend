import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import CompetitionDetail from './sections/CompetitionDetail';
import Leagues from './sections/Leagues';
import MyTeam from './sections/MyTeam';
import * as service from '../../../services/fantasyService';
import { competitionFromApi } from './data';
import type { FantasyCompetition, FantasyLeague } from '../../../services/fantasyService';

// ── Mock the entire service layer ────────────────────────────────────────────
vi.mock('../../../services/fantasyService', async () => {
  const actual = await vi.importActual('../../../services/fantasyService');
  return {
    ...actual,
    fetchMyLeagues: vi.fn(),
    fetchPublicLeagues: vi.fn(),
    fetchCompetitionLeaderboard: vi.fn(),
    fetchLeagueMembers: vi.fn(),
    fetchLeagueStandings: vi.fn(),
    createFantasyLeague: vi.fn(),
    joinFantasyLeague: vi.fn(),
    joinFantasyLeagueByCode: vi.fn(),
    leaveFantasyLeague: vi.fn(),
  };
});

// ── Shared fixtures ───────────────────────────────────────────────────────────
const api = {
  id: 'c1', sport: 'football', name: 'UPL Fantasy', description: 'Rules',
  season: 's1', season_name: '2026/27', enabled: true,
  registration_state: 'OPEN', visibility: 'PUBLIC',
  squad_size: 1, starting_lineup_size: 1, bench_size: 0,
  initial_budget: '100', max_players_per_team: 3, captain_multiplier: '2',
  vice_captain_fallback: true, free_transfers_per_gameweek: 1, transfer_penalty: 4,
  position_rules: { GK: 1 }, formation_rules: { GK: { min: 1, max: 1 } },
  tie_break_rules: [], gameweek_rules: {}, registration_deadline: null,
  prize_metadata: {}, scoring_rules: [], competition: 'real',
  current_gameweek: {
    id: 'g1', fantasy_competition: 'c1', number: 1, name: 'GW1',
    starts_at: '', deadline_at: '', ends_at: '', status: 'OPEN', fixtures: [], fixture_details: [],
  },
  entries: 0, total_gameweeks: 1,
} as const;

const competition = competitionFromApi(api as unknown as FantasyCompetition);

const team = {
  id: 't1', competitionId: 'c1', teamName: 'My XI', managerName: 'Me',
  budgetRemaining: 10, squad: [{ playerId: 'p1', isStarter: true }],
  captainId: 'p1', viceCaptainId: null, freeTransfers: 1,
  totalPoints: 0, gwPoints: 0, overallRank: null, submitted: true,
  score: {
    breakdown: {
      players: [{
        player_id: 'p1', player_name: 'Keeper', position: 'GK',
        base_points: '0', correction_points: '0', captain_bonus: '0',
        final_points: '0', statistics_available: false, captain: true,
      }],
    },
  },
} as never;

const makeLeague = (overrides: Partial<FantasyLeague> = {}): FantasyLeague => ({
  id: 'l1', name: 'My League', fantasy_competition: 'c1',
  visibility: 'PUBLIC', description: '', capacity: null, member_count: 1,
  ...overrides,
});

// ── Default mock returns ──────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(service.fetchMyLeagues).mockResolvedValue([]);
  vi.mocked(service.fetchPublicLeagues).mockResolvedValue([]);
  vi.mocked(service.fetchCompetitionLeaderboard).mockResolvedValue([]);
  vi.mocked(service.fetchLeagueMembers).mockResolvedValue([]);
  vi.mocked(service.fetchLeagueStandings).mockResolvedValue([]);
  vi.mocked(service.createFantasyLeague).mockResolvedValue(makeLeague());
  vi.mocked(service.joinFantasyLeague).mockResolvedValue(makeLeague({ member_count: 2 }));
  vi.mocked(service.joinFantasyLeagueByCode).mockResolvedValue(makeLeague());
  vi.mocked(service.leaveFantasyLeague).mockResolvedValue(undefined);
});

// ── Existing tests (preserved) ───────────────────────────────────────────────
describe('latest Fantasy sections', () => {
  it('shows the season name without using the canonical UUID as its label', () => {
    render(
      <CompetitionDetail
        competition={competition} hasTeam={false}
        onBack={() => {}} onCreateTeam={() => {}} onManageTeam={() => {}}
      />,
    );
    expect(screen.getByText('Season 2026/27')).toBeInTheDocument();
    expect(screen.queryByText('Season s1')).not.toBeInTheDocument();
  });

  it('loads members and standings for the selected league', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'l1', name: 'First' }),
      makeLeague({ id: 'l2', name: 'Selected', member_count: 2 }),
    ]);
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Selected'));
    await waitFor(() => expect(service.fetchLeagueMembers).toHaveBeenCalledWith('l2'));
    expect(service.fetchLeagueStandings).toHaveBeenCalledWith('l2');
  });

  it('shows Awaiting statistics instead of invented player points', () => {
    render(
   
      <MyTeam
        competition={competition} team={team}
        players={[{
          id: 'p1', name: 'Keeper', club: 'Club', clubShort: 'CLB', clubColor: '#000',
          sport: 'football', position: 'GK', positionLabel: 'Goalkeeper',
          price: 5, form: 0, totalPoints: 0, gwPoints: 0, ownership: 0, status: 'ready',
        }]}
        onGoTransfers={() => {}} onSwapLineup={() => {}}onEditLineup={() => {}}
  onChangeCaptain={() => {}}
  onViewFixtures={() => {}}
      />,
    );
    expect(screen.getAllByText('Awaiting statistics').length).toBeGreaterThan(0);
  });
});

// ── League Create flow ────────────────────────────────────────────────────────
describe('Leagues — create flow', () => {
  it('opens the create modal when "Create league" is clicked', async () => {
    render(<Leagues competition={competition} team={team} />);
    await screen.findByText('Create league');  // wait for initial load
    await userEvent.click(screen.getByRole('button', { name: /create league/i }));
    expect(screen.getByRole('dialog', { name: /create league/i })).toBeInTheDocument();
  });

  it('keeps the Create button disabled until a name is typed', async () => {
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /create league/i }));
    // The submit button inside the modal footer is the one with text "Create league"
    // and it should be disabled initially.
    const submitBtn = screen.getAllByRole('button', { name: /create league/i })
      .find(b => b.closest('.modal-foot'));
    expect(submitBtn).toBeDisabled();
  });

  it('calls createFantasyLeague with correct payload on submit', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([makeLeague()]);
    render(<Leagues competition={competition} team={team} />);

    // Open modal
    await userEvent.click(await screen.findByRole('button', { name: /create league/i }));

    // Fill name
    const nameInput = screen.getByLabelText(/league name/i);
    await userEvent.type(nameInput, 'The Invincibles');

    // Switch to Public
    await userEvent.click(screen.getByRole('button', { name: /public/i }));

    // Submit
    const submitBtn = screen.getAllByRole('button', { name: /create league/i })
      .find(b => b.closest('.modal-foot'));
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(service.createFantasyLeague).toHaveBeenCalledWith(
        expect.objectContaining({
          fantasy_competition: 'c1',
          name: 'The Invincibles',
          visibility: 'PUBLIC',
        }),
      );
    });
  });

  it('shows description and capacity fields in the create modal', async () => {
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /create league/i }));
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max members/i)).toBeInTheDocument();
  });

  it('disables Create button when user has no team', async () => {
    // Pass no team prop
    render(<Leagues competition={competition} />);
    await screen.findByText(/build your squad/i);
    const createBtn = screen.getByRole('button', { name: /create league/i });
    expect(createBtn).toBeDisabled();
  });

  it('creates a PRIVATE league by default', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'new', name: 'Private League', visibility: 'PRIVATE', join_code: 'ABCD1234' }),
    ]);
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /create league/i }));
    const nameInput = screen.getByLabelText(/league name/i);
    await userEvent.type(nameInput, 'Private League');

    // PRIVATE option should be selected by default (has modal-vis-active class)
    const privateBtn = screen.getByRole('button', { name: /private/i });
    expect(privateBtn).toHaveClass('modal-vis-active');
  });
});

// ── Join public league flow ───────────────────────────────────────────────────
describe('Leagues — join public flow', () => {
  it('shows a Join button on public leagues in the Public tab', async () => {
    const publicLeague = makeLeague({ id: 'pub1', name: 'Open League', visibility: 'PUBLIC' });
    vi.mocked(service.fetchPublicLeagues).mockResolvedValue([publicLeague]);
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /public leagues/i }));
    expect(await screen.findByRole('button', { name: /^join$/i })).toBeInTheDocument();
  });

  it('calls joinFantasyLeague with the league id when Join is clicked', async () => {
    const publicLeague = makeLeague({ id: 'pub2', name: 'Joinable League', visibility: 'PUBLIC' });
    vi.mocked(service.fetchPublicLeagues).mockResolvedValue([publicLeague]);
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /public leagues/i }));
    const joinBtn = await screen.findByRole('button', { name: /^join$/i });
    await userEvent.click(joinBtn);

    await waitFor(() =>
      expect(service.joinFantasyLeague).toHaveBeenCalledWith('pub2'),
    );
  });

  it('hides the Join button for leagues the user already belongs to', async () => {
    const joined = makeLeague({ id: 'already', name: 'Already In', visibility: 'PUBLIC' });
    vi.mocked(service.fetchPublicLeagues).mockResolvedValue([joined]);
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([joined]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /public leagues/i }));
    await screen.findByText('Already In');
    expect(screen.queryByRole('button', { name: /^join$/i })).not.toBeInTheDocument();
  });

  it('disables Join button when user has no team', async () => {
    const publicLeague = makeLeague({ id: 'noteam', name: 'No Team League', visibility: 'PUBLIC' });
    vi.mocked(service.fetchPublicLeagues).mockResolvedValue([publicLeague]);
    render(<Leagues competition={competition} />);  // no team
    await userEvent.click(await screen.findByRole('button', { name: /public leagues/i }));
    const joinBtn = await screen.findByRole('button', { name: /^join$/i });
    expect(joinBtn).toBeDisabled();
  });
});

// ── Join by code (private league) flow ───────────────────────────────────────
describe('Leagues — join by code flow', () => {
  it('opens the join modal when "Join by code" is clicked', async () => {
    render(<Leagues competition={competition} team={team} />);
    await screen.findByRole('button', { name: /join by code/i });
    await userEvent.click(screen.getByRole('button', { name: /join by code/i }));
    expect(screen.getByRole('dialog', { name: /join a private league/i })).toBeInTheDocument();
  });

  it('calls joinFantasyLeagueByCode with uppercased code', async () => {
    vi.mocked(service.joinFantasyLeagueByCode).mockResolvedValue(
      makeLeague({ id: 'priv1', name: 'Secret League', visibility: 'PRIVATE' }),
    );
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'priv1', name: 'Secret League', visibility: 'PRIVATE' }),
    ]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /join by code/i }));

    const codeInput = screen.getByLabelText(/invite code/i);
    await userEvent.type(codeInput, 'abc12345');

    const submitBtn = screen.getByRole('button', { name: /join league/i });
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(service.joinFantasyLeagueByCode).toHaveBeenCalledWith('ABC12345'),
    );
  });

  it('pre-fills the code input with initialCode prop', async () => {
    render(<Leagues competition={competition} team={team} initialCode="PRELOAD1" />);
    // The join modal should auto-open when initialCode is set
    expect(await screen.findByDisplayValue('PRELOAD1')).toBeInTheDocument();
  });

  it('shows error message when an invalid code is entered', async () => {
    vi.mocked(service.joinFantasyLeagueByCode).mockRejectedValue({
      response: { data: { detail: 'Invalid invite code or no team for this competition.' } },
    });
    const onNeedTeam = vi.fn();
    render(<Leagues competition={competition} team={undefined as never} initialCode="BADCODE1" onNeedTeam={onNeedTeam} />);
    const submitBtn = await screen.findByRole('button', { name: /join league/i });
    await userEvent.click(submitBtn);
    await waitFor(() => expect(onNeedTeam).toHaveBeenCalled());
  });

  it('shows a real error for invalid/expired codes', async () => {
    vi.mocked(service.joinFantasyLeagueByCode).mockRejectedValue({
      response: { data: { detail: 'League capacity has been reached.' } },
    });
    render(<Leagues competition={competition} team={team} initialCode="FULLLEAG" />);
    const submitBtn = await screen.findByRole('button', { name: /join league/i });
    await userEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('League capacity has been reached.'),
    );
  });
});

// ── Share / invite flow ───────────────────────────────────────────────────────
describe('Leagues — share / invite flow', () => {
  const privateLeague = makeLeague({
    id: 'share1',
    name: 'Share Test League',
    visibility: 'PRIVATE',
    join_code: 'SHARE001',
  });

  beforeEach(() => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([privateLeague]);
    vi.mocked(service.fetchLeagueMembers).mockResolvedValue([
      { rank: 1, team_id: 't1', fantasy_team: 'My XI', manager: 'Me', total_points: '0', joined_at: '' },
    ]);
    vi.mocked(service.fetchLeagueStandings).mockResolvedValue([]);
  });

  it('shows the invite code in the drawer for private league owner', async () => {
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Share Test League'));
    await waitFor(() =>
      expect(screen.getByLabelText(/league invite code/i)).toHaveTextContent('SHARE001'),
    );
  });

  it('shows Copy invite code and Copy invite link buttons', async () => {
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Share Test League'));
    await waitFor(() => screen.getByText(/copy invite code/i));
    expect(screen.getByText(/copy invite link/i)).toBeInTheDocument();
  });

  it('copies the invite code to clipboard when Copy invite code is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Share Test League'));
    await waitFor(() => screen.getByText(/copy invite code/i));
    await userEvent.click(screen.getByText(/copy invite code/i));

    expect(writeText).toHaveBeenCalledWith('SHARE001');
  });

  it('copies the full invite link to clipboard when Copy invite link is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Share Test League'));
    await waitFor(() => screen.getByText(/copy invite link/i));
    await userEvent.click(screen.getByText(/copy invite link/i));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/fan/fantasy/join?code=SHARE001')),
    );
  });

  it('does not show invite code section for public leagues', async () => {
    const pubLeague = makeLeague({ id: 'pub_share', name: 'Open League', visibility: 'PUBLIC' });
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([pubLeague]);
    vi.mocked(service.fetchLeagueMembers).mockResolvedValue([]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Open League'));
    await waitFor(() => screen.getByText(/members/i));
    expect(screen.queryByLabelText(/league invite code/i)).not.toBeInTheDocument();
  });
});

// ── League detail drawer ──────────────────────────────────────────────────────
describe('Leagues — league detail drawer', () => {
  it('shows standings and members when a league is opened', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'detail1', name: 'Detail League' }),
    ]);
    vi.mocked(service.fetchLeagueMembers).mockResolvedValue([
      { rank: 1, team_id: 't1', fantasy_team: 'Test Team', manager: 'Test Manager', total_points: '42', joined_at: '' },
    ]);

    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Detail League'));
    await waitFor(() => expect(screen.getByText(/Test Team/)).toBeInTheDocument());
    expect(screen.getByText(/Test Manager/)).toBeInTheDocument();
  });

  it('shows a Leave league button in the drawer', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([makeLeague({ id: 'leave1', name: 'Leaveable' })]);
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('Leaveable'));
    expect(await screen.findByRole('button', { name: /leave league/i })).toBeInTheDocument();
  });

  it('calls leaveFantasyLeague and closes drawer on Leave', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([makeLeague({ id: 'leave2', name: 'LeaveMeNow' })]);
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByText('LeaveMeNow'));
    const leaveBtn = await screen.findByRole('button', { name: /leave league/i });
    await userEvent.click(leaveBtn);
    await waitFor(() => expect(service.leaveFantasyLeague).toHaveBeenCalledWith('leave2'));
    // Drawer closes — the league name is no longer in a dialog heading
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

// ── Loading / error states ────────────────────────────────────────────────────
describe('Leagues — loading and error states', () => {
  it('shows league cards after data loads', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'loaded', name: 'Loaded League' }),
    ]);
    render(<Leagues competition={competition} team={team} />);
    expect(await screen.findByText('Loaded League')).toBeInTheDocument();
  });

  it('shows an empty state when there are no leagues', async () => {
    render(<Leagues competition={competition} team={team} />);
    expect(await screen.findByText(/no leagues found/i)).toBeInTheDocument();
  });

  it('shows no-team banner when team prop is absent', async () => {
    render(<Leagues competition={competition} />);
    expect(
      await screen.findByText(/you don't have a squad for this competition/i),
    ).toBeInTheDocument();
  });

  it('shows public leagues in the Public Leagues tab', async () => {
    vi.mocked(service.fetchPublicLeagues).mockResolvedValue([
      makeLeague({ id: 'pubshow', name: 'Public League X', visibility: 'PUBLIC' }),
    ]);
    render(<Leagues competition={competition} team={team} />);
    await userEvent.click(await screen.findByRole('button', { name: /public leagues/i }));
    expect(await screen.findByText('Public League X')).toBeInTheDocument();
  });

  it('shows capacity bar and spots-left for leagues with a capacity', async () => {
    vi.mocked(service.fetchMyLeagues).mockResolvedValue([
      makeLeague({ id: 'capped', name: 'Capped League', capacity: 10, member_count: 4 }),
    ]);
    render(<Leagues competition={competition} team={team} />);
    expect(await screen.findByText(/6 spots left/i)).toBeInTheDocument();
  });
});
