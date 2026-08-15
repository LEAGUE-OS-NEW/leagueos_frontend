import { create } from 'zustand';
import { type FormationId } from '../pages/fan/fantasy/section/formations';

export type LineupStatus = 'draft' | 'ready' | 'confirmed' | 'locked';

export interface FantasyLineup {
  competitionId: string;
  sport: string;
  squadIds: string[];
  startingIds: string[];
  captainId: string | null;
  viceId: string | null;
  formation: FormationId;
  teamName: string;
  status: LineupStatus;
  budgetRemaining: number;
}

interface FantasyLineupStore {
  lineup: FantasyLineup | null;
  setLineup: (lineup: FantasyLineup) => void;
  updateLineup: (partial: Partial<FantasyLineup>) => void;
  resetLineup: () => void;
}

export const useFantasyLineupStore = create<FantasyLineupStore>()((set) => ({
  // Draft-only UI state. The backend team/lineup endpoints are authoritative.
  lineup: null,
  setLineup: (lineup) => {
    set({ lineup });
  },
  updateLineup: (partial) =>
    set((state) => {
      const next = state.lineup ? { ...state.lineup, ...partial } : null;
      return { lineup: next };
    }),
  resetLineup: () => {
    set({ lineup: null });
  },
}));
