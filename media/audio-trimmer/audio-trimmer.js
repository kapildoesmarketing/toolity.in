/* Audio Trimmer — Toolity.in. Start/End sliders (ToolityVideo.bindRange on the <audio>) → sample-accurate slice with optional 10 ms de-click fades, via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, V = window.ToolityVideo, $ = (id) => document.getElementById(id);
  let R;
  const T = A.mount({
    actionLabel: 'Trim audio', verb: 'Trimming', suffix: 'trimmed',
    summary: () => `${A.fmtLabel($('opt-out').value)} · ${$('opt-edge').value === 'soft' ? 'Smooth edges' : 'Hard cut'}`,
    onLoad: (S) => R.reset(S.buf.duration),
    onReset: () => R.reset(0),
    run: async (S) => {
      const buf = A.slice(S.buf, R.from, R.to);
      return { buf: $('opt-edge').value === 'soft' ? A.fade(buf, 0.01, 0.01) : buf, note: `Kept ${$('rng-len').textContent}` };
    }
  });
  R = V.bindRange(T.srcA, () => { if (T.S.buf) $('result-badge').textContent = `Will keep ${$('rng-len').textContent}`; });
  window.__at = { T, R };
})();
