/**
 * Shared product store — written by Club Admin, read by the public store pages.
 *
 * Persisted to localStorage so products survive a page refresh in dev.
 * In production this would be replaced by API calls.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CategorySlug } from '../pages/landing/store/sections/shopCategories';

export interface StoreProduct {
  id: string;
  clubSlug: string;       // e.g. "kcca-fc"
  clubName: string;       // e.g. "KCCA FC"
  name: string;
  category: CategorySlug; // matches the ShopByCategory filter slugs
  price: string;          // display price, e.g. "UGX 120,000"
  priceValue: number;     // numeric for sorting / cart
  originalPrice?: string;
  description?: string;
  sku?: string;
  stock: number;
  image?: string;         // base64 data URL or remote URL
  badge?: string;         // e.g. "NEW" or "-15%"
  sizes?: string[];
  accentColor: string;    // used as product card background
  createdAt: number;      // Date.now() timestamp for sorting
}

interface ClubProductStore {
  products: StoreProduct[];
  addProduct: (product: StoreProduct) => void;
  updateProduct: (id: string, updates: Partial<StoreProduct>) => void;
  removeProduct: (id: string) => void;
}

export const useClubProductStore = create<ClubProductStore>()(
  persist(
    (set) => ({
      products: [],

      addProduct: (product) =>
        set((state) => ({ products: [product, ...state.products] })),

      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
    }),
    { name: 'leagueos-club-products' },
  ),
);

/** Map the club admin category name → CategorySlug */
export function toCategorySlug(cat: string): CategorySlug {
  const map: Record<string, CategorySlug> = {
    Apparel:     'jerseys',
    'Fan Gear':  'fan-gear',
    Training:    'training-wear',
    Accessories: 'accessories',
    Other:       'fan-gear',
  };
  return map[cat] ?? 'fan-gear';
}

/** Derive a URL-safe slug from a display name, e.g. "KCCA FC" → "kcca-fc" */
export function nameToSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Category accent colours used when no image is uploaded */
export const CATEGORY_COLORS: Record<CategorySlug, string> = {
  all:           '#7c3aed',
  jerseys:       '#dc2626',
  'training-wear': '#1e3a8a',
  caps:          '#18181b',
  accessories:   '#ca8a04',
  'fan-gear':    '#7f1d1d',
};
