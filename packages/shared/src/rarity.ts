import type { Rarity } from './types.ts';

/** Canonical rarity order, lowest to highest. */
export const RARITIES: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
] as const;

/** Display labels (sentence case; UI never shouts). */
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

/**
 * Shards granted when a mint of this rarity is dissolved.
 * LOCKED by docs/30-ECONOMY.md — change only via architect decision.
 */
export const DISENCHANT_YIELD: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  epic: 150,
  legendary: 400,
  mythic: 1000,
};

/** Craft cost of a specific figure = 4x its disenchant yield. */
export const CRAFT_COST_MULTIPLIER = 4;

export function craftCost(rarity: Rarity): number {
  return DISENCHANT_YIELD[rarity] * CRAFT_COST_MULTIPLIER;
}

export function rarityIndex(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}
