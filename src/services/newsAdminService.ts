// News moderation & composing — service layer (Sports Data & Statistics Admin).
//
// newsService.ts is real but read-only (GET /news/, GET /news/:id/) — there
// is no write/moderation endpoint on the backend yet, and club submission
// (ClubNewsPage.tsx) was previously entirely disconnected local state. This
// service is mock-backed (in-memory), following the same convention as
// sportsDataService.ts / fantasyAdminService.ts before it went real: typed
// functions, realistic shapes, ready for a real-backend swap later.
//
// It merges real backend stories with mock club-submitted/staff-composed
// ones so admin actions (approve, feature, trend, compose) are visible
// immediately on the public/fan News pages — the same pattern already used
// for markets before its backend existed.

import { fetchNews, fetchFullStory } from './newsService';
import type { Story, FullStory } from './newsService';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type NewsStatus = 'pending' | 'approved' | 'rejected';
export type NewsSource = 'club' | 'staff';

export interface AdminStory extends Story {
  isTrending: boolean;
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

const PLACEHOLDER_IMAGE = '/images/stadium-bg.png';
const PLACEHOLDER_AVATAR = '/logos/logo.png';
const MAX_TRENDING = 5;

function generateId(): string {
  return `news-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// In-memory mock store — club submissions + staff-composed stories.
let mockStories: AdminStory[] = [
  {
    id: 'news-mock-1',
    category: 'Football',
    time: '5h ago',
    image: '/clubs/vipers-sc.png',
    title: "Vipers SC announce new signing ahead of derby",
    description:
      "Vipers SC have confirmed the signing of a new midfielder ahead of this weekend's crucial title-race fixture.",
    body:
      "Vipers SC have confirmed the signing of a new midfielder ahead of this weekend's crucial title-race fixture.\n\n" +
      'The club says the player will be available for selection immediately, strengthening squad depth heading into a demanding run of matches.',
    author: 'Vipers SC',
    avatar: '/clubs/vipers-sc.png',
    isFeatured: false,
    isTrending: false,
    status: 'pending',
    source: 'club',
    submittedBy: 'Vipers SC',
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'news-mock-2',
    category: 'Rugby',
    time: '1d ago',
    image: '/clubs/black-pirates.png',
    title: 'Black Pirates open new training facility',
    description:
      "Black Pirates RFC have opened a new state-of-the-art training facility to support the club's growing youth programme.",
    body:
      "Black Pirates RFC have opened a new state-of-the-art training facility to support the club's growing youth programme.\n\n" +
      'The facility includes a full-size pitch, gym, and recovery suite, and will be used by both the senior squad and academy sides.',
    author: 'Black Pirates',
    avatar: '/clubs/black-pirates.png',
    isFeatured: false,
    isTrending: false,
    status: 'pending',
    source: 'club',
    submittedBy: 'Black Pirates',
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Overrides for real backend stories' isFeatured/isTrending — can't PATCH
// the real backend yet, but toggles should still be visible in this session.
const realStoryOverrides = new Map<string, { isFeatured?: boolean; isTrending?: boolean }>();

function applyOverride(story: Story): AdminStory {
  const override = realStoryOverrides.get(story.id);
  return {
    ...story,
    isFeatured: override?.isFeatured ?? story.isFeatured,
    isTrending: override?.isTrending ?? false,
    status: 'approved',
    source: 'staff',
  };
}

function countTrending(): number {
  const mockCount = mockStories.filter((s) => s.status === 'approved' && s.isTrending).length;
  const overrideCount = [...realStoryOverrides.values()].filter((o) => o.isTrending).length;
  return mockCount + overrideCount;
}

function clearFeaturedElsewhere(id: string) {
  for (const story of mockStories) {
    if (story.id !== id) story.isFeatured = false;
  }
  for (const [key, value] of realStoryOverrides) {
    if (key !== id && value.isFeatured) realStoryOverrides.set(key, { ...value, isFeatured: false });
  }
}

export async function fetchNewsQueue(): Promise<AdminStory[]> {
  return delay(mockStories.filter((s) => s.status === 'pending'));
}

export async function fetchApprovedStories(): Promise<AdminStory[]> {
  const real = await fetchNews();
  const realMapped = real.map(applyOverride);
  const mockApproved = mockStories.filter((s) => s.status === 'approved');
  return delay([...mockApproved, ...realMapped]);
}

export async function fetchFullStoryMerged(id: string): Promise<(FullStory & { isTrending?: boolean }) | null> {
  const mockStory = mockStories.find((s) => s.id === id && s.status === 'approved');
  if (mockStory) {
    return delay({
      ...mockStory,
      body: mockStory.body ?? mockStory.description,
      publishedAt: mockStory.time,
    });
  }
  return fetchFullStory(id);
}

export async function submitClubStory(clubName: string, payload: ComposeStoryPayload): Promise<AdminStory> {
  const story: AdminStory = {
    id: generateId(),
    category: payload.category,
    time: 'Just now',
    image: payload.image || PLACEHOLDER_IMAGE,
    title: payload.title,
    description: payload.description,
    body: payload.body,
    author: clubName,
    avatar: PLACEHOLDER_AVATAR,
    isFeatured: false,
    isTrending: false,
    status: 'pending',
    source: 'club',
    submittedBy: clubName,
    submittedAt: new Date().toISOString(),
  };
  mockStories = [story, ...mockStories];
  return delay(story, 400);
}

export async function composeStory(payload: ComposeStoryPayload): Promise<AdminStory> {
  const story: AdminStory = {
    id: generateId(),
    category: payload.category,
    time: 'Just now',
    image: payload.image || PLACEHOLDER_IMAGE,
    title: payload.title,
    description: payload.description,
    body: payload.body,
    author: 'LeagueOS Staff',
    avatar: PLACEHOLDER_AVATAR,
    isFeatured: false,
    isTrending: false,
    status: 'approved',
    source: 'staff',
    submittedAt: new Date().toISOString(),
  };
  mockStories = [story, ...mockStories];
  return delay(story, 400);
}

export async function approveStory(
  id: string,
  options?: { isFeatured?: boolean; isTrending?: boolean },
): Promise<AdminStory> {
  const story = mockStories.find((s) => s.id === id);
  if (!story) throw new Error('Story not found.');

  story.status = 'approved';
  if (options?.isFeatured) {
    clearFeaturedElsewhere(id);
    story.isFeatured = true;
  }
  if (options?.isTrending && countTrending() < MAX_TRENDING) {
    story.isTrending = true;
  }
  return delay({ ...story }, 400);
}

export async function rejectStory(id: string, reason: string): Promise<AdminStory> {
  const story = mockStories.find((s) => s.id === id);
  if (!story) throw new Error('Story not found.');

  story.status = 'rejected';
  story.rejectionReason = reason;
  return delay({ ...story }, 400);
}

export async function setFeatured(id: string): Promise<void> {
  clearFeaturedElsewhere(id);
  const mockStory = mockStories.find((s) => s.id === id);
  if (mockStory) {
    mockStory.isFeatured = true;
  } else {
    const existing = realStoryOverrides.get(id) ?? {};
    realStoryOverrides.set(id, { ...existing, isFeatured: true });
  }
  await delay(undefined, 300);
}

export async function toggleTrending(id: string): Promise<{ ok: boolean; reason?: string }> {
  const mockStory = mockStories.find((s) => s.id === id);
  const isCurrentlyTrending = mockStory ? mockStory.isTrending : (realStoryOverrides.get(id)?.isTrending ?? false);

  if (!isCurrentlyTrending && countTrending() >= MAX_TRENDING) {
    return delay({ ok: false, reason: `Only ${MAX_TRENDING} stories can be marked Trending at once — untoggle one first.` }, 200);
  }

  if (mockStory) {
    mockStory.isTrending = !mockStory.isTrending;
  } else {
    const existing = realStoryOverrides.get(id) ?? {};
    realStoryOverrides.set(id, { ...existing, isTrending: !isCurrentlyTrending });
  }
  return delay({ ok: true }, 200);
}
