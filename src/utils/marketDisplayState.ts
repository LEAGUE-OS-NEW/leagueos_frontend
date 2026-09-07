export type MarketDisplayStatus = 'Draft' | 'Pending Approval' | 'Upcoming' | 'Live' | 'Suspended' | 'Closed' | 'Resolved' | 'Settled' | 'Voided' | 'Cancelled';

export function marketDisplayStatus(status: string, opensAt?: string | null, closesAt?: string | null, now = Date.now()): MarketDisplayStatus {
  if (status === 'DRAFT' || status === 'REJECTED') return 'Draft';
  if (status === 'PENDING_APPROVAL') return 'Pending Approval';
  if (status === 'VOIDED' || status === 'REFUNDED') return 'Voided';
  if (status === 'SETTLED') return 'Settled';
  if (status === 'RESOLVED') return 'Resolved';
  if (status === 'CLOSED') return 'Closed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'SUSPENDED') return 'Suspended';
  const opens = opensAt ? Date.parse(opensAt) : Number.NaN;
  const closes = closesAt ? Date.parse(closesAt) : Number.NaN;
  if (!Number.isNaN(opens) && opens > now) return 'Upcoming';
  if (!Number.isNaN(closes) && closes <= now) return 'Closed';
  if (status === 'OPEN') return 'Live';
  if (status === 'APPROVED') return 'Upcoming';
  return 'Draft';
}
