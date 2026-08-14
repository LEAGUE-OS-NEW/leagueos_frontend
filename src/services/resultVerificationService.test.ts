import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient';
import { fetchAwaitingResult } from './resultVerificationService';
vi.mock('./apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('result verification aggregation', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ['AWAITING_RESULT', 'Awaiting Result'], ['DISPUTE_WINDOW', 'Dispute Window'], ['DISPUTED', 'Disputed'],
    ['READY_TO_RESOLVE', 'Ready to Resolve'], ['READY_TO_SETTLE', 'Ready to Settle'], ['SETTLED', 'Settled'],
    ['VOIDED_REFUNDED', 'Voided / Refunded'],
  ])('maps %s without disguising backend lifecycle state', async (workflow_state, expected) => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'm1', question: 'Q?', status: 'CLOSED', workflow_state, outcomes: [], closes_at: '2026-01-01T00:00:00Z' }] });
    await expect(fetchAwaitingResult()).resolves.toEqual([expect.objectContaining({ stage: expected })]);
    expect(apiClient.get).toHaveBeenCalledWith('/market-admin/result-verification/');
  });
});
