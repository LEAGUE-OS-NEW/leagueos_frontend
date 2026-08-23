import apiClient from './apiClient.ts';
export * from './fantasyService';
import type { FantasyAvailability, FantasyCompetition, FantasyFixture, FantasyGameweek, FantasyPlayer, FantasyScoringRule, ScoringRuleType } from './fantasyService';
export type { ScoringRuleType };
export interface FantasyPlayerCandidate { id:string; name:string; club:string|null; profile_position:string }
// Represents a Competition + Season pair that is already covered by a FantasyCompetition.
// Returned by canonical-options so the admin UI can warn before attempting a duplicate POST.
export interface TakenPair { competition:string; season:string; fantasy_competition_id:string; fantasy_competition_name:string }
export interface CanonicalFantasyOptions { competitions:Array<{id:string;name:string;sport:string;sport_slug:string}>; seasons:Array<{id:string;name:string;competition:string;is_active:boolean}>; taken_pairs:TakenPair[] }
export interface FantasyLeagueOverview { id:string;name:string;competition:string;fantasy_competition:string;visibility:'PUBLIC'|'PRIVATE';owner:string;member_count:number;capacity:number|null;status:'OPEN'|'FULL' }
export interface FantasyCorrection { id:string;player_points:string;player_name:string;gameweek:string;previous_value:string;new_value:string;reason:string;actor:string;created_at:string }
// Full statistic type — label and observed flag are preserved for the scoring UI
export interface FantasyStatisticType { code:string; label:string; observed:boolean }
// Canonical sports catalog — used by the Add Competition / Season modal
export interface CanonicalSport { id:string; name:string; code:string; slug:string }
// sport_slug matches the slug field on canonicalSports — used to filter competitions by selected sport
export interface CanonicalCompetition { id:string; name:string; slug:string; country_code:string; sport:string; sport_slug:string }
export interface CanonicalSeason { id:string; sport:string; competition:string|null; name:string; slug:string; starts_on:string|null; ends_on:string|null; is_active:boolean; is_verified:boolean }
const list=<T>(data:T[]|{results:T[]}):T[]=>Array.isArray(data)?data:data.results;
const id=(value:string)=>encodeURIComponent(value);

export async function fetchAdminFantasyCompetitions(){return list<FantasyCompetition>((await apiClient.get('/fantasy/competitions/admin-list/')).data);}
export async function fetchCanonicalFantasyOptions(){return (await apiClient.get('/fantasy/competitions/canonical-options/')).data as CanonicalFantasyOptions;}
export async function adminCreateCompetition(payload:Partial<FantasyCompetition>){return (await apiClient.post('/fantasy/competitions/',payload)).data as FantasyCompetition;}
export async function adminUpdateCompetition(value:string,payload:Partial<FantasyCompetition>){return (await apiClient.patch(`/fantasy/competitions/${id(value)}/`,payload)).data as FantasyCompetition;}
export async function adminDeleteCompetition(value:string){await apiClient.delete(`/fantasy/competitions/${id(value)}/`);}
// Uses list<>() — handles both plain array and paginated {results:[]} shapes
export async function fetchFantasyPlayerCandidates(competition:string){return list<FantasyPlayerCandidate>((await apiClient.get('/fantasy/players/candidates/',{params:{competition}})).data);}
export async function adminCreatePlayer(payload:Pick<FantasyPlayer,'fantasy_competition'|'player'|'position'|'price'|'eligible'|'availability'>){return (await apiClient.post('/fantasy/players/',payload)).data as FantasyPlayer;}
export async function adminUpdatePlayer(value:string,payload:Partial<Pick<FantasyPlayer,'position'|'price'|'eligible'|'availability'|'starting_points'>>){return (await apiClient.patch(`/fantasy/players/${id(value)}/`,payload)).data as FantasyPlayer;}

/** Payload for creating a brand-new player (Participant + PlayerProfile + FantasyPlayer) in one admin action. */
export interface AdminCreateFullPlayerPayload {
  first_name: string;
  last_name: string;
  sport: string;          // Sport UUID
  club: string;           // profiles.Club UUID
  profile_position: string;
  shirt_number?: number | null;
  nationality?: string | null;  // profiles.Country UUID
  date_of_birth?: string | null;
  photo_url?: string;
  fantasy_competition: string;
  fantasy_position: string;
  price: number | string;
  starting_points?: number | string;
  eligible?: boolean;
  availability?: FantasyAvailability;
}

