/* Blob Maker — Toolity.in. Seeded organic shapes → closed Catmull-Rom → cubic Béziers. One geometry model feeds two renderers:
 * SVG (still + animated via sampled <animate d> frames) and canvas (live preview, PNG/WebP/JPG, GIF via gifenc, WebM/MP4 via
 * MediaRecorder). Movement is applied to the points themselves, so every export loops seamlessly from the same maths.
 * Settings live in the URL #hash for sharing. Runtime: /scripts/web-common.js. All on-device. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { copyText, setBusy } = window.Toolity, $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2, HEX = /^#[0-9a-f]{6}$/i, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const RATIOS = { '1:1': [1000, 1000], '16:9': [1600, 900], '9:16': [900, 1600], '4:5': [1000, 1250], '3:2': [1500, 1000] };
  const GIFENC = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm';

  /* ── Config from the controls ── */
  function cfg(api) {
    const n = (id) => Number(api.val(id)), [W, H] = RATIOS[api.val('opt-ratio')] || RATIOS['1:1'];
    return {
      W, H, style: api.pill('seg-style'), n: n('opt-points'), random: n('opt-random') / 100, smooth: n('opt-smooth') / 100, size: n('opt-size') / 100,
      rot: (n('opt-rotate') * Math.PI) / 180, seed: Math.max(1, Math.round(n('opt-seed')) || 1), fill: api.pill('seg-fill'),
      c1: HEX.test(api.val('opt-c1')) ? api.val('opt-c1') : '#ff6a2a', c2: HEX.test(api.val('opt-c2')) ? api.val('opt-c2') : '#ffc14d', angle: n('opt-angle'), opacity: n('opt-opacity') / 100,
      bg: api.pill('seg-bg'), bg1: HEX.test(api.val('opt-bg1')) ? api.val('opt-bg1') : '#ffffff', bg2: HEX.test(api.val('opt-bg2')) ? api.val('opt-bg2') : '#ffffff',
      motion: api.pill('seg-motion'), loop: n('opt-loop'), amount: n('opt-amount') / 100,
      layers: n('opt-layers'), lstep: n('opt-lstep') / 100, loffset: n('opt-loffset') / 100, blur: n('opt-blur') / 100, grain: n('opt-grain') / 100,
      shadow: api.val('opt-shadow'), outline: api.val('opt-outline'), stroke: n('opt-stroke'), code: api.val('opt-code')
    };
  }

  /* ── Geometry ── */
  const rng = (seed) => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function shape(c, seed) { // [angle, radius factor] per point
    const r = rng(seed), out = [];
    for (let j = 0; j < c.n; j++) {
      const a = (TAU * j) / c.n + (r() - 0.5) * (TAU / c.n) * 0.4 * c.random;
      let f;
      if (c.style === 'flower') f = (j % 2 ? 1 - (0.15 + 0.45 * c.random) : 1) - 0.08 * r();
      else if (c.style === 'wave') f = 1 - 0.32 * c.random * (0.5 + 0.5 * Math.sin(3 * a + r() * 1.2));
      else f = 1 - 0.6 * c.random * r();
      out.push([a, f]);
    }
    return out;
  }
  const ease = (u) => u * u * (3 - 2 * u);
  /* layersAt(c, t ∈ [0,1)) → [{ pts, d, color }] back-to-front. Periodic in t, so frame 1 === frame 0 (seamless loops). */
  function layersAt(c, t) {
    const m = Math.min(c.W, c.H), out = [];
    for (let i = 0; i < c.layers; i++) {
      const R = (c.size * m) / 2 * (1 - i * c.lstep), seed = c.seed + i * 7919, off = c.loffset * m * i * 0.7;
      const cx = c.W / 2 + off, cy = c.H / 2 + off * 0.6;
      let sh = shape(c, seed), rot = c.rot, sc = 1, tx = 0, ty = 0;
      if (c.motion === 'morph') {
        const K = [sh, shape(c, seed + 101), shape(c, seed + 202)].map((k) => k.map((p, j) => [sh[j][0] + (p[0] - sh[j][0]) * c.amount, sh[j][1] + (p[1] - sh[j][1]) * c.amount]));
        const s = (t % 1) * 3, k = Math.floor(s) % 3, u = ease(s - Math.floor(s)), A = K[k], B = K[(k + 1) % 3];
        sh = A.map((p, j) => [p[0] + (B[j][0] - p[0]) * u, p[1] + (B[j][1] - p[1]) * u]);
      } else if (c.motion === 'float') { tx = c.amount * 0.06 * m * Math.sin(TAU * t + i * 0.9); ty = c.amount * 0.04 * m * Math.sin(2 * TAU * t + i * 0.9); }
      else if (c.motion === 'spin') rot += TAU * t;
      else if (c.motion === 'pulse') sc = 1 + c.amount * 0.12 * Math.sin(TAU * t + i * 0.8);
      const pts = sh.map(([a, f]) => [cx + tx + R * sc * f * Math.cos(a + rot), cy + ty + R * sc * f * Math.sin(a + rot)]);
      const color = c.layers > 1 && c.fill === 'solid' ? mix(c.c1, c.c2, i / (c.layers - 1)) : c.c1;
      out.push({ pts, d: pathD(pts, c.smooth), color });
    }
    return out;
  }
  /* Closed Catmull-Rom → cubic Bézier. smooth 0 = straight segments (control points sit on the anchors). */
  function pathD(p, s, dp = 1) {
    const n = p.length, k = (s * 1.15) / 6, f = (v) => +v.toFixed(dp);
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) * k)} ${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)} ${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
  }
  function mix(a, b, u) { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join(''); }
  const gradVec = (deg) => { const r = (deg * Math.PI) / 180, dx = Math.sin(r), dy = -Math.cos(r); return [0.5 - dx / 2, 0.5 - dy / 2, 0.5 + dx / 2, 0.5 + dy / 2]; };
  const fx = (c) => { const m = Math.min(c.W, c.H); return { blur: c.blur * 0.06 * m, sdy: 0.02 * m, sblur: 0.03 * m, stroke: c.stroke * (m / 1000) }; };
  const steps = (c) => (c.motion === 'off' ? 0 : c.motion === 'float' || c.motion === 'pulse' ? 16 : 24);

  /* ── SVG renderer ── */
  function svg(c, animated) {
    const { W, H } = c, F = fx(c), S = animated ? steps(c) : 0, r4 = (v) => +v.toFixed(4);
    const frames = S ? Array.from({ length: S + 1 }, (_, k) => layersAt(c, k / S)) : [layersAt(c, 0)];
    const defs = [];
    if (c.bg === 'gradient') { const [x1, y1, x2, y2] = gradVec(c.angle); defs.push(`<linearGradient id="bg" x1="${r4(x1)}" y1="${r4(y1)}" x2="${r4(x2)}" y2="${r4(y2)}"><stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient>`); }
    if (c.fill === 'linear') { const [x1, y1, x2, y2] = gradVec(c.angle); defs.push(`<linearGradient id="fill" x1="${r4(x1)}" y1="${r4(y1)}" x2="${r4(x2)}" y2="${r4(y2)}"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></linearGradient>`); }
    if (c.fill === 'radial') defs.push(`<radialGradient id="fill"><stop offset="0" stop-color="${c.c1}"/><stop offset="1" stop-color="${c.c2}"/></radialGradient>`);
    const fxOn = F.blur > 0 || c.shadow;
    if (fxOn) defs.push(`<filter id="fx" x="-50%" y="-50%" width="200%" height="200%">${F.blur > 0 ? `<feGaussianBlur stdDeviation="${+F.blur.toFixed(1)}"/>` : ''}${c.shadow ? `<feDropShadow dx="0" dy="${+F.sdy.toFixed(1)}" stdDeviation="${+F.sblur.toFixed(1)}" flood-color="#000" flood-opacity="0.28"/>` : ''}</filter>`);
    if (c.grain > 0) defs.push(`<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`);
    if (c.grain > 0 && c.bg === 'none') defs.push('<clipPath id="clip"><use href="#blobs"/></clipPath>');
    const paint = (l) => (c.fill === 'solid' ? l.color : 'url(#fill)');
    const paths = frames[0].map((l, i) => {
      const look = c.outline ? `fill="none" stroke="${paint(l)}" stroke-width="${+F.stroke.toFixed(1)}" stroke-linejoin="round"` : `fill="${paint(l)}"`;
      const anim = S ? `<animate attributeName="d" dur="${c.loop}s" repeatCount="indefinite" values="${frames.map((f) => f[i].d).join(';')}"/>` : '';
      return `<path d="${l.d}" ${look}${c.opacity < 1 ? ` opacity="${c.opacity}"` : ''}>${anim}</path>`;
    }).join('');
    const bg = c.bg === 'none' ? '' : `<rect width="${W}" height="${H}" fill="${c.bg === 'gradient' ? 'url(#bg)' : c.bg1}"/>`;
    const grain = c.grain > 0 ? `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${+(c.grain * 0.45).toFixed(3)}" style="mix-blend-mode:soft-light"${c.bg === 'none' ? ' clip-path="url(#clip)"' : ''}/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${bg}<g id="blobs"${fxOn ? ' filter="url(#fx)"' : ''}>${paths}</g>${grain}</svg>`;
  }

  /* ── CSS export: front layer as clip-path (+ @keyframes when moving) ── */
  function css(c) {
    const S = steps(c), last = c.layers - 1, front = (t) => layersAt(c, t)[last].d;
    const bg = c.fill === 'linear' ? `linear-gradient(${c.angle}deg, ${c.c1}, ${c.c2})` : c.fill === 'radial' ? `radial-gradient(circle, ${c.c1}, ${c.c2})` : layersAt(c, 0)[last].color;
    const kf = S ? `\n\n@keyframes blob-move {\n${Array.from({ length: S + 1 }, (_, k) => `  ${+((k / S) * 100).toFixed(2)}% { clip-path: path('${front(k / S)}'); }`).join('\n')}\n}` : '';
    return `/* Blob Maker — Toolity.in. clip-path: path() uses pixels, so keep the element ${c.W} × ${c.H}px and scale it with transform.\n   CSS shows the front layer only; layers, blur, grain and outlines need the SVG export. */\n.blob {\n  width: ${c.W}px;\n  height: ${c.H}px;\n  background: ${bg};${c.opacity < 1 ? `\n  opacity: ${c.opacity};` : ''}\n  clip-path: path('${front(0)}');${S ? `\n  animation: blob-move ${c.loop}s linear infinite;` : ''}\n}${kf}\n`;
  }

  /* ── Canvas renderer (preview + raster/GIF/video) ── */
  let noise = null;
  function noisePattern(ctx) {
    if (!noise) { noise = document.createElement('canvas'); noise.width = noise.height = 256; const x = noise.getContext('2d'), img = x.createImageData(256, 256), r = rng(7); for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); }
    return ctx.createPattern(noise, 'repeat');
  }
  function draw(ctx, c, t, s, opaque) {
    const { W, H } = c, F = fx(c), cv = ctx.canvas;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (opaque && c.bg === 'none') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.setTransform(s, 0, 0, s, 0, 0);
    if (c.bg !== 'none') {
      if (c.bg === 'gradient') { const [x1, y1, x2, y2] = gradVec(c.angle), g = ctx.createLinearGradient(x1 * W, y1 * H, x2 * W, y2 * H); g.addColorStop(0, c.bg1); g.addColorStop(1, c.bg2); ctx.fillStyle = g; } else ctx.fillStyle = c.bg1;
      ctx.fillRect(0, 0, W, H);
    }
    if (F.blur > 0) ctx.filter = `blur(${F.blur * s}px)`;
    if (c.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = F.sblur * 2 * s; ctx.shadowOffsetY = F.sdy * s; }
    for (const l of layersAt(c, t)) {
      let paint = l.color;
      if (c.fill !== 'solid') {
        const xs = l.pts.map((p) => p[0]), ys = l.pts.map((p) => p[1]), bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
        if (c.fill === 'linear') { const [x1, y1, x2, y2] = gradVec(c.angle); paint = ctx.createLinearGradient(bx + x1 * bw, by + y1 * bh, bx + x2 * bw, by + y2 * bh); }
        else paint = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 0, bx + bw / 2, by + bh / 2, Math.max(bw, bh) / 2);
        paint.addColorStop(0, c.c1); paint.addColorStop(1, c.c2);
      }
      ctx.globalAlpha = c.opacity; const p = new Path2D(l.d);
      if (c.outline) { ctx.strokeStyle = paint; ctx.lineWidth = F.stroke; ctx.lineJoin = 'round'; ctx.stroke(p); } else { ctx.fillStyle = paint; ctx.fill(p); }
    }
    ctx.filter = 'none'; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
    if (c.grain > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = c.grain * 0.45; ctx.globalCompositeOperation = c.bg === 'none' && !opaque ? 'source-atop' : 'soft-light'; ctx.fillStyle = noisePattern(ctx); ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.restore();
  }
  const canvasFor = (c, maxSide) => { const s = Math.min(1, maxSide / Math.max(c.W, c.H)), cv = document.createElement('canvas'); cv.width = Math.round(c.W * s / 2) * 2; cv.height = Math.round(c.H * s / 2) * 2; return { cv, ctx: cv.getContext('2d'), s: cv.width / c.W }; };

  /* ── Live preview ── */
  const pv = $('blob-canvas'), pctx = pv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)');
  // Designed by Kapil Pidhwani: the preview honours prefers-reduced-motion by *starting* paused, but never silently — the Play/Pause
  // button says so, and picking a movement (an explicit request) always plays. Exports never depend on this.
  let C = null, raf = 0, t0 = performance.now(), play = !still.matches;
  const moving = () => C && C.motion !== 'off' && play;
  function paintPlay() {
    const b = $('btn-play'), on = C && C.motion !== 'off'; b.hidden = !on; b.setAttribute('aria-pressed', String(play));
    b.querySelector('span').textContent = play ? 'Pause' : 'Play preview'; b.querySelector('iconify-icon').setAttribute('icon', play ? 'lucide:pause' : 'lucide:play');
  }
  function preview() {
    cancelAnimationFrame(raf); if (!C) return; paintPlay();
    const s = Math.min(2, devicePixelRatio || 1) * Math.min(1, 700 / Math.max(C.W, C.H));
    if (pv.width !== Math.round(C.W * s) || pv.height !== Math.round(C.H * s)) { pv.width = Math.round(C.W * s); pv.height = Math.round(C.H * s); }
    $('output-preview').classList.toggle('is-transparent', C.bg === 'none');
    const frame = () => { draw(pctx, C, moving() ? (((performance.now() - t0) / 1000) % C.loop) / C.loop : pausedAt, s); if (moving()) raf = requestAnimationFrame(frame); };
    frame();
  }

  /* ── Exports ── */
  async function raster(c, scale, type) {
    const s = Math.min(scale, 8000 / Math.max(c.W, c.H)), cv = document.createElement('canvas'); cv.width = Math.round(c.W * s); cv.height = Math.round(c.H * s);
    draw(cv.getContext('2d'), c, 0, s, type === 'image/jpeg');
    return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('This browser could not encode that format — try PNG.'))), type, 0.92));
  }
  async function gif(c, api) {
    const { GIFEncoder, quantize, applyPalette } = await import(GIFENC);
    const { cv, ctx, s } = canvasFor(c, 640), fps = Math.min(25, Math.floor(250 / c.loop)), N = Math.round(c.loop * fps), enc = GIFEncoder(), alpha = c.bg === 'none';
    for (let k = 0; k < N; k++) {
      draw(ctx, c, k / N, s);
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const palette = alpha ? quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true }) : quantize(data, 256);
      const index = applyPalette(data, palette, alpha ? 'rgba4444' : 'rgb565'), ti = alpha ? palette.findIndex((p) => p[3] === 0) : -1;
      enc.writeFrame(index, cv.width, cv.height, { palette, delay: Math.round(1000 / fps), repeat: 0, transparent: ti >= 0, transparentIndex: Math.max(0, ti), dispose: alpha ? 2 : -1 });
      if (k % 2 === 0) { api.status(`Rendering GIF ${Math.round((k / N) * 100)}%`); await sleep(0); }
    }
    enc.finish();
    return new Blob([enc.bytes()], { type: 'image/gif' });
  }
  async function video(c, api, kind) {
    const list = kind === 'mp4' ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mime = window.MediaRecorder && list.find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error(kind === 'mp4' ? 'This browser can’t record MP4 — choose WebM (or use Safari / a recent Chrome for MP4).' : 'This browser can’t record WebM — choose MP4.');
    const { cv, ctx, s } = canvasFor(c, 1080), rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: Math.min(12e6, cv.width * cv.height * 6) }), chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    draw(ctx, c, 0, s, true); rec.start(250);
    const start = performance.now(), ms = c.loop * 1000;
    try {
      await new Promise((resolve, reject) => { // rAF for smooth frames + interval watchdog: hidden for 8 s → reject, never hang
        let hiddenSince = 0, fr = 0;
        const iv = setInterval(() => {
          if (document.hidden) { hiddenSince = hiddenSince || performance.now(); if (performance.now() - hiddenSince > 8000) { clearInterval(iv); cancelAnimationFrame(fr); reject(new Error('Recording stopped — keep this tab visible while the video records.')); } } else hiddenSince = 0;
          api.status(`Recording video ${Math.min(100, Math.round(((performance.now() - start) / ms) * 100))}%`);
        }, 250);
        const step = () => { const e = performance.now() - start; draw(ctx, c, Math.min(e, ms) / ms % 1, s, true); if (e >= ms + 60) { clearInterval(iv); return resolve(); } fr = requestAnimationFrame(step); };
        step();
      });
    } finally { if (rec.state !== 'inactive') rec.stop(); }
    return done;
  }

  /* ── Presets (style + shape; canvas and seed are kept) ── */
  const PRESETS = {
    sunset: { fill: 'linear', c1: '#ff6a2a', c2: '#ffc14d', angle: 135, bg: 'solid', bg1: '#1a0f0a', layers: 3, lstep: 14, loffset: 6, blur: 0, grain: 18, shadow: 0, outline: 0, motion: 'morph', opacity: 100, points: 7, random: 45, smooth: 80, style: 'organic' },
    pastel: { fill: 'linear', c1: '#a5b4fc', c2: '#f9a8d4', angle: 120, bg: 'solid', bg1: '#fff7ed', layers: 4, lstep: 12, loffset: 8, blur: 35, grain: 10, shadow: 0, outline: 0, motion: 'float', opacity: 90, points: 8, random: 50, smooth: 85, style: 'organic' },
    aurora: { fill: 'linear', c1: '#7c3aed', c2: '#06b6d4', angle: 160, bg: 'gradient', bg1: '#020617', bg2: '#0f172a', layers: 5, lstep: 10, loffset: 10, blur: 60, grain: 25, shadow: 0, outline: 0, motion: 'morph', opacity: 85, points: 6, random: 55, smooth: 90, style: 'organic' },
    mint: { fill: 'radial', c1: '#6ee7b7', c2: '#059669', bg: 'solid', bg1: '#ecfdf5', layers: 1, blur: 0, grain: 0, shadow: 1, outline: 0, motion: 'pulse', opacity: 100, points: 6, random: 20, smooth: 95, style: 'organic' },
    candy: { fill: 'linear', c1: '#f472b6', c2: '#fb923c', angle: 45, bg: 'solid', bg1: '#fdf2f8', layers: 2, lstep: 18, loffset: 4, blur: 0, grain: 8, shadow: 0, outline: 0, motion: 'spin', opacity: 100, points: 12, random: 60, smooth: 55, style: 'flower' },
    outline: { fill: 'solid', c1: '#f4511e', c2: '#ffc14d', bg: 'none', layers: 3, lstep: 16, loffset: 0, blur: 0, grain: 0, shadow: 0, outline: 1, stroke: 6, motion: 'morph', opacity: 100, points: 9, random: 40, smooth: 75, style: 'organic' },
    mono: { fill: 'solid', c1: '#111111', c2: '#555555', bg: 'solid', bg1: '#ffffff', layers: 1, blur: 0, grain: 0, shadow: 0, outline: 0, motion: 'off', opacity: 100, points: 7, random: 35, smooth: 85, style: 'wave' }
  };
  const PILLS = { style: 'seg-style', fill: 'seg-fill', bg: 'seg-bg', motion: 'seg-motion' };
  function setPill(gid, v) { const g = $(gid), b = g && g.querySelector(`[data-value="${v}"]`); if (b) g.querySelectorAll('.seg-pill').forEach((x) => x.classList.toggle('active', x === b)); return !!b; }
  function setCtl(id, v) {
    const el = $(id); if (!el) return false;
    if (el.type === 'checkbox') el.checked = v === true || v === 1 || v === '1';
    else if (el.type === 'color') { if (!HEX.test(v)) return false; el.value = String(v).toLowerCase(); }
    else if (el.type === 'range' || el.type === 'number') { const n = Number(v); if (!Number.isFinite(n)) return false; el.value = Math.min(Number(el.max), Math.max(Number(el.min), Math.round(n))); }
    else if (el.tagName === 'SELECT') { if (![...el.options].some((o) => o.value === v)) return false; el.value = v; }
    return true;
  }
  const applySet = (o) => Object.entries(o).forEach(([k, v]) => (PILLS[k] ? setPill(PILLS[k], v) : setCtl(`opt-${k}`, v)));

  /* ── Share link: every non-default control in #hash (validated on read — the hash is a trust boundary) ── */
  const KEYS = ['points', 'random', 'smooth', 'size', 'rotate', 'seed', 'c1', 'c2', 'angle', 'opacity', 'bg1', 'bg2', 'loop', 'amount', 'ratio', 'layers', 'lstep', 'loffset', 'blur', 'grain', 'shadow', 'outline', 'stroke'];
  function writeHash() {
    const q = new URLSearchParams();
    for (const k of KEYS) { const el = $(`opt-${k}`); if (!el) continue; const v = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value, d = el.type === 'checkbox' ? (el.defaultChecked ? '1' : '0') : el.tagName === 'SELECT' ? ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value : el.defaultValue; if (v !== d) q.set(k, v.replace(/^#/, '')); }
    for (const [k, gid] of Object.entries(PILLS)) { const act = $(gid).querySelector('.seg-pill.active'), def = $(gid).querySelector('[data-default]') || $(gid).querySelector('.seg-pill'); if (act && act !== def) q.set(k, act.dataset.value); }
    const qs = q.toString(); try { history.replaceState(null, '', qs ? `#${qs}` : location.pathname + location.search); } catch (e) { /* sandboxed iframe */ }
  }
  function readHash() {
    if (location.hash.length < 2) return;
    const q = new URLSearchParams(location.hash.slice(1));
    for (const [k, v] of q) { if (PILLS[k]) setPill(PILLS[k], v); else if (KEYS.includes(k)) setCtl(`opt-${k}`, /^(c1|c2|bg1|bg2)$/.test(k) ? `#${v}` : v); }
  }

  /* ── Wire up ── */
  function vis(c) {
    const lin = c.fill === 'linear' || c.bg === 'gradient';
    $('angle-group').hidden = !lin; $('c2-wrap').hidden = c.fill === 'solid' && c.layers === 1;
    $('bg-colors').hidden = c.bg === 'none'; $('bg2-wrap').hidden = c.bg !== 'gradient';
    $('motion-group').hidden = c.motion === 'off'; $('opt-amount').closest('.form-group').hidden = c.motion === 'spin';
    $('opt-stroke').closest('.control-item').hidden = !c.outline;
    $('opt-lstep').closest('.control-item').hidden = $('opt-loffset').closest('.control-item').hidden = c.layers === 1;
  }
  readHash();
  $('btn-random').addEventListener('click', () => { $('opt-seed').value = 1 + Math.floor(Math.random() * 999998); $('opt-seed').dispatchEvent(new Event('input', { bubbles: true })); });
  $('btn-share').addEventListener('click', () => copyText(location.href, 'Share link copied'));
  let pausedAt = 0; // the frame shown while paused
  const noteFor = (c) => (c.motion === 'off' ? 'Blob ready' : play ? 'Animating' : still.matches ? 'Paused — your system asks for reduced motion · press Play preview' : 'Paused');
  $('btn-play').addEventListener('click', () => {
    if (play) pausedAt = C ? (((performance.now() - t0) / 1000) % C.loop) / C.loop : 0; else t0 = performance.now() - pausedAt * (C ? C.loop : 1) * 1000;
    play = !play; preview(); if (C) window.ToolityWebTool.status(noteFor(C), true);
  });
  // Hex fields mirror the pickers so brand colours can be typed or pasted; invalid text is ignored until it parses.
  const syncHex = () => document.querySelectorAll('.blob-hex').forEach((h) => { const pk = $(h.id.replace(/-hex$/, '')); if (document.activeElement !== h) h.value = pk.value; });
  document.querySelectorAll('.blob-hex').forEach((h) => h.addEventListener('input', () => {
    let v = h.value.trim(); if (/^[0-9a-f]{6}$/i.test(v)) v = `#${v}`;
    if (HEX.test(v)) { const pk = $(h.id.replace(/-hex$/, '')); pk.value = v.toLowerCase(); pk.dispatchEvent(new Event('input', { bubbles: true })); }
  }));
  document.querySelectorAll('.blob-colors .web-color-input').forEach((pk) => pk.addEventListener('input', () => { $(`${pk.id}-hex`).value = pk.value; }));

  mount({
    slug: 'blob-maker', idle: 'Shape your blob', filename: () => 'blob', debounce: 60,
    onInput: (el) => { if (el.id === 'opt-preset' && PRESETS[el.value]) applySet(PRESETS[el.value]); else if (el.id !== 'opt-preset' && el.id !== 'opt-code') $('opt-preset').value = ''; },
    onPill: (g) => { $('opt-preset').value = ''; if (g.id === 'seg-motion') { play = true; t0 = performance.now(); } },
    summary: (api) => { const c = cfg(api); return [c.W === c.H ? '1:1' : $('opt-ratio').value, `${c.layers} layer${c.layers > 1 ? 's' : ''}`, [c.blur && 'blur', c.grain && 'grain', c.shadow && 'shadow', c.outline && 'outline'].filter(Boolean).join(' + ') || 'no effects'].join(' · '); },
    run(api) {
      const c = cfg(api); C = c; vis(c); syncHex(); preview(); writeHash();
      const anim = svg(c, true), text = c.code === 'css' ? css(c) : anim;
      $('output-code').textContent = text;
      $('blob-size').textContent = `SVG ${(new Blob([anim]).size / 1024).toFixed(1)} KB`;
      return { text, blob: new Blob([anim], { type: 'image/svg+xml' }), ext: c.code === 'css' ? 'css' : 'svg', copyMsg: c.code === 'css' ? 'CSS copied' : 'SVG copied', badge: `${c.W} × ${c.H} · ${c.motion === 'off' ? 'still' : `${c.motion} · ${c.loop} s loop`}`, note: noteFor(c), ok: true };
    },
    async download(fmt, api) {
      const c = cfg(api), moving = c.motion !== 'off';
      if ((fmt === 'gif' || fmt === 'webm' || fmt === 'mp4' || fmt === 'svg-anim') && !moving) { api.showError('Pick a movement first (Morph, Float, Spin or Pulse) — a still blob exports best as SVG or PNG.'); return null; }
      api.showError('');
      if (fmt === 'svg') return { text: svg(c, false), mime: 'image/svg+xml', name: 'blob.svg' };
      if (fmt === 'svg-anim') return { text: svg(c, true), mime: 'image/svg+xml', name: 'blob-animated.svg' };
      if (fmt === 'css') return { text: css(c), mime: 'text/css', name: 'blob.css' };
      setBusy(api.card, true);
      try {
        if (fmt === 'gif') { const b = await gif(c, api); api.status('GIF ready', true); return { blob: b, name: 'blob.gif' }; }
        if (fmt === 'webm' || fmt === 'mp4') { const b = await video(c, api, fmt); api.status(c.bg === 'none' ? 'Video ready · videos have no transparency, so it is on white' : 'Video ready', true); return { blob: b, name: `blob.${b.type.includes('mp4') ? 'mp4' : 'webm'}` }; }
        const [scale, type, ext] = { png: [1, 'image/png', 'png'], 'png-2x': [2, 'image/png', 'png'], 'png-4x': [4, 'image/png', 'png'], webp: [1, 'image/webp', 'webp'], jpg: [1, 'image/jpeg', 'jpg'] }[fmt];
        return { blob: await raster(c, scale, type), name: `blob${scale > 1 ? `@${scale}x` : ''}.${ext}` };
      } catch (e) { console.warn(e); api.showError(e.message || 'Export failed — try another format.'); api.status('Export failed'); return null; }
      finally { setBusy(api.card, false); }
    },
    onReset: () => { t0 = performance.now(); pausedAt = 0; play = !still.matches; }
  });
  window.__blob = { cfg, shape, layersAt, pathD, svg, css, draw, raster, gif, video, PRESETS, readHash, writeHash };
})();
