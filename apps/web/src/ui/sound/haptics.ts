/* Haptic grammar — navigator.vibrate (Android; iOS web silently no-ops,
   which is fine). Never on navigation. The patterns mirror the ritual
   beats: rarer = longer conversation with the palm. */
import type { Rarity } from '@poxy/shared';
import { getFeelPrefs } from './prefs';

const REVEAL: Record<Rarity, number[]> = {
  common: [10],
  uncommon: [10],
  rare: [10, 30, 15],
  epic: [10, 40, 20],
  legendary: [10, 40, 20],
  mythic: [10, 40, 20, 60, 30],
};

const SEAL = [30];
const PITY_FULL = [15, 30, 15];

function vibrate(pattern: number[]): void {
  if (!getFeelPrefs().haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported: silence is acceptable */
  }
}

export const haptics = {
  get enabled(): boolean {
    return getFeelPrefs().haptics;
  },
  reveal(rarity: Rarity): void {
    vibrate(REVEAL[rarity]);
  },
  sealStamp(): void {
    vibrate(SEAL);
  },
  pityFull(): void {
    vibrate(PITY_FULL);
  },
};
