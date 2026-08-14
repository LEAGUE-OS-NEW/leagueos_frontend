// News — service layer.
//
// Fetches from GET /api/v1/news/ and maps the backend shape to the Story
// interface consumed by NewsPage.tsx, ArticleDetail.tsx, and the global
// Search feature. Returns an empty array when the backend is unavailable
// so the UI shows its empty/error state rather than stale mock content.

import apiClient from './apiClient';

export interface Story {
  id: string;
  category: 'Football' | 'Rugby' | 'Basketball' | 'Clubs' | 'Markets' | 'Fantasy';
  time: string;
  image: string;
  title: string;
  description: string;
  author: string;
  avatar: string;
  isFeatured: boolean;
}

// ---------------------------------------------------------------------------
// Backend response shape (GET /api/v1/news/)
// ---------------------------------------------------------------------------
interface BackendStory {
  id: number | string;
  title: string;
  summary: string;
  category: string;
  published_at: string;
  image?: string | null;
  avatar?: string | null;
  author?: string | null;
  is_featured?: boolean;
}

// ---------------------------------------------------------------------------
// Sport-specific placeholder images.
// Used when the backend does not supply an image for a story.
// Real uploaded images are always displayed as-is.
// ---------------------------------------------------------------------------
const NEWS_PLACEHOLDER: Record<Story['category'], string> = {
  Football:   '/images/news/football-placeholder.jpg',
  Rugby:      '/images/news/rugby-placeholder.jpg',
  Basketball: '/images/news/basketball-placeholder.jpg',
  Clubs:      '/images/news/news-placeholder.jpg',
  Markets:    '/images/news/news-placeholder.jpg',
  Fantasy:    '/images/news/news-placeholder.jpg',
};

/** Returns a sport-appropriate placeholder when a story has no real image. */
function storyPlaceholder(category: Story['category']): string {
  return NEWS_PLACEHOLDER[category] ?? '/images/news/news-placeholder.jpg';
}
const PLACEHOLDER_AVATAR = '/logos/logo.png';
const DEFAULT_AUTHOR = 'LeagueOS';

// Known categories the frontend understands; anything else becomes 'Clubs'.
const VALID_CATEGORIES = new Set<Story['category']>([
  'Football', 'Rugby', 'Basketball', 'Clubs', 'Markets', 'Fantasy',
]);

function toCategory(raw: string): Story['category'] {
  const normalised = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  // Handle common variations
  const map: Record<string, Story['category']> = {
    // Label-based matches (backend may send string names)
    Football: 'Football',
    Rugby: 'Rugby',
    Basketball: 'Basketball',
    Clubs: 'Clubs',
    Club: 'Clubs',
    Markets: 'Markets',
    Market: 'Markets',
    Fantasy: 'Fantasy',
    // UUID-based matches (current backend sends category IDs)
    '7735c4d2-c3d6-47db-80ef-61ce47a9ea14': 'Football',
    'c6b4df47-2cc2-4c2f-a73a-a03979e1ba0e': 'Rugby',
    '4042ff60-b6b5-4d4a-8f58-84f41966b81c': 'Basketball',
  };
  // Check raw first (covers UUIDs), then normalised (covers label strings).
  return map[raw] ?? map[normalised] ?? (VALID_CATEGORIES.has(normalised as Story['category']) ? (normalised as Story['category']) : 'Clubs');
}

function formatTime(iso: string): string {
  try {
    const published = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - published.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return published.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function mapStory(raw: BackendStory): Story {
  const category = toCategory(raw.category);
  return {
    id: String(raw.id),
    title: raw.title,
    description: raw.summary,
    category,
    time: formatTime(raw.published_at),
    image: raw.image || storyPlaceholder(category),
    author: raw.author || DEFAULT_AUTHOR,
    avatar: raw.avatar || PLACEHOLDER_AVATAR,
    isFeatured: raw.is_featured ?? false,
  };
}

// Cache the last successful fetch so fetchStoryById can resolve without a
// second round-trip.
let cachedStories: Story[] | null = null;

export async function fetchNews(): Promise<Story[]> {
  try {
    const response = await apiClient.get<BackendStory[] | { results: BackendStory[] }>('/news/');
    // Handle both plain array and DRF paginated { results: [] } shapes.
    const raw: BackendStory[] = Array.isArray(response.data)
      ? response.data
      : (response.data as { results: BackendStory[] }).results ?? [];
    const mapped = raw.map(mapStory);
    cachedStories = mapped;
    return mapped;
  } catch {
    // Backend unreachable — return empty array so the UI shows its own
    // empty/error state instead of stale mock content.
    cachedStories = null;
    return [];
  }
}

// Fetch the full list (or use cache) and find the story by id.
// This avoids a separate per-article endpoint while keeping ArticleDetail
// working as-is.
export async function fetchStoryById(id: string): Promise<Story | null> {
  const stories = cachedStories ?? await fetchNews();
  return stories.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Full article — GET /api/v1/news/<id>/
// ---------------------------------------------------------------------------

/** Backend shape returned by the single-article endpoint. */
interface BackendFullStory extends BackendStory {
  body?: string | null;
}

/** Story extended with the full article body and a formatted publish date. */
export interface FullStory extends Story {
  body: string;
  publishedAt: string; // human-readable, e.g. "12 Aug 2026"
}

function mapFullStory(raw: BackendFullStory): FullStory {
  const base = mapStory(raw);
  let publishedAt = base.time;
  try {
    publishedAt = new Date(raw.published_at).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    // leave as formatted time
  }
  return {
    ...base,
    body: raw.body?.trim() || '',
    publishedAt,
  };
}

/**
 * Fetch a single article by ID from GET /api/v1/news/<id>/.
 * Returns null when the article is not found (404).
 * Throws on other network / server errors so the caller can show an error state.
 */
export async function fetchFullStory(id: string): Promise<FullStory | null> {
  try {
    const response = await apiClient.get<BackendFullStory>(`/news/${id}/`);
    return mapFullStory(response.data);
  } catch (err: unknown) {
    // 404 → article not found
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}
