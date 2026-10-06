/* Video Watermarker — Toolity.in. Text or image mark drawn on every frame (live preview + encode share one draw()). All on-device via /scripts/video-common.js. */
(function () {
  'use strict';
  const V = window.ToolityVideo, $ = (id) => document.getElementById(id);
  const pv = $('preview-canvas'), pctx = pv.getContext('2d');
  let logo = null, logoUrl = '';
  const o = () => ({ type: $('opt-type').value, text: $('opt-text').value.trim(), pos: $('opt-pos').value, size: Number($('opt-size').value), opacity: Number($('opt-opacity').value) / 100, color: $('opt-color').value });
  function draw(ctx, v, w, h) {
    ctx.drawImage(v, 0, 0, w, h);
    const c = o(), m = Math.round(Math.min(w, h) * 0.03);
    let mw, mh; if (c.type === 'image') { if (!logo) return; mw = (w * c.size) / 100; mh = mw * (logo.naturalHeight / logo.naturalWidth); } else { if (!c.text) return; ctx.font = `600 ${Math.round((h * c.size) / 250)}px Inter, system-ui, sans-serif`; mw = ctx.measureText(c.text).width; mh = (h * c.size) / 250; }
    const x = c.pos[1] === 'l' ? m : c.pos[1] === 'c' ? (w - mw) / 2 : w - mw - m, y = c.pos[0] === 't' ? m : c.pos[0] === 'm' ? (h - mh) / 2 : h - mh - m;
    ctx.save(); ctx.globalAlpha = c.opacity;
    if (c.type === 'image') ctx.drawImage(logo, x, y, mw, mh);
    else { ctx.textBaseline = 'top'; ctx.fillStyle = c.color; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = mh / 6; ctx.fillText(c.text, x, y); }
    ctx.restore();
  }
  function preview() {
    const S = T.S; if (!S.file || S.out) return;
    const [w, h] = V.fitBox(S.w, S.h, 720); if (pv.width !== w || pv.height !== h) { pv.width = w; pv.height = h; }
    draw(pctx, T.src, w, h); pv.classList.add('is-shown');
  }
  function onSetting(el) {
    if (el.id === 'opt-size') $('opt-size-val').textContent = `${el.value}%`;
    if (el.id === 'opt-opacity') $('opt-opacity-val').textContent = `${el.value}%`;
    if (el.id === 'opt-image' && el.files[0]) {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      logo = new Image(); logoUrl = URL.createObjectURL(el.files[0]); logo.onload = preview; logo.src = logoUrl; $('opt-type').value = 'image';
    }
    if (el.id === 'opt-text' && el.value) $('opt-type').value = 'text';
    preview();
  }
  const T = V.mount({
    actionLabel: 'Apply watermark', verb: 'Watermarking', suffix: 'watermarked',
    onLoad: preview, onSetting,
    onReset: () => { pv.classList.remove('is-shown'); if (logoUrl) URL.revokeObjectURL(logoUrl); logo = null; logoUrl = ''; $('opt-size-val').textContent = '20%'; $('opt-opacity-val').textContent = '70%'; },
    summary: () => { const c = o(); return `${c.type === 'image' ? (logo ? 'Logo' : 'Logo (none chosen)') : c.text ? `“${c.text.slice(0, 18)}${c.text.length > 18 ? '…' : ''}”` : 'Text (empty)'} · ${$('opt-pos').selectedOptions[0].textContent} · ${Math.round(c.opacity * 100)}% opacity`; },
    validate: () => { const c = o(); return c.type === 'image' ? (logo ? '' : 'Choose a watermark image in Settings.') : c.text ? '' : 'Type the watermark text in Settings.'; },
    run: (S, api) => V.render({ w: S.w, h: S.h, segments: [{ video: api.src, from: 0, to: S.dur }], draw, audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop }),
    present: (r, S, setOutput) => { setOutput(r.blob, r.w, r.h); T.outV.src = S.outUrl; T.outV.classList.add('is-shown'); pv.classList.remove('is-shown'); }
  });
  ['seeked', 'timeupdate', 'loadeddata'].forEach((ev) => T.src.addEventListener(ev, preview));
  window.__vw = { T, draw, o };
})();
