/* Audio Visualizer — Toolity.in. Decoded audio → video-common.renderLive (AnalyserNode → canvas → MediaRecorder, real time) with five
 * styles (circle · bars · mirror · wave · dots), cover art, title/subtitle, background modes, progress bar. A still layout preview is
 * drawn as soon as audio loads so the design can be tuned before the (real-time) render. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, V = window.ToolityVideo, { copyBlob, formatBytes, formatTime, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const cv = $('viz'), g = cv.getContext('2d'), outV = $('output-video');
  const MAX_SEC = 600, IMG = { cover: null, bg: null };
  const v = (id) => $(id).value, on = (id) => $(id).checked;
  const size = () => { const [w, h] = v('opt-size').split('x').map(Number); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return [w, h]; };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const alpha = (h, a) => `rgba(${rgb(h).join(',')},${a})`;
  const cover = (ctx, w, h, img, blur) => { const k = Math.max(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k; ctx.save(); if (blur) ctx.filter = `blur(${Math.round(w / 40)}px) brightness(0.55)`; ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); ctx.restore(); };
  // Designed by Kapil Pidhwani: layout = one "focal" square (cover) + text block; vertical frames push the focal point to the upper third.
  function layout(w, h) {
    const portrait = h > w * 1.2, s = Math.round(Math.min(w, h) * (portrait ? 0.46 : 0.34)), cy = portrait ? h * 0.36 : h * 0.4, textY = cy + s * 0.62 + h * 0.05;
    const visTop = textY + w * (portrait ? 0.14 : 0.1), visBot = h * 0.94; // band for bars / wave / dots: strictly below the text block
    return { portrait, s, cx: w / 2, cy, textY, visTop, visBot, visMid: (visTop + visBot) / 2, visH: visBot - visTop };
  }

  /* bins(an) → 64 log-spaced magnitudes 0..1 (scaled by sensitivity); idle shape when no analyser */
  function bins(an, n = 64) {
    const sens = Number(v('opt-sens')) / 100, out = new Float32Array(n);
    if (!an) { for (let i = 0; i < n; i++) out[i] = 0.12 + 0.1 * Math.abs(Math.sin(i * 0.5)); return out; }
    const f = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(f); const lo = 2, hi = f.length * 0.75;
    for (let b = 0; b < n; b++) { const a = Math.floor(lo * Math.pow(hi / lo, b / n)), z = Math.max(a + 1, Math.floor(lo * Math.pow(hi / lo, (b + 1) / n))); let m = 0; for (let k = a; k < z; k++) m = Math.max(m, f[k]); out[b] = Math.min(1, (m / 255) * sens); }
    return out;
  }
  function wave(an, n = 256) { const out = new Float32Array(n); if (!an) { for (let i = 0; i < n; i++) out[i] = 0.12 * Math.sin(i / n * Math.PI * 6); return out; } const t = new Float32Array(an.fftSize); an.getFloatTimeDomainData(t); const step = t.length / n; for (let i = 0; i < n; i++) out[i] = t[Math.floor(i * step)] * (Number(v('opt-sens')) / 100); return out; }

  function draw(ctx, an, t, dur) {
    const w = ctx.canvas.width, h = ctx.canvas.height, L = layout(w, h), ac = v('opt-accent'), ac2 = v('opt-accent2'), style = v('opt-style'), mode = v('opt-bgmode');
    const light = mode === 'light', fg = light ? '#111' : '#fff', muted = light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.65)';
    // background
    ctx.fillStyle = light ? '#f7f7f5' : '#0e0e10'; ctx.fillRect(0, 0, w, h);
    if (mode === 'gradient') { const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, ac); gr.addColorStop(1, ac2); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
    else if (mode === 'image' && IMG.bg) cover(ctx, w, h, IMG.bg, true); else if (mode === 'cover' && IMG.cover) cover(ctx, w, h, IMG.cover, true);
    const grad = ctx.createLinearGradient(0, h, 0, 0); grad.addColorStop(0, ac); grad.addColorStop(1, ac2);
    const B = bins(an), energy = B.reduce((s, x) => s + x, 0) / B.length;
    // visual per style
    if (style === 'circle') {
      const r = L.s / 2, n = B.length, maxLen = L.s * 0.42; ctx.save(); ctx.translate(L.cx, L.cy); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, (2 * Math.PI * r) / n * 0.55); ctx.strokeStyle = grad;
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, len = maxLen * B[i % n]; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8)); ctx.lineTo(Math.cos(a) * (r + 8 + len), Math.sin(a) * (r + 8 + len)); ctx.stroke(); }
      ctx.restore();
    } else if (style === 'bars' || style === 'mirror') {
      const n = B.length, gap = w / n * 0.25, bw = w / n - gap, base = style === 'bars' ? L.visBot : L.visMid, maxH = style === 'bars' ? L.visH : L.visH * 0.5; ctx.fillStyle = grad;
      for (let i = 0; i < n; i++) { const bh = Math.max(3, B[i] * maxH), x = i * (bw + gap) + gap / 2; rr(ctx, x, base - bh, bw, bh, bw / 2); if (style === 'mirror') rr(ctx, x, base, bw, bh * 0.6, bw / 2); }
    } else if (style === 'wave') {
      const W = wave(an), y0 = L.visMid, amp = L.visH * 0.12; ctx.strokeStyle = grad; ctx.lineWidth = Math.max(3, h / 200); ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < W.length; i++) { const x = (i / (W.length - 1)) * w, y = y0 - W[i] * amp * 4; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    } else if (style === 'dots') {
      const n = 32, y0 = L.visMid, gapX = w / n; ctx.fillStyle = grad;
      for (let i = 0; i < n; i++) { const val = B[Math.floor(i * B.length / n)], rad = Math.max(2, val * gapX * 0.45 + gapX * 0.08); ctx.beginPath(); ctx.arc(gapX * (i + 0.5), y0, rad, 0, Math.PI * 2); ctx.fill(); }
    }
    // cover (circle for circle style, rounded square otherwise), with a gentle pulse
    const pulse = 1 + energy * 0.05, s = L.s * pulse;
    ctx.save(); ctx.translate(L.cx, L.cy); ctx.beginPath(); if (style === 'circle') ctx.arc(0, 0, s / 2, 0, Math.PI * 2); else roundPath(ctx, -s / 2, -s / 2, s, s, s * 0.08); ctx.closePath();
    ctx.fillStyle = alpha(ac, 0.18); ctx.fill(); ctx.clip();
    if (IMG.cover) { const k = Math.max(s / IMG.cover.width, s / IMG.cover.height); ctx.drawImage(IMG.cover, -IMG.cover.width * k / 2, -IMG.cover.height * k / 2, IMG.cover.width * k, IMG.cover.height * k); }
    else { ctx.fillStyle = grad; ctx.globalAlpha = 0.9; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = `${Math.round(s * 0.3)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♪', 0, s * 0.02); }
    ctx.restore();
    // text
    const title = v('av-title').trim(), sub = v('av-sub').trim(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (title) { ctx.fillStyle = fg; ctx.font = `600 ${Math.round(w * (L.portrait ? 0.055 : 0.04))}px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif`; ctx.fillText(fit(ctx, title, w * 0.86), w / 2, L.textY); }
    if (sub) { ctx.fillStyle = muted; ctx.font = `400 ${Math.round(w * (L.portrait ? 0.036 : 0.026))}px -apple-system, "Segoe UI", Roboto, system-ui, sans-serif`; ctx.fillText(fit(ctx, sub, w * 0.86), w / 2, L.textY + w * (L.portrait ? 0.075 : 0.055)); }
    // progress + time
    if (on('opt-progress') && dur) { const m = w * 0.07, y = h - Math.round(h * 0.035), th = Math.max(4, h / 240); ctx.fillStyle = light ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.2)'; rr(ctx, m, y, w - 2 * m, th, th / 2); ctx.fillStyle = grad; rr(ctx, m, y, (w - 2 * m) * (t / dur), th, th / 2); }
    if (on('opt-time') && dur) { ctx.fillStyle = muted; ctx.font = `500 ${Math.round(w * 0.024)}px system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${formatTime(t)} / ${formatTime(dur)}`, w - w * 0.07, h - Math.round(h * 0.035) - 10); }
  }
  const rr = (ctx, x, y, w, h, r) => { roundPath(ctx, x, y, w, h, r); ctx.fill(); };
  function roundPath(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fit(ctx, text, max) { if (ctx.measureText(text).width <= max) return text; let s = text; while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }

  const still = () => { if (!T.S.buf) return; size(); draw(g, null, 0, T.S.buf.duration); cv.classList.add('is-shown'); outV.classList.remove('is-shown'); $('output-empty').hidden = true; };
  async function loadImg(input, key) { const f = input.files && input.files[0]; if (!f) return; try { IMG[key] = await createImageBitmap(f, { imageOrientation: 'from-image' }); still(); } catch (e) { toast('Could not read that image'); } input.value = ''; }
  $('av-cover').addEventListener('change', (e) => loadImg(e.target, 'cover')); $('av-bg').addEventListener('change', (e) => loadImg(e.target, 'bg'));
  ['av-title', 'av-sub'].forEach((id) => $(id).addEventListener('input', still));

  const T = A.mount({
    actionLabel: 'Render video', verb: 'Rendering', suffix: 'visualizer',
    fmtRange: (el) => `${el.value}%`,
    summary: () => `${$('opt-style').selectedOptions[0].textContent.split(' ')[0]} · ${v('opt-size').replace('x', ' × ')}`,
    onLoad: still, onSetting: still,
    onReset: () => { IMG.cover = IMG.bg = null; ['av-title', 'av-sub'].forEach((id) => { $(id).value = ''; }); cv.classList.remove('is-shown'); outV.classList.remove('is-shown'); outV.removeAttribute('src'); },
    validate: (S) => (S.buf.duration > MAX_SEC ? `That audio is ${formatTime(S.buf.duration)} — the limit is 10 minutes. Split it first.` : ''),
    run: async (S, api) => {
      const [w, h] = size(); cv.classList.add('is-shown'); outV.classList.remove('is-shown');
      const r = await V.renderLive({ w, h, audioBuffer: S.buf, fps: Number(v('opt-fps')), draw: (ctx, an, t, dur) => { draw(ctx, an, t, dur); g.drawImage(ctx.canvas, 0, 0); }, onProgress: api.onProgress, stop: api.stop });
      return { blob: r.blob, mime: r.mime, note: `Rendered ${w} × ${h}` };
    },
    present: (r, S, setOutput) => { setOutput(r.blob, null, `${v('opt-size').replace('x', ' × ')} · ${r.blob.type.includes('mp4') ? 'MP4' : 'WebM'} · ${formatBytes(r.blob.size)}`); outV.src = S.outUrl; outV.classList.add('is-shown'); cv.classList.remove('is-shown'); },
    outExt: (S) => (S.out.type.includes('mp4') ? 'mp4' : 'webm'),
    copy: () => cv.toBlob((b) => copyBlob(b, 'Frame copied (PNG)'), 'image/png')
  });
  window.__av = { T, draw, IMG, still };
})();
