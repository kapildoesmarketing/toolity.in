/* Designed by Kapil Pidhwani: Chat Bubble widget (scripts/widgets/chat-bubble.js) — a message, quote or testimonial rendered as
 * chat bubbles in iMessage / WhatsApp / Telegram / Messenger / Instagram / Slack / plain colours. Shared by /widgets/chat-bubble/
 * (builder) and /widgets/chat-bubble/embed/. One bubble per line; a leading ">" puts the line on the right ("me").
 * Ceiling: text only (no images/reactions) — that is the Chat Mockup tool's job. */
(function () {
  'use strict';
  const SCHEMA = [
    { key: 'msgs',     type: 'text', multiline: true, maxLength: 600, default: 'Hey! Welcome to my page 👋\n> Thanks — love the setup!', id: 'opt-msgs', label: 'Messages' },
    { key: 'name',     type: 'text', maxLength: 40, default: '',           id: 'opt-name',     label: 'Sender name' },
    { key: 'avatar',   type: 'text', maxLength: 4,  default: '',           id: 'opt-avatar',   label: 'Avatar' },
    { key: 'platform', type: 'enum', default: 'imessage', options: ['imessage', 'whatsapp', 'telegram', 'messenger', 'instagram', 'slack', 'plain'], id: 'opt-platform', label: 'Style' },
    { key: 'time',     type: 'text', maxLength: 24, default: '',           id: 'opt-time',     label: 'Time label' },
    { key: 'typing',   type: 'bool', default: false, id: 'opt-typing', label: 'Typing indicator' },
    { key: 'tails',    type: 'bool', default: true,  id: 'opt-tails',  label: 'Bubble tails' }
  ];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const parseLines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12).map((l) => ({ me: l.startsWith('>'), text: l.replace(/^>\s*/, '') })).filter((m) => m.text);
  const validate = (state) => (parseLines(state.msgs).length ? '' : 'Type at least one message line.');

  function render(root, state) {
    root.innerHTML = '';
    const msgs = parseLines(state.msgs), wrap = el('div', 'w-card-wrap w-chat-wrap'), card = el('div', `w-chat p-${state.platform}${state.tails ? ' has-tails' : ''}`);
    card.setAttribute('role', 'figure'); card.setAttribute('aria-label', `${state.name ? state.name + ': ' : ''}${msgs.map((m) => m.text).join(' / ')}`);
    const slack = state.platform === 'slack';
    const avatar = () => { const a = el('span', 'w-chat-avatar', state.avatar || (state.name ? state.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '•')); a.setAttribute('aria-hidden', 'true'); return a; };
    msgs.forEach((m, i) => {
      const prev = msgs[i - 1], next = msgs[i + 1], first = !prev || prev.me !== m.me, last = !next || next.me !== m.me;
      const row = el('div', `w-chat-row ${m.me ? 'me' : 'them'}${first ? ' first' : ''}${last ? ' last' : ''}`);
      if (!m.me && (slack || (state.avatar || state.name))) { row.appendChild(last || slack ? avatar() : el('span', 'w-chat-avatar is-ghost')); }
      const col = el('div', 'w-chat-col');
      if (first && !m.me && state.name) { const h = el('div', 'w-chat-name', state.name); if (slack && state.time) h.appendChild(el('span', 'w-chat-time-inline', state.time)); col.appendChild(h); }
      col.appendChild(el('div', 'w-chat-b', m.text));
      row.appendChild(col); card.appendChild(row);
    });
    if (state.typing) { const row = el('div', 'w-chat-row them first last is-typing'); if (slack || state.avatar || state.name) row.appendChild(avatar()); const b = el('div', 'w-chat-b w-chat-typing'); for (let i = 0; i < 3; i++) b.appendChild(el('i')); b.setAttribute('aria-label', `${state.name || 'Someone'} is typing`); const col = el('div', 'w-chat-col'); col.appendChild(b); row.appendChild(col); card.appendChild(row); }
    if (state.time && !slack) card.appendChild(el('div', 'w-chat-time', state.time));
    wrap.appendChild(card); root.appendChild(wrap);
    return () => {};
  }
  window.__chat = { parseLines, SCHEMA };
  if (window.ToolityWidgets) window.ToolityWidgets.register({ slug: 'chat-bubble', title: 'Chat Bubble', height: 220, schema: SCHEMA, validate, render });
})();
