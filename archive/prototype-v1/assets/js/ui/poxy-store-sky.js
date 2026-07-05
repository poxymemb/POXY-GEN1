/**

 * POXY Sky Store screen (Stage 8).

 */

(function (global) {

  'use strict';



  var COIN_SVG =

    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxStoreCoinGrad)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxStoreCoinGrad" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';



  var CAT_CHIPS = [
    { id: 'themes', label: 'Banners' },
    { id: 'gradients', label: 'Effects' },
    { id: 'boosters', label: 'Boosters', stub: true },
    { id: 'bundles', label: 'Bundles', stub: true },
    { id: 'xpshop', label: 'XP Shop' },
    { id: 'poxypass', label: 'POXY Pass' },
    { id: 'vip', label: 'Membership' },
  ];

  var SKY_SECTION_TITLES = {
    themes: 'Banners',
    gradients: 'Effects',
    xpshop: 'XP Shop',
    poxypass: 'POXY Pass',
    vip: 'Membership perks',
    boosters: 'Boosters',
    bundles: 'Bundles',
  };

  var STUB_CATS = { boosters: 1, bundles: 1 };



  var _storeCat = 'themes';
  var _afterStoreLock = false;

  function getStoreCat() {
    var active = document.querySelector('#storePage .poxy-store-nav-btn.active');
    if (active && active.dataset.storeCat) return active.dataset.storeCat;
    return _storeCat;
  }

  function $(id) {

    return document.getElementById(id);

  }



  function isSkyStoreVisible() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      $('stPanelStore') &&
      !$('stPanelStore').hidden
    );
  }

  function prepStorePanel() {
    if (typeof global.mountSpaPanels === 'function') global.mountSpaPanels();
    if (typeof global.showHuntPageShell === 'function') global.showHuntPageShell();
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }



  function ensurePageHead() {

    if (!global.PoxyScreensSky) return;

    global.PoxyScreensSky.ensureHead('store');

    var head = document.querySelector('#storePage .px-sky-page-head');

    if (head) {

      var p = head.querySelector('p');

      if (p) {

        p.textContent =

          'Subscriptions, banners, music, and effects. Pay with coins or money.';

      }

    }

  }



  function ensureMembership() {

    var main = document.querySelector('#storePage .poxy-store-main');

    if (!main || $('pxSkyStoreMembership')) return;

    var block = document.createElement('div');

    block.id = 'pxSkyStoreMembership';

    block.className = 'px-sky-store-membership';

    block.innerHTML =

      '<div class="panel-h">Membership</div>' +

      '<div class="plans">' +

      '<div class="plan">' +

      '<div class="plan-name">Free</div>' +

      '<span class="plan-price">£0<span class="plan-per">forever</span></span>' +

      '<ul class="plan-feats">' +

      '<li>Standard banner colours</li>' +

      '<li>Basic profile</li>' +

      '<li>Open boxes & trade</li>' +

      '</ul>' +

      '<button type="button" class="btn btn-glass px-sky-plan-free" style="width:100%;justify-content:center" disabled>Current plan</button>' +

      '</div>' +

      '<div class="plan featured">' +

      '<span class="plan-badge">Best value</span>' +

      '<div class="plan-name">POXY Plus</div>' +

      '<span class="plan-price">£4.99<span class="plan-per">/month</span></span>' +

      '<ul class="plan-feats">' +

      '<li>Full profile customization</li>' +

      '<li>Animated avatar & banner</li>' +

      '<li>Profile background music</li>' +

      '<li>Plus badge</li>' +

      '<li>Monthly coin bonus</li>' +

      '</ul>' +

      '<button type="button" class="btn btn-primary px-sky-plan-plus" style="width:100%;justify-content:center">Get POXY Plus</button>' +

      '</div>' +

      '</div>';

    block.querySelector('.px-sky-plan-plus').addEventListener('click', function () {

      if (typeof global.switchStoreCategory === 'function') {

        global.switchStoreCategory('vip');

      }

    });

    main.insertBefore(block, main.firstChild);

  }



  function ensureToolbar() {

    var main = document.querySelector('#storePage .poxy-store-main');

    if (!main || $('pxSkyStoreToolbar')) return;

    var toolbar = document.createElement('div');

    toolbar.id = 'pxSkyStoreToolbar';

    toolbar.className = 'px-sky-store-toolbar';

    var chips = document.createElement('div');

    chips.id = 'pxSkyStoreCatChips';

    CAT_CHIPS.forEach(function (chip) {

      var btn = document.createElement('button');

      btn.type = 'button';

      btn.className = 'px-sky-store-chip chip-filter';

      btn.dataset.cat = chip.id;

      btn.textContent = chip.label;
      if (chip.stub || STUB_CATS[chip.id]) {
        btn.disabled = true;
        btn.title = 'Coming soon';
      }
      btn.addEventListener('click', function () {
        if (chip.stub || STUB_CATS[chip.id]) {
          if (typeof global.showToast === 'function') {
            global.showToast('This category opens in a future update.');
          }
          return;
        }
        if (typeof global.switchStoreCategory === 'function') {
          global.switchStoreCategory(chip.id);
        }
      });

      chips.appendChild(btn);

    });

    var wallet = document.createElement('div');

    wallet.id = 'pxSkyStoreWallet';

    wallet.innerHTML =

      '<span id="pxSkyStoreBal">' + COIN_SVG + '0</span>' +

      '<button type="button" class="px-sky-store-fund">Add funds</button>';

    wallet.querySelector('.px-sky-store-fund').addEventListener('click', function () {

      if (typeof global.openTopUpModal === 'function') global.openTopUpModal();

    });

    toolbar.appendChild(chips);

    toolbar.appendChild(wallet);

    var gridSection = document.querySelector('#storePage .poxy-store-main > section:last-of-type');

    if (gridSection) main.insertBefore(toolbar, gridSection);

    else main.appendChild(toolbar);

  }



  function ensureSectionTitle() {

    var section = document.querySelector('#storePage .poxy-store-main > section:last-child');

    if (!section || $('pxSkyStoreSectionTitle')) return;

    var title = document.createElement('div');

    title.id = 'pxSkyStoreSectionTitle';

    title.className = 'panel-h';

    title.textContent = ($('storeGridTitle') && $('storeGridTitle').textContent) || 'Store';

    section.insertBefore(title, section.firstChild);

  }



  function syncCatChips() {

    var cat = getStoreCat();

    document.querySelectorAll('#pxSkyStoreCatChips .px-sky-store-chip').forEach(function (btn) {

      btn.classList.toggle('on', btn.dataset.cat === cat);

    });

    var title = $('pxSkyStoreSectionTitle');
    var gridTitle = $('storeGridTitle');
    if (title) {
      title.textContent = SKY_SECTION_TITLES[cat] || (gridTitle && gridTitle.textContent) || 'Store';
    }

    var plusBtn = document.querySelector('.px-sky-plan-plus');

    var freeBtn = document.querySelector('.px-sky-plan-free');

    if (plusBtn && typeof global.loadVipStatus === 'function') {

      global.loadVipStatus().then(function (st) {

        var vipActive = st && st.ok && st.active;

        plusBtn.disabled = !!vipActive;

        plusBtn.textContent = vipActive ? 'Current plan' : 'Get POXY Plus';

        if (freeBtn) freeBtn.disabled = !vipActive;

      }).catch(function () {});

    }

  }



  function formatCoinAmount(n) {

    return COIN_SVG + Number(n || 0).toLocaleString();

  }



  function syncWallet() {

    var el = $('pxSkyStoreBal');

    var bal = $('storeBalanceDisplay');

    if (!el || !isSkyStoreVisible()) return;

    var cat = getStoreCat();

    if (bal && (cat === 'xpshop' || cat === 'poxypass' || cat === 'vip')) {

      el.innerHTML = bal.innerHTML;

      return;

    }

    if (bal) {

      var n = (bal.textContent || '').replace(/\s*PX\s*$/i, '').trim();

      el.innerHTML = formatCoinAmount(n);

      return;

    }

    if (typeof global.getPxBalance === 'function') {

      el.innerHTML = formatCoinAmount(global.getPxBalance());

    }

  }



  function skyStoreAccent(bg) {
    if (!bg) return '#60C2E0';
    var s = String(bg);
    if (s.charAt(0) === '#') return s.split(' ')[0];
    var hex = s.match(/#[0-9a-fA-F]{3,8}/);
    if (hex) return hex[0];
    var rgb = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
      return (
        '#' +
        [rgb[1], rgb[2], rgb[3]]
          .map(function (n) {
            return ('0' + parseInt(n, 10).toString(16)).slice(-2);
          })
          .join('')
      );
    }
    return '#60C2E0';
  }

  function polishThemeCards() {

    if (!isSkyStoreVisible()) return;

    document.querySelectorAll('#storeGrid .poxy-store-card').forEach(function (card) {

      var nameEl = card.querySelector('h4');

      var foot = card.querySelector('.poxy-store-card-foot');

      var visual = card.querySelector('.poxy-store-card-visual');

      if (nameEl && foot) {

        foot.setAttribute('data-sky-name', nameEl.textContent || '');

      }

      if (visual) {
        var bg = visual.style.background || visual.style.backgroundColor || '';
        visual.style.setProperty('--sc', skyStoreAccent(bg));
        visual.classList.add('px-sky-store-vis');
      }

      var price = card.querySelector('.poxy-store-card-price');

      if (price && !price.classList.contains('muted')) {

        var amount = (price.textContent || '').replace(/\s*PX\s*$/i, '').trim();

        var btn = card.querySelector('.poxy-store-card-acquire');

        if (btn && amount && !btn.dataset.skyStoreCoin) {
          btn.dataset.skyStoreCoin = '1';
          btn.classList.add('px-sky-store-buy');

          btn.innerHTML = formatCoinAmount(amount);
        }

      }

    });

  }



  function relabelPassVipPrices() {

    if (!isSkyStoreVisible()) return;

    document.querySelectorAll('#storeGrid .poxy-pass-buy, #storeGrid .poxy-vip-btn').forEach(function (btn) {
      if (btn.dataset.skyStoreLabel) return;
      var text = btn.textContent || '';
      if (/\d+\s*PX/i.test(text)) {
        btn.dataset.skyStoreLabel = '1';
        btn.innerHTML = text.replace(/(\d[\d,]*)\s*PX/gi, function (_m, n) {
          return COIN_SVG + n;
        });
      }
    });

  }



  function afterStoreRender() {
    if (_afterStoreLock) return;
    _afterStoreLock = true;
    try {
      ensureSectionTitle();
      syncCatChips();
      syncWallet();
      polishThemeCards();
      relabelPassVipPrices();
    } finally {
      _afterStoreLock = false;
    }
  }



  function wrapRenderStoreGrid() {

    if (wrapRenderStoreGrid.done || typeof global.renderStoreGrid !== 'function') return;

    var orig = global.renderStoreGrid;

    global.renderStoreGrid = function () {

      orig();

      afterStoreRender();

    };

    wrapRenderStoreGrid.done = true;

  }



  function wrapRenderStorePage() {

    if (wrapRenderStorePage.done || typeof global.renderStorePage !== 'function') return;

    var orig = global.renderStorePage;

    global.renderStorePage = function () {

      orig();

      afterStoreRender();

    };

    wrapRenderStorePage.done = true;

  }



  function wrapSwitchStoreCategory() {

    if (wrapSwitchStoreCategory.done || typeof global.switchStoreCategory !== 'function') return;

    var orig = global.switchStoreCategory;

    global.switchStoreCategory = function (cat) {

      _storeCat = cat || 'themes';

      orig(cat);

      afterStoreRender();

    };

    wrapSwitchStoreCategory.done = true;

  }



  function wrapRenderStoreTerminal() {

    if (wrapRenderStoreTerminal.done || typeof global.renderStoreTerminal !== 'function') return;

    var orig = global.renderStoreTerminal;

    global.renderStoreTerminal = function () {

      orig();

      syncWallet();

    };

    wrapRenderStoreTerminal.done = true;

  }



  function observeStoreGrid() {

    if (observeStoreGrid.done) return;

    var grid = $('storeGrid');

    if (!grid) return;

    new MutationObserver(function () {
      if (isSkyStoreVisible()) afterStoreRender();
    }).observe(grid, { childList: true, subtree: false });

    observeStoreGrid.done = true;

  }



  function wrapPurchaseCustomization() {
    if (wrapPurchaseCustomization.done || typeof global.purchaseCustomization !== 'function') return;
    var orig = global.purchaseCustomization;
    global.purchaseCustomization = async function () {
      await orig.apply(this, arguments);
      syncWallet();
      afterStoreRender();
    };
    wrapPurchaseCustomization.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    prepStorePanel();
    ensurePageHead();

    ensureMembership();

    ensureToolbar();

    observeStoreGrid();

    wrapRenderStoreGrid();

    wrapRenderStorePage();

    wrapSwitchStoreCategory();

    wrapRenderStoreTerminal();
    wrapPurchaseCustomization();

    if (typeof global.renderStorePage === 'function') global.renderStorePage();

    else afterStoreRender();

  }



  global.PoxyStoreSky = {

    onShow: onShow,

    syncWallet: syncWallet,

    polishThemeCards: polishThemeCards,

  };



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', function () {

      wrapRenderStoreGrid();

      wrapRenderStorePage();

      wrapSwitchStoreCategory();

      wrapRenderStoreTerminal();
      wrapPurchaseCustomization();
    });
  } else {
    wrapRenderStoreGrid();
    wrapRenderStorePage();
    wrapSwitchStoreCategory();
    wrapRenderStoreTerminal();
    wrapPurchaseCustomization();
  }

})(window);

