/* VIDEO: HOW IT WORKS — video slot #2, same reusable component
   (PROMPT 00 section 6). */
import { el } from '../../../lib/dom';
import { VideoFrame } from '../video-frame';

export function howVideoSection(): HTMLElement {
  return el(
    'section',
    { class: 'px-lp__section px-lp__section--video', 'data-env': 'gallery', id: 'px-lp-how' },
    [
      el('div', { class: 'px-lp__col px-lp__reveal' }, [
        VideoFrame({
          eyebrow: 'How it works',
          title: 'From a sealed case to a plaque on your shelf',
          note: 'Open a case, see the proof, keep the figure or dissolve it into shards. A full walkthrough.',
        }),
      ]),
    ],
  );
}
