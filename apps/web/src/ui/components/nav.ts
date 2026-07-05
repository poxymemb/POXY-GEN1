/* NavRail (74px, desktop) and TabBar (bottom, mobile). Active state =
   the star filled + sky (micro-signature #4: outline->fill on activate). */
import './nav.css';
import { el, svgFromString } from '../../lib/dom';
import starMarkup from '../brand/star.svg?raw';

export interface NavItem {
  id: string;
  label: string;
  /** Trusted static SVG markup for the inactive outline icon. */
  icon: string;
}

export interface NavOptions {
  items: NavItem[];
  active?: string;
  onNavigate?: (id: string) => void;
}

export interface NavHandle {
  root: HTMLElement;
  setActive(id: string): void;
}

function buildNav(kind: 'rail' | 'tabbar', options: NavOptions): NavHandle {
  const { items, active, onNavigate } = options;
  const buttons = new Map<string, HTMLButtonElement>();

  const root = el(
    'nav',
    { class: kind === 'rail' ? 'px-nav-rail' : 'px-tabbar', 'aria-label': 'Primary' },
    items.map((item) => {
      const btn = el(
        'button',
        {
          class: 'px-nav__item',
          type: 'button',
          'aria-current': item.id === active ? 'page' : undefined,
          onclick: () => {
            setActive(item.id);
            onNavigate?.(item.id);
          },
        },
        [
          el('span', { class: 'px-nav__icon px-nav__icon--outline', 'aria-hidden': 'true' }, [
            svgFromString(item.icon),
          ]),
          el('span', { class: 'px-nav__icon px-nav__icon--star', 'aria-hidden': 'true' }, [
            svgFromString(starMarkup),
          ]),
          el('span', { class: 'px-nav__label' }, [item.label]),
        ],
      );
      buttons.set(item.id, btn);
      return btn;
    }),
  );

  function setActive(id: string) {
    for (const [itemId, btn] of buttons) {
      if (itemId === id) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
  }

  return { root, setActive };
}

export function NavRail(options: NavOptions): NavHandle {
  return buildNav('rail', options);
}

export function TabBar(options: NavOptions): NavHandle {
  return buildNav('tabbar', options);
}
