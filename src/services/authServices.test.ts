import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient.ts";
import {
  fetchCurrentUser,
  login,
  requestPasswordReset,
  resetPassword,
  resendOtp,
  verifyOtp,
  verifyPasswordReset,
} from "./authServices.ts";

vi.mock("./apiClient.ts", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

describe("authentication service contracts", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("maps a login identifier to the backend email field and unwraps the response", async () => {
    post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { access: "a", refresh: "r", user: { id: "u" } },
      },
    });
    const response = await login({
      identifier: "user@example.com",
      password: "secret",
    });
    expect(post).toHaveBeenCalledWith("/auth/login/", {
      email: "user@example.com",
      password: "secret",
    });
    expect(response.data).toMatchObject({ access: "a", refresh: "r" });
  });

  it("unwraps the current-user API envelope", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Current user.",
        data: {
          user: {
            id: "admin-1",
            email: "admin@leagueos.com",
            roles: ["Super Admin"],
          },
        },
      },
    });

    const response = await fetchCurrentUser();

    expect(get).toHaveBeenCalledWith("/auth/me/");
    expect(response.data).toMatchObject({
      id: "admin-1",
      email: "admin@leagueos.com",
      roles: ["Super Admin"],
    });
  });

  it("maps code to otp for verification", async () => {
    post.mockResolvedValueOnce({ data: {} });
    await verifyOtp({ email: "user@example.com", code: "123456" });
    expect(post).toHaveBeenCalledWith("/auth/verify-otp/", {
      email: "user@example.com",
      otp: "123456",
    });
  });

  it.each([
    [resendOtp, "/auth/resend-otp/"],
    [requestPasswordReset, "/auth/password-reset/request/"],
  ])("uses the backend path", async (action, path) => {
    post.mockResolvedValueOnce({ data: {} });
    await action({ email: "user@example.com" });
    expect(post).toHaveBeenCalledWith(path, { email: "user@example.com" });
  });

  it("uses the password reset verify endpoint and otp field", async () => {
    post.mockResolvedValueOnce({ data: {} });
    await verifyPasswordReset({ email: "user@example.com", code: "123456" });
    expect(post).toHaveBeenCalledWith("/auth/password-reset/verify/", {
      email: "user@example.com",
      otp: "123456",
    });
  });

  it("sends both password confirmation fields required by Django", async () => {
    post.mockResolvedValueOnce({ data: {} });
    await resetPassword({
      email: "user@example.com",
      code: "123456",
      password: "Secret1!",
    });
    expect(post).toHaveBeenCalledWith("/auth/password-reset/confirm/", {
      email: "user@example.com",
      otp: "123456",
      password: "Secret1!",
      confirm_password: "Secret1!",
    });
  });
});
