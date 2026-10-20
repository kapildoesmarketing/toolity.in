/* Video to Sticker — Toolity.in. Trim (bindRange) + square crop box over the <video> → 512×512.
 * Telegram: real-time VP9 WebM via video-common.render with a bitrate solved for ≤ 256 KB (re-encoded lower if over).
 * WhatsApp: frames via extractFrames → canvas WebP → /scripts/webp-anim.js muxer, quality then fps stepped down until ≤ 500 KB.
 * Static: one frame → WebP ≤ 100 KB. Optional chroma key (corner-sampled) for the WebP paths. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, W = window.ToolityWebP, { formatBytes, formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  const SIZE = 512, LIMIT = { telegram: { bytes: 256 * 1024, sec: 3 }, whatsapp: { bytes: 500 * 1024, sec: 10 }, static: { bytes: 100 * 1024, sec: 0 } };
  const box = $('crop-box'), video = $('source-video'), vp = box.parentElement, outV = $('output-video'), outI = $('output-img'), C = { x: 0, y: 0, s: 0 };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const platform = () => $('opt-platform').value, fps = () => Number($('opt-fps').value);

  /* ── square crop box over the video (object-fit: contain geometry) ── */
  function geom() { const S = T.S, el = video.getBoundingClientRect(), vr = vp.getBoundingClientRect(), k = Math.min(el.width / S.w, el.height / S.h); return { k, ox: el.left - vr.left + (el.width - S.w * k) / 2, oy: el.top - vr.top + (el.height - S.h * k) / 2 }; }
  function paint() { const S = T.S; if (!S.w) return; const g = geom(); Object.assign(box.style, { left: `${g.ox + C.x * g.k}px`, top: `${g.oy + C.y * g.k}px`, width: `${C.s * g.k}px`, height: `${C.s * g.k}px` }); }
  function fitBox(S) { C.s = Math.min(S.w, S.h); C.x = Math.round((S.w - C.s) / 2); C.y = Math.round((S.h - C.s) / 2); paint(); }
  function constrain(S) { C.s = clamp(C.s, 16, Math.min(S.w, S.h)); C.x = clamp(C.x, 0, S.w - C.s); C.y = clamp(C.y, 0, S.h - C.s); }
  let drag = null;
  box.addEventListener('pointerdown', (e) => { e.preventDefault(); box.setPointerCapture(e.pointerId); drag = { mode: e.target.classList.contains('vcr-handle') ? 'size' : 'move', sx: e.clientX, sy: e.clientY, ...C, k: geom().k }; });
  box.addEventListener('pointermove', (e) => { if (!drag) return; const dx = (e.clientX - drag.sx) / drag.k, dy = (e.clientY - drag.sy) / drag.k; if (drag.mode === 'move') { C.x = drag.x + dx; C.y = drag.y + dy; } else C.s = drag.s + Math.max(dx, dy); constrain(T.S); paint(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => box.addEventListener(ev, () => { drag = null; }));
  new ResizeObserver(() => paint()).observe(vp);

  /* ── frame draw: crop → pad → optional chroma key ── */
  const pad = () => Number($('opt-pad').value) / 100;
  function key(ctx, w, h) { // Designed by Kapil Pidhwani: key colour = average of the 4 corners; distance in RGB with soft edge. Ceiling: no spill suppression.
    const img = ctx.getImageData(0, 0, w, h), d = img.data, tol = Number($('opt-chroma-tol').value) * 2.2;
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4]; let kr = 0, kg = 0, kb = 0;
    corners.forEach((i) => { kr += d[i]; kg += d[i + 1]; kb += d[i + 2]; }); kr /= 4; kg /= 4; kb /= 4;
    for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const dist = Math.hypot(d[i] - kr, d[i + 1] - kg, d[i + 2] - kb); if (dist < tol) d[i + 3] = 0; else if (dist < tol * 1.5) d[i + 3] = Math.round(d[i + 3] * ((dist - tol) / (tol * 0.5))); }
    ctx.putImageData(img, 0, 0);
  }
  function draw(ctx, v, w, h, chroma) {
    ctx.clearRect(0, 0, w, h); const p = Math.round(w * pad()); ctx.drawImage(v, C.x, C.y, C.s, C.s, p, p, w - 2 * p, h - 2 * p);
    if (chroma) key(ctx, w, h);
  }
  const chromaOn = () => $('opt-chroma').checked && platform() !== 'telegram';
  let RNG = { from: 0, to: 0 }; // filled by bindRange's onChange (R itself is assigned after the first paint)
  const sel = () => ({ from: RNG.from, to: RNG.to, len: Math.max(0.1, RNG.to - RNG.from) });
  const fitNote = (r) => { if (r) RNG = r; const L = LIMIT[platform()], { len } = sel(); const el = $('vts-fit-note'); if (!L.sec || len <= L.sec + 0.01) el.textContent = ''; else el.textContent = $('opt-speedfit').checked ? `→ sped up ${(len / L.sec).toFixed(1)}× to fit ${L.sec} s` : `— over the ${L.sec} s limit, trim it`; };

  /* ── encoders ── */
  async function telegram(S, api) {
    const { from, to, len } = sel(), rate = Math.max(1, len / LIMIT.telegram.sec), dur = len / rate;
    let vbps = Math.floor((LIMIT.telegram.bytes * 8 * 0.82) / dur), blob = null, mime = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      api.progress(0, attempt ? `Re-encoding smaller (${attempt + 1}/3)…` : 'Encoding…');
      const r = await V.render({ w: SIZE, h: SIZE, segments: [{ video, from, to, rate }], draw: (c, v, w, h) => draw(c, v, w, h, false), audio: false, vbps, fps: 30, mime: 'video/webm;codecs=vp9', onProgress: api.onProgress, stop: api.stop });
      blob = r.blob; mime = r.mime; if (blob.size <= LIMIT.telegram.bytes) break; vbps = Math.floor(vbps * (LIMIT.telegram.bytes / blob.size) * 0.85);
    }
    const vp9 = /vp9/i.test(mime); return { blob, w: SIZE, h: SIZE, kind: 'video', sec: dur, ok: blob.size <= LIMIT.telegram.bytes && vp9, why: !vp9 ? `${mime.includes('mp4') ? 'MP4' : 'VP8'} only — this browser cannot record VP9; use Chrome or Edge for Telegram` : blob.size > LIMIT.telegram.bytes ? `still ${formatBytes(blob.size)} after 3 passes — shorten or crop tighter` : '' };
  }
  async function whatsapp(S, api) {
    const { from, to, len } = sel(), rate = Math.max(1, len / LIMIT.whatsapp.sec), chroma = chromaOn();
    let f = fps(), q = 0.8, blob = null, frames = null;
    for (let attempt = 0; attempt < 6; attempt++) { // Designed by Kapil Pidhwani: frames are re-grabbed per pass (blobs can't be re-quantised); ≤ 6 passes × ≤ 300 seeks.
      api.progress(0, attempt ? `Pass ${attempt + 1}: ${f} fps · quality ${Math.round(q * 100)}…` : `Grabbing frames @ ${f} fps…`);
      frames = await V.extractFrames(video, { from, to, step: rate / f, max: 300, w: SIZE, h: SIZE, type: 'image/webp', quality: q, draw: (c, v, w, h) => draw(c, v, w, h, chroma), onProgress: (p) => api.progress(p * 0.85, `Grabbing frames ${Math.round(p * 100)}%`), stop: api.stop });
      if (!frames.length) throw new Error('No frames in the selected range.');
      api.progress(0.9, 'Muxing…'); blob = await W.encode(frames.map((x) => ({ blob: x.blob, ms: 1000 / f })), { width: SIZE, height: SIZE });
      if (blob.size <= LIMIT.whatsapp.bytes) break;
      if (q > 0.45) q -= 0.17; else if (f > 10) f = Math.max(10, Math.round(f * 0.66)); else { q = Math.max(0.2, q - 0.1); }
    }
    return { blob, w: SIZE, h: SIZE, kind: 'image', sec: len / rate, frames: frames.length, fps: f, ok: blob.size <= LIMIT.whatsapp.bytes, why: blob.size > LIMIT.whatsapp.bytes ? `still ${formatBytes(blob.size)} — shorten the range` : '' };
  }
  async function still(S, api) {
    const t = clamp(video.currentTime, R.from, R.to), chroma = chromaOn(); let q = 0.92, blob = null;
    for (let i = 0; i < 6 && (!blob || blob.size > LIMIT.static.bytes); i++, q -= 0.14) { const [fr] = await V.extractFrames(video, { from: t, to: t + 0.01, step: 1, max: 1, w: SIZE, h: SIZE, type: 'image/webp', quality: q, draw: (c, v, w, h) => draw(c, v, w, h, chroma) }); blob = fr.blob; api.progress(0.5 + i * 0.08, 'Encoding…'); }
    return { blob, w: SIZE, h: SIZE, kind: 'image', sec: 0, ok: blob.size <= LIMIT.static.bytes, why: blob.size > LIMIT.static.bytes ? `still ${formatBytes(blob.size)}` : '' };
  }

  const R = V.bindRange(video, fitNote);
  const showChroma = () => { const on = platform() !== 'telegram'; $('opt-chroma').closest('.control-item').hidden = !on; $('opt-chroma-tol').closest('.control-item').hidden = !on || !$('opt-chroma').checked; $('opt-fps').closest('.control-item').hidden = platform() === 'static'; };
  showChroma();
  const T = V.mount({
    actionLabel: 'Make sticker', verb: 'Encoding', suffix: 'sticker',
    onLoad: (S) => { R.reset(S.dur); box.hidden = false; requestAnimationFrame(() => fitBox(S)); if (S.dur > 3 && platform() === 'telegram') R.set(0, Math.min(S.dur, 3)); fitNote(); },
    onSetting: (el) => { if (el.id === 'opt-platform' || el.id === 'opt-chroma') showChroma(); if (el.id === 'opt-platform' && platform() === 'telegram' && $('opt-fps').value !== '30') $('opt-fps').value = '30'; fitNote(); },
    onReset: () => { box.hidden = true; Object.assign(C, { x: 0, y: 0, s: 0 }); R.reset(0); [outV, outI].forEach((el) => el.classList.remove('is-shown')); outI.removeAttribute('src'); $('vts-verdict').hidden = true; showChroma(); },
    summary: () => `${$('opt-platform').selectedOptions[0].textContent.split(' — ')[0].replace(' video sticker', '').replace(' animated sticker', '')} · ${platform() === 'static' ? 'still' : fps() + ' fps'}${chromaOn() ? ' · transparent' : ''}`,
    validate: () => { const L = LIMIT[platform()], { len } = sel(); return L.sec && len > L.sec + 0.01 && !$('opt-speedfit').checked ? `The selection is ${len.toFixed(1)} s — ${platform() === 'telegram' ? 'Telegram' : 'WhatsApp'} allows ${L.sec} s. Trim it, or turn on “Speed up to fit”.` : ''; },
    outExt: () => (platform() === 'telegram' ? 'webm' : 'webp'),
    run: (S, api) => ({ telegram, whatsapp, static: still })[platform()](S, api),
    present: (r, S, setOutput) => {
      const name = { telegram: 'Telegram', whatsapp: 'WhatsApp', static: 'Static' }[platform()], L = LIMIT[platform()];
      setOutput(r.blob, r.w, r.h, `${r.w} × ${r.h} · ${r.kind === 'video' ? 'WebM' : 'WebP'} · ${formatBytes(r.blob.size)}${r.sec ? ` · ${r.sec.toFixed(1)} s` : ''}${r.frames ? ` · ${r.frames} frames @ ${r.fps} fps` : ''}`);
      [outV, outI].forEach((el) => el.classList.remove('is-shown'));
      if (r.kind === 'video') { outV.src = S.outUrl; outV.classList.add('is-shown'); } else { outI.src = S.outUrl; outI.classList.add('is-shown'); }
      const v = $('vts-verdict'); v.hidden = false; v.classList.toggle('is-ok', r.ok); v.classList.toggle('is-bad', !r.ok);
      v.textContent = r.ok ? `✓ ${name}-ready — ${formatBytes(r.blob.size)} of ${formatBytes(L.bytes)} allowed` : `✗ Not ${name}-ready: ${r.why}`;
      S.sticker = r;
    }
  });
  window.__vts = { T, C, R, fitBox, LIMIT };
})();
