/* Toolity.in — shared audio runtime (window.ToolityAudio). Web Audio decode → OfflineAudioContext processing → lamejs MP3 / WAV / Opus. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, formatTime, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 200 * 1024 * 1024;
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const AC = window.AudioContext || window.webkitAudioContext;
  let live = null; const liveCtx = () => (live = live || new AC());

  /* ── Decode / buffers ── */
  async function decode(blobOrBuf) {
    const data = blobOrBuf instanceof ArrayBuffer ? blobOrBuf : await blobOrBuf.arrayBuffer();
    const ctx = new AC(); try { return await ctx.decodeAudioData(data); } finally { ctx.close(); }
  }
  const make = (ch, len, rate) => new AudioBuffer({ numberOfChannels: ch, length: Math.max(1, Math.round(len)), sampleRate: rate });
  function slice(buf, from, to) {
    const a = Math.max(0, Math.floor(from * buf.sampleRate)), b = Math.min(buf.length, Math.ceil(to * buf.sampleRate)), out = make(buf.numberOfChannels, b - a, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).slice(a, b), c);
    return out;
  }
  function concat(bufs, gapSec = 0) {
    const rate = bufs[0].sampleRate, ch = Math.max(...bufs.map((b) => b.numberOfChannels)), gap = Math.round(gapSec * rate);
    const out = make(ch, bufs.reduce((s, b) => s + b.length, 0) + gap * (bufs.length - 1), rate); let off = 0;
    bufs.forEach((b, i) => { for (let c = 0; c < ch; c++) out.copyToChannel(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), c, off); off += b.length + (i < bufs.length - 1 ? gap : 0); });
    return out;
  }
  const clone = (buf) => slice(buf, 0, buf.duration);
  /* fade(buf, inSec, outSec, curve 'linear'|'smooth'|'exp') — in place, returns buf */
  const CURVES = { linear: (t) => t, smooth: (t) => Math.sin((Math.PI / 2) * t) ** 2, exp: (t) => (Math.exp(4 * t) - 1) / (Math.exp(4) - 1) };
  function fade(buf, inSec, outSec, curve = 'linear') {
    const f = CURVES[curve] || CURVES.linear, n = buf.length, a = Math.min(n, Math.round(inSec * buf.sampleRate)), b = Math.min(n, Math.round(outSec * buf.sampleRate));
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < a; i++) d[i] *= f(i / a);
      for (let i = 0; i < b; i++) d[n - 1 - i] *= f(i / b);
    }
    return buf;
  }
  const peak = (buf) => { let p = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > p) p = v; } } return p; };
  /* offline(buf, build(ctx, source) → lastNode | undefined, { length, rate, channels }) → rendered AudioBuffer */
  async function offline(buf, build, o = {}) {
    const ctx = new OfflineAudioContext(o.channels || buf.numberOfChannels, Math.max(1, Math.round(o.length || buf.length)), o.rate || buf.sampleRate);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const tail = (build && build(ctx, src)) || src; tail.connect(ctx.destination); src.start(0);
    return ctx.startRendering();
  }
  // Designed by Kapil Pidhwani: WSOLA time-stretch (Hann 60 ms grains, 4× overlap, ±10 ms correlation search so grains splice in phase). Clean on speech and tones; dense polyphonic music at <0.5× / >2× can still flutter. Upgrade path: phase vocoder.
  function stretch(buf, factor) { // factor > 1 = longer/slower
    if (Math.abs(factor - 1) < 1e-3) return buf;
    const rate = buf.sampleRate, grain = Math.round(rate * 0.06), hopOut = Math.round(grain / 4), hopIn = hopOut / factor, maxD = Math.round(rate * 0.01), ovl = hopOut;
    const outLen = Math.round(buf.length * factor), out = make(buf.numberOfChannels, outLen, rate), win = new Float32Array(grain);
    for (let i = 0; i < grain; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / grain);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const src = buf.getChannelData(c), dst = out.getChannelData(c), norm = new Float32Array(outLen);
      for (let o = 0, k = 0, prev = -1; o < outLen; o += hopOut, k++) {
        let s = Math.round(k * hopIn); if (s >= src.length) break;
        if (prev >= 0) { // pick the candidate that best continues the previous grain
          const target = prev + hopOut; let best = -Infinity, bd = 0;
          if (target + ovl <= src.length) for (let d = -maxD; d <= maxD; d += 4) { const cand = s + d; if (cand < 0 || cand + ovl > src.length) continue; let cc = 0; for (let i = 0; i < ovl; i += 4) cc += src[cand + i] * src[target + i]; if (cc > best) { best = cc; bd = d; } }
          s += bd;
        }
        prev = s;
        for (let i = 0; i < grain && o + i < outLen && s + i < src.length; i++) { dst[o + i] += src[s + i] * win[i]; norm[o + i] += win[i]; }
      }
      for (let i = 0; i < outLen; i++) if (norm[i] > 1e-4) dst[i] /= norm[i];
    }
    return out;
  }
  const resampleTo = (buf, rate, channels) => (buf.sampleRate === rate && (!channels || channels === buf.numberOfChannels) ? Promise.resolve(buf) : offline(buf, null, { rate, length: buf.duration * rate, channels: channels || buf.numberOfChannels }));

  /* ── Encode ── */
  const toI16 = (f32) => { const o = new Int16Array(f32.length); for (let i = 0; i < f32.length; i++) { const v = Math.max(-1, Math.min(1, f32[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
  // Designed by Kapil Pidhwani: lamejs on the main thread in 50-block slices with a yield so progress paints (~15× realtime). Upgrade path: a Worker.
  async function mp3(buf, kbps, onProgress) {
    if (!window.lamejs) throw new Error('MP3 encoder is still loading — try again in a second.');
    const ch = Math.min(2, buf.numberOfChannels), enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, kbps);
    const L = toI16(buf.getChannelData(0)), R = ch > 1 ? toI16(buf.getChannelData(1)) : null, parts = [], B = 1152, n = buf.length;
    for (let i = 0; i < n; i += B * 50) {
      for (let j = i; j < Math.min(n, i + B * 50); j += B) { const b = ch > 1 ? enc.encodeBuffer(L.subarray(j, j + B), R.subarray(j, j + B)) : enc.encodeBuffer(L.subarray(j, j + B)); if (b.length) parts.push(b); }
      if (onProgress) onProgress(i / n); await sleep(0);
    }
    const tail = enc.flush(); if (tail.length) parts.push(tail);
    return new Blob(parts, { type: 'audio/mpeg' });
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
    for (let i = 0, p = 44; i < n; i++) for (let c = 0; c < ch; c++, p += 2) { const v = Math.max(-1, Math.min(1, chans[c][i])); out.setInt16(p, v < 0 ? v * 32768 : v * 32767, true); }
    return new Blob([out], { type: 'audio/wav' });
  }
  /* Opus via MediaRecorder — real time (1 min of audio = 1 min of waiting); browsers have no offline Opus encoder. */
  async function opus(buf, onProgress, stop) {
    const mime = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error('This browser cannot encode Opus. Choose MP3 or WAV.');
    const ctx = liveCtx(); if (ctx.state === 'suspended') await Promise.race([ctx.resume(), sleep(1500)]);
    const dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = buf; src.connect(dest);
    const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 128000 }), chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    rec.start(250); const t0 = ctx.currentTime; src.start();
    await new Promise((resolve, reject) => { src.onended = resolve; const tick = () => { if (rec.state === 'inactive') return; if (stop && stop()) { src.stop(); return reject(new Error('Cancelled')); } if (onProgress) onProgress(Math.min(0.99, (ctx.currentTime - t0) / buf.duration)); setTimeout(tick, 200); }; tick(); });
    await sleep(100); rec.stop(); return done;
  }
  /* fmt: 'mp3-128' | 'mp3-192' | 'mp3-320' | 'wav' | 'opus' */
  async function encode(buf, fmt, onProgress, stop) {
    if (fmt === 'wav') return wav(buf);
    if (fmt === 'opus') return opus(buf, onProgress, stop);
    return mp3(buf, Number(fmt.split('-')[1]) || 128, onProgress);
  }
  const extFor = (fmt, blobType) => (fmt === 'wav' ? 'wav' : fmt === 'opus' ? (/ogg/.test(blobType || '') ? 'ogg' : 'webm') : 'mp3');
  const fmtLabel = (fmt) => (fmt === 'wav' ? 'WAV · 16-bit' : fmt === 'opus' ? 'Opus' : `MP3 · ${fmt.split('-')[1]} kbps`);

  /* ── Waveform (peaks per column; mono mix) ── */
  function waveform(canvas, buf, color) {
    const W = canvas.width = canvas.clientWidth * (devicePixelRatio || 1) || 600, H = canvas.height = canvas.clientHeight * (devicePixelRatio || 1) || 80, ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H); if (!buf) return;
    ctx.fillStyle = color || getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#e8590c';
    const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), per = buf.length / W;
    for (let x = 0; x < W; x++) {
      let min = 1, max = -1; const a = Math.floor(x * per), b = Math.min(buf.length, Math.floor((x + 1) * per) + 1), step = Math.max(1, Math.floor((b - a) / 200));
      for (const d of chans) for (let i = a; i < b; i += step) { const v = d[i]; if (v < min) min = v; if (v > max) max = v; }
      if (min > max) { min = 0; max = 0; }
      ctx.fillRect(x, ((1 - max) * H) / 2, 1, Math.max(1, ((max - min) * H) / 2));
    }
    canvas.classList.add('is-shown');
  }

  /* ── Page controller. mount({ actionLabel, verb, suffix, multiple, noFile, onLoad, onFiles, validate, run(S, api) → { buf } | { blob, buf? } | custom, present, summary, fmtRange(el), onSetting, onReset, copy }) ── */
  function mount(T) {
    const card = $('tool-card'), srcA = $('source-audio'), outA = $('output-audio');
    const S = { file: null, buf: null, out: null, outUrl: '', outBuf: null, fmt: 'mp3-128', busy: false, stop: false };
    const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { $('progress-fill').style.width = `${Math.round((p || 0) * 100)}%`; $('btn-compress-label').textContent = label || T.actionLabel; };
    const onProgress = (p, label) => progress(p, `${label || T.verb || 'Processing'} ${Math.round(p * 100)}%`);
    const outFmt = () => ($('opt-out') ? $('opt-out').value : 'mp3-128');
    const panel = document.querySelector('.tool-settings-panel');
    const paintBadges = () => panel && panel.querySelectorAll('input[type="range"]').forEach((el) => { const b = $(`${el.id}-val`); if (b) b.textContent = T.fmtRange ? T.fmtRange(el) : el.value; });
    const sync = () => { paintBadges(); if (T.summary) $('settings-summary').textContent = T.summary(S); };
    if (panel) panel.addEventListener('input', (e) => { if (T.onSetting) T.onSetting(e.target, S); sync(); });
    const resetSettings = () => panel && panel.querySelectorAll('input, select').forEach((el) => {
      if (el.type === 'file') el.value = '';
      else if (el.type === 'checkbox') el.checked = el.defaultChecked;
      else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value;
      else el.value = el.defaultValue;
    });
    const describe = (buf) => `${formatTime(buf.duration)} · ${buf.numberOfChannels === 1 ? 'Mono' : 'Stereo'} · ${(buf.sampleRate / 1000).toFixed(1)} kHz`;
    function showSource(file, buf) {
      Object.assign(S, { file, buf });
      if (srcA) { if (srcA.src) URL.revokeObjectURL(srcA.src); srcA.src = URL.createObjectURL(file); }
      if ($('source-wrap')) $('source-wrap').hidden = false; if ($('dropzone')) $('dropzone').hidden = true;
      if ($('source-wave')) waveform($('source-wave'), buf);
      $('source-badge').textContent = `${describe(buf)} · ${formatBytes(file.size)}`;
      $('result-badge').textContent = 'Ready'; $('btn-compress').disabled = false;
      if (T.onLoad) T.onLoad(S); sync();
    }
    async function loadFile(file) {
      if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 200 MB.`);
      showError(''); $('source-badge').textContent = 'Decoding…';
      try { showSource(file, await decode(file)); }
      catch (e) { console.warn(e); showError("Couldn't decode that audio file. Try MP3, WAV, M4A, OGG or FLAC."); $('source-badge').textContent = 'No file loaded'; }
    }
    if ($('dropzone')) bindDropzone($('dropzone'), $('file-input'), T.multiple ? (files) => T.onFiles(files, S) : loadFile, { accept: '', multiple: !!T.multiple });
    function setOutput(blob, buf, label) {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = blob; S.outBuf = buf || null; S.outUrl = URL.createObjectURL(blob);
      $('output-badge').textContent = label || `${fmtLabel(S.fmt)}${buf ? ` · ${describe(buf)}` : ''} · ${formatBytes(blob.size)}`;
      if (outA) { outA.src = S.outUrl; } if ($('output-wrap')) $('output-wrap').hidden = false; $('output-empty').hidden = true;
      if ($('output-wave')) waveform($('output-wave'), buf);
      $('btn-download').disabled = false; $('btn-copy').disabled = false;
    }
    async function run() {
      if (S.busy || (!S.buf && !T.multiple && !T.noFile)) return;
      const bad = T.validate && T.validate(S); if (bad) return showError(bad);
      S.busy = true; S.stop = false; S.fmt = outFmt(); setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
      const t0 = performance.now();
      try {
        const r = await T.run(S, { onProgress, progress, stop: () => S.stop, fmt: S.fmt });
        if (!r.blob) r.blob = await encode(r.buf, S.fmt, (p) => onProgress(p, 'Encoding'), () => S.stop);
        if (T.present) T.present(r, S, setOutput); else setOutput(r.blob, r.buf);
        $('result-badge').textContent = r.note || `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s`; progress(1, 'Run again');
      } catch (e) {
        if (!/Cancelled/.test(String(e.message))) { console.warn(e); showError(e.message || 'Something went wrong — try a shorter file.'); $('result-badge').textContent = 'Failed'; }
        progress(0);
      } finally { S.busy = false; setBusy(card, false); $('btn-compress').disabled = !S.buf && !T.multiple && !T.noFile; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
    }
    $('btn-compress').addEventListener('click', run);
    const outName = () => `${stem(S.file ? S.file.name : 'audio')}-${T.suffix}.${extFor(S.fmt, S.out && S.out.type)}`;
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, outName()));
    $('btn-copy').addEventListener('click', () => S.out && (T.copy ? T.copy(S) : copyText(`${outName()} · ${$('output-badge').textContent}`, 'Summary copied')));
    function reset() {
      S.stop = true;
      if (srcA && srcA.src) URL.revokeObjectURL(srcA.src); if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      Object.assign(S, { file: null, buf: null, out: null, outUrl: '', outBuf: null });
      [srcA, outA].forEach((a) => { if (a) { a.pause(); a.removeAttribute('src'); a.load(); } });
      ['source-wave', 'output-wave'].forEach((id) => { const c = $(id); if (c) { c.classList.remove('is-shown'); c.getContext('2d').clearRect(0, 0, c.width, c.height); } });
      if ($('source-wrap')) $('source-wrap').hidden = true; if ($('output-wrap')) $('output-wrap').hidden = true; if ($('dropzone')) $('dropzone').hidden = false; $('output-empty').hidden = false;
      $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; $('result-badge').textContent = T.noFile ? 'Ready to record' : 'Drop a file to begin';
      $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = !T.noFile;
      showError(''); progress(0); resetSettings(); if (T.onReset) T.onReset(S); sync(); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: run, reset });
    if (T.noFile) $('btn-compress').disabled = false;
    sync();
    return { S, run, reset, loadFile, showSource, sync, setOutput, showError, progress, srcA, outA, describe };
  }

  window.ToolityAudio = { MAX_FILE, stem, decode, make, slice, clone, fade, concat, peak, offline, stretch, resampleTo, encode, mp3, wav, opus, extFor, fmtLabel, waveform, mount, liveCtx };
})();
