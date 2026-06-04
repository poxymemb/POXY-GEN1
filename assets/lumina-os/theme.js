/**
 * Lumina OS — global theme engine (light SICHA / dark Lumina).
 */
(function (global) {
  const LS_KEY = 'lumina_os_theme_v1';
  const TRANSITION_MS = 500;

  let theme = 'light';
  const listeners = new Set();

  function systemPrefersDark() {
    return (
      global.matchMedia &&
      global.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  function resolveTheme(mode) {
    if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return mode === 'dark' ? 'dark' : 'light';
  }

  function getRoot() {
    return document.getElementById('luminaOsRoot');
  }

  function applyDom(resolved) {
    const root = getRoot();
    if (!root) return;
    root.dataset.loTheme = resolved;
    document.documentElement.dataset.loTheme = resolved;
    if (global.LuminaOSTokens) {
      global.LuminaOSTokens.apply(root, resolved);
      global.LuminaOSTokens.apply(document.documentElement, resolved);
    }
    const shell = document.getElementById('lcShell');
    if (shell) shell.dataset.loTheme = resolved;
    listeners.forEach((fn) => fn(resolved, theme));
  }

  function persist(mode) {
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch (e) {}
  }

  function readPersisted() {
    try {
      return localStorage.getItem(LS_KEY);
    } catch (e) {
      return null;
    }
  }

  function setTheme(mode, opts) {
    opts = opts || {};
    const valid = mode === 'dark' || mode === 'light' || mode === 'system';
    theme = valid ? mode : 'light';
    if (opts.persist !== false) persist(theme);
    const resolved = resolveTheme(theme);
    applyDom(resolved);
    return resolved;
  }

  function getTheme() {
    return theme;
  }

  function getResolvedTheme() {
    return resolveTheme(theme);
  }

  function toggleTheme() {
    const next = getResolvedTheme() === 'dark' ? 'light' : 'dark';
    return setTheme(next);
  }

  function bootstrap() {
    const saved = readPersisted();
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      theme = saved;
    } else {
      theme = systemPrefersDark() ? 'dark' : 'light';
    }
    applyDom(resolveTheme(theme));
    if (global.matchMedia) {
      const mq = global.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (theme === 'system') applyDom(resolveTheme('system'));
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  global.LuminaOSTheme = {
    TRANSITION_MS,
    getTheme,
    getResolvedTheme,
    setTheme,
    toggleTheme,
    bootstrap,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  global.setTheme = function (mode) {
    return global.LuminaOSTheme.setTheme(mode);
  };
  global.toggleTheme = function () {
    return global.LuminaOSTheme.toggleTheme();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window);
