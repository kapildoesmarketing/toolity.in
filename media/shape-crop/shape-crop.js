/* Shape Crop — Toolity.in. Square (or free, for rounded rect) crop box in image-pixel space on a preview canvas, same model as
 * Image Cropper; the shape is a unit-square Path2D scaled to the box, used as a destination-in mask with optional feather and an
 * inside border. Full-resolution crop encoded via /scripts/image-common.js. All on-device. */
(function () {
  'use strict';
  const I = window.ToolityImage, $ = (id) => document.getElementById(id);
  const box = $('crop-box'), stage = $('stage'), vp = box.parentElement, C = { x: 0, y: 0, w: 0, h: 0 };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const shape = () => $('opt-shape').value;
  const locked = () => shape() !== 'rounded';

  /* ── unit-square shapes (0..1) ── */
  const poly = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  const star = (n, inner) => poly(Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? inner : 0.5, a = -Math.PI / 2 + (i * Math.PI) / n; return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]; }));
  const ngon = (n, rot = 0) => poly(Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]; }));
  const squircle = () => poly(Array.from({ length: 128 }, (_, i) => { const a = (i * 2 * Math.PI) / 128, c = Math.cos(a), s = Math.sin(a); const f = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / 4); return [0.5 + 0.5 * f(c), 0.5 + 0.5 * f(s)]; }));
  const heart = () => { const p = new Path2D('M0.5 0.95 C0.5 0.95 0 0.62 0 0.32 C0 0.14 0.14 0.03 0.27 0.03 C0.38 0.03 0.47 0.1 0.5 0.19 C0.53 0.1 0.62 0.03 0.73 0.03 C0.86 0.03 1 0.14 1 0.32 C1 0.62 0.5 0.95 0.5 0.95 Z'); return p; };
  const rounded = (w, h, rPct) => { const p = new Path2D(), r = Math.min(w, h) * (rPct / 100); if (p.roundRect) p.roundRect(0, 0, w, h, r); else p.rect(0, 0, w, h); return p; };
  // Designed by Kapil Pidhwani: custom path bbox via a 1024 px alpha scan of the 0..1000 coordinate space (Path2D has no getBBox);
  // cached per path string. Ceiling: coordinates outside 0..1000 or negative are clipped — icon/Figma exports (24/100/1000 viewBoxes) are fine.
  let customCache = { d: '', path: null, bb: null };
  function custom() {
    const d = $('opt-path').value.trim(); if (!d) return null;
    if (customCache.d === d) return customCache;
    let path; try { path = new Path2D(d); } catch (e) { return null; }
    const N = 1024, c = I.mk(N, N), x = c.getContext('2d'); x.scale(N / 1000, N / 1000); x.fill(path);
    const a = x.getImageData(0, 0, N, N).data; let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (a[(j * N + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    if (x1 < 0) return null;
    const k = 1000 / N; customCache = { d, path, bb: { x: x0 * k, y: y0 * k, w: (x1 - x0 + 1) * k, h: (y1 - y0 + 1) * k } }; return customCache;
  }
  /* shapePath(w, h) → Path2D in pixel space covering (0,0,w,h), or null when the custom path is empty/invalid */
  const UNIT = { circle: () => { const q = new Path2D(); q.ellipse(0.5, 0.5, 0.5, 0.5, 0, 0, Math.PI * 2); return q; }, squircle, heart, star: () => star(5, 0.21), hexagon: () => ngon(6, 0), triangle: () => poly([[0.5, 0.02], [0.98, 0.95], [0.02, 0.95]]) };
  function shapePath(w, h) {
    const s = shape(), p = new Path2D();
    if (s === 'rounded') return rounded(w, h, Number($('opt-radius').value));
    if (s === 'custom') { const cu = custom(); if (!cu) return null; const sc = Math.min(w / cu.bb.w, h / cu.bb.h); p.addPath(cu.path, new DOMMatrix().translate((w - cu.bb.w * sc) / 2 - cu.bb.x * sc, (h - cu.bb.h * sc) / 2 - cu.bb.y * sc).scale(sc, sc)); return p; }
    p.addPath(UNIT[s](), new DOMMatrix().scale(w, h)); return p;
  }

  /* ── crop box (mirrors Image Cropper) ── */
  function fitBox(S) { const sq = locked(), w = sq ? Math.min(S.w, S.h) : S.w, h = sq ? w : S.h; Object.assign(C, { w, h, x: Math.round((S.w - w) / 2), y: Math.round((S.h - h) / 2) }); paint(); }
  function constrain(S) { C.w = clamp(C.w, 8, S.w); C.h = clamp(C.h, 8, S.h); if (locked()) { C.h = C.w; if (C.h > S.h) { C.h = S.h; C.w = C.h; } } C.x = clamp(C.x, 0, S.w - C.w); C.y = clamp(C.y, 0, S.h - C.h); }
  function geom() { const S = T.S, el = stage.getBoundingClientRect(), vr = vp.getBoundingClientRect(), k = Math.min(el.width / S.w, el.height / S.h); return { k, ox: el.left - vr.left + (el.width - S.w * k) / 2, oy: el.top - vr.top + (el.height - S.h * k) / 2 }; }
  function paint() {
    const S = T.S; if (!S.canvas) return;
    const g = geom(); Object.assign(box.style, { left: `${g.ox + C.x * g.k}px`, top: `${g.oy + C.y * g.k}px`, width: `${C.w * g.k}px`, height: `${C.h * g.k}px` });
    // stage = image · dim layer with the shape punched out · dashed outline
    const x = stage.getContext('2d'), ks = stage.width / S.w;
    x.clearRect(0, 0, stage.width, stage.height); x.drawImage(S.canvas, 0, 0, stage.width, stage.height);
    const dim = I.mk(stage.width, stage.height), dx = dim.getContext('2d');
    dx.fillStyle = 'rgba(0,0,0,0.45)'; dx.fillRect(0, 0, dim.width, dim.height);
    const sp = shapePath(C.w * ks, C.h * ks);
    if (sp) { dx.globalCompositeOperation = 'destination-out'; dx.translate(C.x * ks, C.y * ks); dx.fill(sp); }
    x.drawImage(dim, 0, 0);
    if (sp) { x.save(); x.translate(C.x * ks, C.y * ks); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.stroke(sp); x.restore(); }
    T.sync();
  }
  let drag = null;
  box.addEventListener('pointerdown', (e) => { e.preventDefault(); box.setPointerCapture(e.pointerId); drag = { mode: e.target.classList.contains('vcr-handle') ? 'size' : 'move', sx: e.clientX, sy: e.clientY, ...C, k: geom().k }; });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.sx) / drag.k, dy = (e.clientY - drag.sy) / drag.k;
    if (drag.mode === 'move') { C.x = drag.x + dx; C.y = drag.y + dy; } else { C.w = drag.w + dx; C.h = locked() ? C.w : drag.h + dy; }
    constrain(T.S); paint();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => box.addEventListener(ev, () => { drag = null; }));
  new ResizeObserver(() => paint()).observe(vp);
  const showPath = () => { $('opt-path').closest('.control-item').hidden = shape() !== 'custom'; $('opt-radius').closest('.control-item').hidden = shape() !== 'rounded'; };
  showPath();

  const T = I.mount({
    actionLabel: 'Crop to shape', suffix: 'shape', auto: true,
    fmtRange: (el) => (el.id === 'opt-radius' ? `${el.value}%` : el.id === 'opt-quality' ? el.value : Number(el.value) ? `${el.value} px` : 'Off'),
    onLoad: (S) => {
      const k = Math.min(1, 1600 / Math.max(S.w, S.h)); stage.width = Math.round(S.w * k); stage.height = Math.round(S.h * k);
      stage.classList.add('is-shown'); box.hidden = false; requestAnimationFrame(() => fitBox(S));
    },
    onSetting: (el, S) => { if (el.id === 'opt-shape') { showPath(); if (S.canvas) { constrain(S); if (locked() && C.w !== C.h) fitBox(S); } } if (S.canvas) paint(); },
    onReset: () => { stage.classList.remove('is-shown'); box.hidden = true; Object.assign(C, { x: 0, y: 0, w: 0, h: 0 }); showPath(); },
    summary: (S) => [$('opt-shape').selectedOptions[0].textContent.replace('…', ''), S.canvas && `${Math.round(C.w)} × ${Math.round(C.h)}`, Number($('opt-feather').value) && 'soft', Number($('opt-border').value) && 'border'].filter(Boolean).join(' · '),
    validate: () => (shape() === 'custom' && !custom() ? 'Paste a valid SVG path (the d attribute) under Settings first.' : ''),
    run: (S) => {
      const sx = Math.round(C.x), sy = Math.round(C.y), w = Math.max(1, Math.round(C.w)), h = Math.max(1, Math.round(C.h));
      const size = Number($('opt-size').value), k = size ? size / Math.max(w, h) : 1, W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
      const feather = Number($('opt-feather').value) * k, border = Number($('opt-border').value) * k;
      const out = I.mk(W, H), x = out.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(S.canvas, sx, sy, w, h, 0, 0, W, H);
      // mask: shape (inset by the feather so the blur stays inside the canvas), optionally blurred
      const mask = I.mk(W, H), mx = mask.getContext('2d'); mx.fillStyle = '#000';
      if (feather) { mx.filter = `blur(${feather / 2}px)`; mx.translate(feather / 2, feather / 2); mx.fill(shapePath(W - feather, H - feather)); } else mx.fill(shapePath(W, H));
      x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-over';
      if (border) { // stroke at 2× width, then keep only the inside half
        const p = shapePath(W, H), ring = I.mk(W, H), rx = ring.getContext('2d');
        rx.strokeStyle = $('opt-border-color').value; rx.lineWidth = border * 2; rx.lineJoin = 'round'; rx.stroke(p);
        rx.globalCompositeOperation = 'destination-in'; rx.fill(p); x.drawImage(ring, 0, 0);
      }
      return { canvas: out, note: `${w} × ${h} → ${W} × ${H}` };
    }
  });
  window.__sc = { T, C, fitBox, constrain, shapePath, custom };
})();
