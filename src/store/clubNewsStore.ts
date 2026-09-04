/**
 * Local article store — persists club news articles to localStorage.
 *
 * Used when there is no real backend club (demo / dev mode).
 * In production the ClubNewsPage fetches from the real API via
 * newsAdminService and this store is bypassed.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ArticleStatus = 'published' | 'pending' | 'rejected' | 'scheduled' | 'draft' | 'archived';

export interface PersistedArticle {
  id: string;
  clubScopeId: string | number;   // scope_id of the club entitlement
  title: string;
  type: string;
  date: string;
  author: string;
  reads: string;
  status: ArticleStatus;
  body: string;
  coverImage: string;
  createdAt: number;
}

interface ClubNewsStore {
  articles: PersistedArticle[];
  addArticle: (article: PersistedArticle) => void;
  updateArticle: (id: string, updates: Partial<PersistedArticle>) => void;
  deleteArticle: (id: string) => void;
  getArticlesForClub: (scopeId: string | number) => PersistedArticle[];
}

export const useClubNewsStore = create<ClubNewsStore>()(
  persist(
    (set, get) => ({
      articles: [],

      addArticle: (article) =>
        set((state) => ({ articles: [article, ...state.articles] })),

      updateArticle: (id, updates) =>
        set((state) => ({
          articles: state.articles.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      deleteArticle: (id) =>
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
        })),

      getArticlesForClub: (scopeId) =>
        get().articles.filter((a) => String(a.clubScopeId) === String(scopeId)),
    }),
    { name: 'leagueos-club-news' },
  ),
);
