import { describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import { markProposalDuplicate } from './marketAdminService.ts';
import listSource from '../pages/admin/markets/MarketsListPage.tsx?raw';
import detailSource from '../pages/admin/markets/MarketDetailPage.tsx?raw';
import serviceSource from './marketAdminService.ts?raw';
import resultSource from './resultVerificationService.ts?raw';

vi.mock('./apiClient.ts', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('admin Markets backend-contract regressions', () => {
  it('does not use participant fills for admin market aggregates or details', () => {
    expect(listSource).not.toContain('fetchContracts');
    expect(detailSource).not.toContain('fetchContracts');
    expect(serviceSource).not.toContain("apiClient.get('/market-fills/'");
  });

  it('shows unavailable aggregate metrics and no fake contract identities', () => {
    const list = listSource;
    const detail = detailSource;
    expect(list).toContain('Volume unavailable');
    expect(list).toContain('Contract count unavailable');
    expect(detail).toContain('Admin-wide contracts are unavailable');
    expect(detail).not.toContain('contract.buyer');
    expect(detail).not.toContain('contract.seller');
  });

  it('models and renders order-book quantities as shares and supports identity-free recent trades', () => {
    const service = serviceSource;
    const detail = detailSource;
    expect(service).toContain('orderCount: level.order_count');
    expect(service).toContain('recentTrades: data.recent_trades.map');
    expect(detail).toContain("shares.toLocaleString()} shares");
    expect(detail).not.toContain('formatUgx(level.quantity');
  });

  it('does not submit MARK_DUPLICATE without a target', async () => {
    await expect(markProposalDuplicate('proposal-id', 'Same event')).rejects.toThrow(
      'Select a specific duplicate market or proposal',
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('contains no production seeded disputes', () => {
    const service = resultSource;
    expect(service).not.toMatch(/seed-dispute|Fan #2231|Fan #5560|Onduparaka FC vs Wakiso Giants/);
    expect(service).toContain("apiClient.get('/market-admin/result-disputes/')");
  });
});
