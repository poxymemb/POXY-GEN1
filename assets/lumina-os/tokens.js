/**
 * Lumina OS — SICHA White (Stitch Silk Edition) + Lumina Dark tokens.
 * Light mode values are the Stitch MCP palette — do not invent alternate light colors.
 */
(function (global) {
  const SICHA_LIGHT = {
    background: '#e8eaf0',
    surface: '#e8eaf0',
    'surface-dim': '#d4d6dc',
    'surface-container-lowest': '#f0f2f8',
    'surface-container-low': '#e5e7ed',
    'surface-container': '#e2e4ea',
    'surface-container-high': '#dcdee4',
    'surface-container-highest': '#d6d8de',
    'surface-bright': '#edeef4',
    'surface-variant': '#dcdee4',
    'on-surface': '#2e3040',
    'on-surface-variant': '#585a68',
    'on-background': '#2e3040',
    outline: '#8a8c9a',
    'outline-variant': '#d0d2dc',
    primary: '#6366f1',
    'primary-container': '#818cf8',
    'on-primary': '#ffffff',
    'on-primary-container': '#e0e2ff',
    'primary-fixed': '#e0e2ff',
    'primary-fixed-dim': '#a5b4fc',
    secondary: '#6c6e7e',
    'secondary-container': '#d8dae6',
    'on-secondary': '#ffffff',
    tertiary: '#7c3aed',
    'tertiary-container': '#a78bfa',
    'on-tertiary': '#ffffff',
    error: '#dc2626',
    'error-container': '#fee2e2',
    'surface-tint': '#6366f1',
    'inverse-surface': '#2e3040',
    'inverse-primary': '#a5b4fc',
    shadowRaised:
      '20px 20px 48px rgba(46, 48, 64, 0.05), -16px -16px 40px rgba(255, 255, 255, 0.75)',
    shadowSoft:
      '12px 12px 32px rgba(46, 48, 64, 0.04), -8px -8px 24px rgba(255, 255, 255, 0.65)',
    shadowInset:
      'inset 4px 4px 10px rgba(46, 48, 64, 0.05), inset -4px -4px 10px rgba(255, 255, 255, 0.55)',
    glassBg: 'rgba(245, 246, 250, 0.6)',
    glassBorder: 'rgba(208, 210, 220, 0.35)',
    glassBorderTop: 'rgba(255, 255, 255, 0.4)',
    glassBorderBottom: 'rgba(180, 184, 198, 0.22)',
    glassBlur: '24px',
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusXl: '24px',
    spaceUnit: '8px',
  };

  const LUMINA_DARK = {
    background: '#000000',
    surface: '#0a0a0a',
    'surface-dim': '#050505',
    'surface-container-lowest': '#000000',
    'surface-container-low': '#0d0d0d',
    'surface-container': '#111111',
    'surface-container-high': '#181818',
    'surface-container-highest': '#222222',
    'surface-bright': '#141414',
    'surface-variant': '#1c1b1b',
    'on-surface': '#e5e2e1',
    'on-surface-variant': '#d5c1d2',
    'on-background': '#e5e2e1',
    outline: '#3a2a3a',
    'outline-variant': '#2a202a',
    primary: '#f9abff',
    'primary-container': '#9c27b0',
    'on-primary': '#000000',
    'on-primary-container': '#fce4ff',
    'primary-fixed': '#4a148c',
    'primary-fixed-dim': '#ce93d8',
    secondary: '#d70357',
    'secondary-container': '#880e4f',
    'on-secondary': '#ffffff',
    tertiary: '#d70357',
    'tertiary-container': '#9c27b0',
    'on-tertiary': '#ffffff',
    error: '#f87171',
    'error-container': '#450a0a',
    'surface-tint': '#f9abff',
    'inverse-surface': '#e5e2e1',
    'inverse-primary': '#9c27b0',
    shadowRaised:
      '0 12px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(249, 171, 255, 0.06)',
    shadowSoft: '0 8px 28px rgba(0, 0, 0, 0.5)',
    shadowInset: 'inset 0 2px 10px rgba(0, 0, 0, 0.55)',
    glassBg: 'rgba(10, 10, 10, 0.78)',
    glassBorder: 'rgba(249, 171, 255, 0.14)',
    glassBorderTop: 'rgba(249, 171, 255, 0.22)',
    glassBorderBottom: 'rgba(215, 3, 87, 0.12)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusXl: '24px',
    spaceUnit: '8px',
  };

  function applyTokenSet(root, tokens) {
    if (!root || !tokens) return;
    Object.keys(tokens).forEach((key) => {
      const cssKey =
        '--lo-' +
        key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace(/_/g, '-');
      root.style.setProperty(cssKey, tokens[key]);
    });
    if (tokens.glassBg) {
      root.style.setProperty('--lo-shadow-raised', tokens.shadowRaised || '');
      root.style.setProperty('--lo-shadow-soft', tokens.shadowSoft || tokens.shadowRaised || '');
      root.style.setProperty('--lo-shadow-inset', tokens.shadowInset || '');
    }
  }

  global.LuminaOSTokens = {
    SICHA_LIGHT,
    LUMINA_DARK,
    apply(root, mode) {
      const m = mode === 'dark' ? LUMINA_DARK : SICHA_LIGHT;
      applyTokenSet(root, m);
    },
  };
})(window);
