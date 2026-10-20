/* Chat Mockup — Toolity.in. Message editor (rows in #msg-list) → platform templates (bubble apps: WhatsApp · iMessage · Instagram ·
 * Telegram · Messenger · Google Messages; linear apps: Discord · Slack) → live preview + PNG via /scripts/mockup-common.js.
 * Each platform is CSS variables + a few markup switches (ticks / "Read" / seen-avatar / reactions). All on-device. */
(function () {
  'use strict';
  const M = window.ToolityMockup, $ = (id) => document.getElementById(id);
  const LINEAR = { discord: 1, slack: 1 }, TICKS = { whatsapp: 1, telegram: 1 }, SEEN = { instagram: 1, messenger: 1 }, LABEL = { imessage: 1, android: 1 };
  const PRESET_STATUS = { whatsapp: 'online', imessage: '', instagram: 'Active now', telegram: 'online', messenger: 'Active now', android: 'Mobile', discord: '', slack: 'Active' };
  const EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '🙏', '🎉'];

  /* ── message editor ── */
  const list = $('msg-list'); let uid = 0, imgKeys = [];
  const rowHtml = (i) => `
    <div class="mk-msg-row" role="listitem" data-id="${i}">
      <div class="mk-msg-top">
        <select class="select-clean mk-side" aria-label="Sender"><option value="them">Them</option><option value="me" selected>Me</option></select>
        <select class="select-clean mk-type" aria-label="Message type"><option value="text" selected>Text</option><option value="image">Image</option><option value="voice">Voice note</option></select>
        <input type="text" class="input-clean mk-time" placeholder="9:41" maxlength="8" aria-label="Time">
        <select class="select-clean mk-status" aria-label="Delivery status"><option value="sent">Sent</option><option value="delivered">Delivered</option><option value="read" selected>Read</option></select>
        <select class="select-clean mk-react" aria-label="Reaction"><option value="">No reaction</option>${EMOJIS.map((e) => `<option value="${e}">${e}</option>`).join('')}</select>
        <span class="mk-msg-ops"><button type="button" class="btn-toolbar-sm mk-up" title="Move up" aria-label="Move up">↑</button><button type="button" class="btn-toolbar-sm mk-down" title="Move down" aria-label="Move down">↓</button><button type="button" class="btn-toolbar-sm mk-del" title="Remove" aria-label="Remove message">×</button></span>
      </div>
      <textarea class="textarea-clean mk-text" rows="2" placeholder="Message… (emoji welcome)" aria-label="Message text"></textarea>
      <label class="mk-field mk-file mk-img" hidden><span>Picture</span><input type="file" accept="image/*" data-image="m${i}" aria-label="Message image"></label>
      <label class="mk-field mk-voice" hidden><span>Duration</span><input type="text" class="input-clean mk-dur" value="0:14" maxlength="5" aria-label="Voice note duration"></label>
    </div>`;
  const addRow = (side) => { list.insertAdjacentHTML('beforeend', rowHtml(++uid)); const r = list.lastElementChild; if (side) r.querySelector('.mk-side').value = side; syncRow(r); return r; };
  function syncRow(r) { const t = r.querySelector('.mk-type').value, me = r.querySelector('.mk-side').value === 'me', p = $('opt-platform').value; r.querySelector('.mk-text').hidden = t !== 'text'; r.querySelector('.mk-img').hidden = t !== 'image'; r.querySelector('.mk-voice').hidden = t !== 'voice'; r.querySelector('.mk-status').hidden = !me || LINEAR[p]; r.querySelector('.mk-time').hidden = false; }
  list.addEventListener('change', (e) => { const r = e.target.closest('.mk-msg-row'); if (r && (e.target.classList.contains('mk-type') || e.target.classList.contains('mk-side'))) syncRow(r); });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'), r = e.target.closest('.mk-msg-row'); if (!b || !r) return;
    if (b.classList.contains('mk-del')) { const k = r.querySelector('input[type=file]').dataset.image; api.setImage(k, null); r.remove(); }
    else if (b.classList.contains('mk-up') && r.previousElementSibling) r.previousElementSibling.before(r);
    else if (b.classList.contains('mk-down') && r.nextElementSibling) r.nextElementSibling.after(r);
    if (api) api.render();
  });
  $('btn-add-msg').addEventListener('click', () => { const last = list.lastElementChild; addRow(last && last.querySelector('.mk-side').value === 'me' ? 'them' : 'me'); if (api) api.render(); list.lastElementChild.querySelector('.mk-text').focus(); });
  const seed = () => { list.innerHTML = ''; addRow('them'); addRow('me'); };
  seed();

  /* ── state ── */
  const v = (id) => $(id).value, on = (id) => $(id).checked;
  function state(S) {
    const p = v('opt-platform');
    return {
      images: S.images, platform: p, theme: v('opt-theme'), linear: !!LINEAR[p], name: v('ct-name').trim(), status: v('ct-status').trim() || PRESET_STATUS[p], me: v('me-name').trim() || 'You',
      statusbar: on('opt-statusbar'), time: v('opt-time').trim() || '9:41', battery: Number(v('opt-battery')), frame: on('opt-frame'), header: on('opt-header'), composer: on('opt-composer'), divider: v('opt-divider').trim(), typing: on('opt-typing'), credit: on('opt-credit'),
      msgs: [...list.children].map((r) => ({ me: r.querySelector('.mk-side').value === 'me', type: r.querySelector('.mk-type').value, text: r.querySelector('.mk-text').value, time: r.querySelector('.mk-time').value.trim(), status: r.querySelector('.mk-status').value, react: r.querySelector('.mk-react').value, img: S.images[r.querySelector('input[type=file]').dataset.image], dur: r.querySelector('.mk-dur').value.trim() || '0:14' }))
    };
  }

  /* ── pieces ── */
  const tick = (st, p) => { if (!TICKS[p]) return ''; const two = st !== 'sent', blue = st === 'read'; return `<svg class="mk-tick${blue ? ' is-read' : ''}" viewBox="0 0 18 12" width="17" height="11"><path d="M1 6.5l3.5 3.5L11 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${two ? '<path d="M7 6.5l3.5 3.5L17 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</svg>`; };
  const wave = (n = 28) => `<span class="mk-wave">${Array.from({ length: n }, (_, i) => `<i style="height:${4 + Math.round(10 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)))}px"></i>`).join('')}</span>`;
  const sbar = (S) => (S.statusbar ? `<div class="mk-statusbar"><span class="mk-sb-time">${M.esc(S.time)}</span><span class="mk-sb-right"><svg viewBox="0 0 18 12" width="18" height="12"><rect x="0" y="8" width="3" height="4" rx=".6" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx=".6" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx=".6" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx=".6" fill="currentColor"/></svg><svg viewBox="0 0 16 12" width="16" height="12"><path d="M8 11.5a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zM4.6 7.6a4.8 4.8 0 0 1 6.8 0l-1.1 1.1a3.3 3.3 0 0 0-4.6 0zM2 5a8.5 8.5 0 0 1 12 0l-1.1 1.1a7 7 0 0 0-9.8 0z" fill="currentColor"/></svg><span class="mk-batt"><i style="width:${Math.max(6, Math.round(S.battery * 0.18))}px" class="${S.battery <= 20 ? 'is-low' : ''}"></i></span></span></div>` : '');
  const header = (S, ic) => {
    if (!S.header) return '';
    const name = S.name || 'Contact', av = M.avatar(S, 'contact', name, S.platform === 'telegram' ? 38 : 34);
    if (S.platform === 'discord') return `<div class="mk-header"><span class="mk-hash">@</span><b>${M.esc(name)}</b></div>`;
    if (S.platform === 'slack') return `<div class="mk-header"><b>${M.esc(name)}</b><span class="mk-dot"></span><span class="mk-status">${M.esc(S.status)}</span></div>`;
    return `<div class="mk-header"><span class="mk-back">‹</span>${av}<div class="mk-hname"><b>${M.esc(name)}${S.platform === 'imessage' ? ' ›' : ''}</b>${S.status ? `<span class="mk-status">${M.esc(S.status)}</span>` : ''}</div><span class="mk-hicons">${S.platform === 'imessage' ? '' : '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 10l5-3v10l-5-3v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><svg viewBox="0 0 24 24" width="22" height="22"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.9 2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'}</span></div>`;
  };
  const composer = (S) => (S.composer ? `<div class="mk-composer"><span class="mk-plus">+</span><span class="mk-input">${S.platform === 'imessage' ? 'iMessage' : S.platform === 'whatsapp' ? 'Message' : S.platform === 'slack' ? `Message ${M.esc(S.name || 'channel')}` : S.platform === 'discord' ? `Message @${M.esc(S.name || 'user')}` : 'Message…'}</span><span class="mk-mic"><svg viewBox="0 0 24 24" width="20" height="20"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span></div>` : '');
  const body = (m, S) => {
    if (m.type === 'image') return m.img ? `<img class="mk-pic" src="${m.img.url}" alt=""/>` : `<span class="mk-pic mk-pic-empty">Upload a picture</span>`;
    if (m.type === 'voice') return `<span class="mk-voice"><span class="mk-play">▶</span>${wave()}<span class="mk-dur">${M.esc(m.dur)}</span></span>`;
    return m.text ? `<span class="mk-txt">${M.linkify(m.text)}</span>` : `<span class="mk-txt mk-ph">Type a message…</span>`;
  };
  function bubbles(S) {
    let html = '';
    S.msgs.forEach((m, i) => {
      const prev = S.msgs[i - 1], next = S.msgs[i + 1], first = !prev || prev.me !== m.me, last = !next || next.me !== m.me;
      const meta = `<span class="mk-meta">${m.time ? `<span class="mk-time">${M.esc(m.time)}</span>` : ''}${m.me ? tick(m.status, S.platform) : ''}</span>`;
      const seen = m.me && last && SEEN[S.platform] && m.status === 'read' ? `<span class="mk-seen">${M.avatar(S, 'contact', S.name || 'Contact', 14)}</span>` : '';
      const label = m.me && last && LABEL[S.platform] && (S.platform === 'android' || m.status !== 'sent') ? `<span class="mk-label">${m.status === 'read' ? 'Read' : m.status === 'delivered' ? 'Delivered' : 'Sent'}${S.platform === 'android' && m.time ? ' · ' + M.esc(m.time) : ''}</span>` : '';
      const av = !m.me && last && (S.platform === 'instagram' || S.platform === 'messenger') ? M.avatar(S, 'contact', S.name || 'Contact', 24, 'mk-bav') : (S.platform === 'instagram' || S.platform === 'messenger') && !m.me ? '<span class="mk-bav-spacer"></span>' : '';
      html += `<div class="mk-m ${m.me ? 'me' : 'them'} t-${m.type}${first ? ' first' : ''}${last ? ' last' : ''}">${av}<div class="mk-b">${body(m, S)}${meta}${m.react ? `<span class="mk-react">${m.react}</span>` : ''}</div>${seen}${label}</div>`;
    });
    if (S.typing) html += `<div class="mk-m them first last"><div class="mk-b mk-typing"><i></i><i></i><i></i></div></div>`;
    return html;
  }
  function linear(S) {
    let html = '', lastWho = null;
    S.msgs.forEach((m) => {
      const who = m.me ? S.me : (S.name || 'Contact'), key = m.me ? 'me' : 'contact', cont = lastWho === who; lastWho = who;
      html += `<div class="mk-l${cont ? ' cont' : ''}">${cont ? `<span class="mk-l-time">${M.esc(m.time)}</span>` : M.avatar(S, key, who, 40, 'mk-l-av')}<div class="mk-l-body">${cont ? '' : `<div class="mk-l-head"><b style="${S.platform === 'discord' ? `color:hsl(${m.me ? 210 : 330} 70% 65%)` : ''}">${M.esc(who)}</b><span class="mk-l-time">${M.esc(m.time || S.time)}</span></div>`}<div class="mk-l-text">${body(m, S)}</div>${m.react ? `<span class="mk-l-react">${m.react} 1</span>` : ''}</div></div>`;
    });
    if (S.typing) html += `<div class="mk-l-typing"><i></i><i></i><i></i> <b>${M.esc(S.name || 'Someone')}</b> is typing…</div>`;
    return html;
  }
  function render(S, ic) {
    const inner = S.linear ? linear(S) : bubbles(S);
    return `<div class="mk mk-chat p-${S.platform} ${S.theme}${S.frame ? ' framed' : ''}">${sbar(S)}${header(S, ic)}<div class="mk-body">${S.divider ? `<div class="mk-divider"><span>${M.esc(S.divider)}</span></div>` : ''}${inner}</div>${composer(S)}${M.credit(S.credit)}</div>`;
  }

  let api;
  M.mount({
    actionLabel: 'Export PNG', suffix: 'chat', width: () => 390,
    fmtRange: (el) => `${el.value}%`,
    state, render,
    summary: (S) => [S.statusbar && 'Status bar', S.typing && 'typing', `${v('opt-scale')}×`].filter(Boolean).join(' · '),
    onReset: () => { seed(); },
    bind: (a) => { api = a; $('opt-platform').addEventListener('change', () => [...list.children].forEach(syncRow)); }
  }).then((a) => { api = a; window.__cm = { api, state, addRow, list }; });
})();
