/* Toolity.in — shared GIF runtime (window.ToolityGif). Decode: ImageDecoder → gifuct-js fallback. Encode: gifenc (per-frame delays). All on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 50 * 1024 * 1024;
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const clone = (src, w = src.width, h = src.height) => { const c = mk(w, h); c.getContext('2d').drawImage(src, 0, 0, w, h); return c; };

  /* ── Decode → [{ c: canvas(full frame), ms }] ── */
  async function decode(buf) {
    const frames = [];
    if (window.ImageDecoder) {
      try {
        const dec = new ImageDecoder({ data: buf, type: 'image/gif' }); await dec.tracks.ready;
        const n = dec.tracks.selectedTrack.frameCount;
        for (let i = 0; i < n; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          const c = mk(image.displayWidth, image.displayHeight); c.getContext('2d').drawImage(image, 0, 0);
          frames.push({ c, ms: Math.max(20, (image.duration || 100000) / 1000) }); image.close();
        }
        if (frames.length) return frames;
      } catch (e) { console.warn('ImageDecoder failed, using gifuct-js', e); }
    }
    const p = await import('https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm');
    const gif = p.parseGIF(buf), raw = p.decompressFrames(gif, true), W = gif.lsd.width, H = gif.lsd.height;
    const master = mk(W, H), mctx = master.getContext('2d'), tmp = mk(1, 1), tctx = tmp.getContext('2d');
    for (const f of raw) {
      tmp.width = f.dims.width; tmp.height = f.dims.height; tctx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
      if (f.disposalType === 2) mctx.clearRect(0, 0, W, H);
      mctx.drawImage(tmp, f.dims.left, f.dims.top);
      frames.push({ c: clone(master), ms: Math.max(20, f.delay || 100) });
    }
    return frames;
  }
  const loadImage = (file) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error(`Couldn't read ${file.name}`)); img.src = URL.createObjectURL(file); });

  /* ── Encode: gifenc, global palette sampled across frames; per-frame palette when a frame strays too far from it ── */
  // Designed by Kapil Pidhwani: 256 colours, no dithering, transparency as a single key index. Upgrade path: Floyd–Steinberg dither in applyPalette.
  let gifenc = null;
  async function encode(frames, o = {}) {
    gifenc = gifenc || (await import('https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm'));
    const { GIFEncoder, quantize, applyPalette } = gifenc;
    const w = o.w || frames[0].c.width, h = o.h || frames[0].c.height, enc = GIFEncoder();
    const data = (f) => { const c = f.c.width === w && f.c.height === h ? f.c : clone(f.c, w, h); return c.getContext('2d').getImageData(0, 0, w, h).data; };
    const hasAlpha = (d) => { for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 128) return true; return false; };
    const fmt = (d) => (hasAlpha(d) ? 'rgba4444' : 'rgb565');
    // sample up to 8 frames for the global palette
    const step = Math.max(1, Math.floor(frames.length / 8)), sample = [];
    for (let i = 0; i < frames.length; i += step) sample.push(data(frames[i]));
    const total = sample.reduce((s, d) => s + d.length, 0), merged = new Uint8ClampedArray(total); let off = 0;
    for (const d of sample) { merged.set(d, off); off += d.length; }
    const format = fmt(merged), palette = quantize(merged, 256, { format, oneBitAlpha: true });
    const transparentIndex = format === 'rgba4444' ? palette.findIndex((p) => p.length === 4 && p[3] === 0) : -1;
    for (let i = 0; i < frames.length; i++) {
      const d = data(frames[i]);
      const index = applyPalette(d, palette, format);
      enc.writeFrame(index, w, h, { palette: i === 0 ? palette : undefined, first: i === 0, delay: Math.round(frames[i].ms), repeat: o.repeat ?? 0, transparent: transparentIndex >= 0, transparentIndex: Math.max(0, transparentIndex), dispose: transparentIndex >= 0 ? 2 : -1 });
      if (o.onProgress) o.onProgress((i + 1) / frames.length);
      if (i % 4 === 3) await sleep(0);
    }
    enc.finish();
    return new Blob([enc.bytes()], { type: 'image/gif' });
  }

  /* ── Frame-range control (ids rng-start/rng-end as frame indices) — scrubbing paints the frame on #scrub-canvas ── */
  function bindFrameRange(getFrames, onChange) {
    const a = $('rng-start'), b = $('rng-end'), canvas = $('scrub-canvas'), R = { from: 0, to: 0, n: 0 };
    const txt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    const paintFrame = (i) => { const f = getFrames()[i]; if (!f || !canvas) return; if (canvas.width !== f.c.width || canvas.height !== f.c.height) { canvas.width = f.c.width; canvas.height = f.c.height; } canvas.getContext('2d').drawImage(f.c, 0, 0); canvas.classList.add('is-shown'); const img = $('source-img'); if (img) img.classList.remove('is-shown'); };
    const paint = () => { txt('rng-start-val', `#${R.from + 1}`); txt('rng-end-val', `#${R.to + 1}`); const ms = getFrames().slice(R.from, R.to + 1).reduce((s, f) => s + f.ms, 0); txt('rng-len', `${R.to - R.from + 1} frames · ${(ms / 1000).toFixed(1)} s`); if (onChange) onChange(R); };
    const set = (from, to) => { R.from = Math.max(0, Math.min(from, R.n - 1)); R.to = b ? Math.max(R.from, Math.min(to, R.n - 1)) : R.n - 1; a.value = R.from; if (b) b.value = R.to; paint(); };
    a.addEventListener('input', () => { set(Math.min(+a.value, R.to), R.to); paintFrame(R.from); });
    if (b) b.addEventListener('input', () => { set(R.from, Math.max(+b.value, R.from)); paintFrame(R.to); });
    R.reset = (n) => { R.n = n; a.max = Math.max(0, n - 1); a.step = 1; if (b) { b.max = a.max; b.step = 1; } if (n) set(0, n - 1); $('rng-wrap').hidden = !n; if (canvas && !n) canvas.classList.remove('is-shown'); };
    R.paintFrame = paintFrame; R.set = set;
    return R;
  }

  /* ── Page controller (mirrors ToolityVideo.mount for GIF pages: <img id="source-img">, <img id="output-img">) ── */
  /* mount({ actionLabel, verb, suffix, multiple, accept, onLoad(S), onFiles(files, S), validate(S), run(S, api) → { blob, w, h, n } | custom, present(r, S, setOutput), summary(S), onReset(S), outExt(S), copy(S) }) */
  function mount(T) {
    const card = $('tool-card'), srcImg = $('source-img'), outImg = $('output-img');
    const S = { file: null, frames: [], w: 0, h: 0, ms: 0, out: null, outUrl: '', outW: 0, outH: 0, busy: false, stop: false };
    const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { $('progress-fill').style.width = `${Math.round((p || 0) * 100)}%`; $('btn-compress-label').textContent = label || T.actionLabel; };
    const onProgress = (p) => progress(p, `${T.verb || 'Encoding'} ${Math.round(p * 100)}%`);
    const sync = () => { if (T.summary) $('settings-summary').textContent = T.summary(S); };
    const panel = document.querySelector('.tool-settings-panel');
    if (panel) panel.addEventListener('input', (e) => { if (T.onSetting) T.onSetting(e.target, S); sync(); });
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
        const frames = await decode(await file.arrayBuffer());
        if (!frames.length) throw new Error('empty');
        Object.assign(S, { file, frames, w: frames[0].c.width, h: frames[0].c.height, ms: frames.reduce((s, f) => s + f.ms, 0) });
        if (srcImg) { if (srcImg.src) URL.revokeObjectURL(srcImg.src); srcImg.src = URL.createObjectURL(file); srcImg.classList.add('is-shown'); }
        $('dropzone').hidden = true;
        $('source-badge').textContent = `${S.w} × ${S.h} · ${frames.length} frames · ${(S.ms / 1000).toFixed(1)} s · ${formatBytes(file.size)}`;
        $('result-badge').textContent = 'Ready'; $('btn-compress').disabled = false;
        if (T.onLoad) T.onLoad(S); sync();
      } catch (e) { console.warn(e); showError("Couldn't decode that GIF."); $('source-badge').textContent = 'No file loaded'; }
    }
    bindDropzone($('dropzone'), $('file-input'), T.multiple ? (files) => T.onFiles(files, S) : loadFile, { accept: T.accept || 'image/gif', multiple: !!T.multiple });
    function setOutput(blob, w, h, label) {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = blob; S.outW = w; S.outH = h; S.outUrl = URL.createObjectURL(blob);
      $('output-badge').textContent = label || `${w} × ${h} · ${formatBytes(blob.size)}`;
      $('output-empty').hidden = true; $('btn-download').disabled = false; $('btn-copy').disabled = false;
    }
    async function run() {
      if (S.busy || (!S.frames.length && !T.multiple)) return;
      const bad = T.validate && T.validate(S); if (bad) return showError(bad);
      S.busy = true; S.stop = false; setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
      const t0 = performance.now();
      try {
        const r = await T.run(S, { onProgress, progress, stop: () => S.stop, encode });
        if (T.present) T.present(r, S, setOutput);
        else { setOutput(r.blob, r.w, r.h, `${r.w} × ${r.h} · ${r.n} frames · ${formatBytes(r.blob.size)}`); outImg.src = S.outUrl; outImg.classList.add('is-shown'); }
        $('result-badge').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s`; progress(1, 'Run again');
      } catch (e) {
        if (!/Cancelled/.test(String(e.message))) { console.warn(e); showError(e.message || 'Something went wrong — try a smaller GIF.'); $('result-badge').textContent = 'Failed'; }
        progress(0);
      } finally { S.busy = false; setBusy(card, false); $('btn-compress').disabled = !S.frames.length && !T.multiple; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
    }
    $('btn-compress').addEventListener('click', run);
    const outName = () => `${stem(S.file ? S.file.name : 'image')}-${T.suffix}.${T.outExt ? T.outExt(S) : 'gif'}`;
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, outName()));
    $('btn-copy').addEventListener('click', () => { if (!S.out) return; if (T.copy) return T.copy(S); const c = mk(S.outW, S.outH); const img = new Image(); img.onload = () => { c.getContext('2d').drawImage(img, 0, 0); c.toBlob((b) => copyBlob(b, 'First frame copied (PNG)'), 'image/png'); }; img.src = S.outUrl; });
    function reset() {
      S.stop = true;
      if (srcImg && srcImg.src) URL.revokeObjectURL(srcImg.src); if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      Object.assign(S, { file: null, frames: [], w: 0, h: 0, ms: 0, out: null, outUrl: '' });
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

  window.ToolityGif = { MAX_FILE, stem, mk, clone, decode, loadImage, encode, bindFrameRange, mount };
})();
