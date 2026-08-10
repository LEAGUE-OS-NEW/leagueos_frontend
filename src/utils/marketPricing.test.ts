import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MARKET_FACE_VALUE_UGX,
  backendQuantityToShares,
  normalizedPriceToUgxSharePrice,
  probabilityPctToUgxSharePrice,
  stakeUgxToBackendQuantity,
} from "./marketPricing";

describe(
  "market UGX share pricing",
  () => {
    it(
      "uses UGX 1,000 as the face value",
      () => {
        expect(
          MARKET_FACE_VALUE_UGX,
        ).toBe(1_000);
      },
    );

    it(
      "converts probability to UGX per share",
      () => {
        expect(
          probabilityPctToUgxSharePrice(
            50,
          ),
        ).toBe(500);

        expect(
          probabilityPctToUgxSharePrice(
            62,
          ),
        ).toBe(620);
      },
    );

    it(
      "converts backend normalized price to UGX",
      () => {
        expect(
          normalizedPriceToUgxSharePrice(
            0.5,
          ),
        ).toBe(500);
      },
    );

    it(
      "converts backend settlement units to shares",
      () => {
        expect(
          backendQuantityToShares(
            20_000,
          ),
        ).toBe(20);
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
