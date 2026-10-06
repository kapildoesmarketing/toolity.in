/* GIF Looper — Toolity.in. Writes the NETSCAPE loop count and/or bakes repeated frames, via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const rep = () => Number($('opt-repeat').value), bake = () => Number($('opt-bake').value);
  const T = G.mount({
    actionLabel: 'Apply loop', suffix: 'loop',
    summary: (S) => `${rep() === 0 ? 'Loop forever' : rep() === 1 ? 'Play once' : `Play ${rep()} times`} · Frames ×${bake()}${S.file ? ` · ${((S.ms * bake()) / 1000).toFixed(1)} s` : ''}`,
    run: async (S, api) => {
      // gifenc's repeat = number of extra loops (0 = forever); GIF "play once" = no NETSCAPE block, which gifenc writes for repeat -1
      const repeat = rep() === 0 ? 0 : rep() === 1 ? -1 : rep() - 1;
      const frames = Array.from({ length: bake() }, () => S.frames).flat();
      return { blob: await G.encode(frames, { repeat, onProgress: api.onProgress }), w: S.w, h: S.h, n: frames.length };
    }
  });
  window.__gl = { T };
})();
