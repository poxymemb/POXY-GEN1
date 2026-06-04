/**
 * Lumina OS — SPA layout router (MainLayout ↔ LuminaOSLayout).
 */
(function (global) {
  const PATH = '/lumina-os';
  let mounted = false;
  let exiting = false;

  function normalizePath(p) {
    const base = (p || global.location.pathname || '').replace(/\/+$/, '') || '/';
    return base;
  }

  function isLuminaOSPath() {
    const p = normalizePath(global.location.pathname);
    if (p === PATH || p.startsWith(PATH + '/')) return true;
    const h = (global.location.hash || '').replace(/^#/, '');
    return h === PATH || h.startsWith(PATH + '?');
  }

  function buildUrl(opts) {
    opts = opts || {};
    const params = new URLSearchParams();
    if (opts.user && global.LuminaChatUtil?.isUuid(opts.user)) {
      params.set('user', opts.user);
    }
    if (opts.nav) params.set('nav', opts.nav);
    const q = params.toString();
    return PATH + (q ? '?' + q : '');
  }

  function parseQuery() {
    const params = new URLSearchParams(global.location.search);
    return {
      user: params.get('user') || params.get('with') || null,
      nav: params.get('nav') || null,
    };
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
    if (hunt && !shell?.contains(hunt)) {
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
      root.classList.remove('is-mounted', 'is-entering', 'is-ready');
      root.setAttribute('hidden', '');
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

  function persistRoute() {
    if (!global.currentUser || typeof global.persistActiveRoute !== 'function') return;
    try {
      const key =
        (global.POXY_ROUTE_LS || 'poxy_active_route') + '_' + global.currentUser.id;
      localStorage.setItem(key, JSON.stringify({ kind: 'lumina-os' }));
    } catch (e) {}
  }

  function enter(opts) {
    opts = opts || {};
    if (!global.currentUser) {
      if (typeof global.showToast === 'function') {
        global.showToast('Sign in to open Lumina OS.');
      }
      return;
    }
    if (
      opts.user &&
      String(opts.user) === String(global.currentUser.id)
    ) {
      if (typeof global.showToast === 'function') {
        global.showToast('Cannot message yourself.');
      }
      return;
    }
    const url = buildUrl(opts);
    const state = { layout: 'lumina-os', user: opts.user || null, nav: opts.nav || null };
    if (opts.replace) {
      global.history.replaceState(state, '', url);
    } else if (normalizePath(global.location.pathname) !== PATH || global.location.search) {
      global.history.pushState(state, '', url);
    }
    hideMainLayout();
    const root = document.getElementById('luminaOsRoot');
    if (root) {
      root.removeAttribute('hidden');
      root.classList.add('is-mounted', 'is-entering');
      requestAnimationFrame(() => {
        root.classList.add('is-ready');
        root.classList.remove('is-entering');
      });
    }
    document.title = 'Lumina OS';
    persistRoute();
    if (global.LuminaOSApp && !mounted) {
      global.LuminaOSApp.mount(opts);
      mounted = true;
    } else if (global.LuminaOSApp) {
      global.LuminaOSApp.activate(opts);
    }
  }

  function exit(opts) {
    opts = opts || {};
    if (exiting) return;
    exiting = true;
    const root = document.getElementById('luminaOsRoot');
    if (root) root.classList.add('is-exiting');
    const done = () => {
      mounted = false;
      if (global.LuminaOSApp) global.LuminaOSApp.deactivate();
      showMainLayout();
      document.title = 'POXY WORLD';
      if (!opts.skipHistory) {
        const back = global.history.state?.layout === 'lumina-os';
        if (back) global.history.back();
        else global.history.pushState({ layout: 'main' }, '', '/');
      }
      if (global.currentUser && typeof global.restoreActiveRoute === 'function') {
        if (!global.restoreActiveRoute()) {
          if (typeof global.showStitchTab === 'function') global.showStitchTab('dashboard');
        }
      }
      exiting = false;
      if (root) root.classList.remove('is-exiting');
    };
    setTimeout(done, 300);
  }

  function onPopState() {
    if (isLuminaOSPath()) {
      if (global.currentUser) enter({ replace: true, ...parseQuery() });
      else showMainLayout();
    } else if (mounted) {
      mounted = false;
      showMainLayout();
      if (global.LuminaOSApp) global.LuminaOSApp.deactivate();
    } else {
      showMainLayout();
    }
  }

  function bootstrapFromUrl() {
    if (isLuminaOSPath() && global.currentUser) {
      enter({ replace: true, ...parseQuery() });
      return true;
    }
    return false;
  }

  global.LuminaOSRouter = {
    PATH,
    isActive: isLuminaOSPath,
    buildUrl,
    parseQuery,
    enter,
    exit,
    bootstrapFromUrl,
    hideMainLayout,
    showMainLayout,
  };

  global.addEventListener('popstate', onPopState);
})(window);
