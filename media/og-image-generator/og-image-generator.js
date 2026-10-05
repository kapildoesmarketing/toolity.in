/* OG Image Generator — Toolity.in. Live canvas render of a 1200×630 social card; PNG/JPG export, all on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindDropdown, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('preview-canvas'), ctx = canvas.getContext('2d');

  const FONTS = { sans: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif' };
  // Presets: solid = [hex]; gradient = [from, to]. First entry is the default "Sunset".
  const BGS = [
    { id: 'sunset', name: 'Sunset', c: ['#f4511e', '#b3260a'], fg: '#ffffff' },
    { id: 'ink', name: 'Ink', c: ['#111827'], fg: '#ffffff' },
    { id: 'paper', name: 'Paper', c: ['#ffffff'], fg: '#111827' },
    { id: 'ocean', name: 'Ocean', c: ['#0ea5e9', '#1e3a8a'], fg: '#ffffff' },
    { id: 'forest', name: 'Forest', c: ['#16a34a', '#064e3b'], fg: '#ffffff' },
    { id: 'grape', name: 'Grape', c: ['#a855f7', '#4c1d95'], fg: '#ffffff' },
    { id: 'slate', name: 'Slate', c: ['#334155', '#0f172a'], fg: '#ffffff' },
    { id: 'cream', name: 'Cream', c: ['#fef3c7'], fg: '#78350f' },
  ];
  const MAX_FILE = 2 * 1024 * 1024;
  const DEF = { w: 1200, h: 630, title: '', desc: '', site: '', template: 'minimal', bg: BGS[0], fg: '#ffffff', font: 'sans', titleSize: 'auto', overlay: 55, guides: false, logo: null, photo: null };
  const S = { ...DEF };

  /* ── Helpers ── */
  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';

  /* Greedy word-wrap; a single word longer than maxW is hard-broken by characters. */
  function wrap(text, maxW) {
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxW) { line = test; continue; }
        if (line) lines.push(line);
        line = word;
        while (ctx.measureText(line).width > maxW && line.length > 1) {
          let cut = line.length; while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut--;
          lines.push(line.slice(0, cut)); line = line.slice(cut);
        }
      }
      lines.push(line);
    }
    return lines.filter((l, i, a) => l || i < a.length - 1);
  }
  const ellipsis = (lines, max, maxW) => {
    if (lines.length <= max) return lines;
    let last = lines[max - 1];
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    return [...lines.slice(0, max - 1), last.trimEnd() + '…'];
  };

  /* Title fit: Auto shrinks 72→40 px until ≤3 lines; S/M/L are fixed sizes (then clipped to 3 lines). Returns {size, lines}. */
  function fit(text, maxW) {
    const fam = FONTS[S.font], fixed = { s: 48, m: 60, l: 72 }[S.titleSize];
    let size = fixed || 72, lines;
    for (;;) {
      ctx.font = `800 ${size}px ${fam}`; lines = wrap(text, maxW);
      if (fixed || lines.length <= 3 || size <= 40) break;
      size -= 4;
    }
    return { size, lines: ellipsis(lines, 3, maxW) };
  }

  function paintBg(w, h) {
    const c = S.bg.c;
    if (c.length === 1) ctx.fillStyle = c[0];
    else { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; }
    ctx.fillRect(0, 0, w, h);
  }
  function drawCover(img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
  }
  function drawContain(img, x, y, w, h, align) {
    const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    const dx = align === 'left' ? x : align === 'right' ? x + w - dw : x + (w - dw) / 2;
    ctx.drawImage(img, dx, y + (h - dh) / 2, dw, dh);
  }

  /* ── Render ── */
  // Designed by Kapil Pidhwani: one synchronous render per change on the full-size canvas (≤1.3 MP) — fast enough without an offscreen layer.
  function render(forExport) {
    const { w, h } = S, M = 60, fam = FONTS[S.font];
    canvas.width = w; canvas.height = h;
    const T = S.template, isSplit = T === 'split' && (S.photo || S.logo), isCenter = T === 'centered';
    const textX = M, textW = isSplit ? Math.round(w * 0.55) - M : w - 2 * M;

    paintBg(w, h);
    if (S.photo) {
      if (isSplit) { drawCover(S.photo, Math.round(w * 0.55), 0, w - Math.round(w * 0.55), h); }
      else { drawCover(S.photo, 0, 0, w, h); ctx.fillStyle = `rgba(0,0,0,${S.overlay / 100})`; ctx.fillRect(0, 0, w, h); }
    }
    if (T === 'banner') { ctx.fillStyle = S.fg; ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h - 14, w, 14); }

    // Measure blocks
    const title = S.title.trim() || 'Your title here';
    const t = fit(title, textW), tLH = Math.round(t.size * 1.15);
    const descSize = 28, dLH = 38;
    ctx.font = `400 ${descSize}px ${fam}`;
    const dLines = S.desc.trim() ? ellipsis(wrap(S.desc.trim(), textW), 3, textW) : [];
    const logoH = S.logo && (!isSplit || S.photo) ? 80 : 0; // logo rides above the title unless it occupies the split panel
    const blockH = (logoH ? logoH + 36 : 0) + t.lines.length * tLH + (dLines.length ? 24 + dLines.length * dLH : 0);
    const siteH = S.site.trim() ? 60 : 0;
    const avail = h - 2 * M - siteH;
    let y = M + Math.max(0, (avail - blockH) / 2); // every template centres the block vertically inside the safe zone

    ctx.textAlign = isCenter ? 'center' : 'left'; ctx.textBaseline = 'top';
    const x = isCenter ? w / 2 : textX;
    if (logoH) { const lw = Math.min(textW, S.logo.width * (logoH / S.logo.height)); drawContain(S.logo, isCenter ? (w - lw) / 2 : textX, y, lw, logoH, 'left'); y += logoH + 36; }
    ctx.fillStyle = S.fg; ctx.font = `800 ${t.size}px ${fam}`;
    for (const l of t.lines) { ctx.fillText(l, x, y); y += tLH; }
    if (dLines.length) { y += 24; ctx.globalAlpha = 0.85; ctx.font = `400 ${descSize}px ${fam}`; for (const l of dLines) { ctx.fillText(l, x, y); y += dLH; } ctx.globalAlpha = 1; }
    if (siteH) {
      ctx.font = `600 24px ${fam}`; ctx.textBaseline = 'alphabetic';
      const sy = h - M - (T === 'banner' ? 6 : 0), dot = '●  ';
      ctx.fillText(dot + S.site.trim(), x, sy);
    }
    if (isSplit && S.logo && !S.photo) { // Split without photo: logo fills the right panel
      const px = Math.round(w * 0.6); drawContain(S.logo, px, M, w - px - M, h - 2 * M, 'center');
    }
    if (S.guides && !forExport) {
      ctx.save(); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,0,255,.9)';
      ctx.strokeRect(M, M, w - 2 * M, h - 2 * M); ctx.restore();
    }
    $('input-badge').textContent = `${w} × ${h}`;
    $('output-badge').textContent = `${w} × ${h} px`;
    if (!forExport) scheduleSize();
    return t;
  }
  let sizeTimer = 0;
  function scheduleSize() {
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(async () => { const b = await blob('image/png'); if (b) $('output-badge').textContent = `${S.w} × ${S.h} px · PNG ${formatBytes(b.size)}`; }, 350);
  }
  let renderTimer = 0;
  const queueRender = () => { clearTimeout(renderTimer); renderTimer = setTimeout(() => render(), 60); };

  /* Export renders guide-free, grabs the blob, then restores the preview. */
  async function blob(type) {
    render(true);
    const b = await new Promise((res) => canvas.toBlob(res, type, type === 'image/jpeg' ? 0.92 : undefined));
    if (S.guides) { clearTimeout(sizeTimer); render(); clearTimeout(sizeTimer); }
    return b;
  }

  /* ── Inputs ── */
  bindSegmented($('seg-size'), (v) => { [S.w, S.h] = v.split('x').map(Number); render(); });
  for (const [id, key] of [['in-title', 'title'], ['in-desc', 'desc'], ['in-site', 'site']]) $(id).addEventListener('input', (e) => { S[key] = e.target.value; queueRender(); });

  function loadImage(file) {
    return new Promise((res, rej) => {
      if (file.size > MAX_FILE) return rej(new Error(`File is ${formatBytes(file.size)} — keep logos and photos under 2 MB.`));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => res(Object.assign(img, { _url: url }));
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Couldn't decode that image.")); };
      img.src = url;
    });
  }
  function bindFile(key) {
    const drop = $(`${key}-drop`), box = $(`${key}-file`);
    const set = (img, name) => {
      if (S[key]) URL.revokeObjectURL(S[key]._url);
      S[key] = img; drop.hidden = !!img; box.hidden = !img;
      $(`${key}-thumb`).src = img ? img._url : ''; $(`${key}-name`).textContent = name || '';
      render();
    };
    bindDropzone(drop, $(`${key}-input`), async (file) => {
      try { set(await loadImage(file), file.name); showError(''); } catch (e) { showError(e.message); }
    }, { accept: 'image/' });
    $(`${key}-remove`).addEventListener('click', () => { set(null); showError(''); });
    return set;
  }
  const setLogo = bindFile('logo'), setPhoto = bindFile('photo');

  /* ── Design settings ── */
  const sw = $('bg-swatches');
  sw.append(...BGS.map((b) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'swatch'; el.dataset.bg = b.id; el.title = b.name; el.setAttribute('role', 'radio');
    el.setAttribute('aria-label', b.name); el.setAttribute('aria-checked', String(b === S.bg));
    el.style.background = b.c.length === 1 ? b.c[0] : `linear-gradient(135deg, ${b.c[0]}, ${b.c[1]})`;
    el.addEventListener('click', () => { S.bg = b; S.fg = b.fg; $('in-fg').value = b.fg; $('in-bg').value = b.c[0]; syncSwatches(); syncSummary(); render(); });
    return el;
  }));
  const syncSwatches = () => sw.querySelectorAll('.swatch').forEach((el) => el.setAttribute('aria-checked', String(el.dataset.bg === S.bg.id)));
  $('in-bg').addEventListener('input', (e) => { S.bg = { id: 'custom', name: 'Custom', c: [e.target.value], fg: S.fg }; syncSwatches(); syncSummary(); queueRender(); });
  $('in-fg').addEventListener('input', (e) => { S.fg = e.target.value; queueRender(); });

  function syncSummary() {
    const tpl = { minimal: 'Minimal', centered: 'Centered', split: 'Split', banner: 'Banner' }[S.template];
    const ts = { auto: 'auto', s: 'small', m: 'medium', l: 'large' }[S.titleSize];
    $('settings-summary').textContent = `${tpl} · ${S.bg.name} · ${S.font === 'sans' ? 'Sans' : 'Serif'} · ${ts} title`;
    $('opt-overlay-val').textContent = `${S.overlay}%`;
  }
  $('opt-template').addEventListener('change', (e) => { S.template = e.target.value; syncSummary(); render(); });
  $('opt-font').addEventListener('change', (e) => { S.font = e.target.value; syncSummary(); render(); });
  $('opt-title-size').addEventListener('change', (e) => { S.titleSize = e.target.value; syncSummary(); render(); });
  $('opt-overlay').addEventListener('input', (e) => { S.overlay = Number(e.target.value); syncSummary(); queueRender(); });
  $('opt-guides').addEventListener('change', (e) => { S.guides = e.target.checked; render(); });

  /* ── Actions ── */
  const name = (ext) => `og-${slug(S.title.trim() || 'image')}.${ext}`;
  bindDropdown($('download-dropdown-wrap'));
  const dl = async (type, ext) => { const b = await blob(type); if (!b) return toast('Export failed'); downloadBlob(b, name(ext)); };
  $('opt-dl-png').addEventListener('click', () => dl('image/png', 'png'));
  $('opt-dl-jpg').addEventListener('click', () => dl('image/jpeg', 'jpg'));
  $('btn-copy').addEventListener('click', async () => { const b = await blob('image/png'); if (b) copyBlob(b, 'PNG copied to clipboard'); });

  function reset() {
    setLogo(null); setPhoto(null);
    Object.assign(S, DEF);
    ['in-title', 'in-desc', 'in-site'].forEach((id) => { $(id).value = ''; });
    $('in-bg').value = '#f4511e'; $('in-fg').value = S.fg; $('opt-template').value = 'minimal'; $('opt-font').value = 'sans';
    $('opt-title-size').value = 'auto'; $('opt-overlay').value = 55; $('opt-guides').checked = false;
    $('seg-size').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === '1200x630'));
    showError(''); syncSwatches(); syncSummary(); render(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: () => $('opt-dl-png').click(), reset });

  syncSummary(); render();
  window.__og = { S, BGS, render, fit, wrap, blob, name };
})();
