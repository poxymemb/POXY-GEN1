/* POXY GENS — cinematic scroll engine (vanilla framer-motion equivalent) */
(function () {
  'use strict';

  var _inited = false;
  var _timerIv = null;
  var _countdownEnd = null;
  var _scrollFns = [];
  var _scrollHandler = null;

  function addScrollFn(fn) {
    if (_scrollFns.indexOf(fn) === -1) _scrollFns.push(fn);
    if (!_scrollHandler) {
      _scrollHandler = function () {
        _scrollFns.forEach(function (f) { f(); });
      };
      window.addEventListener('scroll', _scrollHandler, { passive: true });
    }
    fn();
  }

  function clearScrollFns() {
    _scrollFns = [];
    if (_scrollHandler) {
      window.removeEventListener('scroll', _scrollHandler, { passive: true });
      _scrollHandler = null;
    }
  }
  var _tiltHero = null;
  var _tiltMove = null;
  var _tiltLeave = null;
  var _uplinkGlitchFired = false;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function triggerGlitch(timer) {
    if (!timer) return;
    timer.classList.remove('is-glitch');
    void timer.offsetWidth;
    timer.classList.add('is-glitch');
    setTimeout(function () { timer.classList.remove('is-glitch'); }, 580);
  }

  function observeStages(panel) {
    if (!window.IntersectionObserver) {
      qsa('.gens-stage', panel).forEach(function (el) { el.classList.add('is-visible'); });
      qsa('.poxy-gens-model', panel).forEach(function (el) { el.classList.add('is-emerged'); });
      qsa('.poxy-gens-arch-card', panel).forEach(function (el) { el.classList.add('is-revealed'); });
      var hero = qs('.poxy-gens-hero', panel);
      if (hero) hero.classList.add('is-live');
      return;
    }

    var stageObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        stageObs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    qsa('.gens-stage', panel).forEach(function (el) { stageObs.observe(el); });

    var heroObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var hero = e.target;
        hero.classList.add('is-live');
        qsa('.poxy-gens-model', hero).forEach(function (m, i) {
          setTimeout(function () { m.classList.add('is-emerged'); }, i * 100);
        });
        heroObs.unobserve(hero);
      });
    }, { threshold: 0.15 });
    var hero = qs('.poxy-gens-hero', panel);
    if (hero) {
      heroObs.observe(hero);
      /* Hero is above fold — also fire on init after paint */
      requestAnimationFrame(function () {
        var rect = hero.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
          hero.classList.add('is-live');
          qsa('.poxy-gens-model', hero).forEach(function (m, i) {
            setTimeout(function () { m.classList.add('is-emerged'); }, 80 + i * 100);
          });
        }
      });
    }

    /* Archive: whileInView amount 0.3 — fade + slide up y:40 */
    var archObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.intersectionRatio < 0.3) return;
        qsa('.poxy-gens-arch-card', e.target).forEach(function (c, i) {
          setTimeout(function () { c.classList.add('is-revealed'); }, i * 250);
        });
        archObs.unobserve(e.target);
      });
    }, { threshold: [0, 0.3, 0.5] });
    var arch = qs('.poxy-gens-archive', panel);
    if (arch) archObs.observe(arch);

    /* Uplink focus at 30% visible */
    var uplinkObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.intersectionRatio < 0.3) return;
        e.target.classList.add('is-focused');
        uplinkObs.unobserve(e.target);
      });
    }, { threshold: [0, 0.3] });
    var uplink = qs('.poxy-gens-uplink', panel);
    if (uplink) uplinkObs.observe(uplink);
  }

  function bindUplinkGlitchScroll(panel) {
    var uplink = qs('.poxy-gens-uplink', panel);
    var timer = qs('.poxy-gens-timer', panel);
    if (!uplink || !timer || reducedMotion()) return;

    function checkGlitch() {
      if (_uplinkGlitchFired || panel.hidden) return;
      var rect = uplink.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.top <= vh * 0.4 && rect.bottom > vh * 0.15) {
        _uplinkGlitchFired = true;
        uplink.classList.add('is-focused');
        triggerGlitch(timer);
      }
    }

    addScrollFn(checkGlitch);
  }

  function bindParallax(panel) {
    var voidEl = qs('.poxy-gens-hero__void', panel);
    var hero = qs('.poxy-gens-hero', panel);
    var models = qsa('.poxy-gens-model', panel);
    if (!voidEl || reducedMotion()) return;

    var parallaxFn = function () {
      if (!panel || panel.hidden) return;
      var rect = panel.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      var y = (progress - 0.5) * 64;
      var scale = 1 + progress * 0.06;
      voidEl.style.transform = 'translate3d(0,' + y + 'px,0) scale(' + scale + ')';

      if (hero) {
        var heroRect = hero.getBoundingClientRect();
        var heroProg = Math.max(0, Math.min(1, 1 - heroRect.top / window.innerHeight));
        models.forEach(function (m, i) {
          var depth = 16 + i * 22;
          m.style.setProperty('--gens-model-parallax', (heroProg * depth) + 'px');
        });
      }
    };

    addScrollFn(parallaxFn);
  }

  function bindHeroTilt(panel) {
    var hero = qs('[data-gens-tilt]', panel);
    if (!hero || reducedMotion()) return;

    if (_tiltHero && _tiltMove) {
      _tiltHero.removeEventListener('mousemove', _tiltMove);
      _tiltHero.removeEventListener('mouseleave', _tiltLeave);
    }

    _tiltHero = hero;
    _tiltMove = function (e) {
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--gens-tilt-x', (y * -3.5) + 'deg');
      hero.style.setProperty('--gens-tilt-y', (x * 3.5) + 'deg');
    };
    _tiltLeave = function () {
      hero.style.setProperty('--gens-tilt-x', '0deg');
      hero.style.setProperty('--gens-tilt-y', '0deg');
    };
    hero.addEventListener('mousemove', _tiltMove);
    hero.addEventListener('mouseleave', _tiltLeave);
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
    _uplinkGlitchFired = false;
    qsa('.gens-stage', panel).forEach(function (el) { el.classList.remove('is-visible'); });
    qsa('.gens-reveal-left', panel).forEach(function (el) { /* reset via hero.is-live */ });
    qsa('.poxy-gens-model', panel).forEach(function (el) { el.classList.remove('is-emerged'); });
    qsa('.poxy-gens-arch-card', panel).forEach(function (el) { el.classList.remove('is-revealed'); });
    var hero = qs('.poxy-gens-hero', panel);
    if (hero) {
      hero.classList.remove('is-live');
      hero.style.removeProperty('--gens-tilt-x');
      hero.style.removeProperty('--gens-tilt-y');
    }
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

    clearScrollFns();

    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resetMotion(panel);
        observeStages(panel);
        bindParallax(panel);
        bindUplinkGlitchScroll(panel);
        bindHeroTilt(panel);
        startCountdown(panel);
      });
    });
  }

  function teardownGensPage() {
    if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
    clearScrollFns();
    if (_tiltHero && _tiltMove) {
      _tiltHero.removeEventListener('mousemove', _tiltMove);
      _tiltHero.removeEventListener('mouseleave', _tiltLeave);
      _tiltHero = null;
      _tiltMove = null;
      _tiltLeave = null;
    }
    _uplinkGlitchFired = false;
  }

  window.initGensPage = initGensPage;
  window.teardownGensPage = teardownGensPage;
})();
