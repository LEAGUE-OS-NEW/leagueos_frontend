import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient';
import { fetchAwaitingResult, settleResult, verifyResult } from './resultVerificationService';
vi.mock('./apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./marketAdminService', () => ({ fetchMarket: vi.fn(), fetchMarkets: vi.fn(), resolveMarket: vi.fn() }));
import { fetchMarket } from './marketAdminService';

describe('result verification aggregation', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ['AWAITING_RESULT', 'Awaiting Result'], ['DISPUTE_WINDOW', 'Dispute Window'], ['DISPUTED', 'Disputed'],
    ['READY_TO_RESOLVE', 'Ready to Resolve'], ['READY_TO_SETTLE', 'Ready to Settle'], ['SETTLED', 'Settled'],
    ['VOIDED_REFUNDED', 'Voided / Refunded'],
  ])('maps %s without disguising backend lifecycle state', async (workflow_state, expected) => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'm1', question: 'Q?', status: 'CLOSED', workflow_state, outcomes: [], sporting_event: { starts_at: '2025-12-31T18:00:00Z' }, closes_at: '2026-01-01T00:00:00Z', settles_by: '2026-01-02T00:00:00Z', can_resolve: workflow_state === 'READY_TO_RESOLVE', can_settle: workflow_state === 'READY_TO_SETTLE' }] });
    await expect(fetchAwaitingResult()).resolves.toEqual([expect.objectContaining({ stage: expected })]);
    expect(apiClient.get).toHaveBeenCalledWith('/market-admin/result-verification/');
  });

  it('keeps kickoff, trading close, settlement target and dispute deadline distinct', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'm1', question: 'Q?', workflow_state: 'DISPUTE_WINDOW', outcomes: [], sporting_event: { starts_at: '2026-01-01T10:00:00Z' }, closes_at: '2026-01-01T09:00:00Z', settles_by: '2026-01-02T10:00:00Z', provisional_result: { published_at: '2026-01-01T11:00:00Z', dispute_deadline: '2026-01-03T11:00:00Z' } }] });
    await expect(fetchAwaitingResult()).resolves.toEqual([expect.objectContaining({ kickoff: '2026-01-01T10:00:00Z', tradingClose: '2026-01-01T09:00:00Z', settlementTarget: '2026-01-02T10:00:00Z', disputeDeadline: '2026-01-03T11:00:00Z', disputeWindowHours: 48 })]);
  });

  it('publishes a provisional result without settling or overriding the backend dispute-window default', async () => {
    vi.mocked(fetchMarket).mockResolvedValue({ id: 'm1', outcomes: [{ id: 'YES', backendOutcomeId: 'outcome-1' }], eventLabel: 'Event', question: 'Q?', competition: '', kickoff: '', description: '', auditHistory: [] } as never);
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await verifyResult('m1', { winningOutcomeId: 'YES', evidenceNote: 'Official source' });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/market-admin/markets/m1/provisional-result/', expect.not.objectContaining({ dispute_window_hours: expect.anything() }));
    expect(apiClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/settle/'), expect.anything());
  });

  it('settles only through the distinct settle action when can_settle is authoritative', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'm1', question: 'Q?', workflow_state: 'READY_TO_SETTLE', outcomes: [], can_settle: true }] });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'settlement-1', total_position_count: 3 } });
    await expect(settleResult('m1')).resolves.toEqual(expect.objectContaining({ reference: 'settlement-1', totalPositionCount: 3 }));
    expect(apiClient.post).toHaveBeenCalledWith('/markets/m1/settle/');
  });
});
