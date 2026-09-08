import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import {
  fetchMarket,
  fetchMarketFeePreview,
  fetchMarketOrderBook,
  fetchMarkets,
  fetchSettledActivity,
  placeOrder,
  sellPosition,
} from './fanMarketsServices.ts';


vi.mock('./apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const market = { id:'market-1', question:'Question?', face_value_ugx:1000, outcomes:[{id:'outcome-1',side:'YES',label:'Yes'}], status:'OPEN', is_featured:false, created_at:'2026-01-01T00:00:00Z', sport:{name:'Football'}, category:{name:'Match Result'} };

describe('genuine market order integration', () => {
  beforeEach(() => vi.clearAllMocks());
  it('maps the public opening liquidity summary without inventing zero values', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...market,
        outcomes: [
          {
            id: 'outcome-1',
            side: 'YES',
            label: 'Yes',
            opening_price: '0.50000',
          },
          {
            id: 'outcome-2',
            side: 'NO',
            label: 'No',
            opening_price: '0.50000',
          },
        ],
        opening_reference: {
          YES: '0.50000',
          NO: '0.50000',
        },
        opening_liquidity_available: false,
        opening_liquidity: {
          initial_liquidity_ugx: '500000.0000',
          opening_spread_bps: 100,
          activation_status: 'ACTIVE',
        },
      },
    });

    const result = await fetchMarket('market-1');

    expect(result.parameters).toMatchObject({
      initialLiquidityUgx: 500000,
      openingSpreadBps: 100,
      openingLiquidityAvailable: false,
      liquidityActivationStatus: 'ACTIVE',
    });
  });

  it('maps settlement and refund visibility from the backend booleans', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...market, status: 'RESOLVED', is_settled: true, is_refunded: false } });
    const result = await fetchMarket('market-1');
    expect(result.isSettled).toBe(true);
    expect(result.isRefunded).toBe(false);
  });

  it('defaults settlement/refund visibility to false when the backend omits them', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...market, status: 'VOIDED' } });
    const result = await fetchMarket('market-1');
    expect(result.isSettled).toBe(false);
    expect(result.isRefunded).toBe(false);
  });

  it('returns the backend best ask without inventing a price', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { market_id:'market-1', outcome:{id:'outcome-1',side:'YES',label:'Yes'}, best_bid:null, best_ask:'0.62000', spread:null, total_bid_quantity:'0', total_ask_quantity:'1000', bids:[], asks:[], recent_trades:[] } });
    expect((await fetchMarketOrderBook('market-1','outcome-1')).best_ask).toBe('0.62000');
  });
  it('submits BUY with the explicit genuine normalized best ask', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: market });
    vi.mocked(apiClient.post).mockResolvedValue({ data:{id:'order-1',market:'market-1',outcome:'outcome-1',side:'BUY',quantity:'16129.0323',limit_price:'0.62000',filled_quantity:'0',average_fill_price:null,status:'OPEN',created_at:'2026-01-01T00:00:00Z'} });
    await placeOrder({marketId:'market-1',outcomeId:'YES',quantityUgx:10000,limitPrice:0.62});
    expect(apiClient.post).toHaveBeenCalledWith('/markets/market-1/orders/', expect.objectContaining({side:'BUY',limit_price:'0.62000'}));
  });

  it('marks only in-window OPEN markets with active liquidity and asks as tradeable', async () => {
    const outcomePair = [
      { id: 'yes', side: 'YES', label: 'Yes', opening_price: '0.62000' },
      { id: 'no', side: 'NO', label: 'No', opening_price: '0.38000' },
    ];
    const openRecords = [
      {
        ...market, id: 'liquid', question: 'Liquid', outcomes: outcomePair,
        opens_at: '2026-01-01T00:00:00Z', closes_at: '2099-01-01T00:00:00Z',
        opening_liquidity_available: true,
        opening_liquidity: { initial_liquidity_ugx: '400000', activation_status: 'ACTIVE', opening_spread_bps: 0 },
        trading_snapshot: { volume: '12000', trader_count: 3, outcomes: { yes: { best_bid: null, best_ask: '0.62000', last_trade: null, mark_price: '0.62000', mark_source: 'BEST_QUOTE' }, no: { best_bid: null, best_ask: '0.38000', last_trade: null, mark_price: '0.38000', mark_source: 'BEST_QUOTE' } } },
      },
      {
        ...market, id: 'unfunded', question: 'Unfunded', outcomes: outcomePair,
        opens_at: '2026-01-01T00:00:00Z', closes_at: '2099-01-01T00:00:00Z',
        opening_liquidity_available: false,
      },
      {
        ...market, id: 'expired', question: 'Expired', outcomes: outcomePair,
        opens_at: '2020-01-01T00:00:00Z', closes_at: '2020-02-01T00:00:00Z',
        opening_liquidity_available: true,
      },
    ];
    vi.mocked(apiClient.get).mockImplementation((_url, config) => Promise.resolve({
      data: { results: (config as { params?: { status?: string } })?.params?.status === 'OPEN' ? openRecords : [], next: null },
    }));

    const result = await fetchMarkets();

    expect(result.find((item) => item.id === 'liquid')).toMatchObject({ isTradeable: true, liquidityLabel: '400,000', volumeLabel: '12,000', tradersCount: 3 });
    expect(result.find((item) => item.id === 'unfunded')).toMatchObject({ status: 'live', isTradeable: false });
    expect(result.find((item) => item.id === 'expired')).toMatchObject({ status: 'closed', isTradeable: false });
  });
  it('uses authoritative decimal fee-preview values without sending a client fee', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: market });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {
      estimated_order_notional: '10000.0000', effective_fee_bps: 0,
      estimated_fee: '0.0000', estimated_total_debit: '10000.0000',
      estimated_net_proceeds: '0.0000', currency: 'UGX',
    } });

    const preview = await fetchMarketFeePreview({
      marketId: 'market-1', outcomeId: 'YES', quantityUgx: 10000, limitPrice: 0.5,
    });

    expect(preview).toMatchObject({ effectiveFeeBps: 0, estimatedFee: '0.0000', estimatedTotalDebit: '10000.0000' });
    expect(apiClient.post).toHaveBeenCalledWith('/markets/market-1/orders/fee-preview/', expect.not.objectContaining({ fee: expect.anything() }));
  });
  it('submits an OPEN GTC limit BUY without requesting an order book', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: market });
    vi.mocked(apiClient.post).mockResolvedValue({ data:{id:'order-limit',market:'market-1',outcome:'outcome-1',side:'BUY',quantity:'20000.0000',limit_price:'0.50000',filled_quantity:'0',average_fill_price:null,status:'OPEN',created_at:'2026-01-01T00:00:00Z'} });
    const result = await placeOrder({marketId:'market-1',outcomeId:'YES',quantityUgx:10000,limitPrice:0.5});
    expect(result.status).toBe('OPEN');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/markets/market-1/orders/', expect.objectContaining({ time_in_force:'GTC', limit_price:'0.50000' }));
  });
  it('maps actual FILLED average price from the backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: market });
    vi.mocked(apiClient.post).mockResolvedValue({ data:{id:'order-filled',market:'market-1',outcome:'outcome-1',side:'BUY',quantity:'20000.0000',limit_price:'0.50000',filled_quantity:'20000.0000',average_fill_price:'0.48000',status:'FILLED',created_at:'2026-01-01T00:00:00Z'} });
    const result = await placeOrder({marketId:'market-1',outcomeId:'YES',quantityUgx:10000,limitPrice:0.5});
    expect(result).toMatchObject({ status:'FILLED', averageFillPrice:480, remainingQuantityUgx:0 });
  });
  it('submits SELL with shares converted to backend quantity and best bid', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: market });
    vi.mocked(apiClient.post).mockResolvedValue({ data:{id:'order-2',market:'market-1',outcome:'outcome-1',side:'SELL',quantity:'2500.0000',limit_price:'0.55000',filled_quantity:'0',average_fill_price:null,status:'OPEN',created_at:'2026-01-01T00:00:00Z'} });
    await sellPosition({marketId:'market-1',backendOutcomeId:'outcome-1',outcomeId:'YES',shares:2.5,limitPrice:0.55});
    expect(apiClient.post).toHaveBeenCalledWith('/markets/market-1/orders/', expect.objectContaining({side:'SELL',quantity:'2500.0000',limit_price:'0.55000'}));
  });
  it('surfaces settled positions with real WON/LOST/VOIDED status and net payout, filtering out non-settlement activity', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        count: 4,
        next: null,
        previous: null,
        results: [
          { id:'position-settlement:1:win', event_type:'SETTLEMENT_WIN', occurred_at:'2026-01-05T00:00:00Z', currency:'UGX', market_id:'market-1', outcome_id:'outcome-1', market_question:'Will KCCA win?', outcome_label:'Yes', quantity:'10.0000', wallet_amount:'9.6000' },
          { id:'position-settlement:2:loss', event_type:'SETTLEMENT_LOSS', occurred_at:'2026-01-05T00:05:00Z', currency:'UGX', market_id:'market-1', outcome_id:'outcome-2', market_question:'Will KCCA win?', outcome_label:'No', quantity:'5.0000', wallet_amount:'0.0000' },
          { id:'position-void-refund:3:refund', event_type:'VOID_REFUND', occurred_at:'2026-01-05T00:10:00Z', currency:'UGX', market_id:'market-2', outcome_id:'outcome-3', market_question:'Match postponed?', outcome_label:'Yes', quantity:'2.0000', wallet_amount:'1.5000' },
          { id:'market-fill:4:buy', event_type:'BUY_FILL', occurred_at:'2026-01-05T00:15:00Z', currency:'UGX', market_id:'market-3', outcome_id:'outcome-4', market_question:'Unrelated open market?', outcome_label:'Yes', quantity:'1.0000', wallet_amount:null },
        ],
      },
    });

    const result = await fetchSettledActivity();

    expect(result).toHaveLength(3);
    expect(result).toContainEqual(expect.objectContaining({ outcome:'WON', payoutUgx:9.6, marketQuestion:'Will KCCA win?' }));
    expect(result).toContainEqual(expect.objectContaining({ outcome:'LOST', payoutUgx:0 }));
    expect(result).toContainEqual(expect.objectContaining({ outcome:'VOIDED', payoutUgx:1.5 }));
  });
});
