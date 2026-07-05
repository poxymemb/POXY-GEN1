/* SUIMON 水音 — the voice of Still Water. Five WebAudio-synthesized sounds;
   no samples, no licensing, tiny. Silence is the default instrument: sound
   is OFF until the player turns it on, and even then it exists only at
   meaning-moments — never on hovers or navigation.

   Palette: water, paper, wood, stone. Nothing electronic, no chimes,
   no slot-machine tails. Peak loudness ≈ -18 LUFS; if two sounds would
   overlap, the lesser one is dropped (see `busy` gate). */
import type { Rarity } from '@poxy/shared';
import { getFeelPrefs } from './prefs';

export type SuimonName = 'drop' | 'washi' | 'hanko' | 'break' | 'tick';

/* ---- tuning constants (edit by ear, phone-speaker volume) -------------
   Each block describes the target character, not just numbers. */

/** Drop — a single water drop into deep water. Deeper water = rarer:
    pitch base falls from 440 (Common) to 260 (Mythic). */
const DROP = {
  pitchFallMs: 90,     // sine 520->180-ish fall, scaled by rarity base
  splashMs: 40,        // filtered-noise splash right after impact
  resonanceMs: 300,    // low afterglow of the pool
  baseByRank: [440, 400, 360, 320, 290, 260], // common..mythic
  gain: 0.32,
};

/** Washi — paper sliding on paper. Very quiet (-30ish): bandpassed noise
    sweeping downward for 120ms. Sheets and lightsDown only. */
const WASHI = { durMs: 120, from: 2600, to: 900, gain: 0.07 };

/** Hanko — the stamp: a short wooden knock (kalimba-like triangle burst)
    landing on felt. Verify verdict only. */
const HANKO = { knockHz: 620, knockMs: 60, thumpHz: 95, thumpMs: 90, gain: 0.3 };

/** Break — the hairline of light: a glass-harmonic ping stretched 200ms,
    immediately swallowed by the Drop that follows. */
const BREAK = { hz: 1750, durMs: 200, gain: 0.12 };

/** Tick — one soft stone click when a countUp LANDS. Never per-digit:
    no slot-machine ticking, ever. */
const TICK = { hz: 1200, durMs: 30, gain: 0.14 };

/* ---- engine ----------------------------------------------------------- */

const RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let busyUntil = 0;

function ensureContext(): AudioContext | null {
  if (!unlocked) return null; // zero audio before a user gesture
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call once from any trusted user gesture (pointerdown at shell level).
    Creates nothing by itself — it only permits lazy creation later. */
export function unlockAudio(): void {
  unlocked = true;
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function env(ac: AudioContext, peak: number, attack: number, decay: number): GainNode {
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

/* ---- the five --------------------------------------------------------- */

function playDrop(ac: AudioContext, out: GainNode, rarity: Rarity = 'common') {
  const t = ac.currentTime;
  const base = DROP.baseByRank[RANK[rarity]];

  // the falling body of the drop
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base * 1.18, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.41, t + DROP.pitchFallMs / 1000);
  const oscEnv = env(ac, DROP.gain, 0.004, DROP.pitchFallMs / 1000 + 0.05);
  osc.connect(oscEnv).connect(out);
  osc.start(t);
  osc.stop(t + 0.4);

  // the splash: a whisper of filtered noise
  const splash = ac.createBufferSource();
  splash.buffer = noiseBuffer(ac, 0.06);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = base * 4;
  bp.Q.value = 1.2;
  const splashEnv = env(ac, DROP.gain * 0.35, 0.002, DROP.splashMs / 1000);
  splash.connect(bp).connect(splashEnv).connect(out);
  splash.start(t + 0.015);

  // low resonance of the pool — Mythic is felt in the chest
  const res = ac.createOscillator();
  res.type = 'sine';
  res.frequency.value = base * 0.25;
  const resEnv = env(ac, DROP.gain * (0.3 + RANK[rarity] * 0.08), 0.02, DROP.resonanceMs / 1000);
  res.connect(resEnv).connect(out);
  res.start(t + 0.03);
  res.stop(t + 0.5);
}

function playWashi(ac: AudioContext, out: GainNode) {
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, WASHI.durMs / 1000 + 0.02);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(WASHI.from, t);
  bp.frequency.exponentialRampToValueAtTime(WASHI.to, t + WASHI.durMs / 1000);
  bp.Q.value = 0.8;
  const g = env(ac, WASHI.gain, 0.01, WASHI.durMs / 1000);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
}

function playHanko(ac: AudioContext, out: GainNode) {
  const t = ac.currentTime;
  // wooden knock
  const knock = ac.createOscillator();
  knock.type = 'triangle';
  knock.frequency.setValueAtTime(HANKO.knockHz, t);
  knock.frequency.exponentialRampToValueAtTime(HANKO.knockHz * 0.7, t + HANKO.knockMs / 1000);
  const knockEnv = env(ac, HANKO.gain, 0.002, HANKO.knockMs / 1000);
  knock.connect(knockEnv).connect(out);
  knock.start(t);
  knock.stop(t + 0.12);
  // felt thump underneath
  const thump = ac.createOscillator();
  thump.type = 'sine';
  thump.frequency.value = HANKO.thumpHz;
  const thumpEnv = env(ac, HANKO.gain * 0.6, 0.004, HANKO.thumpMs / 1000);
  thump.connect(thumpEnv).connect(out);
  thump.start(t + 0.005);
  thump.stop(t + 0.15);
}

function playBreak(ac: AudioContext, out: GainNode) {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = BREAK.hz;
  // a faint fifth above gives it the glassy edge without turning electronic
  const shimmer = ac.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = BREAK.hz * 1.5;
  const g = env(ac, BREAK.gain, 0.006, BREAK.durMs / 1000);
  const g2 = env(ac, BREAK.gain * 0.4, 0.006, BREAK.durMs / 1000);
  osc.connect(g).connect(out);
  shimmer.connect(g2).connect(out);
  osc.start(t); osc.stop(t + 0.3);
  shimmer.start(t); shimmer.stop(t + 0.3);
}

function playTick(ac: AudioContext, out: GainNode) {
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, TICK.durMs / 1000);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = TICK.hz;
  bp.Q.value = 6;
  const g = env(ac, TICK.gain, 0.001, TICK.durMs / 1000);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
}

/* ---- public API -------------------------------------------------------- */

export const suimon = {
  get enabled(): boolean {
    return getFeelPrefs().sound;
  },

  /** Plays a named sound if enabled. Overlap rule: while a major sound is
      sounding, a lesser one is dropped (drop/hanko outrank washi/tick). */
  play(name: SuimonName, opts: { rarity?: Rarity } = {}): void {
    if (!this.enabled) return;
    const ac = ensureContext();
    if (!ac || !master) return;

    const now = performance.now();
    const major = name === 'drop' || name === 'hanko' || name === 'break';
    if (!major && now < busyUntil) return; // the lesser sound is dropped
    if (major) busyUntil = now + 350;

    switch (name) {
      case 'drop': playDrop(ac, master, opts.rarity); break;
      case 'washi': playWashi(ac, master); break;
      case 'hanko': playHanko(ac, master); break;
      case 'break': playBreak(ac, master); break;
      case 'tick': playTick(ac, master); break;
    }
  },
};
