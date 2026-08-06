// Players — service layer (mock, greenfield).
//
// No real backend endpoint or usable mock data exists for players anywhere
// in the app yet. Same pattern as sportsDataService.ts: every export is
// async and resolves against in-memory mock data via a simulated-latency
// helper, so swapping this for a real endpoint later is a drop-in
// replacement — no component changes required.

export type Sport = 'Football' | 'Rugby' | 'Basketball';

export interface Player {
  id: string;
  name: string;
  club: string;
  sport: Sport;
  position: string;
  nationality?: string;
  photoUrl?: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const players: Player[] = [
  { id: 'p1', name: 'Allan Okello', club: 'Vipers SC', sport: 'Football', position: 'Midfielder', nationality: 'Uganda' },
  { id: 'p2', name: 'Milton Karisa', club: 'Vipers SC', sport: 'Football', position: 'Forward', nationality: 'Uganda' },
  { id: 'p3', name: 'Bevis Mugabi', club: 'KCCA FC', sport: 'Football', position: 'Defender', nationality: 'Uganda' },
  { id: 'p4', name: 'Muzamiru Mutyaba', club: 'KCCA FC', sport: 'Football', position: 'Forward', nationality: 'Uganda' },
  { id: 'p5', name: 'Halid Lwaliwa', club: 'Express FC', sport: 'Football', position: 'Defender', nationality: 'Uganda' },
  { id: 'p6', name: 'Aucho Denis', club: 'Express FC', sport: 'Football', position: 'Midfielder', nationality: 'Uganda' },
  { id: 'p7', name: 'Fahad Islam', club: 'SC Villa', sport: 'Football', position: 'Goalkeeper', nationality: 'Uganda' },
  { id: 'p8', name: 'Isaac Ssemwogerere', club: 'SC Villa', sport: 'Football', position: 'Midfielder', nationality: 'Uganda' },
  { id: 'p9', name: 'Jimmy Enabu', club: 'City Oilers', sport: 'Basketball', position: 'Guard', nationality: 'Uganda' },
  { id: 'p10', name: 'Robinson Odoch', club: 'City Oilers', sport: 'Basketball', position: 'Forward', nationality: 'Uganda' },
  { id: 'p11', name: 'Ivan Muhwezi', club: 'UCU Canons', sport: 'Basketball', position: 'Center', nationality: 'Uganda' },
  { id: 'p12', name: 'Deng Deng', club: 'UCU Canons', sport: 'Basketball', position: 'Point Guard', nationality: 'Uganda' },
  { id: 'p13', name: 'Pius Ogena', club: 'KOBS', sport: 'Rugby', position: 'Fly-half', nationality: 'Uganda' },
  { id: 'p14', name: 'Philip Wokorach', club: 'KOBS', sport: 'Rugby', position: 'Wing', nationality: 'Uganda' },
  { id: 'p15', name: 'Michael Wanambwa', club: 'Black Pirates', sport: 'Rugby', position: 'Prop', nationality: 'Uganda' },
  { id: 'p16', name: 'Adrian Kasito', club: 'Black Pirates', sport: 'Rugby', position: 'Lock', nationality: 'Uganda' },
];

export async function fetchPlayers(): Promise<Player[]> {
  return delay([...players]);
}
