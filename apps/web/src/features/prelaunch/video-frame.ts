/* VideoFrame — the reusable video slot for the landing (PROMPT 00 sections 3
   and 6). A paper--grain poster card with a star play button; lazy; captions
   track slot. Никита's video files may arrive after deploy, so the frame has
   a graceful "video coming soon" paper state and looks finished with zero
   files present (Step 2 §4). */
import './video-frame.css';
import { el } from '../../lib/dom';
import { Star } from '../../ui';

export interface VideoFrameOptions {
  /** Section eyebrow, e.g. "The vision" (Inter caption). */
  eyebrow: string;
  /** Headline in Fraunces (title voice). */
  title: string;
  /** One supporting line (body). */
  note: string;
  /** Video source URL. Absent = graceful "coming soon" paper state. */
  src?: string;
  /** Optional captions track (WebVTT). */
  captionsSrc?: string;
  /** Poster image URL; absent uses the paper--grain placeholder. */
  poster?: string;
}

export function VideoFrame(options: VideoFrameOptions): HTMLElement {
  const { eyebrow, title, note, src, captionsSrc, poster } = options;

  const head = el('div', { class: 'px-video__head' }, [
    el('p', { class: 'px-video__eyebrow t-caption' }, [eyebrow]),
    el('h3', { class: 'px-video__title t-title' }, [title]),
    el('p', { class: 'px-video__note t-body' }, [note]),
  ]);

  // The stage: either a real <video> (poster until interaction) or a paper
  // placeholder that already looks intentional.
  const stage = el('div', { class: 'px-video__stage m-paper m-paper--grain' });

  if (src) {
    const video = el('video', {
      class: 'px-video__el',
      controls: false,
      preload: 'none',
      playsinline: '',
      poster: poster ?? '',
    }) as HTMLVideoElement;
    const source = el('source', { src, type: 'video/mp4' });
    video.append(source);
    if (captionsSrc) {
      video.append(el('track', { kind: 'captions', src: captionsSrc, srclang: 'en', label: 'English', default: '' }));
    }

    const play = el(
      'button',
      { class: 'px-video__play', type: 'button', 'aria-label': `Play: ${title}` },
      [Star({ size: 22 }), el('span', { class: 'px-video__play-label t-caption' }, ['Play'])],
    );
    play.addEventListener('click', () => {
      video.setAttribute('controls', '');
      stage.classList.add('is-playing');
      void video.play();
    });

    stage.append(video, play);
  } else {
    // Coming-soon paper state — quiet, finished, honest.
    stage.classList.add('px-video__stage--pending');
    stage.append(
      el('div', { class: 'px-video__pending' }, [
        Star({ size: 28, className: 'px-video__pending-star' }),
        el('p', { class: 'px-video__pending-note t-caption' }, ['Film arriving before launch.']),
      ]),
    );
  }

  return el('div', { class: 'px-video' }, [head, stage]);
}
