import { create } from 'zustand';

const STORAGE_KEY = 'league_os_club_workspace_entitlement';

function getStoredSelection() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeSelection(entitlementId: string | null) {
  try {
    if (entitlementId) {
      sessionStorage.setItem(STORAGE_KEY, entitlementId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // In-memory selection remains usable when browser storage is unavailable.
  }
}

type ClubWorkspaceStore = {
  selectedEntitlementId: string | null;
  selectEntitlement: (entitlementId: string) => void;
  clearSelection: () => void;
};

export const useClubWorkspaceStore =
  create<ClubWorkspaceStore>()((set) => ({
    selectedEntitlementId: getStoredSelection(),

    selectEntitlement: (entitlementId) => {
      storeSelection(entitlementId);
      set({ selectedEntitlementId: entitlementId });
    },

    clearSelection: () => {
      storeSelection(null);
      set({ selectedEntitlementId: null });
    },
  }));
