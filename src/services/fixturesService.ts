// Fixture status — shared logic only (fetching itself stays in
// publicDashboardService.ts; this is the one place that turns a raw,
// unconstrained backend status string into a fan-facing label).
//
// The real backend's PublicFixtureApi.status has no enum — the only
// confirmed value seen anywhere in this repo (tests, mocks) is
// "SCHEDULED". There is no confirmed live/finished string. This mapper
// makes a best-effort guess at common REST status vocabularies and always
// falls back safely rather than silently mislabeling an unknown status.

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
