import { describe, expect, it } from 'vitest';
import { fnv1a, koiDelaySeconds, koiSwimsToday, KOI_PERIOD } from './koi-schedule';

describe('the koi schedule', () => {
  it('is deterministic: same user + date always agree', () => {
    const d = new Date(2026, 6, 5);
    const first = koiSwimsToday('user-abc', d);
    for (let i = 0; i < 50; i++) {
      expect(koiSwimsToday('user-abc', d)).toBe(first);
    }
    expect(koiDelaySeconds('user-abc', d)).toBe(koiDelaySeconds('user-abc', d));
  });

  it('averages roughly one crossing per 7 days over a year', () => {
    let crossings = 0;
    const days = 364;
    for (let i = 0; i < days; i++) {
      const d = new Date(2026, 0, 1 + i);
      if (koiSwimsToday('user-abc', d)) crossings++;
    }
    const expected = days / KOI_PERIOD; // 52
    // Hash noise tolerance: within ±50% of the target frequency.
    expect(crossings).toBeGreaterThan(expected * 0.5);
    expect(crossings).toBeLessThan(expected * 1.5);
  });

  it('differs between users (not a global fish)', () => {
    const days = 200;
    let differences = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(2026, 0, 1 + i);
      if (koiSwimsToday('user-a', d) !== koiSwimsToday('user-b', d)) differences++;
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('keeps the delay within the 20-80s window', () => {
    for (let i = 0; i < 100; i++) {
      const s = koiDelaySeconds(`user-${i}`);
      expect(s).toBeGreaterThanOrEqual(20);
      expect(s).toBeLessThanOrEqual(80);
    }
  });

  it('fnv1a spreads short ids', () => {
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
    expect(fnv1a('user-1|2026-07-05')).not.toBe(fnv1a('user-1|2026-07-06'));
  });
});
