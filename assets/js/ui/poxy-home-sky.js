/**
 * POXY Sky Home + Open screens (Stage 4).
 */
(function (global) {
  'use strict';

  var activeView = 'home';

  function $(id) {
    return document.getElementById(id);
  }

  function formatBalance(val) {
    if (typeof global.formatPX === 'function') {
      return global.formatPX(val).replace(/\s*PX\s*$/i, '');
    }
    var n = Number(val) || 0;
    return n.toLocaleString();
  }

  function sync() {
    var figEl = $('pxSkyHomeFigures');
    var balEl = $('pxSkyHomeBalanceNum');
    var total = (global.colData && global.colData.length) || 0;
    if (figEl) figEl.textContent = String(total);
    if (balEl) {
      var px = typeof global.getPxBalance === 'function' ? global.getPxBalance() : 0;
      balEl.textContent = formatBalance(px);
    }
  }

  function ensureHuntVisible() {
    var hunt = $('huntPage');
    if (hunt) hunt.style.display = 'block';
  }

  function setView(view) {
    activeView = view === 'open' ? 'open' : 'home';
    var home = $('pxSkyHome');
    var open = $('pxSkyOpen');
    if (home) {
      home.classList.toggle('px-sky-screen--active', activeView === 'home');
    }
    if (open) {
      open.classList.toggle('px-sky-screen--active', activeView === 'open');
    }
    if (global.PoxyAppShell && typeof global.PoxyAppShell.syncRail === 'function') {
      global.PoxyAppShell.syncRail(activeView === 'open' ? 'open' : 'dashboard');
    }
  }

  function showHome() {
    ensureHuntVisible();
    if (typeof global.showStitchTab === 'function') global.showStitchTab('dashboard');
    setView('home');
    sync();
  }

  function showOpen() {
    ensureHuntVisible();
    if (typeof global.showStitchTab === 'function') global.showStitchTab('dashboard');
    setView('open');
    if (global.PoxyOpenSky) global.PoxyOpenSky.onShow();
  }

  function bind() {
    var openBtn = $('pxSkyHomeOpenBtn');
    var colBtn = $('pxSkyHomeColBtn');
    if (openBtn) openBtn.addEventListener('click', showOpen);
    if (colBtn)
      colBtn.addEventListener('click', function () {
        if (typeof global.showPage === 'function') global.showPage('collection');
      });
  }

  function init() {
    bind();
    if (document.body.classList.contains('poxy-sky-app-active')) {
      setView('home');
    }
  }

  global.PoxyHomeSky = {
    sync: sync,
    showHome: showHome,
    showOpen: showOpen,
    setView: setView,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
