import type { OutcomeId } from '../../../../services/fanMarketsServices';

export type TradeExecutionMode =
  | 'BUY_NOW'
  | 'LIMIT_ORDER';

export interface TradeOrderDraft {
  marketId: string;
  outcomeId: OutcomeId;
  mode: TradeExecutionMode;

  // Human-facing UGX price per winning share.
  price: number;

  // Backend normalized probability/price:
  // 0 < limitPrice < 1.
  limitPrice: number;

  // Total UGX the user intends to commit.
  amount: number;

  // Human-facing estimated share count.
  contracts: number;
}

export function isTradeOrderDraft(
  value: unknown,
): value is TradeOrderDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft =
    value as Partial<TradeOrderDraft>;

  return (
    typeof draft.marketId === 'string' &&
    draft.marketId.length > 0 &&
    (
      draft.outcomeId === 'YES' ||
      draft.outcomeId === 'NO'
    ) &&
    (
      draft.mode === 'BUY_NOW' ||
      draft.mode === 'LIMIT_ORDER'
    ) &&
    typeof draft.price === 'number' &&
    Number.isFinite(draft.price) &&
    draft.price > 0 &&
    typeof draft.limitPrice === 'number' &&
    Number.isFinite(draft.limitPrice) &&
    draft.limitPrice > 0 &&
    draft.limitPrice < 1 &&
    typeof draft.amount === 'number' &&
    Number.isFinite(draft.amount) &&
    draft.amount > 0 &&
    typeof draft.contracts === 'number' &&
    Number.isFinite(draft.contracts) &&
    draft.contracts > 0
  );
}

export interface TradeEntryState {
  outcomeId?: OutcomeId;
  amount?: number;
}

export function isTradeEntryState(
  value: unknown,
): value is TradeEntryState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state =
    value as Partial<TradeEntryState>;

  if (
    state.outcomeId !== undefined &&
    state.outcomeId !== 'YES' &&
    state.outcomeId !== 'NO'
  ) {
    return false;
  }

  if (
    state.amount !== undefined &&
    (
      typeof state.amount !== 'number' ||
      !Number.isFinite(state.amount) ||
      state.amount <= 0
    )
  ) {
    return false;
  }

  return true;
}
