import axiosInstance from './apiClient.ts';
import type { AuthenticatedUser } from '../types/dashboardAccess.ts';

export type AuthPayload = Record<string, unknown>;

export interface LoginPayload {
  identifier?: string;
  email?: string;
  password?: string;
}

export interface AuthenticationResponse {
  access: string;
  refresh: string;
  user: AuthenticatedUser;
  requires_email_verification?: boolean;
  is_new_user?: boolean;
  message?: string;
  token_type?: string;
  next_step?: string;
  role?: string;
  frontend_dashboard_route?: string | null;
  backend_dashboard_route?: string | null;
}

export const register = (payload: AuthPayload) =>
  axiosInstance.post('/accounts/register/', payload);

export const login = (payload: LoginPayload) =>
  axiosInstance.post<AuthenticationResponse>('/accounts/login/', payload);

export const verifyOtp = (payload: AuthPayload) =>
  axiosInstance.post('/accounts/verify-otp/', payload);

export const resendOtp = (payload: AuthPayload) =>
  axiosInstance.post('/accounts/resend-otp/', payload);

export const requestPasswordReset = (payload: AuthPayload) =>
  axiosInstance.post('/accounts/password-reset/request/', payload);

export const resetPassword = (payload: AuthPayload) =>
  axiosInstance.post('/accounts/password-reset/confirm/', payload);

export const fetchProfile = () => axiosInstance.get('/accounts/profile/');

export const fetchCurrentUser = () =>
  axiosInstance.get<AuthenticatedUser>('/accounts/me/');

export const updateProfile = (payload: AuthPayload) =>
  axiosInstance.patch('/accounts/profile/', payload);

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return axiosInstance.patch('/accounts/profile/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const removeAvatar = () => axiosInstance.delete('/accounts/profile/avatar/');
