/* Image Color Extractor — Toolity.in. Median-cut palette + pixel eyedropper, all on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindDropzone, bindSegmented, bindDropdown, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('preview-canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const SAMPLE = 200; // analysis grid — enough for a stable palette, cheap enough for instant re-runs

  const S = { img: null, name: '', count: 6, format: 'hex', sort: 'coverage', ignore: true, palette: [], picked: null };

  /* ── Color maths ── */
  const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  const rgbStr = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
  function hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  const hslStr = (c) => { const [h, s, l] = hsl(c); return `hsl(${h}, ${s}%, ${l}%)`; };
  const fmt = (c) => (S.format === 'rgb' ? rgbStr(c) : S.format === 'hsl' ? hslStr(c) : hex(c));

  /* ── Median-cut quantization + k-means polish ──
     Designed by Kapil Pidhwani: median cut in plain RGB seeds a capped k-means; runs in a few ms on the 200px
     sample. Ceiling: RGB distance is not perceptual, so near-identical greys may split while distinct pastels
     merge on gradient-heavy photos. Upgrade path: run the k-means step in OKLab. */
  function extract(data, n, ignoreExtremes) {
    const px = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // transparent
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (ignoreExtremes) { const l = (r + g + b) / 3; if (l > 242 || l < 13) continue; }
      px.push([r, g, b]);
    }
    if (!px.length) return [];
    let boxes = [px];
    while (boxes.length < n) {
      boxes.sort((a, b) => b.length - a.length);
      const box = boxes.shift();
      if (box.length < 2) { boxes.push(box); break; }
      let ch = 0, best = -1;
      for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } if (hi - lo > best) { best = hi - lo; ch = c; } }
      box.sort((a, b) => a[ch] - b[ch]);
      const mid = box.length >> 1;
      boxes.push(box.slice(0, mid), box.slice(mid));
    }
    const total = px.length;
    const avg = (box) => { const s = [0, 0, 0]; for (const p of box) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map((v) => Math.round(v / box.length)); };
    // k-means polish (≤8 iters) seeded by the boxes: snaps centroids onto real clusters so flat logos give pure
    // colours, and duplicate centroids collapse to empty clusters that are dropped.
    let cents = boxes.map((box) => [...avg(box), box.length]);
    for (let it = 0; it < 8; it++) {
      const sum = cents.map(() => [0, 0, 0, 0]);
      for (const p of px) {
        let bi = 0, bd = Infinity;
        for (let i = 0; i < cents.length; i++) { const c = cents[i], d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }
        const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
      }
      const next = sum.filter((s) => s[3]).map((s) => [Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3]), s[3]]);
      const stable = next.length === cents.length && next.every((c, i) => c[0] === cents[i][0] && c[1] === cents[i][1] && c[2] === cents[i][2]);
      cents = next; if (stable) break;
    }
    return cents.map((c) => ({ rgb: [c[0], c[1], c[2]], coverage: c[3] / total }));
  }
  function sorted(list) {
    const l = [...list];
    if (S.sort === 'hue') l.sort((a, b) => hsl(a.rgb)[0] - hsl(b.rgb)[0]);
    else if (S.sort === 'lightness') l.sort((a, b) => hsl(a.rgb)[2] - hsl(b.rgb)[2]);
    else l.sort((a, b) => b.coverage - a.coverage);
    return l;
  }

  /* ── Pipeline ── */
  function loadFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); S.img = img; S.name = file.name.replace(/\.[^.]+$/, '') || 'image'; drawPreview(); run(); };
    img.onerror = () => { URL.revokeObjectURL(url); showError('That file could not be decoded as an image.'); };
    img.src = url;
  }
  function drawPreview() {
    const img = S.img, max = 1600, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k)); canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    $('dropzone').hidden = true; $('preview-wrap').hidden = false; $('pick-hint').hidden = false; $('pick-row').hidden = true; $('crosshair').hidden = true;
    $('input-badge').textContent = `${img.naturalWidth}×${img.naturalHeight}`;
    showError('');
  }
  function run() {
    if (!S.img) return;
    const off = document.createElement('canvas'), k = Math.min(1, SAMPLE / Math.max(S.img.naturalWidth, S.img.naturalHeight));
    off.width = Math.max(1, Math.round(S.img.naturalWidth * k)); off.height = Math.max(1, Math.round(S.img.naturalHeight * k));
    const octx = off.getContext('2d', { willReadFrequently: true }); octx.drawImage(S.img, 0, 0, off.width, off.height);
    let data;
    try { data = octx.getImageData(0, 0, off.width, off.height).data; } catch (e) { showError('This image is tainted (cross-origin) and cannot be read.'); return; }
    S.palette = sorted(extract(data, S.count, S.ignore));
    renderPalette();
  }
  function renderPalette() {
    const has = S.palette.length > 0;
    $('output-empty').hidden = has; $('output-content').hidden = !has;
    $('btn-copy').disabled = !has; $('btn-download-menu-toggle').disabled = !has;
    $('output-badge').textContent = has ? `${S.palette.length} colors` : '—';
    $('copy-status').textContent = '';
    $('palette').innerHTML = S.palette.map((c, i) => {
      const h = hex(c.rgb);
      return `<button type="button" class="ice-chip" role="listitem" data-i="${i}" title="Copy ${fmt(c.rgb)}" aria-label="Copy ${h}, ${Math.round(c.coverage * 100)}% of image">` +
        `<span class="ice-chip-color" style="background:${h}"></span>` +
        `<span class="ice-chip-meta"><span class="ice-chip-hex">${h}</span><span class="ice-chip-pct">${Math.round(c.coverage * 100)}%</span></span></button>`;
    }).join('');
    if (has && S.ignore && S.palette.length < S.count) $('copy-status').textContent = `Only ${S.palette.length} distinct colors after ignoring near-white/black.`;
  }
  function showError(msg) { const e = $('input-error'); e.hidden = !msg; e.querySelector('span').textContent = msg; }

  /* ── Eyedropper ── */
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((clientX - r.left) / r.width * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((clientY - r.top) / r.height * canvas.height)));
    return pickAt(x, y, clientX - r.left, clientY - r.top);
  }
  function pickAt(x, y, cssX, cssY) {
    const d = ctx.getImageData(x, y, 1, 1).data, rgb = [d[0], d[1], d[2]];
    S.picked = rgb;
    $('pick-row').hidden = false; $('pick-hint').hidden = true;
    $('pick-swatch').style.background = hex(rgb);
    $('pick-hex').textContent = hex(rgb); $('pick-detail').textContent = `${rgbStr(rgb)} · ${hslStr(rgb)}`;
    if (cssX != null) { const ch = $('crosshair'); ch.hidden = false; ch.style.left = cssX + 'px'; ch.style.top = cssY + 'px'; }
    return rgb;
  }
  canvas.addEventListener('click', (e) => pick(e.clientX, e.clientY));
  $('pick-swatch').addEventListener('click', () => S.picked && copyText(fmt(S.picked), `Copied ${fmt(S.picked)}`));

  /* ── Actions ── */
  $('palette').addEventListener('click', (e) => {
    const chip = e.target.closest('.ice-chip'); if (!chip) return;
    const c = S.palette[Number(chip.dataset.i)]; if (!c) return;
    const text = fmt(c.rgb);
    copyText(text, `Copied ${text}`);
    $('copy-status').textContent = `Copied ${text}`;
    chip.classList.add('is-copied'); setTimeout(() => chip.classList.remove('is-copied'), 1200);
  });
  const allText = () => S.palette.map((c) => fmt(c.rgb)).join('\n');
  $('btn-copy').addEventListener('click', () => S.palette.length && copyText(allText(), `Copied ${S.palette.length} colors`));

  const cssText = () => `:root {\n${S.palette.map((c, i) => `  --color-${i + 1}: ${hex(c.rgb)}; /* ${Math.round(c.coverage * 100)}% */`).join('\n')}\n}\n`;
  const jsonText = () => JSON.stringify(S.palette.map((c) => ({ hex: hex(c.rgb), rgb: c.rgb, hsl: hsl(c.rgb), coverage: Number(c.coverage.toFixed(4)) })), null, 2);
  function stripBlob() {
    const w = 160, h = 200, c = document.createElement('canvas'); c.width = w * S.palette.length; c.height = h;
    const x = c.getContext('2d');
    S.palette.forEach((p, i) => {
      x.fillStyle = hex(p.rgb); x.fillRect(i * w, 0, w, h);
      x.fillStyle = hsl(p.rgb)[2] > 60 ? '#111' : '#fff'; x.font = '600 18px Inter, system-ui, sans-serif'; x.textAlign = 'center';
      x.fillText(hex(p.rgb), i * w + w / 2, h - 22);
    });
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  bindDropdown($('download-dropdown-wrap'));
  $('opt-dl-css').addEventListener('click', () => downloadBlob(new Blob([cssText()], { type: 'text/css' }), `${S.name}-palette.css`));
  $('opt-dl-json').addEventListener('click', () => downloadBlob(new Blob([jsonText()], { type: 'application/json' }), `${S.name}-palette.json`));
  $('opt-dl-png').addEventListener('click', async () => downloadBlob(await stripBlob(), `${S.name}-palette.png`));

  /* ── Inputs & options ── */
  bindDropzone($('dropzone'), $('file-input'), loadFile, { accept: 'image/' });
  document.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/')); if (f) loadFile(f); });
  bindSegmented($('seg-count'), (v) => { S.count = Number(v); run(); });
  function syncSummary() {
    $('settings-summary').textContent = `${S.format.toUpperCase()} · ${S.ignore ? 'ignore extremes' : 'all pixels'} · by ${S.sort}`;
  }
  $('opt-format').addEventListener('change', (e) => { S.format = e.target.value; syncSummary(); renderPalette(); });
  $('opt-sort').addEventListener('change', (e) => { S.sort = e.target.value; syncSummary(); S.palette = sorted(S.palette); renderPalette(); });
  $('opt-ignore').addEventListener('change', (e) => { S.ignore = e.target.checked; syncSummary(); run(); });

  function reset() {
    S.img = null; S.palette = []; S.picked = null; S.count = 6; S.format = 'hex'; S.sort = 'coverage'; S.ignore = true;
    $('seg-count').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === '6'));
    $('opt-format').value = 'hex'; $('opt-sort').value = 'coverage'; $('opt-ignore').checked = true;
    $('dropzone').hidden = false; $('preview-wrap').hidden = true; $('pick-row').hidden = true; $('pick-hint').hidden = true; $('crosshair').hidden = true;
    $('input-badge').textContent = '—'; showError(''); syncSummary(); renderPalette(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: () => $('btn-copy').click(), reset });

  window.__ice = { S, extract, pickAt, loadFile, run };
})();
