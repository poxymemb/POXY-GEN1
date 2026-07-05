/* The Koi's swimming schedule — deterministic, no RNG per render.
   A pure hash of (user_id, local date) decides whether the koi crosses
   the abyss today: on average once per ~7 sessions. Deterministic means
   two devices of the same account agree, and refreshing cannot re-roll. */

/** FNV-1a 32-bit — tiny, stable, good spread for short strings. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export const KOI_PERIOD = 7;

/** True if the koi swims for this user on this date (avg 1 in 7). */
export function koiSwimsToday(userId: string, date: Date = new Date()): boolean {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return fnv1a(`${userId}|${day}`) % KOI_PERIOD === 0;
}

/** Seconds into the session at which the koi appears (20–80s),
    deterministic for the same user+date. */
export function koiDelaySeconds(userId: string, date: Date = new Date()): number {
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return 20 + (fnv1a(`koi-delay|${userId}|${day}`) % 61);
}
