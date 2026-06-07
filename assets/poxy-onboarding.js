(function PoxyOnboarding() {
  'use strict';

  var LS_KEY = 'poxy_onboarding_done';
  var ACCENT = ['#9d4dff','#00d4d4','#ff6b35','#9d4dff','#00ffcc','#00ff88','#f5a623'];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile  = window.innerWidth <= 540;

  var OB = {
    active: false, idx: -1,
    el: null, bgCvs: null, bgCtx: null, sCvs: null, sCtx: null,
    rafBg: 0, rafSc: 0,
    timer: null, ctTimer: null,
    audioCtx: null, _droneOsc: null,
    cleanupFn: null,
    mx: 300, my: 500,
  };

  /* ── AUDIO ─────────────────────────────────────────────────────── */
  function _audio() {
    if (!OB.audioCtx) {
      try { OB.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return OB.audioCtx;
  }
  function _tone(freq, dur, gain, type) {
    var ac = _audio(); if (!ac || reduced) return;
    try {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.02);
    } catch(e) {}
  }
  function _whoosh() {
    var ac = _audio(); if (!ac || reduced) return;
    try {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, ac.currentTime);
      o.frequency.linearRampToValueAtTime(820, ac.currentTime + 0.3);
      g.gain.setValueAtTime(0.05, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.32);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.38);
    } catch(e) {}
  }
  function _sparkle() {
    if (reduced) return;
    for (var i = 0; i < 6; i++) {
      (function(i) { setTimeout(function() { _tone(400 + Math.random() * 800, 0.05, 0.035); }, i * 40); })(i);
    }
  }
  function _startDrone() {
    var ac = _audio(); if (!ac || reduced) return;
    try {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 60; g.gain.value = 0.018;
      o.connect(g); g.connect(ac.destination); o.start();
      OB._droneOsc = o;
    } catch(e) {}
  }
  function _stopDrone() {
    try { if (OB._droneOsc) { OB._droneOsc.stop(); OB._droneOsc = null; } } catch(e) {}
  }

  /* ── BACKGROUND: stars + nebula + shooting stars ─────────────── */
  var _stars = [], _nebulas = [], _shoot = null, _shootT = 4000;

  function _initBg() {
    var cvs = OB.bgCvs;
    cvs.width = window.innerWidth; cvs.height = window.innerHeight;
    _stars = [];
    for (var i = 0; i < 200; i++) {
      _stars.push({
        x: Math.random() * cvs.width, y: Math.random() * cvs.height,
        r: 0.5 + Math.random() * 2.5, base: 0.3 + Math.random() * 0.6,
        dx: (Math.random() - 0.5) * 0.22, dy: (Math.random() - 0.5) * 0.22,
        ph: Math.random() * Math.PI * 2, sp: 0.007 + Math.random() * 0.014,
      });
    }
    _nebulas = [
      { x: cvs.width * 0.18, y: cvs.height * 0.28, r: 310, c: 'rgba(120,40,255,0.08)', ph: 0 },
      { x: cvs.width * 0.80, y: cvs.height * 0.72, r: 280, c: 'rgba(0,200,200,0.06)', ph: 2 },
      { x: cvs.width * 0.54, y: cvs.height * 0.48, r: 360, c: 'rgba(245,166,35,0.045)', ph: 4 },
    ];
    _shootT = 3000 + Math.random() * 2000;
  }

  function _rafBg(ts) {
    if (!OB.active) return;
    var cvs = OB.bgCvs, ctx = OB.bgCtx;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    _nebulas.forEach(function(n) {
      var sc = 1 + 0.05 * Math.sin(ts * 0.00003 + n.ph);
      var rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * sc);
      rg.addColorStop(0, n.c); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, cvs.width, cvs.height);
    });
    if (!reduced) {
      _stars.forEach(function(s) {
        s.x += s.dx; s.y += s.dy;
        if (s.x < 0) s.x = cvs.width; if (s.x > cvs.width) s.x = 0;
        if (s.y < 0) s.y = cvs.height; if (s.y > cvs.height) s.y = 0;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.base + 0.3 * Math.sin(ts * s.sp + s.ph)));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      _shootT -= 16;
      if (_shootT <= 0) {
        _shootT = 3000 + Math.random() * 2000;
        var ang = (-25 - Math.random() * 20) * Math.PI / 180;
        _shoot = { x: Math.random() * cvs.width, y: Math.random() * cvs.height * 0.5, ang: ang, len: 85 + Math.random() * 55, t: 0 };
      }
      if (_shoot) {
        _shoot.t += 16;
        var p = _shoot.t / 600;
        if (p >= 1) { _shoot = null; }
        else {
          var sx = _shoot.x + p * 720 * Math.cos(_shoot.ang);
          var sy = _shoot.y + p * 720 * Math.sin(_shoot.ang);
          var gr = ctx.createLinearGradient(sx, sy, sx - _shoot.len * Math.cos(_shoot.ang), sy - _shoot.len * Math.sin(_shoot.ang));
          gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          ctx.lineTo(sx - _shoot.len * Math.cos(_shoot.ang), sy - _shoot.len * Math.sin(_shoot.ang));
          ctx.stroke();
        }
      }
    }
    OB.rafBg = requestAnimationFrame(_rafBg);
  }

  /* ── HELPERS ──────────────────────────────────────────────────── */
  function _typewrite(el, text, speed, cb) {
    el.textContent = ''; var i = 0;
    (function tick() {
      if (!OB.active || !el.parentNode) return;
      el.textContent += text[i]; i++;
      if (i < text.length) setTimeout(tick, speed);
      else if (cb) setTimeout(cb, 80);
    })();
  }
  function _burst(cx, cy, color, n) {
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      var ang = (i / n) * Math.PI * 2;
      var dist = 22 + Math.random() * 32;
      el.className = 'onb-particle';
      el.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:6px;height:6px;border-radius:50%;background:' + color + ';pointer-events:none;z-index:100001;transform:translate(-50%,-50%)';
      document.body.appendChild(el);
      var tx = Math.cos(ang) * dist, ty = Math.sin(ang) * dist;
      el.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + tx + 'px),calc(-50% + ' + ty + 'px)) scale(0)', opacity: 0 },
      ], { duration: 440, easing: 'ease-out' }).onfinish = function() { if (el.parentNode) el.remove(); };
    }
  }
  function _updateDots() {
    if (!OB.el) return;
    OB.el.querySelectorAll('.ob-dot').forEach(function(d, i) {
      d.classList.toggle('ob-dot--active', i === OB.idx);
    });
  }

  /* ── SCENE CONTROL ────────────────────────────────────────────── */
  function _clearScene() {
    cancelAnimationFrame(OB.rafSc); OB.rafSc = 0;
    if (OB.cleanupFn) { try { OB.cleanupFn(); } catch(e) {} OB.cleanupFn = null; }
    if (OB.timer) { clearTimeout(OB.timer); OB.timer = null; }
    if (OB.ctTimer) { clearInterval(OB.ctTimer); OB.ctTimer = null; }
  }

  function _goScene(idx) {
    if (!OB.active) return;
    _clearScene();
    if (idx >= 7) { _endTour(); return; }
    _whoosh();

    var el = OB.el;
    var old = el.querySelector('.ob-scene');
    var cont = document.createElement('div');
    cont.className = 'ob-scene';
    cont.style.setProperty('--accent', ACCENT[idx]);
    el.appendChild(cont);

    if (old && !reduced) {
      old.classList.add('ob-scene--exit');
      cont.classList.add('ob-scene--enter');
      setTimeout(function() { if (old.parentNode) old.remove(); cont.classList.remove('ob-scene--enter'); }, 440);
    } else {
      if (old && old.parentNode) old.remove();
    }

    OB.idx = idx;
    _updateDots();
    var skip = el.querySelector('.ob-skip');
    if (skip) skip.style.opacity = idx === 0 ? '0' : '0.5';
    OB.sCvs.width = window.innerWidth;
    OB.sCvs.height = window.innerHeight;

    [_s0, _s1, _s2, _s3, _s4, _s5, _s6][idx](cont);
  }

  /* ── SCENE 0: PORTAL / WARP ───────────────────────────────────── */
  function _s0(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height, cx = W / 2, cy = H / 2;
    var NUM = mobile ? 100 : 280;
    var pts = [];
    for (var i = 0; i < NUM; i++) {
      var a = Math.random() * Math.PI * 2, spd = 0.3 + Math.random() * 2;
      pts.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, len: 0 });
    }
    cont.innerHTML =
      '<div class="ob-s0-wrap">' +
        '<div class="ob-s0-logo" id="obS0Logo">' +
          '<span class="ob-s0-letter" style="--d:0">P</span>' +
          '<span class="ob-s0-letter" style="--d:1">O</span>' +
          '<span class="ob-s0-letter" style="--d:2">X</span>' +
          '<span class="ob-s0-letter" style="--d:3">Y</span>' +
          '<span class="ob-s0-word" style="--d:4">WORLD</span>' +
        '</div>' +
        '<div class="ob-s0-tag" id="obS0Tag"></div>' +
      '</div>';

    var t0 = null, phase = 0;
    function raf(t) {
      if (!OB.active || OB.idx !== 0) return;
      if (!t0) t0 = t;
      var el = t - t0;
      ctx.clearRect(0, 0, W, H);
      var warp = el < 1500 ? el / 1500 : Math.max(0, 1 - (el - 1500) / 2000);
      pts.forEach(function(p) {
        var spd = 1 + warp * 9;
        p.x += p.vx * spd; p.y += p.vy * spd;
        p.len = Math.min(44, p.len + warp * 3.5 + 0.4);
        if (p.x < -8 || p.x > W + 8 || p.y < -8 || p.y > H + 8) {
          var ang = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 2;
          p.x = cx; p.y = cy; p.vx = Math.cos(ang) * s; p.vy = Math.sin(ang) * s; p.len = 0;
        }
        var gr = ctx.createLinearGradient(p.x - p.vx * p.len, p.y - p.vy * p.len, p.x, p.y);
        gr.addColorStop(0, 'transparent');
        gr.addColorStop(1, el % 600 < 300 ? '#9d4dff' : '#f5a623');
        ctx.globalAlpha = Math.min(1, warp + 0.12) * 0.82;
        ctx.strokeStyle = gr; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * p.len, p.y - p.vy * p.len); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (el > 1500 && phase === 0) { phase = 1; var lg = document.getElementById('obS0Logo'); if (lg) lg.classList.add('ob-s0-logo--show'); }
      if (el > 2500 && phase === 1) { phase = 2; var tg = document.getElementById('obS0Tag'); if (tg) _typewrite(tg, 'The next era of digital collecting', 28); }
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function() { _goScene(1); }, 5000);
    var handler = function() { _goScene(1); };
    cont.addEventListener('click', handler, { once: true });
    OB.cleanupFn = function() { cont.removeEventListener('click', handler); };
  }

  /* ── SCENE 1: WELCOME ────────────────────────────────────────── */
  function _s1(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height;
    var N = mobile ? 18 : 50, nodes = [];
    for (var i = 0; i < N; i++) {
      nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5 });
    }
    cont.innerHTML =
      '<div class="ob-center ob-s1-center">' +
        '<div class="ob-avatar" id="obAv">👾</div>' +
        '<h1 class="ob-s1-title">Welcome, Operative</h1>' +
        '<p class="ob-s1-sub" id="obS1Sub"></p>' +
        '<div class="ob-s1-cta" id="obS1Cta" style="opacity:0">' +
          '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">SKIP TOUR</button>' +
          '<button class="ob-btn ob-btn--primary ob-btn--teal" onclick="window.PoxyOB.next()">EXPLORE →</button>' +
        '</div>' +
      '</div>';
    var av = document.getElementById('obAv');
    if (av) {
      av.addEventListener('click', function() {
        _tone(600, 0.12, 0.05);
        av.classList.remove('ob-avatar--jump'); void av.offsetWidth; av.classList.add('ob-avatar--jump');
        var r = av.getBoundingClientRect();
        _burst(r.left + r.width / 2, r.top + r.height / 2, '#00d4d4', 10);
      });
    }
    setTimeout(function() { var e = document.getElementById('obS1Sub'); if (e) _typewrite(e, 'Collect. Verify. Own.', 30); }, 700);
    setTimeout(function() { var c = document.getElementById('obS1Cta'); if (c) c.style.opacity = '1'; }, 1300);

    function raf(t) {
      if (!OB.active || OB.idx !== 1) return;
      ctx.clearRect(0, 0, W, H);
      nodes.forEach(function(n) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        var d = Math.hypot(n.x - OB.mx, n.y - OB.my);
        if (d < 160) { n.x += (OB.mx - n.x) * 0.014; n.y += (OB.my - n.y) * 0.014; }
      });
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 150) {
            ctx.globalAlpha = (1 - dist / 150) * 0.32;
            ctx.strokeStyle = '#00d4d4'; ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#00d4d4';
      nodes.forEach(function(n, ni) {
        ctx.beginPath(); ctx.arc(n.x, n.y, 2 + Math.sin(t * 0.002 + ni) * 1.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function() { _goScene(2); }, 12000);
  }

  /* ── SCENE 2: BOXES ──────────────────────────────────────────── */
  function _s2(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height;
    var fps = [];
    function spawnFire() {
      fps.push({ x: W * 0.2 + Math.random() * W * 0.6, y: H + 5,
        vx: (Math.random()-0.5)*2, vy: -1.5-Math.random()*3.5,
        r: 2+Math.random()*5, life: 1, wb: Math.random()*Math.PI*2,
        color: ['#ff6b35','#ff9500','#ffcc00','#fff'][0|(Math.random()*4)] });
    }
    var RARS = [
      { n:'Common',    p:'60%',  c:'#888888' }, { n:'Uncommon', p:'25%',  c:'#4caf50' },
      { n:'Rare',      p:'10%',  c:'#00d4d4' }, { n:'Epic',     p:'4%',   c:'#9d4dff' },
      { n:'Legendary', p:'0.9%', c:'#f5a623' }, { n:'Mythic',   p:'0.1%', c:'#ff3366' },
    ];
    cont.innerHTML =
      '<div class="ob-center ob-s2-center">' +
        '<div class="ob-s2-orbit">' +
          RARS.map(function(r,i){ return '<div class="ob-s2-orb" style="--i:'+i+';--c:'+r.c+'"><div class="ob-s2-orb-dot" style="background:'+r.c+'"></div><span class="ob-s2-orb-tip">'+r.n+' '+r.p+'</span></div>'; }).join('') +
          '<div class="ob-s2-box" id="obBox">' +
            '<svg viewBox="0 0 140 140" width="140" height="140">' +
              '<polygon class="ob-box-front" points="70,95 20,65 20,30 70,60"/>' +
              '<polygon class="ob-box-right" points="70,95 120,65 120,30 70,60"/>' +
              '<polygon class="ob-box-top" id="obBoxTop" points="70,60 20,30 70,0 120,30"/>' +
            '</svg>' +
            '<div class="ob-s2-tap">Tap the box</div>' +
          '</div>' +
        '</div>' +
        '<p class="ob-s2-text">Open Boxes. Discover Creatures.</p>' +
        '<p class="ob-s2-proof" id="obS2Pf" style="opacity:0">Every open is provably fair.</p>' +
        '<div class="ob-s2-cta" id="obS2Cta" style="opacity:0">' +
          '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">SKIP</button>' +
          '<button class="ob-btn ob-btn--primary ob-btn--orange" onclick="window.PoxyOB.next()">NEXT →</button>' +
        '</div>' +
      '</div>';

    var box = document.getElementById('obBox'), boxOpen = false;
    if (box) {
      box.addEventListener('click', function() {
        if (boxOpen) return; boxOpen = true;
        _tone(340, 0.4, 0.07, 'triangle');
        var tap = box.querySelector('.ob-s2-tap'); if (tap) tap.remove();
        var top = document.getElementById('obBoxTop'); if (top) top.classList.add('ob-box-top--open');
        var br = box.getBoundingClientRect(), bcx = br.left + br.width/2, bcy = br.top + br.height/2;
        RARS.forEach(function(r,ri){ setTimeout(function(){ _burst(bcx,bcy,r.c,3); },ri*65); });
        var rv = Math.random();
        var ri = rv<0.001?5:rv<0.010?4:rv<0.050?3:rv<0.150?2:rv<0.400?1:0;
        var rev = document.createElement('div');
        rev.className = 'ob-s2-reveal'; rev.textContent = '✦ '+RARS[ri].n.toUpperCase()+' ✦';
        rev.style.color = RARS[ri].c; rev.style.textShadow = '0 0 22px '+RARS[ri].c;
        box.appendChild(rev); _sparkle();
        setTimeout(function() { if(top)top.classList.remove('ob-box-top--open'); if(rev.parentNode)rev.remove(); boxOpen=false; }, 1700);
        var pf=document.getElementById('obS2Pf'); if(pf)pf.style.opacity='1';
      });
    }
    setTimeout(function(){ var c=document.getElementById('obS2Cta'); if(c)c.style.opacity='1'; }, 900);

    var fT = 0;
    function raf(t) {
      if (!OB.active || OB.idx !== 2) return;
      ctx.clearRect(0, 0, W, H);
      fT += 16; if (fT > 55) { spawnFire(); fT = 0; }
      for (var i = fps.length-1; i >= 0; i--) {
        var p = fps[i];
        p.x += p.vx + Math.sin(t*0.003+p.wb)*0.7; p.y += p.vy; p.life -= 0.013; p.r *= 0.993;
        if (p.life <= 0 || p.r < 0.3) { fps.splice(i,1); continue; }
        ctx.globalAlpha = p.life * 0.72; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function(){ _goScene(3); }, 12000);
  }

  /* ── SCENE 3: DNA ────────────────────────────────────────────── */
  function _s3(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height;
    var cw = mobile ? 200 : 280, ch = mobile ? 300 : 420;
    var DEMO = {
      poxy_tier: 'epic', character_name: 'Storm Dragon', display_name: 'Storm Dragon',
      serial_number: 'PX-DEMO01', id: 'ob-demo-epic-001',
      dna_hash: '9a4b2c8e1f3d7a2b5c9e4f8a1b3d7c2e9a4b2c8e1f3d7a2b5c9e4f8a1b3d7c2e',
      signature: 'ed25519_onboard_demo_sig_a1b2c3d4e5f6',
      dropped_at: '2024-03-15T00:00:00Z',
      traits: {
        Eye:{ name:'Solar Eyes', tier:'mythic', pop:11 }, Horn:{ name:'Dragon Fang', tier:'legendary', pop:18 },
        Aura:{ name:'Celestial Blue', tier:'legendary', pop:28 }, Element:{ name:'Storm', tier:'rare', pop:55 },
        Scale:{ name:'Dragon Scale', tier:'rare', pop:60 }, Tail:{ name:'Phoenix Tail', tier:'mythic', pop:14 },
      },
    };
    cont.innerHTML =
      '<div class="ob-s3-outer">' +
        '<div class="ob-s3-card-wrap" id="obCardWrap" style="transform-style:preserve-3d">' +
          '<canvas id="obCrdCvs" width="'+cw+'" height="'+ch+'" style="border-radius:12px;box-shadow:0 0 40px rgba(157,77,255,0.35)"></canvas>' +
        '</div>' +
        '<div class="ob-s3-info">' +
          '<p class="ob-s3-title">Each POXY is one of a kind.</p>' +
          '<p class="ob-s3-sub">6 DNA traits. Cryptographic proof.<br><em>Some traits exist in under 10 copies.</em></p>' +
          '<div class="ob-s3-cta" id="obS3Cta" style="opacity:0">' +
            '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">SKIP</button>' +
            '<button class="ob-btn ob-btn--primary ob-btn--purple" onclick="window.PoxyOB.next()">NEXT →</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var cardCvs = document.getElementById('obCrdCvs');
    if (cardCvs && typeof _drawCard === 'function') {
      _drawCard(DEMO).then(function(big) {
        if (!cardCvs || !cardCvs.parentNode) return;
        cardCvs.getContext('2d').drawImage(big, 0, 0, cw, ch);
      }).catch(function() {
        if (!cardCvs) return;
        var cc = cardCvs.getContext('2d');
        cc.fillStyle = '#1a1025'; cc.fillRect(0, 0, cw, ch);
        cc.fillStyle = '#9d4dff'; cc.font = 'bold ' + (mobile ? 14 : 18) + 'px sans-serif';
        cc.textAlign = 'center'; cc.textBaseline = 'middle';
        cc.fillText('STORM DRAGON', cw/2, ch/2);
      });
    }
    setTimeout(function(){ var c=document.getElementById('obS3Cta'); if(c)c.style.opacity='1'; }, 900);

    var wrap = document.getElementById('obCardWrap');
    var tRX=0, tRY=0, cRX=0, cRY=0;
    function raf(t) {
      if (!OB.active || OB.idx !== 3) return;
      ctx.clearRect(0, 0, W, H);
      if (!reduced && !mobile) {
        var hcx = 72, npts = 26;
        for (var ii = 0; ii < npts; ii++) {
          var hy = ((ii*22 - t*0.04) % (npts*22) + npts*22) % (npts*22);
          var hx1 = hcx + Math.cos(ii*0.45 + t*0.001)*52;
          var hx2 = hcx + Math.cos(ii*0.45 + t*0.001 + Math.PI)*52;
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = 'hsl('+(270+ii/npts*90)+',80%,60%)';
          ctx.beginPath(); ctx.arc(hx1, hy, 3.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(hx2, hy, 3.5, 0, Math.PI*2); ctx.fill();
          if (ii>0) { ctx.strokeStyle='rgba(157,77,255,0.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(hx1,hy); ctx.lineTo(hx2,hy); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      if (wrap) {
        var rect = wrap.getBoundingClientRect();
        tRY = (OB.mx-(rect.left+rect.width/2))*0.026;
        tRX = (OB.my-(rect.top+rect.height/2))*0.016;
        cRX += (tRX-cRX)*0.08; cRY += (tRY-cRY)*0.08;
        wrap.style.transform = 'perspective(900px) rotateX('+(-cRX)+'deg) rotateY('+cRY+'deg)';
      }
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function(){ _goScene(4); }, 12000);
    OB.cleanupFn = function() { if(wrap){ wrap.style.transform=''; wrap.style.willChange=''; } };
  }

  /* ── SCENE 4: MARKET ─────────────────────────────────────────── */
  function _s4(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height;
    var chartPts = [300,320,290,350,340,378,362,418,400,448];
    var chartT = 0, swapped = false;
    window.PoxyOB.s4swap = function() {
      _tone(540, 0.12, 0.04); swapped = !swapped;
      var cards = cont.querySelectorAll('.ob-s4-card');
      if (!cards.length) return;
      cards[0].style.transform = swapped ? 'translateX(58px) rotate(-4deg)' : '';
      cards[1].style.transform = swapped ? 'translateX(-58px) rotate(4deg)' : '';
      setTimeout(function(){ cards[0].style.transform=''; cards[1].style.transform=''; }, 400);
    };
    cont.innerHTML =
      '<div class="ob-center ob-s4-center">' +
        '<h2 class="ob-s4-title">Trade & Collect</h2>' +
        '<div class="ob-s4-swap-row">' +
          '<div class="ob-s4-card">👾<span>Common</span></div>' +
          '<button class="ob-s4-swap" onclick="window.PoxyOB.s4swap()">⇄</button>' +
          '<div class="ob-s4-card">🐉<span>Rare</span></div>' +
        '</div>' +
        '<div class="ob-s4-stats">' +
          '<div class="ob-stat"><span class="ob-sv" data-t="1247830">0</span><span class="ob-sl">24h Volume (PC)</span></div>' +
          '<div class="ob-stat"><span class="ob-sv" data-t="342">0</span><span class="ob-sl">Active Listings</span></div>' +
          '<div class="ob-stat"><span class="ob-sv" data-t="4500">0</span><span class="ob-sl">Floor Price (PC)</span></div>' +
        '</div>' +
        '<p class="ob-s4-sub">List your POXY for sale. Buy rare creatures from other players.<br>Prices driven by scarcity and demand.</p>' +
        '<div id="obS4Cta" style="opacity:0;display:flex;gap:10px;justify-content:center;margin-top:14px">' +
          '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">SKIP</button>' +
          '<button class="ob-btn ob-btn--primary ob-btn--cyan" onclick="window.PoxyOB.next()">NEXT →</button>' +
        '</div>' +
      '</div>';
    setTimeout(function(){
      cont.querySelectorAll('.ob-sv').forEach(function(el){
        var target=parseInt(el.dataset.t,10), val=0, step=target/60;
        var iv=setInterval(function(){ val=Math.min(val+step,target); el.textContent=Math.round(val).toLocaleString(); if(val>=target)clearInterval(iv); },18);
      });
    }, 400);
    setTimeout(function(){ var c=document.getElementById('obS4Cta'); if(c)c.style.opacity='1'; }, 900);

    function raf(t) {
      if (!OB.active || OB.idx !== 4) return;
      ctx.clearRect(0, 0, W, H);
      chartT += 16;
      if (chartT > 2000) {
        chartT = 0; chartPts.push(chartPts[chartPts.length-1]+(Math.random()-0.38)*28);
        if (chartPts.length > 20) chartPts.shift();
      }
      if (chartPts.length > 1) {
        var minV=Math.min.apply(null,chartPts), maxV=Math.max.apply(null,chartPts);
        var cX=40, cW=W-80, cY=H-170, cH=120;
        ctx.save(); ctx.beginPath();
        chartPts.forEach(function(v,i){
          var px=cX+(i/(chartPts.length-1))*cW;
          var py=cY+cH-((v-minV)/(maxV-minV+0.001))*cH;
          if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
        });
        ctx.strokeStyle='#00ffcc'; ctx.lineWidth=2.5; ctx.shadowBlur=14; ctx.shadowColor='#00ffcc'; ctx.stroke();
        ctx.lineTo(cX+cW,cY+cH); ctx.lineTo(cX,cY+cH);
        var gr=ctx.createLinearGradient(0,cY,0,cY+cH);
        gr.addColorStop(0,'rgba(0,255,204,0.2)'); gr.addColorStop(1,'rgba(0,255,204,0)');
        ctx.fillStyle=gr; ctx.shadowBlur=0; ctx.fill(); ctx.restore();
      }
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function(){ _goScene(5); }, 12000);
  }

  /* ── SCENE 5: CRYPTO / MATRIX ────────────────────────────────── */
  function _s5(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height;
    var CHARS = '0123456789ABCDEF░▒▓';
    var COLS = Math.floor(W / 16), drops = [];
    for (var ci = 0; ci < COLS; ci++) drops.push(Math.random() * H / 20);
    var LINES = [
      { t:'> initializing poxy_crypto_core v2.4.1...', tip:null, fin:false },
      { t:'> SHA-256: 9a4b2c...d72f [OK]', tip:'Unique fingerprint of your asset', fin:false },
      { t:'> ED25519 signature: Valid [OK]', tip:'Server signature — proves authenticity', fin:false },
      { t:'> Ledger event: Immutable [OK]', tip:'Tamper-proof history', fin:false },
      { t:'> Merkle root: Verified [OK]', tip:'Bulk integrity proof', fin:false },
      { t:'> Asset integrity: CONFIRMED ✓', tip:'Your asset is authentic', fin:true },
    ];
    cont.innerHTML =
      '<div class="ob-center ob-s5-center">' +
        '<h2 class="ob-s5-title">Cryptographically Yours</h2>' +
        '<div class="ob-terminal"><div class="ob-terminal-bar"><span></span><span></span><span></span></div>' +
          '<div class="ob-terminal-body" id="obTermB"></div></div>' +
        '<p class="ob-s5-sub">Every POXY is SHA-256 hashed, ED25519 signed, and ledger-recorded.<br>' +
          '<strong style="color:#00ff88;text-shadow:0 0 8px rgba(0,255,136,0.45)">No one — not even us —</strong> can alter, duplicate, or forge your asset.</p>' +
        '<div id="obS5Cta" style="opacity:0;display:flex;gap:10px;justify-content:center;margin-top:14px">' +
          '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">SKIP</button>' +
          '<button class="ob-btn ob-btn--primary ob-btn--green" onclick="window.PoxyOB.next()">NEXT →</button>' +
        '</div>' +
      '</div>';
    var body = document.getElementById('obTermB'), li = 0;
    function nextLine() {
      if (!body || li >= LINES.length || !OB.active || OB.idx !== 5) return;
      var line = LINES[li];
      var div = document.createElement('div');
      div.className = 'ob-term-line' + (line.fin ? ' ob-term-line--final' : '');
      if (line.tip) {
        div.addEventListener('click', function() {
          _tone(700, 0.06, 0.03); div.classList.toggle('ob-term-line--hl');
          var ex = div.querySelector('.ob-term-tip');
          if (ex) { ex.remove(); } else { var sp=document.createElement('span'); sp.className='ob-term-tip'; sp.textContent=' ← '+line.tip; div.appendChild(sp); }
        });
      }
      body.appendChild(div);
      _typewrite(div, line.t, 22, function() { li++; setTimeout(nextLine, 260); });
    }
    setTimeout(nextLine, 400);
    setTimeout(function(){ var c=document.getElementById('obS5Cta'); if(c)c.style.opacity='1'; }, 2600);
    ctx.clearRect(0, 0, W, H);
    function raf() {
      if (!OB.active || OB.idx !== 5) return;
      if (!reduced) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,255,136,0.068)'; ctx.font = '14px monospace';
        for (var di = 0; di < drops.length; di++) {
          ctx.fillText(CHARS[0|Math.random()*CHARS.length], di*16, drops[di]*20);
          if (drops[di]*20 > H && Math.random() > 0.975) drops[di]=0; else drops[di]+=0.5;
        }
      }
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
    OB.timer = setTimeout(function(){ _goScene(6); }, 12000);
  }

  /* ── SCENE 6: FINALE ─────────────────────────────────────────── */
  function _s6(cont) {
    var cvs = OB.sCvs, ctx = OB.sCtx;
    var W = cvs.width, H = cvs.height, cx = W/2, cy = H/2;
    var FWC = ['#9d4dff','#00d4d4','#ff6b35','#00ffcc','#00ff88','#f5a623','#ff3366'];
    var fws = [];
    function launchFW() {
      for (var i = 0; i < (mobile ? 55 : 110); i++) {
        var a = Math.random()*Math.PI*2, spd = 1.5+Math.random()*6;
        fws.push({ x:cx,y:cy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-2, g:0.13, life:1,
          color:FWC[0|Math.random()*FWC.length], r:2+Math.random()*3 });
      }
      _sparkle();
    }
    cont.innerHTML =
      '<div class="ob-center ob-s6-center">' +
        '<div class="ob-s6-star">✦</div>' +
        '<h1 class="ob-s6-title">You\'re ready, Operative</h1>' +
        '<p class="ob-s6-sub" id="obS6Sub" style="opacity:0">Your first POXY is waiting in the Store.</p>' +
        '<p class="ob-s6-count" id="obS6Ct" style="opacity:0">Starting in 5…</p>' +
        '<div class="ob-s6-cta" id="obS6Cta" style="opacity:0">' +
          '<button class="ob-btn ob-btn--gold ob-btn--pulse" onclick="window.PoxyOB.toStore()">⚡ OPEN FIRST BOX</button>' +
          '<button class="ob-btn ob-btn--ghost" onclick="window.PoxyOB.skip()">EXPLORE ON MY OWN</button>' +
        '</div>' +
      '</div>';
    launchFW(); setTimeout(launchFW, 300); setTimeout(launchFW, 620);
    setTimeout(function(){ var s=document.getElementById('obS6Sub'); if(s)s.style.opacity='1'; }, 600);
    var cd = 5;
    setTimeout(function(){
      var c=document.getElementById('obS6Cta'), ct=document.getElementById('obS6Ct');
      if(c)c.style.opacity='1'; if(ct)ct.style.opacity='1';
      OB.ctTimer = setInterval(function(){
        cd--;
        var el=document.getElementById('obS6Ct');
        if(el)el.textContent=cd>0?('Starting in '+cd+'…'):'Done!';
        if(cd<=0){clearInterval(OB.ctTimer);OB.ctTimer=null;setTimeout(_endTour,800);}
      }, 1000);
    }, 800);
    function raf() {
      if (!OB.active || OB.idx !== 6) return;
      ctx.fillStyle='rgba(0,0,0,0.07)'; ctx.fillRect(0,0,W,H);
      for (var i=fws.length-1;i>=0;i--) {
        var p=fws[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.life-=0.008;
        if(p.life<=0){fws.splice(i,1);continue;}
        ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
      OB.rafSc = requestAnimationFrame(raf);
    }
    OB.rafSc = requestAnimationFrame(raf);
  }

  function _purgeTourDOM() {
    document.querySelectorAll('[class*="onb"]').forEach(function(el) { el.remove(); });
    document.querySelectorAll('[id*="onb"]').forEach(function(el) { el.remove(); });
    var cvs = document.getElementById('onbCanvas');
    if (cvs) cvs.remove();
  }

  /* ── END TOUR ─────────────────────────────────────────────────── */
  function _endTour() {
    if (!OB.active) return;
    OB.active = false;
    _clearScene();
    cancelAnimationFrame(OB.rafBg); OB.rafBg = 0;
    _stopDrone();
    localStorage.setItem(LS_KEY, 'true');
    var el = OB.el;
    if (el) el.classList.add('ob-overlay--out');
    _purgeTourDOM();
    OB.el = null;
    if (el && el.parentNode) {
      setTimeout(function() { _purgeTourDOM(); }, 520);
    }
  }

  /* ── PUBLIC API ───────────────────────────────────────────────── */
  window.PoxyOB = {
    next:    function() { _goScene(OB.idx + 1); },
    skip:    function() { _endTour(); },
    toStore: function() { _endTour(); setTimeout(function() { if (window.showPage) window.showPage('store'); }, 220); },
    s4swap:  function() {},
  };

  /* ── BUILD OVERLAY ────────────────────────────────────────────── */
  function _buildOverlay() {
    var el = document.createElement('div');
    el.id = 'poxyOnboarding'; el.className = 'ob-overlay';

    var bgCvs = document.createElement('canvas'); bgCvs.className = 'ob-canvas ob-canvas--bg';
    el.appendChild(bgCvs); OB.bgCvs = bgCvs; OB.bgCtx = bgCvs.getContext('2d');

    var sCvs = document.createElement('canvas'); sCvs.className = 'ob-canvas ob-canvas--scene';
    el.appendChild(sCvs); OB.sCvs = sCvs; OB.sCtx = sCvs.getContext('2d');

    var skip = document.createElement('button'); skip.className = 'ob-skip'; skip.textContent = 'SKIP'; skip.style.opacity = '0';
    skip.addEventListener('click', function() { _tone(800,0.05,0.03); _endTour(); });
    setTimeout(function() { if (OB.active && skip) skip.style.opacity = '0.5'; }, 1400);
    el.appendChild(skip);

    var dots = document.createElement('div'); dots.className = 'ob-dots';
    for (var i = 0; i < 7; i++) {
      var d = document.createElement('button'); d.className = 'ob-dot'; d.setAttribute('aria-label', 'Scene '+(i+1));
      (function(idx){ d.addEventListener('click', function(){ if(idx!==OB.idx)_goScene(idx); }); })(i);
      dots.appendChild(d);
    }
    el.appendChild(dots);

    el.addEventListener('mousemove', function(e){ OB.mx=e.clientX; OB.my=e.clientY; });
    el.addEventListener('click', _audio, { once: true });

    document.body.appendChild(el); OB.el = el;
  }

  /* ── START ────────────────────────────────────────────────────── */
  function startOnboarding() {
    if (OB.active) return;
    if (OB.el) { OB.el.remove(); OB.el = null; }
    OB.active = true; OB.idx = -1;
    OB.mx = window.innerWidth / 2; OB.my = window.innerHeight / 2;
    _buildOverlay(); _initBg();
    OB.rafBg = requestAnimationFrame(_rafBg);
    _startDrone();
    _goScene(0);
  }

  window.startPoxyOnboarding = startOnboarding;
  window.replayPoxyOnboarding = function() {
    localStorage.removeItem(LS_KEY);
    if (OB.active) { _endTour(); setTimeout(startOnboarding, 600); }
    else { startOnboarding(); }
  };

  /* ── AUTH POLL ────────────────────────────────────────────────── */
  var _poll = setInterval(function() {
    if (window.currentUser) {
      clearInterval(_poll);
      if (!localStorage.getItem(LS_KEY)) { setTimeout(startOnboarding, 1200); }
    }
  }, 500);

})();
