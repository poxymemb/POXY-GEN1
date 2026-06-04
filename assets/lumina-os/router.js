/**
 * Lumina OS — SPA layout router (MainLayout ↔ LuminaOSLayout).
 * Uses hash #/lumina-os so static hosts never serve the lumina-os/ folder by mistake.
 */
(function (global) {
  const HASH_PREFIX = '#/lumina-os';
  const PATH_SEGMENT = '/lumina-os';
  let mounted = false;
  let exiting = false;
  let entering = false;

  function appBase() {
    if (global.POXY_APP_BASE !== undefined) return global.POXY_APP_BASE || '';
    const p = global.location.pathname || '';
    const lo = p.indexOf(PATH_SEGMENT);
    if (lo >= 0) return p.slice(0, lo);
    return '';
  }

  function homePath() {
    const b = appBase();
    return b ? (b.endsWith('/') ? b : b + '/') : '/';
  }

  function parseHashQuery() {
    const raw = (global.location.hash || '').replace(/^#/, '');
    const qIdx = raw.indexOf('?');
    const qs = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
    const params = new URLSearchParams(qs);
    return {
      user: params.get('user') || params.get('with') || null,
      nav: params.get('nav') || null,
    };
  }

  function parseQuery() {
    const fromHash = parseHashQuery();
    const fromPath = new URLSearchParams(global.location.search);
    return {
      user:
        fromHash.user ||
        fromPath.get('user') ||
        fromPath.get('with') ||
        null,
      nav: fromHash.nav || fromPath.get('nav') || null,
    };
  }

  function buildHash(opts) {
    opts = opts || {};
    const params = new URLSearchParams();
    if (opts.user && global.LuminaChatUtil?.isUuid(opts.user)) {
      params.set('user', opts.user);
    }
    if (opts.nav) params.set('nav', opts.nav);
    const q = params.toString();
    return HASH_PREFIX + (q ? '?' + q : '');
  }

  function isLuminaOSPath() {
    const h = global.location.hash || '';
    if (h === HASH_PREFIX || h.startsWith(HASH_PREFIX + '?')) return true;
    const target = (appBase() + PATH_SEGMENT).replace(/\/+$/, '') || PATH_SEGMENT;
    const p = (global.location.pathname || '').replace(/\/+$/, '');
    return p === target || p.startsWith(target + '/');
  }

  function syncUrl(opts, replace) {
    opts = opts || {};
    const hash = buildHash(opts);
    const state = {
      layout: 'lumina-os',
      user: opts.user || null,
      nav: opts.nav || null,
    };
    const url = homePath() + hash;
    if (replace) global.history.replaceState(state, '', url);
    else global.history.pushState(state, '', url);
  }

  function hideMainLayout() {
    document.body.classList.add('lumina-os-active');
    const shell = document.getElementById('poxyAppShell');
    if (shell) shell.style.display = 'none';
    document.querySelectorAll('.page').forEach((el) => {
      el.dataset.loPrevDisplay = el.style.display || '';
      el.style.display = 'none';
    });
    const hunt = document.getElementById('huntPage');
    if (shell && hunt && !shell.contains(hunt)) {
      hunt.dataset.loPrevDisplay = hunt.style.display || '';
      hunt.style.display = 'none';
    }
    if (typeof global.closeSidebar === 'function') global.closeSidebar();
    if (typeof global.closeDmOverlay === 'function') global.closeDmOverlay();
  }

  function showMainLayout() {
    document.body.classList.remove('lumina-os-active');
    const root = document.getElementById('luminaOsRoot');
    if (root) {
      root.classList.remove('is-mounted', 'is-entering', 'is-ready', 'is-exiting');
      root.setAttribute('hidden', '');
      root.style.display = '';
    }
    const shell = document.getElementById('poxyAppShell');
    if (shell && global.currentUser) shell.style.display = 'block';
    document.querySelectorAll('.page').forEach((el) => {
      if (el.dataset.loPrevDisplay !== undefined) {
        el.style.display = el.dataset.loPrevDisplay;
        delete el.dataset.loPrevDisplay;
      }
    });
    const hunt = document.getElementById('huntPage');
    if (hunt && hunt.dataset.loPrevDisplay !== undefined) {
      hunt.style.display = hunt.dataset.loPrevDisplay;
      delete hunt.dataset.loPrevDisplay;
    }
    if (global.currentUser && typeof global.showPoxyAppShell === 'function') {
      global.showPoxyAppShell();
    }
  }

  function showOsRoot() {
    const root = document.getElementById('luminaOsRoot');
    const lcShell = document.getElementById('lcShell');
    if (!root) {
      console.error('[LuminaOS] #luminaOsRoot missing from page');
      return false;
    }
    root.removeAttribute('hidden');
    root.style.display = 'flex';
    root.classList.add('is-mounted', 'is-ready');
    root.classList.remove('is-exiting', 'is-entering');
    if (lcShell) lcShell.classList.add('is-ready');
    return true;
  }

  function persistRoute() {
    if (!global.currentUser) return;
    try {
      const key =
        (global.POXY_ROUTE_LS || 'poxy_active_route') + '_' + global.currentUser.id;
      localStorage.setItem(key, JSON.stringify({ kind: 'lumina-os' }));
    } catch (e) {}
  }

  function resolveUser() {
    return global.currentUser || null;
  }

  async function ensureUser() {
    if (resolveUser()) return resolveUser();
    if (!global.sb?.auth?.getSession) return null;
    try {
      const {
        data: { session },
      } = await global.sb.auth.getSession();
      if (session?.user) {
        global.currentUser = session.user;
        if (typeof global.applyAuthSession === 'function') {
          await global.applyAuthSession(session);
        } else {
          global.currentUser = session.user;
        }
        return session.user;
      }
    } catch (e) {}
    return null;
  }

  function enter(opts) {
    opts = opts || {};
    if (entering || exiting) return;
    const user = resolveUser();
    if (!user) {
      ensureUser().then((u) => {
        if (u) enter(opts);
        else {
          const overlay = document.getElementById('authOverlay');
          if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
            overlay.style.zIndex = '10000';
          }
          if (typeof global.showToast === 'function') {
            global.showToast('Sign in to open Lumina OS.');
          }
        }
      });
      return;
    }
    if (!global.sb) {
      if (typeof global.showToast === 'function') {
        global.showToast('Lumina OS still loading — try again in a moment.');
      }
      return;
    }
    if (opts.user && String(opts.user) === String(user.id)) {
      if (typeof global.showToast === 'function') {
        global.showToast('Cannot message yourself.');
      }
      return;
    }
    entering = true;
    const onPath =
      (global.location.pathname || '').indexOf(PATH_SEGMENT) >= 0;
    syncUrl(opts, onPath);
    hideMainLayout();
    if (!showOsRoot()) {
      entering = false;
      document.body.classList.remove('lumina-os-active');
      showMainLayout();
      if (typeof global.showToast === 'function') {
        global.showToast('Lumina OS UI failed to load. Refresh the page.');
      }
      return;
    }
    document.title = 'Lumina OS';
    if (global.LuminaOSApp && !mounted) {
      Promise.resolve(global.LuminaOSApp.mount(opts))
        .then(() => {
          mounted = true;
          persistRoute();
          entering = false;
        })
        .catch((err) => {
          console.error('[LuminaOS] mount failed', err);
          mounted = false;
          entering = false;
          if (typeof global.showToast === 'function') {
            global.showToast('Lumina OS failed to load. Try refreshing.');
          }
          exit({ failedMount: true });
        });
    } else if (global.LuminaOSApp) {
      mounted = true;
      global.LuminaOSApp.activate(opts);
      persistRoute();
      entering = false;
    } else {
      entering = false;
    }
  }

  function exit(opts) {
    opts = opts || {};
    if (exiting) return;
    exiting = true;
    entering = false;
    mounted = false;
    if (global.LuminaOSApp) global.LuminaOSApp.deactivate();
    showMainLayout();
    document.title = 'POXY WORLD';
    const home = homePath();
    try {
      global.history.replaceState({ layout: 'main' }, '', home);
    } catch (e) {}
    try {
      if (global.currentUser) {
        const key =
          (global.POXY_ROUTE_LS || 'poxy_active_route') +
          '_' +
          global.currentUser.id;
        localStorage.setItem(
          key,
          JSON.stringify({ kind: 'stitch', tab: 'dashboard' })
        );
      }
    } catch (e) {}
    if (global.currentUser && typeof global.showStitchTab === 'function') {
      try {
        global.showStitchTab('dashboard');
      } catch (e) {}
    }
    exiting = false;
  }

  function onRouteChange() {
    if (isLuminaOSPath()) {
      if (resolveUser()) enter({ replace: true, ...parseQuery() });
      else {
        ensureUser().then((u) => {
          if (u) enter({ replace: true, ...parseQuery() });
          else showMainLayout();
        });
      }
    } else if (mounted) {
      mounted = false;
      if (global.LuminaOSApp) global.LuminaOSApp.deactivate();
      showMainLayout();
    }
  }

  function bootstrapFromUrl() {
    if (!isLuminaOSPath()) return false;
    if (resolveUser()) {
      enter({ replace: true, ...parseQuery() });
      return true;
    }
    ensureUser().then((u) => {
      if (u && isLuminaOSPath()) enter({ replace: true, ...parseQuery() });
    });
    return false;
  }

  global.LuminaOSRouter = {
    HASH_PREFIX,
    PATH_SEGMENT,
    appBase,
    homePath,
    isActive: isLuminaOSPath,
    buildHash,
    parseQuery,
    enter,
    exit,
    bootstrapFromUrl,
    hideMainLayout,
    showMainLayout,
  };

  global.addEventListener('popstate', onRouteChange);
  global.addEventListener('hashchange', onRouteChange);
})(window);
