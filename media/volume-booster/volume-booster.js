/* Volume Booster — Toolity.in. Gain (fixed % or normalise-to-peak) with an optional brick-wall-ish limiter (DynamicsCompressor) in an OfflineAudioContext. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const dB = (p) => (p > 0 ? `${(20 * Math.log10(p)).toFixed(1)} dB` : '−∞ dB');
  const mode = () => $('opt-mode').value, pct = () => Number($('opt-gain').value);
  const toggle = () => { $('opt-gain').closest('.control-item').hidden = mode() !== 'gain'; };
  const T = A.mount({
    actionLabel: 'Boost volume', verb: 'Boosting', suffix: 'boosted',
    summary: () => `${mode() === 'normalize' ? 'Normalise to peak' : `Boost ${pct()}%`} · Limiter ${$('opt-limit').value} · ${A.fmtLabel($('opt-out').value)}`,
    fmtRange: (el) => `${el.value}%`,
    onSetting: toggle, onReset: toggle,
    onLoad: (S) => { S.peak = A.peak(S.buf); $('source-badge').textContent += ` · Peak ${dB(S.peak)}`; },
    run: async (S) => {
      // Designed by Kapil Pidhwani: normalise targets 0 dBFS sample peak (not loudness/LUFS); gain capped at 100× for near-silent files. Upgrade path: LUFS via ITU-R BS.1770 K-weighting.
      const gain = mode() === 'normalize' ? Math.min(100, 1 / Math.max(S.peak, 1e-4)) : pct() / 100, limit = $('opt-limit').value === 'on';
      const buf = await A.offline(S.buf, (ctx, src) => {
        const g = ctx.createGain(); g.gain.value = gain; src.connect(g); if (!limit) return g;
        const c = ctx.createDynamicsCompressor(); c.threshold.value = -1; c.knee.value = 0; c.ratio.value = 20; c.attack.value = 0.001; c.release.value = 0.1; g.connect(c); return c;
      });
      return { buf, note: `Peak ${dB(S.peak)} → ${dB(Math.min(1, A.peak(buf)))}${!limit && A.peak(buf) > 1 ? ' · clipped' : ''}` };
    }
  });
  toggle();
  window.__vb = { T };
})();
