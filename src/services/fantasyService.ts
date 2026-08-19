import apiClient from './apiClient.ts';

export type FantasySport = 'football' | 'rugby' | 'basketball';
export type FantasyAvailability = 'AVAILABLE' | 'DOUBTFUL' | 'INJURED' | 'SUSPENDED' | 'UNAVAILABLE';

export interface FantasyScoringRule { id: string; fantasy_competition: string; statistic_type: string; points: string; conditions: Record<string, never>; enabled: boolean }
export interface FantasyFixture { id: string; name: string; starts_at: string; status: string }
export interface FantasyGameweek { id: string; fantasy_competition: string; number: number; name: string; starts_at: string; deadline_at: string; ends_at: string; status: 'DRAFT'|'OPEN'|'LOCKED'|'LIVE'|'SCORING'|'FINALIZED'; fixtures: string[]; fixture_details: FantasyFixture[] }
export interface FantasyCompetition {
  id: string; competition: string; season: string; season_name: string; sport: FantasySport; name: string; description: string;
  enabled: boolean; registration_state: 'OPEN'|'CLOSED'; visibility: 'PUBLIC'|'PRIVATE'; squad_size: number;
  starting_lineup_size: number; bench_size: number; initial_budget: string; max_players_per_team: number;
  captain_multiplier: string; vice_captain_fallback: boolean; free_transfers_per_gameweek: number;
  transfer_penalty: number; position_rules: Record<string, number>; formation_rules: Record<string, {min: number; max: number}>;
  tie_break_rules: string[]; gameweek_rules: Record<string, unknown>; registration_deadline: string|null;
  prize_metadata: Record<string, unknown>; scoring_rules: FantasyScoringRule[]; current_gameweek: FantasyGameweek|null;
  entries: number; total_gameweeks: number;
}
export interface FantasyPlayer {
  id: string; fantasy_competition: string; player: string; player_name: string;
  club: string; club_detail?: {id: string; name: string}|null; position: string; price: number; eligible: boolean;
  availability: FantasyAvailability; name: string; status: Lowercase<FantasyAvailability>; image?: string;
  starting_points: number;
  ownership: number|null; total_points: number|null; current_gameweek_points: number|null; form: number|null;
}
export interface FantasyTeamSelection { id?: string; fantasy_player: string; fantasy_player_detail?: FantasyPlayer; is_starter: boolean; bench_order?: number|null; is_captain: boolean; is_vice_captain: boolean }
export interface FantasyTeam { id: string; name: string; fantasy_competition: string; budget_remaining: string; free_transfers: number; selections: FantasyTeamSelection[] }
export interface FantasyLeague { id: string; fantasy_competition: string; name: string; description: string; visibility: 'PUBLIC'|'PRIVATE'; join_code?: string|null; capacity: number|null; member_count: number }
export interface FantasyStanding { rank: number; team_id: string; team__name?: string; team_name?: string; manager: string; total_points: string }
export interface FantasyLeagueMember { rank:number; team_id:string; fantasy_team:string; manager:string; total_points:string; joined_at:string }
export interface FantasyStatisticType { code:string; label:string; observed:boolean }
export interface FantasyPlayerPoints { id:string; gameweek:string; fantasy_player:string; player:FantasyPlayer; base_points:string; correction_points:string; total_points:string; breakdown:Array<{statistic_type:string;value:string;points:string}>; statistics_available:boolean }
export interface FantasyPlayerScoreBreakdown { player_id:string; player_name:string; position:string; base_points:string; correction_points:string; captain_bonus:string; final_points:string; statistics_available:boolean; captain:boolean }
export interface FantasyTeamScore { id:string; gameweek:string; team:string; team_name:string; manager:string; player_points:string; captain_bonus:string; transfer_penalty:string; total_points:string; breakdown:{players?:FantasyPlayerScoreBreakdown[];vice_captain_fallback?:boolean;effective_captain_id?:string|null}|unknown[] }
export interface FantasyTransfer { id:string; gameweek?:string; gameweek_id?:string; player_out?:string; player_out_id?:string; player_in?:string; player_in_id?:string; price_out:string; price_in:string; penalty_points:number; created_at:string }
export interface FantasyTransferBalance { gameweek:string; free_transfers_allocated:number; free_transfers_used:number; free_transfers_remaining:number; transfer_penalty:number }
export interface FantasyTransferPreview { gameweek:string; player_out:string; player_in:string; price_out:string; price_in:string; price_difference:string; current_budget:string; new_budget:string; free_transfers_allocated:number; free_transfers_used:number; free_transfers_remaining:number; penalty_if_confirmed:number }

const list = <T>(data: T[] | {results:T[]}): T[] => Array.isArray(data) ? data : data.results;
const id = (value:string) => encodeURIComponent(value);

