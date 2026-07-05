/* Motion library barrel — the whole choreography vocabulary of the app.
   Feature code composes these; it never writes its own keyframes. */
export { Surface, Current, RitualEase, Reduced, prefersReducedMotion, type Tempo } from './tempo';
export { travel, type TravelOptions } from './travel';
export { sequence, type SequenceStep, type SequenceHandle, type SequenceContext } from './sequence';
export { lightsDown, lightsUp, type LightsScene } from './lights';
export { sparkle, type SparkleOptions } from './sparkle';
export { countUp, type CountUpOptions } from './count-up';
export { chipTick, pityPulse } from './micro';
