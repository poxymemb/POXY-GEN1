/**
 * POXY Sky Open ritual (Stage 7).
 */
(function (global) {
  'use strict';

  var COIN_SVG =
    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxOpenCoinGrad)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxOpenCoinGrad" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';

  var SKY_BOXES = [
    { caseId: 'standard', name: 'Starter', odds: 'Common to Rare', b1: '#8BCFE4', b2: '#60C2E0' },
    { caseId: 'vip', name: 'Premium', odds: 'Rare to Epic', b1: '#60C2E0', b2: '#40ABCC' },
    { caseId: 'genesis', name: 'Elite', odds: 'Epic to Legendary', b1: '#40ABCC', b2: '#2E85A0' },
    { caseId: 'mythic', name: 'Mythic', odds: 'A shot at Mythic', b1: '#E0A23C', b2: '#D9744F' },
    { caseId: 'legend', name: 'Legend', odds: 'Legendary focus', b1: '#E0A23C', b2: '#B8862F' },
  ];

  var GEN_MS = 2400;
  var curBox = SKY_BOXES[0];
  var _opening = false;

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

  var MUTATION_BY_TIER = {
    common: 'Classic',
    uncommon: 'Verdant',
    rare: 'Frost',
    epic: 'Royal',
    legendary: 'Aurora',
    mythic: 'Ember',
    obsidian: 'Void',
    cursed: 'Hex',
    souvenir: 'Keepsake',
    stellar: 'Starlit',
    diamond: 'Prism',
    secret: 'Hidden',
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

  function frogHTML(c1, c2) {
    return (
      '<div class="frog px-sky-frog" style="--c1:' +
      c1 +
      ';--c2:' +
      c2 +
      ';--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>'
    );
  }

  function tierFrogColors(tier) {
    if (!tier || !tier.id) return FROG_BY_TIER.common;
    return FROG_BY_TIER[tier.id] || { c1: tier.color || '#60C2E0', c2: tier.color || '#40ABCC' };
  }

  function tierRarColor(tier) {
    if (!tier || !tier.id) return '#60C2E0';
    return SKY_RAR_COLOR[tier.id] || tier.color || '#60C2E0';
  }

  function ritualFigureName(tier) {
    if (!tier || !tier.id) return 'Heart · Figure';
    var sub = MUTATION_BY_TIER[tier.id] || tier.label || 'Figure';
    return 'Heart · ' + sub;
  }

  function renderFrogForTier(tier) {
    var colors = tierFrogColors(tier);
    return frogHTML(colors.c1, colors.c2);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function isSkyOpen() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      $('pxSkyOpen') &&
      $('pxSkyOpen').classList.contains('px-sky-screen--active')
    );
  }

  function formatCoinPrice(caseId) {
    if (typeof global.getEffectiveCasePrice === 'function') {
      var n = global.getEffectiveCasePrice(caseId);
      return COIN_SVG + Number(n).toLocaleString();
    }
    return COIN_SVG + '—';
  }

  function isLegendSoldOut() {
    var leg = global.playerEconomy && global.playerEconomy.legend_monthly;
    if (!leg) return false;
    return (leg.opens || 0) >= (leg.cap || 100);
  }

  function ensureRitual() {
    if ($('pxSkyRitual')) return;
    var el = document.createElement('div');
    el.id = 'pxSkyRitual';
    el.className = 'ritual px-sky-ritual';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<button type="button" class="ritual-close" id="pxSkyRitualClose" aria-label="Close">✕</button>' +
      '<div class="stage-box is-active" id="pxSkyStageBox">' +
      '<div class="stage-title" id="pxSkyBoxTitle">Starter box</div>' +
      '<div class="big-box" id="pxSkyBigBox"><div class="bb-lid"></div><div class="bb-body"></div><div class="bb-mk"></div></div>' +
      '<div class="stage-hint">Tap the box to open</div>' +
      '</div>' +
      '<div class="stage-box" id="pxSkyStageGen">' +
      '<div class="stage-title">Generating…</div>' +
      '<div class="gen-frame" id="pxSkyGenFrame"><div class="ring"></div><div class="gen-sweep"></div><div class="gen-reveal" id="pxSkyGenReveal"></div></div>' +
      '<div class="stage-hint">Your figure is forming</div>' +
      '</div>' +
      '<div class="result" id="pxSkyStageResult">' +
      '<div class="gen-frame" id="pxSkyResultFrame"><div class="ring"></div><div id="pxSkyResultFig"></div></div>' +
      '<div><div class="rname" id="pxSkyResultName">POXY</div><div class="rrar" id="pxSkyResultRar">Rare</div></div>' +
      '<div class="result-actions">' +
      '<button type="button" class="btn btn-primary" id="pxSkyRitualKeep"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg> Keep it</button>' +
      '<button type="button" class="btn btn-glass" id="pxSkyRitualSell">Sell for coins</button>' +
      '<button type="button" class="btn btn-glass" id="pxSkyRitualAgain">Open another</button>' +
      '</div></div>';
    document.body.appendChild(el);
    $('pxSkyRitualClose').addEventListener('click', closeRitual);
    $('pxSkyBigBox').addEventListener('click', onBigBoxTap);
    $('pxSkyRitualKeep').addEventListener('click', onKeep);
    $('pxSkyRitualSell').addEventListener('click', onSellForCoins);
    $('pxSkyRitualAgain').addEventListener('click', onOpenAnother);
  }

  function resetRitualStages() {
    var big = $('pxSkyBigBox');
    var gen = $('pxSkyGenFrame');
    if (big) big.classList.remove('opening');
    if (gen) gen.classList.remove('run');
    ['pxSkyStageBox', 'pxSkyStageGen', 'pxSkyStageResult'].forEach(function (id) {
      var node = $(id);
      if (node) node.classList.remove('is-active');
    });
    var box = $('pxSkyStageBox');
    if (box) box.classList.add('is-active');
    _opening = false;
  }

  function openRitual(boxCfg) {
    ensureRitual();
    curBox = boxCfg || curBox;
    document.documentElement.style.setProperty('--rb1', curBox.b1);
    document.documentElement.style.setProperty('--rb2', curBox.b2);
    var title = $('pxSkyBoxTitle');
    if (title) title.textContent = curBox.name + ' box';
    resetRitualStages();
    $('pxSkyRitual').classList.add('show');
  }

  function closeRitual() {
    var ritual = $('pxSkyRitual');
    if (ritual) ritual.classList.remove('show');
    resetRitualStages();
  }

  function ensureBoxGrid() {
    var grid = $('pxSkyOpenBoxes');
    if (!grid || grid.dataset.ready === '1') return;
    grid.dataset.ready = '1';
    SKY_BOXES.forEach(function (cfg) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'box-card px-sky-box-card';
      btn.dataset.case = cfg.caseId;
      btn.style.setProperty('--b1', cfg.b1);
      btn.style.setProperty('--b2', cfg.b2);
      btn.innerHTML =
        '<div class="box-3d"><div class="box-lid"></div><div class="box-body"></div><div class="box-mk"></div></div>' +
        '<div class="box-name">' +
        cfg.name +
        '</div>' +
        '<div class="box-odds">' +
        cfg.odds +
        '</div>' +
        '<div class="box-price" data-price-for="' +
        cfg.caseId +
        '">' +
        formatCoinPrice(cfg.caseId) +
        '</div>';
      if (cfg.caseId === 'legend' && isLegendSoldOut()) btn.classList.add('sold-out');
      btn.addEventListener('click', function () {
        if (btn.classList.contains('sold-out') || global.busy) return;
        global.selectedCaseType = cfg.caseId;
        document.querySelectorAll('#pxSkyOpenBoxes .px-sky-box-card').forEach(function (c) {
          c.classList.toggle('active', c.dataset.case === cfg.caseId);
        });
        if (typeof global.updateOpenButtonPrice === 'function') global.updateOpenButtonPrice();
        openRitual(cfg);
      });
      grid.appendChild(btn);
    });
  }

  function refreshBoxPrices() {
    document.querySelectorAll('#pxSkyOpenBoxes [data-price-for]').forEach(function (el) {
      el.innerHTML = formatCoinPrice(el.getAttribute('data-price-for'));
    });
    document.querySelectorAll('#pxSkyOpenBoxes .px-sky-box-card').forEach(function (btn) {
      if (btn.dataset.case === 'legend') {
        btn.classList.toggle('sold-out', isLegendSoldOut());
      }
    });
  }

  function onBigBoxTap() {
    if (_opening || global.busy || !isSkyOpen()) return;
    _opening = true;
    var big = $('pxSkyBigBox');
    if (big) big.classList.add('opening');
    setTimeout(function () {
      if (typeof global.runCaseOpen === 'function') {
        global
          .runCaseOpen({ caseType: global.selectedCaseType || curBox.caseId, dopamine: false })
          .then(function (ok) {
            if (!ok) {
              _opening = false;
              if (big) big.classList.remove('opening');
            }
          });
      }
    }, 650);
  }

  function runSkyGeneration(winTier) {
    ensureRitual();
    $('pxSkyRitual').classList.add('show');
    $('pxSkyStageBox').classList.remove('is-active');
    $('pxSkyStageResult').classList.remove('is-active');
    var genStage = $('pxSkyStageGen');
    var frame = $('pxSkyGenFrame');
    var reveal = $('pxSkyGenReveal');
    if (genStage) genStage.classList.add('is-active');
    if (reveal && winTier) {
      reveal.innerHTML = renderFrogForTier(winTier);
    }
    if (frame) {
      frame.classList.remove('run');
      void frame.offsetWidth;
      frame.classList.add('run');
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () {
      if (frame) frame.classList.remove('run');
      landSkyRitual(winTier);
    }, reduce ? 80 : GEN_MS);
  }

  function landSkyRitual(tier) {
    var t = tier || global.pendingSpinTier || (global.TIERS && global.TIERS[0]);
    var landedSerial = global.currentSerial || (typeof global.genSerial === 'function' ? global.genSerial() : '');
    global.currentSerial = landedSerial;
    if (typeof global.playDrop === 'function') global.playDrop(t.id);
    if (global.PoxyPlayerOB && typeof global.PoxyPlayerOB.handleCaseLand === 'function') {
      global.PoxyPlayerOB.handleCaseLand(t, landedSerial, global.currentPoxyId)
        .then(function (handled) {
          if (!handled) showSkyResult(t, landedSerial);
        })
        .catch(function () {
          showSkyResult(t, landedSerial);
        });
    } else {
      showSkyResult(t, landedSerial);
    }
    if (global.currentPoxyId && typeof global.syncDropToCollectionUI === 'function') {
      global.syncDropToCollectionUI({ toast: false }).catch(function () {});
    }
  }

  function showSkyResult(tier, serial) {
    global.currentTier = tier;
    global.currentSerial = serial;
    $('pxSkyStageGen').classList.remove('is-active');
    $('pxSkyStageResult').classList.add('is-active');
    var fig = $('pxSkyResultFig');
    var name = $('pxSkyResultName');
    var rar = $('pxSkyResultRar');
    var frame = $('pxSkyResultFrame');
    var rc = tierRarColor(tier);
    if (frame) frame.style.setProperty('--mr', rc);
    if (fig) {
      fig.innerHTML = renderFrogForTier(tier);
    }
    if (name) {
      name.textContent = ritualFigureName(tier);
    }
    if (rar) {
      rar.textContent = tier.label || 'POXY';
      rar.style.color = rc;
    }
    if (typeof global.triggerRevealFX === 'function') global.triggerRevealFX(tier.id);
    if (typeof global.setBodyBg === 'function') global.setBodyBg(tier.id);
    _opening = false;
  }

  function onKeep() {
    var btn = $('pxSkyRitualKeep');
    if (typeof global.addCurrentDropToCollection === 'function') {
      global.addCurrentDropToCollection(btn);
    }
    closeRitual();
  }

  function onSellForCoins() {
    if (!global.currentTier || !global.currentSerial) return;
    global.pendingListItem = {
      tier: global.currentTier,
      serial: global.currentSerial,
      fromHunt: true,
    };
    closeRitual();
    if (typeof global.openPriceModal === 'function') global.openPriceModal();
  }

  function onOpenAnother() {
    closeRitual();
    if (typeof global.resetAll === 'function') global.resetAll();
    refreshBoxPrices();
  }

  function wrapRoulette() {
    if (wrapRoulette.done || typeof global.runRouletteCarousel !== 'function') return;
    var orig = global.runRouletteCarousel;
    global.runRouletteCarousel = function (winTier) {
      if (isSkyOpen()) {
        runSkyGeneration(winTier);
        return;
      }
      orig(winTier);
    };
    wrapRoulette.done = true;
  }

  function wrapWinReveal() {
    if (wrapWinReveal.done || typeof global.openWinRevealModal !== 'function') return;
    var orig = global.openWinRevealModal;
    global.openWinRevealModal = function (tier, forcedSerial) {
      if (isSkyOpen()) {
        $('pxSkyRitual') && $('pxSkyRitual').classList.add('show');
        showSkyResult(tier, forcedSerial || global.currentSerial);
        return;
      }
      orig(tier, forcedSerial);
    };
    wrapWinReveal.done = true;
  }

  function wrapResetAll() {
    if (wrapResetAll.done || typeof global.resetAll !== 'function') return;
    var orig = global.resetAll;
    global.resetAll = function () {
      orig();
      if (isSkyOpen()) {
        closeRitual();
        refreshBoxPrices();
      }
    };
    wrapResetAll.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    ensureRitual();
    ensureBoxGrid();
    refreshBoxPrices();
    wrapRoulette();
    wrapWinReveal();
    wrapResetAll();
    document.querySelectorAll('#pxSkyOpenBoxes .px-sky-box-card').forEach(function (c) {
      c.classList.toggle('active', c.dataset.case === (global.selectedCaseType || 'standard'));
    });
  }

  global.PoxyOpenSky = {
    onShow: onShow,
    openRitual: openRitual,
    closeRitual: closeRitual,
    refreshBoxPrices: refreshBoxPrices,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wrapRoulette();
      wrapWinReveal();
      wrapResetAll();
    });
  } else {
    wrapRoulette();
    wrapWinReveal();
    wrapResetAll();
  }
})(window);
