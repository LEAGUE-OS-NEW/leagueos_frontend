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

export interface FixtureAdminItem {
  id: string;
  name: string;
  status: FixtureAdminStatus;
  startsAt: string | null;
  venue: string;
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
  venue: string;
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
    venue: raw.venue,
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
  venue?: string;
}

export async function createFixture(input: CreateFixtureInput): Promise<FixtureAdminItem> {
  const response = await apiClient.post<BackendFixtureAdmin>('/admin/fixtures/', {
    sport: input.sportId,
    competition: input.competitionId || undefined,
    home_participant: input.homeParticipantId,
    away_participant: input.awayParticipantId,
    starts_at: input.startsAt,
    venue: input.venue ?? '',
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
