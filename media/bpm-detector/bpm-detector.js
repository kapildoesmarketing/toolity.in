/* Beat / BPM Detector — Toolity.in. Onset envelope (positive log-energy flux at 200 fps, local mean removed) → autocorrelation over
 * the chosen tempo octave (+ half weight on the double lag), parabolic peak refinement, best beat phase → click track mixed over
 * the song. Plus tap tempo. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { copyText } = window.Toolity, $ = (id) => document.getElementById(id);
  const FPS = 200;
  // Designed by Kapil Pidhwani: broadband energy flux, no FFT — solid on drum-driven music. Ceiling: beatless / rubato material
  // and swing can lock to the wrong subdivision (the confidence drops). Upgrade path: multi-band spectral flux + dynamic programming beat tracking.
  function onsets(buf) {
    const hop = buf.sampleRate / FPS, n = Math.floor(buf.length / hop), chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    const e = new Float32Array(n);
    for (let f = 0; f < n; f++) { const a = Math.floor(f * hop), b = Math.floor((f + 1) * hop); let s = 0; for (const d of chans) for (let i = a; i < b; i++) s += d[i] * d[i]; e[f] = Math.log(1 + 1000 * Math.sqrt(s / ((b - a) * chans.length))); }
    const o = new Float32Array(n); for (let f = 1; f < n; f++) o[f] = Math.max(0, e[f] - e[f - 1]);
    const W = FPS / 4, out = new Float32Array(n); let acc = 0; // subtract a 0.5 s centred moving average
    for (let f = 0; f < n + W; f++) { if (f < n) acc += o[f]; if (f - 2 * W - 1 >= 0) acc -= o[f - 2 * W - 1]; const c = f - W; if (c >= 0 && c < n) out[c] = Math.max(0, o[c] - acc / (2 * W + 1)); }
    return out;
  }
  function tempo(o, lo) {
    const ac = (L) => { let s = 0; for (let i = 0; i + L < o.length; i++) s += o[i] * o[i + L]; return s / (o.length - L); };
    const minL = Math.floor((60 * FPS) / (2 * lo)), maxL = Math.ceil((60 * FPS) / lo), r = [];
    for (let L = minL - 1; L <= maxL + 1; L++) r[L] = ac(L) + 0.5 * ac(2 * L);
    let best = minL; for (let L = minL; L <= maxL; L++) if (r[L] > r[best]) best = L;
    const y0 = r[best - 1], y1 = r[best], y2 = r[best + 1], d = y0 - 2 * y1 + y2 ? (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2) : 0;
    const vals = r.slice(minL, maxL + 1), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const period = best + Math.max(-0.5, Math.min(0.5, d));
    let phase = 0, bestS = -1; for (let p = 0; p < period; p++) { let s = 0; for (let t = p; t < o.length; t += period) s += o[Math.round(t)] || 0; if (s > bestS) { bestS = s; phase = p; } }
    return { bpm: (60 * FPS) / period, conf: y1 > 0 ? Math.max(0, Math.min(1, (y1 - mean) / y1)) : 0, phase: phase / FPS, period: period / FPS };
  }
  function clickMix(buf, t, levelDb) {
    const out = A.clone(buf), rate = buf.sampleRate, k = 10 ** (levelDb / 20), len = Math.round(0.03 * rate);
    const click = new Float32Array(len).map((_, i) => Math.sin((2 * Math.PI * 1600 * i) / rate) * Math.exp((-i / len) * 6));
    for (let c = 0; c < out.numberOfChannels; c++) {
      const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= 0.7;
      for (let s = t.phase; s < buf.duration; s += t.period) { const a = Math.round(s * rate); for (let i = 0; i < len && a + i < d.length; i++) d[a + i] += click[i] * k; }
    }
    return out;
  }
  let result = null;
  const T = A.mount({
    actionLabel: 'Detect BPM', verb: 'Encoding', suffix: 'click',
    fmtRange: (el) => (Number(el.value) ? `−${-el.value} dB` : '0 dB'),
    summary: () => { const lo = Number($('opt-range').value); return `${lo}–${2 * lo} BPM · Click ${Number($('opt-click').value) ? `−${-$('opt-click').value} dB` : '0 dB'} · ${A.fmtLabel($('opt-out').value)}`; },
    validate: (S) => (S.buf.duration < 5 ? 'Use at least 5 seconds of audio for a reliable tempo.' : ''),
    run: async (S, api) => {
      api.progress(0.15, 'Listening…'); await new Promise((r) => setTimeout(r, 0));
      result = tempo(onsets(S.buf), Number($('opt-range').value));
      return { buf: clickMix(S.buf, result, Number($('opt-click').value)), note: `${result.bpm.toFixed(1)} BPM · ${Math.round(result.conf * 100)}% confidence` };
    },
    present: (r, S, setOutput) => {
      setOutput(r.blob, r.buf); $('bpm-value').textContent = Math.round(result.bpm);
      $('bpm-sub').textContent = `${result.bpm.toFixed(1)} BPM · ${Math.round(result.conf * 100)}% confidence · half ${(result.bpm / 2).toFixed(1)} · double ${(result.bpm * 2).toFixed(1)}`;
    },
    copy: () => copyText(`${result.bpm.toFixed(1)} BPM`, 'BPM copied'),
    onReset: () => { result = null; $('bpm-value').textContent = '—'; $('bpm-sub').textContent = ''; taps.length = 0; $('tap-badge').textContent = 'Tap 4+ times'; }
  });
  const taps = [];
  function tap() {
    const now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now); if (taps.length > 9) taps.shift();
    $('tap-badge').textContent = taps.length < 4 ? `Tap ${4 - taps.length} more` : `${((60000 * (taps.length - 1)) / (taps[taps.length - 1] - taps[0])).toFixed(1)} BPM (tapped)`;
  }
  $('btn-tap').addEventListener('click', tap);
  window.addEventListener('keydown', (e) => { if ((e.key === 't' || e.key === 'T') && !e.repeat && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) tap(); });
  window.__bpm = { T, onsets, tempo };
})();
