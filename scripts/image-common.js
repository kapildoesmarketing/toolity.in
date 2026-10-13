/* Toolity.in — shared image runtime (window.ToolityImage). Decode (EXIF-aware) → canvas → PNG/JPG/WebP encode, plus the page
 * controller used by every image-* tool built on gen_media_pages.js. Mirrors ToolityGif.mount. All on-device. */
(function () {
  'use strict';
  const { copyBlob, copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 50 * 1024 * 1024;
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const NAME = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP' };

  /* decode(blob) → canvas at native size, EXIF orientation applied (createImageBitmap, <img> fallback for old Safari) */
  async function decode(blob) {
    let src;
    try { src = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch (e) {
      src = await new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(blob); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); }; img.src = u; });
    }
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    if (!w || !h) throw new Error('empty');
    const c = mk(w, h); c.getContext('2d').drawImage(src, 0, 0); if (src.close) src.close();
    return c;
  }
  /* encode(canvas, type, quality 0–1) → Blob. JPG has no alpha, so it is flattened on white first. */
  function encode(canvas, type = 'image/png', q = 0.92) {
    let c = canvas;
    if (type === 'image/jpeg') { c = mk(canvas.width, canvas.height); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0); }
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('This browser could not encode the image — try PNG.'))), type, q));
  }
  const outType = (S) => { const v = $('opt-format') ? $('opt-format').value : 'auto'; if (v !== 'auto') return v; return EXT[S.file && S.file.type] ? S.file.type : 'image/png'; };
  const outQ = () => ($('opt-quality') ? Number($('opt-quality').value) / 100 : 0.92);

  /* mount({ actionLabel, suffix, auto, accept, onLoad(S), onSetting(el, S), onReset(S), validate(S), summary(S), fmtRange(el),
   *         run(S, api) → { canvas } | { blob, w, h } | custom, present(r, S, setOutput), outExt(S), copy(S) }) */
  function mount(T) {
    const card = $('tool-card'), srcImg = $('source-img'), outImg = $('output-img');
    const S = { file: null, canvas: null, w: 0, h: 0, out: null, outUrl: '', outW: 0, outH: 0, outCanvas: null, busy: false };
    const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { $('progress-fill').style.width = `${Math.round((p || 0) * 100)}%`; $('btn-compress-label').textContent = label || T.actionLabel; };
    const panel = document.querySelector('.tool-settings-panel');
    const paintBadges = () => panel && panel.querySelectorAll('input[type="range"]').forEach((el) => { const b = $(`${el.id}-val`); if (b) b.textContent = T.fmtRange ? T.fmtRange(el) : el.value; });
    const sync = () => { paintBadges(); if (T.summary && $('settings-summary')) $('settings-summary').textContent = T.summary(S); };
    let timer = 0;
    const autoRun = () => { if (T.auto && S.canvas) { clearTimeout(timer); timer = setTimeout(run, 200); } };
    if (panel) panel.addEventListener('input', (e) => { if (T.onSetting) T.onSetting(e.target, S); sync(); autoRun(); });
    const resetSettings = () => panel && panel.querySelectorAll('input, select').forEach((el) => {
      if (el.type === 'file') el.value = '';
      else if (el.type === 'checkbox') el.checked = el.defaultChecked;
      else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value;
      else el.value = el.defaultValue;
    });
    async function loadFile(file) {
      if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 50 MB.`);
      showError(''); $('source-badge').textContent = 'Decoding…';
      try {
        const canvas = await decode(file);
        Object.assign(S, { file, canvas, w: canvas.width, h: canvas.height });
        if (srcImg) { if (srcImg.src) URL.revokeObjectURL(srcImg.src); srcImg.src = URL.createObjectURL(file); srcImg.classList.add('is-shown'); }
        $('dropzone').hidden = true;
        $('source-badge').textContent = `${S.w} × ${S.h} · ${NAME[file.type] || (file.type || 'image').replace('image/', '').toUpperCase()} · ${formatBytes(file.size)}`;
        $('result-badge').textContent = 'Ready'; $('btn-compress').disabled = false;
        if (T.onLoad) T.onLoad(S); sync(); autoRun();
      } catch (e) { console.warn(e); showError("Couldn't decode that image. Try JPG, PNG, WebP, GIF, AVIF or BMP (HEIC only opens in Safari)."); $('source-badge').textContent = 'No file loaded'; }
    }
    bindDropzone($('dropzone'), $('file-input'), loadFile, { accept: T.accept === undefined ? 'image/' : T.accept });
    function setOutput(blob, w, h, label) {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = blob; S.outW = w; S.outH = h; S.outUrl = URL.createObjectURL(blob);
      $('output-badge').textContent = label || `${w} × ${h} · ${NAME[blob.type] || blob.type} · ${formatBytes(blob.size)}`;
      $('output-empty').hidden = true; $('btn-download').disabled = false; $('btn-copy').disabled = false;
    }
    async function run() {
      if (S.busy || !S.canvas) return;
      const bad = T.validate && T.validate(S); if (bad) return showError(bad);
      S.busy = true; setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Working…'); showError('');
      const t0 = performance.now();
      try {
        const r = await T.run(S, { progress, type: outType(S), q: outQ(), encode });
        if (r.canvas && !r.blob) { r.blob = await encode(r.canvas, outType(S), outQ()); r.w = r.canvas.width; r.h = r.canvas.height; S.outCanvas = r.canvas; }
        if (T.present) T.present(r, S, setOutput);
        else { setOutput(r.blob, r.w, r.h); outImg.src = S.outUrl; outImg.classList.add('is-shown'); }
        $('result-badge').textContent = r.note || `Done in ${((performance.now() - t0) / 1000).toFixed(2)} s`; progress(1, T.actionLabel);
      } catch (e) { console.warn(e); showError(e.message || 'Something went wrong — try a smaller image.'); $('result-badge').textContent = 'Failed'; progress(0); }
      finally { S.busy = false; setBusy(card, false); $('btn-compress').disabled = !S.canvas; if (!S.out) { $('btn-download').disabled = true; $('btn-copy').disabled = true; } setTimeout(() => $('progress-bar').classList.remove('active'), 600); }
    }
    $('btn-compress').addEventListener('click', run);
    const outName = () => `${stem(S.file ? S.file.name : 'image')}-${T.suffix}.${T.outExt ? T.outExt(S) : EXT[S.out.type] || 'png'}`;
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, outName()));
    $('btn-copy').addEventListener('click', async () => {
      if (!S.out) return; if (T.copy) return T.copy(S);
      if (S.out.type === 'image/png') return copyBlob(S.out);
      if (S.outCanvas) return copyBlob(await encode(S.outCanvas, 'image/png'), 'Image copied (PNG)');
      copyText(`${outName()} · ${$('output-badge').textContent}`, 'Summary copied');
    });
    function reset() {
      clearTimeout(timer);
      if (srcImg && srcImg.src) URL.revokeObjectURL(srcImg.src); if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      Object.assign(S, { file: null, canvas: null, w: 0, h: 0, out: null, outUrl: '', outCanvas: null });
      [srcImg, outImg].forEach((el) => { if (el) { el.removeAttribute('src'); el.classList.remove('is-shown'); } });
      $('dropzone').hidden = false; $('output-empty').hidden = false;
      $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; $('result-badge').textContent = 'Drop a file to begin';
      $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
      showError(''); progress(0); resetSettings(); if (T.onReset) T.onReset(S); sync(); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: run, reset });
    sync();
    return { S, run, reset, loadFile, sync, setOutput, showError, progress, srcImg, outImg };
  }

  window.ToolityImage = { MAX_FILE, stem, mk, decode, encode, EXT, NAME, mount };
})();
