import apiClient from "./apiClient.ts";
import {
  extractApiError,
  normalizeApiList,
  unwrapApiData,
} from "./apiUtils.ts";
import type {
  AdminMarket,
  MarketCategory,
  MarketProposal as ProposalDto,
  SportingEvent,
} from "../types/api.ts";
export type { MarketCategory } from "../types/api.ts";

export type Sport = string;
export type VerificationStatus = "Verified" | "Pending" | "Unverified";
export type DraftStatus =
  "Draft" | "Ready for Approval" | "Submitted" | "Rejected";
export type ProposalStatus =
  "New" | "Under Review" | "Returned" | "Converted" | "Rejected";
export interface VerifiedEvent {
  id: string;
  teamA: string;
  teamB: string;
  sport: Sport;
  sportId: string;
  competition: string;
  venue: string;
  kickoff: string;
  verificationStatus: VerificationStatus;
  provider: string;
}
export interface AuditEvent {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  note?: string;
}
export interface MarketDraft {
  id: string;
  eventId: string;
  eventLabel: string;
  question: string;
  resolutionRules: string;
  officialSource: string;
  opensAt: string;
  closesAt: string;
  voidConditions: string;
  status: DraftStatus;
  createdBy: string;
  createdAt: string;
  duplicateOfDraftId?: string;
}
export interface MarketProposal {
  id: string;
  submittedBy: string;
  eventId: string;
  eventLabel: string;
  suggestedQuestion: string;
  suggestedRules?: string;
  status: ProposalStatus;
  createdAt: string;
  duplicateOfDraftId?: string;
  auditHistory: AuditEvent[];
}
export interface NewDraftInput {
  eventId: string;
  sportId: string;
  categoryId: string;
  eventLabel: string;
  question: string;
  resolutionRules: string;
  officialSource: string;
  opensAt: string;
  closesAt: string;
  voidConditions: string;
}

const fail = (error: unknown): never => {
  throw new Error(extractApiError(error).message);
};
const sportName = (name?: string): Sport => name || "Other";
const eventTeams = (event: SportingEvent) => {
  const names = event.participants
    .map((entry) => entry.participant.name)
    .filter(Boolean);
  return { teamA: names[0] ?? event.name, teamB: names[1] ?? "Event market" };
};
const mapEvent = (event: SportingEvent): VerifiedEvent => ({
  id: event.id,
  ...eventTeams(event),
  sport: sportName(event.sport?.name),
  sportId: event.sport.id,
  competition: event.competition?.name ?? "Competition unavailable",
  venue: event.venue || "Venue unavailable",
  kickoff: event.starts_at,
  verificationStatus: ["SCHEDULED", "CONFIRMED"].includes(event.status)
    ? "Verified"
    : ["CANCELLED", "POSTPONED"].includes(event.status)
      ? "Unverified"
      : "Pending",
  provider: "Provider unavailable",
});
const mapDraftStatus = (status: string): DraftStatus =>
  status === "DRAFT"
    ? "Draft"
    : status === "PENDING_APPROVAL"
      ? "Ready for Approval"
      : status === "REJECTED"
        ? "Rejected"
        : "Submitted";
const mapDraft = (market: AdminMarket): MarketDraft => ({
  id: market.id,
  eventId: market.sporting_event?.id ?? "",
  eventLabel: market.subject?.name ?? market.question,
  question: market.question,
  resolutionRules: market.rules || market.resolution_criteria || "",
  officialSource: market.resolution_source || "Source unavailable",
  opensAt: market.opens_at,
  closesAt: market.closes_at,
  voidConditions: "",
  status: mapDraftStatus(market.status),
  createdBy:
    market.created_by?.full_name || market.created_by?.email || "Backend user",
  createdAt: market.created_at ?? market.opens_at,
});
const proposalStatus = (status: string): ProposalStatus =>
  status === "UNDER_REVIEW"
    ? "Under Review"
    : status === "APPROVED"
      ? "Converted"
      : status === "REJECTED" || status === "DUPLICATE"
        ? "Rejected"
        : "New";
const mapProposal = (
  p: ProposalDto,
  reviews: AuditEvent[] = [],
): MarketProposal => ({
  id: p.id,
  submittedBy: p.proposer_id
    ? `Participant ${p.proposer_id.slice(0, 8)}…`
    : "Participant",
  eventId: p.sporting_event_id ?? p.sporting_event ?? "",
  eventLabel: p.proposed_event_title || "Event details unavailable",
  suggestedQuestion: p.question,
  suggestedRules: p.description,
  status: proposalStatus(p.status),
  createdAt: p.submitted_at ?? p.created_at,
  auditHistory: reviews,
});

