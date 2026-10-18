/* Designed by Kapil Pidhwani: Countdown Page Maker — a builder for the existing Countdown widget embed, which already renders a
 * full-viewport, styleable countdown from URL params. This page only composes that URL (so there is zero second copy of the
 * clock), previews it in an iframe, and adds the sharing layer: copy link, QR (qr-engine), share chips, .ics calendar file.
 * Ceiling: state lives in the URL (≈ 300 chars); the widget caps title/message at 80 chars. zonedMs mirrors widget-common
 * (8 lines) rather than loading that whole runtime here. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const ORIGIN = location.origin.startsWith('http') ? location.origin : 'https://toolity.in';
  const DEF = { variant: 'flip', theme: 'auto', font: 'sans', accent: 'f4511e', size: 'md' };
  const hex = (v) => { const m = /^#?([0-9a-f]{6})$/i.exec((v || '').trim()); return m ? m[1].toLowerCase() : ''; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function zonedMs(str, tz) { // wall-clock in tz → epoch ms (same algorithm as widget-common)
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(str || ''); if (!m) return NaN;
    const [Y, M, D, h, mi] = [+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0)];
    if (!tz || tz === 'local') return new Date(Y, M - 1, D, h, mi).getTime();
    const guess = Date.UTC(Y, M - 1, D, h, mi), p = {};
    for (const x of new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(guess))) p[x.type] = x.value;
    return guess - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - guess);
  }
  const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = (j, url) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Toolity.in//Countdown Page Maker//EN', 'BEGIN:VEVENT', `UID:${icsDate(j.ms)}-${Math.random().toString(36).slice(2, 8)}@toolity.in`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(j.ms)}`, `DTEND:${icsDate(j.ms + 3600000)}`, `SUMMARY:${(j.title || 'Countdown').replace(/[,;\\]/g, '\\$&')}`, `DESCRIPTION:Countdown page: ${url}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
  function drawQr(cv, text) {
    const qr = new QRCodeGenerator(0, QRErrorCorrectLevel.M); // globals from /scripts/qr-engine.js (const bindings, not window props) qr.addData(text); qr.make();
    const n = qr.getModuleCount(), size = 640, q = 2, cell = size / (n + q * 2), g = cv.getContext('2d');
    cv.width = size; cv.height = size; g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(Math.floor((c + q) * cell), Math.floor((r + q) * cell), Math.ceil(cell), Math.ceil(cell));
  }
  const SHARE = (u, t) => [['WhatsApp', 'lucide:message-circle', `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}`], ['X', 'lucide:twitter', `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`], ['LinkedIn', 'lucide:linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`], ['Email', 'lucide:mail', `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`]];

  function build(val, pill) {
    const title = val('cd-title').trim(), to = val('cd-to'), tz = val('cd-tz'), done = val('cd-done').trim();
    const sp = new URLSearchParams();
    if (title) sp.set('title', title); if (to) sp.set('to', to); if (tz && tz !== 'local') sp.set('tz', tz); if (done) sp.set('done', done);
    const variant = pill('seg-variant') || 'flip', theme = val('cd-theme'), font = val('cd-font'), accent = hex(val('cd-accent-input')), bg = hex(val('cd-bg-input')); // text field is the source of truth; the picker only fills it
    if (variant !== DEF.variant) sp.set('variant', variant); if (theme !== DEF.theme) sp.set('theme', theme); if (font !== DEF.font) sp.set('font', font);
    if (accent && accent !== DEF.accent) sp.set('accent', accent); if (bg) sp.set('bg', bg);
    sp.set('size', 'lg');
    for (const k of ['days', 'hours', 'minutes', 'seconds', 'badge']) if (!val(`opt-${k}`)) sp.set(k, '0');
    return { url: `${ORIGIN}/widgets/countdown/embed/?${sp}`, title, to, tz, ms: zonedMs(to, tz), params: sp.toString() };
  }
  let lastUrl = '';
  const api = mount({
    slug: 'countdown-page-maker', debounce: 300,
    ready: ({ val }) => (val('cd-title').trim() || val('cd-to') ? true : 'Name the event and pick a date'),
    summary: ({ val }) => [['days', 'hours', 'minutes', 'seconds'].filter((k) => val(`opt-${k}`)).join(' · ') || 'no units', val('opt-badge') ? 'Toolity badge' : 'no badge'].join(' · '),
    onInput: (el, { $ }) => { if (el.id.endsWith('-pick')) $(el.id.replace('-pick', '-input')).value = el.value; },
    run: ({ $, val, pill }) => {
      const j = build(val, pill), label = j.title || 'Countdown';
      if (j.to && isNaN(j.ms)) throw new Error('Pick a valid date and time.');
      if (j.url !== lastUrl) { $('cd-frame').src = j.url; lastUrl = j.url; }
      $('cd-link').value = j.url; $('cd-open').href = j.url;
      drawQr($('cd-qr'), j.url);
      $('cd-share-links').innerHTML = SHARE(j.url, label).map(([n, i, h]) => `<a class="web-tag cd-chip" href="${esc(h)}" target="_blank" rel="noopener"><iconify-icon icon="${i}" width="13" height="13"></iconify-icon>${n}</a>`).join('');
      const left = j.ms - Date.now(), days = Math.floor(Math.abs(left) / 864e5);
      history.replaceState(null, '', '#' + j.params); // deep link to this builder state, no history spam
      return { text: j.url, ext: 'txt', j, badge: j.to ? (left > 0 ? `${days} day${days === 1 ? '' : 's'} to go` : `${days} day${days === 1 ? '' : 's'} ago`) : 'no date yet', note: j.to ? 'Page ready' : 'Add a date', ok: !!j.to, copyMsg: 'Link copied' };
    },
    download: async (fmt, { S }) => {
      const j = S.out.j;
      if (fmt === 'ics') { if (isNaN(j.ms)) throw new Error('Pick a date first.'); return { text: ics(j, j.url), name: `${(j.title || 'countdown').replace(/[^\w-]+/g, '-').toLowerCase()}.ics`, mime: 'text/calendar;charset=utf-8' }; }
      if (fmt === 'qr') return { blob: await new Promise((r) => api.$('cd-qr').toBlob(r, 'image/png')), name: 'countdown-qr.png' };
      return { text: j.url, name: 'countdown-link.txt' };
    },
    onReset: ({ $ }) => { $('cd-frame').removeAttribute('src'); lastUrl = ''; $('cd-link').value = ''; $('cd-share-links').innerHTML = ''; $('cd-qr').getContext('2d').clearRect(0, 0, 640, 640); $('cd-accent-pick').value = '#F4511E'; history.replaceState(null, '', location.pathname); }
  });
  /* Time zones (native list) + reopen a builder link (#params) */
  const tz = api.$('cd-tz'); try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone, common = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    const g1 = document.createElement('optgroup'); g1.label = 'Common'; const g2 = document.createElement('optgroup'); g2.label = 'All zones';
    common.forEach((z) => g1.append(new Option(z === local ? `${z} (your zone)` : z, z)));
    for (const z of Intl.supportedValuesOf('timeZone')) if (!common.includes(z)) g2.append(new Option(z === local ? `${z} (your zone)` : z, z)); // Chrome lists ICU names (Asia/Calcutta) — Kolkata lives in Common
    tz.append(g1, g2);
  } catch (e) { /* older browser: local only */ }
  if (location.hash.length > 1) {
    const h = new URLSearchParams(location.hash.slice(1)), set = (id, k, d) => { if (h.has(k)) api.$(id).value = h.get(k); else if (d !== undefined) api.$(id).value = d; };
    set('cd-title', 'title'); set('cd-to', 'to'); set('cd-tz', 'tz'); set('cd-done', 'done'); set('cd-theme', 'theme'); set('cd-font', 'font');
    if (h.get('accent')) { api.$('cd-accent-input').value = '#' + h.get('accent'); api.$('cd-accent-pick').value = '#' + h.get('accent'); } if (h.get('bg')) api.$('cd-bg-input').value = '#' + h.get('bg');
    for (const k of ['days', 'hours', 'minutes', 'seconds', 'badge']) if (h.get(k) === '0') api.$(`opt-${k}`).checked = false;
    const v = api.card.querySelector(`#seg-variant [data-value="${h.get('variant') || 'flip'}"]`); if (v) v.click(); else api.run();
  }
})();
