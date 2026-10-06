/* Designed by Kapil Pidhwani: Image Background Remover v2 — Transformers.js (BiRefNet Lite on WebGPU / MODNet on WASM), auto-run, Restore/Erase brush with stroke-replay undo, all on-device */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1/dist/transformers.min.js';
  const MAX_PIXELS = 25e6, WORK_SIDE = 2048; // Designed by Kapil Pidhwani: matting runs at ≤2048 px, the mask is upscaled — fine for photos, soft on 8K line art.
  const SPECS = {
    modnet: { id: 'Xenova/modnet', input: 'input', output: 'output', sigmoid: false, dtype: { webgpu: 'fp32', wasm: 'fp32' }, label: 'Fast model' },
    birefnet: { id: 'onnx-community/BiRefNet_lite-ONNX', input: 'input_image', output: 'output_image', sigmoid: true, dtype: { webgpu: 'fp16', wasm: 'fp32' }, label: 'HQ model' }
  };
  const S = { file: null, img: null, out: null, base: null, mask: null, strokes: [], busy: false, tool: 'view', usedKind: '' };
  const models = {};
  let lib = null, device = null;
  const outCanvas = $('out-canvas'), stage = $('bgr-out');

  const showError = (msg) => { const e = $('input-error'); e.hidden = !msg; e.querySelector('span').textContent = msg; };
  const status = (t) => { $('result-badge').textContent = t; };
  const progress = (pct) => { $('progress-bar').classList.toggle('active', pct != null); $('progress-fill').style.width = (pct || 0) + '%'; };
  const bgMode = () => $('opt-bg').value;
  const bgColor = () => (bgMode() === 'custom' ? $('opt-bg-color').value : bgMode());
  const syncSummary = () => {
    $('opt-bg-color').hidden = bgMode() !== 'custom';
    const m = $('opt-model').value;
    $('settings-summary').textContent = `${m === 'auto' ? 'Auto model' : SPECS[m].label} · ${bgMode() === 'blur' ? 'Blurred' : bgMode() ? 'Filled ' + bgColor() : 'Transparent'}`;
  };

  /* ── Model loading ── */
  async function getLib() {
    if (lib) return lib;
    lib = await import(LIB);
    lib.env.allowLocalModels = false;
    lib.env.backends.onnx.wasm.numThreads = 1; // no COOP/COEP on static hosting → no SharedArrayBuffer
    return lib;
  }
  async function pickDevice() {
    if (device) return device;
    let ok = false;
    try { ok = !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) { ok = false; }
    device = ok ? 'webgpu' : 'wasm';
    $('opt-model').querySelector('[value="birefnet"]').disabled = device !== 'webgpu'; // HQ needs WebGPU — never run it on WASM (OOM)
    return device;
  }
  const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))]);
  async function getModel(kind, dev) {
    const key = kind + ':' + dev;
    if (models[key]) return models[key];
    const tf = await getLib(), spec = SPECS[kind];
    const progress_callback = (p) => {
      if (p.status === 'progress' && /\.onnx/.test(p.file || '')) { progress(p.progress); status(`Downloading ${spec.label.toLowerCase()}… ${Math.round(p.progress)}% of ${formatBytes(p.total)}`); }
    };
    status(`Preparing ${spec.label.toLowerCase()} (${dev === 'webgpu' ? 'WebGPU' : 'WebAssembly'})…`);
    const model = await withTimeout(tf.AutoModel.from_pretrained(spec.id, { device: dev, dtype: spec.dtype[dev], progress_callback }), 180000, 'Model download');
    const processor = await tf.AutoProcessor.from_pretrained(spec.id);
    return (models[key] = { model, processor, spec });
  }

  /* ── Inference → base mask (full-res alpha canvas) ── */
  // Designed by Kapil Pidhwani: fallback ladder — each rung is isolated so a WebGPU shader failure or a WASM OOM never surfaces as "Failed" while a smaller rung can still work.
  function ladder(pick, dev) {
    const rungs = [];
    if (pick !== 'modnet' && dev === 'webgpu') rungs.push(['birefnet', 'webgpu']);
    if (dev === 'webgpu') rungs.push(['modnet', 'webgpu']);
    rungs.push(['modnet', 'wasm']);
    return rungs;
  }
  async function matte(pick) {
    const dev = await pickDevice();
    let lastErr = null;
    for (const [kind, d] of ladder(pick, dev)) {
      try {
        const mask = await withTimeout(inferOnce(kind, d), 180000, 'Background removal');
        return { mask, kind, dev: d };
      } catch (e) {
        console.warn(`${kind}/${d} failed`, e); lastErr = e;
        delete models[kind + ':' + d];
        if (d === 'webgpu') device = 'wasm';
        status(`${SPECS[kind].label} unavailable on this device — trying the next option…`);
      }
    }
    throw lastErr || new Error('No model could run');
  }
  async function inferOnce(kind, dev) {
    const { RawImage } = await getLib();
    const { model, processor, spec } = await getModel(kind, dev);
    const W = S.img.naturalWidth, H = S.img.naturalHeight, scale = Math.min(1, WORK_SIDE / Math.max(W, H));
    const work = document.createElement('canvas');
    work.width = Math.round(W * scale); work.height = Math.round(H * scale);
    work.getContext('2d').drawImage(S.img, 0, 0, work.width, work.height);
    const { pixel_values } = await processor(await RawImage.fromCanvas(work));
    const out = await model({ [spec.input]: pixel_values });
    const t = out[spec.output];
    const [mh, mw] = t.dims.slice(-2), data = t.data; // raw [1,1,h,w] — no fp16-sensitive tensor ops
    const mc = document.createElement('canvas'); mc.width = mw; mc.height = mh;
    const id = mc.getContext('2d').createImageData(mw, mh);
    for (let i = 0, j = 0; i < mw * mh; i++, j += 4) {
      let v = Number(data[i]); if (spec.sigmoid) v = 1 / (1 + Math.exp(-v));
      id.data[j] = id.data[j + 1] = id.data[j + 2] = 255; id.data[j + 3] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
    mc.getContext('2d').putImageData(id, 0, 0);
    if (!id.data.some((v, i) => i % 4 === 3 && v > 8)) throw new Error('Empty mask'); // all-transparent result = broken run, try next rung
    const full = document.createElement('canvas'); full.width = W; full.height = H;
    const fx = full.getContext('2d'); fx.filter = 'blur(0.6px)'; fx.drawImage(mc, 0, 0, W, H); // light feather softens the upscaled edge
    return full;
  }

  /* ── Mask = base + replayed strokes (undo = pop + replay; no bitmap snapshots) ── */
  function rebuildMask() {
    const W = S.base.width, H = S.base.height;
    if (!S.mask) { S.mask = document.createElement('canvas'); S.mask.width = W; S.mask.height = H; }
    const ctx = S.mask.getContext('2d');
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H); ctx.drawImage(S.base, 0, 0);
    S.strokes.forEach((st) => st.pts.forEach((p) => dab(ctx, st.mode, p.x, p.y, st.r)));
    $('btn-undo').disabled = !S.strokes.length;
  }
  function dab(ctx, mode, x, y, r) {
    const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  /* ── Compose result ── */
  function compose() {
    const W = S.img.naturalWidth, H = S.img.naturalHeight;
    if (outCanvas.width !== W) { outCanvas.width = W; outCanvas.height = H; }
    const ctx = outCanvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.clearRect(0, 0, W, H);
    ctx.drawImage(S.mask, 0, 0);
    ctx.globalCompositeOperation = 'source-in'; ctx.drawImage(S.img, 0, 0, W, H);
    const mode = bgMode();
    if (mode) {
      ctx.globalCompositeOperation = 'destination-over';
      if (mode === 'blur') { const b = Math.max(8, Math.round(Math.max(W, H) / 80)); ctx.filter = `blur(${b}px)`; ctx.drawImage(S.img, -b * 2, -b * 2, W + b * 4, H + b * 4); ctx.filter = 'none'; }
      else { ctx.fillStyle = bgColor(); ctx.fillRect(0, 0, W, H); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  const outType = () => (bgMode() ? 'image/jpeg' : 'image/png');
  const toBlob = () => new Promise((res) => outCanvas.toBlob(res, outType(), 0.92));
  async function present() {
    compose();
    S.out = await toBlob();
    stage.hidden = false; $('output-empty').hidden = true; $('seg-tool').hidden = false;
    $('output-badge').textContent = `${S.img.naturalWidth} × ${S.img.naturalHeight} · ${bgMode() ? 'JPG' : 'PNG'} · ${formatBytes(S.out.size)}`;
    $('btn-download').disabled = false; $('btn-copy').disabled = false;
  }
  async function run() {
    if (!S.img || S.busy) return;
    S.busy = true; setBusy($('tool-card'), true); $('btn-compress').disabled = true; showError(''); progress(0);
    const t0 = performance.now();
    try {
      const pick = $('opt-model').value;
      const r = await matte(pick);
      S.base = r.mask; S.usedKind = r.kind; S.strokes = [];
      rebuildMask();
      status('Compositing…');
      await present();
      $('btn-compress-label').textContent = 'Run again';
      status(`${SPECS[r.kind].label} · ${((performance.now() - t0) / 1000).toFixed(1)} s on ${r.dev === 'webgpu' ? 'WebGPU' : 'WebAssembly'}${r.kind === 'modnet' && pick !== 'modnet' ? (r.dev === 'webgpu' ? ' · HQ model not supported on this GPU' : ' · HQ model needs WebGPU (Chrome/Edge)') : ''}`);
    } catch (e) {
      console.warn(e);
      showError(/fetch|network|Failed to/i.test(String(e)) ? "Couldn't download the model — check your connection and try again." : 'Background removal failed on this image. Try the other model in Settings.');
      status('Failed');
    } finally { S.busy = false; setBusy($('tool-card'), false); $('btn-compress').disabled = false; progress(null); }
  }

  /* ── Brush (Pointer Events; coordinates mapped through object-fit: contain) ── */
  let stroke = null, raf = 0;
  function toImage(e) {
    const r = stage.getBoundingClientRect(), W = S.img.naturalWidth, H = S.img.naturalHeight;
    const sc = Math.min(r.width / W, r.height / H), ox = (r.width - W * sc) / 2, oy = (r.height - H * sc) / 2;
    return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc, sc };
  }
  function moveCursor(e) {
    const c = $('brush-cursor'), r = stage.getBoundingClientRect(), { sc } = toImage(e), d = +$('brush-size').value * sc;
    c.style.width = c.style.height = d + 'px'; c.style.left = (e.clientX - r.left) + 'px'; c.style.top = (e.clientY - r.top) + 'px';
  }
  function paintTo(p) {
    const ctx = S.mask.getContext('2d'), last = stroke.pts[stroke.pts.length - 1], r = stroke.r;
    if (last) { const d = Math.hypot(p.x - last.x, p.y - last.y), n = Math.ceil(d / (r / 3)); for (let i = 1; i <= n; i++) { const q = { x: last.x + (p.x - last.x) * i / n, y: last.y + (p.y - last.y) * i / n }; stroke.pts.push(q); dab(ctx, stroke.mode, q.x, q.y, r); } }
    else { stroke.pts.push(p); dab(ctx, stroke.mode, p.x, p.y, r); }
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; compose(); }); // Designed by Kapil Pidhwani: full-res recompose per frame; ~100 ms on 12 MP — acceptable, upgrade path is a display-res preview canvas.
  }
  stage.addEventListener('pointerdown', (e) => {
    if (S.tool === 'view' || !S.mask || e.button > 0) return;
    e.preventDefault(); stage.setPointerCapture(e.pointerId);
    stroke = { mode: S.tool, r: +$('brush-size').value / 2, pts: [] }; paintTo(toImage(e));
  });
  stage.addEventListener('pointermove', (e) => { if (S.tool !== 'view') moveCursor(e); if (stroke) paintTo(toImage(e)); });
  const endStroke = async () => { if (!stroke) return; S.strokes.push(stroke); stroke = null; $('btn-undo').disabled = false; await present(); };
  stage.addEventListener('pointerup', endStroke); stage.addEventListener('pointercancel', endStroke);
  stage.addEventListener('pointerenter', () => { $('brush-cursor').hidden = S.tool === 'view'; });
  stage.addEventListener('pointerleave', () => { $('brush-cursor').hidden = true; });
  async function undo() { if (!S.strokes.length) return; S.strokes.pop(); rebuildMask(); await present(); }
  function setTool(t) {
    S.tool = t;
    stage.classList.toggle('bgr-painting', t !== 'view');
    $('brush-row').hidden = t === 'view'; $('cmp-range').hidden = t !== 'view';
    if (t !== 'view') { $('cmp-range').value = 0; stage.style.setProperty('--x', '0%'); }
  }

  /* ── Load / reset ── */
  function load(file) {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) { URL.revokeObjectURL(url); return showError(`That image is ${(img.naturalWidth * img.naturalHeight / 1e6).toFixed(0)} MP — the limit is 25 MP.`); }
      clearOutput();
      S.file = file; S.img = img; showError('');
      $('source-img').src = url; $('source-img').classList.add('bgr-show'); $('cmp-img').src = url; $('dropzone').hidden = true;
      $('source-badge').textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(file.size)}`;
      $('btn-compress').disabled = false;
      run(); // remove.bg behaviour: no extra click
    };
    img.onerror = () => { URL.revokeObjectURL(url); showError("Couldn't decode that image. Try a JPG, PNG or WebP."); };
    img.src = url;
  }
  function clearOutput() {
    S.out = null; S.base = null; S.mask = null; S.strokes = []; stroke = null;
    stage.hidden = true; $('output-empty').hidden = false; $('seg-tool').hidden = true;
    $('output-badge').textContent = 'Awaiting file'; $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-undo').disabled = true;
    $('btn-compress-label').textContent = 'Remove background';
    document.querySelectorAll('#seg-tool .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'view')); setTool('view');
    $('cmp-range').value = 0; stage.style.setProperty('--x', '0%');
  }
  function reset() {
    clearOutput();
    S.file = null; S.img = null;
    $('source-img').classList.remove('bgr-show'); $('source-img').removeAttribute('src'); $('dropzone').hidden = false; $('file-input').value = '';
    $('source-badge').textContent = 'No file loaded'; $('btn-compress').disabled = true; showError('');
    $('opt-model').value = 'auto'; $('opt-bg').value = ''; $('opt-bg-color').value = '#f4f1ea'; $('brush-size').value = 40; $('brush-size-val').textContent = '40'; syncSummary();
    status('Drop an image to begin'); toast('Reset');
  }
  const baseName = () => (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'image');
  const download = () => S.out && downloadBlob(S.out, `${baseName()}-no-bg.${bgMode() ? 'jpg' : 'png'}`);
  const copy = () => S.out && new Promise((res) => outCanvas.toBlob(res, 'image/png')).then((b) => copyBlob(b, 'Image copied to clipboard (PNG)'));

  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'image/' });
  bindSegmented($('seg-tool'), setTool);
  $('btn-compress').addEventListener('click', run);
  $('btn-reset').addEventListener('click', reset);
  $('btn-download').addEventListener('click', download);
  $('btn-copy').addEventListener('click', copy);
  $('btn-undo').addEventListener('click', undo);
  $('brush-size').addEventListener('input', (e) => { $('brush-size-val').textContent = e.target.value; });
  $('cmp-range').addEventListener('input', (e) => stage.style.setProperty('--x', e.target.value + '%'));
  $('opt-model').addEventListener('change', () => { syncSummary(); if (S.base) { status('Model changed — click Run again'); } });
  $('opt-bg').addEventListener('change', () => { syncSummary(); if (S.mask) present(); });
  $('opt-bg-color').addEventListener('input', () => { syncSummary(); if (S.mask) present(); });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && S.strokes.length && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undo(); } });
  bindShortcuts({ primary: download, reset });
  syncSummary();
  window.__bgr = { run, load, S, pickDevice, dab, rebuildMask, present, setTool, undo }; // self-check hook
})();
