/* Mock demand state for the pre-launch landing.

   PLACEHOLDER: these values stand in for Supabase reads that land in Step 1
   (founder_passes count via a safe view, waitlist passport_no serial). The
   shapes match what the real data layer will return so the UI never changes
   when the source is swapped — only this module is replaced.

   Nothing here is authoritative. No balances, no writes. */

import { FOUNDER } from './config';

/** Founders who have claimed a mint so far (count of paid passes). */
export function foundersClaimed(): number {
  return 42;
}

/** The next Founder mint number that would be assigned. */
export function nextFounderMint(): number {
  return foundersClaimed() + 1;
}

/** Founder run remaining, for the scarcity caption (remaining-first). */
export function foundersRemaining(): number {
  return Math.max(0, FOUNDER.runSize - foundersClaimed());
}

/** A demo passport reservation number for the waitlist success state.
    In Step 1 this comes from the waitlist.passport_no serial on confirm. */
export function reserveDemoPassportNumber(): number {
  const base = 1204;
  const drift = Math.floor(Date.now() / 60000) % 90;
  return base + drift;
}

/** Opted-in Founding Collectors for the community wall (display names).
    Step 1 reads these from founder_passes where wall_optin is true and the
    name has passed moderation. */
export function foundingCollectors(): string[] {
  return [
    'still.water',
    'kaze',
    'the_curator',
    'ronin_no_9',
    'akane',
    'paper.moon',
    'obsidian',
    'koinobori',
  ];
}
