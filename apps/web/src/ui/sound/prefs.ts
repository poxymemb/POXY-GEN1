/* "Feel" preferences — sound and haptics, both OFF by default (respect).
   Pre-auth they persist in localStorage; PROMPT 03+ mirrors them into
   profile prefs jsonb so they follow the player across devices. */

export interface FeelPrefs {
  sound: boolean;
  haptics: boolean;
}

const KEY = 'poxy-feel';

const DEFAULTS: FeelPrefs = { sound: false, haptics: false };

let cache: FeelPrefs | null = null;
const listeners = new Set<(prefs: FeelPrefs) => void>();

export function getFeelPrefs(): FeelPrefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FeelPrefs>) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function setFeelPrefs(patch: Partial<FeelPrefs>): FeelPrefs {
  cache = { ...getFeelPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode: session-only prefs are fine */
  }
  for (const fn of listeners) fn(cache);
  return cache;
}

export function onFeelPrefsChange(fn: (prefs: FeelPrefs) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
