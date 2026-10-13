/* Noise Reducer — Toolity.in. STFT spectral gating: learn the noise spectrum from the quietest frames (or the first second), then
 * attenuate each bin toward a floor where it isn't clearly above the noise. Gains are smoothed across time and frequency to keep
 * "musical noise" down. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const N = 2048, HOP = 512, BINS = N / 2 + 1;
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const rev = new Uint32Array(N).map((_, i) => { let r = 0; for (let b = 1, x = i; b < N; b <<= 1, x >>= 1) r = (r << 1) | (x & 1); return r; });
  const cosT = new Float64Array(N / 2).map((_, i) => Math.cos((2 * Math.PI * i) / N)), sinT = new Float64Array(N / 2).map((_, i) => -Math.sin((2 * Math.PI * i) / N));
  function fft(re, im, inverse) { // in-place iterative radix-2
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) {
        const c = cosT[k * step], si = inverse ? -sinT[k * step] : sinT[k * step], a = s + k, b = a + half;
        const tr = re[b] * c - im[b] * si, ti = re[b] * si + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  const frameAt = (x, s, re, im) => { for (let i = 0; i < N; i++) { const v = x[s + i - N / 2]; re[i] = (v || 0) * win[i]; im[i] = 0; } };
  function profile(x, rate, mode) {
    const starts = []; for (let s = 0; s < x.length; s += HOP) starts.push(s);
    let pick;
    if (mode === 'start') pick = starts.filter((s) => s < rate);
    else { const e = starts.map((s) => { let v = 0; for (let i = Math.max(0, s - N / 2); i < Math.min(x.length, s + N / 2); i++) v += x[i] * x[i]; return v; }); const order = starts.map((_, i) => i).sort((a, b) => e[a] - e[b]); pick = order.slice(0, Math.max(5, Math.round(order.length * 0.1))).map((i) => starts[i]); }
    const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(BINS);
    for (const s of pick) { frameAt(x, s, re, im); fft(re, im); for (let k = 0; k < BINS; k++) mag[k] += Math.hypot(re[k], im[k]); }
    return mag.map((v) => v / Math.max(1, pick.length));
  }
  async function denoise(x, noise, strength, onFrame) {
    const alpha = 1 + 2.5 * strength, floor = 10 ** (-(6 + 24 * strength) / 20);
    const out = new Float64Array(x.length + N), norm = new Float64Array(x.length + N), re = new Float64Array(N), im = new Float64Array(N);
    const g = new Float64Array(BINS), prev = new Float64Array(BINS).fill(1);
    const frames = Math.ceil(x.length / HOP);
    for (let f = 0; f < frames; f++) {
      const s = f * HOP; frameAt(x, s, re, im); fft(re, im);
      for (let k = 0; k < BINS; k++) g[k] = Math.max(floor, 1 - (alpha * noise[k]) / (Math.hypot(re[k], im[k]) + 1e-12));
      for (let k = 0; k < BINS; k++) { const sm = (g[Math.max(0, k - 1)] + g[k] + g[Math.min(BINS - 1, k + 1)]) / 3, v = sm > prev[k] ? sm : 0.7 * prev[k] + 0.3 * sm; prev[k] = v; } // fast attack, slow release
      for (let k = 0; k < BINS; k++) { re[k] *= prev[k]; im[k] *= prev[k]; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
      fft(re, im, true);
      for (let i = 0; i < N; i++) { const o = s + i; out[o] += (re[i] / N) * win[i]; norm[o] += win[i] * win[i]; }
      if (f % 256 === 0) await onFrame(f / frames);
    }
    const y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) { const n = norm[i + N / 2]; y[i] = n > 1e-6 ? out[i + N / 2] / n : 0; }
    return y;
  }
  const strength = () => Number($('opt-strength').value) / 100;
  const word = (v) => (v < 0.35 ? 'Light' : v < 0.7 ? 'Medium' : v < 0.9 ? 'Strong' : 'Maximum');
  const T = A.mount({
    actionLabel: 'Reduce noise', verb: 'Cleaning', suffix: 'denoised',
    fmtRange: (el) => word(Number(el.value) / 100),
    summary: () => `${word(strength())} · ${$('opt-profile').value === 'auto' ? 'Auto profile' : 'First second'} · ${A.fmtLabel($('opt-out').value)}`,
    run: async (S, api) => {
      const ch = S.buf.numberOfChannels, out = A.make(ch, S.buf.length, S.buf.sampleRate);
      for (let c = 0; c < ch; c++) {
        const x = S.buf.getChannelData(c), noise = profile(x, S.buf.sampleRate, $('opt-profile').value);
        out.copyToChannel(await denoise(x, noise, strength(), (p) => { if (api.stop()) throw new Error('Cancelled'); api.onProgress((c + p) / ch, 'Cleaning'); return new Promise((r) => setTimeout(r, 0)); }), c);
      }
      return { buf: out, note: `${word(strength())} noise reduction applied` };
    }
  });
  window.__nr = { T, fft, profile, denoise };
})();
