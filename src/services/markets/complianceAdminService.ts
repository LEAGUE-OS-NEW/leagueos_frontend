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
