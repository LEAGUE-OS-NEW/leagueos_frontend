import apiClient from './apiClient.ts';
export * from './fantasyService';
import type { FantasyCompetition, FantasyFixture, FantasyGameweek, FantasyPlayer, FantasyScoringRule } from './fantasyService';

export interface FantasyPlayerCandidate { id:string; name:string; club:string|null; profile_position:string }
export interface CanonicalFantasyOptions { competitions:Array<{id:string;name:string;sport:string;sport_slug:string}>; seasons:Array<{id:string;name:string;competition:string;is_active:boolean}> }
export interface FantasyLeagueOverview { id:string;name:string;competition:string;fantasy_competition:string;visibility:'PUBLIC'|'PRIVATE';owner:string;member_count:number;capacity:number|null;status:'OPEN'|'FULL' }
export interface FantasyCorrection { id:string;player_points:string;player_name:string;gameweek:string;previous_value:string;new_value:string;reason:string;actor:string;created_at:string }
// Full statistic type — label and observed flag are preserved for the scoring UI
export interface FantasyStatisticType { code:string; label:string; observed:boolean }
const list=<T>(data:T[]|{results:T[]}):T[]=>Array.isArray(data)?data:data.results;
const id=(value:string)=>encodeURIComponent(value);

export async function fetchAdminFantasyCompetitions(){return list<FantasyCompetition>((await apiClient.get('/fantasy/competitions/admin-list/')).data);}
export async function fetchCanonicalFantasyOptions(){return (await apiClient.get('/fantasy/competitions/canonical-options/')).data as CanonicalFantasyOptions;}
export async function adminCreateCompetition(payload:Partial<FantasyCompetition>){return (await apiClient.post('/fantasy/competitions/',payload)).data as FantasyCompetition;}
export async function adminUpdateCompetition(value:string,payload:Partial<FantasyCompetition>){return (await apiClient.patch(`/fantasy/competitions/${id(value)}/`,payload)).data as FantasyCompetition;}
// Uses list<>() — handles both plain array and paginated {results:[]} shapes
export async function fetchFantasyPlayerCandidates(competition:string){return list<FantasyPlayerCandidate>((await apiClient.get('/fantasy/players/candidates/',{params:{competition}})).data);}
export async function adminCreatePlayer(payload:Pick<FantasyPlayer,'fantasy_competition'|'player'|'position'|'price'|'eligible'|'availability'>){return (await apiClient.post('/fantasy/players/',payload)).data as FantasyPlayer;}
export async function adminUpdatePlayer(value:string,payload:Partial<Pick<FantasyPlayer,'position'|'price'|'eligible'|'availability'>>){return (await apiClient.patch(`/fantasy/players/${id(value)}/`,payload)).data as FantasyPlayer;}
export async function adminCreateGameweek(payload:Partial<FantasyGameweek>){return (await apiClient.post('/fantasy/gameweeks/',payload)).data as FantasyGameweek;}
export async function adminUpdateGameweek(value:string,payload:Partial<FantasyGameweek>){return (await apiClient.patch(`/fantasy/gameweeks/${id(value)}/`,payload)).data as FantasyGameweek;}
// Uses list<>() — handles both plain array and paginated {results:[]} shapes
export async function fetchFantasyFixtureCandidates(competition:string){return list<FantasyFixture>((await apiClient.get('/fantasy/gameweeks/fixture-candidates/',{params:{competition}})).data);}
export async function adminTransitionGameweek(value:string,status:FantasyGameweek['status']){return (await apiClient.post(`/fantasy/gameweeks/${id(value)}/transition/`,{status})).data as FantasyGameweek;}
export async function adminRecalculateGameweek(value:string){return (await apiClient.post(`/fantasy/gameweeks/${id(value)}/recalculate/`)).data as {status:string;detail:string};}
export async function adminFinalizeGameweek(value:string){return (await apiClient.post(`/fantasy/gameweeks/${id(value)}/finalize/`)).data as FantasyGameweek;}
// Returns full statistic type objects — label shown to admin, observed flag indicates available stats in match data
export async function fetchFantasyStatisticTypes(competition:string):Promise<FantasyStatisticType[]>{return list<FantasyStatisticType>((await apiClient.get(`/fantasy/competitions/${id(competition)}/statistic-types/`)).data);}
export async function adminCreateScoringRule(payload:Partial<FantasyScoringRule>&{fantasy_competition:string}){return (await apiClient.post('/fantasy/admin/scoring-rules/',payload)).data as FantasyScoringRule;}
export async function adminCreateCorrection(payload:{player_points:string;new_value:string;reason:string}){return (await apiClient.post('/fantasy/admin/corrections/',payload)).data as FantasyCorrection;}
export async function fetchAdminCorrections(gameweek?:string):Promise<Record<string,unknown>[]>{return list<Record<string,unknown>>((await apiClient.get('/fantasy/admin/corrections/',{params:gameweek?{gameweek}:{}})).data);}
// Uses list<>() — handles both plain array and paginated {results:[]} shapes
export async function fetchAdminLeagueOverview(){return list<FantasyLeagueOverview>((await apiClient.get('/fantasy/leagues/admin-overview/')).data);}
