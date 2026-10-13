/* Audio Spectrum Visualizer — Toolity.in. AnalyserNode → canvas (log-spaced bars, oscilloscope or scrolling spectrogram). Live while
 * the source plays; "Record video" replays the decoded buffer through the analyser into canvas.captureStream + MediaRecorder (real time).
 * Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { copyBlob, formatBytes, formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  const cv = $('viz'), g = cv.getContext('2d'), outV = $('output-video');
  const MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function size() { const [w, h] = $('opt-size').value.split('x').map(Number); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; clear(); } }
  const clear = () => { g.fillStyle = $('opt-bg').value; g.fillRect(0, 0, cv.width, cv.height); };
  function draw(an) {
    const W = cv.width, H = cv.height, style = $('opt-style').value, fg = $('opt-color').value, bg = $('opt-bg').value;
    if (style === 'gram') { // scroll left 2 px, paint the newest column on the right
      const f = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(f);
      g.drawImage(cv, -2, 0); const [r1, g1, b1] = hex(bg), [r2, g2, b2] = hex(fg);
      for (let y = 0; y < H; y++) { const k = Math.min(f.length - 1, Math.floor(Math.pow(f.length, 1 - y / H))), v = f[k] / 255; g.fillStyle = `rgb(${r1 + (r2 - r1) * v | 0},${g1 + (g2 - g1) * v | 0},${b1 + (b2 - b1) * v | 0})`; g.fillRect(W - 2, y, 2, 1); }
      return;
    }
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.strokeStyle = fg;
    if (style === 'wave') {
      const t = new Float32Array(an.fftSize); an.getFloatTimeDomainData(t);
      g.lineWidth = Math.max(2, H / 180); g.beginPath();
      for (let i = 0; i < t.length; i++) { const x = (i / (t.length - 1)) * W, y = H / 2 - t[i] * H * 0.45; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); return;
    }
    const f = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(f);
    const bars = 64, gap = W / bars * 0.2, bw = W / bars - gap, lo = 2, hi = f.length * 0.8; // log-spaced 2-bin … ~17 kHz
    for (let b = 0; b < bars; b++) {
      const a = Math.floor(lo * Math.pow(hi / lo, b / bars)), z = Math.max(a + 1, Math.floor(lo * Math.pow(hi / lo, (b + 1) / bars)));
      let m = 0; for (let k = a; k < z; k++) m = Math.max(m, f[k]);
      const h = Math.max(2, (m / 255) * H * 0.9); g.fillRect(b * (bw + gap) + gap / 2, H - h, bw, h);
    }
  }
  const analyser = (ctx) => { const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.78; return an; };
  let liveAn = null, raf = 0;
  function loop() { if (liveAn && !T.srcA.paused) draw(liveAn); raf = T.srcA.paused ? 0 : requestAnimationFrame(loop); }
  function showViz() { cv.classList.add('is-shown'); outV.classList.remove('is-shown'); $('output-empty').hidden = true; }
  async function record(S, api) {
    const mime = MIMES.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)); if (!mime) throw new Error('This browser cannot record video. Try Chrome, Edge or Firefox.');
    T.srcA.pause(); size(); clear(); showViz();
    const ctx = A.liveCtx(); if (ctx.state === 'suspended') await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1500))]);
    const an = analyser(ctx), dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = S.buf; src.connect(an); an.connect(dest);
    const stream = cv.captureStream(30); stream.addTrack(dest.stream.getAudioTracks()[0]);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.min(8e6, cv.width * cv.height * 3), audioBitsPerSecond: 160000 }), chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = () => r(new Blob(chunks, { type: mime.split(';')[0] })); });
    rec.start(250); const t0 = ctx.currentTime; src.start();
    try {
      await new Promise((resolve, reject) => { // rAF for smooth frames + interval watchdog: 8 s with the clock stuck = reject (never hang)
        let last = -1, moved = performance.now(), done = false, fr = 0;
        const end = (fn, arg) => { if (done) return; done = true; clearInterval(iv); cancelAnimationFrame(fr); fn(arg); };
        src.onended = () => end(resolve);
        const tick = () => {
          if (api.stop()) { try { src.stop(); } catch (e) { /* already stopped */ } return end(reject, new Error('Cancelled')); }
          const t = ctx.currentTime - t0; if (t !== last) { last = t; moved = performance.now(); } else if (performance.now() - moved > 8000) return end(reject, new Error('Recording stalled — keep this tab visible and try again.'));
          api.progress(Math.min(0.99, t / S.buf.duration), `Recording ${formatTime(t)} / ${formatTime(S.buf.duration)}`);
        };
        const iv = setInterval(tick, 250); const paint = () => { draw(an); if (!done) fr = requestAnimationFrame(paint); }; paint();
      });
    } finally { if (rec.state !== 'inactive') rec.stop(); src.disconnect(); an.disconnect(); }
    return stopped;
  }
  const T = A.mount({
    actionLabel: 'Record video', verb: 'Recording', suffix: 'visualizer',
    summary: () => `${$('opt-style').selectedOptions[0].textContent.replace(/ \(.*/, '')} · ${$('opt-size').value.replace('x', ' × ')}`,
    onLoad: () => { size(); clear(); showViz(); },
    onSetting: (el) => { if (el.id === 'opt-size' || el.id === 'opt-bg' || el.id === 'opt-style') { size(); clear(); } },
    onReset: () => { cv.classList.remove('is-shown'); outV.classList.remove('is-shown'); outV.removeAttribute('src'); },
    run: async (S, api) => ({ blob: await record(S, api), note: 'Video recorded' }),
    present: (r, S, setOutput) => { setOutput(r.blob, null, `${$('opt-size').value.replace('x', ' × ')} · ${r.blob.type.includes('mp4') ? 'MP4' : 'WebM'} · ${formatBytes(r.blob.size)}`); outV.src = S.outUrl; outV.classList.add('is-shown'); cv.classList.remove('is-shown'); },
    outExt: (S) => (S.out.type.includes('mp4') ? 'mp4' : 'webm'),
    copy: () => cv.toBlob((b) => copyBlob(b, 'Frame copied (PNG)'), 'image/png')
  });
  T.srcA.addEventListener('play', () => {
    const ctx = A.liveCtx(); if (ctx.state === 'suspended') ctx.resume();
    if (!liveAn) { liveAn = analyser(ctx); ctx.createMediaElementSource(T.srcA).connect(liveAn); liveAn.connect(ctx.destination); }
    size(); showViz(); if (!raf) loop();
  });
  window.__viz = { T, draw };
})();
