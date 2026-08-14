import {
  describe,
  expect,
  it,
} from "vitest";

import {
  backendQuantityToShares,
  normalizedPriceToUgxSharePrice,
  probabilityPctToUgxSharePrice,
  stakeUgxToBackendQuantity,
} from "./marketPricing";

describe(
  "market UGX share pricing",
  () => {
    it(
      "converts probability to UGX per share",
      () => {
        expect(
          probabilityPctToUgxSharePrice(
            50,
            10_000,
          ),
        ).toBe(5_000);

        expect(
          probabilityPctToUgxSharePrice(
            62,
            10_000,
          ),
        ).toBe(6_200);
      },
    );

    it(
      "converts backend normalized price to UGX",
      () => {
        expect(
          normalizedPriceToUgxSharePrice(
            0.5,
            10_000,
          ),
        ).toBe(5_000);
      },
    );

    it(
      "converts backend settlement units to shares",
      () => {
        expect(
          backendQuantityToShares(
            20_000,
            10_000,
          ),
        ).toBe(2);
      },
    );

    it(
      "calculates backend quantity from a UGX stake",
      () => {
        expect(
          stakeUgxToBackendQuantity(
            10_000,
            0.5,
          ),
        ).toBe(20_000);
      },
    );
  },
);
