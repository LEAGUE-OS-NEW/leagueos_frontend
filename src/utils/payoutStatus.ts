export interface PayoutPill {
  label: string;
  variant: 'pending' | 'done';
}

/**
 * A market's own status field (Resolved/Voided) doesn't say whether the
 * payout or refund has actually executed — that's tracked separately.
 * This derives the secondary indicator every status-pill display needs.
 */
export function payoutPill(status: string, isSettled: boolean, isRefunded: boolean): PayoutPill | null {
  if (status === 'Resolved') {
    return isSettled ? { label: 'Paid out', variant: 'done' } : { label: 'Payout pending', variant: 'pending' };
  }
  if (status === 'Voided') {
    return isRefunded ? { label: 'Refunded', variant: 'done' } : { label: 'Refund pending', variant: 'pending' };
  }
  return null;
}
