/**
 * Lumina OS — shared UI primitives (vanilla DOM).
 */
(function (global) {
  const U = global.LuminaChatUtil;

  function el(tag, cls, attrs) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function icon(name, extraCls) {
    const s = el('span', 'material-symbols-outlined ' + (extraCls || ''));
    s.textContent = name;
    return s;
  }

  function glassCard(children, opts) {
    opts = opts || {};
    const card = el('div', 'lo-glass-card' + (opts.inset ? ' lo-glass-card--inset' : ''));
    if (typeof children === 'string') card.innerHTML = children;
    else if (children) {
      if (Array.isArray(children)) children.forEach((c) => c && card.appendChild(c));
      else card.appendChild(children);
    }
    return card;
  }

  function primaryButton(label, opts) {
    opts = opts || {};
    const btn = el('button', 'lo-btn lo-btn--primary' + (opts.small ? ' lo-btn--sm' : ''));
    btn.type = 'button';
    if (opts.id) btn.id = opts.id;
    if (opts.disabled) btn.disabled = true;
    if (opts.icon) btn.appendChild(icon(opts.icon));
    const span = el('span', '', { text: label });
    btn.appendChild(span);
    if (opts.onClick) btn.onclick = opts.onClick;
    return btn;
  }

  function secondaryButton(label, opts) {
    opts = opts || {};
    const btn = el('button', 'lo-btn lo-btn--secondary' + (opts.small ? ' lo-btn--sm' : ''));
    btn.type = 'button';
    btn.textContent = label;
    if (opts.onClick) btn.onclick = opts.onClick;
    return btn;
  }

  function avatar(content, opts) {
    opts = opts || {};
    const wrap = el('div', 'lo-avatar' + (opts.lg ? ' lo-avatar--lg' : '') + (opts.sm ? ' lo-avatar--sm' : ''));
    if (content && String(content).startsWith('http')) {
      wrap.innerHTML =
        '<img src="' +
        U.sanitizeText(U.avatarUrl(content)) +
        '" alt="">';
    } else {
      wrap.textContent = content || '👾';
    }
    if (opts.status) {
      const dot = el('span', 'lo-status-dot lo-status-dot--' + opts.status);
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function handleLine(username, displayName) {
    const wrap = el('div', 'lo-handle-wrap');
    if (displayName) {
      wrap.appendChild(el('div', 'lo-display-name', { text: displayName }));
    }
    const handle = el('div', 'lo-handle', {
      html:
        '<span class="lo-handle-at">@</span>' +
        U.sanitizeText(U.handleFromUsername(username)),
    });
    wrap.appendChild(handle);
    return wrap;
  }

  function statusIndicator(status, label) {
    const row = el('div', 'lo-status-row');
    row.appendChild(el('span', 'lo-status-dot lo-status-dot--' + (status || 'offline')));
    row.appendChild(el('span', 'lo-status-label', { text: label || status || '' }));
    return row;
  }

  function animatedWrap(child, key) {
    const w = el('div', 'lo-animate-in');
    w.dataset.animateKey = key || '';
    if (child) w.appendChild(child);
    return w;
  }

  function winRateChart(pct, id) {
    const wrap = el('div', 'lo-win-chart');
    const bar = el('div', 'lo-win-chart-track');
    const fill = el('div', 'lo-win-chart-fill');
    fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    if (id) fill.id = id;
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(el('span', 'lo-win-chart-label', { text: pct.toFixed(1) + '%' }));
    return wrap;
  }

  function modalBase(title, bodyNode, actions) {
    const overlay = el('div', 'lo-modal-overlay');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    const card = glassCard(null, {});
    card.classList.add('lo-modal-card');
    card.appendChild(el('h3', 'lo-modal-title', { text: title }));
    const body = el('div', 'lo-modal-body');
    if (bodyNode) body.appendChild(bodyNode);
    card.appendChild(body);
    const foot = el('div', 'lo-modal-foot');
    (actions || []).forEach((a) => foot.appendChild(a));
    card.appendChild(foot);
    overlay.appendChild(card);
    document.getElementById('luminaOsRoot')?.appendChild(overlay);
    return overlay;
  }

  global.LuminaOSComponents = {
    el,
    icon,
    glassCard,
    primaryButton,
    secondaryButton,
    avatar,
    handleLine,
    statusIndicator,
    animatedWrap,
    winRateChart,
    modalBase,
  };
})(window);
