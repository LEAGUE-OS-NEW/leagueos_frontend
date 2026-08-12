// Fantasy Home — service layer (Step 2 · Fantasy Home).
//
// No real backend endpoint exists for fantasy competitions yet, so this is
// mock-backed, following the same convention as fanDashboardService.ts:
// typed interfaces, in-memory mock data, async delay()-wrapped functions,
// shaped so a real backend swap later only touches this file.
//
// TEMPORARY MOCK DATA — replace these consts with real API calls when the
// fantasy backend becomes available.

import type { Sport } from '../pages/fan/fantasy/types';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CompetitionStatus = 'open' | 'closed' | 'upcoming';
export type EntryType = 'public' | 'private';
export type MyCompetitionAction = 'create-squad' | 'manage-team' | 'view-team';

/** A fantasy competition the fan can discover and join. */
export interface FantasyCompetition {
  id: string;
  name: string;
  sport: Sport;
  season: string;
  status: CompetitionStatus;
  startDate: string;
  currentGameweek: string;
  participants: number;
  entryType: EntryType;
  prize: string;
}

/** Personal summary shown when the fan has joined at least one competition. */
export interface MyFantasySummary {
  totalPoints: number;
  overallRank: number;
  competitionsJoined: number;
  currentGameweek: string;
  upcomingDeadline: string;
}

/** A competition the fan has already joined. */
export interface MyCompetitionEntry {
  competitionId: string;
  name: string;
  sport: Sport;
  season: string;
  currentGameweek: string;
  participants: number;
  myPoints: number;
  myRank?: number;
  status: CompetitionStatus;
  action: MyCompetitionAction;
}

export interface FantasyHomeData {
  summary: MyFantasySummary | null;
  myCompetitions: MyCompetitionEntry[];
  availableCompetitions: FantasyCompetition[];
}

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */

const AVAILABLE_COMPETITIONS: FantasyCompetition[] = [
  // Football
  {
    id: 'fb-premier',
    name: 'Uganda Fantasy Premier',
    sport: 'football',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Gameweek 3',
    participants: 48200,
    entryType: 'public',
    prize: 'UGX 20,000,000',
  },
  {
    id: 'fb-startimes',
    name: 'StarTimes Uganda Cup Fantasy',
    sport: 'football',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Gameweek 3',
    participants: 15600,
    entryType: 'public',
    prize: 'UGX 5,000,000',
  },
  {
    id: 'fb-office',
    name: 'Kampala Office League',
    sport: 'football',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Gameweek 3',
    participants: 32,
    entryType: 'private',
    prize: 'Bragging rights + trophy',
  },
  // Rugby
  {
    id: 'rg-nile',
    name: 'Nile Rugby Challenge',
    sport: 'rugby',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Round 4',
    participants: 12800,
    entryType: 'public',
    prize: 'UGX 6,000,000',
  },
  {
    id: 'rg-sevens',
    name: 'Uganda Sevens Fantasy',
    sport: 'rugby',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Round 4',
    participants: 7600,
    entryType: 'public',
    prize: 'UGX 1,500,000',
  },
  {
    id: 'rg-clubhouse',
    name: 'Kampala Rugby Clubhouse',
    sport: 'rugby',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Round 4',
    participants: 24,
    entryType: 'private',
    prize: 'Trophy + pride',
  },
  // Basketball
  {
    id: 'bb-elite',
    name: 'Kampala Basketball Elite',
    sport: 'basketball',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Week 5',
    participants: 21300,
    entryType: 'public',
    prize: 'UGX 8,000,000',
  },
  {
    id: 'bb-nbl-rising',
    name: 'NBL Fantasy Rising',
    sport: 'basketball',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Week 5',
    participants: 9400,
    entryType: 'public',
    prize: 'UGX 2,000,000',
  },
  {
    id: 'bb-friends',
    name: 'Uganda Basketball Friends League',
    sport: 'basketball',
    season: '2026 Season',
    status: 'open',
    startDate: '2026-06-01',
    currentGameweek: 'Week 5',
    participants: 20,
    entryType: 'private',
    prize: 'Season jacket',
  },
];

const MY_COMPETITIONS: MyCompetitionEntry[] = [
  {
    competitionId: 'fb-premier',
    name: 'Uganda Fantasy Premier',
    sport: 'football',
    season: '2026 Season',
    currentGameweek: 'Gameweek 3',
    participants: 48200,
    myPoints: 183,
    myRank: 6,
    status: 'open',
    action: 'manage-team',
  },
  {
    competitionId: 'fb-office',
    name: 'Kampala Office League',
    sport: 'football',
    season: '2026 Season',
    currentGameweek: 'Gameweek 3',
    participants: 32,
    myPoints: 0,
    status: 'open',
    action: 'create-squad',
  },
];

const SUMMARY: MyFantasySummary = {
  totalPoints: 183,
  overallRank: 6,
  competitionsJoined: MY_COMPETITIONS.length,
  currentGameweek: 'Gameweek 3',
  upcomingDeadline: 'Sat, 15 Aug · 18:30',
};

/* ------------------------------------------------------------------ */
/* Service functions                                                   */
/* ------------------------------------------------------------------ */

export async function fetchFantasyHomeData(): Promise<FantasyHomeData> {
  return delay({
    summary: { ...SUMMARY },
    myCompetitions: MY_COMPETITIONS.map((c) => ({ ...c })),
    availableCompetitions: AVAILABLE_COMPETITIONS.map((c) => ({ ...c })),
  });
}