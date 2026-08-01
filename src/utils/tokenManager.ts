const ACCESS_TOKEN_KEY = 'league_os_access_token';
const REFRESH_TOKEN_KEY = 'league_os_refresh_token';
const AUTH_USER_KEY = 'league_os_auth_user';

const LEGACY_ACCESS_TOKEN_KEY = 'access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refresh_token';

function readStorage(key: string) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function removeFromBothStorages(key: string) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export const getToken = () =>
  readStorage(ACCESS_TOKEN_KEY) || readStorage(LEGACY_ACCESS_TOKEN_KEY);

export const setToken = (token: string) => {
  removeFromBothStorages(ACCESS_TOKEN_KEY);
  removeFromBothStorages(LEGACY_ACCESS_TOKEN_KEY);
  setLocalStorage(ACCESS_TOKEN_KEY, token);
  setLocalStorage(LEGACY_ACCESS_TOKEN_KEY, token);
};

export const getRefreshToken = () =>
  readStorage(REFRESH_TOKEN_KEY) || readStorage(LEGACY_REFRESH_TOKEN_KEY);

export const setRefreshToken = (token: string) => {
  removeFromBothStorages(REFRESH_TOKEN_KEY);
  removeFromBothStorages(LEGACY_REFRESH_TOKEN_KEY);
  setLocalStorage(REFRESH_TOKEN_KEY, token);
  setLocalStorage(LEGACY_REFRESH_TOKEN_KEY, token);
};

export const setStoredUser = (user: unknown) => {
  removeFromBothStorages(AUTH_USER_KEY);

  try {
    setLocalStorage(AUTH_USER_KEY, JSON.stringify(user ?? null));
  } catch {
    // Ignore unserializable payloads.
  }
};

export function getStoredUser<T = unknown>(): T | null {
  const rawValue = readStorage(AUTH_USER_KEY);

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    removeFromBothStorages(AUTH_USER_KEY);
    return null;
  }
}

export const removeToken = () => {
  removeFromBothStorages(ACCESS_TOKEN_KEY);
  removeFromBothStorages(LEGACY_ACCESS_TOKEN_KEY);
};

export const removeRefreshToken = () => {
  removeFromBothStorages(REFRESH_TOKEN_KEY);
  removeFromBothStorages(LEGACY_REFRESH_TOKEN_KEY);
};

export const removeStoredUser = () => {
  removeFromBothStorages(AUTH_USER_KEY);
};

export const clearAuthStorage = () => {
  removeToken();
  removeRefreshToken();
  removeStoredUser();
};
