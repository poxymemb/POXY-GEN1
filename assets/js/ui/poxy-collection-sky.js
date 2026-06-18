/**
 * POXY Sky Collection screen (Stage 5 / Phase A-functional).
 */
(function (global) {
  'use strict';

  var ATLAS_SEASON_ID = 'gen_china_magic';
  var _colObserver = null;
  var _milesSyncTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function resetSkyPadding() {
    var page = $('collectionPage');
    if (!page) return;
    page.style.paddingTop = '0';
    page.style.paddingBottom = '';
  }

  function matchColSkySearch(item) {
    var q = (global.colSkySearch || '').trim().toLowerCase();
    if (!q || !item) return true;
    var tier = String(item.poxy_tier || '');
    var tierLabel = '';
    if (global.TIER_BY_ID && global.TIER_BY_ID[tier]) {
      tierLabel = global.TIER_BY_ID[tier].label || '';
    }
    var serial = String(item.serial_number != null ? item.serial_number : item.serial || '');
    var vip = item.vip_serial != null ? String(item.vip_serial) : '';
    var hay = (tier + ' ' + tierLabel + ' ' + serial + ' ' + vip).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  global.matchColSkySearch = matchColSkySearch;

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
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('enterkeyhint', 'search');
    wrap.appendChild(input);
    utils.appendChild(wrap);
    wireColSearch();
  }

  function wireColSearch() {
    var input = $('pxSkyColSearch');
    if (!input || input.dataset.wired === '1') return;
    input.dataset.wired = '1';
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        global.colSkySearch = input.value || '';
        if (typeof global.renderCollection === 'function') global.renderCollection();
      }, 180);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        input.value = '';
        global.colSkySearch = '';
        if (typeof global.renderCollection === 'function') global.renderCollection();
      }
    });
  }

  function hideStageNoise() {
    document.body.classList.add('poxy-sky-collection-active');
    if (typeof global.hideHuntPageShell === 'function') global.hideHuntPageShell();
    var club = $('clubPage');
    if (club && club.parentElement && club.parentElement.id !== 'stPanelClub') {
      club.style.display = 'none';
    }
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
    var stage = $('pxSkyStage');
    if (stage) stage.scrollTop = 0;
  }

  function ensureInventoryView() {
    var inv = $('colInventoryView');
    var atlas = $('colAtlas');
    if (inv) inv.hidden = false;
    if (atlas) atlas.hidden = true;
    document.querySelectorAll('#collectionPage .poxy-col-view-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.colView === 'inventory');
    });
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

  function teardownColObserver() {
    if (_colObserver) {
      _colObserver.disconnect();
      _colObserver = null;
    }
  }

  function bindColContentObserver() {
    if (_colObserver) return;
    var col = $('colContent');
    if (!col || typeof MutationObserver === 'undefined') return;
    _colObserver = new MutationObserver(function () {
      if (_milesSyncTimer) clearTimeout(_milesSyncTimer);
      _milesSyncTimer = setTimeout(function () {
        _milesSyncTimer = null;
        syncMilesProgress();
      }, 150);
    });
    _colObserver.observe(col, { childList: true, subtree: false });
  }

  function relabelSkySortOptions() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    var labels = {
      default: 'Default (pinned)',
      duplicates: 'Duplicates first',
      recent: 'Recently acquired',
      value: 'Highest value',
    };
    document.querySelectorAll('#colSortMenu .poxy-col-sort-opt').forEach(function (btn) {
      var key = btn.getAttribute('data-sort');
      if (labels[key]) btn.textContent = labels[key];
    });
  }

  function relabelSkyActionButtons() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    var multi = $('btnColMultiSelect');
    var sortLbl = $('colSortLabel');
    if (multi && !multi.dataset.skyLabel) {
      multi.dataset.skyLabel = '1';
      multi.textContent = 'Multi-select';
    }
    if (sortLbl && sortLbl.textContent.indexOf('SORT:') === 0) {
      sortLbl.textContent = sortLbl.textContent.replace(/^SORT:\s*/i, 'Sort: ');
    }
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

  function wrapRenderCollection() {
    if (wrapRenderCollection.done || typeof global.renderCollection !== 'function') return;
    var orig = global.renderCollection;
    global.renderCollection = function () {
      orig();
      syncMilesProgress();
    };
    wrapRenderCollection.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('collection');
    wrapActionCapsules();
    wrapRenderCollection();
    hideStageNoise();
    resetSkyPadding();
    ensureMilesPanel();
    ensureSearchStub();
    wireColSearch();
    ensureInventoryView();
    bindColContentObserver();
    relabelSkySortOptions();
    syncMilesProgress();
    relabelSkyActionButtons();
    requestAnimationFrame(resetSkyPadding);
  }

  global.PoxyCollectionSky = {
    onShow: onShow,
    onHide: teardownColObserver,
    syncMilesProgress: syncMilesProgress,
    relabelSkyActionButtons: relabelSkyActionButtons,
    matchColSkySearch: matchColSkySearch,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wrapActionCapsules();
      wrapRenderCollection();
    });
  } else {
    wrapActionCapsules();
    wrapRenderCollection();
  }
})(window);