/**
 * Admin override: create a new player from scratch and add them to the Fantasy pool.
 * POST /api/v1/fantasy/players/create-full/
 */
export async function adminCreateFullPlayer(payload: AdminCreateFullPlayerPayload): Promise<FantasyPlayer> {
  return (await apiClient.post('/fantasy/players/create-full/', payload)).data as FantasyPlayer;
}
export async function adminDeletePlayer(value:string){await apiClient.delete(`/fantasy/players/${id(value)}/`);}
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
export async function adminUpdateScoringRule(value:string,payload:Partial<Pick<FantasyScoringRule,'points'|'enabled'|'rule_type'|'conditions'>>){return (await apiClient.patch(`/fantasy/admin/scoring-rules/${id(value)}/`,payload)).data as FantasyScoringRule;}
export async function adminDeleteScoringRule(value:string){await apiClient.delete(`/fantasy/admin/scoring-rules/${id(value)}/`);}
export async function adminCreateCorrection(payload:{player_points:string;new_value:string;reason:string}){return (await apiClient.post('/fantasy/admin/corrections/',payload)).data as FantasyCorrection;}
export async function fetchAdminCorrections(gameweek?:string):Promise<Record<string,unknown>[]>{return list<Record<string,unknown>>((await apiClient.get('/fantasy/admin/corrections/',{params:gameweek?{gameweek}:{}})).data);}
// Uses list<>() — handles both plain array and paginated {results:[]} shapes
export async function fetchAdminLeagueOverview(){return list<FantasyLeagueOverview>((await apiClient.get('/fantasy/leagues/admin-overview/')).data);}

// ── Canonical sports catalog (Add Competition / Season modal) ──────────────
export async function fetchCanonicalSports(){return list<CanonicalSport>((await apiClient.get('/sports/')).data);}
export async function createCanonicalCompetition(payload:{sport:string;name:string;country_code?:string;is_active?:boolean}){
  // Uses the dedicated admin route — the public /competitions/ path is
  // served by the discovery app (GET-only) and returns 405 on POST.
  return (await apiClient.post('/admin/sports/competitions/',payload)).data as CanonicalCompetition;
}
export async function createCanonicalSeason(payload:{sport:string;competition?:string|null;name:string;starts_on?:string|null;ends_on?:string|null;is_active?:boolean}){
  return (await apiClient.post('/seasons/',payload)).data as CanonicalSeason;
}

// ── Match Statistics (test/admin data entry) ──────────────────────────────

/** Payload for creating a single MatchPlayerStatistic via the admin endpoint. */
export interface MatchStatisticPayload {
  fixture: string;       // SportingEvent UUID
  participant: string;   // Participant UUID (the athlete — FantasyPlayer.player)
  stat_type: string;     // e.g. "GOALS" — must be in the sport's statistic catalogue
  value: number | string;
}

/** Response shape returned by POST /fantasy/admin/match-statistics/ */
export interface CreatedMatchStatistic {
  id: string;
  fixture: string;
  fixture_name: string;
  participant: string;
  participant_name: string;
  stat_type: string;
  value: string;
  match_centre_created: boolean;
}

/**
 * Create a MatchPlayerStatistic for testing fantasy scoring end-to-end.
 *
 * The backend will:
 *   1. Validate the fixture, participant, stat_type (against sport catalogue) and value.
 *   2. get_or_create the MatchCentre for the fixture.
 *   3. Create the MatchPlayerStatistic row.
 *
 * NOTE: Creating a stat does NOT automatically recalculate fantasy points.
 * Call adminRecalculateGameweek() separately once all stats are entered.
 */
export async function createMatchPlayerStatistic(payload: MatchStatisticPayload): Promise<CreatedMatchStatistic> {
  return (await apiClient.post('/fantasy/admin/match-statistics/', payload)).data as CreatedMatchStatistic;
}

