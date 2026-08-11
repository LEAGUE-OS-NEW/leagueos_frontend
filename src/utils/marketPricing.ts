export const MARKET_FACE_VALUE_UGX = 1_000;

export function probabilityPctToUgxSharePrice(
  probabilityPct: number,
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
      MARKET_FACE_VALUE_UGX,
  );
}

export function normalizedPriceToUgxSharePrice(
  normalizedPrice: number,
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
      MARKET_FACE_VALUE_UGX,
  );
}

export function ugxSharePriceToNormalizedPrice(
  ugxPrice: number,
): number {
  return ugxPrice /
    MARKET_FACE_VALUE_UGX;
}

export function backendQuantityToShares(
  backendQuantity: number,
): number {
  return backendQuantity /
    MARKET_FACE_VALUE_UGX;
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
  amount: number,
): string {
  return `${formatMarketUgx(
    amount,
  )}/share`;
}
