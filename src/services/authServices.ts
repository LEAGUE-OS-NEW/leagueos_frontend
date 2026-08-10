import axiosInstance from "./apiClient.ts";
import type { AuthenticatedUser } from "../types/dashboardAccess.ts";
import type { ApiEnvelope } from "../types/api.ts";
import { unwrapApiData } from "./apiUtils.ts";

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

export const register = (payload: AuthPayload) => {
  const bodyWithoutUsername = { ...payload };
  delete bodyWithoutUsername.username;
  const { phone_number, ...rest } = bodyWithoutUsername;
  // Staging selects SMS whenever a phone is supplied, but has no SMS provider.
  // Keep the optional UI field while omitting blanks so email verification remains usable.
  const body =
    typeof phone_number === "string" && phone_number.trim()
      ? { ...rest, phone_number }
      : rest;
  return axiosInstance.post("/auth/register/", body);
};

export const login = async (payload: LoginPayload) => {
  const response = await axiosInstance.post<
    ApiEnvelope<AuthenticationResponse>
  >("/auth/login/", {
    email: payload.email ?? payload.identifier ?? "",
    password: payload.password ?? "",
  });
  return { ...response, data: unwrapApiData(response.data) };
};

export const verifyOtp = (payload: AuthPayload) =>
  axiosInstance.post("/auth/verify-otp/", {
    email: payload.email,
    otp: payload.otp ?? payload.code,
  });

export const resendOtp = (payload: AuthPayload) =>
  axiosInstance.post("/auth/resend-otp/", { email: payload.email });

export const requestPasswordReset = (payload: AuthPayload) =>
  axiosInstance.post("/auth/password-reset/request/", { email: payload.email });

export const verifyPasswordReset = (payload: AuthPayload) =>
  axiosInstance.post("/auth/password-reset/verify/", {
    email: payload.email,
    otp: payload.otp ?? payload.code,
  });

export const resetPassword = (payload: AuthPayload) =>
  axiosInstance.post("/auth/password-reset/confirm/", {
    email: payload.email,
    otp: payload.otp ?? payload.code,
    password: payload.password,
    confirm_password: payload.confirm_password ?? payload.password,
  });

export const fetchProfile = () => axiosInstance.get("/profile/");

export const fetchCurrentUser = async () => {
  const response = await axiosInstance.get<
    AuthenticatedUser | ApiEnvelope<{ user: AuthenticatedUser }>
  >("/auth/me/");

  const data = unwrapApiData<
    AuthenticatedUser | { user: AuthenticatedUser }
  >(response.data);

  const user =
    data && typeof data === "object" && "user" in data
      ? data.user
      : data;

  return {
    ...response,
    data: user as AuthenticatedUser,
  };
};

export const updateProfile = (payload: AuthPayload) =>
  axiosInstance.patch("/profile/", payload);

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return axiosInstance.post("/profile/avatar/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const removeAvatar = () => axiosInstance.delete("/profile/avatar/");
