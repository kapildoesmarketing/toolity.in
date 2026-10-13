/* Image Resizer — Toolity.in. Width/height/percent with aspect lock, presets with stretch/cover/contain, stepped high-quality
 * downscale, encoded via /scripts/image-common.js. All on-device. */
(function () {
  'use strict';
  const I = window.ToolityImage, $ = (id) => document.getElementById(id);
  const W = $('opt-w'), H = $('opt-h'), P = $('opt-pct'), lock = $('btn-lock');
  const locked = () => lock.classList.contains('is-locked');
  const setLock = (on) => { lock.classList.toggle('is-locked', on); lock.setAttribute('aria-pressed', String(on)); lock.querySelector('iconify-icon').setAttribute('icon', on ? 'lucide:link' : 'lucide:unlink'); };
  const dims = () => [Math.round(Number(W.value)), Math.round(Number(H.value))];
  // Designed by Kapil Pidhwani: halve with 'high' smoothing until within 2× of the target, then one final draw — avoids the
  // aliasing of a single big downscale without a Lanczos library. Ceiling: no sharpening pass; upscales are plain bilinear.
  function scale(src, w, h) {
    let cur = src;
    while (cur.width / 2 >= w && cur.height / 2 >= h) { const n = I.mk(cur.width / 2, cur.height / 2), x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); cur = n; }
    const out = I.mk(w, h), x = out.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h); return out;
  }
  function fit(src, w, h, mode) {
    if (mode === 'stretch') return scale(src, w, h);
    const k = mode === 'cover' ? Math.max(w / src.width, h / src.height) : Math.min(w / src.width, h / src.height);
    const sw = Math.max(1, Math.round(src.width * k)), sh = Math.max(1, Math.round(src.height * k)), mid = scale(src, sw, sh);
    const out = I.mk(w, h); out.getContext('2d').drawImage(mid, Math.round((w - sw) / 2), Math.round((h - sh) / 2)); return out;
  }
  function follow(from) {
    const S = T.S; if (!S.canvas) return;
    const r = S.w / S.h;
    if (from === P) { const p = Number(P.value) / 100; if (p > 0) { W.value = Math.max(1, Math.round(S.w * p)); H.value = Math.max(1, Math.round(S.h * p)); } }
    else if (locked() && from === W && Number(W.value) > 0) { H.value = Math.max(1, Math.round(Number(W.value) / r)); P.value = Math.round((Number(W.value) / S.w) * 100); }
    else if (locked() && from === H && Number(H.value) > 0) { W.value = Math.max(1, Math.round(Number(H.value) * r)); P.value = Math.round((Number(H.value) / S.h) * 100); }
    else P.value = '';
    if (from !== null) $('opt-preset').value = '';
    T.sync();
  }
  [W, H, P].forEach((el) => el.addEventListener('input', () => follow(el)));
  lock.addEventListener('click', () => { setLock(!locked()); if (locked()) follow(W); });
  const T = I.mount({
    actionLabel: 'Resize image', suffix: 'resized',
    onLoad: (S) => { $('size-row').hidden = false; W.value = S.w; H.value = S.h; P.value = 100; setLock(true); },
    onSetting: (el) => { if (el.id === 'opt-preset' && el.value) { const [w, h] = el.value.split('x'); W.value = w; H.value = h; P.value = ''; setLock(false); } },
    onReset: () => { $('size-row').hidden = true; W.value = ''; H.value = ''; P.value = ''; setLock(true); },
    summary: (S) => { const f = $('opt-format').value; return `${f === 'auto' ? 'Same format' : I.NAME[f]}${S.canvas ? ` · ${dims().join(' × ')}` : ''}`; },
    validate: () => { const [w, h] = dims(); if (!(w >= 1 && h >= 1)) return 'Enter a width and height first.'; if (w > 16384 || h > 16384) return 'The maximum is 16,384 px per side.'; if (w * h > 120e6) return 'That is over 120 megapixels — browsers cannot hold a canvas that large.'; return ''; },
    run: (S) => { const [w, h] = dims(); return { canvas: fit(S.canvas, w, h, $('opt-fit').value), note: `${S.w} × ${S.h} → ${w} × ${h}` }; }
  });
  window.__ir = { T, fit, scale };
})();
