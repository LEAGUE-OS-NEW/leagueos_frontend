// Onboarding — service layer.
//
// Connects the Fan Onboarding wizard to the Django REST Framework backend.
// All catalogue data (countries, sports, competitions, clubs) and all
// selection submissions are routed through this file.
//
// Endpoints consumed:
//   GET  /preferences/countries/
//   GET  /preferences/sports/
//   GET  /preferences/competitions/
//   GET  /preferences/clubs/
//   GET  /onboarding/
//   POST /onboarding/country/
//   POST /onboarding/sports/
//   POST /onboarding/competitions/
//   POST /onboarding/clubs/
//   POST /onboarding/skip/
//   POST /onboarding/complete/
//   GET  /onboarding/dashboard/

import apiClient from './apiClient';
import { normalizeApiList, unwrapApiData, extractApiError } from './apiUtils';

// ---------------------------------------------------------------------------
// Re-export extractApiError so callers can import it from one place
// ---------------------------------------------------------------------------
export { extractApiError };

// ---------------------------------------------------------------------------
// Catalogue types
// ---------------------------------------------------------------------------

export interface OnboardingCountry {
  id: string;
  name: string;
  code: string;         // ISO 3166-1 alpha-2
  flag?: string | null; // URL to flag image, if provided by backend
}

export interface OnboardingSport {
  id: string;
  name: string;
  slug?: string;
}

export interface OnboardingCompetition {
  id: string;
  name: string;
  sport: string;        // sport UUID
  sport_name?: string;  // optional human label
  country?: string | null;
}

export interface OnboardingClub {
  id: string;
  name: string;
  sport: string;        // sport UUID
  sport_name?: string;
  competition?: string | null;
  competition_name?: string | null;
  crest?: string | null;
  initials?: string | null;
}

// ---------------------------------------------------------------------------
// Onboarding status
// ---------------------------------------------------------------------------

export type OnboardingStepKey =
  | 'COUNTRY'
  | 'SPORTS'
  | 'COMPETITIONS'
  | 'CLUBS';

export interface OnboardingPreferredCountry {
  id: string;
  name: string;
  code: string;
}

export interface OnboardingPreferredSport {
  id: string;
  name: string;
}

export interface OnboardingPreferredCompetition {
  id: string;
  name: string;
}

export interface OnboardingPreferredClub {
  id: string;
  name: string;
}

export interface OnboardingStatus {
  completed: boolean;
  current_step: OnboardingStepKey | null;
  completed_steps: OnboardingStepKey[];
  skipped_steps: OnboardingStepKey[];
  completion_percentage: number;
  preferred_country: OnboardingPreferredCountry | null;
  favourite_sports: OnboardingPreferredSport[];
  favourite_competitions: OnboardingPreferredCompetition[];
  favourite_clubs: OnboardingPreferredClub[];
}

// ---------------------------------------------------------------------------
// Dashboard configuration (GET /onboarding/dashboard/)
// ---------------------------------------------------------------------------

export interface OnboardingDashboardConfig {
  preferred_country: OnboardingPreferredCountry | null;
  favourite_sports: OnboardingPreferredSport[];
  favourite_competitions: OnboardingPreferredCompetition[];
  favourite_clubs: OnboardingPreferredClub[];
}

// ---------------------------------------------------------------------------
// Generic API response wrapper shape returned by POST endpoints
// ---------------------------------------------------------------------------

interface ApiOkResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Catalogue endpoints
// ---------------------------------------------------------------------------

export async function getCountries(): Promise<OnboardingCountry[]> {
  const response = await apiClient.get('/preferences/countries/');
  return normalizeApiList<OnboardingCountry>(response.data);
}

export async function getSports(): Promise<OnboardingSport[]> {
  const response = await apiClient.get('/preferences/sports/');
  return normalizeApiList<OnboardingSport>(response.data);
}

/**
 * Fetch competitions, optionally filtered by sport IDs.
 * The backend may support ?sport_ids=uuid,uuid — pass the UUIDs of the user's
 * selected sports so only relevant competitions are returned.
 */
export async function getCompetitions(
  sportIds?: string[],
): Promise<OnboardingCompetition[]> {
  const params: Record<string, string> = {};
  if (sportIds && sportIds.length > 0) {
    params['sport_ids'] = sportIds.join(',');
  }
  const response = await apiClient.get('/preferences/competitions/', { params });
  return normalizeApiList<OnboardingCompetition>(response.data);
}

/**
 * Fetch clubs, optionally filtered by competition IDs.
 * Pass the UUIDs of the user's selected competitions so only relevant clubs
 * are returned, matching the backend's validation dependency.
 */
export async function getClubs(
  competitionIds?: string[],
): Promise<OnboardingClub[]> {
  const params: Record<string, string> = {};
  if (competitionIds && competitionIds.length > 0) {
    params['competition_ids'] = competitionIds.join(',');
  }
  const response = await apiClient.get('/preferences/clubs/', { params });
  return normalizeApiList<OnboardingClub>(response.data);
}

// ---------------------------------------------------------------------------
// Onboarding status
// ---------------------------------------------------------------------------

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await apiClient.get('/onboarding/');
  return unwrapApiData<OnboardingStatus>(response.data);
}

// ---------------------------------------------------------------------------
// Selection submission endpoints
// ---------------------------------------------------------------------------

export async function selectCountry(countryId: string): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/country/', {
    country_id: countryId,
  });
}

export async function selectSports(sportIds: string[]): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/sports/', {
    sport_ids: sportIds,
  });
}

export async function selectCompetitions(
  competitionIds: string[],
): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/competitions/', {
    competition_ids: competitionIds,
  });
}

export async function selectClubs(clubIds: string[]): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/clubs/', {
    club_ids: clubIds,
  });
}

// ---------------------------------------------------------------------------
// Skip / complete
// ---------------------------------------------------------------------------

export async function skipOnboardingStep(
  step: OnboardingStepKey,
): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/skip/', { step });
}

export async function completeOnboarding(): Promise<void> {
  await apiClient.post<ApiOkResponse>('/onboarding/complete/', {});
}

// ---------------------------------------------------------------------------
// Dashboard configuration
// ---------------------------------------------------------------------------

export async function getDashboardConfiguration(): Promise<OnboardingDashboardConfig> {
  const response = await apiClient.get('/onboarding/dashboard/');
  return unwrapApiData<OnboardingDashboardConfig>(response.data);
}
