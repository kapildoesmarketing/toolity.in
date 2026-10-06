/* Video Looper — Toolity.in. Repeats the selected range N times as back-to-back segments via /scripts/video-common.js. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  let R;
  const count = () => Number($('opt-count').value);
  const T = V.mount({
    actionLabel: 'Loop video', verb: 'Looping', suffix: 'looped',
    onLoad: (S) => R.reset(S.dur),
    onReset: () => R.reset(0),
    summary: (S) => `${count()}× · ${$('opt-audio').value === 'keep' ? 'Keep audio' : 'Remove audio'}${S.file ? ` · Output ${formatTime((R.to - R.from) * count())}` : ''}`,
    validate: () => (R.to - R.from < 0.1 ? 'Select at least 0.1 s.' : ''),
    run: (S, api) => V.render({ w: S.w, h: S.h, segments: Array.from({ length: count() }, () => ({ video: api.src, from: R.from, to: R.to })), audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop })
  });
  R = V.bindRange(T.src, () => T.sync());
  window.__vl = { T, R };
})();
