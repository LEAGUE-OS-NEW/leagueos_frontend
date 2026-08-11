// Fantasy — service layer (players + leagues).
//
// No backend endpoint exists for fantasy yet, so this is in-memory mock,
// following the same convention as every other admin service: typed async
// functions, delay()-wrapped, shaped for a drop-in real-backend swap later.
//
// This is the single source of truth for fantasy players/leagues — both the
// admin "Fantasy" section (add players, create leagues) and the fan-facing
// FantasyCompetitions.tsx page read from here, so an admin addition actually
// shows up for fans instead of being cosmetic.

export type Sport = 'football' | 'rugby' | 'basketball';

export interface Competition {
  id: string;
  sport: Sport;
  name: string;
  image: string;
  entryType: 'public' | 'private';
  managers: number;
  prizePool: string;
  gameweek: string;
  rulesSummary: string;
}

export interface Player {
  id: string;
  sport: Sport;
  name: string;
  club: string;
  position: string;
  price: number;
  expectedPoints: number;
  status: 'available' | 'injured' | 'suspended' | 'doubtful';
  image: string;
  number?: number;
}

// Canonical position names per sport. Mirrors SQUAD_RULES[sport].positions
// in FantasyCompetitions.tsx — kept as a small, deliberate duplication
// rather than reaching across the admin/fan page boundary for one constant;
// squad position rules change rarely. If SQUAD_RULES ever changes, update
// this too.
export const POSITIONS_BY_SPORT: Record<Sport, string[]> = {
  football: ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'],
  rugby: ['Front Row', 'Second Row', 'Back Row', 'Half Backs', 'Centres', 'Back Three'],
  basketball: ['Point Guards', 'Shooting Guards', 'Small Forwards', 'Power Forwards', 'Centers'],
};

const DEFAULT_IMAGE_BY_SPORT: Record<Sport, string> = {
  football: '/news/fbj.jfif',
  rugby: '/news/rbj.jfif',
  basketball: '/news/bkj.jfif',
};

const DEFAULT_LEAGUE_IMAGE = '/images/fantasy1.png';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

const competitions: Competition[] = [
  {
    id: 'fb-premier',
    sport: 'football',
    name: 'Uganda Fantasy Premier',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 48200,
    prizePool: 'UGX 20,000,000',
    gameweek: 'Gameweek 3 · Live',
    rulesSummary: 'Classic 8-player squads, one free transfer per gameweek, captain scores 2x.',
  },
  {
    id: 'fb-office',
    sport: 'football',
    name: 'Kampala Office League',
    image: '/images/fantasy1.png',
    entryType: 'private',
    managers: 32,
    prizePool: 'Bragging rights + trophy',
    gameweek: 'Gameweek 3 · Deadline Sat 18:30',
    rulesSummary: 'Invite-only workplace league, same scoring, no side markets.',
  },
  {
    id: 'fb-startimes',
    sport: 'football',
    name: 'StarTimes Uganda Cup Fantasy',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 15600,
    prizePool: 'UGX 5,000,000',
    gameweek: 'Gameweek 3 · Live',
    rulesSummary: 'Budget capped at 100 credits, double points for breakout debutants.',
  },
  {
    id: 'rg-nile',
    sport: 'rugby',
    name: 'Nile Rugby Challenge',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 12800,
    prizePool: 'UGX 6,000,000',
    gameweek: 'Round 4 · Live',
    rulesSummary: '8-player squads across six position groups, captain scores 2x.',
  },
  {
    id: 'rg-clubhouse',
    sport: 'rugby',
    name: 'Kampala Rugby Clubhouse',
    image: '/images/fantasy1.png',
    entryType: 'private',
    managers: 24,
    prizePool: 'Trophy + pride',
    gameweek: 'Round 4 · Deadline Sat 14:00',
    rulesSummary: 'Friends-only league, standard scoring plus a mid-season wildcard.',
  },
  {
    id: 'rg-sevens',
    sport: 'rugby',
    name: 'Uganda Sevens Fantasy',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 7600,
    prizePool: 'UGX 1,500,000',
    gameweek: 'Round 4 · Live',
    rulesSummary: 'Bonus points for turnovers won and metres carried.',
  },
  {
    id: 'bb-elite',
    sport: 'basketball',
    name: 'Kampala Basketball Elite',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 21300,
    prizePool: 'UGX 8,000,000',
    gameweek: 'Week 5 · Live',
    rulesSummary: '7-player rosters with 5 starters, captain scores 2x.',
  },
  {
    id: 'bb-friends',
    sport: 'basketball',
    name: 'Uganda Basketball Friends League',
    image: '/images/fantasy1.png',
    entryType: 'private',
    managers: 20,
    prizePool: 'Season jacket',
    gameweek: 'Week 5 · Deadline Wed 19:00',
    rulesSummary: 'Private roster league, standard scoring, two free transfers weekly.',
  },
  {
    id: 'bb-nbl-rising',
    sport: 'basketball',
    name: 'NBL Fantasy Rising',
    image: '/images/fantasy1.png',
    entryType: 'public',
    managers: 9400,
    prizePool: 'UGX 2,000,000',
    gameweek: 'Week 5 · Live',
    rulesSummary: 'Extra points for rookies, budget cap 100 credits.',
  },
];

