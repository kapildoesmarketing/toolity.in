/* Image Negative Inverter — Toolity.in. Per-pixel 255 − v with strength blend, channel pick, grayscale and alpha options; live
 * preview via /scripts/image-common.js (auto mode). All on-device. */
(function () {
  'use strict';
  const I = window.ToolityImage, $ = (id) => document.getElementById(id);
  function invert(src, o) {
    const out = I.mk(src.width, src.height), x = out.getContext('2d');
    x.drawImage(src, 0, 0);
    const img = x.getImageData(0, 0, out.width, out.height), d = img.data, k = o.strength, ch = { rgb: [1, 1, 1], r: [1, 0, 0], g: [0, 1, 0], b: [0, 0, 1] }[o.channels];
    for (let i = 0; i < d.length; i += 4) {
      if (o.gray) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = y; }
      for (let c = 0; c < 3; c++) if (ch[c]) d[i + c] += k * (255 - 2 * d[i + c]); // v + k·((255 − v) − v)
      if (o.alpha) d[i + 3] = 255 - d[i + 3];
    }
    x.putImageData(img, 0, 0); return out;
  }
  const opts = () => ({ strength: Number($('opt-strength').value) / 100, channels: $('opt-channels').value, gray: $('opt-gray').checked, alpha: $('opt-alpha').checked });
  const T = I.mount({
    actionLabel: 'Invert image', suffix: 'negative', auto: true,
    fmtRange: (el) => `${el.value}%`,
    summary: () => { const o = opts(); return [`${Math.round(o.strength * 100)}%`, { rgb: 'RGB', r: 'Red', g: 'Green', b: 'Blue' }[o.channels], o.gray && 'Grayscale', o.alpha && 'Alpha'].filter(Boolean).join(' · '); },
    run: (S) => ({ canvas: invert(S.canvas, opts()) })
  });
  window.__in = { T, invert };
})();
