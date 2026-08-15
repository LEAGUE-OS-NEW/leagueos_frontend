import apiClient from "../apiClient.ts";
import { isPaginatedResponse, unwrapApiData } from "../apiUtils.ts";
import type {
  ApiEnvelope,
  ComplianceDecision,
  KYCSession,
  PaginatedResponse,
  RiskAssessment,
  RiskProfile,
} from "../../types/api.ts";
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
const page = <T>(
  data: T[] | PaginatedResponse<T> | ApiEnvelope<T[] | PaginatedResponse<T>>,
): Page<T> => {
  const value = unwrapApiData(data);
  return isPaginatedResponse<T>(value)
    ? value
    : { count: value.length, next: null, previous: null, results: value };
};
const getPage = async <T>(
  url: string,
  params?: Record<string, string | number>,
) => page<T>((await apiClient.get(url, { params })).data);
export const fetchKYCSessions = (params?: Record<string, string | number>) =>
  getPage<KYCSession>("/admin/compliance/kyc-sessions/", params);
export const fetchKYCSession = async (id: string) =>
  unwrapApiData<KYCSession>(
    (await apiClient.get(`/admin/compliance/kyc-sessions/${id}/`)).data,
  );
export const fetchRiskProfiles = (params?: Record<string, string | number>) =>
  getPage<RiskProfile>("/admin/compliance/risk-profiles/", params);
export const fetchRiskProfile = async (id: string) =>
  unwrapApiData<RiskProfile>(
    (await apiClient.get(`/admin/compliance/risk-profiles/${id}/`)).data,
  );
export const fetchRiskAssessments = (
  params?: Record<string, string | number>,
) => getPage<RiskAssessment>("/admin/compliance/risk-assessments/", params);
export const reassessRisk = async (participantId: string) =>
  unwrapApiData<RiskAssessment>(
    (
      await apiClient.post("/admin/compliance/risk-reassess/", {
        participant_id: participantId,
      })
    ).data,
  );
export const fetchComplianceDecisions = (
  params?: Record<string, string | number>,
) => getPage<ComplianceDecision>("/admin/compliance/decisions/", params);
export interface AdminUserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}
// Resolves a KYC session's participant_id (the user's real id) to their
// real name/email via platform_admin's user-detail endpoint. Gated on the
// backend by an internal admin.users.view permission check, separate from
// manage_compliance — a compliance-only admin may not hold it, so callers
// must treat a rejection as expected and fall back gracefully rather than
// surfacing it as a page-level error.
export const fetchAdminUserSummary = async (userId: string) =>
  unwrapApiData<AdminUserSummary>(
    (await apiClient.get(`/admin/users/${userId}/`)).data,
  );
export const proposeComplianceDecision = async (payload: {
  participant_id: string;
  decision_type: string;
  requested_change: Record<string, unknown>;
  reason: string;
}) =>
  unwrapApiData<ComplianceDecision>(
    (await apiClient.post("/admin/compliance/decisions/", payload)).data,
  );
export const fetchComplianceDecision = async (id: string) =>
  unwrapApiData<ComplianceDecision>(
    (await apiClient.get(`/admin/compliance/decisions/${id}/`)).data,
  );
export const decideComplianceProposal = async (
  id: string,
  approve: boolean,
  reason: string,
) =>
  unwrapApiData<ComplianceDecision>(
    (
      await apiClient.post(`/admin/compliance/decisions/${id}/decide/`, {
        approve,
        reason,
      })
    ).data,
  );
// Directly updates a participant's KYC status, which is what
// /markets/eligibility/ reads to compute market eligibility — this is
// the real effect behind "Approve/Reject Verification" in the compliance
// queue UI.
export const updateParticipantKycStatus = async (
  participantId: string,
  kycStatus: "VERIFIED" | "REJECTED",
) =>
  unwrapApiData<Record<string, unknown>>(
    (
      await apiClient.patch(
        `/market-admin/participants/${participantId}/compliance/`,
        { kyc_status: kycStatus },
      )
    ).data,
  );
