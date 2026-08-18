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
  club?: string | null;
  isFeatured: boolean;
  isTrending: boolean;
}

// ---------------------------------------------------------------------------
// Backend response shape (GET /api/v1/news/)
// ---------------------------------------------------------------------------
interface BackendStory {
  id: number | string;
  title: string;
  summary: string;
  category: string;
  category_code?: string | null;
  category_name?: string | null;
  published_at: string;
  image?: string | null;
  avatar?: string | null;
  author?: string | null;
  club?: string | null;
  is_featured?: boolean;
  is_trending?: boolean;
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

type CategorySource = string | { category: string; category_code?: string | null; category_name?: string | null };

export function toCategory(raw: CategorySource): Story['category'] {
  const candidate = typeof raw === 'string'
    ? raw
    : raw.category_code ?? raw.category_name ?? raw.category;
  const normalised = candidate.trim().toLowerCase().replace(/[_-]+/g, ' ');
  const map: Record<string, Story['category']> = {
    football: 'Football',
    rugby: 'Rugby',
    basketball: 'Basketball',
    clubs: 'Clubs',
    club: 'Clubs',
    'club news': 'Clubs',
    markets: 'Markets',
    market: 'Markets',
    fantasy: 'Fantasy',
    // Legacy UUID-based matches.
    '7735c4d2-c3d6-47db-80ef-61ce47a9ea14': 'Football',
    'c6b4df47-2cc2-4c2f-a73a-a03979e1ba0e': 'Rugby',
    '4042ff60-b6b5-4d4a-8f58-84f41966b81c': 'Basketball',
  };
  return map[normalised]
    ?? map[candidate]
    ?? (VALID_CATEGORIES.has(candidate as Story['category']) ? (candidate as Story['category']) : 'Clubs');
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
  const category = toCategory(raw);
  return {
    id: String(raw.id),
    title: raw.title,
    description: raw.summary,
    category,
    time: formatTime(raw.published_at),
    image: raw.image || storyPlaceholder(category),
    author: raw.author || DEFAULT_AUTHOR,
    avatar: raw.avatar || PLACEHOLDER_AVATAR,
    club: raw.club ?? null,
    isFeatured: raw.is_featured ?? false,
    isTrending: raw.is_trending ?? false,
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

// ---------------------------------------------------------------------------
// News moderation — real submit -> review -> publish pipeline.
// Club submissions hit clubs/urls.py (`/<club_pk>/news-submissions/`); the
// review queue and every moderation action hit platform_admin/urls.py
// (`/admin/news/...`), gated by the view_news / manage_news permissions.
// ---------------------------------------------------------------------------

export interface NewsCategoryOption {
  id: string;
  code: string;
  name: string;
}

let cachedCategories: NewsCategoryOption[] | null = null;

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** Active, selectable news categories — cached for the session. */
export async function fetchNewsCategories(): Promise<NewsCategoryOption[]> {
  if (cachedCategories) return cachedCategories;
  const response = await apiClient.get<NewsCategoryOption[] | { results: NewsCategoryOption[] }>('/news-categories/');
  cachedCategories = unwrapList(response.data);
  return cachedCategories;
}

export type ModerationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface ModerationArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: Story['category'];
  club: string | null;
  image: string | null;
  author: string | null;
  avatar: string | null;
  status: ModerationStatus;
  isFeatured: boolean;
  isTrending: boolean;
  rejectionReason: string;
  publishedAt: string | null;
  createdAt: string;
  createdByName: string | null;
}

interface BackendModerationArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  category_code?: string | null;
  category_name?: string | null;
  club: string | null;
  image?: string | null;
  author?: string | null;
  avatar?: string | null;
  status: ModerationStatus;
  is_featured: boolean;
  is_trending: boolean;
  rejection_reason: string;
  published_at: string | null;
  created_at: string;
  created_by: { id: string; name: string } | null;
}

function mapModerationArticle(raw: BackendModerationArticle): ModerationArticle {
  return {
    id: String(raw.id),
    title: raw.title,
    summary: raw.summary,
    body: raw.body ?? '',
    category: toCategory({ category: raw.category, category_code: raw.category_code ?? null, category_name: raw.category_name ?? null }),
    club: raw.club,
    image: raw.image ?? null,
    author: raw.author ?? null,
    avatar: raw.avatar ?? null,
    status: raw.status,
    isFeatured: raw.is_featured,
    isTrending: raw.is_trending,
    rejectionReason: raw.rejection_reason ?? '',
    publishedAt: raw.published_at,
    createdAt: raw.created_at,
    createdByName: raw.created_by?.name ?? null,
  };
}

export interface NewsSubmissionInput {
  title: string;
  summary: string;
  body: string;
  image?: string;
  author?: string;
  avatar?: string;
  categoryId: string;
}

/** Club staff submitting a story into the moderation queue. */
export async function submitNewsForReview(clubId: string, input: NewsSubmissionInput): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>(`/${encodeURIComponent(clubId)}/news-submissions/`, {
    title: input.title,
    summary: input.summary,
    body: input.body,
    image: input.image ?? '',
    author: input.author ?? '',
    avatar: input.avatar ?? '',
    category: input.categoryId,
  });
  return mapModerationArticle(response.data);
}

