/* Season 1 — "Japanese Memories": 4 items x 6 rarities = 24 figures.
   Landing-scoped catalog: names, run sizes, one lore fragment each, and a
   `revealed` flag driving the mystery wall. The authoritative DB catalog
   lands with the gacha engine (PROMPT 04/05) and the prelaunch_reveals
   table (Step 1) will supersede the `revealed` flags without a deploy.

   Run sizes fall by rarity (scarcer = rarer), consistent across items.
   Names read like a museum catalog (Fraunces voice), never marketing. */
import type { Rarity } from '@poxy/shared';

export type ItemSlug = 'katana' | 'torii' | 'koi' | 'lantern';

export interface SeasonFigure {
  slug: string;
  item: ItemSlug;
  rarity: Rarity;
  /** Catalog name (Fraunces). Hidden as "???" on the wall until revealed. */
  name: string;
  runSize: number;
  /** One lore line — partially inked on hidden cards, full once revealed. */
  lore: string;
  /** Four figures are unveiled at launch; the rest arrive one per week. */
  revealed: boolean;
}

/** Public run sizes, by rarity — the scarcity ladder for the season. */
const RUN_BY_RARITY: Record<Rarity, number> = {
  common: 5000,
  uncommon: 2500,
  rare: 1200,
  epic: 500,
  legendary: 250,
  mythic: 80,
};

export const ITEM_LABEL: Record<ItemSlug, string> = {
  katana: 'Katana',
  torii: 'Torii',
  koi: 'Koi',
  lantern: 'Lantern',
};

/* Each item's six figures, low to high rarity. Names and lore are final
   catalog copy. `revealed: true` marks the four launch reveals — one per
   item, spread across rarities so the wall shows the full pigment range. */
