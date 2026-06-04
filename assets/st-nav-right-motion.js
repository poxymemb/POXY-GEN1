/**
 * POXY — header right cluster: tactile press state (springs via CSS in stitch-dashboard.css)
 */
(function (global) {
  'use strict';

  function bindPress(el) {
    if (!el || el.dataset.springBound === '1') return;
    el.dataset.springBound = '1';

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      el.classList.add('is-spring-pressed');
    });
    function clearPress() {
      el.classList.remove('is-spring-pressed');
    }
    el.addEventListener('pointerup', clearPress);
    el.addEventListener('pointerleave', clearPress);
    el.addEventListener('pointercancel', clearPress);
  }

  function init() {
    document.querySelectorAll('.st-spring-interactive').forEach(bindPress);
  }

  global.initStNavRightMotion = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