export async function fetchVerifiedEvents() {
  try {
    const { data } = await apiClient.get("/sporting-events/");
    return normalizeApiList<SportingEvent>(data).map(mapEvent);
  } catch (e) {
    return fail(e);
  }
}
export async function fetchMarketCategories() {
  try {
    const { data } = await apiClient.get("/markets/categories/");
    return normalizeApiList<MarketCategory>(data);
  } catch (e) {
    return fail(e);
  }
}
export async function fetchDrafts() {
  try {
    const { data } = await apiClient.get("/market-admin/markets/");
    return normalizeApiList<AdminMarket>(data).map(mapDraft);
  } catch (e) {
    return fail(e);
  }
}
export async function fetchProposals() {
  try {
    const { data } = await apiClient.get("/market-admin/proposals/");
    return normalizeApiList<ProposalDto>(data).map((item) => mapProposal(item));
  } catch (e) {
    return fail(e);
  }
}
export async function createDraft(input: NewDraftInput) {
  if (!input.categoryId) throw new Error("Select a market category.");
  if (!input.eventId || !input.sportId)
    throw new Error("Select a valid sporting event.");
  if (!input.question.trim()) throw new Error("Enter a market question.");
  if (!input.resolutionRules.trim()) throw new Error("Enter resolution rules.");
  if (!input.officialSource.trim())
    throw new Error("Enter an official resolution source.");
  if (!input.opensAt) throw new Error("Select an opening time.");
  if (!input.closesAt) throw new Error("Select a closing time.");
  if (!input.voidConditions.trim()) throw new Error("Enter void conditions.");
  try {
    const { data } = await apiClient.post<AdminMarket>(
      "/market-admin/markets/",
      {
        sport_id: input.sportId,
        category_id: input.categoryId,
        scope_type: "EVENT",
        sporting_event_id: input.eventId,
        question: input.question,
        description: "",
        rules: `${input.resolutionRules}\n\nVoid conditions:\n${input.voidConditions}`,
        resolution_source: input.officialSource,
        resolution_criteria: `${input.resolutionRules}\n\nVoid conditions:\n${input.voidConditions}`,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
        yes_label: "Yes",
        no_label: "No",
      },
    );
    return mapDraft(unwrapApiData(data));
  } catch (e) {
    return fail(e);
  }
}
export async function submitForApproval(id: string) {
  try {
    const { data } = await apiClient.post(
      `/market-admin/markets/${id}/submit/`,
      { notes: "Submitted for independent market approval." },
    );
    return mapDraft(unwrapApiData<AdminMarket>(data));
  } catch (e) {
    return fail(e);
  }
}
async function review(
  id: string,
  action: "START_REVIEW" | "APPROVE" | "REJECT" | "MARK_DUPLICATE",
  reason = "",
) {
  try {
    const { data } = await apiClient.post(
      `/market-admin/proposals/${id}/review/`,
      { action, reason },
    );
    return mapProposal(unwrapApiData<ProposalDto>(data));
  } catch (e) {
    return fail(e);
  }
}
export const startProposalReview = (id: string, note = "") =>
  review(id, "START_REVIEW", note);
export const convertProposalToDraft = (id: string) =>
  review(id, "APPROVE", "Approved and converted to a draft market.");
export const rejectProposal = (id: string, note: string) =>
  review(id, "REJECT", note);
export const markProposalDuplicate = (id: string, note: string) =>
  review(id, "MARK_DUPLICATE", note);
export async function fetchProposalReviews(id: string) {
  const { data } = await apiClient.get(
    `/market-admin/proposals/${id}/reviews/`,
  );
  return normalizeApiList<{
    id: string;
    created_at: string;
    actor_id: string;
    action: string;
    reason?: string;
  }>(data).map((r) => ({
    id: r.id,
    timestamp: r.created_at,
    adminUser: `User ${r.actor_id.slice(0, 8)}…`,
    action: r.action,
    note: r.reason,
  }));
}
export const returnProposal = async (
  ...args: [string?, string?]
): Promise<MarketProposal> => {
  void args;
  throw new Error(
    "Return for Changes is not supported by the current backend workflow.",
  );
};
export const requestProposalInfo = async (
  ...args: [string?, string?]
): Promise<MarketProposal> => {
  void args;
  throw new Error(
    "Request More Information is not supported by the current backend workflow.",
  );
};
