/**
 * POXY Sky top-up modal — relabel legacy Treasury UI without touching payment hooks.
 */
(function (global) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function isSky() {
    return document.body.classList.contains('poxy-sky-app-active');
  }

  function ensureSkyHead() {
    var right = document.querySelector('#topUpModal .tum-right');
    if (!right || right.querySelector('.px-sky-topup-head')) return;
    var head = document.createElement('div');
    head.className = 'px-sky-topup-head';
    head.innerHTML =
      '<h2>Top up coins</h2>' +
      '<p class="px-sky-topup-bal">Balance: <strong id="pxSkyTopupBal">0</strong></p>';
    right.insertBefore(head, right.firstChild);
  }

  function syncSkyBalance() {
    var pxBal = typeof global.getPxBalance === 'function' ? global.getPxBalance() : 0;
    var bal = $('pxSkyTopupBal');
    if (bal) {
      bal.textContent =
        typeof global.formatCoinBalance === 'function'
          ? global.formatCoinBalance(pxBal)
          : String(pxBal);
    }
  }

  function applySkyTopupLabels() {
    if (!isSky()) return;
    ensureSkyHead();
    syncSkyBalance();

    var title = document.querySelector('#topUpModal .tum-title');
    if (title) title.textContent = 'Coins';

    var eyebrow = document.querySelector('#topUpModal .tum-eyebrow');
    if (eyebrow) eyebrow.textContent = 'POXY WORLD';

    document.querySelectorAll('#topUpModal .tum-section-label').forEach(function (el) {
      var t = (el.textContent || '').trim().toUpperCase();
      if (t === 'PX PACKAGES') el.textContent = 'Coin packs';
      if (t === 'CUSTOM GBP') el.textContent = 'Custom amount';
      if (t === 'PAYMENT METHOD') el.textContent = 'Payment method';
    });

    document.querySelectorAll('#topUpModal .tum-field-label').forEach(function (el) {
      var t = (el.textContent || '').trim().toUpperCase();
      if (t === 'CARD NUMBER') el.textContent = 'Card number';
      if (t === 'EXPIRY') el.textContent = 'Expiry';
      if (t === 'CVV') el.textContent = 'CVV';
    });

    var pathA = document.querySelector('#topUpModal .tum-path-a');
    if (pathA && pathA.textContent.indexOf('Standard Case') !== -1) {
      pathA.innerHTML =
        '<span class="material-symbols-outlined">lock_open</span> Open 1 standard box — £2.50';
    }

    var cta = $('btnPayCard');
    if (cta && !cta.dataset.skyLabel) {
      cta.dataset.skyLabel = '1';
      cta.innerHTML = '<span class="material-symbols-outlined">lock</span> Pay with card';
    }

    var legal = document.querySelector('#topUpModal .tum-legal');
    if (legal) {
      legal.textContent =
        'Coins are added instantly in test mode. No real charges are made.';
    }

    var refEyebrow = document.querySelector('#topUpModal .tum-ref-eyebrow');
    if (refEyebrow) refEyebrow.textContent = 'Referral link';

    var refHint = $('tumRefHint');
    if (refHint && refHint.textContent.indexOf('REFERRAL') === -1) {
      refHint.textContent =
        'Friends get bonus coins and XP. You earn commission on their purchases.';
    }
  }

  function wrapOpenTopUpModal() {
    if (typeof global.openTopUpModal !== 'function' || global.openTopUpModal._pxSkyWrapped) return;
    var orig = global.openTopUpModal;
    global.openTopUpModal = function () {
      orig.apply(this, arguments);
      applySkyTopupLabels();
    };
    global.openTopUpModal._pxSkyWrapped = true;
  }

  function wrapRenderTopUpPaths() {
    if (typeof global.renderTopUpPaths !== 'function' || global.renderTopUpPaths._pxSkyWrapped) return;
    var orig = global.renderTopUpPaths;
    global.renderTopUpPaths = function () {
      orig.apply(this, arguments);
      applySkyTopupLabels();
    };
    global.renderTopUpPaths._pxSkyWrapped = true;
  }

  function init() {
    wrapOpenTopUpModal();
    wrapRenderTopUpPaths();
  }

  global.PoxyTopupSky = {
    apply: applySkyTopupLabels,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
