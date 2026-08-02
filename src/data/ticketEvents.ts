export type Sport = 'Football' | 'Rugby' | 'Basketball';

export type TicketEvent = {
  id: string;
  sport: Sport;
  league: string;
  date: string;
  time: string;
  teamA: string;
  teamB: string;
  crestA?: string;
  crestB?: string;
  venue: string;
  city: string;
  priceFrom: number;
  featured?: boolean;
  popular?: boolean;
};

export const TICKET_EVENTS: TicketEvent[] = [
  {
    id: 'vipers-kcca',
    sport: 'Football',
    league: 'Uganda Premier League',
    date: 'Sat, May 24',
    time: '4:00 PM',
    teamA: 'Vipers SC',
    teamB: 'KCCA FC',
    crestA: '/clubs/vipers-sc.png',
    crestB: '/clubs/kcca-fc.png',
    venue: "St. Mary's Stadium",
    city: 'Kampala',
    priceFrom: 10000,
    featured: true,
  },
  {
    id: 'city-oilers-ucu-canons',
    sport: 'Basketball',
    league: 'NBL Uganda',
    date: 'Sat, May 24',
    time: '7:00 PM',
    teamA: 'City Oilers',
    teamB: 'UCU Canons',
    crestA: '/clubs/city-oilers.png',
    venue: 'Lugogo Indoor Arena',
    city: 'Kampala',
    priceFrom: 50000,
    featured: true,
  },
  {
    id: 'kobs-black-pirates',
    sport: 'Rugby',
    league: 'Nile Special Rugby League',
    date: 'Sun, May 25',
    time: '3:00 PM',
    teamA: 'KOBS',
    teamB: 'Black Pirates',
    crestA: '/clubs/kobs.jpg',
    crestB: '/clubs/black-pirates.png',
    venue: 'Kings Park Arena',
    city: 'Bweyogerere',
    priceFrom: 25000,
    featured: true,
  },
  {
    id: 'sc-villa-bul-fc',
    sport: 'Football',
    league: 'Uganda Premier League',
    date: 'Sun, May 25',
    time: '4:30 PM',
    teamA: 'SC Villa',
    teamB: 'BUL FC',
    crestA: '/clubs/sc-villa.png',
    venue: 'Mutesa II Stadium',
    city: 'Kampala',
    priceFrom: 10000,
    popular: true,
  },
  {
    id: 'express-onduparaka',
    sport: 'Football',
    league: 'Uganda Premier League',
    date: 'Mon, May 26',
    time: '7:30 PM',
    teamA: 'Express FC',
    teamB: 'Onduparaka FC',
    crestA: '/clubs/express-fc.png',
    venue: 'Wankulukuku Stadium',
    city: 'Kampala',
    priceFrom: 10000,
  },
  {
    id: 'rams-impis',
    sport: 'Rugby',
    league: 'Nile Special Rugby League',
    date: 'Sat, May 24',
    time: '3:00 PM',
    teamA: 'Rams RFC',
    teamB: 'Impis RFC',
    crestB: '/clubs/impis-rfc.jpg',
    venue: 'Legends Rugby Club',
    city: 'Kampala',
    priceFrom: 20000,
    popular: true,
  },
  {
    id: 'kiu-titans-power',
    sport: 'Basketball',
    league: 'NBL Uganda',
    date: 'Sun, May 25',
    time: '6:00 PM',
    teamA: 'KIU Titans',
    teamB: 'Power BC',
    venue: 'Lugogo Indoor Arena',
    city: 'Kampala',
    priceFrom: 40000,
    popular: true,
  },
  {
    id: 'maroons-arua-hill',
    sport: 'Football',
    league: 'Uganda Premier League',
    date: 'Sat, May 24',
    time: '5:00 PM',
    teamA: 'Maroons FC',
    teamB: 'Arua Hill SC',
    venue: 'Prisons Ground',
    city: 'Luzira',
    priceFrom: 10000,
    popular: true,
  },
];

const FEATURED_ORDER = ['vipers-kcca', 'kobs-black-pirates', 'city-oilers-ucu-canons'];
export const FEATURED_EVENTS = FEATURED_ORDER.map(
  (id) => TICKET_EVENTS.find((event) => event.id === id)!,
);
export const POPULAR_EVENTS = TICKET_EVENTS.filter((event) => event.popular);

export function getLeagueSlug(league: string): 'upl' | 'nile' | 'nbl' {
  if (league === 'Nile Special Rugby League') return 'nile';
  if (league === 'NBL Uganda') return 'nbl';
  return 'upl';
}

export function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString('en-US')}`;
}