/** Fetch all MatchPlayerStatistic records, optionally filtered by fixture or participant. */
export async function fetchMatchPlayerStatistics(params?: { fixture?: string; participant?: string }): Promise<CreatedMatchStatistic[]> {
  return list<CreatedMatchStatistic>((await apiClient.get('/fantasy/admin/match-statistics/', { params: params ?? {} })).data);
}

// ── Match Statistics Review (Admin management workflow) ───────────────────

/** A single raw stat inside a player+fixture review row. */
export interface ReviewStat {
  id: string;
  stat_type: string;
  value: string;
}

/** A single entry in the FantasyPlayerGameweekPoints breakdown array. */
export interface ScoringBreakdownItem {
  statistic_type: string;
  value: string;
  points: string;
}

/** A scoring rule as returned by the review-detail endpoint. */
export interface ReviewScoringRule {
  statistic_type: string;
  points: string;
}

/** Gameweek summary embedded in review rows. */
export interface ReviewGameweek {
  id: string;
  name: string;
  number: number;
  status: string;
}

/** One row in the review list — one player in one fixture. */
export interface StatisticReviewRow {
  participant_id: string;
  participant_name: string;
  club: string | null;
  club_id: string | null;
  fixture_id: string;
  fixture_name: string;
  fixture_status: string;
  gameweek: ReviewGameweek | null;
  stats: ReviewStat[];
  fantasy_points: string | null;
  breakdown: ScoringBreakdownItem[];
  review_status: 'PENDING' | 'APPROVED';
  review_id: string | null;
}

/** Full detail for one player+fixture, including scoring rules. */
export interface StatisticReviewDetail extends StatisticReviewRow {
  competition: { id: string; name: string };
  base_points: string | null;
  correction_points: string | null;
  scoring_rules: ReviewScoringRule[];
  approved_at: string | null;
}

/** Payload for correcting a single MatchPlayerStatistic. */
export interface CorrectStatisticPayload {
  stat_id: string;
  value: number | string;
  reason?: string;
}

/** Response from the correct endpoint. */
export interface CorrectStatisticResult {
  stat_id: string;
  stat_type: string;
  participant_id: string;
  fixture_id: string;
  fixture_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  gameweeks_rescored: string[];
}

/** Payload for approving a player+fixture review. */
export interface ApproveReviewPayload {
  competition: string;
  fixture: string;
  participant: string;
  notes?: string;
}

/** Response from the approve endpoint. */
export interface ApproveReviewResult {
  review_id: string;
  status: 'APPROVED';
  approved_at: string;
  approved_by: string | null;
}

/**
 * Fetch grouped review rows — one per (player, fixture) pair.
 * Requires competition. Optionally filter by gameweek, fixture, participant, review_status.
 */
export async function fetchStatisticReviewList(params: {
  competition: string;
  gameweek?: string;
  fixture?: string;
  participant?: string;
  review_status?: 'PENDING' | 'APPROVED';
}): Promise<StatisticReviewRow[]> {
  return list<StatisticReviewRow>(
    (await apiClient.get('/fantasy/admin/match-statistics/review/', { params })).data
  );
}

/**
 * Fetch full detail for one player in one fixture.
 * Includes all stats, full fantasy scoring breakdown, and scoring rules.
 */
export async function fetchStatisticReviewDetail(
  fixtureId: string,
  participantId: string,
  competition: string,
): Promise<StatisticReviewDetail> {
  return (
    await apiClient.get(
      `/fantasy/admin/match-statistics/review/${encodeURIComponent(fixtureId)}/${encodeURIComponent(participantId)}/`,
      { params: { competition } },
    )
  ).data as StatisticReviewDetail;
}

/**
 * Correct the value of a single MatchPlayerStatistic.
 * The backend re-runs score_gameweek() automatically after saving.
 */
export async function correctMatchStatistic(payload: CorrectStatisticPayload): Promise<CorrectStatisticResult> {
  return (await apiClient.post('/fantasy/admin/match-statistics/correct/', payload)).data as CorrectStatisticResult;
}

/**
 * Approve a FantasyStatisticReview record for a player+fixture combination.
 */
export async function approveStatisticReview(payload: ApproveReviewPayload): Promise<ApproveReviewResult> {
  return (await apiClient.post('/fantasy/admin/match-statistics/approve/', payload)).data as ApproveReviewResult;
}
