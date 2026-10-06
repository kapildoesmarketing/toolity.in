/* Video Rotator — Toolity.in. Rotate 90/180/270 + mirror with a live preview canvas; re-encoded via /scripts/video-common.js. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, $ = (id) => document.getElementById(id);
  const pv = $('preview-canvas'), pctx = pv.getContext('2d');
  const rot = () => Number($('opt-rot').value), flip = () => $('opt-flip').value;
  const outDims = (S) => (rot() % 180 ? [S.h, S.w] : [S.w, S.h]);
  function draw(ctx, v, w, h) {
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate((rot() * Math.PI) / 180);
    ctx.scale(flip().includes('h') ? -1 : 1, flip().includes('v') ? -1 : 1);
    const sw = rot() % 180 ? h : w, sh = rot() % 180 ? w : h;
    ctx.drawImage(v, -sw / 2, -sh / 2, sw, sh); ctx.restore();
  }
  function preview() {
    const S = T.S; if (!S.file || S.out) return;
    const [w, h] = V.fitBox(...outDims(S), 720); if (pv.width !== w || pv.height !== h) { pv.width = w; pv.height = h; }
    draw(pctx, T.src, w, h); pv.classList.add('is-shown');
  }
  const T = V.mount({
    actionLabel: 'Rotate video', verb: 'Rotating', suffix: 'rotated',
    onLoad: preview, onSetting: preview,
    onReset: () => pv.classList.remove('is-shown'),
    summary: () => `${{ 0: 'No rotation', 90: '90° clockwise', 180: '180°', 270: '90° anticlockwise' }[rot()]}${flip() === 'none' ? '' : ' · ' + { h: 'Mirrored', v: 'Flipped', hv: 'Mirrored + flipped' }[flip()]}${$('opt-audio').value === 'keep' ? '' : ' · No audio'}`,
    validate: () => (rot() === 0 && flip() === 'none' ? 'Pick a rotation or a flip in Settings first.' : ''),
    run: (S, api) => { const [w, h] = outDims(S); return V.render({ w, h, segments: [{ video: api.src, from: 0, to: S.dur }], draw, audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop }); },
    present: (r, S, setOutput) => { setOutput(r.blob, r.w, r.h); T.outV.src = S.outUrl; T.outV.classList.add('is-shown'); pv.classList.remove('is-shown'); }
  });
  ['seeked', 'timeupdate', 'loadeddata'].forEach((ev) => T.src.addEventListener(ev, preview));
  window.__vr = { T, draw, outDims };
})();
