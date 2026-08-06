// News — service layer (mock, pending a real backend endpoint).
//
// Same pattern as sportsDataService.ts: every export is async and resolves
// against in-memory mock data via a simulated-latency helper, so the shape
// matches what a real backend integration will need later. This is the
// canonical source for News content — NewsPage.tsx and the global Search
// feature both read from here rather than each keeping their own copy.

export interface Story {
  id: string;
  category: 'Football' | 'Rugby' | 'Basketball' | 'Clubs' | 'Markets' | 'Fantasy';
  time: string;
  image: string;
  title: string;
  description: string;
  author: string;
  avatar: string;
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const stories: Story[] = [
  {
    id: 's1',
    category: 'Football',
    time: '2h ago',
    image: '/images/vipersvs.jfif',
    title: 'Vipers edge KCCA in title race clash',
    description:
      "A late strike from Allan Okello sealed all three points for Vipers SC in a tense encounter at St. Mary's Stadium.",
    author: 'Brian Ssempijja',
    avatar: 'https://i.pravatar.cc/40?img=12',
  },
  {
    id: 's2',
    category: 'Rugby',
    time: '4h ago',
    image: '/images/rugby-cranes.jfif',
    title: 'Rugby Cranes begin preparations for regional championship',
    description:
      'The national side has entered a two-week training camp ahead of the Africa Cup qualifiers next month.',
    author: 'Ivan Mugisha',
    avatar: 'https://i.pravatar.cc/40?img=33',
  },
  {
    id: 's3',
    category: 'Basketball',
    time: '5h ago',
    image: '/images/city-oilers.jfif',
    title: 'City Oilers chase another statement win',
    description:
      'City Oilers look to extend their winning run in the NBL Uganda against a resurgent Namuwongo Blazers side.',
    author: 'Gloria Nankya',
    avatar: 'https://i.pravatar.cc/40?img=45',
  },
  {
    id: 's4',
    category: 'Fantasy',
    time: '6h ago',
    image: '/images/fantasy.jfif',
    title: 'Fantasy tips for Gameweek 28',
    description:
      'Top picks, differential players and captain shouts for a big Gameweek in the Uganda Premier League.',
    author: 'Fantasy Guru',
    avatar: 'https://i.pravatar.cc/40?img=8',
  },
  {
    id: 's5',
    category: 'Markets',
    time: '7h ago',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop',
    title: 'Open markets to watch this week',
    description: 'Key match markets with strong moves and smart money activity across the weekend fixtures.',
    author: 'Market Analyst',
    avatar: 'https://i.pravatar.cc/40?img=15',
  },
  {
    id: 's6',
    category: 'Clubs',
    time: '8h ago',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=600&auto=format&fit=crop',
    title: 'Express FC unveil new home jersey',
    description: 'The Red Eagles reveal their 2024/25 home kit in style.',
    author: 'Nicholas Kasozi',
    avatar: 'https://i.pravatar.cc/40?img=22',
  },
];

export async function fetchNews(): Promise<Story[]> {
  return delay([...stories]);
}

// No per-article endpoint exists, mock or real — fetch the full list and
// find by id, same approach TicketCheckoutPage.tsx uses for a single
// fixture.
export async function fetchStoryById(id: string): Promise<Story | null> {
  return delay(stories.find((story) => story.id === id) ?? null);
}
