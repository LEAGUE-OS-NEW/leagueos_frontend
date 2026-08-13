// Admin dashboard summary — GET /admin/dashboard/. Every field is
// permission-conditional server-side (present only if the caller holds the
// permission that computes it), so callers must treat every field as
// possibly absent rather than assuming a fixed shape.

import apiClient from './apiClient.ts';

export interface AdminRoleDistributionEntry {
  roleName: string;
  count: number;
}

export interface AdminDashboardSummary {
  activeAdministrators?: number;
  roleDistribution?: AdminRoleDistributionEntry[];
  pendingMarkets?: number;
  publishedMarkets?: number;
  suspendedMarkets?: number;
  pendingResultVerification?: number;
  complianceCases?: number;
  supportCases?: number;
  financialReconciliationStatus?: number;
  sportsDataIssues?: number;
}

function adapt(raw: Record<string, unknown>): AdminDashboardSummary {
  const summary: AdminDashboardSummary = {};
  if (typeof raw.active_administrators === 'number') summary.activeAdministrators = raw.active_administrators;
  if (Array.isArray(raw.role_distribution)) {
    summary.roleDistribution = raw.role_distribution.map((entry) => {
      const record = entry as Record<string, unknown>;
      return { roleName: String(record.role__name ?? 'Unknown role'), count: Number(record.count ?? 0) };
    });
  }
  if (typeof raw.pending_markets === 'number') summary.pendingMarkets = raw.pending_markets;
  if (typeof raw.published_markets === 'number') summary.publishedMarkets = raw.published_markets;
  if (typeof raw.suspended_markets === 'number') summary.suspendedMarkets = raw.suspended_markets;
  if (typeof raw.pending_result_verification === 'number') summary.pendingResultVerification = raw.pending_result_verification;
  if (typeof raw.compliance_cases === 'number') summary.complianceCases = raw.compliance_cases;
  if (typeof raw.support_cases === 'number') summary.supportCases = raw.support_cases;
  if (typeof raw.financial_reconciliation_status === 'number') {
    summary.financialReconciliationStatus = raw.financial_reconciliation_status;
  }
  if (typeof raw.sports_data_issues === 'number') summary.sportsDataIssues = raw.sports_data_issues;
  return summary;
}

export async function fetchAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await apiClient.get('/admin/dashboard/');
  return adapt(response.data as Record<string, unknown>);
}
