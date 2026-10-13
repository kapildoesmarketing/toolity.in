/* Image Cropper — Toolity.in. Crop box in image-pixel space projected onto a preview canvas (same model as GIF Cropper), then
 * optional rotate/flip; full-resolution crop encoded via /scripts/image-common.js. All on-device. */
(function () {
  'use strict';
  const I = window.ToolityImage, $ = (id) => document.getElementById(id);
  const box = $('crop-box'), stage = $('stage'), vp = box.parentElement, C = { x: 0, y: 0, w: 0, h: 0 };
  const ratio = () => { const a = $('opt-aspect').value; if (a === 'free') return 0; const [p, q] = a.split(':').map(Number); return p / q; };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function fitAspect(S) {
    const r = ratio(); let w = S.w, h = S.h;
    if (r) { if (w / h > r) w = h * r; else h = w / r; }
    Object.assign(C, { w: Math.round(w), h: Math.round(h), x: Math.round((S.w - w) / 2), y: Math.round((S.h - h) / 2) }); paint();
  }
  function constrain(S) {
    const r = ratio();
    C.w = clamp(C.w, 1, S.w); C.h = clamp(C.h, 1, S.h);
    if (r) { C.h = C.w / r; if (C.h > S.h) { C.h = S.h; C.w = C.h * r; } }
    C.x = clamp(C.x, 0, S.w - C.w); C.y = clamp(C.y, 0, S.h - C.h);
  }
  function geom() { // displayed canvas rect inside the viewport (object-fit: contain)
    const S = T.S, el = stage.getBoundingClientRect(), vr = vp.getBoundingClientRect(), k = Math.min(el.width / S.w, el.height / S.h);
    return { k, ox: el.left - vr.left + (el.width - S.w * k) / 2, oy: el.top - vr.top + (el.height - S.h * k) / 2 };
  }
  function paint() {
    const S = T.S; if (!S.canvas) return;
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
  function transform(src) {
    const rot = Number($('opt-rot').value), flip = $('opt-flip').value;
    if (!rot && flip === 'none') return src;
    const turn = rot % 180 !== 0, out = I.mk(turn ? src.height : src.width, turn ? src.width : src.height), x = out.getContext('2d');
    x.translate(out.width / 2, out.height / 2); x.rotate((rot * Math.PI) / 180); x.scale(flip.includes('h') ? -1 : 1, flip.includes('v') ? -1 : 1);
    x.drawImage(src, -src.width / 2, -src.height / 2); return out;
  }
  const T = I.mount({
    actionLabel: 'Crop image', suffix: 'cropped',
    onLoad: (S) => { // preview capped at 1600 px — the crop itself always reads the full-resolution canvas
      const k = Math.min(1, 1600 / Math.max(S.w, S.h)); stage.width = Math.round(S.w * k); stage.height = Math.round(S.h * k);
      const x = stage.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(S.canvas, 0, 0, stage.width, stage.height);
      stage.classList.add('is-shown'); box.hidden = false; requestAnimationFrame(() => fitAspect(S));
    },
    onSetting: (el, S) => { if (el.id === 'opt-aspect' && S.canvas) { if (ratio()) fitAspect(S); else paint(); } },
    onReset: () => { stage.classList.remove('is-shown'); box.hidden = true; Object.assign(C, { x: 0, y: 0, w: 0, h: 0 }); },
    summary: (S) => `${$('opt-aspect').selectedOptions[0].textContent}${S.canvas ? ` · ${Math.round(C.w)} × ${Math.round(C.h)}` : ''}`,
    validate: (S) => (C.w >= S.w - 0.5 && C.h >= S.h - 0.5 && $('opt-rot').value === '0' && $('opt-flip').value === 'none' ? 'Drag the crop box smaller than the full image (or pick a rotation) first.' : ''),
    run: (S) => {
      const sx = Math.round(C.x), sy = Math.round(C.y), w = Math.max(1, Math.round(C.w)), h = Math.max(1, Math.round(C.h));
      const c = I.mk(w, h); c.getContext('2d').drawImage(S.canvas, sx, sy, w, h, 0, 0, w, h);
      const out = transform(c); return { canvas: out, note: `${S.w} × ${S.h} → ${out.width} × ${out.height}` };
    }
  });
  window.__ic = { T, C, fitAspect, constrain };
})();
