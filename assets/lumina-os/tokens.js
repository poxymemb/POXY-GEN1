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
      '6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.6)',
    shadowInset:
      'inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(255,255,255,0.5)',
    glassBg: 'rgba(232, 234, 240, 0.72)',
    glassBorder: 'rgba(208, 210, 220, 0.45)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    radiusXl: '24px',
    spaceUnit: '8px',
  };

  const LUMINA_DARK = {
    background: '#0a1015',
    surface: '#121a22',
    'surface-dim': '#0e1419',
    'surface-container-lowest': '#080c10',
    'surface-container-low': '#101820',
    'surface-container': '#151d26',
    'surface-container-high': '#1a2430',
    'surface-container-highest': '#1f2a38',
    'surface-bright': '#1c2632',
    'surface-variant': '#1a222c',
    'on-surface': '#e8eef4',
    'on-surface-variant': '#9ca8b8',
    'on-background': '#e8eef4',
    outline: '#3d4f63',
    'outline-variant': '#2a3644',
    primary: '#22d3ee',
    'primary-container': '#0e7490',
    'on-primary': '#042f3a',
    'on-primary-container': '#a5f3fc',
    'primary-fixed': '#164e63',
    'primary-fixed-dim': '#22d3ee',
    secondary: '#94a3b8',
    'secondary-container': '#334155',
    'on-secondary': '#0f172a',
    tertiary: '#8b5cf6',
    'tertiary-container': '#5b21b6',
    'on-tertiary': '#f5f3ff',
    error: '#f87171',
    'error-container': '#450a0a',
    'surface-tint': '#22d3ee',
    'inverse-surface': '#e8eef4',
    'inverse-primary': '#0e7490',
    shadowRaised:
      '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(34, 211, 238, 0.08)',
    shadowInset: 'inset 0 2px 8px rgba(0,0,0,0.35)',
    glassBg: 'rgba(18, 26, 34, 0.72)',
    glassBorder: 'rgba(34, 211, 238, 0.12)',
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
