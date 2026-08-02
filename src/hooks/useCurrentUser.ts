import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchProfile } from '../services/authServices.ts';
import { useAuthStore } from '../store/authStore.js';
import { getToken } from '../utils/tokenManager.js';
const PROFILE_UPDATED_EVENT = 'leagueos:profile-updated';

import {
  currentUser as fallbackCurrentUser,
  mapProfileToCurrentUser,
  type BackendProfile,
} from '../data/currentUser.ts';

export function useCurrentUser() {
  const authUser = useAuthStore((state) => state.user) as BackendProfile | null;
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      setIsLoading(false);
      setErrorMessage('');
      return null;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetchProfile();
      setProfile(response.data as BackendProfile);
      return response.data as BackendProfile;
    } catch {
      setErrorMessage('Could not load the latest profile details.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const latestProfile = await refreshProfile();

      if (!active || !latestProfile) {
        return;
      }

      setProfile(latestProfile);
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [refreshProfile]);

  useEffect(() => {
    function handleProfileUpdated() {
      void refreshProfile();
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [refreshProfile]);

  const currentUser = useMemo(() => {
    return mapProfileToCurrentUser(profile ?? authUser ?? null);
  }, [profile, authUser]);

  return {
    currentUser: currentUser ?? fallbackCurrentUser,
    profile: profile ?? authUser,
    isLoading,
    errorMessage,
    refreshProfile,
  };
}
