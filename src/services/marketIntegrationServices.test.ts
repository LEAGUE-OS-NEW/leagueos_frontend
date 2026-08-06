import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient.ts";
import {
  createDraft,
  markProposalDuplicate,
  rejectProposal,
  requestProposalInfo,
  startProposalReview,
  submitForApproval,
} from "./marketOperationsService.ts";
import {
  approveMarket,
  rejectMarket,
} from "./marketApprovalService.ts";
import {
  decideComplianceProposal,
  fetchKYCSessions,
  proposeComplianceDecision,
  reassessRisk,
} from "./markets/complianceAdminService.ts";

vi.mock("./apiClient.ts", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const post = vi.mocked(apiClient.post);
const get = vi.mocked(apiClient.get);
const market = {
  id: "m1",
  question: "Will A win?",
  scope_type: "EVENT",
  status: "DRAFT",
  opens_at: "2026-08-05T10:00:00Z",
  closes_at: "2026-08-06T10:00:00Z",
  is_featured: false,
  sport: { id: "sport-1", name: "Cricket" },
  category: { id: "cat-1", name: "Winner" },
  sporting_event: null,
  subject: { type: "EVENT", id: "event-1", name: "A vs B" },
  outcomes: [],
  winning_outcome: null,
  is_watchlisted: false,
};
const proposal = {
  id: "p1",
  question: "Will A win?",
  status: "UNDER_REVIEW",
  proposer_id: "user-12345678",
  sporting_event: "event-1",
  created_at: "2026-08-05T10:00:00Z",
};
const draftInput = {
  eventId: "event-1",
  sportId: "sport-1",
  categoryId: "cat-1",
  eventLabel: "A vs B",
  question: "Will A win?",
  resolutionRules: "Official result",
  officialSource: "Federation",
  opensAt: "2026-08-05T10:00:00Z",
  closesAt: "2026-08-06T10:00:00Z",
  voidConditions: "Event abandoned",
};

describe("market operations contracts", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("creates a market with selected event metadata and no event refetch", async () => {
    post.mockResolvedValueOnce({ data: market });
    await createDraft(draftInput);
    expect(get).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith(
      "/market-admin/markets/",
      expect.objectContaining({
        sport_id: "sport-1",
        category_id: "cat-1",
        sporting_event_id: "event-1",
        resolution_source: "Federation",
        opens_at: draftInput.opensAt,
        closes_at: draftInput.closesAt,
      }),
    );
  });

  it("requires a category and event", async () => {
    await expect(
      createDraft({ ...draftInput, categoryId: "" }),
    ).rejects.toThrow("category");
    await expect(createDraft({ ...draftInput, eventId: "" })).rejects.toThrow(
      "event",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("submits a draft using the required notes payload", async () => {
    post.mockResolvedValueOnce({ data: { success: true, data: market } });
    await submitForApproval("m1");
    expect(post).toHaveBeenCalledWith("/market-admin/markets/m1/submit/", {
      notes: "Submitted for independent market approval.",
    });
  });

  it.each([
    [startProposalReview, "START_REVIEW"],
    [rejectProposal, "REJECT"],
    [markProposalDuplicate, "MARK_DUPLICATE"],
  ])(
    "sends the supported proposal review action",
    async (action, expectedAction) => {
      post.mockResolvedValueOnce({ data: proposal });
      await action("p1", "Reviewer note");
      expect(post).toHaveBeenCalledWith("/market-admin/proposals/p1/review/", {
        action: expectedAction,
        reason: "Reviewer note",
      });
    },
  );

  it("does not call the API for an unsupported proposal action", async () => {
    await expect(requestProposalInfo("p1", "More details")).rejects.toThrow(
      "not supported",
    );
    expect(post).not.toHaveBeenCalled();
  });
});

describe("approval and compliance contracts", () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it("sends approval and rejection notes", async () => {
    post.mockResolvedValue({ data: market });
    await approveMarket("m1", "Approved independently");
    await rejectMarket("m1", "Rules are incomplete");
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/market-admin/markets/m1/approve/",
      { notes: "Approved independently" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/market-admin/markets/m1/reject/",
      { notes: "Rules are incomplete" },
    );
  });

  it("requires approval and rejection notes", async () => {
    await expect(approveMarket("m1", " ")).rejects.toThrow("approval note");
    await expect(rejectMarket("m1", "")).rejects.toThrow("rejection note");
    expect(post).not.toHaveBeenCalled();
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
