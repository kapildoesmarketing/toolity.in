/* Toolity.in — shared mockup runtime (window.ToolityMockup). Form-driven tools (Chat Mockup, Social Post Mockups): read the form →
 * T.render(state) returns HTML → live preview in #mockup-stage → export = that exact node serialised into an SVG <foreignObject>
 * with /styles/tools/mockup.css inlined → <img> (data: URL, so the canvas is not tainted) → PNG at 1×/2×/3×. Brand marks come from
 * the Iconify API (CORS-enabled, same system as the site's icons) and are inlined as <svg> so they survive export.
 * Designed by Kapil Pidhwani: fonts are the system UI stack (what the real apps use), so nothing has to be embedded. Ceiling: Safari
 * < 16 can mis-render foreignObject images with some CSS (filters/backdrop) — the mockup CSS avoids those. All on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const ICON_API = 'https://api.iconify.design';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl2br = (s) => esc(s).replace(/\n/g, '<br/>');
  const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const fileToDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  /* downscale big uploads so the export SVG stays small (max 1200 px on the long side) */
  async function shrink(file, max = 1200) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
    return { url: c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height };
  }

  /* icons(['logos:whatsapp-icon', 'simple-icons:imessage']) → { 'logos:whatsapp-icon': '<svg …>' } (cached, one request per prefix) */
  const iconCache = {};
  async function icons(names) {
    const byPrefix = {}; names.forEach((n) => { if (iconCache[n]) return; const [p, i] = n.split(':'); (byPrefix[p] = byPrefix[p] || []).push(i); });
    await Promise.all(Object.entries(byPrefix).map(async ([p, list]) => {
      try {
        const j = await (await fetch(`${ICON_API}/${p}.json?icons=${list.join(',')}`)).json();
        for (const [i, d] of Object.entries(j.icons || {})) { const w = d.width || j.width || 24, h = d.height || j.height || 24; iconCache[`${p}:${i}`] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.left || 0} ${d.top || 0} ${w} ${h}" width="${w}" height="${h}">${d.body}</svg>`; }
      } catch (e) { /* offline: callers fall back to a text glyph */ }
    }));
    return Object.fromEntries(names.map((n) => [n, iconCache[n] || '']));
  }
  const svgRecolor = (svg, color) => svg.replace(/currentColor/g, color);

  /* mount({ actionLabel, suffix, icons: [...], width(S) → css px, render(S, ic) → html, state() → S, onReset(), summary(S), bind(api) }) */
  async function mount(T) {
    const card = $('tool-card'), stage = $('mockup-stage'), outEmpty = $('output-empty');
    const S = { out: null, outUrl: '', outW: 0, outH: 0, busy: false, images: {} };
    const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { $('progress-fill').style.width = `${Math.round((p || 0) * 100)}%`; $('btn-compress-label').textContent = label || T.actionLabel; };
    const panel = document.querySelector('.tool-settings-panel');
    const paintBadges = () => card.querySelectorAll('input[type="range"]').forEach((el) => { const b = $(`${el.id}-val`); if (b) b.textContent = T.fmtRange ? T.fmtRange(el) : el.value; });
    let css = '', ic = {};
    // first paint doesn't wait on the network: CSS text is only needed at export, icons re-render when they arrive
    const cssReady = fetch('/styles/tools/mockup.css').then((r) => r.text()).then((t) => { css = t; }).catch(() => {});
    icons(T.icons || []).then((r) => { ic = r; if (Object.keys(r).some((k) => r[k])) render(); });

    let timer = 0, state = null;
    function render() {
      state = T.state(S);
      stage.innerHTML = T.render(state, ic);
      stage.style.width = `${T.width(state)}px`;
      stage.classList.add('is-shown'); outEmpty.hidden = true;
      paintBadges(); if (T.summary && $('settings-summary')) $('settings-summary').textContent = T.summary(state);
      $('output-badge').textContent = `${T.width(state)} × ${Math.round(stage.getBoundingClientRect().height)} css px · live`;
      $('btn-compress').disabled = false;
      S.out = null; $('btn-download').disabled = true; $('btn-copy').disabled = true; // export is per snapshot
    }
    const queue = () => { clearTimeout(timer); timer = setTimeout(render, 120); };
    card.addEventListener('input', (e) => { if (e.target.type !== 'file') queue(); });
    card.addEventListener('change', (e) => { if (e.target.type !== 'file') queue(); });
    // image inputs: any <input type=file data-image="key"> inside the card stores a data URL in S.images[key]
    card.addEventListener('change', async (e) => {
      const inp = e.target; if (inp.type !== 'file' || !inp.dataset.image) return;
      const f = inp.files && inp.files[0]; if (!f) return;
      if (!f.type.startsWith('image/')) return toast('Pick an image file');
      try { S.images[inp.dataset.image] = await shrink(f); inp.value = ''; render(); } catch (err) { toast('Could not read that image'); }
    });
    const setImage = (key, val) => { if (val) S.images[key] = val; else delete S.images[key]; render(); };

    /* export: serialise the live node + inlined CSS into SVG → PNG */
    async function run() {
      if (S.busy) return;
      S.busy = true; setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Rendering…'); showError('');
      try {
        await cssReady;
        const scale = Number(($('opt-scale') && $('opt-scale').value) || 2), node = stage.firstElementChild;
        const w = T.width(state), h = Math.ceil(node.getBoundingClientRect().height);
        const xhtml = new XMLSerializer().serializeToString(node); // XML serialisation: void elements come out self-closed, xmlns added
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}"><foreignObject width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" class="mk-root"><style>${css}</style>${xhtml}</div></foreignObject></svg>`;
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('The browser could not rasterise the mockup. Try a smaller image attachment.')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
        const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
        progress(0.8, 'Encoding…');
        const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png'));
        if (S.outUrl) URL.revokeObjectURL(S.outUrl);
        S.out = blob; S.outUrl = URL.createObjectURL(blob); S.outW = c.width; S.outH = c.height;
        $('output-badge').textContent = `${c.width} × ${c.height} · PNG · ${formatBytes(blob.size)}`; $('result-badge').textContent = `Exported @${scale}×`;
        $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1, T.actionLabel);
      } catch (e) { console.warn(e); showError(e.message || 'Export failed'); $('result-badge').textContent = 'Failed'; progress(0); }
      finally { S.busy = false; setBusy(card, false); $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 600); }
    }
    $('btn-compress').addEventListener('click', run);
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, `${T.suffix}-${state && state.platform || 'mockup'}.png`));
    $('btn-copy').addEventListener('click', () => S.out && copyBlob(S.out));
    function reset() {
      card.querySelectorAll('input, select, textarea').forEach((el) => { if (el.type === 'file') el.value = ''; else if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value; else el.value = el.defaultValue; });
      S.images = {}; if (S.outUrl) URL.revokeObjectURL(S.outUrl); S.out = null; S.outUrl = '';
      if (T.onReset) T.onReset(S); render(); $('result-badge').textContent = 'Live preview'; toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: run, reset });
    const api = { S, render, run, reset, setImage, showError, stage, ic };
    if (T.bind) T.bind(api);
    render(); $('result-badge').textContent = 'Live preview';
    return api;
  }

  /* bits shared by both mockup tools */
  const avatar = (S, key, name, size, cls = '') => (S.images[key] ? `<img class="mk-avatar ${cls}" src="${S.images[key].url}" style="width:${size}px;height:${size}px" alt=""/>` : `<span class="mk-avatar mk-avatar-ini ${cls}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;background:hsl(${hue(name)} 55% 55%)">${esc(initials(name))}</span>`);
  const credit = (on) => (on ? `<div class="mk-credit">Made with Toolity.in</div>` : '');
  const check = (filled, color) => `<svg class="mk-verified" viewBox="0 0 24 24" width="16" height="16"><path fill="${color}" d="M12 1.5l2.6 2.1 3.3-.5 1.2 3.1 3 1.6-.8 3.2L23 13.6l-2.4 2.3.3 3.3-3.3.7-1.6 2.9-3.1-1.2-2.9 1.6-2-2.6-3.3-.3-.2-3.3L1.5 15l1.4-3-1.4-3 2.9-1.6.5-3.3 3.3.2 2-2.7z"/><path fill="${filled ? '#fff' : color}" d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.7-5.7 1.4 1.4z"/></svg>`;
  const fmtNum = (n) => { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n); };
  const linkify = (text) => nl2br(text).replace(/(^|\s)(@[\w.]+|#[\w]+)/g, '$1<span class="mk-link">$2</span>').replace(/(https?:\/\/[^\s<]+)/g, '<span class="mk-link">$1</span>');

  window.ToolityMockup = { mount, icons, esc, nl2br, initials, avatar, credit, check, fmtNum, linkify, svgRecolor, fileToDataUrl };
})();
