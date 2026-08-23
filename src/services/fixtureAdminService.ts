// Fixture admin — service layer (Sports Data & Statistics Admin / Super
// Admin). Real calls against the new /admin/fixtures/... pipeline plus the
// real /sports/ and /participants/ catalogs used to build the create-fixture
// form.

import apiClient from './apiClient';

export interface SportOption {
  id: string;
  name: string;
}

export async function fetchSports(): Promise<SportOption[]> {
  const response = await apiClient.get<{ results: SportOption[] } | SportOption[]>('/sports/');
  const raw = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  return raw.map((s) => ({ id: s.id, name: s.name }));
}

export interface CompetitionOption {
  id: string;
  name: string;
}

export async function fetchCompetitions(sportId?: string): Promise<CompetitionOption[]> {
  const response = await apiClient.get<{ results: CompetitionOption[] } | CompetitionOption[]>('/competitions/', {
    params: sportId ? { sport: sportId } : {},
  });
  const raw = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  return raw.map((c) => ({ id: c.id, name: c.name }));
}

export interface ParticipantOption {
  id: string;
  name: string;
  shortName: string;
  sportId: string;
}

interface BackendParticipant {
  id: string;
  name: string;
  short_name: string;
  sport: { id: string; name: string; code: string; slug: string } | string;
}

function participantSportId(sport: BackendParticipant['sport']): string {
  return typeof sport === 'string' ? sport : sport.id;
}

export async function fetchParticipants(sportId?: string): Promise<ParticipantOption[]> {
  const response = await apiClient.get<{ results: BackendParticipant[] } | BackendParticipant[]>('/participants/', {
    params: { kind: 'TEAM', ...(sportId ? { sport: sportId } : {}) },
  });
  const raw = Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.short_name,
    sportId: participantSportId(p.sport),
  }));
}

