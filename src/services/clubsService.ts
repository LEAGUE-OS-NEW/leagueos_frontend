// Clubs, squads, and player profiles — service layer (US-3.2).
//
// No real backend endpoint exists for any of this yet, so it's mock-backed,
// same convention as every other service this session: typed interfaces,
// in-memory data, delay()-wrapped async functions, shaped so a real backend
// swap later only touches this file. Follow state lives in an in-memory
// Set, same pattern as accountService.ts's accountStatus variable.

export type Sport = 'Football' | 'Rugby' | 'Basketball';
export type VerificationStatus = 'Verified' | 'Pending';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

/* ------------------------------------------------------------------ */
/* Clubs                                                                */
/* ------------------------------------------------------------------ */

export interface ClubSummary {
  slug: string;
  name: string;
  sport: Sport;
  league: string;
  crest?: string;
  founded: string;
  stadium: string;
  description: string;
  verificationStatus: VerificationStatus;
  honours: string[];
}

const CLUBS: ClubSummary[] = [
  {
    slug: 'vipers-sc',
    name: 'Vipers SC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/vipers-sc.png',
    founded: '2008',
    stadium: "St. Mary's Stadium, Kitende",
    description: 'Record-breaking UPL champions and dominant force in Ugandan football.',
    verificationStatus: 'Verified',
    honours: ['UPL Champions — 2019/20, 2020/21, 2021/22', 'Uganda Cup Winners — 2016'],
  },
  {
    slug: 'kcca-fc',
    name: 'KCCA FC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/kcca-fc.png',
    founded: '2008',
    stadium: 'StarTimes Stadium, Lugogo',
    description: "Kampala Capital City Authority FC — one of Uganda's most celebrated clubs.",
    verificationStatus: 'Verified',
    honours: ['UPL Champions — 2017/18', 'CECAFA Club Cup Winners — 2015'],
  },
  {
    slug: 'sc-villa',
    name: 'SC Villa',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/sc-villa.png',
    founded: '1975',
    stadium: 'Mandela National Stadium',
    description: 'The most decorated club in Ugandan football history with over 16 league titles.',
    verificationStatus: 'Verified',
    honours: ['UPL Champions — 16-time winners', 'Uganda Cup Winners — 9-time winners'],
  },
  {
    slug: 'express-fc',
    name: 'Express FC',
    sport: 'Football',
    league: 'Uganda Premier League',
    crest: '/clubs/express-fc.png',
    founded: '1948',
    stadium: 'Mutesa II Stadium, Wankulukuku',
    description: "One of Uganda's oldest clubs, known as the Red Eagles, with a passionate fanbase.",
    verificationStatus: 'Verified',
    honours: ['UPL Champions — 1995, 2003, 2012'],
  },
  {
    slug: 'kobs-rugby',
    name: 'Kobs Rugby',
    sport: 'Rugby',
    league: 'Rugby Africa',
    crest: '/clubs/kobs.jpg',
    founded: '1953',
    stadium: 'Kyadondo Rugby Club',
    description: "Uganda's most successful rugby club and perennial Rugby Africa Cup contenders.",
    verificationStatus: 'Verified',
    honours: ['Uganda Rugby Premier League Champions — 12-time winners'],
  },
  {
    slug: 'black-pirates',
    name: 'Black Pirates',
    sport: 'Rugby',
    league: 'Rugby Africa',
    crest: '/clubs/black-pirates.png',
    founded: '1980',
    stadium: 'Legends Rugby Club',
    description: 'Fierce rivals of the Kobs and a powerhouse in Ugandan club rugby.',
    verificationStatus: 'Verified',
    honours: ['Uganda Rugby Premier League Champions — 2018'],
  },
  {
    slug: 'city-oilers',
    name: 'City Oilers',
    sport: 'Basketball',
    league: 'NBL Uganda',
    crest: '/clubs/city-oilers.png',
    founded: '2012',
    stadium: 'Lugogo Indoor Stadium',
    description: 'The most successful basketball club in East Africa and NBL Uganda’s flagship team.',
    verificationStatus: 'Verified',
    honours: ['NBL Uganda Champions — 8-time winners', 'FIBA Africa Basketball League — Runners-up 2021'],
  },
  {
    slug: 'ucu-canons',
    name: 'UCU Canons',
    sport: 'Basketball',
    league: 'NBL Uganda',
    crest: undefined,
    founded: '2014',
    stadium: 'UCU Main Campus',
    description: "Uganda Christian University's competitive NBL side and City Oilers' greatest rivals.",
    verificationStatus: 'Pending',
    honours: [],
  },
];

export async function fetchClubs(): Promise<ClubSummary[]> {
  return delay([...CLUBS]);
}

