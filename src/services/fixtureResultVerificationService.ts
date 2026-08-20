// Fixture Result Verification — service layer (Result Verification Admin).
// A lightweight, independent QA check on a completed fixture's final score,
// distinct from resultVerificationService.ts (which is entirely market-
// outcome-scoped, driven by Market.status). Real backend calls against
// /admin/fixture-results/...

import apiClient from './apiClient';

export type FixtureVerificationDecisionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface FixtureResultVerification {
  id: string;
  fixtureId: string;
  fixtureName: string;
  sportName: string;
  competitionName: string | null;
  startsAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureVerificationDecisionStatus;
  submittedByEmail: string | null;
  submittedAt: string;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  reviewNote: string;
}

interface BackendFixtureResultVerification {
  id: string;
  fixture_id: string;
  fixture_name: string;
  sport_name: string;
  competition_name: string | null;
  starts_at: string;
  home_score: number | null;
  away_score: number | null;
  status: FixtureVerificationDecisionStatus;
  submitted_by_email: string | null;
  submitted_at: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_note: string;
}

function mapVerification(raw: BackendFixtureResultVerification): FixtureResultVerification {
  return {
    id: raw.id,
    fixtureId: raw.fixture_id,
    fixtureName: raw.fixture_name,
    sportName: raw.sport_name,
    competitionName: raw.competition_name,
    startsAt: raw.starts_at,
    homeScore: raw.home_score,
    awayScore: raw.away_score,
    status: raw.status,
    submittedByEmail: raw.submitted_by_email,
    submittedAt: raw.submitted_at,
    reviewedByEmail: raw.reviewed_by_email,
    reviewedAt: raw.reviewed_at,
    reviewNote: raw.review_note,
  };
}

export async function fetchFixtureResultVerifications(): Promise<FixtureResultVerification[]> {
  const response = await apiClient.get<BackendFixtureResultVerification[]>('/admin/fixture-results/');
  return response.data.map(mapVerification);
}

export async function verifyFixtureResult(id: string, note = ''): Promise<FixtureResultVerification> {
  const response = await apiClient.post<BackendFixtureResultVerification>(
    `/admin/fixture-results/${encodeURIComponent(id)}/verify/`,
    { note },
  );
  return mapVerification(response.data);
}

export async function rejectFixtureResult(id: string, note = ''): Promise<FixtureResultVerification> {
  const response = await apiClient.post<BackendFixtureResultVerification>(
    `/admin/fixture-results/${encodeURIComponent(id)}/reject/`,
    { note },
  );
  return mapVerification(response.data);
}
