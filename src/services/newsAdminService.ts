// News moderation & composing — service layer (Sports Data & Statistics Admin).
//
// Adapts the real submit -> review -> publish pipeline in newsService.ts
// (discovery.News, the same model the public/fan News pages read) into the
// AdminStory shape NewsAdmin.tsx and ClubNewsPage.tsx already render.

import {
  approveNewsStory,
  composeAndPublishNews,
  fetchClubNewsSubmissions,
  fetchFullStory,
  fetchNews,
  fetchNewsCategories,
  fetchNewsQueue as fetchQueueRaw,
  rejectNewsStory,
  setNewsFeatured,
  setNewsTrending,
  submitNewsForReview,
  updateNewsStory,
} from './newsService';
import type { FullStory, ModerationArticle, NewsCategoryOption, Story } from './newsService';
import { extractApiError } from './apiUtils';

export type NewsStatus = 'pending' | 'approved' | 'rejected';
export type NewsSource = 'club' | 'staff';

export interface AdminStory extends Story {
  status: NewsStatus;
  source: NewsSource;
  submittedBy?: string;
  submittedAt?: string;
  rejectionReason?: string;
  body?: string;
}

export interface ComposeStoryPayload {
  title: string;
  description: string;
  body: string;
  image: string;
  category: Story['category'];
}

export interface EditStoryPayload {
  title: string;
  description: string;
  body: string;
  category: Story['category'];
}

const PLACEHOLDER_IMAGE = '/images/stadium-bg.png';
const PLACEHOLDER_AVATAR = '/logos/logo.png';

const STATUS_MAP: Record<ModerationArticle['status'], NewsStatus> = {
  DRAFT: 'pending',
  PENDING_APPROVAL: 'pending',
  APPROVED: 'pending',
  PUBLISHED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'rejected',
};

function formatRelativeTime(iso: string): string {
  try {
    const diffMins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return iso;
  }
}

function toAdminStory(article: ModerationArticle): AdminStory {
  return {
    id: article.id,
    category: article.category,
    time: formatRelativeTime(article.publishedAt ?? article.createdAt),
    image: PLACEHOLDER_IMAGE,
    title: article.title,
    description: article.summary,
    body: article.body,
    author: article.createdByName ?? (article.club ? 'Club Staff' : 'LeagueOS Staff'),
    avatar: PLACEHOLDER_AVATAR,
    isFeatured: article.isFeatured,
    isTrending: article.isTrending,
    status: STATUS_MAP[article.status],
    source: article.club ? 'club' : 'staff',
    submittedBy: article.createdByName ?? undefined,
    submittedAt: article.createdAt,
    rejectionReason: article.rejectionReason || undefined,
  };
}

// Resolve a friendly category label ('Football', 'Clubs', …) to a real
// backend category id. Categories are seeded server-side, not owned by this
// form, so an unmatched label (e.g. no dedicated 'Clubs' category exists
// yet) falls back to the first active category rather than blocking the
// submit/compose action outright.
let categoriesCache: NewsCategoryOption[] | null = null;
async function resolveCategoryId(label: Story['category']): Promise<string> {
  if (!categoriesCache) categoriesCache = await fetchNewsCategories();
  if (categoriesCache.length === 0) {
    throw new Error('No news categories are configured yet — ask an admin to add one.');
  }
  const match = categoriesCache.find(
    (c) => c.name.toLowerCase() === label.toLowerCase() || c.code.toLowerCase() === label.toLowerCase(),
  );
  return (match ?? categoriesCache[0]).id;
}

export async function fetchNewsQueue(): Promise<AdminStory[]> {
  const queue = await fetchQueueRaw();
  return queue.map(toAdminStory);
}

// Public feed (GET /news/) — the same source public/fan pages render, so
// "Published Stories" here is always exactly what's actually live.
export async function fetchApprovedStories(): Promise<AdminStory[]> {
  const stories = await fetchNews();
  return stories.map((story) => ({
    ...story,
    status: 'approved' as const,
    source: 'staff' as const,
  }));
}

export async function fetchClubSubmissions(clubId: string): Promise<AdminStory[]> {
  const submissions = await fetchClubNewsSubmissions(clubId);
  return submissions.map(toAdminStory);
}

export async function fetchFullStoryMerged(id: string): Promise<(FullStory & { isTrending?: boolean }) | null> {
  return fetchFullStory(id);
}

export async function submitClubStory(clubId: string, clubName: string, payload: ComposeStoryPayload): Promise<AdminStory> {
  const categoryId = await resolveCategoryId(payload.category);
  const article = await submitNewsForReview(clubId, {
    title: payload.title,
    summary: payload.description,
    body: payload.body,
    categoryId,
  });
  return { ...toAdminStory(article), author: clubName, submittedBy: clubName };
}

export async function composeStory(payload: ComposeStoryPayload): Promise<AdminStory> {
  const categoryId = await resolveCategoryId(payload.category);
  const article = await composeAndPublishNews({
    title: payload.title,
    summary: payload.description,
    body: payload.body,
    categoryId,
  });
  return toAdminStory(article);
}

export async function updateStory(id: string, payload: EditStoryPayload): Promise<AdminStory> {
  const categoryId = await resolveCategoryId(payload.category);
  const article = await updateNewsStory(id, {
    title: payload.title,
    summary: payload.description,
    body: payload.body,
    categoryId,
  });
  return toAdminStory(article);
}

export async function approveStory(
  id: string,
  options?: { isFeatured?: boolean; isTrending?: boolean },
): Promise<AdminStory> {
  const article = await approveNewsStory(id, { isTopStory: options?.isFeatured, isTrending: options?.isTrending });
  return toAdminStory(article);
}

export async function rejectStory(id: string, reason: string): Promise<AdminStory> {
  const article = await rejectNewsStory(id, reason);
  return toAdminStory(article);
}

export async function setFeatured(id: string): Promise<void> {
  await setNewsFeatured(id, true);
}

export async function toggleTrending(id: string, nextValue: boolean): Promise<{ ok: boolean; reason?: string }> {
  try {
    await setNewsTrending(id, nextValue);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, reason: extractApiError(err).message };
  }
}
