/* sequence() — the choreography orchestrator. Rituals are sequences of
   labelled steps; reduced-motion jumps every step to its final state. */
import { prefersReducedMotion } from './tempo';

export interface SequenceStep {
  label: string;
  /** Runs the step. Receives a signal that aborts on skip/cancel. */
  run: (ctx: SequenceContext) => Promise<void> | void;
  /** If true, tap-to-skip may jump past this step. Default true.
      The Oath sets this to false — honesty is not skippable. */
  skippable?: boolean;
  /** Under prefers-reduced-motion: 'keep' runs the step (for state
      mutations), 'jump' calls finalState() instead. Default 'jump'. */
  reducedMotion?: 'keep' | 'jump';
  /** Applies the step's end state instantly (reduced-motion/skip path). */
  finalState?: () => void;
}

export interface SequenceContext {
  signal: AbortSignal;
  /** Await a pause that resolves early (skipped) when aborted. */
  wait(ms: number): Promise<void>;
}

export interface SequenceHandle {
  /** Resolves when the sequence completes (or is skipped to the end). */
  finished: Promise<void>;
  /** Skip forward: aborts the current skippable step and jumps every
      remaining skippable step to its final state. Non-skippable steps
      still run in full. */
  skip(): void;
  /** The label currently playing (for demos/instrumentation). */
  current(): string | null;
}

export function sequence(steps: SequenceStep[]): SequenceHandle {
  let controller = new AbortController();
  let skipping = false;
  let currentLabel: string | null = null;
  const reduced = prefersReducedMotion();

  const wait = (signal: AbortSignal) => (ms: number) =>
    new Promise<void>((resolve) => {
      if (signal.aborted) return resolve();
      const t = window.setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        window.clearTimeout(t);
        resolve();
      }, { once: true });
    });

  const finished = (async () => {
    for (const step of steps) {
      currentLabel = step.label;
      const skippable = step.skippable !== false;

      if ((skipping && skippable) || (reduced && step.reducedMotion !== 'keep')) {
        step.finalState?.();
        continue;
      }

      // A skip during a non-skippable step must not leak into it.
      if (!skippable && controller.signal.aborted) controller = new AbortController();

      const ctx: SequenceContext = { signal: controller.signal, wait: wait(controller.signal) };
      await step.run(ctx);

      if (controller.signal.aborted && skippable) step.finalState?.();
    }
    currentLabel = null;
  })();

  return {
    finished,
    skip() {
      skipping = true;
      controller.abort();
    },
    current: () => currentLabel,
  };
}
