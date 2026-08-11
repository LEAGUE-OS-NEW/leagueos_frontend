import React, { useEffect, useMemo, useState } from 'react';

import {
  fetchFantasyLeagues,
  fetchFantasyPlayers,
  type Player,
  type Competition,
  type Sport,
} from '../../../services/fantasyAdminService';
import SportFilter from './section/SportFilter';
import CompetitionCard from './section/CompetitionCard';
import PlayerRow from './section/PlayerRow';
import StandingsTable from './section/StandingsTable';
import LineupSurface from './section/LineupSurface';
import { FORMATIONS, type FormationId } from './section/formations';
import GameweekHub, { type Fixture, type LeagueSeason } from './section/GameweekHub';
import LivePointsPanel from './section/LivePointsPanel';
import CreateLeagueModal, { type NewLeagueDetails } from './section/CreateLeagueModal';
import MyLeaguesPanel, { type JoinedLeagueRecord } from './section/MyLeaguesPanel';
import FantasyNotifications, { type NotificationItem } from './section/FantasyNotifications';
import { applyAutoSubstitutions, applyViceCaptainFallback } from './section/lineupUtils';
import Sidebar from '../../../components/fan/Sidebar';
import Footer from '../../../components/landing/Footer';
import './FantasyCompetitions.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

// Player/Competition/Sport now live in fantasyAdminService.ts — the shared
// mock data source for both this fan page and the admin Fantasy section.
// Re-exported here so every ./section/*.tsx file's existing
// `import type { Player } from '../FantasyCompetitions'` keeps working.
export type { Player, Competition, Sport };

export interface StandingEntry {
  rank: number;
  manager: string;
  teamName: string;
  points: number;
  captainPoints: number;
  transferHits: number;
  isCurrentUser?: boolean;
}

export interface ScoringCorrection {
  id: string;
  type: string;
  description: string;
  player: string;
  gameweek: number;
  pointsDelta: number;
}

interface PositionRule {
  name: string;
  min: number;
  max: number;
}

interface SquadRules {
  budget: number;
  squadSize: number;
  startingSize: number;
  positions: PositionRule[];
}

type StepId =
  | 'discover'
  | 'rules'
  | 'join'
  | 'team-setup'
  | 'squad'
  | 'lineup'
  | 'gameweek'
  | 'live-points'
  | 'transfers'
  | 'standings'
  | 'notifications';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const hashId = (id: string): number => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h;
};

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
  ];
  return segments.join('-');
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const ACCENTS: Record<Sport, string> = {
  football: '#22c55e',
  rugby: '#f97316',
  basketball: '#a855f7',
};

const SPORT_LABEL: Record<Sport, string> = {
  football: 'Football',
  rugby: 'Rugby',
  basketball: 'Basketball',
};

const HERO_IMAGE: Record<Sport, string> = {
  football: '/images/vipersvs.jfif',
  rugby: '/images/fantasy1.png',
  basketball: '/images/fantasy1.png',
};

const SQUAD_RULES: Record<Sport, SquadRules> = {
  football: {
    budget: 100,
    squadSize: 8,
    startingSize: 6,
    positions: [
      { name: 'Goalkeepers', min: 1, max: 2 },
      { name: 'Defenders', min: 2, max: 3 },
      { name: 'Midfielders', min: 2, max: 3 },
      { name: 'Forwards', min: 1, max: 2 },
    ],
  },
  rugby: {
    budget: 100,
    squadSize: 8,
    startingSize: 6,
    positions: [
      { name: 'Front Row', min: 1, max: 2 },
      { name: 'Second Row', min: 1, max: 2 },
      { name: 'Back Row', min: 1, max: 2 },
      { name: 'Half Backs', min: 1, max: 1 },
      { name: 'Centres', min: 1, max: 1 },
      { name: 'Back Three', min: 1, max: 1 },
    ],
  },
  basketball: {
    budget: 100,
    squadSize: 7,
    startingSize: 5,
    positions: [
      { name: 'Point Guards', min: 1, max: 2 },
      { name: 'Shooting Guards', min: 1, max: 2 },
      { name: 'Small Forwards', min: 1, max: 2 },
      { name: 'Power Forwards', min: 1, max: 2 },
      { name: 'Centers', min: 1, max: 1 },
    ],
  },
};

const SCORING_EXAMPLES: Record<Sport, { label: string; points: string }[]> = {
  football: [
    { label: 'Goal scored (forward)', points: '+5' },
    { label: 'Goal scored (midfielder)', points: '+4' },
    { label: 'Assist', points: '+3' },
    { label: 'Clean sheet (defender / GK)', points: '+4' },
    { label: 'Yellow card', points: '-1' },
    { label: 'Red card', points: '-3' },
  ],
  rugby: [
    { label: 'Try scored', points: '+8' },
    { label: 'Conversion or penalty kick', points: '+2' },
    { label: 'Defensive turnover won', points: '+3' },
    { label: 'Missed tackle', points: '-1' },
    { label: 'Yellow card', points: '-2' },
  ],
  basketball: [
    { label: '20+ point game', points: '+8' },
    { label: 'Double-double', points: '+6' },
    { label: 'Steal or block', points: '+2' },
    { label: 'Rebound haul', points: '+3' },
    { label: 'Turnover', points: '-1' },
  ],
};

const SEASON: LeagueSeason = {
  currentGameweek: 3,
  totalGameweeks: 30,
  transferWindowOpen: true,
  deadline: '2026-08-10T18:30:00Z',
  seasonStart: '2026-06-01',
  seasonEnd: '2027-03-15',
};

const FIXTURES: Record<Sport, Fixture[]> = {
  football: [
    { home: 'KCCA FC', away: 'Vipers SC', status: 'LIVE' },
    { home: 'SC Villa', away: 'BUL FC', status: '18:00' },
    { home: 'URA FC', away: 'NEC FC', status: 'Tomorrow' },
  ],
  basketball: [
    { home: 'City Oilers', away: 'Namuwongo Blazers', status: 'LIVE' },
    { home: 'KIU Titans', away: 'UCU Canons', status: '18:00' },
    { home: 'JT Jaguars', away: 'Rezlife Saints', status: 'Tomorrow' },
  ],
  rugby: [
    { home: 'Heathens RFC', away: 'Kobs RFC', status: 'LIVE' },
    { home: 'Pirates RFC', away: 'Buffaloes RFC', status: '18:00' },
    { home: 'Rhinos RFC', away: 'Mongers RFC', status: 'Tomorrow' },
  ],
};