export async function fetchClubBySlug(slug: string): Promise<ClubSummary | null> {
  return delay(CLUBS.find((club) => club.slug === slug) ?? null);
}

/* ------------------------------------------------------------------ */
/* Club creation — mock-backed (US-Super-Admin club setup)              */
/*                                                                       */
/* No real backend endpoint exists for creating a Club yet — profiles   */
/* .Club is read-only over REST (Django-admin-only to create). Mirrors  */
/* the target shape so a real backend swap later only touches this      */
/* function. Competition creation lives in sportsDataService.ts instead */
/* — SportsDataAdmin.tsx already owns competitions, so this doesn't     */
/* keep a second, disconnected competition list.                        */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createClub(input: { name: string; sport: Sport; competitionName?: string }): Promise<ClubSummary> {
  if (!input.name.trim()) fail('Enter a club name.');
  const club: ClubSummary = {
    slug: slugify(input.name) || `club-${Date.now().toString(36)}`,
    name: input.name.trim(),
    sport: input.sport,
    league: input.competitionName?.trim() || 'Unaffiliated',
    founded: String(new Date().getFullYear()),
    stadium: '',
    description: '',
    verificationStatus: 'Pending',
    honours: [],
  };
  CLUBS.unshift(club);
  return delay(club);
}

/* ------------------------------------------------------------------ */
/* Squads / players                                                     */
/* ------------------------------------------------------------------ */

export interface PlayerStat {
  label: string;
  value: string;
}

export interface Player {
  id: string;
  clubSlug: string;
  name: string;
  position: string;
  number: number;
  nationality: string;
  dateJoined: string;
  photo?: string;
  statsVerification: VerificationStatus;
  stats: PlayerStat[];
}

