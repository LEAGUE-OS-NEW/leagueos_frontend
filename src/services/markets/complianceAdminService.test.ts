import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../apiClient.ts";
import {
  decideComplianceProposal,
  fetchKYCSessions,
  proposeComplianceDecision,
  reassessRisk,
} from "./complianceAdminService.ts";

vi.mock("../apiClient.ts", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const post = vi.mocked(apiClient.post);
const get = vi.mocked(apiClient.get);

describe("compliance admin contracts", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("normalizes a wrapped paginated compliance response", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { count: 1, next: null, previous: null, results: [{ id: "k1" }] },
      },
    });
    await expect(fetchKYCSessions()).resolves.toMatchObject({
      count: 1,
      results: [{ id: "k1" }],
    });
  });

  it("sends risk reassessment, proposal, approval and rejection payloads", async () => {
    post.mockResolvedValue({ data: {} });
    await reassessRisk("user-1");
    const payload = {
      participant_id: "user-1",
      decision_type: "RESTRICT",
      requested_change: { state: "LIMITED" },
      reason: "Risk threshold",
    };
    await proposeComplianceDecision(payload);
    await decideComplianceProposal("d1", true, "Checker approved");
    await decideComplianceProposal("d2", false, "Checker rejected");
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/admin/compliance/risk-reassess/",
      { participant_id: "user-1" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/admin/compliance/decisions/",
      payload,
    );
    expect(post).toHaveBeenNthCalledWith(
      3,
      "/admin/compliance/decisions/d1/decide/",
      { approve: true, reason: "Checker approved" },
    );
    expect(post).toHaveBeenNthCalledWith(
      4,
      "/admin/compliance/decisions/d2/decide/",
      { approve: false, reason: "Checker rejected" },
    );
  });
});
