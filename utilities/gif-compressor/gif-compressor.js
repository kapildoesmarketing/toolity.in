/* GIF Compressor — Toolity.in. Decode frames (ImageDecoder → gifuct-js fallback), re-encode with gifshot: scale, frame-drop, colours. All on-device. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 50 * 1024 * 1024;
  const DEF = { scale: 1, drop: 1, colors: 1 };
  const S = { ...DEF, file: null, frames: [], w: 0, h: 0, duration: 0, out: null, outW: 0, outH: 0, outFrames: 0 };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const show = (el, on) => el.classList.toggle('gfc-show', on);
  const progress = (p) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = p >= 1 ? 'Compress GIF' : `Compressing ${Math.round(p * 100)}%`; };

  /* ── Decode: native ImageDecoder first, gifuct-js (lazy ESM) on Firefox/Safari ── */
  async function decode(buf) {
    const frames = [];
    if (window.ImageDecoder) {
      try {
        const dec = new ImageDecoder({ data: buf, type: 'image/gif' });
        await dec.tracks.ready;
        const n = dec.tracks.selectedTrack.frameCount;
        for (let i = 0; i < n; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          const c = document.createElement('canvas'); c.width = image.displayWidth; c.height = image.displayHeight;
          c.getContext('2d').drawImage(image, 0, 0);
          frames.push({ c, ms: (image.duration || 100000) / 1000 }); image.close();
        }
        if (frames.length) return frames;
      } catch (e) { console.warn('ImageDecoder failed, using gifuct-js', e); }
    }
    const p = await import('https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm');
    const gif = p.parseGIF(buf), raw = p.decompressFrames(gif, true), W = gif.lsd.width, H = gif.lsd.height;
    const master = document.createElement('canvas'); master.width = W; master.height = H; const mctx = master.getContext('2d');
    const tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
    for (const f of raw) {
      tmp.width = f.dims.width; tmp.height = f.dims.height; tctx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
      if (f.disposalType === 2) mctx.clearRect(0, 0, W, H);
      mctx.drawImage(tmp, f.dims.left, f.dims.top);
      const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(master, 0, 0);
      frames.push({ c, ms: f.delay || 100 });
    }
    return frames;
  }

  async function load(file) {
    if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 50 MB.`);
    showError(''); $('source-badge').textContent = 'Decoding…';
    try {
      const frames = await decode(await file.arrayBuffer());
      S.file = file; S.frames = frames; S.w = frames[0].c.width; S.h = frames[0].c.height; S.duration = frames.reduce((a, f) => a + f.ms, 0);
      $('source-img').src = URL.createObjectURL(file); show($('source-img'), true); $('dropzone').hidden = true;
      $('source-badge').textContent = `${S.w} × ${S.h} · ${frames.length} frames · ${formatBytes(file.size)}`;
      $('result-badge').textContent = `${formatBytes(file.size)} → press Compress`;
      $('btn-compress').disabled = false; syncSummary();
    } catch (e) { console.warn(e); showError("Couldn't decode that GIF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'image/gif' });

  /* ── Encode ── */
  // Designed by Kapil Pidhwani: gifshot takes ONE interval for all frames, so kept frames are re-timed to total/kept — loop duration is preserved,
  // per-frame timing is averaged. Upgrade path: gif.js (per-frame delays) or WebCodecs-free custom LZW writer.
  function compress() {
    return new Promise((resolve, reject) => {
      if (!window.gifshot) return reject(new Error('GIF engine is still loading — try again in a second.'));
      const kept = S.frames.filter((_, i) => i % S.drop === 0);
      let w = Math.max(2, Math.round(S.w * S.scale)), h = Math.max(2, Math.round(S.h * S.scale)); w -= w % 2; h -= h % 2;
      const images = kept.map((f) => { if (w === S.w && h === S.h) return f.c; const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(f.c, 0, 0, w, h); return c; });
      gifshot.createGIF({
        images, numFrames: images.length, gifWidth: w, gifHeight: h, interval: Math.max(0.02, S.duration / kept.length / 1000),
        sampleInterval: S.colors, numWorkers: Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4)), progressCallback: progress,
      }, async (o) => {
        if (o.error) return reject(new Error(o.errorMsg || 'Encoding failed'));
        resolve({ blob: await (await fetch(o.image)).blob(), w, h, n: images.length });
      });
    });
  }
  async function run() {
    if (!S.frames.length || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0);
    try {
      const r = await compress();
      const keep = r.blob.size >= S.file.size && S.scale === 1 && S.drop === 1;
      if (S.out) URL.revokeObjectURL($('output-img').src);
      S.out = keep ? S.file : r.blob; S.outW = r.w; S.outH = r.h; S.outFrames = r.n;
      $('output-img').src = URL.createObjectURL(S.out); show($('output-img'), true); $('output-empty').hidden = true;
      const pct = Math.round((1 - S.out.size / S.file.size) * 100);
      $('output-badge').textContent = `${r.w} × ${r.h} · ${r.n} frames · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.toggle('gfc-win', pct > 0);
      $('result-badge').textContent = keep ? `${formatBytes(S.file.size)} → already optimal, original kept` : `${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} · ${pct >= 0 ? '−' : '+'}${Math.abs(pct)}%`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { showError(e.message); progress(1); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  /* ── Settings ── */
  function syncSummary() {
    $('settings-summary').textContent = `Scale ${Math.round(S.scale * 100)}% · ${S.drop === 1 ? 'All frames' : `Every ${S.drop === 2 ? '2nd' : '3rd'} dropped`} · ${{ 1: 256, 10: 128, 20: 64 }[S.colors]} colours`;
  }
  $('opt-scale').addEventListener('change', (e) => { S.scale = Number(e.target.value); syncSummary(); });
  $('opt-drop').addEventListener('change', (e) => { S.drop = Number(e.target.value); syncSummary(); });
  $('opt-colors').addEventListener('change', (e) => { S.colors = Number(e.target.value); syncSummary(); });

  /* ── Actions ── */
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, `${S.file.name.replace(/\.gif$/i, '')}-compressed.gif`));
  $('btn-copy').addEventListener('click', () => { if (!S.frames.length) return; S.frames[0].c.toBlob((b) => copyBlob(b, 'First frame copied (PNG)'), 'image/png'); });
  function reset() {
    if (S.file) URL.revokeObjectURL($('source-img').src);
    if (S.out) URL.revokeObjectURL($('output-img').src);
    Object.assign(S, DEF, { file: null, frames: [], out: null });
    show($('source-img'), false); show($('output-img'), false); $('dropzone').hidden = false; $('output-empty').hidden = false;
    $('source-img').removeAttribute('src'); $('output-img').removeAttribute('src');
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
    $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('gfc-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
    $('opt-scale').value = '1'; $('opt-drop').value = '1'; $('opt-colors').value = '1';
    showError(''); syncSummary(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  syncSummary();
  window.__gfc = { S, run, load, decode };
})();
