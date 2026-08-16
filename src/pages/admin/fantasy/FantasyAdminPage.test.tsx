import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FantasyAdminPage from './FantasyAdminPage';
import * as api from '../../../services/fantasyAdminService';

vi.mock('../../../components/admin/AdminLayout', () => ({ default: ({children}:{children:React.ReactNode}) => <>{children}</> }));
vi.mock('../../../services/fantasyAdminService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/fantasyAdminService')>();
  return {...actual,
    fetchAdminFantasyCompetitions:vi.fn(), fetchCanonicalFantasyOptions:vi.fn(), fetchAdminLeagueOverview:vi.fn(),
    fetchFantasyPlayers:vi.fn(), fetchFantasyPlayerCandidates:vi.fn(), fetchFantasyGameweeks:vi.fn(),
    fetchFantasyFixtureCandidates:vi.fn(), fetchFantasyStatisticTypes:vi.fn(), fetchCompetitionLeaderboard:vi.fn(),
    adminUpdateCompetition:vi.fn(), adminUpdatePlayer:vi.fn(),
  };
});

const competition = {id:'c1',competition:'real-c1',season:'s1',season_name:'2026/27',sport:'football' as const,name:'Premier Fantasy',description:'Official',enabled:true,registration_state:'OPEN' as const,visibility:'PUBLIC' as const,squad_size:15,starting_lineup_size:11,bench_size:4,initial_budget:'100.00',max_players_per_team:3,captain_multiplier:'2.00',vice_captain_fallback:true,free_transfers_per_gameweek:1,transfer_penalty:4,position_rules:{Goalkeeper:2,Forward:3},formation_rules:{Goalkeeper:{min:1,max:1},Forward:{min:1,max:3}},tie_break_rules:['total_points'],gameweek_rules:{},registration_deadline:null,prize_metadata:{winner:'Cup'},scoring_rules:[],current_gameweek:null,entries:0,total_gameweeks:0};
const player = {id:'p1',fantasy_competition:'c1',player:'canonical-p1',player_name:'Safe Player',club:'Real Club',position:'Forward',price:7,eligible:true,availability:'AVAILABLE' as const,name:'Safe Player',status:'available' as const,ownership:null,total_points:null,current_gameweek_points:null,form:null};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminFantasyCompetitions).mockResolvedValue([competition]);
  vi.mocked(api.fetchCanonicalFantasyOptions).mockResolvedValue({competitions:[],seasons:[]});
  vi.mocked(api.fetchAdminLeagueOverview).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyPlayers).mockResolvedValue([player]);
  vi.mocked(api.fetchFantasyPlayerCandidates).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyGameweeks).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyFixtureCandidates).mockResolvedValue([]);
  vi.mocked(api.fetchFantasyStatisticTypes).mockResolvedValue([]);
  vi.mocked(api.fetchCompetitionLeaderboard).mockResolvedValue([]);
  vi.mocked(api.adminUpdateCompetition).mockResolvedValue({...competition,name:'Edited Fantasy'});
  vi.mocked(api.adminUpdatePlayer).mockResolvedValue({...player,price:8,eligible:false,availability:'INJURED'});
});

describe('FantasyAdminPage editing', () => {
  it('edits an existing competition through the PATCH service', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    // Tab labels are capitalised in the UI ("Competitions", "Players", etc.)
    await user.click(await screen.findByRole('button',{name:'Competitions'}));
    await user.click(screen.getByRole('button',{name:'Edit'}));
    expect(screen.getByRole('dialog',{name:'Edit Fantasy competition'})).toBeVisible();
    // The name input aria-label is the field name with underscores replaced by spaces: "name"
    const nameInput = screen.getByRole('dialog',{name:'Edit Fantasy competition'}).querySelector('[aria-label="name"]') as HTMLInputElement;
    await user.clear(nameInput); await user.type(nameInput,'Edited Fantasy');
    await user.click(screen.getByRole('button',{name:'Save competition'}));
    await waitFor(()=>expect(api.adminUpdateCompetition).toHaveBeenCalledWith('c1',expect.objectContaining({name:'Edited Fantasy',enabled:true,squad_size:15})));
    expect(await screen.findByRole('status')).toHaveTextContent('Fantasy competition updated.');
  });

  it('edits only Fantasy-owned player settings', async () => {
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await user.click(await screen.findByRole('button',{name:'Players'}));
    await user.click((await screen.findAllByRole('button',{name:'Edit'}))[0]);
    // Scope label queries to the modal dialog to avoid matching the add-player form fields
    const dialog = within(screen.getByRole('dialog',{name:'Edit Fantasy player'}));
    const price = dialog.getByLabelText('Price (M)'); await user.clear(price); await user.type(price,'8');
    await user.click(dialog.getByLabelText('Eligible (can be selected by fans)'));
    await user.selectOptions(dialog.getByLabelText('Availability'),'INJURED');
    await user.click(dialog.getByRole('button',{name:'Save player'}));
    await waitFor(()=>expect(api.adminUpdatePlayer).toHaveBeenCalledWith('p1',{position:'Forward',price:8,eligible:false,availability:'INJURED'}));
  });

  it('renders an API error visibly', async () => {
    vi.mocked(api.adminUpdatePlayer).mockRejectedValueOnce(new Error('Unable to update player'));
    const user = userEvent.setup(); render(<FantasyAdminPage/>);
    await user.click(await screen.findByRole('button',{name:'Players'}));
    await user.click((await screen.findAllByRole('button',{name:'Edit'}))[0]);
    await user.click(screen.getByRole('button',{name:'Save player'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to update player');
  });
});
