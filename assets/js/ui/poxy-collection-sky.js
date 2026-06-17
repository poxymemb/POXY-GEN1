/**
 * POXY Sky Collection screen (Stage 5).
 */
(function (global) {
  'use strict';

  var ATLAS_SEASON_ID = 'gen_china_magic';
  var _colObserver = null;

  function $(id) {
    return document.getElementById(id);
  }

  function resetSkyPadding() {
    var page = $('collectionPage');
    if (!page) return;
    page.style.paddingTop = '0';
    page.style.paddingBottom = '';
  }

  function ensureMilesPanel() {
    var shell = document.querySelector('#collectionPage .poxy-col-shell');
    if (!shell || $('pxSkyColMiles')) return;
    var head = shell.querySelector('.px-sky-page-head');
    var miles = document.createElement('div');
    miles.id = 'pxSkyColMiles';
    miles.className = 'panel panel-pad miles px-sky-col-miles';
    miles.innerHTML =
      '<div class="ring-prog px-sky-col-ring" id="pxSkyColRing" style="--p:0;position:relative"><span id="pxSkyColRingPct">0%</span></div>' +
      '<div class="m-txt">' +
      '<div class="mt" id="pxSkyColMilesTitle">Season progress</div>' +
      '<div class="md" id="pxSkyColMilesMeta">Open boxes to start your shelf.</div>' +
      '</div>';
    if (head) {
      head.insertAdjacentElement('afterend', miles);
    } else {
      shell.insertBefore(miles, shell.firstChild);
    }
  }

  function ensureSearchStub() {
    var utils = document.querySelector('#collectionPage .poxy-col-utils');
    if (!utils || $('pxSkyColSearch')) return;
    var wrap = document.createElement('div');
    wrap.className = 'search px-sky-col-search';
    wrap.id = 'pxSkyColSearchWrap';
    wrap.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>';
    var input = document.createElement('input');
    input.id = 'pxSkyColSearch';
    input.type = 'search';
    input.placeholder = 'Search figures';
    input.disabled = true;
    input.setAttribute('aria-disabled', 'true');
    // TODO Stage 5: search stub — no backend filter yet
    wrap.appendChild(input);
    utils.appendChild(wrap);
  }

  function applyMiles(collected, total) {
    var ring = $('pxSkyColRing');
    var pctEl = $('pxSkyColRingPct');
    var meta = $('pxSkyColMilesMeta');
    var title = $('pxSkyColMilesTitle');
    if (!ring || !pctEl || !meta) return;
    var safeTotal = total > 0 ? total : 0;
    var safeCollected = collected > 0 ? collected : 0;
    var pct = safeTotal ? Math.round((safeCollected / safeTotal) * 100) : 0;
    ring.style.setProperty('--p', String(pct));
    pctEl.textContent = pct + '%';
    if (title) title.textContent = 'Season 01 progress';
    if (safeTotal) {
      meta.textContent =
        safeCollected +
        ' of ' +
        safeTotal +
        ' figures collected. Keep going to complete the set.';
    } else if (global.colData && global.colData.length) {
      meta.textContent =
        String(global.colData.length) +
        ' figure' +
        (global.colData.length === 1 ? '' : 's') +
        ' on your shelf.';
    } else {
      meta.textContent = 'Open boxes to start your shelf.';
    }
  }

  function syncMilesFromLabel() {
    var label = $('atlasProgressLabel');
    if (!label || !label.textContent) return false;
    var m = label.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return false;
    applyMiles(parseInt(m[1], 10), parseInt(m[2], 10));
    return true;
  }

  function syncMilesProgress() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (!$('collectionPage') || !$('collectionPage').classList.contains('visible')) return;
    if (syncMilesFromLabel()) return;
    if (!global.sb || !global.currentUser) {
      applyMiles(0, 0);
      return;
    }
    global.sb
      .rpc('get_atlas_progress', {
        p_user_id: global.currentUser.id,
        p_season_id: ATLAS_SEASON_ID,
      })
      .then(function (res) {
        var items = res.data && res.data.ok ? res.data.items : null;
        if (!items || !items.length) {
          applyMiles((global.colData && global.colData.length) || 0, 0);
          return;
        }
        var collected = 0;
        items.forEach(function (it) {
          if (it.has_collected) collected += 1;
        });
        applyMiles(collected, items.length);
      })
      .catch(function () {
        applyMiles((global.colData && global.colData.length) || 0, 0);
      });
  }

  function bindColContentObserver() {
    if (_colObserver) return;
    var col = $('colContent');
    if (!col || typeof MutationObserver === 'undefined') return;
    _colObserver = new MutationObserver(function () {
      syncMilesProgress();
    });
    _colObserver.observe(col, { childList: true, subtree: false });
  }

  function relabelSkyActionButtons() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    var multi = $('btnColMultiSelect');
    var sortLbl = $('colSortLabel');
    var burn = $('btnColBurnCapsule');
    var craft = $('btnColCraftCapsule');
    if (multi && !multi.dataset.skyLabel) {
      multi.dataset.skyLabel = '1';
      multi.textContent = 'Multi-select';
    }
    if (sortLbl && sortLbl.textContent.indexOf('SORT:') === 0) {
      sortLbl.textContent = sortLbl.textContent.replace(/^SORT:\s*/i, 'Sort: ');
    }
    if (burn) {
      var n = global.selectedForDust ? global.selectedForDust.size : 0;
      var payout =
        typeof global.estimateBurnPayout === 'function'
          ? global.estimateBurnPayout([].slice.call(global.selectedForDust || []))
          : 0;
      burn.textContent = n
        ? 'Sell ' + n + ' for coins (+' + payout + ')'
        : 'Sell for coins';
    }
    if (craft) {
      if (global.colCraftZoneOpen) {
        var filled =
          typeof global.getCraftSocketIds === 'function'
            ? global.getCraftSocketIds().length
            : 0;
        craft.textContent = filled === 5 ? 'Craft now' : 'Craft (' + filled + '/5)';
      } else {
        craft.textContent = 'Craft';
      }
    }
    var bulkBurn = $('btnBulkDust');
    if (bulkBurn) bulkBurn.textContent = 'Sell all selected for coins';
  }

  function wrapActionCapsules() {
    if (wrapActionCapsules.done || typeof global.updateColActionCapsules !== 'function') return;
    var orig = global.updateColActionCapsules;
    global.updateColActionCapsules = function () {
      orig();
      relabelSkyActionButtons();
    };
    wrapActionCapsules.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('collection');
    wrapActionCapsules();
    resetSkyPadding();
    ensureMilesPanel();
    ensureSearchStub();
    bindColContentObserver();
    syncMilesProgress();
    relabelSkyActionButtons();
    requestAnimationFrame(resetSkyPadding);
  }

  global.PoxyCollectionSky = {
    onShow: onShow,
    syncMilesProgress: syncMilesProgress,
    relabelSkyActionButtons: relabelSkyActionButtons,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapActionCapsules);
  } else {
    wrapActionCapsules();
  }
})(window);
