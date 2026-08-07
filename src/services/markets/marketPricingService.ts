// Binary-market pricing enrichment (US-4.1).
//
// The real Market type (types/api.ts) has no price/probability/volume
// fields yet — teammates' backend doesn't expose trading data. This is a
// deterministic mock, not a fetch: given a market id we already have in
// hand, it derives stable-looking numbers so the same market always shows
// the same price and different markets differ. When a real pricing
// endpoint exists, only this file needs to change.
//
// Pricing follows the binary-market convention (Polymarket/Kalshi-style):
// a YES share's price in cents *is* the market's implied probability, and
// NO is always 100 minus that — not a decimal-odds/stake-multiplier format.

export interface MarketPricing {
  probabilityPct: number;
  yesPrice: string;
  noPrice: string;
  volume: string;
  traders: string;
}

function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function formatVolume(amount: number): string {
  if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  return `UGX ${Math.round(amount / 1000)}K`;
}

export function getMarketPricing(marketId: string): MarketPricing {
  const seed = seedFromId(marketId);
  const probabilityPct = 8 + (seed % 85); // 8-92
  const volumeAmount = 150_000 + ((seed >> 3) % 4_850_000);
  const traders = 40 + ((seed >> 7) % 1800);

  return {
    probabilityPct,
    yesPrice: `${probabilityPct}¢`,
    noPrice: `${100 - probabilityPct}¢`,
    volume: formatVolume(volumeAmount),
    traders: traders.toLocaleString('en-US'),
  };
}
