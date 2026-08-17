import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import { fetchMarket, fetchMarketOrderBook, placeOrder, sellPosition } from './fanMarketsServices.ts';

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
});