/** A club's own submissions, any status — for the club news page's real list. */
export async function fetchClubNewsSubmissions(clubId: string): Promise<ModerationArticle[]> {
  const response = await apiClient.get<BackendModerationArticle[] | { results: BackendModerationArticle[] }>(
    `/${encodeURIComponent(clubId)}/news-submissions/`,
  );
  return unwrapList(response.data).map(mapModerationArticle);
}

/** Staff (Sports Data / Super Admin) composing and publishing directly. */
export async function composeAndPublishNews(input: NewsSubmissionInput): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>('/admin/news/', {
    title: input.title,
    summary: input.summary,
    body: input.body,
    image: input.image ?? '',
    author: input.author ?? '',
    avatar: input.avatar ?? '',
    category: input.categoryId,
  });
  return mapModerationArticle(response.data);
}

/** Articles awaiting review (Sports Data / Super Admin). */
export async function fetchNewsQueue(): Promise<ModerationArticle[]> {
  const response = await apiClient.get<BackendModerationArticle[] | { results: BackendModerationArticle[] }>('/admin/news/queue/');
  return unwrapList(response.data).map(mapModerationArticle);
}

/** Live published articles, with full moderation detail (status/club/etc). */
export async function fetchPublishedNewsAdmin(): Promise<ModerationArticle[]> {
  const response = await apiClient.get<BackendModerationArticle[] | { results: BackendModerationArticle[] }>('/admin/news/published/');
  return unwrapList(response.data).map(mapModerationArticle);
}

export interface NewsEditInput {
  title?: string;
  summary?: string;
  body?: string;
  image?: string;
  author?: string;
  avatar?: string;
  categoryId?: string;
}

/** Edit Story — save changes before (or after) approval. */
export async function updateNewsStory(id: string, input: NewsEditInput): Promise<ModerationArticle> {
  const payload: Record<string, string> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.summary !== undefined) payload.summary = input.summary;
  if (input.body !== undefined) payload.body = input.body;
  if (input.image !== undefined) payload.image = input.image;
  if (input.author !== undefined) payload.author = input.author;
  if (input.avatar !== undefined) payload.avatar = input.avatar;
  if (input.categoryId !== undefined) payload.category = input.categoryId;

  const response = await apiClient.patch<BackendModerationArticle>(`/admin/news/${encodeURIComponent(id)}/`, payload);
  return mapModerationArticle(response.data);
}

/** Approve a pending article, optionally as Top Story and/or Trending. */
export async function approveNewsStory(
  id: string,
  options?: { isTopStory?: boolean; isTrending?: boolean },
): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>(`/admin/news/${encodeURIComponent(id)}/approve/`, {
    is_top_story: options?.isTopStory ?? false,
    is_trending: options?.isTrending ?? false,
  });
  return mapModerationArticle(response.data);
}

/** Reject a pending article — it never appears on the public feed. */
export async function rejectNewsStory(id: string, reason: string): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>(`/admin/news/${encodeURIComponent(id)}/reject/`, { reason });
  return mapModerationArticle(response.data);
}

/** Standalone Top Story toggle for an already-published article. */
export async function setNewsFeatured(id: string, isFeatured: boolean): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>(`/admin/news/${encodeURIComponent(id)}/set-featured/`, {
    is_featured: isFeatured,
  });
  return mapModerationArticle(response.data);
}

/** Standalone Trending toggle for an already-published article. */
export async function setNewsTrending(id: string, isTrending: boolean): Promise<ModerationArticle> {
  const response = await apiClient.post<BackendModerationArticle>(`/admin/news/${encodeURIComponent(id)}/set-trending/`, {
    is_trending: isTrending,
  });
  return mapModerationArticle(response.data);
}
