// Fan trading — service layer (Journey 3: discover a market, place an
// order, track it, sell before resolution). There's no real order-book
// matching engine here (or asked for) — placing an order simulates
// immediate matching at the market's current displayed price, which is
// what a trade looks like from a single fan's point of view on a small,
// liquid binary market. Every position is recorded as a Contract through
// marketAdminService's shared in-memory store, so a fan's trade shows up in
// the admin's Contracts/Trading tabs within the same session, and admin
// resolution flows back out to the fan's positions the same way.

import { useAuthStore } from '../store/authStore';
import {
  fetchAllContracts,
  fetchMarket,
  recordContract,
  sellContract,
  type Contract,
  type Market,
  type OutcomeId,
} from './marketAdminService';

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail(message: string): never {
  throw new Error(message);
}

function currentFanIdentity(): string {
  const user = useAuthStore.getState().user;
  return user?.full_name || user?.email || 'You';
}

export interface PlaceOrderInput {
  marketId: string;
  outcomeId: OutcomeId;
  quantityUgx: number;
}

export interface Position {
  contract: Contract;
  market: Market;
}

export async function placeOrder(input: PlaceOrderInput): Promise<Contract> {
  const market = await fetchMarket(input.marketId);
  if (market.status !== 'Live') {
    fail(`${market.eventLabel} is not open for trading right now.`);
  }
  if (input.quantityUgx < market.parameters.minTradeUgx || input.quantityUgx > market.parameters.maxTradeUgx) {
    fail(
      `Enter an amount between UGX ${market.parameters.minTradeUgx.toLocaleString()} and UGX ${market.parameters.maxTradeUgx.toLocaleString()}.`,
    );
  }

  const outcome = market.outcomes.find((item) => item.id === input.outcomeId);
  if (!outcome) fail('Select YES or NO.');

  const contract = recordContract({
    marketId: market.id,
    outcomeId: input.outcomeId,
    price: outcome.price,
    quantityUgx: input.quantityUgx,
    buyer: currentFanIdentity(),
  });
  return delay({ ...contract });
}

export async function fetchMyPositions(): Promise<Position[]> {
  const identity = currentFanIdentity();
  const allContracts = await fetchAllContracts();
  const mine = allContracts.filter((contract) => contract.buyer === identity);

  const marketIds = [...new Set(mine.map((contract) => contract.marketId))];
  const marketEntries = await Promise.all(
    marketIds.map((id) => fetchMarket(id).then((market) => [id, market] as const)),
  );
  const marketsById = new Map(marketEntries);

  return mine
    .map((contract) => ({ contract, market: marketsById.get(contract.marketId)! }))
    .filter((position) => position.market)
    .sort((a, b) => new Date(b.contract.matchedAt).getTime() - new Date(a.contract.matchedAt).getTime());
}

export async function sellPosition(contractId: string): Promise<Contract> {
  return sellContract(contractId);
}
