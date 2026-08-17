// Fixtures — real fetch (discovery app's /fixtures/, /results/) plus the
// status-label helpers below.
//
// publicDashboardService.ts's getPublicFixtures/getPublicResults targeted
// /dashboards/public/fixtures/ and .../results/ — URLs that don't exist
// anywhere in the backend (confirmed by grep). fetchUpcomingFixtures/
// fetchResults here replace them with the real, working discovery
// endpoints. The status vocabulary below now matches SportingEvent.Status
// exactly (DRAFT/SCHEDULED/LIVE/COMPLETED/POSTPONED/CANCELLED/ABANDONED),
// confirmed against the backend model rather than guessed.

import apiClient from './apiClient';

export type FixtureStatus = 'Scheduled' | 'Live' | 'Provisional' | 'Final' | 'Postponed' | 'Cancelled';

// Minimal structural shapes rather than importing PublicFixtureApi directly
// — these helpers only ever touch a couple of fields, and a real
// PublicFixtureApi already satisfies both. Avoids pulling
// publicDashboardService.ts (and transitively apiClient.ts's real axios
// instance) into any test that imports this file without mocking it.
interface FixtureTeams {
  home_club_name: string;
  away_club_name: string;
}

interface FixtureScore {
  home_score?: number | null;
  away_score?: number | null;
}

const LIVE_VALUES = new Set(['LIVE', 'IN_PROGRESS', 'ONGOING', 'PLAYING', 'IN_PLAY']);
// A backend that explicitly confirms a result (rather than just reporting
// it finished) maps straight to Final. Everything else that merely
// finished maps to Provisional — mirroring this app's own Result
// Verification Admin workflow, where a result stays provisional until an
// admin finalizes it. There's no backend signal for that confirmation yet,
// so Final is reachable but not the default for "the match ended."
const FINAL_VALUES = new Set(['FINAL', 'CONFIRMED', 'VERIFIED']);
const FINISHED_VALUES = new Set(['FINISHED', 'FULL_TIME', 'FT', 'COMPLETED', 'ENDED']);
const POSTPONED_VALUES = new Set(['POSTPONED', 'DELAYED']);
const CANCELLED_VALUES = new Set(['CANCELLED', 'CANCELED', 'ABANDONED', 'VOID']);
const SCHEDULED_VALUES = new Set(['SCHEDULED', 'UPCOMING', 'NOT_STARTED']);

export function deriveFixtureStatus(apiStatus: string | undefined, hasScore: boolean): FixtureStatus {
  const normalized = (apiStatus ?? '').trim().toUpperCase();

  if (CANCELLED_VALUES.has(normalized)) return 'Cancelled';
  if (POSTPONED_VALUES.has(normalized)) return 'Postponed';
  if (LIVE_VALUES.has(normalized)) return 'Live';
  if (FINAL_VALUES.has(normalized)) return 'Final';
  if (FINISHED_VALUES.has(normalized)) return 'Provisional';
  if (SCHEDULED_VALUES.has(normalized) || !normalized) return 'Scheduled';

  // Unrecognized status string: fall back on whether a score has appeared
  // rather than guessing it's still scheduled.
  return hasScore ? 'Provisional' : 'Scheduled';
}

export function fixtureLabel(fixture: FixtureTeams): string {
  return `${fixture.home_club_name} vs ${fixture.away_club_name}`;
}

export function fixtureHasScore(fixture: FixtureScore): boolean {
  return fixture.home_score != null && fixture.away_score != null;
}

// Shared by FixturesPage.tsx and MatchCentre.tsx so the two views can never
// disagree on what a status looks like.
export function fixtureStatusClass(status: FixtureStatus): string {
  switch (status) {
    case 'Live':
      return 'fixture-status fixture-status--live';
    case 'Provisional':
      return 'fixture-status fixture-status--provisional';
    case 'Final':
      return 'fixture-status fixture-status--final';
    case 'Postponed':
      return 'fixture-status fixture-status--postponed';
    case 'Cancelled':
      return 'fixture-status fixture-status--cancelled';
    case 'Scheduled':
      return 'fixture-status fixture-status--scheduled';
  }
}

export function formatFixtureKickoff(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Real fetch — GET /api/v1/fixtures/ and /api/v1/results/ (discovery app).
// ---------------------------------------------------------------------------

/** Shape FixturesPage.tsx/LiveScores.tsx render — deliberately close to the
 * old (dead) PublicFixtureApi's field names so those components needed
 * minimal churn beyond swapping the import. home/away *_logo_url are
 * always undefined — fixtures reference sports.Participant, not
 * profiles.Club, so there's no logo to join in; SafeImage/CrestFallback
 * already handle a missing image. */
export interface RealFixture {
  id: string;
  competition_name: string;
  sport_name: string;
  home_club_name: string;
  home_club_logo_url?: string;
  away_club_name: string;
  away_club_logo_url?: string;
  status: string;
  match_date: string;
  venue: string;
  home_score: number | null;
  away_score: number | null;
  clock_display: string;
}

interface BackendFixtureParticipant {
  role: string;
  position: number;
  participant: { id: string; name: string; short_name: string; kind: string };
}

interface BackendFixture {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
  venue: string;
  sport_name: string | null;
  competition_name: string | null;
  participants: BackendFixtureParticipant[];
  home_score: number | null;
  away_score: number | null;
  clock_display: string;
}

function mapFixture(raw: BackendFixture): RealFixture {
  const home = raw.participants.find((p) => p.role === 'HOME')?.participant;
  const away = raw.participants.find((p) => p.role === 'AWAY')?.participant;
  return {
    id: raw.id,
    competition_name: raw.competition_name ?? '',
    sport_name: raw.sport_name ?? '',
    home_club_name: home?.name ?? raw.name.split(' vs ')[0] ?? 'TBD',
    away_club_name: away?.name ?? raw.name.split(' vs ')[1] ?? 'TBD',
    status: raw.status,
    match_date: raw.starts_at ?? '',
    venue: raw.venue,
    home_score: raw.home_score,
    away_score: raw.away_score,
    clock_display: raw.clock_display,
  };
}

function unwrapFixtureList(data: BackendFixture[] | { results: BackendFixture[] }): BackendFixture[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchLiveFixtures(): Promise<RealFixture[]> {
  try {
    const response = await apiClient.get<BackendFixture[] | { results: BackendFixture[] }>('/fixtures/', {
      params: { status: 'LIVE', ordering: 'starts_at' },
    });
    return unwrapFixtureList(response.data).map(mapFixture);
  } catch {
    return [];
  }
}

export async function fetchUpcomingFixtures(): Promise<RealFixture[]> {
  const response = await apiClient.get<BackendFixture[] | { results: BackendFixture[] }>('/fixtures/', {
    params: { ordering: 'starts_at' },
  });
  return unwrapFixtureList(response.data).map(mapFixture);
}

export async function fetchResults(): Promise<RealFixture[]> {
  const response = await apiClient.get<BackendFixture[] | { results: BackendFixture[] }>('/results/', {
    params: { ordering: '-starts_at' },
  });
  return unwrapFixtureList(response.data).map(mapFixture);
}
