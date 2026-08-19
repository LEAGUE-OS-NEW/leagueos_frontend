// ---------------------------------------------------------------------------
// League OS Fantasy — Fan app type definitions
// ---------------------------------------------------------------------------

export type Sport = 'football' | 'basketball' | 'rugby';

export type PositionGroup =
  // football
  | 'GK' | 'DEF' | 'MID' | 'FWD'
  // basketball
  | 'PG' | 'SG' | 'SF' | 'PF' | 'C'
  // rugby (15s)
  | 'FR' | 'LK' | 'BR' | 'HB' | 'CT' | 'B3';

export type PlayerStatus = 'ready' | 'doubtful' | 'injured' | 'suspended' | 'unavailable';

export interface Player {
  id: string;
  name: string;
  club: string;
  clubShort: string;
  clubColor: string; // hex, used for avatar + jersey chip
  photo?: string;    // optional URL — rendered in the circle when present
  sport: Sport;
  position: PositionGroup;
  positionLabel: string;
  price: number; // in "M" fantasy currency
  form: number | null;
  totalPoints: number | null;
  gwPoints: number | null;
  ownership: number | null;
  status: PlayerStatus;
  statusNote?: string;
  /** Whether the player is eligible for selection (from Admin Player Pool). */
  eligible?: boolean;
}

export interface SportRules {
  sport: Sport;
  label: string;
  budget: number;
  squadSize: number;
  startersCount: number;
  maxPerClub: number;
  positionGroups: { group: PositionGroup; label: string; squadCount: number; starterMin: number; starterMax: number }[];
  pitchStyle: 'grass' | 'court' | 'rugby';
  multiplierLabel: string; // "Captain" / "Star Player"
}

import type { FantasyCompetition, FantasyTeamScore } from '../../../services/fantasyService';

export interface Competition {
  id: string;
  sport: Sport;
  name: string;
  shortName: string;
  season: string;
  currentGameweek: number;
  totalGameweeks: number;
  entries: number;
  status: 'upcoming' | 'active' | 'draft';
  deadline: string; // display string
  deadlineISO: string;
  description: string;
  api: FantasyCompetition;
}

export interface SquadSlot {
  playerId: string;
  isStarter: boolean;
  benchOrder?: number;
}

export interface FantasyTeam {
  id: string;
  competitionId: string;
  teamName: string;
  managerName: string;
  budgetRemaining: number;
  squad: SquadSlot[];
  captainId: string | null;
  viceCaptainId: string | null;
  freeTransfers: number;
  totalPoints: number;
  gwPoints: number;
  overallRank: number | null;
  submitted: boolean;
  score?: FantasyTeamScore;
  competition?: Competition;
}

export interface MiniLeague {
  id: string;
  name: string;
  type: 'private' | 'public' | 'supporter';
  sport: Sport;
  memberCount: number;
  code?: string;
  yourRank: number;
  standings: { rank: number; manager: string; teamName: string; gwPoints: number; totalPoints: number }[];
}

export type GameweekState =
  | 'not_entered'
  | 'team_incomplete'
  | 'submitted'
  | 'open'
  | 'locked'
  | 'scoring'
  | 'under_review'
  | 'final';

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'warning';
}
