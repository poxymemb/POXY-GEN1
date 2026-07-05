/* Settings row for The Hour. PROMPT 03 mounts this on the Settings screen
   (Appearance group); the codex demos it. */
import { Toggle } from '../components/toggle';
import { museumLightEnabled, setMuseumLightEnabled } from './hour';

export function MuseumLightToggle(): HTMLLabelElement {
  return Toggle({
    label: 'Museum light follows your time',
    checked: museumLightEnabled(),
    onChange: (on) => setMuseumLightEnabled(on),
  });
}
