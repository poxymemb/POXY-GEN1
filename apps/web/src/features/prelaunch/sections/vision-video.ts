/* VIDEO: THE VISION — video slot #1 (Никита's film). Paper--grain poster,
   star play button, graceful coming-soon state (PROMPT 00 section 3). */
import { el } from '../../../lib/dom';
import { VideoFrame } from '../video-frame';

export function visionVideoSection(): HTMLElement {
  return el(
    'section',
    { class: 'px-lp__section px-lp__section--video', 'data-env': 'gallery', id: 'px-lp-vision' },
    [
      el('div', { class: 'px-lp__col px-lp__reveal' }, [
        VideoFrame({
          eyebrow: 'The vision',
          title: 'Why a quiet museum, not a casino',
          note: 'Two minutes on what we are building and the one rule it lives by.',
          // src / captionsSrc: Никита adds the file; absent shows the paper state.
        }),
      ]),
    ],
  );
}
