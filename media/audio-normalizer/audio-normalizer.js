/* Audio Normalizer (LUFS) — Toolity.in. ITU-R BS.1770-4 integrated loudness (K-weighting, 400 ms / 75 % blocks, −70 LUFS absolute
 * and −10 LU relative gates), 4× oversampled true peak, then one gain change capped by the ceiling. Via /scripts/audio-common.js. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const db = (x) => 20 * Math.log10(x), fmt = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
  /* K-weighting biquads for any sample rate (coefficients as in pyloudnorm, derived from BS.1770's 48 kHz design). */
  function kCoeffs(fs) {
    let w = (2 * Math.PI * 1681.974450955533) / fs, A_ = 10 ** (3.99984385397 / 40), al = Math.sin(w) / (2 * 0.7071752369554196), cs = Math.cos(w), sq = Math.sqrt(A_);
    const shelf = [A_ * (A_ + 1 + (A_ - 1) * cs + 2 * sq * al), -2 * A_ * (A_ - 1 + (A_ + 1) * cs), A_ * (A_ + 1 + (A_ - 1) * cs - 2 * sq * al), A_ + 1 - (A_ - 1) * cs + 2 * sq * al, 2 * (A_ - 1 - (A_ + 1) * cs), A_ + 1 - (A_ - 1) * cs - 2 * sq * al];
    w = (2 * Math.PI * 38.13547087602444) / fs; al = Math.sin(w) / (2 * 0.5003270373238773); cs = Math.cos(w);
    const hp = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
    return [shelf, hp].map(([b0, b1, b2, a0, a1, a2]) => [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]);
  }
  function biquad(x, [b0, b1, b2, a1, a2]) {
    const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function loudness(buf) {
    const fs = buf.sampleRate, K = kCoeffs(fs), block = Math.round(0.4 * fs), hop = Math.round(0.1 * fs), chans = Math.min(buf.numberOfChannels, 2);
    const sq = []; // per-channel prefix sums of squared K-weighted samples
    for (let c = 0; c < chans; c++) { const y = biquad(biquad(buf.getChannelData(c), K[0]), K[1]), p = new Float64Array(y.length + 1); for (let i = 0; i < y.length; i++) p[i + 1] = p[i] + y[i] * y[i]; sq.push(p); }
    const z = [];
    for (let s = 0; s + block <= buf.length; s += hop) { let sum = 0; for (const p of sq) sum += (p[s + block] - p[s]) / block; z.push(sum); }
    if (!z.length) { let sum = 0; for (const p of sq) sum += p[p.length - 1] / Math.max(1, buf.length); z.push(sum); }
    const L = (v) => -0.691 + 10 * Math.log10(v);
    const abs = z.filter((v) => L(v) > -70); if (!abs.length) return -Infinity;
    const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10, gated = abs.filter((v) => L(v) > rel);
    return L(gated.reduce((a, b) => a + b, 0) / gated.length);
  }
  async function truePeak(buf, onProgress) { // 4× oversampled via the browser's resampler, in 20 s slices to bound memory; sample peak where 4× is unsupported
    let p = 0;
    try { for (let t = 0; t < buf.duration; t += 20) { const s = A.slice(buf, t, Math.min(buf.duration, t + 20.01)); p = Math.max(p, A.peak(await A.offline(s, null, { rate: s.sampleRate * 4, length: s.length * 4 }))); onProgress(t / buf.duration); } return p; }
    catch (e) { return A.peak(buf); }
  }
  const target = () => Number($('opt-target').value), ceiling = () => $('opt-ceiling').value;
  const T = A.mount({
    actionLabel: 'Normalize', verb: 'Measuring', suffix: 'normalized',
    summary: () => `${fmt(target())} LUFS · ${ceiling() === 'off' ? 'No ceiling' : `${fmt(Number(ceiling()))} dBTP`} · ${A.fmtLabel($('opt-out').value)}`,
    onLoad: (S) => { S.lufs = loudness(S.buf); $('source-badge').textContent += ` · ${isFinite(S.lufs) ? fmt(S.lufs) : '−∞'} LUFS`; },
    validate: (S) => (isFinite(S.lufs) ? '' : 'This file is silent — there is nothing to normalize.'),
    run: async (S, api) => {
      const tp = await truePeak(S.buf, (p) => api.onProgress(p, 'Measuring peaks'));
      let gain = target() - S.lufs, capped = false;
      if (ceiling() !== 'off') { const room = Number(ceiling()) - db(tp); if (gain > room) { gain = room; capped = true; } }
      const k = 10 ** (gain / 20), out = A.clone(S.buf);
      for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
      const final = S.lufs + gain;
      return { buf: out, note: `${fmt(S.lufs)} → ${fmt(final)} LUFS${capped ? ' (peak-limited)' : ''} · ${gain >= 0 ? '+' : '−'}${Math.abs(gain).toFixed(1)} dB` };
    }
  });
  window.__an = { T, loudness, kCoeffs };
})();
