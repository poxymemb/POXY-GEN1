/* POXY GENS — kinetic scroll engine (vanilla equivalent of framer-motion onScroll) */
(function () {
  'use strict';

  var _inited = false;
  var _timerIv = null;
  var _countdownEnd = null;
  var _scrollHandler = null;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function observeStages(panel) {
    if (!window.IntersectionObserver) {
      qsa('.gens-stage', panel).forEach(function (el) { el.classList.add('is-visible'); });
      qsa('.poxy-gens-model', panel).forEach(function (el) { el.classList.add('is-emerged'); });
      qsa('.poxy-gens-arch-card', panel).forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    var stageObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        stageObs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    qsa('.gens-stage', panel).forEach(function (el) { stageObs.observe(el); });

    var heroObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        qsa('.poxy-gens-model', e.target).forEach(function (m, i) {
          setTimeout(function () { m.classList.add('is-emerged'); }, i * 120);
        });
        heroObs.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    var hero = qs('.poxy-gens-hero', panel);
    if (hero) heroObs.observe(hero);

    var archObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        qsa('.poxy-gens-arch-card', e.target).forEach(function (c, i) {
          setTimeout(function () { c.classList.add('is-revealed'); }, i * 250);
        });
        archObs.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    var arch = qs('.poxy-gens-archive', panel);
    if (arch) archObs.observe(arch);

    var uplinkObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-focused');
        var timer = qs('.poxy-gens-timer', e.target);
        if (timer) {
          timer.classList.add('is-glitch');
          setTimeout(function () { timer.classList.remove('is-glitch'); }, 560);
        }
        uplinkObs.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    var uplink = qs('.poxy-gens-uplink', panel);
    if (uplink) uplinkObs.observe(uplink);
  }

  function bindParallax(panel) {
    var voidEl = qs('.poxy-gens-hero__void', panel);
    var hero = qs('.poxy-gens-hero', panel);
    var models = qsa('.poxy-gens-model', panel);
    if (!voidEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (_scrollHandler) window.removeEventListener('scroll', _scrollHandler, { passive: true });

    _scrollHandler = function () {
      if (!panel || panel.hidden) return;
      var rect = panel.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      var y = (progress - 0.5) * 48;
      var scale = 1 + progress * 0.04;
      voidEl.style.transform = 'translate3d(0,' + y + 'px,0) scale(' + scale + ')';

      if (hero) {
        var heroRect = hero.getBoundingClientRect();
        var heroProg = Math.max(0, Math.min(1, 1 - heroRect.top / window.innerHeight));
        models.forEach(function (m, i) {
          var depth = 12 + i * 18;
          var py = heroProg * depth;
          m.style.setProperty('--gens-model-parallax', py + 'px');
        });
      }
    };
    window.addEventListener('scroll', _scrollHandler, { passive: true });
    _scrollHandler();
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function renderCountdown(panel) {
    var timer = qs('.poxy-gens-timer', panel);
    if (!timer || !_countdownEnd) return;
    var diff = Math.max(0, _countdownEnd - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    timer.innerHTML =
      pad2(h) + '<span class="poxy-gens-timer__sep">:</span>' +
      pad2(m) + '<span class="poxy-gens-timer__sep">:</span>' +
      pad2(s);
  }

  function startCountdown(panel) {
    if (_timerIv) clearInterval(_timerIv);
    /* GEN 3 uplink — static target from Stitch mock; refresh on each visit */
    _countdownEnd = Date.now() + (23 * 3600 + 14 * 60 + 5) * 1000;
    renderCountdown(panel);
    _timerIv = setInterval(function () { renderCountdown(panel); }, 1000);
  }

  function bindActions(panel) {
    var terminal = qs('.poxy-gens-btn-terminal', panel);
    if (terminal) {
      terminal.addEventListener('click', function () {
        if (typeof window.showStitchTab === 'function') window.showStitchTab('dashboard');
        else if (typeof window.showToast === 'function') window.showToast('Opening terminal…');
      });
    }
    var notify = qs('.poxy-gens-btn-notify', panel);
    if (notify) {
      notify.addEventListener('click', function () {
        if (typeof window.showToast === 'function') window.showToast('Transmission layer watch registered.');
      });
    }
  }

  function resetMotion(panel) {
    qsa('.gens-stage', panel).forEach(function (el) { el.classList.remove('is-visible'); });
    qsa('.poxy-gens-model', panel).forEach(function (el) { el.classList.remove('is-emerged'); });
    qsa('.poxy-gens-arch-card', panel).forEach(function (el) { el.classList.remove('is-revealed'); });
    var uplink = qs('.poxy-gens-uplink', panel);
    if (uplink) uplink.classList.remove('is-focused');
    var voidEl = qs('.poxy-gens-hero__void', panel);
    if (voidEl) voidEl.style.transform = '';
    qsa('.poxy-gens-model', panel).forEach(function (m) {
      m.style.removeProperty('--gens-model-parallax');
    });
  }

  function initGensPage() {
    var panel = document.getElementById('stPanelGens');
    if (!panel) return;

    if (!_inited) {
      _inited = true;
      bindActions(panel);
    }

    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resetMotion(panel);
        observeStages(panel);
        bindParallax(panel);
        startCountdown(panel);
      });
    });
  }

  function teardownGensPage() {
    if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
    if (_scrollHandler) {
      window.removeEventListener('scroll', _scrollHandler, { passive: true });
      _scrollHandler = null;
    }
  }

  window.initGensPage = initGensPage;
  window.teardownGensPage = teardownGensPage;
})();
