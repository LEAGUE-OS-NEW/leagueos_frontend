import { describe, expect, it } from 'vitest';
import { payoutPill } from './payoutStatus.ts';

describe('payoutPill', () => {
  it('marks a resolved market pending until settled', () => {
    expect(payoutPill('Resolved', false, false)).toEqual({ label: 'Payout pending', variant: 'pending' });
    expect(payoutPill('Resolved', true, false)).toEqual({ label: 'Paid out', variant: 'done' });
  });

  it('marks a voided market pending until refunded', () => {
    expect(payoutPill('Voided', false, false)).toEqual({ label: 'Refund pending', variant: 'pending' });
    expect(payoutPill('Voided', false, true)).toEqual({ label: 'Refunded', variant: 'done' });
  });

  it('returns null for every other status', () => {
    for (const status of ['Draft', 'Pending Approval', 'Upcoming', 'Live', 'Suspended', 'Closed', 'Cancelled']) {
      expect(payoutPill(status, true, true)).toBeNull();
    }
  });
});