export async function createParticipant(input: { name: string; shortName?: string; sportId: string }): Promise<ParticipantOption> {
  const response = await apiClient.post<BackendParticipant>('/participants/', {
    name: input.name.trim(),
    short_name: input.shortName?.trim() || '',
    sport: input.sportId,
  });
  return {
    id: response.data.id,
    name: response.data.name,
    shortName: response.data.short_name,
    sportId: participantSportId(response.data.sport),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export type FixtureAdminStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED' | 'ABANDONED';
export type FixtureVerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface FixtureAdminItem {
  id: string;
  name: string;
  status: FixtureAdminStatus;
  startsAt: string | null;
  endsAt: string | null;
  venue: string;
  matchType: string;
  showInMarkets: boolean;
  isLiveScoreFeatured: boolean;
  verificationStatus: FixtureVerificationStatus;
  sportName: string;
  competitionName: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  clockDisplay: string;
}

interface BackendFixtureAdmin {
  id: string;
  name: string;
  status: FixtureAdminStatus;
  starts_at: string | null;
  ends_at: string | null;
  venue: string;
  match_type: string;
  show_in_markets: boolean;
  is_live_score_featured: boolean;
  verification_status: FixtureVerificationStatus;
  sport_name: string | null;
  competition_name: string | null;
  participants: { role: string; position: number; participant: { id: string; name: string } }[];
  home_score: number | null;
  away_score: number | null;
  clock_display: string;
}

function mapFixture(raw: BackendFixtureAdmin): FixtureAdminItem {
  const home = raw.participants.find((p) => p.role === 'HOME')?.participant;
  const away = raw.participants.find((p) => p.role === 'AWAY')?.participant;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    startsAt: raw.starts_at,
    endsAt: raw.ends_at,
    venue: raw.venue,
    matchType: raw.match_type ?? '',
    showInMarkets: raw.show_in_markets ?? false,
    isLiveScoreFeatured: raw.is_live_score_featured ?? false,
    verificationStatus: raw.verification_status ?? 'NONE',
    sportName: raw.sport_name ?? '',
    competitionName: raw.competition_name ?? '',
    homeName: home?.name ?? 'TBD',
    awayName: away?.name ?? 'TBD',
    homeScore: raw.home_score,
    awayScore: raw.away_score,
    clockDisplay: raw.clock_display,
  };
}

export async function fetchAdminFixtures(): Promise<FixtureAdminItem[]> {
  const response = await apiClient.get<BackendFixtureAdmin[]>('/admin/fixtures/');
  return response.data.map(mapFixture);
}

export interface CreateFixtureInput {
  sportId: string;
  competitionId?: string;
  homeParticipantId: string;
  awayParticipantId: string;
  startsAt: string;
  endsAt?: string;
  venue?: string;
  matchType?: string;
  showInMarkets?: boolean;
  isLiveScoreFeatured?: boolean;
}

export async function createFixture(input: CreateFixtureInput): Promise<FixtureAdminItem> {
  const response = await apiClient.post<BackendFixtureAdmin>('/admin/fixtures/', {
    sport: input.sportId,
    competition: input.competitionId || undefined,
    home_participant: input.homeParticipantId,
    away_participant: input.awayParticipantId,
    starts_at: input.startsAt,
    ends_at: input.endsAt || undefined,
    venue: input.venue ?? '',
    match_type: input.matchType ?? '',
    show_in_markets: input.showInMarkets ?? false,
    is_live_score_featured: input.isLiveScoreFeatured ?? false,
  });
  return mapFixture(response.data);
}

export async function setFixtureStatus(
  fixtureId: string,
  status: Exclude<FixtureAdminStatus, 'DRAFT' | 'COMPLETED'>,
): Promise<FixtureAdminItem> {
  const response = await apiClient.patch<BackendFixtureAdmin>(`/admin/fixtures/${encodeURIComponent(fixtureId)}/status/`, {
    status,
  });
  return mapFixture(response.data);
}

export interface RescheduleFixtureInput {
  startsAt?: string;
  venue?: string;
  endsAt?: string;
}

export async function rescheduleFixture(fixtureId: string, input: RescheduleFixtureInput): Promise<FixtureAdminItem> {
  const response = await apiClient.patch<BackendFixtureAdmin>(`/admin/fixtures/${encodeURIComponent(fixtureId)}/reschedule/`, {
    ...(input.startsAt ? { starts_at: input.startsAt } : {}),
    ...(input.venue !== undefined ? { venue: input.venue } : {}),
    ...(input.endsAt ? { ends_at: input.endsAt } : {}),
  });
  return mapFixture(response.data);
}

export async function updateFixtureScore(
  fixtureId: string,
  input: { homeScore: number; awayScore: number; clockDisplay?: string },
): Promise<FixtureAdminItem> {
  const response = await apiClient.post<BackendFixtureAdmin>(`/admin/fixtures/${encodeURIComponent(fixtureId)}/score/`, {
    home_score: input.homeScore,
    away_score: input.awayScore,
    clock_display: input.clockDisplay ?? '',
  });
  return mapFixture(response.data);
}

export async function completeFixture(fixtureId: string): Promise<FixtureAdminItem> {
  const response = await apiClient.post<BackendFixtureAdmin>(`/admin/fixtures/${encodeURIComponent(fixtureId)}/complete/`, {});
  return mapFixture(response.data);
}

export async function submitFixtureVerification(fixtureId: string): Promise<FixtureAdminItem> {
  const response = await apiClient.post<BackendFixtureAdmin>(
    `/admin/fixtures/${encodeURIComponent(fixtureId)}/submit-verification/`,
    {},
  );
  return mapFixture(response.data);
}

// ---------------------------------------------------------------------------
// Match Statistics Entry — Sports Data Admin
// ---------------------------------------------------------------------------

/** One stat record stored for a player in a fixture. */
export interface FixturePlayerStat {
  id: string;
  stat_type: string;
  value: string;
}

/** A player row returned by GET /admin/fixtures/<id>/player-statistics/ */
export interface FixtureStatPlayer {
  participant_id: string;
  participant_name: string;
  /** UUID of the FantasyPlayer if this participant is in a Fantasy pool, else null. */
  fantasy_player_id: string | null;
  /** True when this participant is in at least one Fantasy competition pool
   *  whose gameweek contains this fixture. */
  in_fantasy_pool: boolean;
  stats: FixturePlayerStat[];
}

/** Full response from GET /admin/fixtures/<id>/player-statistics/ */
export interface FixtureStatisticsData {
  fixture_id: string;
  fixture_name: string;
  fixture_status: string;
  /** Sport slug / name, e.g. "football" */
  sport: string;
  /** Ordered list of stat_type codes used as column headers, e.g. ["GOALS","ASSISTS",...] */
  stat_types: string[];
  /** Map of stat_type code → human-readable label */
  stat_labels: Record<string, string>;
  players: FixtureStatPlayer[];
}

/** A single row sent in the POST body. */
export interface StatisticEntryRow {
  /** Participant UUID (ATHLETE kind). */
  participant: string;
  stat_type: string;
  value: number | string;
}

/** Body for POST /admin/fixtures/<id>/player-statistics/ */
export interface SaveStatisticsInput {
  statistics: StatisticEntryRow[];
  /**
   * True  → Fantasy scoring is triggered after save (use for COMPLETED fixtures).
   * False → statistics are saved without scoring (use for LIVE/partial saves).
   * Defaults to true.
   */
  trigger_scoring?: boolean;
}

/** Row-level validation error returned in a 400 response. */
export interface StatisticsRowError {
  index: number;
  participant_id: string;
  stat_type: string;
  error: string;
}

/** 202 success response from POST. */
export interface SaveStatisticsResult {
  fixture_id: string;
  fixture_name: string;
  records_created: number;
  records_updated: number;
  records_unchanged: number;
  scoring_scheduled: boolean;
  ingestion_id: string | null;
  message: string;
}

/** 400 error response from POST. */
export interface SaveStatisticsError {
  success: false;
  message: string;
  errors?: StatisticsRowError[];
}

/**
 * Fetch all players and their current statistics for a fixture.
 * GET /api/v1/admin/fixtures/<fixtureId>/player-statistics/
 */
export async function fetchFixtureStatistics(
  fixtureId: string,
): Promise<FixtureStatisticsData> {
  const response = await apiClient.get<FixtureStatisticsData>(
    `/admin/fixtures/${encodeURIComponent(fixtureId)}/player-statistics/`,
  );
  return response.data;
}

/**
 * Bulk-save (upsert) player statistics for a fixture.
 * POST /api/v1/admin/fixtures/<fixtureId>/player-statistics/
 *
 * Throws with the raw Axios error on network/4xx/5xx failures so the caller
 * can use extractApiError() for consistent error display.
 */
export async function saveFixtureStatistics(
  fixtureId: string,
  input: SaveStatisticsInput,
): Promise<SaveStatisticsResult> {
  const response = await apiClient.post<SaveStatisticsResult>(
    `/admin/fixtures/${encodeURIComponent(fixtureId)}/player-statistics/`,
    {
      statistics: input.statistics,
      trigger_scoring: input.trigger_scoring ?? true,
    },
  );
  return response.data;
}