const SQUADS: Record<string, Player[]> = {
  'vipers-sc': [
    { id: 'v-1', clubSlug: 'vipers-sc', name: 'D. Okwir', position: 'Goalkeeper', number: 1, nationality: 'Uganda', dateJoined: 'Jan 2022', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '28' }, { label: 'Clean Sheets', value: '14' }, { label: 'Saves', value: '76' }] },
    { id: 'v-2', clubSlug: 'vipers-sc', name: 'B. Ssali', position: 'Defender', number: 4, nationality: 'Uganda', dateJoined: 'Jul 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '31' }, { label: 'Goals', value: '2' }, { label: 'Tackles Won', value: '58' }] },
    { id: 'v-3', clubSlug: 'vipers-sc', name: 'E. Kirabo', position: 'Midfielder', number: 8, nationality: 'Uganda', dateJoined: 'Aug 2019', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '33' }, { label: 'Goals', value: '6' }, { label: 'Assists', value: '9' }] },
    { id: 'v-4', clubSlug: 'vipers-sc', name: 'F. Tumusiime', position: 'Forward', number: 11, nationality: 'Uganda', dateJoined: 'Jan 2025', statsVerification: 'Pending', stats: [] },
  ],
  'kcca-fc': [
    { id: 'k-1', clubSlug: 'kcca-fc', name: 'P. Nsubuga', position: 'Goalkeeper', number: 1, nationality: 'Uganda', dateJoined: 'Feb 2021', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '26' }, { label: 'Clean Sheets', value: '11' }, { label: 'Saves', value: '69' }] },
    { id: 'k-2', clubSlug: 'kcca-fc', name: 'J. Byaruhanga', position: 'Defender', number: 5, nationality: 'Uganda', dateJoined: 'Jun 2018', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '30' }, { label: 'Goals', value: '1' }, { label: 'Tackles Won', value: '62' }] },
    { id: 'k-3', clubSlug: 'kcca-fc', name: 'A. Wasswa', position: 'Midfielder', number: 10, nationality: 'Uganda', dateJoined: 'Mar 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '32' }, { label: 'Goals', value: '8' }, { label: 'Assists', value: '11' }] },
    { id: 'k-4', clubSlug: 'kcca-fc', name: 'M. Kato', position: 'Forward', number: 9, nationality: 'Uganda', dateJoined: 'Jan 2019', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '29' }, { label: 'Goals', value: '15' }, { label: 'Assists', value: '4' }] },
  ],
  'sc-villa': [
    { id: 's-1', clubSlug: 'sc-villa', name: 'R. Nabbosa', position: 'Goalkeeper', number: 1, nationality: 'Uganda', dateJoined: 'Sep 2021', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '24' }, { label: 'Clean Sheets', value: '9' }, { label: 'Saves', value: '58' }] },
    { id: 's-2', clubSlug: 'sc-villa', name: 'D. Aine', position: 'Defender', number: 3, nationality: 'Uganda', dateJoined: 'Nov 2017', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '35' }, { label: 'Goals', value: '3' }, { label: 'Tackles Won', value: '71' }] },
    { id: 's-3', clubSlug: 'sc-villa', name: 'C. Namutebi', position: 'Midfielder', number: 6, nationality: 'Uganda', dateJoined: 'Apr 2022', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '22' }, { label: 'Goals', value: '4' }, { label: 'Assists', value: '7' }] },
    { id: 's-4', clubSlug: 'sc-villa', name: 'I. Nakimuli', position: 'Forward', number: 7, nationality: 'Uganda', dateJoined: 'Feb 2025', statsVerification: 'Pending', stats: [] },
  ],
  'express-fc': [
    { id: 'e-1', clubSlug: 'express-fc', name: 'S. Odongo', position: 'Goalkeeper', number: 1, nationality: 'Uganda', dateJoined: 'Jan 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '27' }, { label: 'Clean Sheets', value: '10' }, { label: 'Saves', value: '64' }] },
    { id: 'e-2', clubSlug: 'express-fc', name: 'H. Muwanga', position: 'Defender', number: 2, nationality: 'Uganda', dateJoined: 'Jul 2019', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '29' }, { label: 'Goals', value: '1' }, { label: 'Tackles Won', value: '55' }] },
    { id: 'e-3', clubSlug: 'express-fc', name: 'G. Kalema', position: 'Midfielder', number: 14, nationality: 'Uganda', dateJoined: 'Aug 2021', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '25' }, { label: 'Goals', value: '5' }, { label: 'Assists', value: '6' }] },
    { id: 'e-4', clubSlug: 'express-fc', name: 'L. Ntambi', position: 'Forward', number: 19, nationality: 'Uganda', dateJoined: 'Jun 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '28' }, { label: 'Goals', value: '10' }, { label: 'Assists', value: '3' }] },
  ],
  'kobs-rugby': [
    { id: 'ko-1', clubSlug: 'kobs-rugby', name: 'T. Egwau', position: 'Prop', number: 1, nationality: 'Uganda', dateJoined: 'Mar 2019', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '20' }, { label: 'Tries', value: '1' }, { label: 'Tackles', value: '112' }] },
    { id: 'ko-2', clubSlug: 'kobs-rugby', name: 'N. Opio', position: 'Fly-half', number: 10, nationality: 'Uganda', dateJoined: 'Jan 2021', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '18' }, { label: 'Points', value: '86' }, { label: 'Tries', value: '4' }] },
    { id: 'ko-3', clubSlug: 'kobs-rugby', name: 'W. Ochwo', position: 'Wing', number: 11, nationality: 'Uganda', dateJoined: 'Sep 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '19' }, { label: 'Tries', value: '9' }] },
    { id: 'ko-4', clubSlug: 'kobs-rugby', name: 'R. Etyang', position: 'Lock', number: 5, nationality: 'Uganda', dateJoined: 'Feb 2025', statsVerification: 'Pending', stats: [] },
  ],
  'black-pirates': [
    { id: 'bp-1', clubSlug: 'black-pirates', name: 'K. Ssemwogerere', position: 'Prop', number: 3, nationality: 'Uganda', dateJoined: 'May 2018', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '22' }, { label: 'Tries', value: '2' }, { label: 'Tackles', value: '130' }] },
    { id: 'bp-2', clubSlug: 'black-pirates', name: 'J. Mugerwa', position: 'Fly-half', number: 10, nationality: 'Uganda', dateJoined: 'Aug 2019', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '21' }, { label: 'Points', value: '94' }, { label: 'Tries', value: '3' }] },
    { id: 'bp-3', clubSlug: 'black-pirates', name: 'F. Kabuye', position: 'Wing', number: 14, nationality: 'Uganda', dateJoined: 'Jun 2020', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '20' }, { label: 'Tries', value: '11' }] },
    { id: 'bp-4', clubSlug: 'black-pirates', name: 'A. Lubega', position: 'Lock', number: 4, nationality: 'Uganda', dateJoined: 'Mar 2021', statsVerification: 'Verified', stats: [{ label: 'Appearances', value: '17' }, { label: 'Tackles', value: '98' }] },
  ],
  'city-oilers': [
    { id: 'co-1', clubSlug: 'city-oilers', name: 'D. Ariko', position: 'Point Guard', number: 3, nationality: 'Uganda', dateJoined: 'Oct 2019', statsVerification: 'Verified', stats: [{ label: 'Games', value: '24' }, { label: 'Points Per Game', value: '14.2' }, { label: 'Assists Per Game', value: '5.6' }] },
    { id: 'co-2', clubSlug: 'city-oilers', name: 'S. Okumu', position: 'Shooting Guard', number: 23, nationality: 'Uganda', dateJoined: 'Jan 2021', statsVerification: 'Verified', stats: [{ label: 'Games', value: '22' }, { label: 'Points Per Game', value: '17.8' }, { label: '3PT %', value: '38%' }] },
    { id: 'co-3', clubSlug: 'city-oilers', name: 'B. Ocen', position: 'Forward', number: 8, nationality: 'Uganda', dateJoined: 'Feb 2020', statsVerification: 'Verified', stats: [{ label: 'Games', value: '25' }, { label: 'Points Per Game', value: '12.4' }, { label: 'Rebounds Per Game', value: '7.1' }] },
    { id: 'co-4', clubSlug: 'city-oilers', name: 'P. Kamya', position: 'Center', number: 44, nationality: 'Uganda', dateJoined: 'Jan 2025', statsVerification: 'Pending', stats: [] },
  ],
  'ucu-canons': [
    { id: 'uc-1', clubSlug: 'ucu-canons', name: 'M. Ssebuliba', position: 'Point Guard', number: 1, nationality: 'Uganda', dateJoined: 'Sep 2022', statsVerification: 'Pending', stats: [] },
    { id: 'uc-2', clubSlug: 'ucu-canons', name: 'T. Nabirye', position: 'Shooting Guard', number: 7, nationality: 'Uganda', dateJoined: 'Sep 2022', statsVerification: 'Pending', stats: [] },
    { id: 'uc-3', clubSlug: 'ucu-canons', name: 'E. Mukisa', position: 'Forward', number: 21, nationality: 'Uganda', dateJoined: 'Sep 2022', statsVerification: 'Pending', stats: [] },
    { id: 'uc-4', clubSlug: 'ucu-canons', name: 'V. Nankya', position: 'Center', number: 34, nationality: 'Uganda', dateJoined: 'Sep 2022', statsVerification: 'Pending', stats: [] },
  ],
};

