/* Tiny DOM builder. No framework, no virtual DOM (see .cursor/rules/10-web).
   Components are factories returning HTMLElement built with el(). */

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Array<Node | string | null | undefined> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    // Strings become text nodes — user content stays inert (XSS rule).
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

/** Parse a trusted static SVG string (our own brand/icon markup only —
    never user content) into an SVGElement. */
export function svgFromString(markup: string): SVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  const node = tpl.content.firstElementChild;
  if (!(node instanceof SVGElement)) throw new Error('svgFromString: not svg');
  return node;
}
