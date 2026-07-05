import './tabs.css';
import { el } from '../../lib/dom';

export interface TabsOptions {
  tabs: Array<{ id: string; label: string }>;
  active?: string;
  onChange?: (id: string) => void;
}

export interface TabsHandle {
  root: HTMLElement;
  setActive(id: string): void;
}

export function Tabs(options: TabsOptions): TabsHandle {
  const { tabs, active = tabs[0]?.id, onChange } = options;

  const buttons = new Map<string, HTMLButtonElement>();

  const root = el(
    'div',
    { class: 'px-tabs', role: 'tablist' },
    tabs.map((tab) => {
      const btn = el(
        'button',
        {
          class: `px-tabs__tab${tab.id === active ? ' is-active' : ''}`,
          type: 'button',
          role: 'tab',
          'aria-selected': String(tab.id === active),
          onclick: () => {
            setActive(tab.id);
            onChange?.(tab.id);
          },
        },
        [tab.label],
      );
      buttons.set(tab.id, btn);
      return btn;
    }),
  );

  function setActive(id: string) {
    for (const [tabId, btn] of buttons) {
      btn.classList.toggle('is-active', tabId === id);
      btn.setAttribute('aria-selected', String(tabId === id));
    }
  }

  return { root, setActive };
}
