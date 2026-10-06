/* GIF Reverser — Toolity.in. Reverse or boomerang the frame list, keep delays, re-encode via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const T = G.mount({
    actionLabel: 'Reverse GIF', suffix: 'reversed',
    summary: () => ($('opt-mode').value === 'boomerang' ? 'Boomerang' : 'Reverse'),
    run: async (S, api) => {
      const rev = S.frames.slice().reverse(), frames = $('opt-mode').value === 'boomerang' ? S.frames.concat(rev.slice(1, -1)) : rev;
      return { blob: await G.encode(frames, { onProgress: api.onProgress }), w: S.w, h: S.h, n: frames.length };
    }
  });
  window.__gr = { T };
})();
