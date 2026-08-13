import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;           // unique cart line id  (productId + size)
  productId: string;
  clubSlug: string;     // which club this product belongs to
  name: string;
  price: string;        // display price, e.g. "UGX 120,000"
  priceValue: number;   // numeric, for totals
  size?: string;
  qty: number;
  color: string;        // accent color for display
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
}

/** Parse "UGX 120,000" → 120000 */
export function parseUGX(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, ''), 10) || 0;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) => {
        const lineId = `${incoming.productId}-${incoming.size ?? 'one-size'}`;
        set((state) => {
          const existing = state.items.find((i) => i.id === lineId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === lineId ? { ...i, qty: i.qty + 1 } : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...incoming, id: lineId, qty: 1 },
            ],
          };
        });
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    {
      name: 'leagueos-cart',
    },
  ),
);