export async function fetchFantasyCompetitions() { return list<FantasyCompetition>((await apiClient.get('/fantasy/competitions/')).data); }
export async function fetchFantasyCompetition(value:string) { return (await apiClient.get(`/fantasy/competitions/${id(value)}/`)).data as FantasyCompetition; }
export async function fetchFantasyGameweeks(competition?:string) { return list<FantasyGameweek>((await apiClient.get('/fantasy/gameweeks/', {params:competition?{competition}:{}})).data); }
export async function fetchCompetitionLeaderboard(value:string) { return (await apiClient.get(`/fantasy/competitions/${id(value)}/leaderboard/`)).data as FantasyStanding[]; }
export async function fetchFantasyPlayers(competition?:string):Promise<FantasyPlayer[]> {
  const rows=list<Record<string,unknown>>((await apiClient.get('/fantasy/players/',{params:competition?{competition}:{}})).data);
  return rows.map(row=>{const club=row.club as {id:string;name:string}|null;return {...row,club_detail:club,club:club?.name??'',name:String(row.player_name),price:Number(row.price),starting_points:Number(row.starting_points??0),status:String(row.availability).toLowerCase()} as FantasyPlayer;});
}
export async function fetchMyTeams() { return list<FantasyTeam>((await apiClient.get('/fantasy/teams/')).data); }
export async function createFantasyTeam(payload:{name:string;fantasy_competition:string;selections:FantasyTeamSelection[]}) { return (await apiClient.post('/fantasy/teams/',payload)).data as FantasyTeam; }
export async function updateFantasyLineup(teamId:string,selections:FantasyTeamSelection[]) { return (await apiClient.put(`/fantasy/teams/${id(teamId)}/lineup/`,{selections})).data as FantasyTeam; }
export async function previewFantasyTransfer(teamId:string,payload:{gameweek:string;player_out:string;player_in:string}) { return (await apiClient.post(`/fantasy/teams/${id(teamId)}/transfer_preview/`,payload)).data as FantasyTransferPreview; }
export async function makeFantasyTransfer(teamId:string,payload:{gameweek:string;player_out:string;player_in:string}) { return (await apiClient.post(`/fantasy/teams/${id(teamId)}/transfer/`,payload)).data as FantasyTeam; }
export async function fetchTransferHistory(teamId:string) { return (await apiClient.get(`/fantasy/teams/${id(teamId)}/transfers/`)).data as FantasyTransfer[]; }
export async function fetchTransferBalance(teamId:string,gameweek?:string) { return (await apiClient.get(`/fantasy/teams/${id(teamId)}/transfer_balance/`,{params:gameweek?{gameweek}:{}})).data as FantasyTransferBalance; }
export async function fetchTeamPoints(teamId:string) { return (await apiClient.get(`/fantasy/teams/${id(teamId)}/points/`)).data as FantasyTeamScore[]; }
export async function fetchGameweekPoints(gameweekId:string) { return (await apiClient.get(`/fantasy/gameweeks/${id(gameweekId)}/points/`)).data as FantasyPlayerPoints[]; }
export async function fetchGameweekLeaderboard(gameweekId:string) { return (await apiClient.get(`/fantasy/gameweeks/${id(gameweekId)}/leaderboard/`)).data as FantasyTeamScore[]; }
export async function fetchPublicLeagues() { return list<FantasyLeague>((await apiClient.get('/fantasy/leagues/')).data); }
export async function fetchMyLeagues() { return list<FantasyLeague>((await apiClient.get('/fantasy/leagues/mine/')).data); }
export async function createFantasyLeague(payload:Pick<FantasyLeague,'fantasy_competition'|'name'|'visibility'> & Partial<Pick<FantasyLeague,'description'|'capacity'>>) { return (await apiClient.post('/fantasy/leagues/',payload)).data as FantasyLeague; }
export async function joinFantasyLeague(leagueId:string) { return (await apiClient.post(`/fantasy/leagues/${id(leagueId)}/join/`)).data as FantasyLeague; }
export async function joinFantasyLeagueByCode(code:string) { return (await apiClient.post('/fantasy/leagues/join_by_code/',{code})).data as FantasyLeague; }
export async function leaveFantasyLeague(leagueId:string) { await apiClient.post(`/fantasy/leagues/${id(leagueId)}/leave/`); }
export async function fetchLeagueMembers(leagueId:string) { return (await apiClient.get(`/fantasy/leagues/${id(leagueId)}/members/`)).data as FantasyLeagueMember[]; }
export async function fetchLeagueStandings(leagueId:string) { return (await apiClient.get(`/fantasy/leagues/${id(leagueId)}/standings/`)).data as FantasyStanding[]; }
