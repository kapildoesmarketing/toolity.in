/* Video Cropper — Toolity.in. Draggable crop box over the source (video-pixel coords), aspect presets, pixel inputs; cropped region re-encoded via /scripts/video-common.js. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  const box = $('crop-box'), vp = box.parentElement, C = { x: 0, y: 0, w: 0, h: 0 };
  const ratio = () => { const a = $('opt-aspect').value; if (a === 'free') return 0; const [p, q] = a.split(':').map(Number); return p / q; };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function fitAspect(S) {
    const r = ratio(); let w = S.w, h = S.h;
    if (r) { if (w / h > r) w = h * r; else h = w / r; }
    Object.assign(C, { w: Math.round(w), h: Math.round(h), x: Math.round((S.w - w) / 2), y: Math.round((S.h - h) / 2) }); paint();
  }
  function constrain(S) {
    const r = ratio();
    C.w = clamp(C.w, 16, S.w); C.h = clamp(C.h, 16, S.h);
    if (r) { C.h = C.w / r; if (C.h > S.h) { C.h = S.h; C.w = C.h * r; } }
    C.x = clamp(C.x, 0, S.w - C.w); C.y = clamp(C.y, 0, S.h - C.h);
  }
  function geom() { // displayed video rect inside the viewport (object-fit: contain)
    const S = T.S, el = T.src.getBoundingClientRect(), vr = vp.getBoundingClientRect(), k = Math.min(el.width / S.w, el.height / S.h);
    return { k, ox: el.left - vr.left + (el.width - S.w * k) / 2, oy: el.top - vr.top + (el.height - S.h * k) / 2 };
  }
  function paint() {
    const S = T.S; if (!S.file) return;
    const g = geom(); Object.assign(box.style, { left: `${g.ox + C.x * g.k}px`, top: `${g.oy + C.y * g.k}px`, width: `${C.w * g.k}px`, height: `${C.h * g.k}px` });
    ['x', 'y', 'w', 'h'].forEach((k) => { $(`crop-${k}`).value = Math.round(C[k]); }); T.sync();
  }
  /* Drag: body moves, handle resizes (aspect-locked when a preset is on). */
  let drag = null;
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault(); box.setPointerCapture(e.pointerId);
    drag = { mode: e.target.classList.contains('vcr-handle') ? 'size' : 'move', sx: e.clientX, sy: e.clientY, ...C, k: geom().k };
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.sx) / drag.k, dy = (e.clientY - drag.sy) / drag.k;
    if (drag.mode === 'move') { C.x = drag.x + dx; C.y = drag.y + dy; } else { C.w = drag.w + dx; C.h = ratio() ? C.w / ratio() : drag.h + dy; }
    constrain(T.S); paint();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => box.addEventListener(ev, () => { drag = null; }));
  ['x', 'y', 'w', 'h'].forEach((k) => $(`crop-${k}`).addEventListener('change', () => { C[k] = Number($(`crop-${k}`).value) || C[k]; constrain(T.S); paint(); }));
  new ResizeObserver(() => paint()).observe(vp);
  /* Scrub row (source has no native controls so the crop box stays draggable) */
  const scrub = $('scrub'), playIcon = $('btn-play').querySelector('iconify-icon');
  scrub.addEventListener('input', () => { T.src.currentTime = Number(scrub.value); });
  $('btn-play').addEventListener('click', () => (T.src.paused ? T.src.play() : T.src.pause()));
  const T = V.mount({
    actionLabel: 'Crop video', verb: 'Cropping', suffix: 'cropped',
    onLoad: (S) => { box.hidden = false; $('scrub-wrap').hidden = false; scrub.max = S.dur; scrub.value = 0; fitAspect(S); },
    onSetting: (el, S) => { if (el.id === 'opt-aspect' && S.file) { if (ratio()) fitAspect(S); else paint(); } }, // Free keeps the current box
    onReset: () => { box.hidden = true; $('scrub-wrap').hidden = true; Object.assign(C, { x: 0, y: 0, w: 0, h: 0 }); },
    summary: (S) => `${$('opt-aspect').selectedOptions[0].textContent}${S.file ? ` · ${V.even(C.w)} × ${V.even(C.h)}` : ''}${$('opt-audio').value === 'keep' ? '' : ' · No audio'}`,
    validate: (S) => (C.w >= S.w - 1 && C.h >= S.h - 1 ? 'Drag the crop box smaller than the full frame first.' : ''),
    run: (S, api) => {
      const sx = Math.round(C.x), sy = Math.round(C.y), w = V.even(C.w), h = V.even(C.h);
      return V.render({ w, h, segments: [{ video: api.src, from: 0, to: S.dur }], draw: (ctx, v) => ctx.drawImage(v, sx, sy, w, h, 0, 0, w, h), audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop });
    }
  });
  T.src.addEventListener('timeupdate', () => { scrub.value = T.src.currentTime; $('scrub-val').textContent = formatTime(T.src.currentTime); });
  ['play', 'pause', 'ended'].forEach((ev) => T.src.addEventListener(ev, () => playIcon.setAttribute('icon', T.src.paused ? 'lucide:play' : 'lucide:pause')));
  window.__vc = { T, C, fitAspect, constrain };
})();
