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

const STORAGE_KEY = 'fantasy_lineup_v1';

function loadFromStorage(): FantasyLineup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FantasyLineup;
  } catch {
    return null;
  }
}

function saveToStorage(lineup: FantasyLineup | null) {
  try {
    if (lineup) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lineup));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage full or unavailable
  }
}

const initialLineup = loadFromStorage();

export const useFantasyLineupStore = create<FantasyLineupStore>()((set) => ({
  lineup: initialLineup,
  setLineup: (lineup) => {
    saveToStorage(lineup);
    set({ lineup });
  },
  updateLineup: (partial) =>
    set((state) => {
      const next = state.lineup ? { ...state.lineup, ...partial } : null;
      saveToStorage(next);
      return { lineup: next };
    }),
  resetLineup: () => {
    saveToStorage(null);
    set({ lineup: null });
  },
}));