import './segmented.css';
import { el } from '../../lib/dom';

export interface SegmentedOptions {
  segments: Array<{ id: string; label: string }>;
  active?: string;
  onChange?: (id: string) => void;
}

export interface SegmentedHandle {
  root: HTMLElement;
  setActive(id: string): void;
}

export function SegmentedControl(options: SegmentedOptions): SegmentedHandle {
  const { segments, active = segments[0]?.id, onChange } = options;

  const buttons = new Map<string, HTMLButtonElement>();

  const root = el(
    'div',
    { class: 'px-segmented', role: 'radiogroup' },
    segments.map((seg) => {
      const btn = el(
        'button',
        {
          class: `px-segmented__seg${seg.id === active ? ' is-active' : ''}`,
          type: 'button',
          role: 'radio',
          'aria-checked': String(seg.id === active),
          onclick: () => {
            setActive(seg.id);
            onChange?.(seg.id);
          },
        },
        [seg.label],
      );
      buttons.set(seg.id, btn);
      return btn;
    }),
  );

  function setActive(id: string) {
    for (const [segId, btn] of buttons) {
      btn.classList.toggle('is-active', segId === id);
      btn.setAttribute('aria-checked', String(segId === id));
    }
  }

  return { root, setActive };
}
