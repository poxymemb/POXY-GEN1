import type { CaseTier } from './types.ts';

/**
 * Locked economy constants (docs/30-ECONOMY.md is the narrative source;
 * the database is the runtime source for odds). Client code uses these for
 * display and typing only — every real transaction is server-authoritative.
 */

/** PX packs sold via Stripe (GBP pence to avoid float money). */
export const PX_PACKS = [
  { slug: 'px-500', px: 500, pricePence: 499 },
  { slug: 'px-1100', px: 1100, pricePence: 999 },
  { slug: 'px-2400', px: 2400, pricePence: 1999 },
  { slug: 'px-6500', px: 6500, pricePence: 4999 },
  { slug: 'px-14000', px: 14000, pricePence: 9999 },
] as const;

/** Case prices in PX per tier. */
export const CASE_PRICE_PX: Record<CaseTier, number> = {
  paper: 100,
  bronze: 250,
  silver: 500,
  gold: 1000,
  obsidian: 2500,
};

/** Pity thresholds: guaranteed Epic+ within 20 opens, Legendary+ within 60. */
export const PITY = {
  epicWithin: 20,
  legendaryWithin: 60,
} as const;

/** Market fee (PX burn). VIP sellers pay the reduced rate. */
export const MARKET_FEE = {
  standard: 0.05,
  vip: 0.03,
} as const;

/** Subscriptions & pass (GBP pence). */
export const PRICING = {
  passSeasonPence: 999,
  vipMonthlyPence: 499,
} as const;