const players: Player[] = [
  // Football — Goalkeepers
  { id: 'f-gk1', sport: 'football', name: 'Jazee', club: 'KCCA FC', position: 'Goalkeepers', price: 6.0, expectedPoints: 6.8, status: 'available', image: '/news/fbj.jfif', number: 1 },
  { id: 'f-gk2', sport: 'football', name: 'Herbert Ssali', club: 'Vipers SC', position: 'Goalkeepers', price: 5.2, expectedPoints: 5.5, status: 'injured', image: '/news/fbj.jfif', number: 31 },
  // Football — Defenders
  { id: 'f-def1', sport: 'football', name: 'Kelvin Tumuheirwe', club: 'KCCA FC', position: 'Defenders', price: 5.5, expectedPoints: 5.8, status: 'available', image: '/news/fbj.jfif', number: 2 },
  { id: 'f-def2', sport: 'football', name: 'Ronald Ssekitoleko', club: 'Vipers SC', position: 'Defenders', price: 5.8, expectedPoints: 6.0, status: 'available', image: '/news/fbj.jfif', number: 4 },
  { id: 'f-def3', sport: 'football', name: 'Fahad Nsubuga', club: 'SC Villa', position: 'Defenders', price: 4.8, expectedPoints: 4.5, status: 'doubtful', image: '/news/fbj.jfif', number: 5 },
  { id: 'f-def4', sport: 'football', name: 'Peter Wandera', club: 'BUL FC', position: 'Defenders', price: 5.3, expectedPoints: 5.6, status: 'available', image: '/news/fbj.jfif', number: 3 },
  { id: 'f-def5', sport: 'football', name: 'Moses Kigongo', club: 'URA FC', position: 'Defenders', price: 4.5, expectedPoints: 4.0, status: 'suspended', image: '/news/fbj.jfif', number: 15 },
  // Football — Midfielders
  { id: 'f-mid1', sport: 'football', name: 'Isaac Muwonge', club: 'NEC FC', position: 'Midfielders', price: 8.5, expectedPoints: 7.8, status: 'available', image: '/news/fbj.jfif', number: 8 },
  { id: 'f-mid2', sport: 'football', name: 'Enock Ssebunya', club: 'Express FC', position: 'Midfielders', price: 7.2, expectedPoints: 6.5, status: 'available', image: '/news/fbj.jfif', number: 6 },
  { id: 'f-mid3', sport: 'football', name: 'Vincent Katongole', club: 'Police FC', position: 'Midfielders', price: 9.0, expectedPoints: 8.2, status: 'available', image: '/news/fbj.jfif', number: 10 },
  { id: 'f-mid4', sport: 'football', name: 'Herbert Achiro', club: 'Wakiso Giants', position: 'Midfielders', price: 6.5, expectedPoints: 5.9, status: 'doubtful', image: '/news/fbj.jfif', number: 17 },
  { id: 'f-mid5', sport: 'football', name: 'Godfrey Wamala', club: 'Maroons FC', position: 'Midfielders', price: 6.0, expectedPoints: 5.5, status: 'injured', image: '/news/fbj.jfif', number: 14 },
  // Football — Forwards
  { id: 'f-fwd1', sport: 'football', name: 'Yusuf Nsibambi', club: 'KCCA FC', position: 'Forwards', price: 10.5, expectedPoints: 9.4, status: 'available', image: '/news/fbj.jfif', number: 9 },
  { id: 'f-fwd2', sport: 'football', name: 'Emmanuel Ojok', club: 'Vipers SC', position: 'Forwards', price: 9.8, expectedPoints: 8.9, status: 'available', image: '/news/fbj.jfif', number: 11 },
  { id: 'f-fwd3', sport: 'football', name: 'Farouk Kirumira', club: 'SC Villa', position: 'Forwards', price: 8.0, expectedPoints: 7.1, status: 'suspended', image: '/news/fbj.jfif', number: 19 },
  { id: 'f-fwd4', sport: 'football', name: 'Bashir Ssekagya', club: 'BUL FC', position: 'Forwards', price: 7.5, expectedPoints: 6.8, status: 'available', image: '/news/fbj.jfif', number: 7 },

  // Rugby — Front Row
  { id: 'r-fr1', sport: 'rugby', name: 'Robert Ssenoga', club: 'Heathens RFC', position: 'Front Row', price: 6.0, expectedPoints: 5.0, status: 'available', image: '/news/rbj.jfif', number: 1 },
  { id: 'r-fr2', sport: 'rugby', name: 'Charles Kirya', club: 'Kobs RFC', position: 'Front Row', price: 5.5, expectedPoints: 4.6, status: 'injured', image: '/news/rbj.jfif', number: 2 },
  { id: 'r-fr3', sport: 'rugby', name: 'Denis Mubiru', club: 'Pirates RFC', position: 'Front Row', price: 5.8, expectedPoints: 4.9, status: 'available', image: '/news/rbj.jfif', number: 3 },
  // Rugby — Second Row
  { id: 'r-sr1', sport: 'rugby', name: 'Samuel Tumwine', club: 'Heathens RFC', position: 'Second Row', price: 6.5, expectedPoints: 5.8, status: 'available', image: '/news/rbj.jfif', number: 4 },
  { id: 'r-sr2', sport: 'rugby', name: 'Patrick Byaruhanga', club: 'Buffaloes RFC', position: 'Second Row', price: 6.2, expectedPoints: 5.5, status: 'doubtful', image: '/news/rbj.jfif', number: 5 },
  // Rugby — Back Row
  { id: 'r-br1', sport: 'rugby', name: 'Moses Kirunda', club: 'Rhinos RFC', position: 'Back Row', price: 7.0, expectedPoints: 6.4, status: 'available', image: '/news/rbj.jfif', number: 6 },
  { id: 'r-br2', sport: 'rugby', name: 'Ivan Businge', club: 'Kobs RFC', position: 'Back Row', price: 6.8, expectedPoints: 6.0, status: 'available', image: '/news/rbj.jfif', number: 7 },
  { id: 'r-br3', sport: 'rugby', name: 'Emmanuel Aliker', club: 'Mongers RFC', position: 'Back Row', price: 6.4, expectedPoints: 5.7, status: 'suspended', image: '/news/rbj.jfif', number: 8 },
  // Rugby — Half Backs
  { id: 'r-hb1', sport: 'rugby', name: 'Senteza Ronald', club: 'Heathens RFC', position: 'Half Backs', price: 8.5, expectedPoints: 14.2, status: 'available', image: '/news/rbj.jfif', number: 9 },
  // Rugby — Centres
  { id: 'r-ce1', sport: 'rugby', name: 'Brian Opio', club: 'Walukuba RFC', position: 'Centres', price: 7.8, expectedPoints: 12.5, status: 'available', image: '/news/rbj.jfif', number: 12 },
  { id: 'r-ce2', sport: 'rugby', name: 'Alex Mwesigwa', club: 'Buffaloes RFC', position: 'Centres', price: 7.2, expectedPoints: 11.8, status: 'available', image: '/news/rbj.jfif', number: 13 },
  // Rugby — Back Three
  { id: 'r-bt1', sport: 'rugby', name: 'Kato Ivan', club: 'Warriors RFC', position: 'Back Three', price: 9.0, expectedPoints: 15.1, status: 'available', image: '/news/rbj.jfif', number: 11 },
  { id: 'r-bt2', sport: 'rugby', name: 'Denis Ochora', club: 'Rhinos RFC', position: 'Back Three', price: 8.2, expectedPoints: 13.4, status: 'injured', image: '/news/rbj.jfif', number: 14 },
  { id: 'r-bt3', sport: 'rugby', name: 'Fred Ssemwanga', club: 'Pirates RFC', position: 'Back Three', price: 7.6, expectedPoints: 12.9, status: 'available', image: '/news/rbj.jfif', number: 15 },

  // Basketball — Point Guards
  { id: 'b-pg1', sport: 'basketball', name: 'Derrick Okello', club: 'City Oilers', position: 'Point Guards', price: 11.5, expectedPoints: 22.4, status: 'available', image: '/news/bkj.jfif', number: 1 },
  { id: 'b-pg2', sport: 'basketball', name: 'Milton Ariko', club: 'Namuwongo Blazers', position: 'Point Guards', price: 9.0, expectedPoints: 17.8, status: 'doubtful', image: '/news/bkj.jfif', number: 11 },
  // Basketball — Shooting Guards
  { id: 'b-sg1', sport: 'basketball', name: 'Joel Mugisha', club: 'City Oilers', position: 'Shooting Guards', price: 10.5, expectedPoints: 20.5, status: 'available', image: '/news/bkj.jfif', number: 2 },
  { id: 'b-sg2', sport: 'basketball', name: 'Ronald Kabuye', club: 'KIU Titans', position: 'Shooting Guards', price: 8.8, expectedPoints: 16.2, status: 'injured', image: '/news/bkj.jfif', number: 12 },
  // Basketball — Small Forwards
  { id: 'b-sf1', sport: 'basketball', name: 'Timothy Luswata', club: 'UCU Canons', position: 'Small Forwards', price: 12.0, expectedPoints: 24.0, status: 'available', image: '/news/bkj.jfif', number: 3 },
  { id: 'b-sf2', sport: 'basketball', name: 'Brian Nkurunziza', club: 'JT Jaguars', position: 'Small Forwards', price: 9.5, expectedPoints: 18.4, status: 'available', image: '/news/bkj.jfif', number: 13 },
  // Basketball — Power Forwards
  { id: 'b-pf1', sport: 'basketball', name: 'Isaac Bogere', club: 'Rezlife Saints', position: 'Power Forwards', price: 11.0, expectedPoints: 21.6, status: 'available', image: '/news/bkj.jfif', number: 4 },
  { id: 'b-pf2', sport: 'basketball', name: 'Kenneth Ochen', club: 'Kampala Rockets', position: 'Power Forwards', price: 8.5, expectedPoints: 15.9, status: 'suspended', image: '/news/bkj.jfif', number: 14 },
  // Basketball — Centers
  { id: 'b-c1', sport: 'basketball', name: 'Charles Odongo', club: 'City Oilers', position: 'Centers', price: 13.0, expectedPoints: 25.8, status: 'available', image: '/news/bkj.jfif', number: 5 },
  { id: 'b-c2', sport: 'basketball', name: 'David Muwanguzi', club: 'Nkumba Marines', position: 'Centers', price: 9.8, expectedPoints: 18.0, status: 'available', image: '/news/bkj.jfif', number: 15 },
];

