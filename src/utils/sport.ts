// Shared sport-derivation helper. Several features (global search, the
// fixtures/results views) need to guess a Sport from free-text names —
// league/competition proper nouns like "StarTimes Uganda Premier League
// 2026" or a club's own sport field — since the real backend doesn't
// expose a clean sport enum on every resource. One canonical mapping
// avoids re-deriving (and drifting) this logic per feature.

export type Sport = 'Football' | 'Rugby' | 'Basketball';

export function deriveSport(value?: string): Sport | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('rugby')) return 'Rugby';
  if (lower.includes('basketball') || lower.includes('nbl')) return 'Basketball';
  if (
    lower.includes('football') ||
    lower.includes('soccer') ||
    lower.includes('premier league') ||
    lower.includes('fufa')
  ) {
    return 'Football';
  }
  return undefined;
}
