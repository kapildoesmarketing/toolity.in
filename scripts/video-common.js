/* Toolity.in — shared video runtime (window.ToolityVideo). Canvas + MediaRecorder real-time re-encode used by every video-* tool. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, formatTime, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 500 * 1024 * 1024;
  const DECODE_ERR = "Couldn't decode that video. Try MP4 (H.264) or WebM.";
  const MIMES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mimeFor = () => (window.MediaRecorder && MIMES.find((m) => MediaRecorder.isTypeSupported(m))) || '';
  const ext = (mime) => ((mime || mimeFor()).includes('mp4') ? 'mp4' : 'webm');
  const even = (n) => Math.max(2, Math.round(n) - (Math.round(n) % 2));
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  // Bitrate heuristic: 0.1 bit per pixel per frame at 30 fps (720p ≈ 2.8 Mbps, 1080p ≈ 6.2 Mbps), clamped to 1–12 Mbps.
  const bpsFor = (w, h) => Math.round(Math.min(12e6, Math.max(1e6, w * h * 3)));
  const fitBox = (w, h, maxH) => (maxH && h > maxH ? [even(w * (maxH / h)), even(maxH)] : [even(w), even(h)]);

  /* ── Loading & seeking ── */
  function load(video, file) {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE) return reject(new Error(`That file is ${formatBytes(file.size)} — the limit is 500 MB.`));
      if (video.src) URL.revokeObjectURL(video.src);
      video.src = URL.createObjectURL(file);
      video.onerror = () => reject(new Error(DECODE_ERR));
      video.onloadedmetadata = () => {
        if (!video.videoWidth) return reject(new Error(DECODE_ERR));
        const finish = () => resolve({ dur: video.duration, w: video.videoWidth, h: video.videoHeight });
        if (isFinite(video.duration)) return finish();
        // WebM from MediaRecorder reports Infinity until seeked past the end.
        video.onseeked = () => { video.onseeked = null; video.currentTime = 0; finish(); };
        video.currentTime = 1e9;
      };
    });
  }
  function seek(video, t) {
    return new Promise((resolve) => {
      const done = () => { video.removeEventListener('seeked', done); clearTimeout(tm); resolve(); };
      const tm = setTimeout(done, 2000); // Designed by Kapil Pidhwani: seeked can be swallowed when t == currentTime; 2 s guard keeps loops alive.
      video.addEventListener('seeked', done);
      video.currentTime = Math.max(0, t);
    });
  }

  /* ── Audio graph (one element source per <video>, re-routed between speakers and the recorder) ── */
  let actx = null; const nodes = new WeakMap();
  const audioCtx = () => (actx = actx || new (window.AudioContext || window.webkitAudioContext)());
  function routeTo(video, dest) {
    const ctx = audioCtx(); let n = nodes.get(video);
    if (!n) { n = ctx.createMediaElementSource(video); nodes.set(video, n); }
    n.disconnect(); n.connect(dest || ctx.destination);
  }
  async function decodeAudio(file) {
    try { const ctx = audioCtx(); return await ctx.decodeAudioData(await file.arrayBuffer()); } catch (e) { return null; }
  }
  function sliceBuffer(buf, from, to, reverse) {
    const ctx = audioCtx(), a = Math.floor(from * buf.sampleRate), b = Math.min(buf.length, Math.ceil(to * buf.sampleRate));
    const out = ctx.createBuffer(buf.numberOfChannels, Math.max(1, b - a), buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c).slice(a, b); if (reverse) d.reverse(); out.copyToChannel(d, c); }
    return out;
  }

  /* ── Recorder ── */
  function recorder(canvas, { audio, vbps, fps = 30 }) {
    const mime = mimeFor();
    if (!mime) throw new Error('This browser cannot record video (no MediaRecorder codec). Try Chrome, Edge or Firefox.');
    const stream = canvas.captureStream(fps);
    let dest = null;
    if (audio) { dest = audioCtx().createMediaStreamDestination(); const t = dest.stream.getAudioTracks()[0]; if (t) stream.addTrack(t); }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vbps || bpsFor(canvas.width, canvas.height), audioBitsPerSecond: audio ? 128000 : undefined });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    const stop = () => { if (rec.state !== 'inactive') rec.stop(); return done; };
    return { rec, dest, stop, mime };
  }
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Designed by Kapil Pidhwani: MediaRecorder encodes in real time (1 min of output = 1 min of waiting) and needs the tab visible for rAF.
  // Upgrade path: WebCodecs VideoEncoder + mp4-muxer runs 5-10× faster but needs its own demux/mux code.
  /* render({ w, h, segments: [{ video, from, to, rate }], draw(ctx, video, w, h, t), audio, vbps, onProgress(p, secondsLeft), stop() }) → { blob, mime, w, h } */
  async function render(o) {
    const w = even(o.w), h = even(o.h), [canvas, ctx] = makeCanvas(w, h);
    const draw = o.draw || ((c, v) => c.drawImage(v, 0, 0, w, h));
    if (o.audio && audioCtx().state === 'suspended') await Promise.race([audioCtx().resume(), sleep(1500)]);
    const R = recorder(canvas, o);
    const total = o.segments.reduce((s, g) => s + (g.to - g.from) / (g.rate || 1), 0);
    let played = 0, started = false;
    try {
      for (const seg of o.segments) {
        const v = seg.video, rate = seg.rate || 1;
        v.pause(); v.muted = !o.audio; v.playbackRate = rate;
        if (o.audio) routeTo(v, R.dest);
        await seek(v, seg.from);
        draw(ctx, v, w, h, seg.from);
        if (!started) { R.rec.start(250); started = true; }
        let playErr = null; v.play().catch((e) => { playErr = e; });
        // Designed by Kapil Pidhwani: rAF for smooth capture + a 250 ms interval watchdog so throttled tabs still progress; 8 s without
        // currentTime moving = stall → reject (never hang the UI).
        await new Promise((resolve, reject) => {
          let done = false, lastT = -1, lastMove = performance.now(), raf = 0, iv = 0;
          const finish = (fn, arg) => { if (done) return; done = true; clearInterval(iv); cancelAnimationFrame(raf); fn(arg); };
          const step = () => {
            if (done) return;
            if (o.stop && o.stop()) return finish(reject, new Error('Cancelled'));
            if (playErr) return finish(reject, new Error(`Playback was blocked (${playErr.name}). Click the video once, then try again.`));
            const t = Math.min(v.currentTime, seg.to);
            if (t !== lastT) { lastT = t; lastMove = performance.now(); } else if (performance.now() - lastMove > 8000) return finish(reject, new Error('Playback stalled — keep this tab visible while encoding and try again.'));
            draw(ctx, v, w, h, t);
            const el = played + (t - seg.from) / rate;
            if (o.onProgress) o.onProgress(Math.min(0.99, el / total), Math.max(0, total - el));
            if (v.ended || v.currentTime >= seg.to - 0.02) finish(resolve);
          };
          const loop = () => { step(); if (!done) raf = requestAnimationFrame(loop); };
          iv = setInterval(step, 250); raf = requestAnimationFrame(loop);
        });
        v.pause(); played += (seg.to - seg.from) / rate;
      }
    } finally {
      for (const seg of o.segments) { seg.video.pause(); seg.video.muted = false; seg.video.playbackRate = 1; if (nodes.has(seg.video)) routeTo(seg.video, null); }
    }
    const blob = await R.stop();
    return { blob, mime: R.mime, w, h };
  }

  /* extractFrames(video, { from, to, step, max, w, h, type, quality, draw, onProgress, stop }) → [{ t, blob }] (seek-and-grab, ~20–50 ms per frame) */
  async function extractFrames(video, o) {
    const w = even(o.w), h = even(o.h), [canvas, ctx] = makeCanvas(w, h);
    const draw = o.draw || ((c, v) => c.drawImage(v, 0, 0, w, h));
    const times = []; for (let t = o.from; t < o.to - 1e-6 && times.length < (o.max || 1e9); t += o.step) times.push(t);
    video.pause(); const wasMuted = video.muted; video.muted = true;
    const out = [];
    try {
      for (let i = 0; i < times.length; i++) {
        if (o.stop && o.stop()) throw new Error('Cancelled');
        await seek(video, times[i]); draw(ctx, video, w, h, times[i]);
        out.push({ t: times[i], blob: await new Promise((r) => canvas.toBlob(r, o.type || 'image/jpeg', o.quality ?? 0.92)) });
        if (o.onProgress) o.onProgress((i + 1) / times.length);
      }
    } finally { video.muted = wasMuted; }
    return out;
  }

  /* renderFrames({ frames: [Blob], fps, w, h, audioBuffer, vbps, onProgress, stop }) → { blob, mime, w, h } — plays captured frames back at fps (reverse / boomerang). */
  async function renderFrames(o) {
    const w = even(o.w), h = even(o.h), [canvas, ctx] = makeCanvas(w, h), n = o.frames.length, fps = o.fps || 24;
    if (o.audioBuffer && audioCtx().state === 'suspended') await audioCtx().resume();
    const R = recorder(canvas, { audio: !!o.audioBuffer, vbps: o.vbps, fps });
    let bm = await createImageBitmap(o.frames[0]); ctx.drawImage(bm, 0, 0, w, h); bm.close();
    R.rec.start(250);
    let srcNode = null;
    if (o.audioBuffer) { srcNode = audioCtx().createBufferSource(); srcNode.buffer = o.audioBuffer; srcNode.connect(R.dest); srcNode.start(); }
    const t0 = performance.now(); let next = n > 1 ? createImageBitmap(o.frames[1]) : null;
    try {
      for (let i = 1; i < n; i++) {
        if (o.stop && o.stop()) throw new Error('Cancelled');
        bm = await next; next = i + 1 < n ? createImageBitmap(o.frames[i + 1]) : null;
        const wait = t0 + (i / fps) * 1000 - performance.now(); if (wait > 0) await sleep(wait);
        ctx.drawImage(bm, 0, 0, w, h); bm.close();
        if (o.onProgress) o.onProgress(Math.min(0.99, i / n), (n - i) / fps);
      }
      await sleep(1000 / fps + 150);
    } finally { if (srcNode) srcNode.stop(); }
    const blob = await R.stop();
    return { blob, mime: R.mime, w, h };
  }

  /* recordAudio(video, from, to, onProgress, stop) → Blob (audio-only real-time capture; fallback when decodeAudioData can't parse the container) */
  async function recordAudio(video, from, to, onProgress, stop) {
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error('This browser cannot record audio.');
    if (audioCtx().state === 'suspended') await audioCtx().resume();
    const dest = audioCtx().createMediaStreamDestination(); routeTo(video, dest);
    const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 192000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    video.pause(); video.muted = false; await seek(video, from); rec.start(250); video.play().catch(() => {});
    try {
      await new Promise((resolve, reject) => {
        const tick = () => {
          if (stop && stop()) return reject(new Error('Cancelled'));
          if (onProgress) onProgress(Math.min(0.99, (video.currentTime - from) / (to - from)), Math.max(0, to - video.currentTime));
          if (video.ended || video.currentTime >= to - 0.02) return resolve();
          setTimeout(tick, 100);
        };
        tick();
      });
    } finally { video.pause(); routeTo(video, null); rec.stop(); }
    return done;
  }

  /* ── Trim-range control: two sliders (ids start/end + value badges + "use playhead" buttons), scrubbing seeks the preview ── */
  function bindRange(video, onChange) {
    const a = $('rng-start'), b = $('rng-end'), R = { from: 0, to: 0, dur: 0 };
    const fmt = (t) => `${formatTime(t)}.${Math.floor((t % 1) * 10)}`;
    const paint = () => { $('rng-start-val').textContent = fmt(R.from); $('rng-end-val').textContent = fmt(R.to); $('rng-len').textContent = fmt(Math.max(0, R.to - R.from)); if (onChange) onChange(R); };
    const set = (from, to) => { R.from = Math.max(0, Math.min(from, R.dur)); R.to = Math.max(R.from + 0.1, Math.min(to, R.dur)); a.value = R.from; b.value = R.to; paint(); };
    a.addEventListener('input', () => { set(Math.min(+a.value, R.to - 0.1), R.to); video.currentTime = R.from; });
    b.addEventListener('input', () => { set(R.from, Math.max(+b.value, R.from + 0.1)); video.currentTime = R.to; });
    $('btn-start-now').addEventListener('click', () => set(video.currentTime, R.to));
    $('btn-end-now').addEventListener('click', () => set(R.from, video.currentTime));
    R.reset = (dur) => { R.dur = dur; a.max = b.max = dur; a.step = b.step = 0.1; set(0, dur); $('rng-wrap').hidden = !dur; };
    R.reset(0);
    return R;
  }

  /* ── Page controller: owns load → run → present → reset for the standard split page ── */
  /* mount({ actionLabel, verb, suffix, multiple, onLoad(S), onFiles(files, S), validate(S), run(S, api) → { blob, mime, w, h } | custom, present(result, S), summary(S), onReset(S), copyText(S) }) */
  function mount(T) {
    const card = $('tool-card'), src = $('source-video'), outV = $('output-video');
    const S = { file: null, dur: 0, w: 0, h: 0, out: null, mime: '', outW: 0, outH: 0, busy: false, stop: false, outUrl: '' };
    const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { $('progress-fill').style.width = `${Math.round((p || 0) * 100)}%`; $('btn-compress-label').textContent = label || T.actionLabel; };
    const onProgress = (p, left) => progress(p, `${T.verb || 'Processing'} ${Math.round(p * 100)}%${left != null ? ` · ${formatTime(left)} left` : ''}`);
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
      showError('');
      try {
        const info = await load(src, file);
        Object.assign(S, info, { file });
        src.classList.add('is-shown'); $('dropzone').hidden = true;
        $('source-badge').textContent = `${S.w} × ${S.h} · ${formatTime(S.dur)} · ${formatBytes(file.size)}`;
        $('result-badge').textContent = 'Ready'; $('btn-compress').disabled = false;
        if (T.onLoad) T.onLoad(S); sync();
      } catch (e) { showError(e.message); }
    }
    bindDropzone($('dropzone'), $('file-input'), T.multiple ? (files) => T.onFiles(files, S) : loadFile, { accept: 'video/', multiple: !!T.multiple });
    function setOutput(blob, w, h, label) {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = blob; S.outW = w; S.outH = h; S.mime = blob.type; S.outUrl = URL.createObjectURL(blob);
      $('output-badge').textContent = label || `${w} × ${h} · ${ext(blob.type).toUpperCase()} · ${formatBytes(blob.size)}`;
      $('output-empty').hidden = true; $('btn-download').disabled = false; $('btn-copy').disabled = false;
    }
    async function run() {
      if (S.busy || (!S.file && !T.multiple)) return;
      const bad = T.validate && T.validate(S); if (bad) return showError(bad);
      S.busy = true; S.stop = false; setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
      const t0 = performance.now();
      try {
        const r = await T.run(S, { src, onProgress, progress, stop: () => S.stop });
        if (T.present) T.present(r, S, setOutput);
        else { setOutput(r.blob, r.w, r.h); outV.src = S.outUrl; outV.classList.add('is-shown'); }
        $('result-badge').textContent = `Done in ${formatTime((performance.now() - t0) / 1000)}`; progress(1, 'Run again');
      } catch (e) {
        if (!/Cancelled/.test(String(e.message))) { console.warn(e); showError(e.message || 'Something went wrong — try a shorter clip.'); $('result-badge').textContent = 'Failed'; }
        progress(0);
      } finally { S.busy = false; setBusy(card, false); $('btn-compress').disabled = !S.file && !T.multiple; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
    }
    $('btn-compress').addEventListener('click', run);
    const outName = () => `${stem(S.file ? S.file.name : 'video')}-${T.suffix}.${T.outExt ? T.outExt(S) : ext(S.mime)}`;
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, outName()));
    $('btn-copy').addEventListener('click', () => S.out && copyText(T.copyText ? T.copyText(S) : `${outName()} · ${S.outW} × ${S.outH} · ${formatBytes(S.out.size)}`, 'Summary copied'));
    function reset() {
      S.stop = true;
      if (src.src) URL.revokeObjectURL(src.src); if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      Object.assign(S, { file: null, dur: 0, w: 0, h: 0, out: null, mime: '', outUrl: '' });
      [src, outV].forEach((v) => { if (!v) return; v.pause(); v.removeAttribute('src'); v.load(); v.classList.remove('is-shown'); });
      $('dropzone').hidden = false; $('output-empty').hidden = false;
      $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; $('result-badge').textContent = 'Drop a file to begin';
      $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
      showError(''); progress(0); resetSettings(); if (T.onReset) T.onReset(S); sync(); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: run, reset });
    sync();
    return { S, run, reset, loadFile, sync, setOutput, showError, progress, src, outV };
  }

  window.ToolityVideo = { MAX_FILE, mimeFor, ext, even, stem, bpsFor, fitBox, load, seek, audioCtx, routeTo, decodeAudio, sliceBuffer, render, extractFrames, renderFrames, recordAudio, bindRange, mount };
})();
