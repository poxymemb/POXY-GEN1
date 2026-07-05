/* POXY GENS — advanced kinetic controller (vanilla useSpring / useScroll / useTransform) */
(function () {
  'use strict';

  var STIFFNESS = 120;
  var DAMPING = 20;
  var TILT_MAX = 5;
  var MODEL_TRACKS = { core: -120, chassis: -72, optics: -36 };

  var _inited = false;
  var _panel = null;
  var _timerIv = null;
  var _countdownEnd = null;
  var _scrollFns = [];
  var _scrollHandler = null;
  var _rafId = null;
  var _lastTs = 0;

  var _tiltHero = null;
  var _tiltWrap = null;
  var _cursorGlow = null;
  var _tiltMove = null;
  var _tiltLeave = null;

  var _springRotX = null;
  var _springRotY = null;
  var _springGlowX = null;
  var _springGlowY = null;

  var _uplinkGlitchFired = false;
  var _uplinkSectorActive = false;

  /* ── Spring (framer useSpring equivalent) ── */
  function createSpring(stiffness, damping) {
    var value = 0;
    var velocity = 0;
    var target = 0;
    return {
      set: function (t) { target = t; },
      snap: function (t) { target = value = t; velocity = 0; },
      tick: function (dt) {
        var force = -stiffness * (value - target) - damping * velocity;
        velocity += force * dt;
        value += velocity * dt;
        return value;
      },
      get: function () { return value; }
    };
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  /* useScroll offset ["start start", "end end"] */
  function scrollProgress(el) {
    if (!el) return 0;
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    return clamp01((vh - rect.top) / (vh + rect.height));
  }

  /* useTransform helper */
  function useTransform(progress, input, output) {
    if (progress <= input[0]) return output[0];
    if (progress >= input[input.length - 1]) return output[output.length - 1];
    for (var i = 0; i < input.length - 1; i++) {
      if (progress >= input[i] && progress <= input[i + 1]) {
        var t = (progress - input[i]) / (input[i + 1] - input[i]);
        return lerp(output[i], output[i + 1], t);
      }
    }
    return output[output.length - 1];
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function addScrollFn(fn) {
    if (_scrollFns.indexOf(fn) === -1) _scrollFns.push(fn);
    if (!_scrollHandler) {
      _scrollHandler = function () { _scrollFns.forEach(function (f) { f(); }); };
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

  function stopRaf() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    _lastTs = 0;
  }

  function triggerGlitch(timer) {
    if (!timer) return;
    timer.classList.remove('is-glitch');
    void timer.offsetWidth;
    timer.classList.add('is-glitch');
    setTimeout(function () { timer.classList.remove('is-glitch'); }, 580);
  }

  /* ── Spring physics loop (useMotionValue + useSpring) ── */
  function startSpringLoop() {
    if (_rafId || reducedMotion()) return;

    function frame(ts) {
      if (!_panel || _panel.hidden) { stopRaf(); return; }

      var dt = _lastTs ? Math.min(0.05, (ts - _lastTs) / 1000) : 1 / 60;
      _lastTs = ts;

      if (_tiltWrap && _springRotX && _springRotY) {
        var rx = _springRotX.tick(dt);
        var ry = _springRotY.tick(dt);
        _tiltWrap.style.transform =
          'perspective(1400px) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)';
      }

      if (_cursorGlow && _springGlowX && _springGlowY) {
        var gx = _springGlowX.tick(dt);
        var gy = _springGlowY.tick(dt);
        _cursorGlow.style.background =
          'radial-gradient(circle at ' + gx.toFixed(1) + 'px ' + gy.toFixed(1) +
          'px, var(--accent-cursor-glow), transparent 60%)';
      }

      _rafId = requestAnimationFrame(frame);
    }

    _rafId = requestAnimationFrame(frame);
  }

  function bindHeroPointer(panel) {
    var hero = qs('[data-gens-scroll-root]', panel);
    _tiltHero = hero;
    _tiltWrap = qs('[data-gens-tilt]', panel);
    _cursorGlow = qs('[data-gens-cursor-glow]', panel);

    if (!hero || !_tiltWrap || reducedMotion()) return;

    if (_tiltMove) {
      hero.removeEventListener('mousemove', _tiltMove);
      hero.removeEventListener('mouseleave', _tiltLeave);
    }

    _springRotX = createSpring(STIFFNESS, DAMPING);
    _springRotY = createSpring(STIFFNESS, DAMPING);
    _springGlowX = createSpring(200, 26);
    _springGlowY = createSpring(200, 26);
    _springRotX.snap(0);
    _springRotY.snap(0);

    _tiltMove = function (e) {
      var rect = hero.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      _springRotY.set(nx * TILT_MAX);
      _springRotX.set(ny * -TILT_MAX);
      _springGlowX.set(e.clientX - rect.left);
      _springGlowY.set(e.clientY - rect.top);
      hero.classList.add('is-pointer-active');
      if (!_rafId) startSpringLoop();
    };

    _tiltLeave = function () {
      _springRotY.set(0);
      _springRotX.set(0);
      hero.classList.remove('is-pointer-active');
    };

    hero.addEventListener('mousemove', _tiltMove);
    hero.addEventListener('mouseleave', _tiltLeave);
    startSpringLoop();
  }

  /* ── useScroll + useTransform parallax ── */
  function bindScrollParallax(panel) {
    var heroRoot = qs('[data-gens-scroll-root]', panel);
    var voidEl = qs('.poxy-gens-hero__void', panel);
    var morphEls = qsa('[data-gens-scroll-morph]', panel);
    var models = qsa('.poxy-gens-model[data-gens-model]', panel);

    if (!heroRoot || reducedMotion()) return;

    function update() {
      if (!panel || panel.hidden) return;
      var p = scrollProgress(heroRoot);

      if (voidEl) {
        var voidScale = useTransform(p, [0, 0.5, 1], [1, 1.03, 1.05]);
        var voidOpacity = useTransform(p, [0, 0.6, 1], [0.55, 0.4, 0.2]);
        voidEl.style.setProperty('--gens-void-scale', voidScale);
        voidEl.style.setProperty('--gens-void-opacity', voidOpacity);
      }

      var morphScale = useTransform(p, [0, 0.45, 1], [1, 1.02, 1.05]);
      var morphOpacity = useTransform(p, [0, 0.5, 1], [1, 0.92, 0.65]);
      morphEls.forEach(function (el) {
        el.style.setProperty('--gens-morph-scale', morphScale);
        el.style.setProperty('--gens-morph-opacity', morphOpacity);
      });

      models.forEach(function (m) {
        var key = m.getAttribute('data-gens-model');
        var endY = MODEL_TRACKS[key] || -60;
        var y = useTransform(p, [0, 1], [0, endY]);
        var track = qs('.poxy-gens-model__track', m);
        if (track) track.style.setProperty('--gens-scroll-y', y + 'px');
      });
    }

    addScrollFn(update);
  }

  /* ── Archive scroll-linked blur / scale reveal ── */
  function bindArchiveScroll(panel) {
    var archive = qs('.poxy-gens-archive', panel);
    if (!archive || reducedMotion()) return;

    var cards = qsa('.poxy-gens-arch-card', archive);

    function archiveCenterProgress() {
      var rect = archive.getBoundingClientRect();
      var sectionCenter = rect.top + rect.height * 0.5;
      var viewCenter = window.innerHeight * 0.5;
      var dist = Math.abs(sectionCenter - viewCenter);
      var range = window.innerHeight * 0.55;
      return clamp01(1 - dist / range);
    }

    function update() {
      if (!panel || panel.hidden) return;
      var prog = archiveCenterProgress();

      cards.forEach(function (card, i) {
        var stagger = i * 0.08;
        var local = clamp01((prog - stagger) / (1 - stagger));
        var scale = lerp(0.9, 1, local);
        card.style.setProperty('--gens-arch-progress', local);
        card.style.setProperty('--gens-arch-scale', scale);
        card.style.setProperty('--gens-arch-opacity', local);
        if (local >= 0.98) card.classList.add('is-revealed');
      });
    }

    addScrollFn(update);
  }

  /* ── GEN 3 uplink sector + glitch ── */
  function bindUplinkSector(panel) {
    var uplink = qs('.poxy-gens-uplink', panel);
    var timer = qs('.poxy-gens-timer', panel);
    if (!uplink || !timer || reducedMotion()) return;

    function update() {
      if (!panel || panel.hidden) return;
      var rect = uplink.getBoundingClientRect();
      var vh = window.innerHeight;
      var inSector = rect.top <= vh * 0.55 && rect.bottom >= vh * 0.2;
      var atFocus = rect.top <= vh * 0.4 && rect.bottom > vh * 0.15;

      if (inSector && !_uplinkSectorActive) {
        _uplinkSectorActive = true;
        uplink.classList.add('is-focused');
      } else if (!inSector && _uplinkSectorActive) {
        _uplinkSectorActive = false;
      }

      if (atFocus && !_uplinkGlitchFired) {
        _uplinkGlitchFired = true;
        triggerGlitch(timer);
      }
    }

    addScrollFn(update);
  }

  function observeStages(panel) {
    if (!window.IntersectionObserver) {
      qsa('.gens-stage', panel).forEach(function (el) { el.classList.add('is-visible'); });
      qsa('.poxy-gens-model', panel).forEach(function (el) { el.classList.add('is-emerged'); });
      var hero = qs('[data-gens-scroll-root]', panel);
      if (hero) hero.classList.add('is-live');
      return;
    }

    var stageObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        stageObs.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    qsa('.gens-stage', panel).forEach(function (el) { stageObs.observe(el); });

    var hero = qs('[data-gens-scroll-root]', panel);
    if (hero) {
      function fireHero() {
        hero.classList.add('is-live');
        qsa('.poxy-gens-model', hero).forEach(function (m, i) {
          setTimeout(function () { m.classList.add('is-emerged'); }, 80 + i * 100);
        });
      }
      var heroObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          fireHero();
          heroObs.unobserve(e.target);
        });
      }, { threshold: 0.12 });
      heroObs.observe(hero);
      requestAnimationFrame(function () {
        if (hero.getBoundingClientRect().top < window.innerHeight * 0.9) fireHero();
      });
    }
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
    _uplinkSectorActive = false;

    qsa('.gens-stage', panel).forEach(function (el) { el.classList.remove('is-visible'); });
    qsa('.poxy-gens-model', panel).forEach(function (el) {
      el.classList.remove('is-emerged');
      var track = qs('.poxy-gens-model__track', el);
      if (track) track.style.removeProperty('--gens-scroll-y');
    });
    qsa('.poxy-gens-arch-card', panel).forEach(function (el) {
      el.classList.remove('is-revealed');
      el.style.removeProperty('--gens-arch-progress');
      el.style.removeProperty('--gens-arch-scale');
      el.style.removeProperty('--gens-arch-opacity');
    });

    var hero = qs('[data-gens-scroll-root]', panel);
    if (hero) {
      hero.classList.remove('is-live', 'is-pointer-active');
    }
    if (_tiltWrap) _tiltWrap.style.transform = '';
    if (_cursorGlow) _cursorGlow.style.background = '';

    var voidEl = qs('.poxy-gens-hero__void', panel);
    if (voidEl) {
      voidEl.style.removeProperty('--gens-void-scale');
      voidEl.style.removeProperty('--gens-void-opacity');
    }
    qsa('[data-gens-scroll-morph]', panel).forEach(function (el) {
      el.style.removeProperty('--gens-morph-scale');
      el.style.removeProperty('--gens-morph-opacity');
    });

    var uplink = qs('.poxy-gens-uplink', panel);
    if (uplink) uplink.classList.remove('is-focused');
  }

  function initGensPage() {
    _panel = document.getElementById('stPanelGens');
    if (!_panel) return;

    if (!_inited) {
      _inited = true;
      bindActions(_panel);
    }

    clearScrollFns();
    stopRaf();

    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resetMotion(_panel);
        observeStages(_panel);
        bindScrollParallax(_panel);
        bindArchiveScroll(_panel);
        bindUplinkSector(_panel);
        bindHeroPointer(_panel);
        startCountdown(_panel);
      });
    });
  }

  function teardownGensPage() {
    if (_timerIv) { clearInterval(_timerIv); _timerIv = null; }
    clearScrollFns();
    stopRaf();

    if (_tiltHero && _tiltMove) {
      _tiltHero.removeEventListener('mousemove', _tiltMove);
      _tiltHero.removeEventListener('mouseleave', _tiltLeave);
    }
    _tiltHero = null;
    _tiltWrap = null;
    _cursorGlow = null;
    _tiltMove = null;
    _tiltLeave = null;
    _springRotX = null;
    _springRotY = null;
    _springGlowX = null;
    _springGlowY = null;
    _uplinkGlitchFired = false;
    _uplinkSectorActive = false;
    _panel = null;
  }

  window.initGensPage = initGensPage;
  window.teardownGensPage = teardownGensPage;
})();
