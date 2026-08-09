import type { Player } from '../FantasyCompetitions';

/**
 * Replaces any starting player with 0 minutes played with the first eligible
 * (available/doubtful, not already on the pitch) player from the bench order.
 * Pure function — takes state in, returns new state out. No component state
 * is read or mutated here.
 */
export function applyAutoSubstitutions(
  startingIds: Set<string>,
  benchOrder: string[],
  minutesPlayed: Record<string, number>,
  playersById: Record<string, Player>
): Set<string> {
  const next = new Set(startingIds);
  const usedBench = new Set<string>();

  startingIds.forEach((id) => {
    if (minutesPlayed[id] !== 0) return; // only sub off players confirmed at 0 minutes

    const replacementId = benchOrder.find((benchId) => {
      if (usedBench.has(benchId) || next.has(benchId)) return false;
      const candidate = playersById[benchId];
      return !!candidate && candidate.status !== 'injured' && candidate.status !== 'suspended';
    });

    if (replacementId) {
      next.delete(id);
      next.add(replacementId);
      usedBench.add(replacementId);
    }
  });

  return next;
}

/**
 * If the captain recorded 0 minutes, the vice-captain automatically becomes
 * captain (and the old captain becomes vice, matching standard fantasy rules).
 */
export function applyViceCaptainFallback(
  captainId: string | null,
  viceId: string | null,
  minutesPlayed: Record<string, number>
): { captainId: string | null; viceId: string | null } {
  if (captainId && viceId && minutesPlayed[captainId] === 0 && minutesPlayed[viceId] !== 0) {
    return { captainId: viceId, viceId: captainId };
  }
  return { captainId, viceId };
}
