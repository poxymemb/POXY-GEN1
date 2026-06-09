/**
 * POXY Support Panel — Session B
 * FAQ · My Tickets · New Ticket · Realtime chat · Photo upload
 */
(function (global) {
  'use strict';

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_DIM = 1200;
  const COMPRESS_QUALITY = 0.7;
  const FAQ_CATS = [
    { id: 'all', label: 'All' },
    { id: 'gameplay', label: 'Gameplay' },
    { id: 'economy', label: 'Economy' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'account', label: 'Account' },
  ];

  let activeTab = 'faq';
  let faqCat = 'all';
  let faqItems = [];
  let tickets = [];
  let activeTicket = null;
  let realtimeChannel = null;
  const renderedMsgIds = new Set();
  const attach = { new: null, chat: null };

  function $(id) { return document.getElementById(id); }
  function sb() { return global.sb; }
  function user() { return global.currentUser; }
  function toast(msg) { if (global.showToast) global.showToast(msg); }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function fmtTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }
  function timeSince(iso) {
    if (global.timeSince) return global.timeSince(iso);
    return fmtTime(iso);
  }

  function validateImageFile(file) {
    if (!file) return { ok: false, msg: 'No file selected.' };
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { ok: false, msg: 'Only JPEG, PNG, or WebP images are allowed.' };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, msg: 'Image must be 2MB or smaller.' };
    }
    return { ok: true };
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unavailable.')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const outType = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
        const quality = outType === 'image/png' ? undefined : COMPRESS_QUALITY;
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('Image compression failed.')); return; }
          const ext = outType === 'image/png' ? 'png' : (outType === 'image/webp' ? 'webp' : 'jpg');
          const base = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w.-]/g, '_') || 'photo';
          resolve(new File([blob], base + '.' + ext, { type: outType }));
        }, outType, quality);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read image.'));
      };
      img.src = url;
    });
  }

  async function pickAttachment(slot, inputEl) {
    const file = inputEl?.files?.[0];
    if (inputEl) inputEl.value = '';
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) { toast(v.msg); return; }
    try {
      const compressed = await compressImage(file);
      clearAttachment(slot);
      const previewUrl = URL.createObjectURL(compressed);
      attach[slot] = { file: compressed, previewUrl, size: compressed.size, name: compressed.name };
      renderAttachPreview(slot);
    } catch (e) {
      toast(e.message || 'Image processing failed.');
    }
  }

  function clearAttachment(slot) {
    if (attach[slot]?.previewUrl) URL.revokeObjectURL(attach[slot].previewUrl);
    attach[slot] = null;
    renderAttachPreview(slot);
    const inp = slot === 'new' ? $('supportNewFile') : $('supportChatFile');
    if (inp) inp.value = '';
  }

  function renderAttachPreview(slot) {
    const wrap = $(slot === 'new' ? 'supportNewAttachPreview' : 'supportChatAttachPreview');
    const meta = $(slot === 'new' ? 'supportNewAttachMeta' : 'supportChatAttachMeta');
    const img = $(slot === 'new' ? 'supportNewAttachImg' : 'supportChatAttachImg');
    if (!wrap) return;
    const a = attach[slot];
    if (!a) {
      wrap.classList.remove('visible');
      if (img) img.removeAttribute('src');
      if (meta) meta.textContent = '';
      return;
    }
    wrap.classList.add('visible');
    if (img) img.src = a.previewUrl;
    if (meta) meta.textContent = a.name + ' · ' + fmtBytes(a.size);
  }

  async function uploadSupportImage(file) {
    const u = user();
    if (!u) throw new Error('Not signed in.');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = 'tickets/' + u.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const client = sb();
    const { error } = await client.storage.from('support-attachments').upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = client.storage.from('support-attachments').getPublicUrl(path);
    return data.publicUrl;
  }

  function openOverlay() {
    const ov = $('supportHubOverlay');
    if (!ov) return;
    ov.hidden = false;
    ov.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { ov.classList.add('is-open'); });
  }

  function closeSupportPanel() {
    const ov = $('supportHubOverlay');
    if (!ov) return;
    ov.classList.remove('is-open');
    ov.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      ov.hidden = true;
      leaveChatView();
      unsubscribeRealtime();
    }, 400);
  }

  global.openSupportPanel = function openSupportPanel() {
    if (!user()) {
      toast('Sign in to contact support.');
      return;
    }
    openOverlay();
    switchSupportTab(activeTab || 'faq');
    refreshTicketBadge();
  };
  global.closeSupportPanel = closeSupportPanel;

  global.switchSupportTab = function switchSupportTab(tab) {
    activeTab = tab;
    leaveChatView();
    document.querySelectorAll('.poxy-support-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.supportTab === tab);
    });
    document.querySelectorAll('.poxy-support-panel').forEach(function (p) {
      const isTarget = p.dataset.supportPanel === tab;
      if (isTarget) {
        p.hidden = false;
        requestAnimationFrame(function () { p.classList.add('is-visible'); });
      } else if (p.classList.contains('is-visible')) {
        p.classList.remove('is-visible');
        setTimeout(function () {
          if (p.dataset.supportPanel !== activeTab) p.hidden = true;
        }, 150);
      } else {
        p.hidden = true;
        p.classList.remove('is-visible');
      }
    });
    if (tab === 'faq') loadFaq();
    if (tab === 'tickets') loadTickets();
  };

  function leaveChatView() {
    const chat = $('supportChatView');
    const tabs = $('supportMainTabs');
    const panels = $('supportPanelsWrap');
    if (chat && !chat.hidden) {
      chat.classList.remove('is-visible');
      setTimeout(function () { chat.hidden = true; }, 150);
    } else if (chat) {
      chat.classList.remove('is-visible');
      chat.hidden = true;
    }
    if (tabs) tabs.hidden = false;
    if (panels) panels.hidden = false;
    activeTicket = null;
    renderedMsgIds.clear();
    unsubscribeRealtime();
    clearAttachment('chat');
  }

  global.supportBackToTickets = function supportBackToTickets() {
    leaveChatView();
    switchSupportTab('tickets');
  };

  async function loadFaq() {
    const list = $('supportFaqList');
    if (!list) return;
    list.innerHTML = '<p class="poxy-support-empty">Loading FAQ…</p>';
    try {
      const { data, error } = await sb().from('support_faq').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      faqItems = data || [];
      renderFaq();
    } catch (e) {
      list.innerHTML = '<p class="poxy-support-empty" style="color:#f87171">' + esc(e.message) + '</p>';
    }
  }

  function renderFaq() {
    const list = $('supportFaqList');
    const q = ($('supportFaqSearch')?.value || '').trim().toLowerCase();
    if (!list) return;
    let rows = faqItems.slice();
    if (faqCat !== 'all') rows = rows.filter(function (f) { return f.category === faqCat; });
    if (q) {
      rows = rows.filter(function (f) {
        return (f.question || '').toLowerCase().includes(q) || (f.answer || '').toLowerCase().includes(q);
      });
    }
    if (!rows.length) {
      list.innerHTML = '<p class="poxy-support-empty">No FAQ entries match.</p>';
      return;
    }
    list.innerHTML = rows.map(function (f, i) {
      return '<div class="poxy-support-faq-item" id="supportFaqItem' + i + '">' +
        '<button type="button" class="poxy-support-faq-q" onclick="toggleSupportFaq(' + i + ')">' +
        esc(f.question) + '<span class="ico">▼</span></button>' +
        '<div class="poxy-support-faq-a">' + esc(f.answer) + '</div></div>';
    }).join('');
    list._faqRows = rows;
  }

  global.toggleSupportFaq = function toggleSupportFaq(i) {
    const rows = $('supportFaqList')?._faqRows;
    const el = $('supportFaqItem' + i);
    if (!el) return;
    const open = el.classList.toggle('open');
    document.querySelectorAll('.poxy-support-faq-item').forEach(function (item, j) {
      if (j !== i) item.classList.remove('open');
    });
    if (open && rows && rows[i]) {
      /* noop — expand only */
    }
  };

  global.filterSupportFaqCat = function filterSupportFaqCat(cat, btn) {
    faqCat = cat;
    document.querySelectorAll('.poxy-support-cat').forEach(function (b) {
      b.classList.toggle('active', b.dataset.faqCat === cat);
    });
    renderFaq();
  };

  global.onSupportFaqSearch = function onSupportFaqSearch() { renderFaq(); };

  async function loadTickets() {
    const list = $('supportTicketsList');
    if (!list) return;
    const u = user();
    if (!u) return;
    list.innerHTML = '<p class="poxy-support-empty">Loading tickets…</p>';
    try {
      const { data, error } = await sb().from('support_tickets')
        .select('id,subject,status,updated_at,created_at')
        .eq('user_id', u.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      tickets = data || [];
      renderTickets();
      refreshTicketBadge();
    } catch (e) {
      list.innerHTML = '<p class="poxy-support-empty" style="color:#f87171">' + esc(e.message) + '</p>';
    }
  }

  function renderTickets() {
    const list = $('supportTicketsList');
    if (!list) return;
    if (!tickets.length) {
      list.innerHTML = '<p class="poxy-support-empty">No tickets yet. Open a new ticket if you need help.</p>';
      return;
    }
    list.innerHTML = tickets.map(function (t) {
      const st = (t.status || 'open').replace('_', ' ');
      return '<button type="button" class="poxy-support-ticket" onclick="openSupportChat(\'' + t.id + '\')">' +
        '<div class="poxy-support-ticket-subj">' + esc(t.subject) + '</div>' +
        '<div class="poxy-support-ticket-meta">' +
        '<span class="poxy-support-status ' + esc(t.status) + '">' + esc(st) + '</span>' +
        '<span>' + esc(timeSince(t.updated_at || t.created_at)) + '</span></div></button>';
    }).join('');
  }

  global.openSupportChat = async function openSupportChat(ticketId) {
    const t = tickets.find(function (x) { return x.id === ticketId; });
    if (!t) return;
    activeTicket = t;
    renderedMsgIds.clear();
    $('supportMainTabs').hidden = true;
    $('supportPanelsWrap').hidden = true;
    const chat = $('supportChatView');
    if (chat) {
      chat.hidden = false;
      chat.classList.remove('is-visible');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { chat.classList.add('is-visible'); });
      });
    }
    $('supportChatSubject').textContent = t.subject || 'Ticket';
    const badge = $('supportChatStatus');
    if (badge) {
      badge.textContent = (t.status || 'open').replace('_', ' ');
      badge.className = 'poxy-support-status ' + (t.status || 'open');
    }
    const closed = t.status === 'closed';
    const compose = $('supportChatCompose');
    if (compose) compose.classList.toggle('closed', closed);
    $('supportChatMessages').innerHTML = '<p class="poxy-support-empty">Loading messages…</p>';
    clearAttachment('chat');
    await loadChatMessages(ticketId);
    subscribeRealtime(ticketId);
  };

  async function loadChatMessages(ticketId) {
    const box = $('supportChatMessages');
    try {
      const { data, error } = await sb().from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      renderedMsgIds.clear();
      if (box) box.innerHTML = '';
      (data || []).forEach(function (m) { appendMessage(m, false); });
      scrollChatBottom();
    } catch (e) {
      if (box) box.innerHTML = '<p class="poxy-support-empty" style="color:#f87171">' + esc(e.message) + '</p>';
    }
  }

  function appendMessage(m, animate) {
    if (!m || renderedMsgIds.has(m.id)) return;
    renderedMsgIds.add(m.id);
    const box = $('supportChatMessages');
    if (!box) return;
    const empty = box.querySelector('.poxy-support-empty');
    if (empty) empty.remove();

    const u = user();
    let kind = 'staff';
    if (m.is_auto) kind = 'auto';
    else if (!m.is_staff && m.sender_id === u?.id) kind = 'player';
    else if (!m.is_staff) kind = 'player';

    const div = document.createElement('div');
    div.className = 'poxy-support-msg ' + kind + (animate ? ' poxy-support-msg--enter' : ' poxy-support-msg--static');
    let body = m.body ? '<div>' + esc(m.body).replace(/\n/g, '<br>') + '</div>' : '';
    if (m.image_url) {
      body += '<img src="' + esc(m.image_url) + '" alt="Attachment" loading="lazy" onclick="window.open(this.src,\'_blank\')"/>';
    }
    div.innerHTML = '<div class="poxy-support-bubble">' + body + '</div>' +
      '<div class="poxy-support-msg-time">' + esc(fmtTime(m.created_at)) + '</div>';
    box.appendChild(div);
  }

  function scrollChatBottom() {
    const box = $('supportChatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function unsubscribeRealtime() {
    if (realtimeChannel) {
      sb().removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  function subscribeRealtime(ticketId) {
    unsubscribeRealtime();
    realtimeChannel = sb().channel('ticket:' + ticketId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: 'ticket_id=eq.' + ticketId,
      }, function (payload) {
        appendMessage(payload.new, true);
        scrollChatBottom();
      })
      .subscribe();
  }

  global.sendSupportChatMessage = async function sendSupportChatMessage() {
    if (!activeTicket || activeTicket.status === 'closed') {
      toast('This ticket is closed.');
      return;
    }
    const text = ($('supportChatInput')?.value || '').trim();
    const a = attach.chat;
    if (!text && !a) {
      toast('Enter a message or attach a photo.');
      return;
    }
    const btn = $('supportChatSend');
    if (btn) btn.disabled = true;
    try {
      let imageUrl = null;
      if (a) imageUrl = await uploadSupportImage(a.file);
      const { error } = await sb().from('ticket_messages').insert({
        ticket_id: activeTicket.id,
        sender_id: user().id,
        is_staff: false,
        body: text || null,
        image_url: imageUrl,
        is_auto: false,
      });
      if (error) throw error;
      $('supportChatInput').value = '';
      clearAttachment('chat');
    } catch (e) {
      toast(e.message || 'Send failed.');
    }
    if (btn) btn.disabled = false;
  };

  global.createSupportTicket = async function createSupportTicket() {
    const subject = ($('supportNewSubject')?.value || '').trim();
    const body = ($('supportNewBody')?.value || '').trim();
    const errEl = $('supportNewErr');
    if (errEl) errEl.textContent = '';
    if (!subject) {
      if (errEl) errEl.textContent = 'Subject is required.';
      return;
    }
    if (!body && !attach.new) {
      if (errEl) errEl.textContent = 'Message or photo is required.';
      return;
    }
    const btn = $('supportNewSubmit');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      let imageUrl = null;
      if (attach.new) imageUrl = await uploadSupportImage(attach.new.file);
      const { data: ticketId, error } = await sb().rpc('create_support_ticket', {
        p_subject: subject,
        p_first_message: body,
        p_image_url: imageUrl,
      });
      if (error) throw error;
      $('supportNewSubject').value = '';
      $('supportNewBody').value = '';
      clearAttachment('new');
      toast('Ticket created!');
      await loadTickets();
      switchSupportTab('tickets');
      if (ticketId) openSupportChat(ticketId);
    } catch (e) {
      const msg = e.message || 'Could not create ticket.';
      if (errEl) errEl.textContent = msg;
      toast(msg);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Create ticket'; }
  };

  async function refreshTicketBadge() {
    const badge = $('supportTicketBadge');
    const u = user();
    if (!badge || !u) return;
    try {
      const { count, error } = await sb().from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .in('status', ['open', 'in_progress']);
      if (error) throw error;
      const n = count || 0;
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.hidden = n <= 0;
    } catch (e) {
      badge.hidden = true;
    }
  }

  global.onSupportNewFile = function onSupportNewFile() {
    pickAttachment('new', $('supportNewFile'));
  };
  global.onSupportChatFile = function onSupportChatFile() {
    pickAttachment('chat', $('supportChatFile'));
  };
  global.clearSupportNewAttach = function () { clearAttachment('new'); };
  global.clearSupportChatAttach = function () { clearAttachment('chat'); };

  function renderFaqCats() {
    const row = $('supportFaqCats');
    if (!row) return;
    row.innerHTML = FAQ_CATS.map(function (c) {
      return '<button type="button" class="poxy-support-cat' + (c.id === faqCat ? ' active' : '') + '" data-faq-cat="' + c.id + '" onclick="filterSupportFaqCat(\'' + c.id + '\',this)">' + c.label + '</button>';
    }).join('');
  }

  function init() {
    if (!$('supportHubOverlay')) return;
    renderFaqCats();
    const client = sb();
    if (client?.auth) {
      client.auth.onAuthStateChange(function (event, session) {
        if (session?.user) refreshTicketBadge();
        else closeSupportPanel();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('supportHubOverlay')?.classList.contains('is-open')) {
        closeSupportPanel();
      }
    });
    setTimeout(refreshTicketBadge, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
