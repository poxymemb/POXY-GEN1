/**
 * POXY Rive figure player — idle + one-shot react on hover/tap.
 */
(function (global) {
  'use strict';

  var riveBundle = null;
  var riveLoading = null;

  function loadRive() {
    if (riveBundle) return Promise.resolve(riveBundle);
    if (!riveLoading) {
      riveLoading = import('../../vendor/rive/rive.mjs')
        .then(function (mod) {
          riveBundle = mod.default || mod;
          return riveBundle;
        })
        .catch(function (err) {
          riveLoading = null;
          throw err;
        });
    }
    return riveLoading;
  }

  function pickTrigger(inputs) {
    if (!inputs || !inputs.length) return null;
    var names = ['react', 'tap', 'hover', 'trigger', 'pointer'];
    for (var i = 0; i < names.length; i++) {
      var hit = inputs.find(function (inp) {
        return inp.name && inp.name.toLowerCase() === names[i];
      });
      if (hit && typeof hit.fire === 'function') return hit;
    }
    return inputs.find(function (inp) {
      return typeof inp.fire === 'function';
    }) || null;
  }

  function findAnim(instance, target) {
    var names = instance.animationNames || [];
    var lower = target.toLowerCase();
    return names.find(function (n) {
      return n.toLowerCase() === lower;
    }) || null;
  }

  /**
   * @param {object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {string} opts.src
   * @param {number} [opts.scale=1]
   * @returns {Promise<{destroy: function}>}
   */
  function mount(opts) {
    var canvas = opts.canvas;
    var src = opts.src;
    var scale = opts.scale == null ? 1 : opts.scale;
    if (!canvas || !src) return Promise.reject(new Error('PoxyRiveFigure: canvas and src required'));

    var instance = null;
    var smName = '';
    var reactTrigger = null;
    var useManualReact = false;
    var manualReactActive = false;
    var lastStates = ['idle'];
    var destroyed = false;
    var hoverMatch = null;

    function isReacting() {
      if (manualReactActive) return true;
      return lastStates.indexOf('react') >= 0;
    }

    function resumeIdle() {
      manualReactActive = false;
      if (!instance || destroyed) return;
      if (smName) instance.play(smName);
      else {
        var idle = findAnim(instance, 'idle');
        if (idle) instance.play(idle);
      }
    }

    function playManualReact() {
      if (!instance || destroyed || isReacting()) return;
      var reactName = findAnim(instance, 'react');
      if (!reactName) return;
      manualReactActive = true;
      if (smName) instance.stop(smName);
      instance.play(reactName);
    }

    function fireReact() {
      if (!instance || destroyed || isReacting()) return;
      if (reactTrigger) {
        reactTrigger.fire();
        return;
      }
      if (useManualReact) playManualReact();
    }

    function bindInteraction(host) {
      if (!host) return;
      host.addEventListener('pointerenter', onEnter);
      host.addEventListener('click', onTap);
      host.__poxyRiveCleanup = function () {
        host.removeEventListener('pointerenter', onEnter);
        host.removeEventListener('click', onTap);
        delete host.__poxyRiveCleanup;
      };
    }

    function onEnter() {
      if (!hoverMatch || !hoverMatch.matches) return;
      fireReact();
    }

    function onTap() {
      fireReact();
    }

    return loadRive().then(function (R) {
      var Rive = R.Rive;
      var Fit = R.Fit;
      var Alignment = R.Alignment;
      var Layout = R.Layout;
      var EventType = R.EventType;

      hoverMatch = global.matchMedia('(hover: hover)');

      var api = {
        fireReact: fireReact,
        destroy: function () {
          destroyed = true;
          var host = canvas.parentElement || canvas;
          if (host && host.__poxyRiveCleanup) host.__poxyRiveCleanup();
          if (instance) {
            try {
              instance.cleanup();
            } catch (e) {}
            instance = null;
          }
        },
        resize: function () {
          if (instance && !destroyed) instance.resizeDrawingSurfaceToCanvas();
        },
      };

      return new Promise(function (resolve, reject) {
        try {
          instance = new Rive({
            src: src,
            canvas: canvas,
            autoplay: true,
            layout: new Layout({
              fit: Fit.Contain,
              alignment: Alignment.Center,
              layoutScaleFactor: scale,
            }),
            onLoad: function () {
              if (destroyed) return;
              instance.resizeDrawingSurfaceToCanvas();

              var smNames = instance.stateMachineNames || [];
              smName = smNames[0] || '';
              if (smName) instance.play(smName);
              else {
                var idleOnly = findAnim(instance, 'idle');
                if (idleOnly) instance.play(idleOnly);
              }

              var inputs = smName ? instance.stateMachineInputs(smName) || [] : [];
              reactTrigger = pickTrigger(inputs);
              useManualReact = !reactTrigger && !!findAnim(instance, 'react');

              if (EventType) {
                instance.on(EventType.StateChange, function (ev) {
                  var states = ev && ev.data ? ev.data : [];
                  if (states.length) lastStates = states;
                });
                instance.on(EventType.Stop, function (ev) {
                  if (!manualReactActive) return;
                  var name = ev && ev.data ? String(ev.data) : '';
                  if (name.toLowerCase().indexOf('react') >= 0) resumeIdle();
                });
              }

              bindInteraction(canvas.parentElement || canvas);
              resolve(api);
            },
            onLoadError: function (err) {
              reject(err && err.data ? err.data : err);
            },
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  global.PoxyRiveFigure = {
    loadRive: loadRive,
    mount: mount,
  };
})(typeof window !== 'undefined' ? window : globalThis);
