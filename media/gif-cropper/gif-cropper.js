/* GIF Cropper — Toolity.in. Crop box in GIF-pixel space projected onto the scrub canvas; every frame cropped and re-encoded via /scripts/gif-common.js. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const box = $('crop-box'), stage = $('scrub-canvas'), vp = box.parentElement, C = { x: 0, y: 0, w: 0, h: 0 };
  let R;
  const ratio = () => { const a = $('opt-aspect').value; if (a === 'free') return 0; const [p, q] = a.split(':').map(Number); return p / q; };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function fitAspect(S) {
    const r = ratio(); let w = S.w, h = S.h;
    if (r) { if (w / h > r) w = h * r; else h = w / r; }
    Object.assign(C, { w: Math.round(w), h: Math.round(h), x: Math.round((S.w - w) / 2), y: Math.round((S.h - h) / 2) }); paint();
  }
  function constrain(S) {
    const r = ratio();
    C.w = clamp(C.w, 8, S.w); C.h = clamp(C.h, 8, S.h);
    if (r) { C.h = C.w / r; if (C.h > S.h) { C.h = S.h; C.w = C.h * r; } }
    C.x = clamp(C.x, 0, S.w - C.w); C.y = clamp(C.y, 0, S.h - C.h);
  }
  function geom() { // displayed canvas rect inside the viewport (object-fit: contain)
    const S = T.S, el = stage.getBoundingClientRect(), vr = vp.getBoundingClientRect(), k = Math.min(el.width / S.w, el.height / S.h);
    return { k, ox: el.left - vr.left + (el.width - S.w * k) / 2, oy: el.top - vr.top + (el.height - S.h * k) / 2 };
  }
  function paint() {
    const S = T.S; if (!S.file) return;
    const g = geom(); Object.assign(box.style, { left: `${g.ox + C.x * g.k}px`, top: `${g.oy + C.y * g.k}px`, width: `${C.w * g.k}px`, height: `${C.h * g.k}px` });
    ['x', 'y', 'w', 'h'].forEach((k) => { $(`crop-${k}`).value = Math.round(C[k]); }); T.sync();
  }
  let drag = null;
  box.addEventListener('pointerdown', (e) => { e.preventDefault(); box.setPointerCapture(e.pointerId); drag = { mode: e.target.classList.contains('vcr-handle') ? 'size' : 'move', sx: e.clientX, sy: e.clientY, ...C, k: geom().k }; });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.sx) / drag.k, dy = (e.clientY - drag.sy) / drag.k;
    if (drag.mode === 'move') { C.x = drag.x + dx; C.y = drag.y + dy; } else { C.w = drag.w + dx; C.h = ratio() ? C.w / ratio() : drag.h + dy; }
    constrain(T.S); paint();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => box.addEventListener(ev, () => { drag = null; }));
  ['x', 'y', 'w', 'h'].forEach((k) => $(`crop-${k}`).addEventListener('change', () => { C[k] = Number($(`crop-${k}`).value) || C[k]; constrain(T.S); paint(); }));
  new ResizeObserver(() => paint()).observe(vp);
  const T = G.mount({
    actionLabel: 'Crop GIF', suffix: 'cropped',
    onLoad: (S) => { R.reset(S.frames.length); R.paintFrame(0); box.hidden = false; fitAspect(S); },
    onSetting: (el, S) => { if (el.id === 'opt-aspect' && S.file) { if (ratio()) fitAspect(S); else paint(); } },
    onReset: () => { R.reset(0); box.hidden = true; Object.assign(C, { x: 0, y: 0, w: 0, h: 0 }); },
    summary: (S) => `${$('opt-aspect').selectedOptions[0].textContent}${S.file ? ` · ${Math.round(C.w)} × ${Math.round(C.h)}` : ''}`,
    validate: (S) => (C.w >= S.w - 0.5 && C.h >= S.h - 0.5 ? 'Drag the crop box smaller than the full frame first.' : ''),
    run: async (S, api) => {
      const sx = Math.round(C.x), sy = Math.round(C.y), w = Math.round(C.w), h = Math.round(C.h);
      const frames = S.frames.map((f) => { const c = G.mk(w, h); c.getContext('2d').drawImage(f.c, sx, sy, w, h, 0, 0, w, h); return { c, ms: f.ms }; });
      return { blob: await G.encode(frames, { onProgress: api.onProgress }), w, h, n: frames.length };
    }
  });
  R = G.bindFrameRange(() => T.S.frames);
  window.__gc = { T, C, fitAspect, constrain };
})();
