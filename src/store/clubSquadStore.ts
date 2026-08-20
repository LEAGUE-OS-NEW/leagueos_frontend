/**
 * Local squad-player store — mirrors clubProductStore.ts's shape/purpose.
 *
 * Persisted to localStorage so players added in a demo/mock Club Admin
 * session (no real club UUID) survive a page refresh, matching the store
 * page's behavior instead of losing added players entirely.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SquadPlayer {
  id: string;
  clubSlug: string;
  name: string;
  position: string;
  nationality: string;
  status: 'fit' | 'suspended' | 'injured';
  contract: string;
  value: string;
  createdAt: number;
}

interface ClubSquadStore {
  players: SquadPlayer[];
  addPlayer: (player: SquadPlayer) => void;
  updatePlayer: (id: string, updates: Partial<SquadPlayer>) => void;
  removePlayer: (id: string) => void;
}

export const useClubSquadStore = create<ClubSquadStore>()(
  persist(
    (set) => ({
      players: [],

      addPlayer: (player) =>
        set((state) => ({ players: [player, ...state.players] })),

      updatePlayer: (id, updates) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),
    }),
    { name: 'leagueos-club-squad' },
  ),
);