export async function fetchSquad(clubSlug: string): Promise<Player[]> {
  return delay([...(SQUADS[clubSlug] ?? [])]);
}

export async function fetchPlayer(clubSlug: string, playerId: string): Promise<Player | null> {
  const player = (SQUADS[clubSlug] ?? []).find((item) => item.id === playerId) ?? null;
  return delay(player);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

export interface ClubFixture {
  opponent: string;
  competition: string;
  time: string;
  isHome: boolean;
}

const CLUB_FIXTURES: Record<string, ClubFixture[]> = {
  'vipers-sc': [
    { opponent: 'Express FC', competition: 'Uganda Premier League', time: 'Today, 4:00 PM', isHome: true },
    { opponent: 'KCCA FC', competition: 'Uganda Premier League', time: 'Sat, 3:00 PM', isHome: false },
  ],
  'kcca-fc': [{ opponent: 'SC Villa', competition: 'Uganda Premier League', time: 'Sat, 3:00 PM', isHome: true }],
  'sc-villa': [{ opponent: 'KCCA FC', competition: 'Uganda Premier League', time: 'Sat, 3:00 PM', isHome: false }],
  'express-fc': [{ opponent: 'Vipers SC', competition: 'Uganda Premier League', time: 'Today, 4:00 PM', isHome: false }],
  'kobs-rugby': [{ opponent: 'Black Pirates', competition: 'Rugby Africa Cup', time: 'Today, 5:30 PM', isHome: true }],
  'black-pirates': [{ opponent: 'Kobs Rugby', competition: 'Rugby Africa Cup', time: 'Today, 5:30 PM', isHome: false }],
  'city-oilers': [{ opponent: 'Patriots BC', competition: 'NBL Uganda', time: 'Today, 7:00 PM', isHome: true }],
  'ucu-canons': [],
};

export async function fetchClubFixtures(clubSlug: string): Promise<ClubFixture[]> {
  return delay([...(CLUB_FIXTURES[clubSlug] ?? [])]);
}

/* ------------------------------------------------------------------ */
/* Follow / unfollow                                                    */
/* ------------------------------------------------------------------ */

let followedClubSlugs = new Set<string>(['vipers-sc']);

export async function fetchFollowedClubSlugs(): Promise<string[]> {
  return delay([...followedClubSlugs]);
}

export async function followClub(slug: string): Promise<void> {
  followedClubSlugs = new Set(followedClubSlugs).add(slug);
  return delay(undefined);
}

export async function unfollowClub(slug: string): Promise<void> {
  const next = new Set(followedClubSlugs);
  next.delete(slug);
  followedClubSlugs = next;
  return delay(undefined);
}
