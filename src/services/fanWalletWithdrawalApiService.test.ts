import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "./apiClient.ts";

import {
  createFanWalletWithdrawal,
  fetchFanWalletWithdrawal,
  fetchFanWalletWithdrawals,
} from "./fanWalletApiService.ts";

vi.mock("./apiClient.ts", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const withdrawalApiRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  amount: "50000.0000",
  currency: "UGX",
  destination: {
    method: "MOBILE_MONEY",
    network: "MTN",
    mobile_money_number: "0777123456",
    account_name: "Test Fan",
  },
  status: "PENDING_APPROVAL",
  risk_status: "PASSED",
  risk_reasons: [],
  approval_mode: "PENDING",
  approval_policy_version: "v1",
  approved_at: null,
  rejection_reason: "",
  failure_reason: "",
  created_at: "2026-08-16T20:00:00Z",
  updated_at: "2026-08-16T20:00:00Z",
  transaction_id: "22222222-2222-4222-8222-222222222222",
};

describe("fan wallet withdrawal API service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Mobile Money withdrawal through the canonical backend", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: withdrawalApiRecord,
    });

    const idempotencyKey = "33333333-3333-4333-8333-333333333333";

    await expect(
      createFanWalletWithdrawal({
        amount: 50_000,
        currency: "UGX",
        network: "MTN",
        phoneNumber: "0777123456",
        accountName: "Test Fan",
        idempotencyKey,
      }),
    ).resolves.toMatchObject({
      amount: 50_000,
      currency: "UGX",
      status: "PENDING_APPROVAL",
      riskStatus: "PASSED",
      transactionId: "22222222-2222-4222-8222-222222222222",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/wallets/withdrawals/", {
      amount: 50_000,
      currency: "UGX",
      destination: {
        method: "MOBILE_MONEY",
        network: "MTN",
        mobile_money_number: "0777123456",
        account_name: "Test Fan",
      },
      idempotency_key: idempotencyKey,
    });
  });

  it("loads the fan withdrawal history", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [withdrawalApiRecord],
      },
    });

    await expect(
      fetchFanWalletWithdrawals({
        currency: "ugx",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: withdrawalApiRecord.id,
        amount: 50_000,
        currency: "UGX",
        status: "PENDING_APPROVAL",
      }),
    ]);

    expect(apiClient.get).toHaveBeenCalledWith("/wallets/withdrawals/", {
      params: {
        page_size: 100,
        currency: "UGX",
      },
    });
  });

  it("loads one authoritative withdrawal request", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...withdrawalApiRecord,
        status: "PROCESSING",
      },
    });

    await expect(
      fetchFanWalletWithdrawal(withdrawalApiRecord.id),
    ).resolves.toMatchObject({
      status: "PROCESSING",
      destination: {
        network: "MTN",
      },
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      `/wallets/withdrawals/${withdrawalApiRecord.id}/`,
    );
  });
});
