import type { Competition, Player, PositionGroup, Sport, SportRules } from './types';

// ---------------------------------------------------------------------------
// Seeded RNG so demo data is stable across reloads
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(2026081);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
const range = (min: number, max: number) => Math.round((min + rng() * (max - min)) * 10) / 10;

// ---------------------------------------------------------------------------
// Sport rule configuration — the frontend renders from this, never hard-codes
// one fantasy sport model (per League OS handoff, section 10).
// ---------------------------------------------------------------------------
export const SPORT_RULES: Record<Sport, SportRules> = {
  football: {
    sport: 'football',
    label: 'Football',
    budget: 100.0,
    squadSize: 15,
    startersCount: 11,
    maxPerClub: 3,
    pitchStyle: 'grass',
    multiplierLabel: 'Captain',
    positionGroups: [
      { group: 'GK', label: 'Goalkeepers', squadCount: 2, starterMin: 1, starterMax: 1 },
      { group: 'DEF', label: 'Defenders', squadCount: 5, starterMin: 3, starterMax: 5 },
      { group: 'MID', label: 'Midfielders', squadCount: 5, starterMin: 2, starterMax: 5 },
      { group: 'FWD', label: 'Forwards', squadCount: 3, starterMin: 1, starterMax: 3 },
    ],
  },
  basketball: {
    sport: 'basketball',
    label: 'Basketball',
    budget: 100.0,
    squadSize: 10,
    startersCount: 5,
    maxPerClub: 3,
    pitchStyle: 'court',
    multiplierLabel: 'Star Player',
    positionGroups: [
      { group: 'PG', label: 'Point Guards', squadCount: 2, starterMin: 1, starterMax: 2 },
      { group: 'SG', label: 'Shooting Guards', squadCount: 2, starterMin: 1, starterMax: 2 },
      { group: 'SF', label: 'Small Forwards', squadCount: 2, starterMin: 1, starterMax: 2 },
      { group: 'PF', label: 'Power Forwards', squadCount: 2, starterMin: 1, starterMax: 2 },
      { group: 'C', label: 'Centres', squadCount: 2, starterMin: 1, starterMax: 1 },
    ],
  },
  rugby: {
    sport: 'rugby',
    label: 'Rugby 15s',
    budget: 120.0,
    squadSize: 23,
    startersCount: 15,
    maxPerClub: 4,
    pitchStyle: 'rugby',
    multiplierLabel: 'Captain',
    positionGroups: [
      { group: 'FR', label: 'Front Row', squadCount: 5, starterMin: 3, starterMax: 3 },
      { group: 'LK', label: 'Locks', squadCount: 3, starterMin: 2, starterMax: 2 },
      { group: 'BR', label: 'Back Row', squadCount: 4, starterMin: 3, starterMax: 3 },
      { group: 'HB', label: 'Half Backs', squadCount: 3, starterMin: 2, starterMax: 2 },
      { group: 'CT', label: 'Centres', squadCount: 3, starterMin: 2, starterMax: 2 },
      { group: 'B3', label: 'Back Three', squadCount: 5, starterMin: 3, starterMax: 3 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Clubs (real Ugandan competition names, used for context/flavour)
// ---------------------------------------------------------------------------
const CLUBS: Record<Sport, { name: string; short: string; color: string }[]> = {
  football: [
    { name: 'KCCA FC', short: 'KCCA', color: '#1e5fd6' },
    { name: 'Vipers SC', short: 'VIP', color: '#e0292f' },
    { name: 'URA FC', short: 'URA', color: '#0f7b3e' },
    { name: 'SC Villa', short: 'VLA', color: '#d6a218' },
    { name: 'Express FC', short: 'EXP', color: '#c8102e' },
    { name: 'BUL FC', short: 'BUL', color: '#2d8f4e' },
    { name: 'Wakiso Giants', short: 'WKG', color: '#6c5ce7' },
    { name: 'Onduparaka FC', short: 'ONDU', color: '#f4661b' },
    { name: 'Mbarara City', short: 'MBC', color: '#1c9ad6' },
    { name: 'Busoga United', short: 'BSU', color: '#8e5a2f' },
  ],
  basketball: [
    { name: 'City Oilers', short: 'OIL', color: '#f4661b' },
    { name: 'KCCA Panthers', short: 'KCCA', color: '#1e5fd6' },
    { name: 'UCU Canons', short: 'UCU', color: '#0f7b3e' },
    { name: 'Power Basketball', short: 'PWR', color: '#e0292f' },
    { name: 'Nam Basketball', short: 'NAM', color: '#d6a218' },
    { name: 'Ndejje Angels', short: 'NDJ', color: '#6c5ce7' },
    { name: 'JMS Njeru', short: 'JMS', color: '#1c9ad6' },
    { name: 'Betway Gulls', short: 'GLS', color: '#c8102e' },
  ],
  rugby: [
    { name: 'KOBS RFC', short: 'KOBS', color: '#0f7b3e' },
    { name: 'Heathens RFC', short: 'HTH', color: '#e0292f' },
    { name: 'Pirates RFC', short: 'PIR', color: '#111827' },
    { name: 'Hippos RFC', short: 'HIP', color: '#1e5fd6' },
    { name: 'Buffaloes RFC', short: 'BUF', color: '#8e5a2f' },
    { name: 'Mongers RFC', short: 'MON', color: '#d6a218' },
    { name: 'Impis RFC', short: 'IMP', color: '#6c5ce7' },
    { name: 'Elgon Hippos', short: 'ELG', color: '#1c9ad6' },
  ],
};

const FIRST_NAMES = [
  'Philip', 'Joseph', 'Michael', 'Pius', 'Aziz', 'Ronald', 'Brian', 'Emmanuel', 'Ivan', 'Isaac',
  'Moses', 'David', 'Simon', 'Jonathan', 'Allan', 'Robert', 'Denis', 'Geoffrey', 'Fred', 'Tom',
  'Enock', 'Frank', 'Patrick', 'Vincent', 'Herbert', 'Bashir', 'Farouk', 'Nicholas', 'Andrew',
  'Martin', 'Douglas', 'Hakim', 'Rogers', 'Yasin', 'Elvis', 'Solomon', 'Kenneth', 'Godfrey',
];
const LAST_NAMES = [
  'Wokorach', 'Aredo', 'Ogena', 'Kizza', 'Okello', 'Kasito', 'Odongo', 'Magomu', 'Oketayot',
  'Ochora', 'Ssekabira', 'Nsubuga', 'Kavuma', 'Mubiru', 'Lubega', 'Ntambi', 'Byaruhanga',
  'Tumusiime', 'Kirabo', 'Sserunjogi', 'Kigozi', 'Mukwaya', 'Male', 'Watenga', 'Onyango',
  'Muhindo', 'Draru', 'Asaba', 'Kaggwa', 'Ssenyonga', 'Namanya', 'Rwothomio', 'Tabu',
];

function generatedName(used: Set<string>): string {
  let name = '';
  do {
    name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  } while (used.has(name));
  used.add(name);
  return name;
}

const STATUS_WEIGHTED: Array<Player['status']> = [
  'ready', 'ready', 'ready', 'ready', 'ready', 'ready', 'ready', 'ready',
  'doubtful', 'doubtful', 'injured', 'suspended',
];

function buildPlayers(sport: Sport): Player[] {
  const used = new Set<string>();
  const rules = SPORT_RULES[sport];
  const clubs = CLUBS[sport];
  const players: Player[] = [];
  let idx = 0;

  clubs.forEach((club) => {
    rules.positionGroups.forEach((pg) => {
      // generate a small surplus per position per club so the market has depth
      const count = sport === 'football' ? (pg.group === 'GK' ? 1 : 2) : sport === 'basketball' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        idx += 1;
        const basePrice =
          sport === 'football'
            ? range(4.0, 12.5)
            : sport === 'basketball'
            ? range(5.0, 14.0)
            : range(3.5, 10.5);
        const status = pick(STATUS_WEIGHTED);
        players.push({
          id: `${sport}-${idx}`,
          name: generatedName(used),
          club: club.name,
          clubShort: club.short,
          clubColor: club.color,
          sport,
          position: pg.group,
          positionLabel: positionLabel(sport, pg.group),
          price: basePrice,
          form: Math.max(0, range(2.0, 9.5)),
          totalPoints: Math.round(range(20, 150)),
          gwPoints: Math.round(range(0, 18)),
          ownership: Math.round(range(0.5, 45)),
          status,
          statusNote: status === 'doubtful' ? '75% fit — late fitness test' : status === 'injured' ? 'Out — hamstring, expected back GW+2' : status === 'suspended' ? 'Suspended — one match ban' : undefined,
        });
      }
    });
  });

  return players;
}

function positionLabel(sport: Sport, group: PositionGroup): string {
  const map: Record<Sport, Partial<Record<PositionGroup, string>>> = {
    football: { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' },
    basketball: { PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Centre' },
    rugby: { FR: 'Front Row', LK: 'Lock', BR: 'Back Row', HB: 'Half Back', CT: 'Centre', B3: 'Back Three' },
  };
  return map[sport][group] ?? group;
}

export const PLAYERS: Player[] = [
  ...buildPlayers('football'),
  ...buildPlayers('basketball'),
  ...buildPlayers('rugby'),
];

// ---------------------------------------------------------------------------
// Competitions (FF-02 / FF-03)
// ---------------------------------------------------------------------------
export const COMPETITIONS: Competition[] = [
  {
    id: 'upl-fantasy',
    sport: 'football',
    name: 'StarTimes Uganda Premier League Fantasy',
    shortName: 'UPL Fantasy',
    season: '2026/27',
    currentGameweek: 12,
    totalGameweeks: 30,
    entries: 18432,
    status: 'active',
    deadline: 'Sat 11 Oct, 15:00',
    deadlineISO: '2026-10-11T15:00:00',
    description: 'Build a 15-player squad from the Uganda Premier League and score points every matchday.',
  },
  {
    id: 'nbl-fantasy',
    sport: 'basketball',
    name: 'National Basketball League Fantasy',
    shortName: 'NBL Fantasy',
    season: '2026',
    currentGameweek: 6,
    totalGameweeks: 22,
    entries: 4120,
    status: 'active',
    deadline: 'Sun 12 Oct, 17:00',
    deadlineISO: '2026-10-12T17:00:00',
    description: 'Pick five starters and a bench from the NBL and chase the weekly high score.',
  },
  {
    id: 'rugby-fantasy',
    sport: 'rugby',
    name: 'Nile Special Rugby Premiership Fantasy',
    shortName: 'Rugby Fantasy',
    season: '2026',
    currentGameweek: 8,
    totalGameweeks: 18,
    entries: 3218,
    status: 'active',
    deadline: 'Sat 18 Oct, 14:30',
    deadlineISO: '2026-10-18T14:30:00',
    description: 'Field a 15-player matchday squad across the Nile Special Rugby Premiership clubs.',
  },
  {
    id: 'rugby-7s-fantasy',
    sport: 'rugby',
    name: 'Uganda Rugby 7s Series Fantasy',
    shortName: 'Rugby 7s Fantasy',
    season: '2026',
    currentGameweek: 0,
    totalGameweeks: 6,
    entries: 842,
    status: 'upcoming',
    deadline: 'Fri 24 Oct, 22:00',
    deadlineISO: '2026-10-24T22:00:00',
    description: 'A faster, seven-a-side fantasy series. Entries open soon.',
  },
];

export function playersFor(competitionId: string): Player[] {
  const comp = COMPETITIONS.find((c) => c.id === competitionId);
  if (!comp) return [];
  return PLAYERS.filter((p) => p.sport === comp.sport);
}
