import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore.ts";
import { getRefreshToken, getToken } from "../utils/tokenManager.ts";
import { unwrapApiData } from "./apiUtils.ts";

if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  console.error(
    "VITE_API_BASE_URL is not set in this production build — falling back to http://localhost:8000/api/v1, which will not work for real users. Set it in the Render dashboard for this service.",
  );
}
export const apiBaseUrl = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
).replace(/\/+$/, "");
export const publicAuthPaths = [
  "/auth/register/",
  "/auth/verify-otp/",
  "/auth/resend-otp/",
  "/auth/login/",
  "/auth/token-refresh/",
  "/auth/password-reset/request/",
  "/auth/password-reset/verify/",
  "/auth/password-reset/confirm/",
  "/auth/account-setup/",
];

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});
const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
let refreshPromise: Promise<string> | null = null;

const isPublicAuth = (url?: string) =>
  publicAuthPaths.some((path) => String(url || "").includes(path));

axiosInstance.interceptors.request.use((config) => {
  if (isPublicAuth(config.url)) delete config.headers.Authorization;
  else {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) throw new Error("No refresh token available");
      const response = await refreshClient.post("/auth/token-refresh/", {
        refresh,
      });
      const tokens = unwrapApiData<{ access: string; refresh?: string }>(
        response.data,
      );
      useAuthStore.getState().updateTokens(tokens.access, tokens.refresh);
      return tokens.access;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      isPublicAuth(config.url)
    )
      return Promise.reject(error);

    // In local development (import.meta.env.DEV), if there is no refresh
    // token stored, do not attempt a refresh — just let the 401 pass
    // through as-is.  The backend's DEBUG fallback already handles these
    // requests without requiring a token, so the caller receives the
    // original 401 error rather than the misleading "No refresh token
    // available" message.  Production behavior is unchanged: when DEV is
    // false the normal refresh path runs regardless.
    if (import.meta.env.DEV && !getRefreshToken()) {
      return Promise.reject(error);
    }

    config._retry = true;
    try {
      const access = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${access}`;
      return axiosInstance(config);
    } catch (refreshError) {
      // Only an authoritative refresh rejection proves that the stored
      // session is no longer usable. Network/server failures must preserve it.
      if (
        axios.isAxiosError(refreshError) &&
        (refreshError.response?.status === 400 || refreshError.response?.status === 401)
      ) {
        useAuthStore.getState().clearAuth();
      }
      return Promise.reject(refreshError);
    }
  },
);

export default axiosInstance;
