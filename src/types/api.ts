export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface NamedResource {
  id: string;
  name: string;
  slug?: string;
}
export interface MarketCategory extends NamedResource {
  description?: string;
  display_order?: number;
}
export interface SportResource extends NamedResource {
  code?: string;
}
export interface SportingParticipant extends NamedResource {
  short_name?: string;
  kind?: string;
  country_code?: string;
  sport?: SportResource;
}

export interface SportingEventParticipant {
  role: string;
  position: number;
  participant: SportingParticipant;
}
export interface SportingEvent {
  id: string;
  name: string;
  event_type: string;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  venue?: string;
  country_code?: string;
  sport: SportResource;
  competition?:
    (NamedResource & { country_code?: string; sport?: SportResource }) | null;
  participants: SportingEventParticipant[];
}
export interface MarketOutcome {
  id: string;
  side: string;
  position: number;
  label: string;
  description?: string;
}
export interface Market {
  id: string;
  question: string;
  description?: string;
  rules?: string;
  resolution_source?: string;
  resolution_criteria?: string;
  scope_type: string;
  status: string;
  opens_at: string;
  closes_at: string;
  is_featured: boolean;
  sport: SportResource;
  category: MarketCategory;
  sporting_event?: SportingEvent | null;
  competition?: NamedResource | null;
  participant?: SportingParticipant | null;
  custom_subject?: string;
  subject: { type: string; id: string | null; name: string };
  outcomes: MarketOutcome[];
  winning_outcome: string | null;
  is_watchlisted: boolean;
  created_at?: string;
  updated_at?: string;
}
export interface AdminMarket extends Market {
  created_by?: { id: string; email?: string; first_name?: string; last_name?: string; full_name?: string } | null;
  approved_by?: { id: string; email?: string; first_name?: string; last_name?: string; full_name?: string } | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  status_transitions?: Array<{
    id: string;
    action?: string;
    from_status: string;
    to_status: string;
    actor_email?: string;
    notes?: string;
    created_at: string;
  }>;
}
export interface MarketProposal {
  id: string;
  question: string;
  description?: string;
  status: string;
  duplicate_status?: string;
  sporting_event?: string | null;
  sporting_event_id?: string | null;
  proposer_id: string;
  approved_market_id?: string | null;
  proposed_event_title?: string;
  proposed_resolution_source?: string;
  proposed_closes_at?: string | null;
  submitted_at?: string;
  created_at: string;
}
export interface KYCSession {
  id: string;
  participant_id: string;
  provider_code: string;
  status: string;
  verification_level: string;
  initiated_at: string;
  expires_at: string | null;
  completed_at: string | null;
  last_event_at: string | null;
  failure_code: string;
}
export interface RiskProfile {
  id: string;
  participant_id: string;
  current_score: number;
  risk_band: string;
  restriction_recommendation: string;
  reason_codes: string[];
  last_assessed_at: string;
  assessment_source: string;
  manual_override_state: string;
  override_at: string | null;
  revision: number;
}
export interface RiskAssessment {
  id: string;
  participant_id: string;
  band?: string;
  score?: number;
  reason_codes?: string[];
  created_at: string;
  [key: string]: unknown;
}
export interface ComplianceDecision {
  id: string;
  participant_id: string;
  decision_type: string;
  requested_change: Record<string, unknown>;
  reason: string;
  before_snapshot: Record<string, unknown>;
  proposed_after_snapshot: Record<string, unknown>;
  proposer_id: string;
  status: string;
  decided_by_id: string | null;
  decision_reason: string;
  proposed_at: string;
  decided_at: string | null;
}
