/* Suimon wiring: subscribes the senses to motion cues. Import this once
   from the shell (or the codex demo); features never touch audio directly.

   Ritual cue table (docs/11-SCREEN-DNA.md §Open):
     Oath      -> silence (honesty is silent)
     Break     -> break (glass harmonic, swallowed by the drop)
     Emergence -> drop(rarity)
     Plaque    -> tick (on landing only)
   Seal.stamp() -> hanko · Sheets/lightsDown -> washi */
import { onCue } from '../motion/cues';
import { suimon, unlockAudio } from './suimon';
import { haptics } from './haptics';

export { suimon, unlockAudio } from './suimon';
export { haptics } from './haptics';
export { getFeelPrefs, setFeelPrefs, onFeelPrefsChange, type FeelPrefs } from './prefs';

let wired = false;

/** Idempotent. Call from the app shell after first paint. */
export function wireSuimon(): void {
  if (wired) return;
  wired = true;

  // AudioContext may only be created after a user gesture.
  window.addEventListener('pointerdown', () => unlockAudio(), { once: true, capture: true });

  onCue((cue, detail) => {
    switch (cue) {
      case 'break':
        suimon.play('break');
        break;
      case 'reveal':
        suimon.play('drop', { rarity: detail.rarity });
        if (detail.rarity) haptics.reveal(detail.rarity);
        break;
      case 'tick':
        suimon.play('tick');
        break;
      case 'sheet-open':
      case 'sheet-close':
      case 'lights-down':
        suimon.play('washi');
        break;
      case 'seal-stamp':
        suimon.play('hanko');
        haptics.sealStamp();
        break;
      case 'pity-full':
        haptics.pityFull();
        break;
    }
  });
}
