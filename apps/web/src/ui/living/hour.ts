/* THE HOUR — gallery light follows the visitor's clock. Imperceptible in
   a screenshot, felt across a week. Four bands (client local time):

     06–11  Morning   paper as-is (cool museum morning — our default truth)
     11–17  Day       +1% brightness
     17–21  Dusk      paper warms ~2% toward amber
     21–06  Night     gallery dims 3%, hairlines soften

   The Vault is unchanged — it is always night. Implemented as a
   `data-hour` attribute on <html>; ui/living/living.css maps it to a
   `--light-hour` filter on gallery containers. Recalculated on
   visibilitychange (a museum notices when you walk back in). */

export type HourBand = 'morning' | 'day' | 'dusk' | 'night';

const KEY = 'poxy-museum-light'; // '1' (default) | '0'

export function museumLightEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setMuseumLightEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* session-only */
  }
  applyHour();
}

export function bandForHour(hour: number): HourBand {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

/** Test/demo override; null returns control to the clock. */
let override: HourBand | null = null;

export function overrideHour(band: HourBand | null): void {
  override = band;
  applyHour();
}

export function applyHour(): void {
  const root = document.documentElement;
  if (!museumLightEnabled()) {
    root.removeAttribute('data-hour');
    return;
  }
  const band = override ?? bandForHour(new Date().getHours());
  root.setAttribute('data-hour', band);
}

let started = false;

/** Idempotent. Called once from the shell. Near-zero cost: one attribute
    write on start, on visibility change, and at most once an hour. */
export function startHour(): void {
  if (started) return;
  started = true;
  applyHour();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyHour();
  });
  window.setInterval(applyHour, 60 * 60 * 1000);
}
