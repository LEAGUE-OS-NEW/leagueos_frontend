import type { Sport } from './types';

export const SPORT_META: Record<Sport, { label: string; emoji: string }> = {
  football: { label: 'Football', emoji: '⚽' },
  basketball: { label: 'Basketball', emoji: '🏀' },
  rugby: { label: 'Rugby', emoji: '🏉' },
};