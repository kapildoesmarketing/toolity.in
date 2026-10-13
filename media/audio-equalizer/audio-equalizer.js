/* Audio Equalizer — Toolity.in. 10 peaking biquads (ISO octave centres, Q ≈ 1.4). The same curve runs live on the source player
 * (MediaElementSource → filters → speakers) and offline for the render. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const PRESETS = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0], bassx: [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0],
    treble: [0, 0, 0, 0, 0, 0, 1, 3, 5, 6], vocal: [-3, -2, -1, 0, 1, 3, 4, 3, 1, 0], podcast: [-6, -4, -1, 0, 1, 2, 3, 2, 0, -1],
    loud: [5, 4, 2, 0, -2, -2, 0, 2, 4, 5], lofi: [-12, -12, -6, 0, 3, 4, 2, -6, -12, -12]
  };
  const sliders = FREQS.map((_, i) => $(`eq-${i}`)), gains = () => sliders.map((s) => Number(s.value));
  const chain = (ctx, g) => FREQS.map((f, i) => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1.41; b.gain.value = g[i]; return b; });
  const link = (src, nodes) => nodes.reduce((prev, n) => (prev.connect(n), n), src);
  let live = null; // lazily wired on first play — createMediaElementSource takes over the element's output for good
  function wireLive() {
    if (live) return; const ctx = A.liveCtx(); live = chain(ctx, gains());
    link(ctx.createMediaElementSource(T.srcA), live).connect(ctx.destination);
  }
  const applyLive = () => live && gains().forEach((g, i) => live[i].gain.setTargetAtTime(g, A.liveCtx().currentTime, 0.02));
  const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
  const T = A.mount({
    actionLabel: 'Apply EQ', verb: 'Rendering', suffix: 'eq',
    fmtRange: (el) => sign(Number(el.value)),
    summary: () => `${$('opt-preset').selectedOptions[0].textContent} · ${A.fmtLabel($('opt-out').value)}`,
    onSetting: (el) => {
      if (el.id === 'opt-preset' && PRESETS[el.value]) PRESETS[el.value].forEach((g, i) => { sliders[i].value = g; });
      else if (el.classList.contains('eq-slider')) $('opt-preset').value = 'custom';
      applyLive();
    },
    onReset: () => applyLive(),
    validate: () => (gains().every((g) => g === 0) ? 'The curve is flat — pick a preset or move a slider in Settings first.' : ''),
    run: async (S) => {
      let buf = await A.offline(S.buf, (ctx, src) => link(src, chain(ctx, gains())));
      const p = A.peak(buf); let note = '';
      if ($('opt-safe').checked && p > 0.989) { const k = 0.989 / p; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; } note = ` · lowered ${(-20 * Math.log10(k)).toFixed(1)} dB to avoid clipping`; }
      return { buf, note: `${$('opt-preset').selectedOptions[0].textContent} curve applied${note}` };
    }
  });
  T.srcA.addEventListener('play', () => { wireLive(); const ctx = A.liveCtx(); if (ctx.state === 'suspended') ctx.resume(); });
  window.__eq = { T, PRESETS, gains };
})();
