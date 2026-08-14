import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const requestUse = vi.fn();
  const responseUse = vi.fn();
  const mainClient = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  });
  const refreshClient = { post: vi.fn() };
  return {
    requestUse,
    responseUse,
    mainClient,
    refreshClient,
    getToken: vi.fn(),
    getRefreshToken: vi.fn(),
    updateTokens: vi.fn(),
    clearAuth: vi.fn(),
  };
});

vi.mock("axios", () => ({
  default: {
    create: vi
      .fn()
      .mockReturnValueOnce(mocks.mainClient)
      .mockReturnValueOnce(mocks.refreshClient),
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "response" in error),
  },
}));

vi.mock("../utils/tokenManager.ts", () => ({
  getToken: mocks.getToken,
  getRefreshToken: mocks.getRefreshToken,
}));

vi.mock("../store/authStore.ts", () => ({
  useAuthStore: {
    getState: () => ({
      updateTokens: mocks.updateTokens,
      clearAuth: mocks.clearAuth,
    }),
  },
}));

await import("./apiClient.ts");

type RequestConfig = {
  url: string;
  headers: Record<string, string>;
  _retry?: boolean;
};

const requestInterceptor = () => mocks.requestUse.mock.calls[0][0] as (
  config: RequestConfig,
) => RequestConfig;
const responseInterceptor = () => mocks.responseUse.mock.calls[0][1] as (
  error: { config?: RequestConfig; response?: { status: number } },
) => Promise<unknown>;
const unauthorized = (config: RequestConfig) => ({
  config,
  response: { status: 401 },
});

describe("API authentication interceptors", () => {
  beforeEach(() => {
    mocks.mainClient.mockReset();
    mocks.refreshClient.post.mockReset();
    mocks.getToken.mockReset();
    mocks.getRefreshToken.mockReset();
    mocks.updateTokens.mockReset();
    mocks.clearAuth.mockReset();
    mocks.getToken.mockReturnValue("access-old");
    mocks.getRefreshToken.mockReturnValue("refresh-old");
    mocks.mainClient.mockResolvedValue({ data: "retried" });
  });

  it("shares one refresh across concurrent 401s and retries both authenticated requests", async () => {
    let resolveRefresh!: (value: unknown) => void;
    mocks.refreshClient.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const first = requestInterceptor()({ url: "/markets/", headers: {} });
    const second = requestInterceptor()({ url: "/profile/", headers: {} });

    const firstRetry = responseInterceptor()(unauthorized(first));
    const secondRetry = responseInterceptor()(unauthorized(second));
    expect(mocks.refreshClient.post).toHaveBeenCalledTimes(1);

    resolveRefresh({ data: { access: "access-new" } });
    await expect(Promise.all([firstRetry, secondRetry])).resolves.toHaveLength(2);
    expect(mocks.mainClient).toHaveBeenCalledTimes(2);
    expect(first.headers.Authorization).toBe("Bearer access-new");
    expect(second.headers.Authorization).toBe("Bearer access-new");
  });

  it("never retries an original request more than once", async () => {
    const config = { url: "/markets/", headers: {}, _retry: true };
    await expect(responseInterceptor()(unauthorized(config))).rejects.toEqual(
      unauthorized(config),
    );
    expect(mocks.refreshClient.post).not.toHaveBeenCalled();
    expect(mocks.mainClient).not.toHaveBeenCalled();
  });

  it.each(["/auth/token-refresh/", "/auth/login/", "/auth/register/"])(
    "does not refresh public auth request %s",
    async (url) => {
      const config = requestInterceptor()({
        url,
        headers: { Authorization: "Bearer stale" },
      });
      expect(config.headers.Authorization).toBeUndefined();
      await expect(responseInterceptor()(unauthorized(config))).rejects.toEqual(
        unauthorized(config),
      );
      expect(mocks.refreshClient.post).not.toHaveBeenCalled();
    },
  );

  it("clears stored authentication when refresh fails", async () => {
    const rejected = Object.assign(new Error("refresh rejected"), { response: { status: 401 } });
    mocks.refreshClient.post.mockRejectedValue(rejected);
    await expect(
      responseInterceptor()(unauthorized({ url: "/markets/", headers: {} })),
    ).rejects.toThrow("refresh rejected");
    expect(mocks.clearAuth).toHaveBeenCalledOnce();
  });

  it.each([403, 404, 500])("does not clear auth for an ordinary %s response", async (status) => {
    const error = { config: { url: "/markets/", headers: {} }, response: { status } };
    await expect(responseInterceptor()(error)).rejects.toEqual(error);
    expect(mocks.refreshClient.post).not.toHaveBeenCalled();
    expect(mocks.clearAuth).not.toHaveBeenCalled();
  });

  it("preserves auth when refresh fails transiently", async () => {
    mocks.refreshClient.post.mockRejectedValue(new Error("network down"));
    await expect(responseInterceptor()(unauthorized({ url: "/markets/", headers: {} }))).rejects.toThrow("network down");
    expect(mocks.clearAuth).not.toHaveBeenCalled();
  });

  it("persists a rotated refresh token with the new access token", async () => {
    mocks.refreshClient.post.mockResolvedValue({
      data: { access: "access-new", refresh: "refresh-rotated" },
    });
    await responseInterceptor()(
      unauthorized({ url: "/markets/", headers: {} }),
    );
    expect(mocks.updateTokens).toHaveBeenCalledWith(
      "access-new",
      "refresh-rotated",
    );
    expect(mocks.refreshClient.post).toHaveBeenCalledWith("/auth/token-refresh/", { refresh: "refresh-old" });
  });
});
