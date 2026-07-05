/* "Feel" — the Settings group for sound and haptics. Both OFF by default:
   respect first, then delight. PROMPT 03 mounts this on the Settings
   screen; the codex demos it. Persistence: ui/sound/prefs.ts
   (localStorage pre-auth, mirrored to profile prefs jsonb post-auth). */
import { el } from '../../lib/dom';
import { Toggle } from './toggle';
import { getFeelPrefs, setFeelPrefs } from '../sound/prefs';
import { suimon } from '../sound/suimon';

export function FeelSettings(): HTMLElement {
  const prefs = getFeelPrefs();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const soundToggle = Toggle({
    label: 'Sound',
    checked: prefs.sound,
    onChange: (on) => {
      setFeelPrefs({ sound: on });
      // Immediate confirmation the room responded — one quiet drop.
      if (on) suimon.play('drop', { rarity: 'common' });
    },
  });

  const hapticsToggle = Toggle({
    label: 'Haptics',
    checked: prefs.haptics,
    onChange: (on) => setFeelPrefs({ haptics: on }),
  });

  return el('section', { class: 'px-feel', 'aria-label': 'Feel' }, [
    el('h3', { class: 't-heading' }, ['Feel']),
    el('p', { class: 't-caption' }, [
      reduced
        ? 'Your system prefers reduced motion; sound stays independent, but silence is a fine default here too.'
        : 'The museum is silent until you ask it to speak.',
    ]),
    soundToggle,
    hapticsToggle,
  ]);
}
