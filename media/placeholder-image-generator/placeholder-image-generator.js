/* Placeholder Image Generator — Toolity.in. Live canvas render, PNG/JPG/WebP/SVG export, all on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindSegmented, bindDropdown, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('preview-canvas'), ctx = canvas.getContext('2d');

  // Designed by Kapil Pidhwani: hard cap of 4000 px per side (64 MP canvas, ~256 MB RGBA) keeps phones alive.
  // Upgrade path for bigger: tile the render into an OffscreenCanvas worker.
  const MAX = 4000, MIN = 1;
  const FONTS = { sans: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: '"JetBrains Mono", Menlo, Consolas, monospace' };
  const DEF = { w: 600, h: 400, bg: '#e5e7eb', fg: '#6b7280', text: '', font: 'auto', family: 'sans', quality: 90, border: false };
  const S = { ...DEF };

  /* ── Helpers ── */
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);
  const label = () => S.text.trim() || `${S.w} × ${S.h}`;
  const escXml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };

  /* Auto size: a fifth of the short side, then shrink until the text fits 90% of the width. Never below 6px. */
  function fontSize(measure) {
    let px = S.font === 'auto' ? Math.round(Math.min(S.w, S.h) / 5) : Number(S.font);
    px = Math.max(6, px);
    if (S.font !== 'auto') return px;
    const maxW = S.w * 0.9;
    while (px > 6 && measure(px) > maxW) px = Math.floor(px * 0.9);
    return px;
  }

  /* ── Render ── */
  function render() {
    canvas.width = S.w; canvas.height = S.h;
    ctx.fillStyle = S.bg; ctx.fillRect(0, 0, S.w, S.h);
    const text = label(), fam = FONTS[S.family];
    const px = fontSize((p) => { ctx.font = `600 ${p}px ${fam}`; return ctx.measureText(text).width; });
    ctx.font = `600 ${px}px ${fam}`; ctx.fillStyle = S.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, S.w / 2, S.h / 2);
    if (S.border) { ctx.strokeStyle = S.fg; ctx.lineWidth = 2; ctx.strokeRect(0, 0, S.w, S.h); } // 2px stroke on the edge = 1px visible
    $('input-badge').textContent = `${S.w} × ${S.h}`;
    $('output-badge').textContent = `${S.w} × ${S.h} px`;
    $('in-text').placeholder = `${S.w} × ${S.h}`;
    scheduleSize();
  }
  let sizeTimer = 0;
  function scheduleSize() {
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(async () => { const b = await blob('image/png'); if (b) $('output-badge').textContent = `${S.w} × ${S.h} px · PNG ${formatBytes(b.size)}`; }, 350);
  }
  let renderTimer = 0;
  const queueRender = () => { clearTimeout(renderTimer); renderTimer = setTimeout(render, 60); };

  const blob = (type) => new Promise((res) => canvas.toBlob(res, type, type === 'image/jpeg' ? S.quality / 100 : undefined));
  function svgText() {
    const text = label(), fam = FONTS[S.family];
    const px = fontSize((p) => { ctx.font = `600 ${p}px ${fam}`; return ctx.measureText(text).width; });
    const border = S.border ? `<rect x="0.5" y="0.5" width="${S.w - 1}" height="${S.h - 1}" fill="none" stroke="${S.fg}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${S.w}" height="${S.h}" viewBox="0 0 ${S.w} ${S.h}">
  <rect width="${S.w}" height="${S.h}" fill="${S.bg}"/>${border}
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family='${fam.replace(/'/g, '')}' font-weight="600" font-size="${px}" fill="${S.fg}">${escXml(text)}</text>
</svg>
`;
  }

  /* ── Size inputs & presets ── */
  const PRESETS = [...$('seg-preset').querySelectorAll('.seg-pill')].map((b) => b.dataset.value);
  function syncPreset() {
    const key = `${S.w}x${S.h}`, val = PRESETS.includes(key) ? key : 'custom';
    $('seg-preset').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === val));
  }
  function readSize() {
    let bad = false;
    for (const [id, key] of [['in-width', 'w'], ['in-height', 'h']]) {
      const el = $(id), raw = Number(el.value);
      if (!el.value || !Number.isFinite(raw)) { bad = true; continue; }
      const v = clamp(Math.round(raw), MIN, MAX);
      if (v !== raw) { el.value = v; bad = true; }
      S[key] = v;
    }
    showError(bad ? `Width and height must be whole numbers between ${MIN} and ${MAX} px — values were adjusted.` : '');
    syncPreset(); queueRender();
  }
  $('in-width').addEventListener('input', readSize);
  $('in-height').addEventListener('input', readSize);
  $('btn-swap').addEventListener('click', () => { [S.w, S.h] = [S.h, S.w]; $('in-width').value = S.w; $('in-height').value = S.h; showError(''); syncPreset(); render(); });
  bindSegmented($('seg-preset'), (v) => {
    if (v === 'custom') { $('in-width').focus(); return; }
    const [w, h] = v.split('x').map(Number); S.w = w; S.h = h; $('in-width').value = w; $('in-height').value = h; showError(''); render();
  });

  /* ── Colors (picker ⇄ hex field) ── */
  function bindColor(pickerId, hexId, key) {
    $(pickerId).addEventListener('input', (e) => { S[key] = e.target.value; $(hexId).value = e.target.value; queueRender(); });
    $(hexId).addEventListener('input', (e) => {
      let v = e.target.value.trim(); if (v && v[0] !== '#') v = '#' + v;
      if (!isHex(v)) return; S[key] = v.toLowerCase(); $(pickerId).value = S[key]; queueRender();
    });
    $(hexId).addEventListener('blur', (e) => { e.target.value = S[key]; });
  }
  bindColor('in-bg', 'in-bg-hex', 'bg');
  bindColor('in-fg', 'in-fg-hex', 'fg');
  $('in-text').addEventListener('input', (e) => { S.text = e.target.value; queueRender(); });

  /* ── Options ── */
  function syncSummary() {
    $('settings-summary').textContent = `${S.font === 'auto' ? 'Auto' : S.font + 'px'} font · ${{ sans: 'Sans', serif: 'Serif', mono: 'Mono' }[S.family]} · JPG ${S.quality}%${S.border ? ' · border' : ''}`;
    $('opt-quality-val').textContent = `${S.quality}%`;
  }
  $('opt-font-size').addEventListener('change', (e) => { S.font = e.target.value; syncSummary(); render(); });
  $('opt-font').addEventListener('change', (e) => { S.family = e.target.value; syncSummary(); render(); });
  $('opt-quality').addEventListener('input', (e) => { S.quality = Number(e.target.value); syncSummary(); });
  $('opt-border').addEventListener('change', (e) => { S.border = e.target.checked; syncSummary(); render(); });

  /* ── Actions ── */
  const name = (ext) => `placeholder-${S.w}x${S.h}.${ext}`;
  bindDropdown($('download-dropdown-wrap'));
  const dl = async (type, ext) => { const b = await blob(type); if (!b) return toast('Export failed'); downloadBlob(b, name(ext)); };
  $('opt-dl-png').addEventListener('click', () => dl('image/png', 'png'));
  $('opt-dl-jpg').addEventListener('click', () => dl('image/jpeg', 'jpg'));
  $('opt-dl-webp').addEventListener('click', () => dl('image/webp', 'webp'));
  $('opt-dl-svg').addEventListener('click', () => downloadBlob(new Blob([svgText()], { type: 'image/svg+xml' }), name('svg')));
  $('btn-copy').addEventListener('click', async () => { const b = await blob('image/png'); if (b) copyBlob(b, 'PNG copied to clipboard'); });

  function reset() {
    Object.assign(S, DEF);
    $('in-width').value = S.w; $('in-height').value = S.h; $('in-text').value = '';
    $('in-bg').value = S.bg; $('in-bg-hex').value = S.bg; $('in-fg').value = S.fg; $('in-fg-hex').value = S.fg;
    $('opt-font-size').value = 'auto'; $('opt-font').value = 'sans'; $('opt-quality').value = 90; $('opt-border').checked = false;
    showError(''); syncPreset(); syncSummary(); render(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: () => $('opt-dl-png').click(), reset });

  syncPreset(); syncSummary(); render();
  window.__pig = { S, render, svgText, blob, fontSize };
})();
