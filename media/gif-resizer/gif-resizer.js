/* GIF Resizer — Toolity.in. Percent / width / height / exact scaling of every frame, re-encoded via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const mode = () => $('opt-mode').value, v = (id) => Number($(id).value) || 0;
  function dims(S) {
    let w = S.w, h = S.h;
    if (mode() === 'percent') { w = S.w * v('opt-percent') / 100; h = S.h * v('opt-percent') / 100; }
    else if (mode() === 'width' && v('opt-width')) { w = v('opt-width'); h = S.h * w / S.w; }
    else if (mode() === 'height' && v('opt-height')) { h = v('opt-height'); w = S.w * h / S.h; }
    else if (mode() === 'exact') { w = v('opt-width') || S.w; h = v('opt-height') || S.h; }
    return [Math.max(8, Math.min(4096, Math.round(w))), Math.max(8, Math.min(4096, Math.round(h)))];
  }
  function showFields() { const m = mode(); $('opt-percent').closest('.control-item').hidden = m !== 'percent'; $('opt-width').closest('.control-item').hidden = !(m === 'width' || m === 'exact'); $('opt-height').closest('.control-item').hidden = !(m === 'height' || m === 'exact'); }
  const T = G.mount({
    actionLabel: 'Resize GIF', suffix: 'resized',
    onLoad: (S) => { $('opt-width').value = S.w; $('opt-height').value = S.h; },
    onSetting: (el, S) => { showFields(); if (!S.file) return; if (el.id === 'opt-width' && mode() === 'width') $('opt-height').value = Math.round(S.h * v('opt-width') / S.w); if (el.id === 'opt-height' && mode() === 'height') $('opt-width').value = Math.round(S.w * v('opt-height') / S.h); },
    onReset: showFields,
    summary: (S) => { const [w, h] = S.file ? dims(S) : [0, 0]; return `${mode() === 'percent' ? `${v('opt-percent')}%` : mode() === 'exact' ? 'Exact size' : 'Keep aspect ratio'}${S.file ? ` · ${w} × ${h}` : ''}`; },
    validate: (S) => { const [w, h] = dims(S); return w === S.w && h === S.h ? 'Choose a different size first.' : w * h > 16e6 ? 'That is over 16 megapixels per frame — pick a smaller size.' : ''; },
    run: async (S, api) => { const [w, h] = dims(S); return { blob: await G.encode(S.frames, { w, h, onProgress: api.onProgress }), w, h, n: S.frames.length }; }
  });
  showFields();
  window.__gz = { T, dims };
})();
