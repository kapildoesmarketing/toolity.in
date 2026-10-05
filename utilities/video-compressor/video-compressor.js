/* Video Compressor — Toolity.in. Canvas + MediaRecorder re-encode at a chosen bitrate / target size / resolution. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, formatTime, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 500 * 1024 * 1024;
  const DEF = { preset: 2500000, target: 0, res: 0, audio: 'keep' };
  const S = { ...DEF, file: null, dur: 0, w: 0, h: 0, out: null, outW: 0, outH: 0, mime: '' };
  const src = $('source-video'), outV = $('output-video');
  let audioCtx = null, srcNode = null;

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const show = (el, on) => el.classList.toggle('vdc-show', on);
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Compress Video'; };

  /* Bitrate maths: target MB wins over preset; audio budget is subtracted so the whole file hits the target. */
  const audioBps = () => (S.audio === 'mute' ? 0 : S.audio === 'low' ? 64000 : 128000);
  function videoBps() {
    if (!S.target || !S.dur) return S.preset;
    return Math.max(150000, Math.round((S.target * 8 * 1024 * 1024) / S.dur - audioBps()));
  }
  const estimate = () => S.dur ? ((videoBps() + audioBps()) * S.dur) / 8 : 0;
  function dims() {
    let w = S.w, h = S.h;
    if (S.res && h > S.res) { w = Math.round(w * (S.res / h)); h = S.res; }
    return [w - (w % 2), h - (h % 2)];
  }
  function mimeFor() {
    const list = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  }

  /* ── Load ── */
  function load(file) {
    if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 500 MB.`);
    showError('');
    if (S.file) URL.revokeObjectURL(src.src);
    src.src = URL.createObjectURL(file);
    src.onloadedmetadata = () => {
      if (!src.videoWidth) { showError("Couldn't decode that video. Try MP4 (H.264) or WebM."); return; }
      S.file = file; S.dur = src.duration; S.w = src.videoWidth; S.h = src.videoHeight;
      show(src, true); $('dropzone').hidden = true;
      $('source-badge').textContent = `${S.w} × ${S.h} · ${formatTime(S.dur)} · ${formatBytes(file.size)}`;
      $('btn-compress').disabled = false; syncSummary();
    };
    src.onerror = () => showError("Couldn't decode that video. Try MP4 (H.264) or WebM.");
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'video/' });

  /* ── Encode ── */
  // Designed by Kapil Pidhwani: MediaRecorder encodes in real time (1 min of video = 1 min of waiting) and needs the tab visible for rAF.
  // Upgrade path: WebCodecs VideoEncoder + mp4-muxer runs 5-10× faster but needs its own demux/mux code.
  let stopFlag = false;
  async function compress() {
    const [w, h] = dims(), mime = mimeFor();
    if (!mime) throw new Error('This browser cannot record video (no MediaRecorder codec).');
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    src.muted = S.audio === 'mute';
    if (S.audio !== 'mute') {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      srcNode = srcNode || audioCtx.createMediaElementSource(src);
      const dest = audioCtx.createMediaStreamDestination();
      srcNode.disconnect(); srcNode.connect(dest); // not connected to speakers → silent while encoding
      const t = dest.stream.getAudioTracks()[0]; if (t) stream.addTrack(t);
    }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoBps(), audioBitsPerSecond: audioBps() || undefined });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    src.pause(); src.currentTime = 0; await new Promise((r) => src.addEventListener('seeked', r, { once: true }));
    src.playbackRate = 1; rec.start(250); await src.play();
    await new Promise((resolve) => {
      const loop = () => {
        ctx.drawImage(src, 0, 0, w, h);
        progress(Math.min(0.99, src.currentTime / S.dur), `Compressing ${Math.round((src.currentTime / S.dur) * 100)}% · ${formatTime(Math.max(0, S.dur - src.currentTime))} left`);
        if (src.ended || src.currentTime >= S.dur || stopFlag) { src.pause(); rec.stop(); resolve(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    const blob = await done;
    src.muted = false; if (srcNode) { srcNode.disconnect(); srcNode.connect(audioCtx.destination); }
    return { blob, w, h, mime };
  }
  async function run() {
    if (!S.file || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); stopFlag = false; showError('');
    try {
      const r = await compress();
      const keep = r.blob.size >= S.file.size && !S.res;
      if (S.out) URL.revokeObjectURL(outV.src);
      S.out = keep ? S.file : r.blob; S.outW = r.w; S.outH = r.h; S.mime = keep ? S.file.type : r.blob.type;
      outV.src = URL.createObjectURL(S.out); show(outV, true); $('output-empty').hidden = true;
      const pct = Math.round((1 - S.out.size / S.file.size) * 100);
      $('output-badge').textContent = `${r.w} × ${r.h} · ${ext().toUpperCase()} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.toggle('vdc-win', pct > 0);
      $('result-badge').textContent = keep ? `${formatBytes(S.file.size)} → already smaller than target, original kept` : `${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} · ${pct >= 0 ? '−' : '+'}${Math.abs(pct)}%`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.error(e); showError(e.message || 'Compression failed — try a shorter clip or lower resolution.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  /* ── Settings ── */
  const ext = () => (S.mime || mimeFor()).includes('mp4') ? 'mp4' : 'webm';
  function syncSummary() {
    const q = S.target ? `Target ${S.target} MB` : { 1000000: 'Small 1 Mbps', 2500000: 'Balanced 2.5 Mbps', 5000000: 'High 5 Mbps' }[S.preset];
    $('settings-summary').textContent = `${q} · ${S.res ? S.res + 'p' : 'Original resolution'} · ${{ keep: 'Keep audio', low: 'Audio 64 kbps', mute: 'No audio' }[S.audio]}`;
    if (S.file && !S.out) $('result-badge').textContent = `${formatBytes(S.file.size)} → ≈ ${formatBytes(estimate())} estimated`;
  }
  $('opt-preset').addEventListener('change', (e) => { S.preset = Number(e.target.value); S.target = 0; $('opt-target').value = ''; syncSummary(); });
  $('opt-target').addEventListener('input', (e) => { const v = Number(e.target.value); S.target = v >= 1 ? v : 0; syncSummary(); });
  $('opt-res').addEventListener('change', (e) => { S.res = Number(e.target.value); syncSummary(); });
  $('opt-audio').addEventListener('change', (e) => { S.audio = e.target.value; syncSummary(); });

  /* ── Actions ── */
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, `${S.file.name.replace(/\.[^.]+$/, '')}-compressed.${ext()}`));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: ${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} (${S.outW}×${S.outH}, ${ext().toUpperCase()})`, 'Summary copied'));
  function reset() {
    stopFlag = true;
    if (S.file) URL.revokeObjectURL(src.src);
    if (S.out) URL.revokeObjectURL(outV.src);
    Object.assign(S, DEF, { file: null, dur: 0, out: null, mime: '' });
    src.pause(); outV.pause(); src.removeAttribute('src'); outV.removeAttribute('src'); src.load(); outV.load();
    show(src, false); show(outV, false); $('dropzone').hidden = false; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
    $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('vdc-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
    $('opt-preset').value = '2500000'; $('opt-target').value = ''; $('opt-res').value = '0'; $('opt-audio').value = 'keep';
    showError(''); syncSummary(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  syncSummary();
  window.__vdc = { S, run, load, videoBps, estimate, dims, mimeFor };
})();
