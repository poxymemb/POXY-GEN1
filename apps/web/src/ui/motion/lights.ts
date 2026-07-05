/* lightsDown / lightsUp — THE transition between Gallery and Vault.
   The gallery dims and desaturates under a vault-abyss overlay while its
   content recedes (scale .98); vault content then travels in from depth.
   The router consumes this pair in PROMPT 03. */
import './lights.css';
import { Current, Reduced, prefersReducedMotion } from './tempo';
import { travel } from './travel';

export interface LightsScene {
  /** The screen content being dimmed away (the gallery). */
  outgoing: HTMLElement;
  /** Called at blackout: swap DOM to the vault screen and return the new
      content root. Its entrance from depth is choreographed here. */
  swap: () => HTMLElement | Promise<HTMLElement>;
}

async function fadeSwap(scene: LightsScene): Promise<HTMLElement> {
  const out = scene.outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: Reduced.duration,
    easing: Reduced.easing,
    fill: 'both',
  });
  await out.finished;
  const incoming = await scene.swap();
  await incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: Reduced.duration,
    easing: Reduced.easing,
    fill: 'both',
  }).finished;
  return incoming;
}

export async function lightsDown(scene: LightsScene): Promise<HTMLElement> {
  if (prefersReducedMotion()) return fadeSwap(scene);

  const overlay = document.createElement('div');
  overlay.className = 'px-lights-overlay';
  document.body.append(overlay);

  // Dim to 85% abyss while the gallery recedes.
  const dim = overlay.animate([{ opacity: 0 }, { opacity: 0.85 }], {
    duration: Current.duration,
    easing: Current.easing,
    fill: 'both',
  });
  const recede = scene.outgoing.animate(
    [
      { transform: 'scale(1)', filter: 'saturate(1)' },
      { transform: 'scale(0.98)', filter: 'saturate(0.4)' },
    ],
    { duration: Current.duration, easing: Current.easing, fill: 'both' },
  );
  await Promise.all([dim.finished, recede.finished]);

  const incoming = await scene.swap();

  // Vault content arrives from depth as the last of the light drains.
  const settle = overlay.animate([{ opacity: 0.85 }, { opacity: 0 }], {
    duration: Current.duration,
    easing: Current.easing,
    fill: 'both',
  });
  await Promise.all([travel(incoming, { from: 'depth' }), settle.finished]);
  overlay.remove();
  return incoming;
}

export async function lightsUp(scene: LightsScene): Promise<HTMLElement> {
  if (prefersReducedMotion()) return fadeSwap(scene);

  const overlay = document.createElement('div');
  overlay.className = 'px-lights-overlay px-lights-overlay--paper';
  document.body.append(overlay);

  // Morning comes gently: a paper wash instead of an abyss.
  const wash = overlay.animate([{ opacity: 0 }, { opacity: 0.6 }], {
    duration: Current.duration,
    easing: Current.easing,
    fill: 'both',
  });
  const recede = scene.outgoing.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.98)', opacity: 0.5 },
    ],
    { duration: Current.duration, easing: Current.easing, fill: 'both' },
  );
  await Promise.all([wash.finished, recede.finished]);

  const incoming = await scene.swap();

  const clear = overlay.animate([{ opacity: 0.6 }, { opacity: 0 }], {
    duration: Current.duration,
    easing: Current.easing,
    fill: 'both',
  });
  await Promise.all([travel(incoming, { from: 'below', distance: 12 }), clear.finished]);
  overlay.remove();
  return incoming;
}