export async function fetchFantasyLeagues(): Promise<Competition[]> {
  return delay([...competitions]);
}

export async function fetchFantasyPlayers(): Promise<Player[]> {
  return delay([...players]);
}

export interface AddFantasyPlayerInput {
  sport: Sport;
  name: string;
  club: string;
  position: string;
  price: number;
  expectedPoints: number;
  status: Player['status'];
  number?: number;
}

export async function addFantasyPlayer(input: AddFantasyPlayerInput): Promise<Player> {
  if (!input.name.trim()) fail("Enter the player's name.");
  if (!input.club.trim()) fail("Enter the player's club.");
  if (!POSITIONS_BY_SPORT[input.sport].includes(input.position)) {
    fail('Select a valid position for this sport.');
  }
  if (!(input.price > 0)) fail('Price must be greater than 0.');
  if (!(input.expectedPoints >= 0)) fail('Expected points cannot be negative.');

  const player: Player = {
    id: genId('player'),
    sport: input.sport,
    name: input.name.trim(),
    club: input.club.trim(),
    position: input.position,
    price: input.price,
    expectedPoints: input.expectedPoints,
    status: input.status,
    image: DEFAULT_IMAGE_BY_SPORT[input.sport],
    number: input.number,
  };
  players.push(player);
  return delay({ ...player });
}

export interface CreateFantasyLeagueInput {
  sport: Sport;
  name: string;
  entryType: Competition['entryType'];
  prizePool: string;
  gameweek: string;
  rulesSummary: string;
  image?: string;
}

export async function createFantasyLeague(input: CreateFantasyLeagueInput): Promise<Competition> {
  if (!input.name.trim()) fail('Enter a league name.');
  if (!input.prizePool.trim()) fail('Enter a prize pool.');
  if (!input.gameweek.trim()) fail('Enter the current gameweek/round label.');
  if (!input.rulesSummary.trim()) fail('Enter a short rules summary.');

  const league: Competition = {
    id: genId(`custom-${input.sport}`),
    sport: input.sport,
    name: input.name.trim(),
    image: input.image?.trim() || DEFAULT_LEAGUE_IMAGE,
    entryType: input.entryType,
    managers: 0,
    prizePool: input.prizePool.trim(),
    gameweek: input.gameweek.trim(),
    rulesSummary: input.rulesSummary.trim(),
  };
  competitions.push(league);
  return delay({ ...league });
}
