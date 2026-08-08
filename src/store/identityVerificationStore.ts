import { create } from 'zustand';

// KYC identity verification status — mock-backed (no real backend endpoint
// exists for this yet). Persisted the same way useClubWorkspaceStore
// persists its selection: sessionStorage, so the flag survives navigation
// and reloads within a session without needing a real backend field.

const STORAGE_KEY = 'league_os_identity_verified_at';

function getStoredVerifiedAt(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeVerifiedAt(verifiedAt: string | null) {
  try {
    if (verifiedAt) {
      sessionStorage.setItem(STORAGE_KEY, verifiedAt);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // In-memory flag remains usable when browser storage is unavailable.
  }
}

type IdentityVerificationStore = {
  isVerified: boolean;
  verifiedAt: string | null;
  setVerified: () => void;
  reset: () => void;
};

export const useIdentityVerificationStore = create<IdentityVerificationStore>()((set) => {
  const initialVerifiedAt = getStoredVerifiedAt();

  return {
    isVerified: initialVerifiedAt !== null,
    verifiedAt: initialVerifiedAt,

    setVerified: () => {
      const verifiedAt = new Date().toISOString();
      storeVerifiedAt(verifiedAt);
      set({ isVerified: true, verifiedAt });
    },

    reset: () => {
      storeVerifiedAt(null);
      set({ isVerified: false, verifiedAt: null });
    },
  };
});
