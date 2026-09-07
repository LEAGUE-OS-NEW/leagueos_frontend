import { describe, expect, it } from 'vitest';
import { marketDisplayStatus } from './marketDisplayState.ts';

describe('marketDisplayStatus', () => {
  const now = Date.parse('2026-09-07T12:00:00Z');

  it.each([
    ['OPEN', '2026-09-07T11:00:00Z', '2026-09-07T13:00:00Z', 'Live'],
    ['OPEN', '2026-09-07T11:00:00Z', '2026-09-07T12:00:00Z', 'Closed'],
    ['OPEN', '2026-09-08T11:00:00Z', '2026-09-08T13:00:00Z', 'Upcoming'],
    ['CLOSED', null, null, 'Closed'],
    ['RESOLVED', null, null, 'Resolved'],
    ['SETTLED', null, null, 'Settled'],
    ['VOIDED', null, null, 'Voided'],
  ])('maps %s without contradictory trading state', (status, opensAt, closesAt, expected) => {
    expect(marketDisplayStatus(status, opensAt, closesAt, now)).toBe(expected);
  });
});
