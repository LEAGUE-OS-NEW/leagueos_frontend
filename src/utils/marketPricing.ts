export function probabilityPctToUgxSharePrice(
  probabilityPct: number,
  faceValueUgx: number,
): number {
  const bounded = Math.max(
    0,
    Math.min(
      100,
      probabilityPct,
    ),
  );

  return Math.round(
    (bounded / 100) *
      faceValueUgx,
  );
}

export function normalizedPriceToUgxSharePrice(
  normalizedPrice: number,
  faceValueUgx: number,
): number {
  const bounded = Math.max(
    0,
    Math.min(
      1,
      normalizedPrice,
    ),
  );

  return Math.round(
    bounded *
      faceValueUgx,
  );
}

export function ugxSharePriceToNormalizedPrice(
  ugxPrice: number,
  faceValueUgx: number,
): number {
  return ugxPrice /
    faceValueUgx;
}

export function backendQuantityToShares(
  backendQuantity: number,
  faceValueUgx: number,
): number {
  return backendQuantity /
    faceValueUgx;
}

export function sharesToBackendQuantity(shares: number, faceValueUgx: number): number {
  return shares * faceValueUgx;
}

export function stakeUgxToBackendQuantity(
  stakeUgx: number,
  normalizedPrice: number,
): number {
  if (
    stakeUgx <= 0 ||
    normalizedPrice <= 0
  ) {
    return 0;
  }

  /*
   * Backend quantity is settlement-value units.
   *
   * Example:
   * UGX 10,000 stake at 50%:
   * backend quantity = 10,000 / 0.5 = 20,000
   * reserve = 20,000 * 0.5 = UGX 10,000
   * shares = 20,000 / 1,000 = 20 shares
   */
  return stakeUgx /
    normalizedPrice;
}

export function formatMarketUgx(
  amount: number,
): string {
  return `UGX ${Math.round(
    amount,
  ).toLocaleString("en-UG")}`;
}

export function formatMarketSharePrice(
  amount: number | null,
  markSource?: 'LAST_TRADE' | 'MIDPOINT' | 'BEST_QUOTE' | 'OPENING_REFERENCE' | 'NO_LIQUIDITY',
): string {
  if (amount === null || markSource === 'NO_LIQUIDITY') return 'Awaiting opening liquidity';
  if (markSource === 'OPENING_REFERENCE') return `${formatMarketUgx(amount)}/share · Opening price`;
  if (markSource === 'MIDPOINT' || markSource === 'BEST_QUOTE') return 'Awaiting first trade';
  return `${formatMarketUgx(
    amount,
  )}/share`;
}
