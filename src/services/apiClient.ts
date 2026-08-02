// apiClent.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore.ts';
import { getToken } from '../utils/tokenManager.ts';

const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000/api';

const normalizedApiBaseUrl = String(rawApiBaseUrl).replace(/\/+$/, '');

export const apiBaseUrl = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api`;

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const publicAuthPaths = [
  '/accounts/login/',
  '/accounts/register/',
  '/accounts/verify-otp/',
  '/accounts/resend-otp/',
  '/accounts/password-reset/request/',
  '/accounts/password-reset/confirm/',
];

axiosInstance.interceptors.request.use((config) => {
  const accessToken = getToken();
  const requestUrl = String(config.url || '');
  const isPublicAuthRequest = publicAuthPaths.some((path) =>
    requestUrl.includes(path),
  );

  if (isPublicAuthRequest && config.headers) {
    delete config.headers.Authorization;
  }

  if (accessToken && !isPublicAuthRequest) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isPublicAuthRequest = publicAuthPaths.some((path) =>
      requestUrl.includes(path),
    );

    if (status === 401 && !isPublicAuthRequest) {
      useAuthStore.getState().clearAuth();
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