// PLAYERS/COMPETITIONS/PLAYERS_BY_ID moved to fantasyAdminService.ts (see
// the players/competitions state fetched below) so the admin Fantasy
// section can add to the same data fans actually see.
const STANDINGS: Record<Sport, StandingEntry[]> = {
  football: [
    { rank: 1, manager: 'Merab Apio', teamName: 'Kampala Strikers', points: 214, captainPoints: 24, transferHits: 0 },
    { rank: 2, manager: 'Brian Kato', teamName: 'Vipers Elite', points: 208, captainPoints: 22, transferHits: 4 },
    { rank: 3, manager: 'Aisha Namusoke', teamName: 'Villa Queens', points: 205, captainPoints: 20, transferHits: 0 },
    { rank: 4, manager: 'Ronald Mugisha', teamName: 'KCCA Warriors', points: 198, captainPoints: 18, transferHits: 0 },
    { rank: 5, manager: 'Sarah Nabirye', teamName: 'URA Titans', points: 191, captainPoints: 16, transferHits: 8 },
    { rank: 6, manager: 'You', teamName: 'My Team', points: 183, captainPoints: 14, transferHits: 0, isCurrentUser: true },
  ],
  rugby: [
    { rank: 1, manager: 'Kenneth Otim', teamName: 'Heathens Loyal', points: 194, captainPoints: 26, transferHits: 0 },
    { rank: 2, manager: 'Patricia Namuli', teamName: 'Kobs Faithful', points: 188, captainPoints: 24, transferHits: 0 },
    { rank: 3, manager: 'Michael Ouma', teamName: 'Pirates Crew', points: 181, captainPoints: 22, transferHits: 2 },
    { rank: 4, manager: 'Caroline Nabbanja', teamName: 'Buffaloes United', points: 174, captainPoints: 20, transferHits: 0 },
    { rank: 5, manager: 'Joel Wasswa', teamName: 'Rhinos Rising', points: 167, captainPoints: 18, transferHits: 4 },
    { rank: 6, manager: 'You', teamName: 'My Team', points: 159, captainPoints: 16, transferHits: 0, isCurrentUser: true },
  ],
  basketball: [
    { rank: 1, manager: 'David Ibrahim', teamName: 'Oilers Nation', points: 612, captainPoints: 40, transferHits: 0 },
    { rank: 2, manager: 'Grace Nantongo', teamName: 'Blazers United', points: 598, captainPoints: 38, transferHits: 0 },
    { rank: 3, manager: 'Wilson Ssali', teamName: 'Titans Squad', points: 585, captainPoints: 36, transferHits: 4 },
    { rank: 4, manager: 'Esther Alupo', teamName: 'Canons Crew', points: 571, captainPoints: 32, transferHits: 0 },
    { rank: 5, manager: 'George Ntege', teamName: 'Jaguars Fantasy', points: 558, captainPoints: 30, transferHits: 8 },
    { rank: 6, manager: 'You', teamName: 'My Team', points: 541, captainPoints: 26, transferHits: 0, isCurrentUser: true },
  ],
};

const CORRECTIONS: Record<Sport, ScoringCorrection[]> = {
  football: [
    { id: 'fc1', type: 'assist', description: 'Assist awarded to E. Ojok after review of the build-up to the winning goal.', player: 'Emmanuel Ojok', gameweek: 2, pointsDelta: 3 },
    { id: 'fc2', type: 'goal', description: 'Own goal previously credited to R. Ssekitoleko removed after review confirmed a deflection off the striker.', player: 'Ronald Ssekitoleko', gameweek: 2, pointsDelta: 2 },
    { id: 'fc3', type: 'tackle', description: 'Tackle count corrected for H. Achiro after a match-data reconciliation.', player: 'Herbert Achiro', gameweek: 1, pointsDelta: 1 },
    { id: 'fc4', type: 'bonus', description: 'Bonus points recalculated for Y. Nsibambi using the final possession-adjusted model.', player: 'Yusuf Nsibambi', gameweek: 1, pointsDelta: -1 },
  ],
  rugby: [
    { id: 'rc1', type: 'turnover', description: 'Turnover count corrected for I. Businge after review of ruck contests.', player: 'Ivan Businge', gameweek: 3, pointsDelta: -2 },
    { id: 'rc2', type: 'tackle', description: 'Missed tackle previously logged against M. Kirunda has been removed.', player: 'Moses Kirunda', gameweek: 3, pointsDelta: 2 },
    { id: 'rc3', type: 'bonus', description: 'Bonus points recalculated for K. Ivan using the metres-carried model.', player: 'Kato Ivan', gameweek: 2, pointsDelta: 3 },
    { id: 'rc4', type: 'card', description: 'Yellow card downgraded to a penalty warning for P. Byaruhanga after citing commissioner review.', player: 'Patrick Byaruhanga', gameweek: 2, pointsDelta: 1 },
  ],
  basketball: [
    { id: 'bc1', type: 'stat', description: 'Assist total corrected for J. Mugisha after box-score reconciliation.', player: 'Joel Mugisha', gameweek: 4, pointsDelta: 2 },
    { id: 'bc2', type: 'foul', description: 'Technical foul rescinded for I. Bogere following league office review.', player: 'Isaac Bogere', gameweek: 4, pointsDelta: 1 },
    { id: 'bc3', type: 'turnover', description: 'Turnover count corrected for M. Ariko after review of scorer’s table footage.', player: 'Milton Ariko', gameweek: 3, pointsDelta: -1 },
    { id: 'bc4', type: 'bonus', description: 'Bonus points recalculated for C. Odongo using the double-double model.', player: 'Charles Odongo', gameweek: 3, pointsDelta: 2 },
  ],
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', type: 'deadline', message: 'Deadline in 2 hours for Gameweek 3 — lock in your lineup.', read: false, timestamp: '10m ago' },
  { id: 'n2', type: 'injury', message: 'Herbert Ssali has been ruled out for this gameweek.', read: false, timestamp: '1h ago' },
  { id: 'n3', type: 'captain-scored', message: 'Your captain scored 12 points in Gameweek 2.', read: true, timestamp: 'Yesterday' },
  { id: 'n4', type: 'invite', message: 'You received an invite to "Kampala Office League".', read: false, timestamp: 'Yesterday' },
  { id: 'n5', type: 'correction', message: 'A scoring correction was applied to Emmanuel Ojok’s Gameweek 2 points.', read: true, timestamp: '2 days ago' },
  { id: 'n6', type: 'transfer', message: 'Your transfer of Kenneth Ochen was confirmed.', read: true, timestamp: '2 days ago' },
  { id: 'n7', type: 'suspension', message: 'Moses Kigongo is suspended and unavailable for selection.', read: false, timestamp: '3 days ago' },
];

