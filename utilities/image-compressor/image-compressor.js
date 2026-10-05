/* Image Compressor — Toolity.in. Canvas re-encode with quality / max-dimension / target-size, all on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 50 * 1024 * 1024, MAX_SIDE = 8192;
  const DEF = { quality: 75, max: 0, target: 0, webp: true };
  const S = { ...DEF, file: null, img: null, out: null, outType: '', outW: 0, outH: 0 };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const show = (el, on) => el.classList.toggle('imc-show', on);
  const outType = () => (S.file.type === 'image/png' && !S.webp) ? 'image/png' : (S.file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp');
  const ext = (t) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[t]);

  /* Draw the source onto a canvas no larger than `side` on its longest edge. */
  function draw(side) {
    const img = S.img, s = side ? Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  const encode = (c, type, q) => new Promise((res) => c.toBlob(res, type, type === 'image/png' ? undefined : q / 100));

  /* Returns {blob, quality, side}. Target mode: binary-search quality in ≤7 encodes, then halve the side if still over. */
  // Designed by Kapil Pidhwani: ≤7 encodes + ≤3 downsizes ≈ 10 toBlob calls worst case; fine for ≤50 MP. Upgrade: OffscreenCanvas in a worker.
  async function compress() {
    const type = outType(), targetB = S.target * 1024;
    let side = Math.min(S.max || MAX_SIDE, MAX_SIDE), c = draw(side);
    if (!targetB || type === 'image/png') return { blob: await encode(c, type, S.quality), quality: S.quality, side, c };
    for (let shrink = 0; shrink < 4; shrink++) {
      let lo = 5, hi = 95, best = null;
      for (let i = 0; i < 7; i++) {
        const mid = Math.round((lo + hi) / 2), b = await encode(c, type, mid);
        if (b.size <= targetB) { best = { blob: b, quality: mid, side, c }; lo = mid + 1; } else hi = mid - 1;
        if (lo > hi) break;
      }
      if (best) return best;
      side = Math.round(Math.max(c.width, c.height) * 0.7); c = draw(side);
    }
    return { blob: await encode(c, type, 5), quality: 5, side, c, missed: true };
  }

  let busy = false, again = false;
  async function run() {
    if (!S.img) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      const r = await compress();
      if (S.out) URL.revokeObjectURL($('output-img').src);
      const keepOriginal = r.blob.size >= S.file.size && !S.max && !S.target;
      S.out = keepOriginal ? S.file : r.blob; S.outType = keepOriginal ? S.file.type : r.blob.type; S.outW = r.c.width; S.outH = r.c.height;
      $('output-img').src = URL.createObjectURL(S.out); show($('output-img'), true); $('output-empty').hidden = true;
      const pct = Math.round((1 - S.out.size / S.file.size) * 100);
      $('output-badge').textContent = `${S.outW} × ${S.outH} · ${ext(S.outType).toUpperCase()} · ${formatBytes(S.out.size)}`;
      const rb = $('result-badge');
      rb.classList.toggle('imc-win', pct > 0);
      rb.textContent = keepOriginal ? `${formatBytes(S.file.size)} → already optimal, original kept` : `${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} · −${pct}%`;
      showError(r.missed ? `Couldn't reach ${S.target} KB even at minimum quality — got ${formatBytes(S.out.size)}.` : '');
      $('btn-download').disabled = false; $('btn-copy').disabled = false;
    } finally { busy = false; if (again) { again = false; run(); } }
  }
  let timer = 0;
  const queue = () => { clearTimeout(timer); timer = setTimeout(run, 150); };

  /* ── Load ── */
  function load(file) {
    if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 50 MB.`);
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      S.file = file; S.img = img; showError('');
      $('source-img').src = url; show($('source-img'), true); $('dropzone').hidden = true;
      $('source-badge').textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${(ext(file.type) || 'img').toUpperCase()} · ${formatBytes(file.size)}`;
      $('opt-webp').closest('.control-item').hidden = file.type !== 'image/png';
      syncSummary(); run();
    };
    img.onerror = () => { URL.revokeObjectURL(url); showError("Couldn't decode that image. Try a JPG, PNG or WebP."); };
    img.src = url;
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'image/' });

  /* ── Settings ── */
  function syncSummary() {
    const png = S.file && S.file.type === 'image/png';
    $('opt-quality-val').textContent = S.quality;
    $('settings-summary').textContent = [S.target ? `Target ${S.target} KB` : `Quality ${S.quality}`, S.max ? `Max ${S.max} px` : 'Original size', png || !S.file ? (S.webp ? 'PNG → WebP' : 'Keep PNG') : null].filter(Boolean).join(' · ');
  }
  $('opt-quality').addEventListener('input', (e) => { S.quality = Number(e.target.value); if (S.target) { S.target = 0; $('opt-target').value = ''; } syncSummary(); queue(); });
  $('opt-max').addEventListener('change', (e) => { S.max = Number(e.target.value); syncSummary(); queue(); });
  $('opt-target').addEventListener('input', (e) => { const v = Math.round(Number(e.target.value)); S.target = v >= 5 ? v : 0; syncSummary(); queue(); });
  $('opt-webp').addEventListener('change', (e) => { S.webp = e.target.checked; syncSummary(); queue(); });

  /* ── Actions ── */
  const name = () => `${S.file.name.replace(/\.[^.]+$/, '')}-compressed.${ext(S.outType)}`;
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, name()));
  $('btn-copy').addEventListener('click', async () => {
    if (!S.out) return;
    const b = S.outType === 'image/png' ? S.out : await encode(draw(Math.max(S.outW, S.outH)), 'image/png'); // clipboard accepts PNG only
    copyBlob(b, 'Image copied to clipboard (PNG)');
  });
  function reset() {
    if (S.img) URL.revokeObjectURL($('source-img').src);
    if (S.out) URL.revokeObjectURL($('output-img').src);
    Object.assign(S, DEF, { file: null, img: null, out: null, outType: '' });
    show($('source-img'), false); show($('output-img'), false); $('dropzone').hidden = false; $('output-empty').hidden = false;
    $('source-img').removeAttribute('src'); $('output-img').removeAttribute('src');
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
    $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('imc-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true;
    $('opt-quality').value = 75; $('opt-max').value = '0'; $('opt-target').value = ''; $('opt-webp').checked = true; $('opt-webp').closest('.control-item').hidden = false;
    showError(''); syncSummary(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: () => $('btn-download').click(), reset });

  syncSummary();
  window.__imc = { S, compress, run, load };
})();