export const SEASON_ONE: SeasonFigure[] = [
  // --- Katana ---
  { slug: 'katana-common', item: 'katana', rarity: 'common', name: 'Practice Blade', runSize: RUN_BY_RARITY.common, lore: 'Dull by design. Every master began by cutting only air.', revealed: false },
  { slug: 'katana-uncommon', item: 'katana', rarity: 'uncommon', name: 'River Fold', runSize: RUN_BY_RARITY.uncommon, lore: 'Folded until the water forgot which side it came from.', revealed: false },
  { slug: 'katana-rare', item: 'katana', rarity: 'rare', name: 'Moonlit Edge', runSize: RUN_BY_RARITY.rare, lore: 'Drawn once at dusk; the moon kept the reflection.', revealed: false },
  { slug: 'katana-epic', item: 'katana', rarity: 'epic', name: 'Silent Oath', runSize: RUN_BY_RARITY.epic, lore: 'A promise sharpened into steel and never spoken aloud.', revealed: false },
  { slug: 'katana-legendary', item: 'katana', rarity: 'legendary', name: 'Kaze no Katana', runSize: RUN_BY_RARITY.legendary, lore: 'The wind sword. It does not cut the enemy, only the distance between.', revealed: true },
  { slug: 'katana-mythic', item: 'katana', rarity: 'mythic', name: 'Akane no Ryu', runSize: RUN_BY_RARITY.mythic, lore: 'Forged in madder dawn. The dragon that colours the first light.', revealed: false },

  // --- Torii ---
  { slug: 'torii-common', item: 'torii', rarity: 'common', name: 'Wayside Gate', runSize: RUN_BY_RARITY.common, lore: 'A small threshold on a forgotten path. It still asks to be crossed.', revealed: false },
  { slug: 'torii-uncommon', item: 'torii', rarity: 'uncommon', name: 'Cedar Threshold', runSize: RUN_BY_RARITY.uncommon, lore: 'The cedar remembers every visitor by the sound of their step.', revealed: false },
  { slug: 'torii-rare', item: 'torii', rarity: 'rare', name: 'Vermilion Arch', runSize: RUN_BY_RARITY.rare, lore: 'Painted against the rot of time; the colour outlives the wood.', revealed: true },
  { slug: 'torii-epic', item: 'torii', rarity: 'epic', name: 'Hundred Gates', runSize: RUN_BY_RARITY.epic, lore: 'Walk them in order and you arrive where you began, changed.', revealed: false },
  { slug: 'torii-legendary', item: 'torii', rarity: 'legendary', name: 'Gate of Still Water', runSize: RUN_BY_RARITY.legendary, lore: 'It stands in the shallows. On calm days you cannot tell gate from reflection.', revealed: false },
  { slug: 'torii-mythic', item: 'torii', rarity: 'mythic', name: 'The First Threshold', runSize: RUN_BY_RARITY.mythic, lore: 'Before the shrine, before the path, there was a place worth marking.', revealed: false },

  // --- Koi ---
  { slug: 'koi-common', item: 'koi', rarity: 'common', name: 'Pond Koi', runSize: RUN_BY_RARITY.common, lore: 'Content in a small pond, which is its own kind of wisdom.', revealed: false },
  { slug: 'koi-uncommon', item: 'koi', rarity: 'uncommon', name: 'Autumn Scale', runSize: RUN_BY_RARITY.uncommon, lore: 'Wears the maple leaf as armour for one season only.', revealed: false },
  { slug: 'koi-rare', item: 'koi', rarity: 'rare', name: 'Koi no Yoru', runSize: RUN_BY_RARITY.rare, lore: 'The night koi. Seen only by those who wait at the water past dark.', revealed: false },
  { slug: 'koi-epic', item: 'koi', rarity: 'epic', name: 'Upstream Heart', runSize: RUN_BY_RARITY.epic, lore: 'It swims against the current not to arrive, but to remain itself.', revealed: false },
  { slug: 'koi-legendary', item: 'koi', rarity: 'legendary', name: 'Dragon Gate Koi', runSize: RUN_BY_RARITY.legendary, lore: 'The one that reached the falls. What it became is left to you.', revealed: false },
  { slug: 'koi-mythic', item: 'koi', rarity: 'mythic', name: 'The Last Ripple', runSize: RUN_BY_RARITY.mythic, lore: 'A single circle on still water, long after the fish has gone.', revealed: false },

  // --- Lantern ---
  { slug: 'lantern-common', item: 'lantern', rarity: 'common', name: 'Paper Lantern', runSize: RUN_BY_RARITY.common, lore: 'A little light, easily torn, carried anyway.', revealed: false },
  { slug: 'lantern-uncommon', item: 'lantern', rarity: 'uncommon', name: 'Festival Glow', runSize: RUN_BY_RARITY.uncommon, lore: 'Lit for one night a year, remembered for the other three hundred.', revealed: false },
  { slug: 'lantern-rare', item: 'lantern', rarity: 'rare', name: 'Stone Lantern', runSize: RUN_BY_RARITY.rare, lore: 'It has held the same flame-shaped emptiness for three centuries.', revealed: false },
  { slug: 'lantern-epic', item: 'lantern', rarity: 'epic', name: 'Tsuki Usagi', runSize: RUN_BY_RARITY.epic, lore: 'The moon rabbit, pounding light into shape until dawn.', revealed: true },
  { slug: 'lantern-legendary', item: 'lantern', rarity: 'legendary', name: 'Floating Light', runSize: RUN_BY_RARITY.legendary, lore: 'Set on the river for the dead; it always finds the sea.', revealed: false },
  { slug: 'lantern-mythic', item: 'lantern', rarity: 'mythic', name: 'Hoshi no Ko', runSize: RUN_BY_RARITY.mythic, lore: 'Child of a star, mistaken for a lantern by everyone but the night.', revealed: false },
];

/** Days until the next weekly unveiling (deterministic from today; a date,
    never a ticking-seconds pressure timer — codex-forbidden pattern stays
    forbidden). Step 1 replaces this with the DB `prelaunch_reveals` schedule. */
export function daysUntilNextUnveiling(now = new Date()): number {
  // Unveilings land on the next Sunday (weekly ritual cadence).
  const day = now.getUTCDay();
  const daysToSunday = (7 - day) % 7;
  return daysToSunday === 0 ? 7 : daysToSunday;
}