const STEPS: { id: StepId; label: string; requiresJoin: boolean; requiresTeamSetup: boolean }[] = [
  { id: 'discover', label: '1 · Discover', requiresJoin: false, requiresTeamSetup: false },
  { id: 'rules', label: '2 · Rules', requiresJoin: false, requiresTeamSetup: false },
  { id: 'join', label: '3 · Join', requiresJoin: false, requiresTeamSetup: false },
  { id: 'team-setup', label: '4 · Team Setup', requiresJoin: true, requiresTeamSetup: false },
  { id: 'squad', label: '5 · Squad', requiresJoin: true, requiresTeamSetup: true },
  { id: 'lineup', label: '6 · Lineup', requiresJoin: true, requiresTeamSetup: true },
  { id: 'gameweek', label: '7 · Gameweek', requiresJoin: true, requiresTeamSetup: true },
  { id: 'live-points', label: '8 · Live Points', requiresJoin: true, requiresTeamSetup: true },
  { id: 'transfers', label: '9 · Transfers', requiresJoin: true, requiresTeamSetup: true },
  { id: 'standings', label: '10 · Standings', requiresJoin: true, requiresTeamSetup: true },
  { id: 'notifications', label: '11 · Notifications', requiresJoin: false, requiresTeamSetup: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FantasyCompetitions: React.FC = () => {
  const [sport, setSport] = useState<Sport>('football');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>('discover');
  const [customCompetitions, setCustomCompetitions] = useState<Competition[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchFantasyLeagues().then((result) => {
      if (!cancelled) setCompetitions(result);
    });
    fetchFantasyPlayers().then((result) => {
      if (!cancelled) setPlayers(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  // Read invite code from URL query params (e.g. /fantasy/join?code=ABC-1234)
  const [urlInviteCode] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('code') || '';
    } catch {
      return '';
    }
  });
  // Deep-link straight into a specific league from search (e.g.
  // /fan/fantasy?league=fb-premier) — resolved once the leagues have loaded.
  const [urlLeagueId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('league') || '';
    } catch {
      return '';
    }
  });
  // Pre-fill invite code + open the private-join form if the URL carries a code.
  const [privateOpen, setPrivateOpen] = useState<boolean>(!!urlInviteCode);
  const [inviteCode, setInviteCode] = useState<string>(urlInviteCode);
  const [joinError, setJoinError] = useState('');
  const [myLeagues, setMyLeagues] = useState<JoinedLeagueRecord[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<{
    name: string;
    inviteCode: string;
    inviteLink: string;
  } | null>(null);

  const [teamName, setTeamName] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [teamAvatar, setTeamAvatar] = useState<string | null>(null);
  const [teamSetupComplete, setTeamSetupComplete] = useState(false);

  const [squadIds, setSquadIds] = useState<Set<string>>(new Set());
  const [squadError, setSquadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Track previous squad/starting values for render-phase bench-order sync.
  const [prevSquadPlayers, setPrevSquadPlayers] = useState<Player[]>([]);
  const [prevStartingIds, setPrevStartingIds] = useState<Set<string>>(new Set());

  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const [startingIds, setStartingIds] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceId, setViceId] = useState<string | null>(null);
  const [lineupError, setLineupError] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [benchOrder, setBenchOrder] = useState<string[]>([]);

  const [minutesPlayed, setMinutesPlayed] = useState<Record<string, number>>({});
  const [simulated, setSimulated] = useState(false);

  const [freeTransfers, setFreeTransfers] = useState(1);
  const [transferHits, setTransferHits] = useState(0);
  const [transferOutId, setTransferOutId] = useState<string | null>(null);
  const [pendingTransferInId, setPendingTransferInId] = useState<string | null>(null);
  const [transferMessage, setTransferMessage] = useState('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const accent = ACCENTS[sport];
  const rules = SQUAD_RULES[sport];

  const competitionsForSport = useMemo(
    () => [...competitions, ...customCompetitions].filter((c) => c.sport === sport),
    [sport, competitions, customCompetitions]
  );
  const playersForSport = useMemo(() => players.filter((p) => p.sport === sport), [players, sport]);
  const selectedCompetition = useMemo(
    () => [...competitions, ...customCompetitions].find((c) => c.id === selectedCompetitionId) ?? null,
    [selectedCompetitionId, competitions, customCompetitions]
  );
  const joinedLeague = useMemo(
    () => myLeagues.find((l) => l.competitionId === selectedCompetitionId) ?? null,
    [myLeagues, selectedCompetitionId]
  );

  const canAccessStep = (targetStep: StepId): boolean => {
    const meta = STEPS.find((s) => s.id === targetStep);
    if (!meta) return false;
    if (meta.requiresJoin && !joinedLeague) return false;
    if (meta.requiresTeamSetup && !teamSetupComplete) return false;
    return true;
  };

  // Reset the whole downstream flow whenever the sport changes.
  const handleSportChange = (next: Sport) => {
    if (next === sport) return;
    setSport(next);
    setSelectedCompetitionId(null);
    setStep('discover');
    resetJoinAndSquadState();
  };

  const resetJoinAndSquadState = () => {
    setPrivateOpen(false);
    setInviteCode('');
    setJoinError('');
    setCreatedLeague(null);
    setTeamSetupComplete(false);
    setTeamName('');
    setFavoriteClub('');
    setTeamAvatar(null);
    setSquadIds(new Set());
    setSquadError('');
    setSaveMessage('');
    setFormation('4-3-3');
    setStartingIds(new Set());
    setCaptainId(null);
    setViceId(null);
    setLineupError('');
    setSelectedPlayerId(null);
    setBenchOrder([]);
    setMinutesPlayed({});
    setSimulated(false);
    setFreeTransfers(1);
    setTransferHits(0);
    setTransferOutId(null);
    setPendingTransferInId(null);
    setTransferMessage('');
    setShowTransferConfirm(false);
  };

  const handleSelectCompetition = (id: string) => {
    if (id !== selectedCompetitionId) {
      resetJoinAndSquadState();
    }
    setSelectedCompetitionId(id);
    setStep('rules');
  };

  useEffect(() => {
    if (!urlLeagueId) return;
    const match = competitions.find((c) => c.id === urlLeagueId);
    if (match) {
      // competitions loads asynchronously (see the fetch effect above), so
      // this can only run once that external data actually arrives — not
      // expressible as a plain useState initializer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSport(match.sport);
      handleSelectCompetition(match.id);
    }
    // Only re-run once the leagues have actually loaded — urlLeagueId is
    // fixed at mount, mirroring the invite-code pattern above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLeagueId, competitions]);

  /* ---------------------------- Join flow ---------------------------- */

  const addOrUpdateMyLeague = (record: JoinedLeagueRecord) => {
    setMyLeagues((prev) => [...prev.filter((l) => l.competitionId !== record.competitionId), record]);
  };

  const joinPublic = () => {
    if (!selectedCompetition) return;
    addOrUpdateMyLeague({
      competitionId: selectedCompetition.id,
      sport: selectedCompetition.sport,
      name: selectedCompetition.name,
      members: selectedCompetition.managers,
      rank: 40 + (hashId(selectedCompetition.id) % 400),
      totalPoints: 140 + (hashId(selectedCompetition.id) % 120),
      gameweekLabel: selectedCompetition.gameweek,
    });
    setJoinError('');
    setPrivateOpen(false);
    setStep('team-setup');
  };

  const submitInviteCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) return;
    const code = inviteCode.trim();
    if (code.length < 5) {
      setJoinError('Enter a valid invitation code (at least 5 characters).');
      return;
    }
    setJoinError('');
    addOrUpdateMyLeague({
      competitionId: selectedCompetition.id,
      sport: selectedCompetition.sport,
      name: `${selectedCompetition.name} · Private`,
      members: Math.floor(18 + Math.random() * 40),
      code: code.toUpperCase(),
      rank: 1 + (hashId(selectedCompetition.id + code) % 20),
      totalPoints: 120 + (hashId(selectedCompetition.id + code) % 90),
      gameweekLabel: selectedCompetition.gameweek,
    });
    setPrivateOpen(false);
    setStep('team-setup');
  };

  const handleCreateLeague = (details: NewLeagueDetails) => {
    const id = `custom-${details.sport}-${Date.now()}`;
    const newCompetition: Competition = {
      id,
      sport: details.sport,
      name: details.name,
      image: HERO_IMAGE[details.sport],
      entryType: details.isPrivate ? 'private' : 'public',
      managers: 1,
      prizePool: details.entryFee ? `Entry fee ${details.entryFee}` : 'Bragging rights',
      gameweek: `Gameweek ${SEASON.currentGameweek} · Just created`,
      rulesSummary: `Custom league · up to ${details.maxManagers} managers · ${details.seasonLength}-gameweek season.`,
    };
    setCustomCompetitions((prev) => [...prev, newCompetition]);
    if (details.sport !== sport) {
      setSport(details.sport);
      resetJoinAndSquadState();
    }
    setSelectedCompetitionId(id);

    // Generate invite code ONCE at creation time and store it.
    // Do NOT regenerate on re-renders.
    const inviteCode = generateInviteCode();
    const inviteLink = `${window.location.origin}/fantasy/join?code=${inviteCode}`;

    addOrUpdateMyLeague({
      competitionId: id,
      sport: details.sport,
      name: newCompetition.name,
      members: 1,
      code: inviteCode,
      rank: 1,
      totalPoints: 0,
      gameweekLabel: newCompetition.gameweek,
    });

    setCreatedLeague({
      name: newCompetition.name,
      inviteCode,
      inviteLink,
    });

    setCreateModalOpen(false);
    // CRITICAL FIX: Stay on the 'join' step so the success screen renders.
    // Do NOT setStep('team-setup') here — the user must first see the
    // invite code/link success screen and explicitly click "Continue to Team Setup".
    setStep('join');
  };

  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const copyInviteCode = async () => {
    if (createdLeague) {
      try {
        await navigator.clipboard.writeText(createdLeague.inviteCode);
        setCopiedFeedback('code');
        setTimeout(() => setCopiedFeedback(null), 2000);
      } catch {
        setCopiedFeedback(null);
      }
    }
  };

  const copyInviteLink = async () => {
    if (createdLeague) {
      try {
        await navigator.clipboard.writeText(createdLeague.inviteLink);
        setCopiedFeedback('link');
        setTimeout(() => setCopiedFeedback(null), 2000);
      } catch {
        setCopiedFeedback(null);
      }
    }
  };

  const shareInvite = async () => {
    if (!createdLeague) return;
    const shareData = {
      title: createdLeague.name,
      text: `Join my fantasy league: ${createdLeague.inviteCode}`,
      url: createdLeague.inviteLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — fall back to copying the link.
        try {
          await navigator.clipboard.writeText(createdLeague.inviteLink);
          setCopiedFeedback('link');
          setTimeout(() => setCopiedFeedback(null), 2000);
        } catch {
          // Clipboard also unavailable — do nothing.
        }
      }
    } else {
      // Web Share API not supported — fall back to copying the link.
      try {
        await navigator.clipboard.writeText(createdLeague.inviteLink);
        setCopiedFeedback('link');
        setTimeout(() => setCopiedFeedback(null), 2000);
      } catch {
        // Clipboard unavailable — do nothing.
      }
    }
  };

  const handleTeamSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      return;
    }
    setTeamSetupComplete(true);
    setStep('squad');
  };

  const handleMyLeagueQuickAction = (
    league: JoinedLeagueRecord,
    action: 'lineup' | 'transfers' | 'standings'
  ) => {
    if (league.sport !== sport) {
      setSport(league.sport);
      resetJoinAndSquadState();
    }
    setSelectedCompetitionId(league.competitionId);
    setStep(action);
  };

  /* --------------------------- Squad flow ----------------------------- */

  const squadPlayers = useMemo(
    () => playersForSport.filter((p) => squadIds.has(p.id)),
    [playersForSport, squadIds]
  );
  const budgetUsed = useMemo(() => squadPlayers.reduce((sum, p) => sum + p.price, 0), [squadPlayers]);
  const budgetRemaining = Math.max(rules.budget - budgetUsed, 0);

  const countInPosition = (positionName: string) =>
    squadPlayers.filter((p) => p.position === positionName).length;

  const positionStatus = rules.positions.map((pos) => ({
    ...pos,
    count: countInPosition(pos.name),
  }));

  const squadValid =
    squadIds.size === rules.squadSize &&
    budgetUsed <= rules.budget &&
    positionStatus.every((pos) => pos.count >= pos.min);

  const toggleSquadPlayer = (playerId: string) => {
    const player = playersForSport.find((p) => p.id === playerId);
    if (!player) return;
    setSaveMessage('');

    if (squadIds.has(playerId)) {
      const next = new Set(squadIds);
      next.delete(playerId);
      setSquadIds(next);
      setSquadError('');
      if (startingIds.has(playerId)) {
        const nextStarting = new Set(startingIds);
        nextStarting.delete(playerId);
        setStartingIds(nextStarting);
      }
      if (captainId === playerId) setCaptainId(null);
      if (viceId === playerId) setViceId(null);
      return;
    }

    if (player.status === 'injured' || player.status === 'suspended') {
      setSquadError(`${player.name} is ${player.status} and cannot be selected.`);
      return;
    }
    if (squadIds.size >= rules.squadSize) {
      setSquadError(`Your squad is full (${rules.squadSize} players). Remove someone first.`);
      return;
    }
    if (budgetUsed + player.price > rules.budget) {
      setSquadError('Not enough budget remaining for that player.');
      return;
    }
    const posRule = rules.positions.find((p) => p.name === player.position);
    if (posRule && countInPosition(player.position) >= posRule.max) {
      setSquadError(`You already have the maximum number of ${player.position}.`);
      return;
    }
    setSquadError('');
    setSquadIds(new Set(squadIds).add(playerId));
  };

  const saveTeam = () => {
    if (!squadValid) return;
    setSaveMessage('Squad saved. Head to Lineup to pick your starting team and captain.');
  };

  /* --------------------------- Lineup flow ----------------------------- */

  const startingPlayers = useMemo(
    () => squadPlayers.filter((p) => startingIds.has(p.id)),
    [squadPlayers, startingIds]
  );

  // Keep the bench order in sync with squad/starting changes without
  // discarding the fan's existing ordering.
  // React-sanctioned "adjusting state during render" pattern — not an effect.
  if (squadPlayers !== prevSquadPlayers || startingIds !== prevStartingIds) {
    setPrevSquadPlayers(squadPlayers);
    setPrevStartingIds(startingIds);
    const benchSet = new Set(squadPlayers.filter((p) => !startingIds.has(p.id)).map((p) => p.id));
    const kept = benchOrder.filter((id) => benchSet.has(id));
    const missing = Array.from(benchSet).filter((id) => !kept.includes(id));
    const next = [...kept, ...missing];
    if (next.length !== benchOrder.length || next.some((id, i) => id !== benchOrder[i])) {
      setBenchOrder(next);
    }
  }

  // Clear the selected player when the user leaves the lineup step.
  // React-sanctioned "adjusting state during render" pattern — not an effect.
  if (step !== 'lineup' && selectedPlayerId !== null) {
    setSelectedPlayerId(null);
  }

  const toggleStarting = (playerId: string) => {
    setLineupError('');
    if (startingIds.has(playerId)) {
      const next = new Set(startingIds);
      next.delete(playerId);
      setStartingIds(next);
      if (captainId === playerId) setCaptainId(null);
      if (viceId === playerId) setViceId(null);
      if (selectedPlayerId === playerId) setSelectedPlayerId(null);
      return;
    }
    if (startingIds.size >= rules.startingSize) {
      setLineupError(`You can only start ${rules.startingSize} players.`);
      return;
    }
    setStartingIds(new Set(startingIds).add(playerId));
  };

  const chooseCaptain = (playerId: string) => {
    if (!startingIds.has(playerId)) return;
    if (viceId === playerId) setViceId(null);
    setCaptainId(playerId);
  };

  const chooseVice = (playerId: string) => {
    if (!startingIds.has(playerId) || playerId === captainId) return;
    setViceId(playerId);
  };

  const lineupValid = startingIds.size === rules.startingSize && !!captainId && !!viceId;

  const handlePitchPlayerClick = (playerId: string) => {
    setSelectedPlayerId((prev) => (prev === playerId ? null : playerId));
  };

  const selectedPlayer = selectedPlayerId ? squadPlayers.find((p) => p.id === selectedPlayerId) ?? null : null;

  const moveBenchPlayer = (playerId: string, direction: -1 | 1) => {
    setBenchOrder((prev) => {
      const idx = prev.indexOf(playerId);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  const handleSimulateGameweek = () => {
    if (startingIds.size === 0) return;
    const ids = Array.from(startingIds);
    const nextMinutes: Record<string, number> = {};
    ids.forEach((id, idx) => {
      nextMinutes[id] = idx === 0 && ids.length > 2 ? 0 : 90;
    });
    const subbedStarting = applyAutoSubstitutions(startingIds, benchOrder, nextMinutes, playersById);
    const fallback = applyViceCaptainFallback(captainId, viceId, nextMinutes);
    setStartingIds(subbedStarting);
    setCaptainId(fallback.captainId);
    setViceId(fallback.viceId);
    setMinutesPlayed(nextMinutes);
    setSimulated(true);
  };

  /* -------------------------- Transfers flow ---------------------------- */

  const transferCandidates = playersForSport.filter((p) => !squadIds.has(p.id));

  const selectTransferIn = (inId: string) => {
    if (!transferOutId) {
      setTransferMessage('Select a player to transfer out first.');
      return;
    }
    const inPlayer = playersForSport.find((p) => p.id === inId);
    if (inPlayer && (inPlayer.status === 'injured' || inPlayer.status === 'suspended')) {
      setTransferMessage(`${inPlayer.name} is ${inPlayer.status} and cannot be brought in.`);
      return;
    }
    setTransferMessage('');
    setPendingTransferInId(inId);
    setShowTransferConfirm(true);
  };

  const cancelPendingTransfer = () => {
    setTransferOutId(null);
    setPendingTransferInId(null);
    setShowTransferConfirm(false);
  };

  const finalizeTransfer = () => {
    if (!transferOutId || !pendingTransferInId) return;
    const outPlayer = playersForSport.find((p) => p.id === transferOutId);
    const inPlayer = playersForSport.find((p) => p.id === pendingTransferInId);
    if (!outPlayer || !inPlayer) return;

    const newBudgetUsed = budgetUsed - outPlayer.price + inPlayer.price;
    if (newBudgetUsed > rules.budget) {
      setTransferMessage('That transfer would exceed your 100.0 credit budget.');
      return;
    }

    const nextSquad = new Set(squadIds);
    nextSquad.delete(outPlayer.id);
    nextSquad.add(inPlayer.id);
    setSquadIds(nextSquad);

    if (startingIds.has(outPlayer.id)) {
      const nextStarting = new Set(startingIds);
      nextStarting.delete(outPlayer.id);
      nextStarting.add(inPlayer.id);
      setStartingIds(nextStarting);
    }
    if (captainId === outPlayer.id) setCaptainId(null);
    if (viceId === outPlayer.id) setViceId(null);

    if (freeTransfers > 0) {
      setFreeTransfers(freeTransfers - 1);
      setTransferMessage(`Transferred ${outPlayer.name} → ${inPlayer.name} using a free transfer.`);
    } else {
      setTransferHits(transferHits + 4);
      setTransferMessage(`Transferred ${outPlayer.name} → ${inPlayer.name} for a -4 point hit.`);
    }
    setTransferOutId(null);
    setPendingTransferInId(null);
    setShowTransferConfirm(false);
  };

  /* ------------------------------ Notifications --------------------------- */

  const toggleNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const goToStep = (id: StepId) => {
    if (!canAccessStep(id)) {
      if (!joinedLeague) {
        setStep('join');
        return;
      }
      if (!teamSetupComplete) {
        setStep('team-setup');
        return;
      }
    }
    setStep(id);
  };

  const rankChange = selectedCompetition ? (hashId(selectedCompetition.id) % 2 === 0 ? 12 : -6) : 0;

  return (
    <div className="fh" style={{ ['--accent' as string]: accent }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="fh__topbar">
        
        <div className="fh__brand">
          <span className="fh__brand-mark">FH</span>
          <div>
            <p className="fh__brand-name">Fantasy Hub</p>
            <p className="fh__brand-tag">Build. Captain. Climb the table.</p>
          </div>
        </div>
        <SportFilter active={sport} onChange={handleSportChange} accents={ACCENTS} />
      </header>

      <nav className="fh__steps" aria-label="Fantasy league flow">
        {STEPS.map((s) => {
          const locked = (s.requiresJoin && !joinedLeague) || (s.requiresTeamSetup && !teamSetupComplete);
          return (
            <button
              key={s.id}
              type="button"
              className={`fh__step${step === s.id ? ' fh__step--active' : ''}${locked ? ' fh__step--locked' : ''}`}
              onClick={() => goToStep(s.id)}
              aria-current={step === s.id ? 'step' : undefined}
              disabled={locked}
            >
              {s.label}
              {locked && <span className="fh__lock" aria-hidden="true">🔒</span>}
            </button>
          );
        })}
      </nav>

      {(step === 'squad' || step === 'lineup' || step === 'transfers' || step === 'gameweek') && joinedLeague && (
        <div className="scoreboard">
          <div className="scoreboard__item">
            <span className="scoreboard__label">Budget left</span>
            <span className="scoreboard__value mono">{budgetRemaining.toFixed(1)}</span>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Squad</span>
            <span className="scoreboard__value mono">
              {squadIds.size}/{rules.squadSize}
            </span>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Starting</span>
            <span className="scoreboard__value mono">
              {startingIds.size}/{rules.startingSize}
            </span>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">Free transfers</span>
            <span className="scoreboard__value mono">{freeTransfers}</span>
          </div>
          <div className="scoreboard__item">
            <span className="scoreboard__label">League</span>
            <span className="scoreboard__value">{joinedLeague.name}</span>
          </div>
        </div>
      )}

      <main className="fh__main">
        {step === 'discover' && (
          <section className="fh__section">
            <MyLeaguesPanel leagues={myLeagues} onQuickAction={handleMyLeagueQuickAction} />

            <div className="hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.35), rgba(6,10,20,0.92)), url(${HERO_IMAGE[sport]})` }}>
              <span className="hero__eyebrow">{SPORT_LABEL[sport]} · Fantasy hub</span>
              <h1 className="hero__title">Pick a competition, build your squad, chase the top of the table.</h1>
              <p className="hero__sub">
                {competitionsForSport.length} {SPORT_LABEL[sport].toLowerCase()} competitions open right now — public
                leaderboards and private invite-only leagues alike.
              </p>
            </div>

            <div className="section-heading">
              <h2>Browse {SPORT_LABEL[sport]} competitions</h2>
              <p>Choose one to see its rules, join, and start building a squad.</p>
            </div>
            <div className="comp-grid">
              {competitionsForSport.map((c) => (
                <CompetitionCard
                  key={c.id}
                  competition={c}
                  accent={accent}
                  isSelected={c.id === selectedCompetitionId}
                  onSelect={handleSelectCompetition}
                />
              ))}
            </div>
          </section>
        )}

        {step === 'rules' && (
          <section className="fh__section">
            {!selectedCompetition ? (
              <EmptyPrompt text="Pick a competition on the Discover tab first." onAction={() => setStep('discover')} actionLabel="Go to Discover" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Rules & scoring — {selectedCompetition.name}</h2>
                  <p>{selectedCompetition.rulesSummary}</p>
                </div>
                <div className="rules-grid">
                  <div className="rules-card">
                    <h3>Squad basics</h3>
                    <ul>
                      <li>
                        Squad size: <strong>{rules.squadSize} players</strong>
                      </li>
                      <li>
                        Starting lineup: <strong>{rules.startingSize} players</strong>
                      </li>
                      <li>
                        Budget limit: <strong>100.0 credits</strong>
                      </li>
                      <li>
                        Captain multiplier: <strong>2x points</strong>, vice-captain steps in if captain doesn't play
                      </li>
                      <li>
                        Transfers: <strong>1 free per gameweek</strong>, extra transfers cost <strong>-4 points</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="rules-card">
                    <h3>Position quotas</h3>
                    <ul>
                      {rules.positions.map((p) => (
                        <li key={p.name}>
                          {p.name}: <strong>{p.min}–{p.max}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rules-card rules-card--wide">
                    <h3>Scoring examples</h3>
                    <table className="scoring-table">
                      <tbody>
                        {SCORING_EXAMPLES[sport].map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td className={`mono ${row.points.startsWith('-') ? 'is-negative' : 'is-positive'}`}>{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button type="button" className="btn btn--primary" onClick={() => setStep('join')}>
                  Continue to join a league →
                </button>
              </>
            )}
          </section>
        )}

        {step === 'join' && (
          <section className="fh__section">
            {!selectedCompetition ? (
              <EmptyPrompt text="Pick a competition on the Discover tab first." onAction={() => setStep('discover')} actionLabel="Go to Discover" />
            ) : createdLeague ? (
              <div className="join-success">
                <h2>🎉 League Created Successfully</h2>
                <p className="join-success__league-name">{createdLeague.name}</p>
                <p className="form-success">Your private league is ready!</p>
                <p className="join-success__desc">
                  Share this code or invite link with friends so they can join your private league.
                </p>
                <div className="invite-code-box">
                  <span className="invite-code-label">Invite Code</span>
                  <div className="invite-code-row">
                    <strong className="mono invite-code-value">{createdLeague.inviteCode}</strong>
                    <button type="button" className="btn btn--ghost" onClick={copyInviteCode}>
                      {copiedFeedback === 'code' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
                <div className="invite-link-box">
                  <span className="invite-code-label">Invite Link</span>
                  <div className="invite-code-row">
                    <span className="invite-link-value mono">{createdLeague.inviteLink}</span>
                    <button type="button" className="btn btn--ghost" onClick={copyInviteLink}>
                      {copiedFeedback === 'link' ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                <div className="squad-footer" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn btn--ghost" onClick={shareInvite}>
                    Share Invite
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => setStep('team-setup')}>
                    Continue to Team Setup →
                  </button>
                </div>
              </div>
            ) : joinedLeague ? (
              <div className="join-success">
                <h2>You're in — {joinedLeague.name}</h2>
                <p>
                  {joinedLeague.members.toLocaleString()} managers{joinedLeague.code ? ` · Invite code ${joinedLeague.code}` : ''}
                </p>
                <h3>Standings preview</h3>
                <ol className="preview-list">
                  {STANDINGS[sport].slice(0, 3).map((entry) => (
                    <li key={entry.rank}>
                      <span className="preview-list__rank">{entry.rank}</span>
                      <span>{entry.teamName}</span>
                      <span className="mono">{entry.points} pts</span>
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn btn--primary" onClick={() => setStep('team-setup')}>
                  Continue to Team Setup →
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <h2>Join {selectedCompetition.name}</h2>
                  <p>Choose public entry, enter an invitation code for a private league, or start your own.</p>
                </div>
                <div className="join-options">
                  <button type="button" className="join-card" onClick={joinPublic}>
                    <span className="join-card__title">Join public league</span>
                    <span className="join-card__desc">Open to everyone. Compete on the main {selectedCompetition.name} leaderboard.</span>
                  </button>
                  <button type="button" className="join-card" onClick={() => setPrivateOpen(true)}>
                    <span className="join-card__title">Join existing private league</span>
                    <span className="join-card__desc">Have an invitation code from a friend or admin? Enter it here.</span>
                  </button>
                  <button type="button" className="join-card" onClick={() => setCreateModalOpen(true)}>
                    <span className="join-card__title">Create a new league</span>
                    <span className="join-card__desc">Start your own public or private {SPORT_LABEL[sport].toLowerCase()} league and invite others.</span>
                  </button>
                </div>
                {privateOpen && (
                  <form className="invite-form" onSubmit={submitInviteCode}>
                    <label htmlFor="invite-code">Invitation code</label>
                    <div className="invite-form__row">
                      <input
                        id="invite-code"
                        type="text"
                        placeholder="e.g. HARBOR24"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        maxLength={16}
                      />
                      <button type="submit" className="btn btn--primary">
                        Join league
                      </button>
                    </div>
                    {joinError && <p className="form-error">{joinError}</p>}
                  </form>
                )}
              </>
            )}
            {createModalOpen && (
              <CreateLeagueModal
                sport={sport}
                sportLabel={SPORT_LABEL[sport]}
                onClose={() => setCreateModalOpen(false)}
                onCreate={handleCreateLeague}
              />
            )}
          </section>
        )}

        {step === 'team-setup' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league before creating your team." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : teamSetupComplete ? (
              <div className="join-success">
                <h2>Team Created!</h2>
                <p>Team: {teamName}</p>
                {favoriteClub && <p>Favorite Club: {favoriteClub}</p>}
                <button type="button" className="btn btn--primary" onClick={() => setStep('squad')}>
                  Continue to Squad Builder →
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <h2>Create Your Team</h2>
                  <p>Set up your fantasy team identity before building your squad.</p>
                </div>
                <form onSubmit={handleTeamSetupSubmit} className="invite-form" style={{ maxWidth: '520px' }}>
                  <label htmlFor="team-name">Team Name *</label>
                  <input
                    id="team-name"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Kampala Strikers FC"
                    maxLength={48}
                    required
                    minLength={3}
                  />
                  <label htmlFor="favorite-club">Favorite Club (optional)</label>
                  <input
                    id="favorite-club"
                    type="text"
                    value={favoriteClub}
                    onChange={(e) => setFavoriteClub(e.target.value)}
                    placeholder="e.g. KCCA FC"
                    maxLength={48}
                  />
                  <label htmlFor="team-avatar">Team Avatar URL (optional)</label>
                  <input
                    id="team-avatar"
                    type="text"
                    value={teamAvatar || ''}
                    onChange={(e) => setTeamAvatar(e.target.value || null)}
                    placeholder="https://example.com/avatar.png"
                  />
                  {teamName.trim().length > 0 && teamName.trim().length < 3 && (
                    <p className="form-error">Team name must be at least 3 characters.</p>
                  )}
                  <div style={{ marginTop: '20px' }}>
                    <button type="submit" className="btn btn--primary" disabled={teamName.trim().length < 3}>
                      Create Team & Continue →
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {step === 'squad' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league before building your squad." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Build your squad</h2>
                  <p>
                    Pick {rules.squadSize} players within a 100.0 credit budget. Injured and suspended players can't be
                    selected. This step is only for choosing who you own — starters, formation and captaincy are set
                    on the Lineup step.
                  </p>
                </div>

                <div className="quota-row">
                  {positionStatus.map((p) => (
                    <span
                      key={p.name}
                      className={`quota-chip${p.count >= p.min ? ' quota-chip--met' : ''}${p.count >= p.max ? ' quota-chip--full' : ''}`}
                    >
                      {p.name}: {p.count}/{p.max}
                    </span>
                  ))}
                </div>

                {squadError && <p className="form-error">{squadError}</p>}

                <div className="position-groups">
                  {rules.positions.map((pos) => (
                    <div className="position-group" key={pos.name}>
                      <h3 className="position-group__header">
                        {pos.name} <span className="position-group__quota">min {pos.min} · max {pos.max}</span>
                      </h3>
                      <div className="player-list">
                        {playersForSport
                          .filter((p) => p.position === pos.name)
                          .map((p) => (
                            <PlayerRow
                              key={p.id}
                              player={p}
                              mode={squadIds.has(p.id) ? 'squad' : 'pick'}
                              selected={squadIds.has(p.id)}
                              actionLabel={squadIds.has(p.id) ? 'Remove' : 'Add'}
                              onAction={toggleSquadPlayer}
                              disabledReason="Not selectable while injured or suspended."
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="squad-footer">
                  <div className="squad-footer__stats">
                    <span>
                      Budget used: <strong className="mono">{budgetUsed.toFixed(1)}</strong>
                    </span>
                    <span>
                      Remaining: <strong className="mono">{budgetRemaining.toFixed(1)}</strong>
                    </span>
                    <span>
                      Players: <strong className="mono">{squadIds.size}/{rules.squadSize}</strong>
                    </span>
                  </div>
                  <button type="button" className="btn btn--primary" disabled={!squadValid} onClick={saveTeam}>
                    Save team
                  </button>
                </div>
                {saveMessage && <p className="form-success">{saveMessage}</p>}
                {saveMessage && (
                  <button type="button" className="btn btn--ghost" onClick={() => setStep('lineup')}>
                    Continue to Lineup →
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {step === 'lineup' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league before setting your lineup." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : squadIds.size < rules.squadSize ? (
              <EmptyPrompt
                text={`Finish building your ${rules.squadSize}-player squad first.`}
                onAction={() => setStep('squad')}
                actionLabel="Go to Squad"
              />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Set your starting lineup</h2>
                  <p>
                    Choose {rules.startingSize} starters from your squad, set your formation, mark a captain (2x
                    points) and a vice-captain, then order your bench.
                  </p>
                </div>

                <div className="deadline-banner">
                  ⏰ Deadline: {SEASON.deadline ? new Date(SEASON.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
                </div>

                <div className="pitch-section">
                  <div className="pitch-section__header">
                    <h3>Starting lineup on the {sport === 'football' ? 'pitch' : sport === 'basketball' ? 'court' : 'field'}</h3>
                    {sport === 'football' && (
                      <div className="formation-select" role="group" aria-label="Choose formation">
                        {(Object.keys(FORMATIONS) as FormationId[]).map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={`chip-btn${formation === id ? ' chip-btn--active' : ''}`}
                            onClick={() => setFormation(id)}
                            aria-pressed={formation === id}
                          >
                            {FORMATIONS[id].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <LineupSurface
                    sport={sport}
                    startingPlayers={startingPlayers}
                    positions={rules.positions}
                    formation={formation}
                    captainId={captainId}
                    viceId={viceId}
                    selectedPlayerId={selectedPlayerId}
                    onPlayerClick={handlePitchPlayerClick}
                  />
                  <p className="pitch-section__hint">Tap a player to view details and lineup actions.</p>

                  {selectedPlayer && (
                    <div className="player-detail">
                      <img className="player-detail__avatar" src={selectedPlayer.image} alt={selectedPlayer.name} />
                      <div className="player-detail__info">
                        <p className="player-detail__name">
                          {selectedPlayer.name}
                          {selectedPlayer.id === captainId && <span className="badge badge--captain">C</span>}
                          {selectedPlayer.id === viceId && <span className="badge badge--vice">V</span>}
                        </p>
                        <p className="player-detail__meta">
                          {selectedPlayer.position} · {selectedPlayer.club}
                          {selectedPlayer.number ? ` · #${selectedPlayer.number}` : ''} · Proj{' '}
                          {selectedPlayer.expectedPoints.toFixed(1)}
                        </p>
                      </div>
                      <div className="player-detail__actions">
                        <button type="button" className="player-row__btn player-row__btn--remove" onClick={() => toggleStarting(selectedPlayer.id)}>
                          Bench
                        </button>
                        <button
                          type="button"
                          className="player-row__btn"
                          disabled={captainId === selectedPlayer.id}
                          onClick={() => chooseCaptain(selectedPlayer.id)}
                        >
                          {captainId === selectedPlayer.id ? 'Captain ✓' : 'Make captain'}
                        </button>
                        <button
                          type="button"
                          className="player-row__btn"
                          disabled={viceId === selectedPlayer.id || captainId === selectedPlayer.id}
                          onClick={() => chooseVice(selectedPlayer.id)}
                        >
                          {viceId === selectedPlayer.id ? 'Vice ✓' : 'Make vice-captain'}
                        </button>
                        <button type="button" className="player-row__btn player-row__btn--ghost" onClick={() => setSelectedPlayerId(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {lineupError && <p className="form-error">{lineupError}</p>}
                <div className="player-list">
                  {squadPlayers.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      mode="starting"
                      selected={startingIds.has(p.id)}
                      isCaptain={captainId === p.id}
                      isVice={viceId === p.id}
                      actionLabel={startingIds.has(p.id) ? 'Bench' : 'Start'}
                      onAction={toggleStarting}
                      secondaryAction={
                        startingIds.has(p.id)
                          ? {
                              label: captainId === p.id ? 'Captain ✓' : 'Make captain',
                              onClick: chooseCaptain,
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
                {startingIds.size === rules.startingSize && (
                  <div className="vice-picker">
                    <h3>Choose vice-captain</h3>
                    <div className="vice-picker__row">
                      {Array.from(startingIds)
                        .filter((id) => id !== captainId)
                        .map((id) => {
                          const p = squadPlayers.find((sp) => sp.id === id);
                          if (!p) return null;
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`chip-btn${viceId === id ? ' chip-btn--active' : ''}`}
                              onClick={() => chooseVice(id)}
                              aria-pressed={viceId === id}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="bench-order">
                  <h3>
                    Bench order{' '}
                    <span className="position-group__quota">
                      {benchOrder.length} of {rules.squadSize - rules.startingSize} substitute slots
                    </span>
                  </h3>
                  {benchOrder.length === 0 ? (
                    <p className="pitch-section__hint">No bench players yet — start fewer players or grow your squad.</p>
                  ) : (
                    <ol className="bench-order__list">
                      {benchOrder.map((id, i) => {
                        const p = squadPlayers.find((sp) => sp.id === id);
                        if (!p) return null;
                        return (
                          <li key={id} className="bench-order__item">
                            <span className="bench-order__rank mono">{i + 1}</span>
                            <span className="bench-order__name">{p.name}</span>
                            <span className="bench-order__pos">{p.position}</span>
                            <div className="bench-order__controls">
                              <button
                                type="button"
                                className="chip-btn"
                                disabled={i === 0}
                                onClick={() => moveBenchPlayer(id, -1)}
                                aria-label={`Move ${p.name} up`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="chip-btn"
                                disabled={i === benchOrder.length - 1}
                                onClick={() => moveBenchPlayer(id, 1)}
                                aria-label={`Move ${p.name} down`}
                              >
                                ↓
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <div className="squad-footer">
                  <span>
                    Starting: <strong className="mono">{startingIds.size}/{rules.startingSize}</strong>
                  </span>
                  <button type="button" className="btn btn--primary" disabled={!lineupValid} onClick={() => setStep('gameweek')}>
                    Confirm lineup →
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {step === 'gameweek' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league to open the Gameweek Hub." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Gameweek Hub</h2>
                  <p>Deadlines, fixtures, and your confirmed lineup — all in one place.</p>
                </div>
                <div className="auto-sub-info">
                  <strong>Auto-substitution rule:</strong> If a starting player does not play, the highest-priority eligible bench player will replace them while preserving formation requirements.
                </div>
                <GameweekHub
                  season={SEASON}
                  fixtures={FIXTURES[sport]}
                  startingPlayers={startingPlayers}
                  captainId={captainId}
                  viceId={viceId}
                  freeTransfers={freeTransfers}
                  seasonPoints={joinedLeague.totalPoints}
                  overallRank={joinedLeague.rank}
                  simulated={simulated}
                  onSimulate={handleSimulateGameweek}
                  onViewLivePoints={() => setStep('live-points')}
                />
              </>
            )}
          </section>
        )}

        {step === 'live-points' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league to see live points." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Live Points</h2>
                  <p>Mock real-time scoring for your current starting lineup.</p>
                </div>
                <LivePointsPanel
                  sport={sport}
                  startingPlayers={startingPlayers}
                  benchPlayers={benchOrder.map((id) => playersById[id]).filter((p): p is Player => !!p)}
                  captainId={captainId}
                  minutesPlayed={minutesPlayed}
                  rankChange={rankChange}
                />
                <div className="squad-footer">
                  <button type="button" className="btn btn--ghost" onClick={() => setStep('transfers')}>
                    Continue to Transfers →
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {step === 'transfers' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league before making transfers." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Transfers</h2>
                  <p>
                    You have <strong className="mono">{freeTransfers}</strong> free transfer
                    {freeTransfers === 1 ? '' : 's'} this gameweek. Extra transfers cost{' '}
                    <strong className="mono is-negative">-4 pts</strong> each.
                  </p>
                </div>

                <div className="transfer-summary">
                  <div className="transfer-summary__item">
                    <span className="transfer-summary__label">Free Transfers</span>
                    <span className="transfer-summary__value mono">{freeTransfers}</span>
                  </div>
                  <div className="transfer-summary__item">
                    <span className="transfer-summary__label">Extra Transfer Cost</span>
                    <span className="transfer-summary__value mono is-negative">-4 pts</span>
                  </div>
                  <div className="transfer-summary__item">
                    <span className="transfer-summary__label">Budget Remaining</span>
                    <span className="transfer-summary__value mono">{budgetRemaining.toFixed(1)}</span>
                  </div>
                  <div className="transfer-summary__item">
                    <span className="transfer-summary__label">Transfer Hits</span>
                    <span className="transfer-summary__value mono is-negative">-{transferHits}</span>
                  </div>
                </div>

                {transferMessage && (
                  <p className={transferMessage.includes('cannot') || transferMessage.includes('exceed') || transferMessage.includes('first') ? 'form-error' : 'form-success'}>
                    {transferMessage}
                  </p>
                )}

                {showTransferConfirm && transferOutId && pendingTransferInId ? (
                  (() => {
                    const outPlayer = playersForSport.find((p) => p.id === transferOutId);
                    const inPlayer = playersForSport.find((p) => p.id === pendingTransferInId);
                    if (!outPlayer || !inPlayer) return null;
                    const newRemaining = rules.budget - (budgetUsed - outPlayer.price + inPlayer.price);
                    const cost = freeTransfers > 0 ? 'Free' : '-4 pts';
                    const gain = inPlayer.expectedPoints - outPlayer.expectedPoints;
                    return (
                      <div className="transfer-confirm">
                        <h3>Confirm Transfer</h3>
                        <div className="transfer-confirm__row">
                          <span className="transfer-confirm__tag transfer-confirm__tag--out">OUT</span>
                          <strong>{outPlayer.name}</strong>
                          <span className="mono">{outPlayer.price.toFixed(1)}</span>
                        </div>
                        <div className="transfer-confirm__row">
                          <span className="transfer-confirm__tag transfer-confirm__tag--in">IN</span>
                          <strong>{inPlayer.name}</strong>
                          <span className="mono">{inPlayer.price.toFixed(1)}</span>
                        </div>
                        {inPlayer.status === 'doubtful' && (
                          <p className="form-error">Warning: {inPlayer.name} is listed as doubtful for the next gameweek.</p>
                        )}
                        <div className="transfer-confirm__stats">
                          <span>
                            Budget remaining: <strong className="mono">{newRemaining.toFixed(1)}</strong>
                          </span>
                          <span>
                            Transfer cost: <strong className="mono">{cost}</strong>
                          </span>
                          <span>
                            Projected gain:{' '}
                            <strong className={`mono ${gain >= 0 ? 'is-positive' : 'is-negative'}`}>
                              {gain >= 0 ? '+' : ''}
                              {gain.toFixed(1)} pts
                            </strong>
                          </span>
                        </div>
                        <div className="transfer-confirm__actions">
                          <button type="button" className="btn btn--ghost" onClick={cancelPendingTransfer}>
                            Cancel
                          </button>
                          <button type="button" className="btn btn--primary" onClick={finalizeTransfer}>
                            Confirm transfer
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="transfers-grid">
                    <div>
                      <h3>Current squad — select a player to transfer out</h3>
                      <div className="player-list">
                        {squadPlayers.map((p) => (
                          <PlayerRow
                            key={p.id}
                            player={p}
                            mode="squad"
                            selected={transferOutId === p.id}
                            actionLabel={transferOutId === p.id ? 'Selected ✓' : 'Transfer out'}
                            onAction={(id) => setTransferOutId(id === transferOutId ? null : id)}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Available replacements</h3>
                      <div className="player-list">
                        {transferCandidates.map((p) => (
                          <PlayerRow key={p.id} player={p} mode="pick" actionLabel="Transfer in" onAction={selectTransferIn} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="squad-footer">
                  <span>
                    Transfer hits so far: <strong className="mono is-negative">-{transferHits}</strong>
                  </span>
                  <button type="button" className="btn btn--primary" onClick={() => setStep('standings')}>
                    View standings →
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {step === 'standings' && (
          <section className="fh__section">
            {!joinedLeague ? (
              <EmptyPrompt text="Join a league to see live standings." onAction={() => setStep('join')} actionLabel="Go to Join" />
            ) : !teamSetupComplete ? (
              <EmptyPrompt text="Create your team first." onAction={() => setStep('team-setup')} actionLabel="Go to Team Setup" />
            ) : (
              <>
                <div className="section-heading">
                  <h2>Standings — {joinedLeague.name}</h2>
                  <p>Full leaderboard plus a transparent log of every automated scoring correction.</p>
                </div>
                <StandingsTable standings={STANDINGS[sport]} corrections={CORRECTIONS[sport]} accent={accent} />
                <button type="button" className="btn btn--ghost" onClick={() => setStep('notifications')}>
                  View notifications →
                </button>
              </>
            )}
          </section>
        )}

        {step === 'notifications' && (
          <section className="fh__section">
            <div className="section-heading">
              <h2>Notifications</h2>
              <p>Stay updated with deadlines, transfers, and scoring changes.</p>
            </div>
            <FantasyNotifications notifications={notifications} onToggleRead={toggleNotificationRead} />
          </section>
        )}
      </main>

      <footer className="fh__footer">
        <p>Fantasy Hub · Mock Ugandan sports data for demonstration only. No real accounts, payments, or fixtures.</p>
      </footer>

      <Footer />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Small local helper                                                 */
/* ------------------------------------------------------------------ */

const EmptyPrompt: React.FC<{ text: string; onAction: () => void; actionLabel: string }> = ({
  text,
  onAction,
  actionLabel,
}) => (
  <div className="empty-prompt">
    <p>{text}</p>
    <button type="button" className="btn btn--primary" onClick={onAction}>
      {actionLabel}
    </button>
  </div>
);

export default FantasyCompetitions;