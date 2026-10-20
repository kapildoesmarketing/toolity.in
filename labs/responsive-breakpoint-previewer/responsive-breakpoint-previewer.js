/* Responsive Breakpoint Previewer — Toolity.in. HTML (pasted) or URL (fetched via web-common pageSource, <base href> injected)
 * → one sandboxed iframe per width, each laid out at the real CSS px size and scaled to fit; synced scroll via postMessage-free
 * polling of contentWindow when same-origin (srcdoc), landscape/dark-scheme toggles, open-full-size.
 * Designed by Kapil Pidhwani: no live framing of third-party URLs (X-Frame-Options) — a fetched snapshot is rendered instead. */
(function () {
  'use strict';
  const { mount, pageSource } = window.ToolityWeb, { toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const PRESETS = [[320, 'Phone S'], [375, 'iPhone'], [390, 'iPhone Pro'], [414, 'Phone L'], [768, 'Tablet'], [820, 'iPad'], [1024, 'Laptop'], [1280, 'Desktop'], [1440, 'Wide']];
  const DEFAULT_ON = new Set([375, 768, 1024, 1440]);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SAMPLE = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;background:Canvas;color:CanvasText}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #8884}
nav a{margin-left:16px;text-decoration:none;color:inherit}.burger{display:none}
.hero{padding:48px 20px;text-align:center}.hero h1{font-size:clamp(1.6rem,4vw,3rem);margin:0 0 10px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0 20px 40px}
.card{border:1px solid #8884;border-radius:12px;padding:18px}.card b{display:block;margin-bottom:6px}
@media (max-width:900px){.cards{grid-template-columns:1fr 1fr}}
@media (max-width:600px){.cards{grid-template-columns:1fr}nav{display:none}.burger{display:block}}
</style></head><body><header><strong>Acme</strong><nav><a href="#">Product</a><a href="#">Pricing</a><a href="#">Docs</a></nav><span class="burger">☰</span></header>
<section class="hero"><h1>Responsive sample</h1><p>Three cards on desktop, two on tablet, one on phones. Edit the CSS on the left.</p></section>
<section class="cards"><div class="card"><b>Fast</b>Runs in the browser.</div><div class="card"><b>Private</b>Nothing is uploaded.</div><div class="card"><b>Free</b>No account needed.</div></section></body></html>`;
  const S = { on: new Set(DEFAULT_ON), custom: [], doc: null, syncing: false };

  function chips() {
    const all = PRESETS.map(([w, l]) => ({ w, l })).concat(S.custom.map((w) => ({ w, l: 'Custom', custom: true })));
    $('rb-chips').innerHTML = all.map(({ w, l, custom }) => `<button type="button" class="rb-chip${S.on.has(w) ? ' is-on' : ''}" data-w="${w}" aria-pressed="${S.on.has(w)}" title="${l}">${w}<small>${custom ? '✕' : l}</small></button>`).join('');
  }
  function prepareDoc(page, dark) {
    let html = page.html;
    if (!/<html[\s>]/i.test(html)) html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`;
    const inject = `${page.baseUrl ? `<base href="${esc(page.baseUrl)}">` : ''}${dark ? '<style>:root{color-scheme:dark}</style>' : ''}`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inject) : html.replace(/<html[^>]*>/i, (m) => `${m}<head>${inject}</head>`);
    return html;
  }
  function render(api) {
    const widths = [...S.on].sort((a, b) => a - b), land = api.val('opt-landscape'), H = +api.val('opt-height'), scripts = api.val('opt-scripts'), host = $('rb-frames');
    host.innerHTML = widths.map((w) => { const fw = land ? H : w, fh = land ? w : H; return `<figure class="rb-frame" data-w="${fw}"><figcaption class="rb-cap"><b>${fw} × ${fh}</b><span>${(PRESETS.find((p) => p[0] === w) || [0, 'Custom'])[1]}</span><button type="button" class="rb-open" data-w="${fw}" data-h="${fh}" title="Open this width in a new tab" aria-label="Open ${fw} px wide in a new tab">⤢</button></figcaption><div class="rb-view"><iframe class="rb-iframe" width="${fw}" height="${fh}" title="Preview at ${fw} pixels" sandbox="allow-same-origin${scripts ? ' allow-scripts' : ''} allow-forms allow-popups" loading="lazy"></iframe></div></figure>`; }).join('');
    host.querySelectorAll('iframe').forEach((f) => { f.srcdoc = S.doc; });
    requestAnimationFrame(() => requestAnimationFrame(fit)); bindSync(api);
  }
  function fit() {
    const host = $('rb-frames'), frames = [...host.querySelectorAll('.rb-frame')]; if (!frames.length) return;
    const gap = 14, avail = host.clientWidth; if (!avail) return; const total = frames.reduce((a, f) => a + +f.dataset.w, 0) + gap * (frames.length - 1);
    const k = Math.min(1, avail / total); // one scale for all so relative sizes stay honest
    frames.forEach((f) => { const w = +f.dataset.w, ifr = f.querySelector('iframe'), view = f.querySelector('.rb-view'); ifr.style.transform = `scale(${k})`; view.style.width = `${w * k}px`; view.style.height = `${+ifr.getAttribute('height') * k}px`; f.style.width = `${Math.max(w * k, 120)}px`; });
    host.classList.toggle('is-tiny', k < 0.28);
  }
  function bindSync(api) {
    if (!api.val('opt-sync')) return;
    const frames = [...$('rb-frames').querySelectorAll('iframe')];
    frames.forEach((f) => f.addEventListener('load', () => { try { f.contentWindow.addEventListener('scroll', () => { if (S.syncing) return; S.syncing = true; const d = f.contentDocument.documentElement, p = d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight); frames.forEach((o) => { if (o !== f) { try { const e = o.contentDocument.documentElement; e.scrollTop = p * (e.scrollHeight - e.clientHeight); } catch (x) { /* not loaded */ } } }); requestAnimationFrame(() => { S.syncing = false; }); }, { passive: true }); } catch (e) { /* cross-origin */ } }));
  }

  mount({
    slug: 'responsive-breakpoint-previewer', debounce: 400, busyLabel: 'Fetching…',
    ready: (api) => pageSource.ready(api, 'Preview'),
    summary: ({ val }) => `${val('opt-landscape') ? 'Landscape' : 'Portrait'} · ${val('opt-dark') ? 'dark' : 'light'} · ${val('opt-sync') ? 'synced scroll' : 'independent scroll'}`,
    async run(api) {
      const page = await pageSource.load(api);
      S.doc = prepareDoc(page, api.val('opt-dark')); render(api);
      const n = S.on.size, kb = Math.round(S.doc.length / 1024);
      return { text: S.doc, ext: 'html', mime: 'text/html', badge: `${n} width${n === 1 ? '' : 's'} · ${kb} KB`, note: page.via === 'pasted' ? `Pasted HTML · ${n} frames` : `Fetched via ${page.via}${page.status ? ` (HTTP ${page.status})` : ''} · ${n} frames`, ok: true, copyMsg: 'HTML copied' };
    },
    onReset() { S.on = new Set(DEFAULT_ON); S.custom = []; S.doc = null; chips(); $('rb-frames').innerHTML = ''; }
  });
  const api = window.ToolityWebTool, rerun = () => { if (S.doc) { render(api); } };
  chips();
  $('rb-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; const w = +b.dataset.w; if (S.custom.includes(w)) { S.custom = S.custom.filter((x) => x !== w); S.on.delete(w); } else if (S.on.has(w)) { if (S.on.size > 1) S.on.delete(w); } else S.on.add(w); chips(); rerun(); if (S.doc) $('output-badge').textContent = `${S.on.size} widths`; });
  $('opt-custom').addEventListener('change', (e) => { const w = Math.round(+e.target.value); if (w >= 200 && w <= 3000 && !S.custom.includes(w) && !PRESETS.some((p) => p[0] === w)) { S.custom.push(w); S.on.add(w); chips(); rerun(); } e.target.value = ''; e.stopPropagation(); });
  $('opt-custom').addEventListener('input', (e) => e.stopPropagation());
  $('rb-frames').addEventListener('click', (e) => { const b = e.target.closest('.rb-open'); if (!b || !S.doc) return; const w = window.open('', '_blank', `width=${+b.dataset.w + 16},height=${+b.dataset.h + 80}`); if (!w) return toast('Allow pop-ups to open the frame'); w.document.open(); w.document.write(S.doc); w.document.close(); });
  $('btn-sample').addEventListener('click', () => { $('html-input').value = SAMPLE; $('html-input').dispatchEvent(new Event('input', { bubbles: true })); });
  addEventListener('resize', fit); if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('rb-frames'));
  window.__rb = { S, PRESETS, prepareDoc, SAMPLE, fit };
})();
