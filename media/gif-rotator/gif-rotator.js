/* GIF Rotator — Toolity.in. Rotate 90/180/270 + mirror/flip every frame, keep per-frame delays, re-encode via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const rot = () => Number($('opt-rot').value), flip = () => $('opt-flip').value;
  function turn(c, r, f) {
    const side = r % 180 !== 0, out = G.mk(side ? c.height : c.width, side ? c.width : c.height), x = out.getContext('2d');
    x.translate(out.width / 2, out.height / 2); x.rotate((r * Math.PI) / 180); x.scale(f.includes('h') ? -1 : 1, f.includes('v') ? -1 : 1);
    x.drawImage(c, -c.width / 2, -c.height / 2); return out;
  }
  const T = G.mount({
    actionLabel: 'Rotate GIF', verb: 'Encoding', suffix: 'rotated',
    summary: () => `${{ 0: 'No rotation', 90: '90° clockwise', 180: '180°', 270: '90° anticlockwise' }[rot()]}${flip() === 'none' ? '' : ' · ' + { h: 'Mirrored', v: 'Flipped', hv: 'Mirrored + flipped' }[flip()]}`,
    validate: () => (rot() === 0 && flip() === 'none' ? 'Pick a rotation or a flip in Settings first.' : ''),
    run: async (S, api) => {
      const frames = S.frames.map((f) => ({ c: turn(f.c, rot(), flip()), ms: f.ms }));
      return { blob: await G.encode(frames, { onProgress: api.onProgress }), w: frames[0].c.width, h: frames[0].c.height, n: frames.length };
    }
  });
  window.__gro = { T, turn };
})();
