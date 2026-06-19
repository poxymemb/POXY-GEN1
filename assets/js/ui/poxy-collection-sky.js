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
    var hay = (tier + ' ' + tierLabel + ' ' + serial).toLowerCase();
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
      applySkyCardRings();
    };
    wrapRenderCollection.done = true;
  }

  var SKY_RAR_COLOR = {
    common: '#8A8F98',
    uncommon: '#8A8F98',
    rare: '#60C2E0',
    epic: '#456DB0',
    legendary: '#E0A23C',
    mythic: '#D9744F',
    obsidian: '#8A8F98',
    cursed: '#456DB0',
    souvenir: '#60C2E0',
    stellar: '#60C2E0',
    diamond: '#60C2E0',
    secret: '#D9744F',
  };

  var FROG_BY_TIER = {
    common: { c1: '#6FD66F', c2: '#3AA83A' },
    uncommon: { c1: '#7BE0C0', c2: '#3AA888' },
    rare: { c1: '#8FD7E5', c2: '#46A8C0' },
    epic: { c1: '#9B8FE0', c2: '#5B4FB0' },
    legendary: { c1: '#7BE0A0', c2: '#3AA85F' },
    mythic: { c1: '#E58F6F', c2: '#C0552F' },
    obsidian: { c1: '#556872', c2: '#37474F' },
    cursed: { c1: '#9B8FE0', c2: '#7E57C2' },
    souvenir: { c1: '#5ec4b8', c2: '#26A69A' },
    stellar: { c1: '#6eb8f5', c2: '#42A5F5' },
    diamond: { c1: '#a8eef5', c2: '#80DEEA' },
    secret: { c1: '#ff9a7a', c2: '#FF6E40' },
  };

  var _skyModalItem = null;

  function passportApi() {
    return global.PoxyPassportSky || {};
  }

  function figureTitle(item, tier) {
    var api = passportApi();
    if (api.figureTitle) return api.figureTitle(item, tier);
    return (tier && tier.label) || 'POXY';
  }

  function passportSerial(item) {
    var api = passportApi();
    return api.passportSerial ? api.passportSerial(item) : '—';
  }

  function passportEdition(item, tier) {
    var api = passportApi();
    return api.passportEdition ? api.passportEdition(item, tier) : '—';
  }

  function passportSeason(item) {
    var api = passportApi();
    return api.passportSeason ? api.passportSeason(item) : '01';
  }

  function tierFromItem(item) {
    if (!item) return (global.TIERS && global.TIERS[0]) || { id: 'common', label: 'Common', color: '#8A8F98' };
    return (global.TIER_BY_ID && global.TIER_BY_ID[item.poxy_tier]) || (global.TIERS && global.TIERS[0]) || { id: 'common', label: 'Common', color: '#8A8F98' };
  }

  function tierRarColor(tier) {
    if (!tier || !tier.id) return '#60C2E0';
    return SKY_RAR_COLOR[tier.id] || tier.color || '#60C2E0';
  }

  function frogHTML(c1, c2) {
    return (
      '<div class="frog px-sky-frog" style="--c1:' +
      c1 +
      ';--c2:' +
      c2 +
      ';--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>'
    );
  }

  function renderFrogForTier(tier) {
    var pal = FROG_BY_TIER[tier.id] || { c1: tier.color || '#60C2E0', c2: tier.color || '#40ABCC' };
    return frogHTML(pal.c1, pal.c2);
  }

  function skyText(value) {
    if (typeof global.sanitizeText === 'function') return global.sanitizeText(String(value == null ? '' : value));
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  function frameHtmlForItem(item, tier) {
    if (item.asset_url) {
      return (
        '<img class="px-sky-fig-img" src="' +
        skyText(item.asset_url) +
        '" alt="' +
        skyText(tier.label || 'POXY') +
        '">'
      );
    }
    return renderFrogForTier(tier);
  }

  function ensureFigureModal() {
    if ($('pxSkyFigureModal')) return;
    var el = document.createElement('div');
    el.id = 'pxSkyFigureModal';
    el.className = 'modal px-sky-figure-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Figure passport');
    el.innerHTML =
      '<div class="modal-card" id="pxSkyFigureCard">' +
      '<div class="modal-frame" id="pxSkyFigureFrame"><div id="pxSkyFigureArt"></div></div>' +
      '<div class="modal-body">' +
      '<h3 id="pxSkyFigureTitle">POXY</h3>' +
      '<div class="mrar" id="pxSkyFigureRar">Rare</div>' +
      '<div class="modal-passport">' +
      '<div class="mp-row"><span class="k">Serial</span><span class="v" id="pxSkyFigureSerial">—</span></div>' +
      '<div class="mp-row"><span class="k">Edition</span><span class="v" id="pxSkyFigureEdition">—</span></div>' +
      '<div class="mp-row"><span class="k">Season</span><span class="v" id="pxSkyFigureSeason">01</span></div>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-primary" id="pxSkyFigureSell">Sell on market</button>' +
      '<button type="button" class="btn btn-glass" id="pxSkyFigureClose">Close</button>' +
      '</div></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) closeSkyFigureModal();
    });
    $('pxSkyFigureClose').addEventListener('click', closeSkyFigureModal);
    $('pxSkyFigureSell').addEventListener('click', onSkyFigureSell);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('open')) closeSkyFigureModal();
    });
  }

  function openSkyFigureModal(item) {
    if (!item) return;
    ensureFigureModal();
    _skyModalItem = item;
    var tier = tierFromItem(item);
    var rc = tierRarColor(tier);
    var frame = $('pxSkyFigureFrame');
    var art = $('pxSkyFigureArt');
    var title = $('pxSkyFigureTitle');
    var rar = $('pxSkyFigureRar');
    var serial = $('pxSkyFigureSerial');
    var edition = $('pxSkyFigureEdition');
    var season = $('pxSkyFigureSeason');
    if (frame) frame.style.setProperty('--mr', rc);
    if (art) art.innerHTML = frameHtmlForItem(item, tier);
    if (title) title.textContent = figureTitle(item, tier);
    if (rar) {
      rar.textContent = tier.label || 'POXY';
      rar.style.color = rc;
    }
    if (serial) serial.textContent = passportSerial(item);
    if (edition) edition.textContent = passportEdition(item, tier);
    if (season) season.textContent = passportSeason(item);
    $('pxSkyFigureModal').classList.add('open');
    document.body.classList.add('px-sky-figure-modal-open');
  }

  function closeSkyFigureModal() {
    var modal = $('pxSkyFigureModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('px-sky-figure-modal-open');
    _skyModalItem = null;
  }

  function onSkyFigureSell() {
    var item = _skyModalItem;
    if (!item) return;
    var tier = tierFromItem(item);
    global.pendingListItem = {
      poxyId: item.id,
      tier: tier,
      serial: item.serial_number || '',
      fromHunt: false,
    };
    closeSkyFigureModal();
    if (typeof global.openPriceModal === 'function') global.openPriceModal();
  }

  function isSkyCollectionRoute() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      $('collectionPage') &&
      $('collectionPage').classList.contains('visible')
    );
  }

  function wrapAssetViewerModal() {
    if (wrapAssetViewerModal.done || typeof global.openAssetViewerModal !== 'function') return;
    var openOrig = global.openAssetViewerModal;
    global.openAssetViewerModal = function (item) {
      if (isSkyCollectionRoute()) {
        openSkyFigureModal(item);
        return;
      }
      openOrig(item);
    };
    if (typeof global.closeAssetViewerModal === 'function') {
      var closeOrig = global.closeAssetViewerModal;
      global.closeAssetViewerModal = function () {
        closeSkyFigureModal();
        closeOrig();
      };
    }
    wrapAssetViewerModal.done = true;
  }

  function applySkyCardRings() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    var map = SKY_RAR_COLOR;
    document.querySelectorAll('#collectionPage #colContent .col-card[data-tier]').forEach(function (card) {
      var ring = map[card.dataset.tier] || card.style.getPropertyValue('--rarity-color') || '#60C2E0';
      card.style.setProperty('--ring', ring);
    });
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('collection');
    wrapActionCapsules();
    wrapRenderCollection();
    wrapAssetViewerModal();
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
    applySkyCardRings();
    requestAnimationFrame(resetSkyPadding);
  }

  global.PoxyCollectionSky = {
    onShow: onShow,
    onHide: function () {
      closeSkyFigureModal();
      teardownColObserver();
    },
    syncMilesProgress: syncMilesProgress,
    relabelSkyActionButtons: relabelSkyActionButtons,
    matchColSkySearch: matchColSkySearch,
    openSkyFigureModal: openSkyFigureModal,
    closeSkyFigureModal: closeSkyFigureModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wrapActionCapsules();
      wrapRenderCollection();
      wrapAssetViewerModal();
    });
  } else {
    wrapActionCapsules();
    wrapRenderCollection();
    wrapAssetViewerModal();
  }
})(window);
