/**
 * Core shared types. Skeleton for PROMPT 01; engines (PROMPT 04+) extend this.
 * Glossary discipline: Figure, Case, Run, Shards, PX, Opening — never synonyms.
 */

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export type CaseTier = 'paper' | 'bronze' | 'silver' | 'gold' | 'obsidian';

/** Scene environments. Gallery = paper base, Vault = ink base. */
export type Environment = 'gallery' | 'vault';

export interface Figure {
  id: string;
  seasonId: string;
  itemSlug: string;
  name: string;
  rarity: Rarity;
  /** Public, finite. When mints reach runSize the figure is sold out. */
  runSize: number;
  artworkUrl: string | null;
  lore: string;
}

export interface FigureMint {
  id: string;
  figureId: string;
  /** 1-based, unique per figure, allocated sequentially, never reused. */
  mintNumber: number;
  ownerId: string;
  openingId: string | null;
  createdAt: string;
}
