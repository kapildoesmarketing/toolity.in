/* Designed by Kapil Pidhwani: Text to Handwriting. Pages are canvases at 200 dpi (A4 = 1654×2339); text is laid out word-wrapped
 * on ruled lines and drawn character by character so each glyph can get its own rotation / baseline / ink-alpha jitter from a
 * seeded PRNG (stable while typing). Handwriting fonts come from Google Fonts (one stylesheet, families fetched on first use)
 * or a user .ttf/.otf via FontFace — nothing leaves the tab. Exports: PNG (canvas), ZIP of PNGs (JSZip, already on site),
 * PDF (jsPDF, loaded on demand; pages embedded as JPEG at true paper size). Ceilings: Latin-centric preset fonts; canvas
 * letterSpacing/wordSpacing need Chrome 99+/Safari 16.4+/Firefox 124+ (older browsers ignore them); whole document is
 * re-rendered on every change (fine up to ~50 pages). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const DPI = 200, S = DPI / 96;
  const PAGES = { a4: [1654, 2339, 210, 297], letter: [1700, 2200, 215.9, 279.4], a5: [1166, 1654, 148, 210] };
  const MARGIN = { narrow: 0.5, normal: 0.75, wide: 1 };
  const FAM = { caveat: 'Caveat', 'homemade-apple': 'Homemade Apple', 'indie-flower': 'Indie Flower', 'shadows-into-light': 'Shadows Into Light', 'reenie-beanie': 'Reenie Beanie', kalam: 'Kalam', 'patrick-hand': 'Patrick Hand', 'dancing-script': 'Dancing Script', 'gloria-hallelujah': 'Gloria Hallelujah', 'nothing-you-could-do': 'Nothing You Could Do', zeyada: 'Zeyada', 'liu-jian-mao-cao': 'Liu Jian Mao Cao', custom: 'HW Custom' };
  const GF = 'https://fonts.googleapis.com/css2?' + Object.values(FAM).filter((f) => f !== 'HW Custom').map((f) => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap';
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  if (!document.getElementById('hw-gf')) { const l = document.createElement('link'); l.id = 'hw-gf'; l.rel = 'stylesheet'; l.href = GF; document.head.append(l); }
  const loadedFonts = new Set(); let fontPending = null, customFace = null;
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const script = (src, ok) => new Promise((res, rej) => { if (ok()) return res(); const s = document.createElement('script'); s.src = src; s.onload = () => (ok() ? res() : rej(new Error('load'))); s.onerror = rej; document.head.append(s); });

  /* ── layout: words → lines per page ── */
  function layout(ctx, text, j, inner) {
    const pages = [[]]; let lines = pages[0];
    const push = (l) => { if (lines.length >= j.linesPerPage) { lines = []; pages.push(lines); } lines.push(l); };
    for (const para of text.replace(/\r/g, '').split('\n')) {
      if (para.trim() === '---') { if (lines.length) { lines = []; pages.push(lines); } continue; }
      if (!para.trim()) { push(''); continue; }
      let line = '';
      for (const w of para.split(/\s+/)) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width <= inner || !line) { line = t; } else { push(line); line = w; }
        while (ctx.measureText(line).width > inner && line.length > 1) { // a single word longer than the line: hard-break it
          let n = line.length; while (n > 1 && ctx.measureText(line.slice(0, n)).width > inner) n--;
          push(line.slice(0, n)); line = line.slice(n);
        }
      }
      push(line);
    }
    if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
    return pages;
  }
  function paper(ctx, W, H, j, m, lineH, top) {
    ctx.fillStyle = j.paperColor; ctx.fillRect(0, 0, W, H);
    if (j.paper === 'grid') { ctx.strokeStyle = 'rgba(120,150,200,0.35)'; ctx.lineWidth = 1 * S; const g = lineH / 2; for (let x = m; x <= W - m; x += g) { ctx.beginPath(); ctx.moveTo(x, top - lineH); ctx.lineTo(x, H - m); ctx.stroke(); } for (let y = top - lineH; y <= H - m; y += g) { ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(W - m, y); ctx.stroke(); } }
    if (j.paper === 'ruled' || j.paper === 'ruled-margin') { ctx.strokeStyle = 'rgba(100,140,210,0.55)'; ctx.lineWidth = 1.2 * S; for (let y = top; y <= H - m + 1; y += lineH) { ctx.beginPath(); ctx.moveTo(j.paper === 'ruled-margin' ? 0 : m, y); ctx.lineTo(j.paper === 'ruled-margin' ? W : W - m, y); ctx.stroke(); } }
    if (j.paper === 'ruled-margin') { ctx.strokeStyle = 'rgba(220,80,80,0.6)'; ctx.lineWidth = 1.6 * S; ctx.beginPath(); ctx.moveTo(m, 0); ctx.lineTo(m, H); ctx.stroke(); }
  }
  function drawLine(ctx, text, x, y, j, rnd) {
    const amp = j.jitter / 100;
    for (const ch of text) {
      if (ch === ' ') { x += ctx.measureText(' ').width + j.wspace; continue; }
      const rot = (rnd() - 0.5) * 0.08 * amp, dy = (rnd() - 0.5) * 6 * S * amp, dx = (rnd() - 0.5) * 1.5 * S * amp;
      ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.globalAlpha = 1 - rnd() * 0.3 * amp; ctx.fillText(ch, 0, 0); ctx.restore();
      x += ctx.measureText(ch).width + j.lspace;
    }
  }
  function scan(cv) {
    const W = cv.width, H = cv.height, out = document.createElement('canvas'); out.width = W; out.height = H;
    const g = out.getContext('2d'); g.fillStyle = '#d9d9d6'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(0.3 * Math.PI / 180); g.scale(0.985, 0.985); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 24 * S; g.shadowOffsetY = 6 * S; g.drawImage(cv, -W / 2, -H / 2); g.restore();
    const rnd = rng(7); g.fillStyle = 'rgba(60,50,40,0.06)';
    for (let i = 0; i < 90000; i++) g.fillRect(rnd() * W, rnd() * H, 2, 2);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.14)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return out;
  }
  function render(j) {
    const [W, H] = PAGES[j.page], m = Math.round(MARGIN[j.margin] * DPI), fontPx = j.size * S, lineH = Math.round(fontPx * j.lh), top = m + lineH * (j.header ? 2 : 1);
    const family = FAM[j.font] || FAM.caveat, font = `${fontPx}px "${family}", "Caveat", cursive`;
    const probe = document.createElement('canvas').getContext('2d'); probe.font = font; if ('letterSpacing' in probe) { probe.letterSpacing = `${j.lspace}px`; probe.wordSpacing = `${j.wspace}px`; }
    const inner = W - m * 2 - (j.paper === 'ruled-margin' ? 18 * S : 0), linesPerPage = Math.floor((H - m - top) / lineH) + 1;
    const pages = layout(probe, j.text, Object.assign({ linesPerPage }, j), inner);
    return pages.map((lines, pi) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
      paper(ctx, W, H, j, m, lineH, top);
      ctx.font = font; ctx.fillStyle = j.ink; ctx.textBaseline = 'alphabetic';
      const rnd = rng(1000 + pi), x0 = m + (j.paper === 'ruled-margin' ? 18 * S : 0), base = top - fontPx * 0.22;
      if (pi === 0 && j.header) { ctx.save(); ctx.font = `${fontPx * 0.85}px "${family}", cursive`; ctx.textAlign = 'right'; ctx.globalAlpha = 0.9; ctx.fillText(j.header, W - m, top - lineH - fontPx * 0.22); ctx.restore(); }
      lines.forEach((l, i) => drawLine(ctx, l, x0, base + i * lineH, j, rnd));
      return j.scan ? scan(cv) : cv;
    });
  }
  const job = (val) => ({ text: val('text-input'), header: val('hw-header').trim(), font: val('hw-font'), ink: val('hw-ink') === 'custom' ? val('hw-ink-pick') : val('hw-ink'), paper: val('hw-paper'), paperColor: val('hw-paper-color'), size: +val('hw-size'), jitter: +val('hw-jitter'), page: val('opt-page'), lh: +val('opt-lh'), margin: val('opt-margin'), lspace: +val('opt-lspace') * S, wspace: +val('opt-wspace') * S, scan: val('opt-scan') });
  let pages = [], cur = 0, lastKey = null;
  const blob = (cv, type = 'image/png', q) => new Promise((res) => cv.toBlob(res, type, q));

  const api = mount({
    slug: 'text-to-handwriting', debounce: 250,
    ready: ({ val }) => (val('text-input').trim() ? (val('hw-font') === 'custom' && !customFace ? 'Upload a font file first' : true) : 'Type something to write it by hand'),
    summary: ({ val }) => [val('opt-page').toUpperCase(), `line height ${val('opt-lh')}`, val('opt-scan') ? 'scanner on' : 'scanner off'].join(' · '),
    onInput: (el, { $ }) => { if (el.id === 'hw-ink-pick') $('hw-ink').value = 'custom'; },
    run: ({ val, $, status, S: St }) => {
      const j = job(val), key = JSON.stringify(j), family = FAM[j.font];
      const n = j.text.split(/\s+/).filter(Boolean).length; $('input-count').textContent = `${n.toLocaleString()} word${n === 1 ? '' : 's'}`;
      if (j.font !== 'custom' && !loadedFonts.has(family)) { // fetch the family once, then re-run
        if (fontPending !== family) { fontPending = family; document.fonts.load(`${j.size * S}px "${family}"`).then(() => loadedFonts.add(family), () => loadedFonts.add(family)).finally(() => { if (fontPending === family) { fontPending = null; window.ToolityWebTool.run(); } }); }
        status('Loading handwriting…'); return St.out ? Object.assign({}, St.out, { note: 'Loading handwriting…' }) : null;
      }
      if (key !== lastKey) { pages = render(j); lastKey = key; cur = Math.min(cur, pages.length - 1); }
      show($);
      return { text: j.text, ext: 'txt', pages, badge: `${pages.length} page${pages.length === 1 ? '' : 's'} · ${j.page.toUpperCase()}`, note: `${family === 'HW Custom' ? 'Your font' : family}`, ok: true, copyMsg: 'Text copied' };
    },
    download: async (fmt, { S: St, val }) => {
      const name = `handwriting-${val('opt-page')}`;
      if (fmt === 'png') return { blob: await blob(pages[cur]), name: `${name}-page-${cur + 1}.png` };
      if (fmt === 'zip') {
        await script(CDN + 'jszip@3.10.1/dist/jszip.min.js', () => window.JSZip).catch(() => { throw new Error("Couldn't load the ZIP library — check your connection."); });
        const z = new window.JSZip(); for (let i = 0; i < pages.length; i++) z.file(`page-${String(i + 1).padStart(2, '0')}.png`, await blob(pages[i]));
        return { blob: await z.generateAsync({ type: 'blob' }), name: `${name}.zip` };
      }
      await script(CDN + 'jspdf@3.0.1/dist/jspdf.umd.min.js', () => window.jspdf && window.jspdf.jsPDF).catch(() => { throw new Error("Couldn't load the PDF library — check your connection."); });
      const { jsPDF } = window.jspdf;
      const [, , wmm, hmm] = PAGES[val('opt-page')], doc = new jsPDF({ unit: 'mm', format: [wmm, hmm], compress: true });
      pages.forEach((cv, i) => { if (i) doc.addPage([wmm, hmm]); doc.addImage(cv.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, wmm, hmm); });
      return { blob: doc.output('blob'), name: `${name}.pdf` };
    },
    onReset: ({ $ }) => { pages = []; cur = 0; lastKey = null; $('hw-pager').innerHTML = ''; $('input-count').textContent = ''; const c = $('hw-canvas'); c.getContext('2d').clearRect(0, 0, c.width, c.height); }
  });
  function show($) {
    const c = $('hw-canvas'), src = pages[cur]; if (!src) return;
    c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
    $('hw-pager').innerHTML = pages.length > 1 ? `<button type="button" class="btn-toolbar-sm" data-go="-1" aria-label="Previous page"${cur === 0 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-left" width="14" height="14"></iconify-icon></button><span class="web-muted">Page ${cur + 1} of ${pages.length}</span><button type="button" class="btn-toolbar-sm" data-go="1" aria-label="Next page"${cur === pages.length - 1 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-right" width="14" height="14"></iconify-icon></button>` : '';
  }
  api.$('hw-pager').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (!b) return; cur = Math.max(0, Math.min(pages.length - 1, cur + +b.dataset.go)); show(api.$); });
  /* Custom font upload → FontFace, never leaves the tab */
  api.$('btn-font-file').addEventListener('click', () => api.$('font-input').click());
  api.$('font-input').addEventListener('change', async () => {
    const f = api.$('font-input').files[0]; api.$('font-input').value = ''; if (!f) return;
    try {
      if (customFace) document.fonts.delete(customFace);
      customFace = new FontFace('HW Custom', await f.arrayBuffer()); await customFace.load(); document.fonts.add(customFace); loadedFonts.add('HW Custom');
      api.$('font-name').textContent = f.name; api.$('hw-font').value = 'custom'; lastKey = null; api.run(); api.toast('Font loaded');
    } catch (e) { customFace = null; api.showError('That file is not a font the browser can load (.ttf, .otf, .woff, .woff2).'); }
  });
  api.$('btn-reset').addEventListener('click', () => { api.$('font-name').textContent = '.ttf / .otf · stays in your browser'; });
})();
