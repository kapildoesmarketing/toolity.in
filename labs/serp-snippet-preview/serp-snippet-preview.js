/* Designed by Kapil Pidhwani: SERP Snippet Preview. Fields are live; Import (primary button) pulls title / description /
 * canonical from a live page via the shared fetch-or-paste helper (pageSource), then the normal live render runs.
 * Widths are measured with canvas measureText in Arial at Google's sizes (20 px title, 14 px description) and cut at the
 * last word that fits — the same approach Google's own tooling takes. Limits (desktop / mobile): title 600 / 920 px,
 * description 920 / 1300 px — accurate for 2026, revisit when Google changes layout. PNG export redraws the card on a
 * canvas (2×). The 12-line measure helper is duplicated in Meta Tag Generator on purpose (keeps web-common untouched). */
(function () {
  'use strict';
  const { mount, parseMeta, pageSource } = window.ToolityWeb;
  const LIM = { desktop: { title: 600, desc: 920 }, mobile: { title: 920, desc: 1300 } };
  const ctx = document.createElement('canvas').getContext('2d');
  const width = (s, px) => { ctx.font = `${px}px Arial, Helvetica, sans-serif`; return ctx.measureText(s).width; };
  function fit(s, px, max) { // → { text, cut } — cut at the last word boundary that fits with the ellipsis
    if (width(s, px) <= max) return { text: s, cut: false };
    const ell = ' ...'; let lo = 0, hi = s.length;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (width(s.slice(0, mid) + ell, px) <= max) lo = mid; else hi = mid - 1; }
    const sp = s.lastIndexOf(' ', lo); return { text: s.slice(0, sp > lo * 0.6 ? sp : lo).trimEnd() + ell, cut: true };
  }
  const meter = ($, id, s, px, max) => { const w = width(s, px), pct = Math.min(100, (w / max) * 100); $(id).style.width = pct + '%'; $(id).className = w > max ? 'is-over' : w > max * 0.9 ? 'is-near' : ''; $(id + '-val').textContent = `${Math.round(w)} / ${max} px`; return w; };
  const crumb = (u) => { try { const x = new URL(u); const parts = x.pathname.split('/').filter(Boolean).map(decodeURIComponent); return { host: x.hostname.replace(/^www\./, ''), path: parts.length ? ' › ' + parts.join(' › ') : '', origin: x.origin }; } catch (e) { return { host: u.replace(/^https?:\/\//, '').split('/')[0] || 'example.com', path: '', origin: '' }; } };
  const fmtDate = (d) => { const x = new Date(d + 'T00:00:00'); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' — '; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function render(api) {
    const { $, val, pill } = api, dev = pill('seg-device') || 'desktop', L = LIM[dev];
    const title = val('f-title').trim(), desc = val('f-desc').trim().replace(/\s+/g, ' '), url = val('f-url').trim(), date = val('f-date') ? fmtDate(val('f-date')) : '';
    const c = crumb(url || 'https://example.com/');
    const t = fit(title || 'Page title', 20, L.title), d = fit(date + (desc || 'Google will pick text from the page when no description is set.'), 14, L.desc);
    $('output-card').dataset.device = dev;
    $('serp-name').textContent = c.host; $('serp-url').textContent = c.host + c.path;
    $('serp-title').textContent = t.text; $('serp-date').textContent = ''; $('serp-desc-text').textContent = d.text;
    const fav = $('serp-fav-img'), showFav = val('opt-favicon') && c.origin;
    if (showFav && fav.dataset.origin !== c.origin) { fav.dataset.origin = c.origin; fav.hidden = true; $('serp-fav-fb').hidden = false; fav.onload = () => { fav.hidden = false; $('serp-fav-fb').hidden = true; }; fav.onerror = () => { fav.hidden = true; $('serp-fav-fb').hidden = false; }; fav.src = c.origin + '/favicon.ico'; }
    if (!showFav) { fav.hidden = true; $('serp-fav-fb').hidden = false; delete fav.dataset.origin; fav.removeAttribute('src'); }
    const tw = meter($, 'm-title', title, 20, L.title), dw = meter($, 'm-desc', date + desc, 14, L.desc);
    $('f-title-count').textContent = `${title.length} chars · ${Math.round(tw)} px`; $('f-desc-count').textContent = `${desc.length} chars · ${Math.round(dw)} px`;
    const issues = [];
    if (!title) issues.push(['warn', 'No title']); else if (t.cut) issues.push(['fail', `Title truncated on ${dev} — shorten to ${L.title} px`]); else if (tw < L.title * 0.4) issues.push(['warn', 'Title is short — there is room for more context']);
    if (!desc) issues.push(['warn', 'No description — Google will write its own']); else if (d.cut) issues.push(['warn', `Description truncated on ${dev}`]);
    if (desc && desc.length < 70) issues.push(['warn', 'Description under 70 characters — consider a fuller sentence']);
    if (!url) issues.push(['warn', 'Add the page URL to see the breadcrumb']);
    if (!issues.length) issues.push(['pass', `Fits ${dev} limits`]);
    $('output-issues').innerHTML = issues.map(([k, s]) => `<span class="web-tag ${k}">${esc(s)}</span>`).join('');
    return { text: `${title}\n${desc}`, ext: 'txt', snap: { c, t: t.text, d: d.text, dev }, badge: `Title ${Math.round(tw)}/${L.title} px · Desc ${Math.round(dw)}/${L.desc} px`, note: issues.some((i) => i[0] === 'fail') ? 'Truncated' : 'Fits', ok: !issues.some((i) => i[0] === 'fail'), copyMsg: 'Title and description copied' };
  }
  function png(snap) {
    const W = snap.dev === 'mobile' ? 400 : 652, pad = 16, scale = 2, cv = document.createElement('canvas'), g = cv.getContext('2d');
    const wrap = (s, px, max) => { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (width(t, px) > max && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
    const tl = wrap(snap.t, 20, W - pad * 2), dl = wrap(snap.d, 14, W - pad * 2), H = pad * 2 + 36 + tl.length * 26 + 8 + dl.length * 22;
    cv.width = W * scale; cv.height = H * scale; g.scale(scale, scale);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e2e8f0'; g.beginPath(); g.arc(pad + 13, pad + 13, 13, 0, Math.PI * 2); g.fill();
    g.font = '14px Arial'; g.fillStyle = '#202124'; g.fillText(snap.c.host, pad + 34, pad + 10);
    g.font = '12px Arial'; g.fillStyle = '#4d5156'; g.fillText(snap.c.host + snap.c.path, pad + 34, pad + 26);
    let y = pad + 36 + 18; g.font = '20px Arial'; g.fillStyle = '#1a0dab'; tl.forEach((l) => { g.fillText(l, pad, y); y += 26; });
    y += 2; g.font = '14px Arial'; g.fillStyle = '#4d5156'; dl.forEach((l) => { g.fillText(l, pad, y); y += 22; });
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  const api = mount({
    slug: 'serp-snippet-preview', busyLabel: 'Importing…', debounce: 100,
    ready: (a) => {
      if (a.S.go && (a.val('url-input').trim() || a.val('html-input').trim())) return pageSource.ready(a, 'Import');
      return a.val('f-title').trim() || a.val('f-desc').trim() || a.val('f-url').trim() ? true : 'Type a title or import a page';
    },
    summary: ({ val }) => [val('opt-favicon') ? 'favicon from site' : 'no favicon', val('html-input').trim() ? 'pasted HTML' : 'no pasted HTML'].join(' · '),
    run: (a) => {
      if (!(a.S.go && (a.val('url-input').trim() || a.val('html-input').trim()))) return render(a);
      return pageSource.load(a).then((src) => {
        const m = parseMeta(src.html, src.baseUrl), $ = a.$;
        $('f-title').value = m.title || m.og['og:title'] || ''; $('f-desc').value = m.description || m.og['og:description'] || '';
        $('f-url').value = m.canonical || m.og['og:url'] || src.finalUrl || '';
        const pub = m.metas.find((x) => /^article:published_time$|^date$|^dc\.date/i.test(x.key)); $('f-date').value = pub && /^\d{4}-\d{2}-\d{2}/.test(pub.value) ? pub.value.slice(0, 10) : '';
        a.toast(`Imported from ${src.via === 'pasted' ? 'pasted HTML' : 'the page'}`);
        return render(a);
      });
    },
    download: async (fmt, { S }) => (fmt === 'png' ? { blob: await png(S.out.snap), name: `serp-${S.out.snap.dev}.png` } : { text: S.out.text, ext: 'txt' }),
    filename: () => 'serp-snippet',
    onReset: ({ $ }) => { ['f-title-count', 'f-desc-count', 'output-issues'].forEach((id) => { $(id).textContent = ''; }); $('serp-fav-img').removeAttribute('src'); delete $('serp-fav-img').dataset.origin; }
  });
  /* Prefill from the Meta Tag Generator hand-off: #t=…&d=…&u=… */
  if (location.hash.length > 1) {
    const h = new URLSearchParams(location.hash.slice(1)), set = (id, k) => { if (h.get(k)) api.$(id).value = h.get(k); };
    set('f-title', 't'); set('f-desc', 'd'); set('f-url', 'u'); history.replaceState(null, '', location.pathname); api.run();
  }
})();
