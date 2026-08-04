import apiClient from "./apiClient.ts";
import {
  extractApiError,
  normalizeApiList,
  unwrapApiData,
} from "./apiUtils.ts";
import type { AdminMarket } from "../types/api.ts";

export type Sport = string;
export type ApprovalStatus =
  | "Awaiting Review"
  | "Approved"
  | "Rejected"
  | "High Risk"
  | "Second Approval Required"
  | "Returned";
export type RiskSeverity = "high" | "medium" | "low";
export interface RiskFlag {
  id: string;
  label: string;
  severity: RiskSeverity;
}
export type DecisionAction = "Approved" | "Rejected";
export interface ApprovalDecision {
  id: string;
  timestamp: string;
  reviewer: string;
  action: DecisionAction;
  reason?: string;
}
export interface MarketForApproval {
  id: string;
  eventLabel: string;
  sport: Sport;
  competition: string;
  question: string;
  outcomes: string[];
  resolutionRules: string;
  officialSource: string;
  voidConditions: string;
  opensAt: string;
  closesAt: string;
  createdBy: string;
  createdByRole: string;
  submittedAt: string;
  estimatedVolume: string;
  isHighValue: boolean;
  status: ApprovalStatus;
  riskFlags: RiskFlag[];
  missingRules: string[];
  requiresSecondApproval: boolean;
  firstApprovedBy?: string;
  decisionHistory: ApprovalDecision[];
}

const fail = (error: unknown): never => {
  throw new Error(extractApiError(error).message);
};
const sport = (value?: string): Sport => value || "Other";
const mapStatus = (value: string): ApprovalStatus =>
  value === "REJECTED"
    ? "Rejected"
    : value === "APPROVED" || value === "OPEN"
      ? "Approved"
      : "Awaiting Review";
const mapMarket = (market: AdminMarket): MarketForApproval => ({
  id: market.id,
  eventLabel:
    market.subject?.name || market.sporting_event?.name || "Event unavailable",
  sport: sport(market.sport?.name),
  competition:
    market.competition?.name ||
    market.sporting_event?.competition?.name ||
    "Competition unavailable",
  question: market.question,
  outcomes: market.outcomes.map((outcome) => outcome.label),
  resolutionRules: market.rules || market.resolution_criteria || "",
  officialSource: market.resolution_source || "Source unavailable",
  voidConditions: "",
  opensAt: market.opens_at,
  closesAt: market.closes_at,
  createdBy: market.created_by?.email || "Backend user",
  createdByRole: "Market Operations Admin",
  submittedAt: market.updated_at || market.created_at || market.opens_at,
  estimatedVolume: "Volume unavailable",
  isHighValue: false,
  status: mapStatus(market.status),
  riskFlags: [],
  missingRules: [],
  requiresSecondApproval: false,
  decisionHistory: (market.status_transitions || [])
    .filter(
      (item) => item.to_status === "APPROVED" || item.to_status === "REJECTED",
    )
    .map((item) => ({
      id: item.id,
      timestamp: item.created_at,
      reviewer: "Authenticated reviewer",
      action: item.to_status === "REJECTED" ? "Rejected" : "Approved",
      reason: item.notes,
    })),
});

export async function fetchMarketsForApproval(): Promise<MarketForApproval[]> {
  try {
    const { data } = await apiClient.get("/market-admin/markets/", {
      params: { status: "PENDING_APPROVAL" },
    });
    return normalizeApiList<AdminMarket>(data).map(mapMarket);
  } catch (e) {
    return fail(e);
  }
}
export async function fetchMarketForApproval(id: string) {
  try {
    const { data } = await apiClient.get(`/market-admin/markets/${id}/`);
    return mapMarket(unwrapApiData<AdminMarket>(data));
  } catch (e) {
    return fail(e);
  }
}
export async function approveMarket(
  id: string,
  notes: string,
): Promise<MarketForApproval> {
  if (!notes.trim()) throw new Error("An approval note is required.");
  try {
    const { data } = await apiClient.post(
      `/market-admin/markets/${id}/approve/`,
      { notes },
    );
    return mapMarket(unwrapApiData<AdminMarket>(data));
  } catch (e) {
    return fail(e);
  }
}
export async function rejectMarket(
  id: string,
  notes: string,
): Promise<MarketForApproval> {
  if (!notes.trim()) throw new Error("A rejection note is required.");
  try {
    const { data } = await apiClient.post(
      `/market-admin/markets/${id}/reject/`,
      { notes },
    );
    return mapMarket(unwrapApiData<AdminMarket>(data));
  } catch (e) {
    return fail(e);
  }
}
export async function returnMarket(): Promise<never> {
  throw new Error(
    "Return for Changes is not supported by the current backend workflow.",
  );
}
