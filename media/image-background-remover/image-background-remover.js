/* Designed by Kapil Pidhwani: Image Background Remover — Transformers.js (MODNet / BiRefNet Lite) on WebGPU or WASM, fully on-device */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1/dist/transformers.min.js';
  const MAX_PIXELS = 25e6, WORK_SIDE = 2048; // Designed by Kapil Pidhwani: images are matted at ≤2048 px and the mask is upscaled — fine for photos, soft on 8K line art.
  const SPECS = {
    modnet: { id: 'Xenova/modnet', input: 'input', output: 'output', sigmoid: false, dtype: { webgpu: 'fp32', wasm: 'fp32' }, label: 'Portrait model' },
    birefnet: { id: 'onnx-community/BiRefNet_lite-ONNX', input: 'input_image', output: 'output_image', sigmoid: true, dtype: { webgpu: 'fp16', wasm: 'fp32' }, label: 'Any-object model' }
  };
  const S = { file: null, img: null, out: null, maskCanvas: null, busy: false };
  const models = {};
  let lib = null, device = null;

  const showError = (msg) => { const e = $('input-error'); e.hidden = !msg; e.querySelector('span').textContent = msg; };
  const status = (t) => { $('result-badge').textContent = t; };
  const progress = (pct) => { $('progress-bar').classList.toggle('active', pct != null); $('progress-fill').style.width = (pct || 0) + '%'; };
  const bgColor = () => ($('opt-bg').value === 'custom' ? $('opt-bg-color').value : $('opt-bg').value);
  const syncSummary = () => {
    $('opt-bg-color').hidden = $('opt-bg').value !== 'custom';
    $('settings-summary').textContent = `${SPECS[$('opt-model').value].label} · ${$('opt-bg').value ? 'Filled ' + bgColor() : 'Transparent'}`;
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
    return (device = ok ? 'webgpu' : 'wasm');
  }
  async function getModel(kind) {
    if (models[kind]) return models[kind];
    const tf = await getLib(), spec = SPECS[kind];
    const dev = await pickDevice();
    const progress_callback = (p) => {
      if (p.status === 'progress' && /\.onnx/.test(p.file || '')) { progress(p.progress); status(`Downloading model… ${Math.round(p.progress)}% of ${formatBytes(p.total)}`); }
    };
    status('Preparing model…');
    const load = async (d) => {
      const model = await tf.AutoModel.from_pretrained(spec.id, { device: d, dtype: spec.dtype[d], progress_callback });
      const processor = await tf.AutoProcessor.from_pretrained(spec.id);
      return { model, processor, spec, device: d };
    };
    try { models[kind] = await load(dev); }
    catch (e) { if (dev === 'wasm') throw e; console.warn('WebGPU failed, retrying on WASM', e); device = 'wasm'; models[kind] = await load('wasm'); }
    return models[kind];
  }

  /* ── Inference ── */
  async function matte(kind) {
    const { RawImage } = await getLib();
    const { model, processor, spec } = await getModel(kind);
    const W = S.img.naturalWidth, H = S.img.naturalHeight, scale = Math.min(1, WORK_SIDE / Math.max(W, H));
    const work = document.createElement('canvas');
    work.width = Math.round(W * scale); work.height = Math.round(H * scale);
    work.getContext('2d').drawImage(S.img, 0, 0, work.width, work.height);
    const image = await RawImage.fromCanvas(work);
    const { pixel_values } = await processor(image);
    const out = await model({ [spec.input]: pixel_values });
    let t = out[spec.output][0];
    if (spec.sigmoid) t = t.sigmoid();
    const mask = await RawImage.fromTensor(t.mul(255).to('uint8')).resize(work.width, work.height);
    // alpha → canvas so the browser does the final upscale with smoothing
    const mc = document.createElement('canvas'); mc.width = work.width; mc.height = work.height;
    const id = mc.getContext('2d').createImageData(mc.width, mc.height);
    for (let i = 0, j = 0; i < mask.data.length; i++, j += 4) { id.data[j] = id.data[j + 1] = id.data[j + 2] = 255; id.data[j + 3] = mask.data[i]; }
    mc.getContext('2d').putImageData(id, 0, 0);
    return mc;
  }
  function compose() {
    const W = S.img.naturalWidth, H = S.img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.drawImage(S.maskCanvas, 0, 0, W, H);           // alpha
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(S.img, 0, 0, W, H);                  // colour where alpha > 0
    const fill = bgColor();
    if (fill) { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H); }
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  async function present() {
    S.out = await compose();
    if ($('out-img').src) URL.revokeObjectURL($('out-img').src);
    $('out-img').src = URL.createObjectURL(S.out);
    $('bgr-out').hidden = false; $('output-empty').hidden = true;
    $('output-badge').textContent = `${S.img.naturalWidth} × ${S.img.naturalHeight} · PNG · ${formatBytes(S.out.size)}`;
    $('btn-download').disabled = false; $('btn-copy').disabled = false;
  }
  async function run() {
    if (!S.img || S.busy) return;
    S.busy = true; setBusy($('tool-card'), true); $('btn-compress').disabled = true; showError(''); progress(0);
    const t0 = performance.now();
    try {
      S.maskCanvas = await matte($('opt-model').value);
      status('Compositing…');
      await present();
      status(`Done in ${((performance.now() - t0) / 1000).toFixed(1)} s on ${device === 'webgpu' ? 'WebGPU' : 'WebAssembly'}`);
    } catch (e) {
      console.warn(e);
      showError(/fetch|network|Failed to/i.test(String(e)) ? "Couldn't download the model — check your connection and try again." : 'Background removal failed on this image. Try the other model in Settings.');
      status('Failed');
    } finally { S.busy = false; setBusy($('tool-card'), false); $('btn-compress').disabled = false; progress(null); }
  }

  /* ── Load ── */
  function load(file) {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) { URL.revokeObjectURL(url); return showError(`That image is ${(img.naturalWidth * img.naturalHeight / 1e6).toFixed(0)} MP — the limit is 25 MP.`); }
      clearOutput();
      S.file = file; S.img = img; S.maskCanvas = null; showError('');
      $('source-img').src = url; $('source-img').classList.add('bgr-show'); $('cmp-img').src = url; $('dropzone').hidden = true;
      $('source-badge').textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(file.size)}`;
      $('btn-compress').disabled = false;
      status('Ready — click Remove background');
    };
    img.onerror = () => { URL.revokeObjectURL(url); showError("Couldn't decode that image. Try a JPG, PNG or WebP."); };
    img.src = url;
  }
  function clearOutput() {
    S.out = null; $('bgr-out').hidden = true; $('output-empty').hidden = false;
    $('output-badge').textContent = 'Awaiting file'; $('btn-download').disabled = true; $('btn-copy').disabled = true;
    $('cmp-range').value = 0; $('bgr-out').style.setProperty('--x', '0%');
  }
  function reset() {
    clearOutput();
    S.file = null; S.img = null; S.maskCanvas = null;
    $('source-img').classList.remove('bgr-show'); $('source-img').removeAttribute('src'); $('dropzone').hidden = false; $('file-input').value = '';
    $('source-badge').textContent = 'No file loaded'; $('btn-compress').disabled = true; showError('');
    $('opt-model').value = 'modnet'; $('opt-bg').value = ''; $('opt-bg-color').value = '#f4f1ea'; syncSummary();
    status('Drop an image to begin'); toast('Reset');
  }
  const baseName = () => (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'image');
  const download = () => S.out && downloadBlob(S.out, `${baseName()}-no-bg.png`);
  const copy = () => S.out && copyBlob(S.out, 'Image copied to clipboard (PNG)');

  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'image/' });
  $('btn-compress').addEventListener('click', run);
  $('btn-reset').addEventListener('click', reset);
  $('btn-download').addEventListener('click', download);
  $('btn-copy').addEventListener('click', copy);
  $('cmp-range').addEventListener('input', (e) => $('bgr-out').style.setProperty('--x', e.target.value + '%'));
  $('opt-model').addEventListener('change', () => { syncSummary(); if (S.maskCanvas) { S.maskCanvas = null; clearOutput(); status('Model changed — click Remove background'); } });
  $('opt-bg').addEventListener('change', () => { syncSummary(); if (S.maskCanvas) present(); });
  $('opt-bg-color').addEventListener('input', () => { syncSummary(); if (S.maskCanvas) present(); });
  bindShortcuts({ primary: download, reset });
  syncSummary();
  window.__bgr = { run, load, S, pickDevice }; // self-check hook
})();
