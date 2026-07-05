/* Cyrillic display fallback (ADR-0003). Fraunces has no Cyrillic; user
   content (collector names, figure gifts) may contain it. When Cyrillic is
   detected we lazily load a Playfair Display cyrillic subset (21 KB) so the
   display stack `Fraunces, 'Playfair Display', serif` degrades to a serif
   of the same voice instead of the system default. Beta UI itself is
   EN-only, so this loads only on demand. */

const CYRILLIC = /[\u0400-\u04FF]/;

let loading: Promise<void> | null = null;

/** Loads the Playfair cyrillic subset once. Safe to call repeatedly. */
export function loadCyrillicDisplay(): Promise<void> {
  loading ??= (async () => {
    const face = new FontFace(
      'Playfair Display',
      "url('/fonts/playfair-cyrillic.woff2') format('woff2')",
      { weight: '400 700', unicodeRange: 'U+0400-04FF', display: 'swap' },
    );
    const loaded = await face.load();
    document.fonts.add(loaded);
  })().catch(() => {
    loading = null; // let a later call retry after a transient failure
  });
  return loading;
}

/** Call with any user-provided string headed for display type. */
export function ensureDisplayFontFor(text: string): void {
  if (CYRILLIC.test(text)) void loadCyrillicDisplay();
}
