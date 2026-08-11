import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient.ts';
import { fetchMarketOrderBook, placeOrder, sellPosition } from './fanMarketsServices.ts';

vi.mock('./apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const market = { id:'market-1', question:'Question?', outcomes:[{id:'outcome-1',side:'YES',label:'Yes'}], status:'OPEN', is_featured:false, created_at:'2026-01-01T00:00:00Z', sport:{name:'Football'}, category:{name:'Match Result'} };

describe('genuine market order integration', () => {
  beforeEach(() => vi.clearAllMocks());
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
  it('submits SELL with shares converted to backend quantity and best bid', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data:{id:'order-2',market:'market-1',outcome:'outcome-1',side:'SELL',quantity:'2500.0000',limit_price:'0.55000',filled_quantity:'0',average_fill_price:null,status:'OPEN',created_at:'2026-01-01T00:00:00Z'} });
    await sellPosition({marketId:'market-1',backendOutcomeId:'outcome-1',outcomeId:'YES',shares:2.5,limitPrice:0.55});
    expect(apiClient.post).toHaveBeenCalledWith('/markets/market-1/orders/', expect.objectContaining({side:'SELL',quantity:'2500.0000',limit_price:'0.55000'}));
  });
});
