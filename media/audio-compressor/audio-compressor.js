/* Audio Compressor — Toolity.in. Web Audio decode → lamejs MP3 encode at a chosen bitrate / channels / sample rate. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, formatTime, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 200 * 1024 * 1024;
  const DEF = { kbps: 128, channels: 'keep', rate: 0 };
  const S = { ...DEF, file: null, buf: null, out: null };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Compress Audio'; };
  const outCh = () => (S.channels === 'mono' ? 1 : Math.min(2, S.buf.numberOfChannels));
  const outRate = () => S.rate || S.buf.sampleRate;
  const estimate = () => S.buf ? (S.kbps * 1000 * S.buf.duration) / 8 : 0;

  /* ── Load ── */
  async function load(file) {
    if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 200 MB.`);
    showError(''); $('source-badge').textContent = 'Decoding…';
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer()); ctx.close();
      if (S.file) URL.revokeObjectURL($('source-audio').src);
      S.file = file; S.buf = buf;
      $('source-audio').src = URL.createObjectURL(file); $('source-name').textContent = file.name;
      $('source-wrap').hidden = false; $('dropzone').hidden = true;
      $('source-badge').textContent = `${formatTime(buf.duration)} · ${buf.numberOfChannels === 1 ? 'Mono' : 'Stereo'} · ${(buf.sampleRate / 1000).toFixed(1)} kHz · ${formatBytes(file.size)}`;
      $('btn-compress').disabled = false; syncSummary();
    } catch (e) { console.warn(e); showError("Couldn't decode that audio file. Try MP3, WAV, M4A or OGG."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load);

  /* ── Encode ── */
  /* Resample / downmix through an OfflineAudioContext so lamejs only ever sees the final layout. */
  async function prepared() {
    const ch = outCh(), rate = outRate();
    if (ch === S.buf.numberOfChannels && rate === S.buf.sampleRate) return S.buf;
    const off = new OfflineAudioContext(ch, Math.ceil(S.buf.duration * rate), rate);
    const node = off.createBufferSource(); node.buffer = S.buf; node.connect(off.destination); node.start();
    return off.startRendering();
  }
  const toI16 = (f32) => { const o = new Int16Array(f32.length); for (let i = 0; i < f32.length; i++) { const v = Math.max(-1, Math.min(1, f32[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
  // Designed by Kapil Pidhwani: encodes on the main thread in 50-block slices (~1152×50 samples) with a yield between slices so the progress bar
  // paints; ~15× realtime on a laptop. Upgrade path: move lamejs into a Worker.
  async function compress() {
    if (!window.lamejs) throw new Error('MP3 encoder is still loading — try again in a second.');
    const buf = await prepared(), ch = buf.numberOfChannels, n = buf.length;
    const enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, S.kbps);
    const L = toI16(buf.getChannelData(0)), R = ch > 1 ? toI16(buf.getChannelData(1)) : null;
    const parts = [], BLOCK = 1152;
    for (let i = 0; i < n; i += BLOCK * 50) {
      for (let j = i; j < Math.min(n, i + BLOCK * 50); j += BLOCK) {
        const b = ch > 1 ? enc.encodeBuffer(L.subarray(j, j + BLOCK), R.subarray(j, j + BLOCK)) : enc.encodeBuffer(L.subarray(j, j + BLOCK));
        if (b.length) parts.push(b);
      }
      progress(i / n, `Compressing ${Math.round((i / n) * 100)}%`);
      await new Promise((r) => setTimeout(r, 0));
    }
    const tail = enc.flush(); if (tail.length) parts.push(tail);
    return new Blob(parts, { type: 'audio/mpeg' });
  }
  async function run() {
    if (!S.buf || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      const blob = await compress();
      const keep = blob.size >= S.file.size && /mpeg|mp3/.test(S.file.type);
      if (S.out) URL.revokeObjectURL($('output-audio').src);
      S.out = keep ? S.file : blob;
      $('output-audio').src = URL.createObjectURL(S.out); $('output-name').textContent = name(); $('output-wrap').hidden = false; $('output-empty').hidden = true;
      const pct = Math.round((1 - S.out.size / S.file.size) * 100);
      $('output-badge').textContent = `MP3 ${S.kbps} kbps · ${outCh() === 1 ? 'Mono' : 'Stereo'} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.toggle('adc-win', pct > 0);
      $('result-badge').textContent = keep ? `${formatBytes(S.file.size)} → already smaller, original kept` : `${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} · ${pct >= 0 ? '−' : '+'}${Math.abs(pct)}%`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.error(e); showError(e.message || 'Encoding failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  /* ── Settings ── */
  function syncSummary() {
    $('settings-summary').textContent = `MP3 ${S.kbps} kbps · ${S.channels === 'mono' ? 'Mono' : 'Keep channels'} · ${S.rate ? '22.05 kHz' : 'Keep sample rate'}`;
    if (S.buf && !S.out) $('result-badge').textContent = `${formatBytes(S.file.size)} → ≈ ${formatBytes(estimate())} estimated`;
  }
  $('opt-bitrate').addEventListener('change', (e) => { S.kbps = Number(e.target.value); syncSummary(); });
  $('opt-channels').addEventListener('change', (e) => { S.channels = e.target.value; syncSummary(); });
  $('opt-rate').addEventListener('change', (e) => { S.rate = Number(e.target.value); syncSummary(); });

  /* ── Actions ── */
  const name = () => `${S.file.name.replace(/\.[^.]+$/, '')}-compressed.mp3`;
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, name()));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: ${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} (MP3 ${S.kbps} kbps)`, 'Summary copied'));
  function reset() {
    if (S.file) URL.revokeObjectURL($('source-audio').src);
    if (S.out) URL.revokeObjectURL($('output-audio').src);
    Object.assign(S, DEF, { file: null, buf: null, out: null });
    ['source-audio', 'output-audio'].forEach((id) => { $(id).pause(); $(id).removeAttribute('src'); $(id).load(); });
    $('source-wrap').hidden = true; $('output-wrap').hidden = true; $('dropzone').hidden = false; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
    $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('adc-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
    $('opt-bitrate').value = '128'; $('opt-channels').value = 'keep'; $('opt-rate').value = '0';
    showError(''); syncSummary(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  syncSummary();
  window.__adc = { S, run, load, compress, estimate };
})();
