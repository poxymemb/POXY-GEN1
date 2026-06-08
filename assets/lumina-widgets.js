/**
 * Lumina OS — Widget Engine
 * Trade Component + Duel Clash Wheel + Image Lightbox
 * Vanilla JS, Web Animations API spring physics, SVG ring animation, Canvas confetti
 */
(function () {
  'use strict';

  const U = window.LuminaChatUtil;
  const CFG = window.LUMINA_CHAT;

  /* ─── Lazy Supabase client (shared with chat os) ──────────────────────── */
  function getSb() {
    if (window._lf_sb) return window._lf_sb;
    window._lf_sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
    });
    return window._lf_sb;
  }

  /* ─── Tier meta ───────────────────────────────────────────────────────── */
  const TIER_META = {
    common:    { color: '#9ca3af', prob: 0.40, label: 'Common' },
    uncommon:  { color: '#22c55e', prob: 0.45, label: 'Uncommon' },
    rare:      { color: '#60a5fa', prob: 0.50, label: 'Rare' },
    epic:      { color: '#a855f7', prob: 0.60, label: 'Epic' },
    legendary: { color: '#f59e0b', prob: 0.70, label: 'Legendary' },
    mythic:    { color: '#ff008a', prob: 0.85, label: 'Mythic' },
  };

  function tierColor(tier) {
    return (TIER_META[tier] || TIER_META.common).color;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     IMAGE LIGHTBOX
     ═══════════════════════════════════════════════════════════════════════ */
  function openLightbox(src) {
    const prev = document.querySelector('.lf-lightbox');
    if (prev) prev.remove();
    const box = document.createElement('div');
    box.className = 'lf-lightbox';
    box.innerHTML = `<img src="${U.sanitizeText(src)}" alt="">`;
    box.onclick = () => {
      box.style.opacity = '0';
      box.style.transition = 'opacity 180ms';
      setTimeout(() => box.remove(), 180);
    };
    document.body.appendChild(box);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TRADE WIDGET — rendering + interactions
     ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Build the trade card HTML for a message with type='trade_widget'.
   * meta: { trade_id, status, from_name, to_name, offered_items, requested_items,
   *         locked_from, locked_to }
   */
  function renderTradeCard(msg, currentUserId) {
    const meta = msg.meta || {};
    const isMine = msg.from_id === currentUserId;
    const status = meta.status || 'pending';

    const offeredItems = (meta.offered_items || []).slice(0, 6);
    const requestedItems = (meta.requested_items || []).slice(0, 6);
    const fillerSlots = (arr) => {
      const filled = arr.map((it) => `
        <div class="lf-trade-item" title="${U.sanitizeText(it.label || '')}">
          <span>${U.sanitizeText(it.emoji || '🎭')}</span>
          <span class="lf-trade-item-tier-dot" style="background:${tierColor(it.tier)}"></span>
        </div>`).join('');
      const empty = Array(Math.max(0, 3 - arr.length)).fill(
        `<div class="lf-trade-item lf-trade-item--empty">
          <span class="material-symbols-outlined" style="font-size:14px">add</span>
        </div>`
      ).join('');
      return filled + empty;
    };

    const lockedFrom = meta.locked_from;
    const lockedTo   = meta.locked_to;
    const canExecute = lockedFrom && lockedTo && status === 'pending' && !isMine;

    const leftLabel  = isMine ? 'You Offer' : (U.sanitizeText(meta.from_name || 'Them'));
    const rightLabel = isMine ? (U.sanitizeText(meta.to_name || 'Them')) : 'You Receive';

    const lockFromBtn = isMine && status === 'pending' ? `
      <button type="button" class="lf-trade-lock-btn ${lockedFrom ? 'is-locked' : ''}"
        data-action="lock-from" data-trade-id="${U.sanitizeText(meta.trade_id || '')}">
        <span class="material-symbols-outlined">${lockedFrom ? 'lock' : 'lock_open'}</span>
        ${lockedFrom ? 'LOCKED IN' : 'LOCK IN'}
      </button>` : '';

    const lockToBtn = !isMine && status === 'pending' ? `
      <button type="button" class="lf-trade-lock-btn ${lockedTo ? 'is-locked' : ''}"
        data-action="lock-to" data-trade-id="${U.sanitizeText(meta.trade_id || '')}">
        <span class="material-symbols-outlined">${lockedTo ? 'lock' : 'lock_open'}</span>
        ${lockedTo ? 'LOCKED IN' : 'LOCK IN'}
      </button>` : '';

    const actionBtns = status === 'pending' ? `
      <div class="lf-trade-footer">
        <button type="button" class="lf-trade-execute-btn" ${!canExecute ? 'disabled' : ''}
          data-action="execute-trade" data-trade-id="${U.sanitizeText(meta.trade_id || '')}">
          <span class="material-symbols-outlined">swap_horiz</span>
          Execute Trade
        </button>
        ${!isMine ? `<button type="button" class="lf-trade-decline-btn"
          data-action="decline-trade" data-trade-id="${U.sanitizeText(meta.trade_id || '')}">
          Decline
        </button>` : ''}
      </div>` : '';

    return `
    <div class="lf-trade-card" data-trade-id="${U.sanitizeText(meta.trade_id || '')}">
      <div class="lf-trade-header">
        <div class="lf-trade-title">
          <span class="material-symbols-outlined">swap_horiz</span>
          Trade Proposal
        </div>
        <span class="lf-trade-status-pill" data-status="${status}">${status.toUpperCase()}</span>
      </div>
      <div class="lf-trade-body">
        <div class="lf-trade-side">
          <span class="lf-trade-side-label">${leftLabel}</span>
          <div class="lf-trade-items">${fillerSlots(offeredItems)}</div>
          ${lockFromBtn}
        </div>
        <div class="lf-trade-divider">
          <span class="material-symbols-outlined">arrow_forward</span>
          <span class="material-symbols-outlined" style="transform:rotate(180deg);display:block">arrow_forward</span>
        </div>
        <div class="lf-trade-side">
          <span class="lf-trade-side-label">${rightLabel}</span>
          <div class="lf-trade-items">${fillerSlots(requestedItems)}</div>
          ${lockToBtn}
        </div>
      </div>
      ${actionBtns}
    </div>`;
  }

  async function handleTradeAction(action, tradeId) {
    const sb = getSb();
    if (action === 'lock-from') {
      await sb.from('poxy_trade_offers').update({ locked_from: true }).eq('id', tradeId);
      showToast('Your side is locked in.');
    } else if (action === 'lock-to') {
      await sb.from('poxy_trade_offers').update({ locked_to: true }).eq('id', tradeId);
      showToast('Ready to execute!');
    } else if (action === 'execute-trade') {
      const { data } = await sb.rpc('accept_trade_offer', { p_offer_id: tradeId });
      if (data?.ok) showToast('Trade executed! Items exchanged.');
      else showToast(data?.error || 'Trade failed.');
    } else if (action === 'decline-trade') {
      const { data } = await sb.rpc('decline_trade_offer', { p_offer_id: tradeId });
      if (data?.ok) showToast('Trade declined.');
      else showToast(data?.error || 'Decline failed.');
    }
  }

  /* Trade composer popover */
  function showTradeComposer(peerId, peerName, currentUserId, userPoxy) {
    const prev = document.querySelector('.lf-popover[data-type="trade"]');
    if (prev) { prev.remove(); return; }

    const composeWrap = document.querySelector('.lc-compose-wrap');
    if (!composeWrap) return;
    composeWrap.style.position = 'relative';

    const slots = (userPoxy || []).slice(0, 8).map((p, i) => `
      <div class="lf-poxy-slot" data-poxy-id="${p.id}" data-poxy-tier="${p.poxy_tier}"
        title="${U.sanitizeText(p.label || p.poxy_tier)}">
        <span>${tierEmoji(p.poxy_tier)}</span>
      </div>`).join('') || '<p style="font-size:12px;color:#9ca3af;text-align:center">No POXY in inventory.</p>';

    const pop = document.createElement('div');
    pop.className = 'lf-popover';
    pop.dataset.type = 'trade';
    pop.innerHTML = `
      <div class="lf-popover-header">
        <span class="lf-popover-title">Propose Trade to ${U.sanitizeText(peerName)}</span>
        <button type="button" class="lf-popover-close"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
      </div>
      <div class="lf-popover-body">
        <p class="lf-section-title">Select POXY to offer</p>
        <div class="lf-poxy-slot-grid">${slots}</div>
        <div class="lf-field">
          <label class="lf-label">Message (optional)</label>
          <input type="text" class="lf-input" id="lfTradeMsg" placeholder="e.g. swap my Epic for your Legendary" maxlength="120">
        </div>
      </div>
      <div class="lf-popover-footer">
        <button type="button" class="lf-btn-primary" id="lfTradeSendBtn" disabled>
          <span class="material-symbols-outlined">swap_horiz</span> Send Proposal
        </button>
      </div>`;

    composeWrap.appendChild(pop);

    const selected = new Set();
    pop.querySelectorAll('.lf-poxy-slot').forEach((slot) => {
      slot.onclick = () => {
        const id = slot.dataset.poxyId;
        if (selected.has(id)) { selected.delete(id); slot.classList.remove('is-selected'); }
        else if (selected.size < 6) { selected.add(id); slot.classList.add('is-selected'); }
        pop.querySelector('#lfTradeSendBtn').disabled = selected.size === 0;
      };
    });

    pop.querySelector('.lf-popover-close').onclick = () => pop.remove();

    pop.querySelector('#lfTradeSendBtn').onclick = async () => {
      if (!selected.size) return;
      const btn = pop.querySelector('#lfTradeSendBtn');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const msg = pop.querySelector('#lfTradeMsg')?.value || '';
      const offeredItems = Array.from(selected).map((id) => {
        const p = (userPoxy || []).find((x) => x.id === id);
        return { id, tier: p?.poxy_tier || 'common', emoji: tierEmoji(p?.poxy_tier), label: p?.poxy_tier };
      });
      try {
        const sb = getSb();
        const { data: offer } = await sb.rpc('create_trade_offer', {
          p_to_id: peerId,
          p_poxy_ids: Array.from(selected),
          p_message: msg,
        });
        if (!offer?.ok) throw new Error(offer?.error || 'Failed');
        // Insert a trade_widget DM so it appears in the chat thread
        const meta = {
          trade_id: offer.offer_id,
          status: 'pending',
          from_name: 'You',
          to_name: U.sanitizeText(peerName),
          offered_items: offeredItems,
          requested_items: [],
          locked_from: false,
          locked_to: false,
        };
        await sb.from('poxy_dm').insert({
          from_id: currentUserId,
          to_id: peerId,
          content: 'Trade proposal',
          type: 'trade_widget',
          meta,
        });
        pop.remove();
        showToast('Trade proposal sent!');
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Send Proposal';
        showToast(e.message || 'Error sending trade.');
      }
    };

    document.addEventListener('click', function outside(e) {
      if (!pop.contains(e.target) && !e.target.closest('[data-widget-btn="trade"]')) {
        pop.remove();
        document.removeEventListener('click', outside);
      }
    }, true);
  }

  function tierEmoji(tier) {
    const map = { common: '⬜', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟡', mythic: '❤️' };
    return map[tier] || '🎭';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DUEL CLASH WHEEL — full animation pipeline
     ═══════════════════════════════════════════════════════════════════════ */

  const RING_R   = 45;     // SVG circle radius
  const RING_C   = 2 * Math.PI * RING_R; // circumference ≈ 283

  function renderDuelCard(msg, currentUserId) {
    const meta = msg.meta || {};
    const isMine = msg.from_id === currentUserId;
    const status = meta.status || 'pending';
    const duelId  = meta.duel_id || '';

    const cTier  = meta.challenger_tier || 'common';
    const dTier  = meta.defender_tier   || 'common';
    const cProb  = parseFloat(meta.challenger_prob || 0.5);
    const dProb  = parseFloat(meta.defender_prob   || 0.5);
    const cColor = tierColor(cTier);
    const dColor = tierColor(dTier);

    const cDash  = (cProb * RING_C).toFixed(1);
    const dDash  = (dProb * RING_C).toFixed(1);
    const dOffset = (cProb * 360).toFixed(1);

    const wager = meta.wager_coins > 0 ? `<span class="lf-duel-wager">⚡ ${meta.wager_coins} PC</span>` : '';

    const playerCard = (side) => {
      const name  = U.sanitizeText(meta[`${side}_name`]  || (side === 'challenger' ? 'Challenger' : 'Defender'));
      const tier  = side === 'challenger' ? cTier : dTier;
      const prob  = side === 'challenger' ? cProb : dProb;
      const color = tierColor(tier);
      const emoji = meta[`${side}_emoji`] || '👾';
      const winnerId = meta.winner_id;
      const isWinner = winnerId && meta[`${side}_id`] === winnerId;
      const isLoser  = winnerId && meta[`${side}_id`] !== winnerId;
      return `
        <div class="lf-duel-player ${isLoser ? 'is-loser' : ''}" data-side="${side}">
          <div class="lf-duel-player-av ${isWinner ? 'is-winner' : ''}">
            ${U.sanitizeText(emoji)}
            <div class="lf-duel-loser-strike"><span class="material-symbols-outlined" style="font-size:24px;color:rgba(248,113,113,0.8)">close</span></div>
          </div>
          <span class="lf-duel-player-name">${name}</span>
          <span class="lf-duel-player-tier" style="background:${color}22;color:${color};border:1px solid ${color}44">
            ${(TIER_META[tier] || TIER_META.common).label}
          </span>
          <span class="lf-duel-player-prob" style="color:${color}">${Math.round(prob * 100)}%</span>
        </div>`;
    };

    const resultText = meta.winner_id
      ? `<span class="lf-duel-center-result" style="color:#22c55e">RESOLVED</span>`
      : '';

    const actionBtns = (status === 'pending' && !isMine) ? `
      <div class="lf-duel-actions">
        <button type="button" class="lf-duel-accept-btn"
          data-action="accept-duel" data-duel-id="${U.sanitizeText(duelId)}">
          <span class="material-symbols-outlined">swords</span> ACCEPT DUEL
        </button>
        <button type="button" class="lf-duel-decline-btn"
          data-action="decline-duel" data-duel-id="${U.sanitizeText(duelId)}">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>` : '';

    return `
    <div class="lf-duel-card" data-status="${status}" data-duel-id="${U.sanitizeText(duelId)}">
      <div class="lf-duel-bg-glow"></div>
      <canvas class="lf-confetti-canvas"></canvas>
      <div class="lf-duel-header">
        <div class="lf-duel-header-title">
          <span class="material-symbols-outlined">swords</span>
          1v1 POXY DUEL
        </div>
        ${wager}
      </div>
      <div class="lf-duel-arena">
        ${playerCard('challenger')}
        <div class="lf-duel-wheel-wrap">
          <svg class="lf-duel-svg" viewBox="0 0 120 120">
            <circle class="lf-duel-ring-bg" cx="60" cy="60" r="${RING_R}"/>
            <circle class="lf-duel-ring-a" cx="60" cy="60" r="${RING_R}"
              stroke="${cColor}"
              stroke-dasharray="${status !== 'pending' ? cDash + ' ' + RING_C : '0 ' + RING_C}"
              stroke-dashoffset="0"
              data-target="${cDash}" data-color="${cColor}" data-offset="0"/>
            <circle class="lf-duel-ring-b" cx="60" cy="60" r="${RING_R}"
              stroke="${dColor}"
              stroke-dasharray="${status !== 'pending' ? dDash + ' ' + RING_C : '0 ' + RING_C}"
              stroke-dashoffset="${status !== 'pending' ? -cDash : 0}"
              data-target="${dDash}" data-color="${dColor}" data-offset="${-cDash}"/>
          </svg>
          <svg class="lf-duel-bead" viewBox="0 0 120 120" style="position:absolute;top:0;left:0">
            <circle class="lf-duel-bead-dot" cx="60" cy="${60 - RING_R}" r="5"/>
          </svg>
          <div class="lf-duel-center-text" style="position:absolute">
            <div class="lf-duel-center-vs">VS</div>
            ${resultText}
          </div>
        </div>
        ${playerCard('defender')}
      </div>
      ${actionBtns}
    </div>`;
  }

  /* Spring simulation for bead deceleration */
  function springDecel(duration, onAngle, onDone) {
    const totalRotations = 3 + Math.random() * 4; // 3-7 full spins
    const totalAngle = totalRotations * 360;
    const start = performance.now();
    let lastAngle = 0;

    function frame(now) {
      const elapsed = (now - start) / duration;
      if (elapsed >= 1) { onAngle(totalAngle % 360); onDone(); return; }
      // Spring-like easing: fast then spring deceleration
      const t = elapsed;
      const eased = t < 0.7
        ? (t / 0.7)          // linear phase
        : 1 - Math.pow(1 - ((t - 0.7) / 0.3), 3); // cubic ease-out phase
      const angle = eased * totalAngle;
      onAngle(angle % 360);
      lastAngle = angle;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return totalAngle;
  }

  /* Full duel animation pipeline */
  function runDuelAnimation(cardEl, meta) {
    const ringA  = cardEl.querySelector('.lf-duel-ring-a');
    const ringB  = cardEl.querySelector('.lf-duel-ring-b');
    const bead   = cardEl.querySelector('.lf-duel-bead-dot');
    const canvas = cardEl.querySelector('.lf-confetti-canvas');
    if (!ringA || !ringB || !bead) return;

    const cProb  = parseFloat(meta.challenger_prob || 0.5);
    const dProb  = 1 - cProb;
    const cDash  = cProb * RING_C;
    const dDash  = dProb * RING_C;
    const cColor = tierColor(meta.challenger_tier || 'common');
    const dColor = tierColor(meta.defender_tier   || 'common');

    // Phase 1: LIQUID FILL (0–800ms)
    setTimeout(() => {
      ringA.style.strokeDasharray = cDash.toFixed(1) + ' ' + RING_C;
      ringB.style.strokeDasharray = dDash.toFixed(1) + ' ' + RING_C;
      ringB.style.strokeDashoffset = (-cDash).toFixed(1);
    }, 80);

    // Phase 2: SPRING SPIN (1000–4500ms)
    const winner = meta.winner_id === meta.challenger_id ? 'challenger' : 'defender';
    const winnerProb = winner === 'challenger' ? cProb : dProb;
    // Landing angle: somewhere in the winner's sector
    const winnerSectorStart = winner === 'challenger' ? 0 : cProb * 360;
    const landAngle = winnerSectorStart + Math.random() * (winnerProb * 360 * 0.8 + 10);

    const totalSpins = 4 + Math.random() * 3;
    const finalAngle = totalSpins * 360 + landAngle;
    const spinDuration = 3200;
    const spinStart = performance.now() + 1000;

    function spinFrame(now) {
      if (now < spinStart) { requestAnimationFrame(spinFrame); return; }
      const elapsed = (now - spinStart) / spinDuration;
      if (elapsed > 1) {
        setBeadAngle(finalAngle % 360);
        onSpinComplete(winner, cardEl, meta, cColor, dColor, canvas);
        return;
      }
      // Spring decel: fast start, elastic brake
      const t = elapsed;
      let eased;
      if (t < 0.6) {
        eased = t / 0.6;
      } else {
        const rest = (t - 0.6) / 0.4;
        eased = 1 - Math.pow(1 - rest, 4) * 0.15; // slight overshoot look
      }

      const angle = eased * finalAngle;
      setBeadAngle(angle % 360);

      // VIBRATION: final 0.4s of spin (tension build)
      if (elapsed > 0.75) {
        const vib = Math.sin(elapsed * 120) * 1.5 * (1 - elapsed);
        cardEl.style.transform = `translateX(${vib}px)`;
      }

      requestAnimationFrame(spinFrame);
    }
    requestAnimationFrame(spinFrame);
  }

  function setBeadAngle(deg) {
    const bead = document.querySelector('.lf-duel-bead-dot[style*="transform-origin"]') ||
                 document.querySelector('.lf-duel-bead-dot');
    if (!bead) return;
    bead.setAttribute('transform', `rotate(${deg}, 60, 60)`);
  }

  function onSpinComplete(winner, cardEl, meta, cColor, dColor, canvas) {
    cardEl.style.transform = '';

    const ringA = cardEl.querySelector('.lf-duel-ring-a');
    const ringB = cardEl.querySelector('.lf-duel-ring-b');
    const winnerRing = winner === 'challenger' ? ringA : ringB;
    const loserRing  = winner === 'challenger' ? ringB : ringA;
    const winColor   = winner === 'challenger' ? cColor : dColor;

    // Phase 3a: PULSE winning segment × 3
    winnerRing.classList.add('is-winner-pulse');
    setTimeout(() => winnerRing.classList.remove('is-winner-pulse'), 1700);

    // Phase 3b: Fade loser segment
    loserRing.style.transition = 'opacity 600ms ease';
    loserRing.style.opacity = '0.2';

    // Phase 3c: Update player cards
    const winnerSide = winner;
    const loserSide  = winner === 'challenger' ? 'defender' : 'challenger';
    const winEl  = cardEl.querySelector(`.lf-duel-player[data-side="${winnerSide}"] .lf-duel-player-av`);
    const loseEl = cardEl.querySelector(`.lf-duel-player[data-side="${loserSide}"]`);
    if (winEl)  winEl.classList.add('is-winner');
    if (loseEl) loseEl.classList.add('is-loser');

    // Phase 3d: CONFETTI burst
    if (canvas) launchConfetti(canvas, winColor);

    // Update center text
    const ct = cardEl.querySelector('.lf-duel-center-text');
    if (ct) ct.innerHTML = `<div class="lf-duel-center-vs" style="color:${winColor}">WIN</div>`;
  }

  /* ── Lightweight canvas confetti ───────────────────────────────────────── */
  function launchConfetti(canvas, accentColor) {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  || 340;
    canvas.height = rect.height || 280;
    const ctx = canvas.getContext('2d');

    const colors = [accentColor, '#fff', '#f59e0b', '#a855f7', '#22c55e'];
    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.8) * 12,
      w: 4 + Math.random() * 5,
      h: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.3,
      alpha: 1,
    }));

    const gravity = 0.22;
    let frame = 0;

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        p.vy += gravity;
        p.x  += p.vx;
        p.y  += p.vy;
        p.angle += p.spin;
        p.alpha = Math.max(0, p.alpha - (frame > 40 ? 0.018 : 0));
        if (p.alpha <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (alive && frame < 120) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(tick);
  }

  async function handleDuelAction(action, duelId) {
    const sb = getSb();
    if (action === 'accept-duel') {
      const { data } = await sb.from('poxy_duels')
        .update({ status: 'active' })
        .eq('id', duelId)
        .select()
        .maybeSingle();
      if (data) {
        resolveDuel(duelId, data);
      }
    } else if (action === 'decline-duel') {
      await sb.from('poxy_duels').update({ status: 'declined' }).eq('id', duelId);
      showToast('Duel declined.');
    }
  }

  async function resolveDuel(duelId, duelData) {
    const sb = getSb();
    // Determine winner via server-side RNG using probabilities
    const rng = Math.random();
    const winnerId = rng < duelData.challenger_prob
      ? duelData.challenger_id
      : duelData.defender_id;

    await sb.from('poxy_duels').update({
      status: 'completed',
      winner_id: winnerId,
      rng_seed: rng.toFixed(6),
      resolved_at: new Date().toISOString(),
    }).eq('id', duelId);

    // Update DM meta
    const { data: dmRows } = await sb
      .from('poxy_dm')
      .select('id,meta')
      .eq('type', 'duel_widget')
      .filter('meta->>duel_id', 'eq', duelId)
      .limit(1);

    if (dmRows?.length) {
      const updatedMeta = { ...(dmRows[0].meta || {}), status: 'completed', winner_id: winnerId };
      await sb.from('poxy_dm').update({ meta: updatedMeta }).eq('id', dmRows[0].id);
    }

    showToast('Duel accepted! Spinning…');
  }

  /* Duel challenge composer popover */
  function showDuelComposer(peerId, peerName, currentUserId, userPoxy) {
    const prev = document.querySelector('.lf-popover[data-type="duel"]');
    if (prev) { prev.remove(); return; }

    const composeWrap = document.querySelector('.lc-compose-wrap');
    if (!composeWrap) return;

    const myPoxy = (userPoxy || []).slice(0, 8);
    const slots = myPoxy.map((p) => `
      <div class="lf-poxy-slot" data-poxy-id="${p.id}" data-poxy-tier="${p.poxy_tier}">
        <span>${tierEmoji(p.poxy_tier)}</span>
      </div>`).join('') || '<p style="font-size:12px;color:#9ca3af;text-align:center">No POXY</p>';

    const pop = document.createElement('div');
    pop.className = 'lf-popover';
    pop.dataset.type = 'duel';
    pop.innerHTML = `
      <div class="lf-popover-header">
        <span class="lf-popover-title">Challenge ${U.sanitizeText(peerName)} to Duel</span>
        <button type="button" class="lf-popover-close"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
      </div>
      <div class="lf-popover-body">
        <p class="lf-section-title" style="margin-bottom:6px">Select your POXY (sets win odds)</p>
        <div class="lf-poxy-slot-grid">${slots}</div>
        <div class="lf-field">
          <label class="lf-label">Wager (PC coins)</label>
          <input type="number" class="lf-input" id="lfDuelWager" placeholder="0" min="0" max="99999" value="0">
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;text-align:center" id="lfDuelOdds">
          Select a POXY to see win odds
        </div>
      </div>
      <div class="lf-popover-footer">
        <button type="button" class="lf-btn-primary" id="lfDuelSendBtn">
          <span class="material-symbols-outlined">swords</span> Send Challenge
        </button>
      </div>`;

    composeWrap.appendChild(pop);

    let selectedPoxy = null;
    pop.querySelectorAll('.lf-poxy-slot').forEach((slot) => {
      slot.onclick = () => {
        pop.querySelectorAll('.lf-poxy-slot').forEach((s) => s.classList.remove('is-selected'));
        slot.classList.add('is-selected');
        selectedPoxy = { id: slot.dataset.poxyId, tier: slot.dataset.poxyTier };
        const prob = (TIER_META[selectedPoxy.tier] || TIER_META.common).prob;
        document.getElementById('lfDuelOdds').textContent =
          `Win odds: YOU ${Math.round(prob * 100)}% — THEM ${Math.round((1 - prob) * 100)}%`;
      };
    });

    pop.querySelector('.lf-popover-close').onclick = () => pop.remove();

    pop.querySelector('#lfDuelSendBtn').onclick = async () => {
      const btn = pop.querySelector('#lfDuelSendBtn');
      btn.disabled = true;
      const wager = parseInt(document.getElementById('lfDuelWager')?.value || '0', 10) || 0;
      try {
        const sb = getSb();
        const { data: duel } = await sb.rpc('initiate_duel', {
          p_defender_id: peerId,
          p_challenger_poxy_id: selectedPoxy?.id || null,
          p_wager_coins: wager,
        });
        if (!duel?.ok) throw new Error(duel?.error || 'Failed');

        const prob = parseFloat(duel.challenger_prob || 0.5);
        const myProfile = window._lcProfile || window._lcState?.profile;
        const meta = {
          duel_id: duel.duel_id,
          status: 'pending',
          challenger_id: currentUserId,
          defender_id: peerId,
          challenger_name: myProfile?.username || 'You',
          defender_name: peerName,
          challenger_emoji: myProfile?.avatar_url || '👾',
          defender_emoji: '👾',
          challenger_tier: selectedPoxy?.tier || null,
          defender_tier: null,
          challenger_prob: prob,
          defender_prob: 1 - prob,
          wager_coins: wager,
          winner_id: null,
        };

        await sb.from('poxy_dm').insert({
          from_id: currentUserId,
          to_id: peerId,
          content: '1v1 Duel challenge',
          type: 'duel_widget',
          meta,
        });

        pop.remove();
        showToast('Duel challenge sent! Waiting for acceptance…');
      } catch (e) {
        btn.disabled = false;
        showToast(e.message || 'Error sending challenge.');
      }
    };

    document.addEventListener('click', function outside(e) {
      if (!pop.contains(e.target) && !e.target.closest('[data-widget-btn="duel"]')) {
        pop.remove();
        document.removeEventListener('click', outside);
      }
    }, true);
  }

  /* ─── Toast helper ────────────────────────────────────────────────────── */
  function showToast(msg) {
    const t = document.getElementById('lcToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => t.classList.remove('is-show'), 2800);
  }

  /* ─── Click delegation for all widget actions ─────────────────────────── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'open-lightbox') {
      openLightbox(btn.dataset.src || btn.querySelector('img')?.src || '');
    } else if (['lock-from','lock-to','execute-trade','decline-trade'].includes(action)) {
      handleTradeAction(action, btn.dataset.tradeId).catch(() => {});
    } else if (['accept-duel','decline-duel'].includes(action)) {
      handleDuelAction(action, btn.dataset.duelId).catch(() => {});
    }
  });

  /* ─── Expose public API ───────────────────────────────────────────────── */
  window.LuminaWidgets = {
    renderTradeCard,
    renderDuelCard,
    runDuelAnimation,
    showTradeComposer,
    showDuelComposer,
    openLightbox,
    showToast,
    TIER_META,
    tierColor,
    tierEmoji,
  };

})();
