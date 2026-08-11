/**
 * Shared formation data for the football pitch.
 * Kept separate from FootballPitch.tsx to satisfy
 * react-refresh/only-export-components (a file should
 * only export components for fast refresh to work).
 */

export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '3-4-3';

export interface Slot {
  x: number; // 0-100, horizontal position across the pitch
  y: number; // 0-150, vertical position (0 = attacking end, 150 = goalkeeper's end)
}

export interface FormationLayout {
  label: string;
  def: Slot[];
  mid: Slot[];
  fwd: Slot[];
}

const spreadX = (n: number): number[] => {
  switch (n) {
    case 1:
      return [50];
    case 2:
      return [32, 68];
    case 3:
      return [20, 50, 80];
    case 4:
      return [15, 38, 62, 85];
    case 5:
      return [12, 31, 50, 69, 88];
    default:
      return Array.from({ length: n }, (_, i) => (100 / (n + 1)) * (i + 1));
  }
};

const row = (n: number, y: number): Slot[] => spreadX(n).map((x) => ({ x, y }));

export const FORMATIONS: Record<FormationId, FormationLayout> = {
  '4-3-3': { label: '4-3-3', def: row(4, 118), mid: row(3, 82), fwd: row(3, 32) },
  '4-4-2': { label: '4-4-2', def: row(4, 118), mid: row(4, 85), fwd: row(2, 32) },
  '3-5-2': { label: '3-5-2', def: row(3, 118), mid: row(5, 85), fwd: row(2, 32) },
  '4-2-3-1': { label: '4-2-3-1', def: row(4, 120), mid: [...row(2, 96), ...row(3, 68)], fwd: row(1, 30) },
  '3-4-3': { label: '3-4-3', def: row(3, 118), mid: row(4, 85), fwd: row(3, 32) },
};