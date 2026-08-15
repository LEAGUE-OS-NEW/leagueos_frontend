// Platform-wide audit log — read-only, backed by platform_admin's real
// GET /admin/audit/ (accounts.AuditLog under the hood). No frontend page
// consumed this endpoint before now, despite it being fully built.

import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';

export interface AuditLogEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  requestId: string;
  ipAddress: string | null;
  userAgent: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}

function adapt(raw: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(raw.id),
    actorEmail: raw.actor_email ? String(raw.actor_email) : null,
    action: String(raw.action ?? ''),
    resourceType: String(raw.resource_type ?? ''),
    resourceId: raw.resource_id ? String(raw.resource_id) : '',
    requestId: raw.request_id ? String(raw.request_id) : '',
    ipAddress: raw.ip_address ? String(raw.ip_address) : null,
    userAgent: String(raw.user_agent ?? ''),
    metadata: (raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}) as Record<string, unknown>,
    timestamp: String(raw.timestamp ?? ''),
  };
}

// The backend caps this at 200 rows server-side and has no pagination
// beyond that cap — filters are the only way to narrow a large log.
export async function fetchAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  const params: Record<string, string> = {};
  if (filters.action) params.action = filters.action;
  if (filters.userId) params.user_id = filters.userId;
  if (filters.resourceType) params.resource_type = filters.resourceType;
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  const response = await apiClient.get('/admin/audit/', { params });
  return normalizeApiList<Record<string, unknown>>(response.data).map(adapt);
}
