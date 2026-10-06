/* GIF Trimmer — Toolity.in. First/Last frame sliders → re-encode the slice with original delays via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  let R;
  const T = G.mount({
    actionLabel: 'Trim GIF', suffix: 'trimmed',
    onLoad: (S) => { R.reset(S.frames.length); T.srcImg.classList.remove('is-shown'); R.paintFrame(0); },
    onReset: () => R.reset(0),
    summary: () => ($('opt-repeat').value === '0' ? 'Loop forever' : 'Play once'),
    validate: (S) => (R.to - R.from + 1 >= S.frames.length ? 'Move the sliders to leave some frames out first.' : ''),
    run: async (S, api) => { const frames = S.frames.slice(R.from, R.to + 1); return { blob: await G.encode(frames, { repeat: Number($('opt-repeat').value), onProgress: api.onProgress }), w: S.w, h: S.h, n: frames.length }; }
  });
  R = G.bindFrameRange(() => T.S.frames, () => { if (T.S.file) $('result-badge').textContent = `Will keep ${$('rng-len').textContent}`; });
  window.__gt = { T, R };
})();
