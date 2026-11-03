import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthenticatedUser } from '../types/dashboardAccess';

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
  ownerKey: string;
  items: CartItem[];
  cartsByOwner: Record<string, CartItem[]>;
  setCartOwner: (user: AuthenticatedUser | null) => void;
  addItem: (item: Omit<CartItem, 'id' | 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
}

/** Parse "UGX 120,000" -> 120000 */
export function parseUGX(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, ''), 10) || 0;
}

const GUEST_CART_OWNER = 'guest';

export function getCartOwnerKey(user: AuthenticatedUser | null) {
  if (user?.id !== undefined && user.id !== null && String(user.id).trim()) {
    return `user:${String(user.id).trim()}`;
  }

  if (typeof user?.email === 'string' && user.email.trim()) {
    return `email:${user.email.trim().toLowerCase()}`;
  }

  return GUEST_CART_OWNER;
}

function persistOwnerCart(
  cartsByOwner: Record<string, CartItem[]>,
  ownerKey: string,
  items: CartItem[],
) {
  return {
    items,
    cartsByOwner: {
      ...cartsByOwner,
      [ownerKey]: items,
    },
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ownerKey: GUEST_CART_OWNER,
      items: [],
      cartsByOwner: {},

      setCartOwner: (user) => {
        const ownerKey = getCartOwnerKey(user);
        set((state) => ({
          ownerKey,
          items: state.cartsByOwner[ownerKey] ?? [],
        }));
      },

      addItem: (incoming) => {
        const lineId = `${incoming.productId}-${incoming.size ?? 'one-size'}`;
        set((state) => {
          const existing = state.items.find((i) => i.id === lineId);
          let items: CartItem[];

          if (existing) {
            items = state.items.map((i) =>
              i.id === lineId ? { ...i, qty: i.qty + 1 } : i,
            );
          } else {
            items = [
              ...state.items,
              { ...incoming, id: lineId, qty: 1 },
            ];
          }

          return persistOwnerCart(state.cartsByOwner, state.ownerKey, items);
        });
      },

      removeItem: (id) =>
        set((state) => {
          const items = state.items.filter((i) => i.id !== id);
          return persistOwnerCart(state.cartsByOwner, state.ownerKey, items);
        }),

      updateQty: (id, qty) =>
        set((state) => {
          const items =
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, qty } : i));

          return persistOwnerCart(state.cartsByOwner, state.ownerKey, items);
        }),

      clearCart: () =>
        set((state) => persistOwnerCart(state.cartsByOwner, state.ownerKey, [])),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    {
      name: 'leagueos-cart',
      version: 1,
      migrate: (persistedState) => {
        if (
          persistedState &&
          typeof persistedState === 'object' &&
          'items' in persistedState &&
          !('cartsByOwner' in persistedState) &&
          Array.isArray((persistedState as { items?: unknown }).items)
        ) {
          const items = (persistedState as { items: CartItem[] }).items;
          return {
            ownerKey: GUEST_CART_OWNER,
            items,
            cartsByOwner: {
              [GUEST_CART_OWNER]: items,
            },
          };
        }

        return persistedState as CartStore;
      },
      partialize: (state) => ({
        cartsByOwner: state.cartsByOwner,
      }),
    },
  ),
);
