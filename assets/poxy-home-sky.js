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

  function renderColPreview() {
    var grid = $('pxSkyHomeColGrid');
    if (!grid || !global.colData) return;
    grid.innerHTML = '';
    var items = (global.applyPinSort ? global.applyPinSort(global.colData) : global.colData).slice(0, 4);
    var tiers = global.TIERS || [];
    var tierById = global.TIER_BY_ID || {};
    items.forEach(function (item) {
      var tier = tierById[item.poxy_tier] || tiers[0] || { label: 'Common', color: '#8A8F98' };
      var name = (item.character_name || tier.label || 'POXY').slice(0, 24);
      var ring = tier.color || '#60C2E0';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cards-cell';
      btn.style.setProperty('--ring', ring);
      btn.addEventListener('click', function () {
        if (typeof global.showPage === 'function') global.showPage('collection');
      });
      btn.innerHTML =
        '<div class="cell-frame"><span class="material-symbols-outlined" style="font-size:42px;color:' +
        ring +
        '">view_in_ar</span></div>' +
        '<div class="cell-meta"><div class="cell-name">' +
        (global.sanitizeText ? global.sanitizeText(name) : name) +
        '</div>' +
        '<div class="cell-rar" style="color:' +
        ring +
        '">' +
        (tier.label || 'POXY').toUpperCase() +
        '</div></div>';
      grid.appendChild(btn);
    });
    if (!items.length) {
      grid.innerHTML =
        '<div class="panel panel-pad" style="grid-column:1/-1;text-align:center;color:var(--text-dim);font-size:14px">Open your first box to start your shelf.</div>';
    }
  }

  function setView(view) {
    activeView = view === 'open' ? 'open' : 'home';
    var home = $('pxSkyHome');
    var open = $('pxSkyOpen');
    if (home) {
      home.classList.toggle('px-sky-screen--active', activeView === 'home');
      home.hidden = activeView !== 'home';
    }
    if (open) {
      open.classList.toggle('px-sky-screen--active', activeView === 'open');
      open.hidden = activeView !== 'open';
    }
    if (global.PoxyAppShell && typeof global.PoxyAppShell.syncRail === 'function') {
      global.PoxyAppShell.syncRail(activeView === 'open' ? 'open' : 'dashboard');
    }
  }

  function showHome() {
    if (typeof global.showStitchTab === 'function') global.showStitchTab('dashboard');
    setView('home');
    sync();
    renderColPreview();
  }

  function showOpen() {
    if (typeof global.showStitchTab === 'function') global.showStitchTab('dashboard');
    setView('open');
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
    renderColPreview: renderColPreview,
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
