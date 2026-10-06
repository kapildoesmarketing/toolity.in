/* Video Trimmer — Toolity.in. Start/End sliders → one re-encoded segment via /scripts/video-common.js. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, $ = (id) => document.getElementById(id);
  let R;
  const T = V.mount({
    actionLabel: 'Trim video', verb: 'Trimming', suffix: 'trimmed',
    onLoad: (S) => R.reset(S.dur),
    onReset: () => R.reset(0),
    summary: () => ($('opt-audio').value === 'keep' ? 'Keep audio' : 'Remove audio'),
    validate: () => (R.to - R.from < 0.1 ? 'Select at least 0.1 s.' : ''),
    run: (S, api) => V.render({ w: S.w, h: S.h, segments: [{ video: api.src, from: R.from, to: R.to }], audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop })
  });
  R = V.bindRange(T.src, () => { if (T.S.file) $('result-badge').textContent = `Will keep ${$('rng-len').textContent}`; });
  window.__vt = { T, R };
})();
