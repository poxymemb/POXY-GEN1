/* Motion cues — a tiny broadcast bus between choreography and the senses.
   Motion primitives EMIT named cues at meaning-moments; sound (suimon) and
   haptics SUBSCRIBE. Features stay sound-agnostic: they never call audio
   directly, they only run choreography. */
import type { Rarity } from '@poxy/shared';

export type MotionCue =
  | 'break'        // ritual: the hairline of light
  | 'reveal'       // ritual: emergence (carries rarity)
  | 'tick'         // plaque count-up landed
  | 'sheet-open'   // sheet/modal travels up
  | 'sheet-close'
  | 'lights-down'  // gallery -> vault transition
  | 'seal-stamp'   // the verify verdict
  | 'pity-full';   // pity ring reached 100%

export interface CueDetail {
  rarity?: Rarity;
}

type CueListener = (cue: MotionCue, detail: CueDetail) => void;

const listeners = new Set<CueListener>();

export function emitCue(cue: MotionCue, detail: CueDetail = {}): void {
  for (const fn of listeners) fn(cue, detail);
}

export function onCue(fn: CueListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
