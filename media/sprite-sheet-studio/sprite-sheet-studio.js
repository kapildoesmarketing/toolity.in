/* Designed by Kapil Pidhwani: Sprite Sheet Studio on the GIF runtime. Direction is detected from the file: >1 decoded frames =
 * animation → sheet; one frame = sheet → animation. Sheet → animation: auto grid (empty gutter runs, validated against a
 * uniform grid, merging internal gaps; square-cell fallback), click-to-skip cells, nearest-neighbour scale, ping-pong, live
 * RAF preview, encode as GIF (gifenc), APNG (own ~40-line encoder on CompressionStream) or PNG ZIP (JSZip). Animation → sheet:
 * pack frames, emit PNG + metadata.json + sprite.css (steps keyframes honouring per-frame delays).
 * Ceilings: uniform grids only (no packed atlases); APNG uses filter 0 (bigger files than optipng, still lossless); 8,192 px flag. */
(function () {
  'use strict';
  const G = window.ToolityGif, { formatBytes, copyText, copyBlob, downloadBlob, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const val = (id) => { const el = $(id); return el.type === 'checkbox' ? el.checked : el.value; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v | 0));

  /* ── APNG encoder ── */
  const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
  const crc = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const o = new Uint8Array(12 + data.length), dv = new DataView(o.buffer); dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) o[4 + i] = type.charCodeAt(i); o.set(data, 8); dv.setUint32(8 + data.length, crc(o.subarray(4, 8 + data.length))); return o; };
  const be = (vals, widths) => { const n = widths.reduce((s, w) => s + w, 0), o = new Uint8Array(n), dv = new DataView(o.buffer); let p = 0; vals.forEach((v, i) => { if (widths[i] === 4) dv.setUint32(p, v); else if (widths[i] === 2) dv.setUint16(p, v); else o[p] = v; p += widths[i]; }); return o; };
  const deflate = async (bytes) => { const cs = new CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); };
  async function encodeApng(frames, plays, onProgress) {
    if (!window.CompressionStream) throw new Error('APNG needs a browser with CompressionStream (Chrome 80+, Safari 16.4+, Firefox 113+) — choose GIF instead.');
    const w = frames[0].c.width, h = frames[0].c.height, parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
    parts.push(chunk('IHDR', be([w, h, 8, 6, 0, 0, 0], [4, 4, 1, 1, 1, 1, 1])), chunk('acTL', be([frames.length, plays], [4, 4])));
    let seq = 0; const stride = w * 4 + 1;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i], px = (f.c.width === w && f.c.height === h ? f.c : G.clone(f.c, w, h)).getContext('2d').getImageData(0, 0, w, h).data, raw = new Uint8Array(stride * h);
      for (let y = 0; y < h; y++) raw.set(px.subarray(y * w * 4, (y + 1) * w * 4), y * stride + 1); // filter byte 0 per scanline
      const z = await deflate(raw);
      parts.push(chunk('fcTL', be([seq++, w, h, 0, 0, Math.round(f.ms), 1000, 1, 0], [4, 4, 4, 4, 4, 2, 2, 1, 1]))); // dispose=background, blend=source
      if (i === 0) parts.push(chunk('IDAT', z)); else { const fd = new Uint8Array(4 + z.length); new DataView(fd.buffer).setUint32(0, seq++); fd.set(z, 4); parts.push(chunk('fdAT', fd)); }
      if (onProgress) onProgress((i + 1) / frames.length);
    }
    parts.push(chunk('IEND', new Uint8Array(0)));
    return new Blob(parts, { type: 'image/png' });
  }

  /* ── decode anything: GIF via gif-common, APNG/WebP via ImageDecoder, else a static image ── */
  async function decodeAny(file) {
    const buf = await file.arrayBuffer();
    if (file.type === 'image/gif') { const frames = await G.decode(buf); if (frames.length) return frames; }
    if (window.ImageDecoder && file.type && file.type !== 'image/gif') {
      try {
        if (await ImageDecoder.isTypeSupported(file.type)) {
          const dec = new ImageDecoder({ data: buf, type: file.type }); await dec.tracks.ready; const track = dec.tracks.selectedTrack;
          if (track && track.animated && track.frameCount > 1) { const frames = []; for (let i = 0; i < track.frameCount; i++) { const { image } = await dec.decode({ frameIndex: i }); const c = G.mk(image.displayWidth, image.displayHeight); c.getContext('2d').drawImage(image, 0, 0); frames.push({ c, ms: Math.max(20, (image.duration || 100000) / 1000) }); image.close(); } dec.close(); return frames; }
          dec.close();
        }
      } catch (e) { console.warn('ImageDecoder', e); }
    }
    const img = await G.loadImage(file), c = G.mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(img.src);
    return [{ c, ms: 100 }];
  }

  /* ── sheet analysis ── */
  const st = { mode: null, sheet: null, data: null, hasAlpha: false, bg: null, skipped: new Set(), emptyKey: '', empty: [], frames: [], raf: 0, out: null };
  function analyse(c) {
    const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data; let alpha = false;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 16) { alpha = true; break; }
    st.data = d; st.hasAlpha = alpha; st.bg = alpha ? null : [d[0], d[1], d[2]];
  }
  const isEmptyPx = (i) => (st.hasAlpha ? st.data[i + 3] < 16 : Math.abs(st.data[i] - st.bg[0]) + Math.abs(st.data[i + 1] - st.bg[1]) + Math.abs(st.data[i + 2] - st.bg[2]) < 24);
  function detectGrid() {
    const W = st.sheet.width, H = st.sheet.height, colE = new Uint8Array(W).fill(1), rowE = new Uint8Array(H).fill(1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isEmptyPx((y * W + x) * 4)) { colE[x] = 0; rowE[y] = 0; }
    const runs = (arr) => { const r = []; let s = -1; for (let i = 0; i <= arr.length; i++) { const e = i === arr.length || arr[i]; if (!e && s < 0) s = i; if (e && s >= 0) { r.push([s, i - 1]); s = -1; } } return r; };
    const fit = (rs, len) => { // runs → uniform cell count; merge the smallest gaps until each run centre maps to a distinct cell
      let r = rs.slice();
      while (r.length > 1) { const n = r.length, cell = len / n, seen = new Set(); let ok = true; for (const [a, b] of r) { const k = Math.floor((a + b) / 2 / cell); if (seen.has(k)) { ok = false; break; } seen.add(k); } if (ok) return n; let gi = 0, gap = Infinity; for (let i = 1; i < r.length; i++) { const g = r[i][0] - r[i - 1][1]; if (g < gap) { gap = g; gi = i; } } r.splice(gi - 1, 2, [r[gi - 1][0], r[gi][1]]); }
      return r.length;
    };
    const cr = runs(colE), rr = runs(rowE);
    let cols = cr.length ? fit(cr, W) : 1, rows = rr.length ? fit(rr, H) : 1;
    if (cols === 1 && rows === 1) { // no gutters: square cells
      if (W % H === 0 && W > H) cols = W / H; else if (H % W === 0 && H > W) rows = H / W; else { const s = [256, 128, 96, 64, 48, 32, 24, 16, 8].find((k) => W % k === 0 && H % k === 0 && W / k <= 64 && H / k <= 64); if (s) { cols = W / s; rows = H / s; } }
    }
    return { cols: clamp(cols, 1, 64), rows: clamp(rows, 1, 64) };
  }
  function cells() {
    const W = st.sheet.width, H = st.sheet.height, cols = clamp(+val('grid-cols') || 1, 1, 64), rows = clamp(+val('grid-rows') || 1, 1, 64), m = clamp(+val('opt-margin') || 0, 0, 512), sp = clamp(+val('opt-spacing') || 0, 0, 512);
    const cw = Math.floor((W - 2 * m - (cols - 1) * sp) / cols), ch = Math.floor((H - 2 * m - (rows - 1) * sp) / rows);
    if (cw < 1 || ch < 1) return null;
    const list = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) list.push({ i: r * cols + c, col: c, row: r, x: m + c * (cw + sp), y: m + r * (ch + sp), w: cw, h: ch });
    const key = `${cols}|${rows}|${m}|${sp}`;
    if (st.emptyKey !== key) { st.emptyKey = key; st.skipped.clear(); st.empty = list.map((cell) => { for (let y = cell.y; y < cell.y + cell.h; y++) for (let x = cell.x; x < cell.x + cell.w; x++) if (!isEmptyPx((y * W + x) * 4)) return false; return true; }); }
    return { list, cw, ch, cols, rows };
  }
  function buildFrames() {
    const g = cells(); if (!g) return [];
    const scale = +val('opt-scale') || 1, ms = Math.round(1000 / (clamp(+val('opt-fps') || 12, 1, 60))), order = val('opt-order'), skipEmpty = val('opt-skip-empty');
    let seq = g.list.slice(); if (order === 'col') seq.sort((a, b) => a.col - b.col || a.row - b.row); if (order === 'row-rev') seq.reverse();
    seq = seq.filter((c) => !st.skipped.has(c.i) && !(skipEmpty && st.empty[c.i]));
    let frames = seq.map((c) => { const k = G.mk(Math.max(1, Math.round(c.w * scale)), Math.max(1, Math.round(c.h * scale))), x = k.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(st.sheet, c.x, c.y, c.w, c.h, 0, 0, k.width, k.height); return { c: k, ms, i: c.i }; });
    if (val('opt-pingpong') && frames.length > 2) frames = frames.concat(frames.slice(1, -1).reverse().map((f) => ({ c: f.c, ms: f.ms, i: f.i })));
    return frames;
  }
  function drawStage() {
    const stage = $('stage'), W = st.sheet.width, H = st.sheet.height, k = Math.min(1, 1200 / Math.max(W, H)); stage.width = Math.round(W * k); stage.height = Math.round(H * k);
    const x = stage.getContext('2d'); x.imageSmoothingEnabled = k === 1; x.clearRect(0, 0, stage.width, stage.height); x.drawImage(st.sheet, 0, 0, stage.width, stage.height);
    const g = cells(); $('ss-cell-info').textContent = g ? `${g.cw} × ${g.ch} px cells` : 'grid too dense'; if (!g) return;
    const skipEmpty = val('opt-skip-empty'); x.lineWidth = 1; x.font = `${Math.max(9, Math.min(14, g.cw * k / 4))}px ${getComputedStyle(document.body).fontFamily}`; x.textBaseline = 'top';
    for (const c of g.list) {
      const px = c.x * k, py = c.y * k, pw = c.w * k, ph = c.h * k, off = st.skipped.has(c.i) || (skipEmpty && st.empty[c.i]);
      x.strokeStyle = off ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.9)'; x.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      if (off) { x.fillStyle = 'rgba(239,68,68,0.25)'; x.fillRect(px, py, pw, ph); }
      if (pw > 18) { x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(px + 1, py + 1, Math.min(pw - 2, 7 + String(c.i + 1).length * 7), 14); x.fillStyle = '#fff'; x.fillText(String(c.i + 1), px + 3, py + 2); }
    }
  }
  $('stage').addEventListener('click', (e) => {
    if (st.mode !== 'anim' || !st.sheet) return; const g = cells(); if (!g) return;
    const r = $('stage').getBoundingClientRect(), stage = $('stage'), sx = (e.clientX - r.left) * (stage.width / r.width) * (st.sheet.width / stage.width), sy = (e.clientY - r.top) * (stage.height / r.height) * (st.sheet.height / stage.height);
    const c = g.list.find((q) => sx >= q.x && sx < q.x + q.w && sy >= q.y && sy < q.y + q.h); if (!c) return;
    if (st.skipped.has(c.i)) st.skipped.delete(c.i); else st.skipped.add(c.i);
    refresh();
  });

  /* ── live preview ── */
  function stopPreview() { cancelAnimationFrame(st.raf); st.raf = 0; $('preview').classList.remove('is-shown'); }
  function startPreview(frames) {
    stopPreview(); const p = $('preview'); if (!frames.length) return;
    p.width = frames[0].c.width; p.height = frames[0].c.height; p.classList.add('is-shown'); $('output-empty').hidden = true;
    const x = p.getContext('2d'); let i = 0, last = performance.now(), acc = 0;
    const tick = (t) => { acc += t - last; last = t; while (acc >= frames[i].ms) { acc -= frames[i].ms; i = (i + 1) % frames.length; } x.clearRect(0, 0, p.width, p.height); x.drawImage(frames[i].c, 0, 0); st.raf = requestAnimationFrame(tick); };
    x.drawImage(frames[0].c, 0, 0); st.raf = requestAnimationFrame(tick);
  }

  /* ── animation → sheet ── */
  function selectedFrames(S) { const every = clamp(+val('opt-every') || 1, 1, 4); return S.frames.slice(R.from, R.to + 1).filter((_, i) => i % every === 0); }
  function packSheet(frames) {
    const scale = +val('opt-scale') || 1, n = frames.length, fw = Math.max(1, Math.round(frames[0].c.width * scale)), fh = Math.max(1, Math.round(frames[0].c.height * scale));
    const layout = val('opt-layout'), cols = layout === 'row' ? n : layout === 'col' ? 1 : layout === 'cols' ? clamp(+val('opt-cols') || 8, 1, n) : Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const pad = clamp(+val('opt-pad') || 0, 0, 512), sp = clamp(+val('opt-sp') || 0, 0, 512), W = pad * 2 + cols * fw + (cols - 1) * sp, H = pad * 2 + rows * fh + (rows - 1) * sp;
    const c = G.mk(W, H), x = c.getContext('2d'); if (val('opt-bg') !== 'transparent') { x.fillStyle = val('opt-bg'); x.fillRect(0, 0, W, H); } x.imageSmoothingEnabled = scale < 1;
    const rects = frames.map((f, i) => { const px = pad + (i % cols) * (fw + sp), py = pad + Math.floor(i / cols) * (fh + sp); x.drawImage(f.c, 0, 0, f.c.width, f.c.height, px, py, fw, fh); return { index: i, x: px, y: py, w: fw, h: fh, ms: Math.round(f.ms) }; });
    return { c, rects, cols, rows, fw, fh, W, H, pad, sp };
  }
  const metaOf = (p, name) => ({ image: `${name}.png`, size: { w: p.W, h: p.H }, frameSize: { w: p.fw, h: p.fh }, columns: p.cols, rows: p.rows, padding: p.pad, spacing: p.sp, frameCount: p.rects.length, totalMs: p.rects.reduce((s, r) => s + r.ms, 0), loop: 'infinite', frames: p.rects });
  function cssOf(p, name) {
    const total = p.rects.reduce((s, r) => s + r.ms, 0) || 1; let pct = 0; const safe = name.replace(/[^a-z0-9_-]/gi, '-') || 'sprite';
    const keys = p.rects.map((r) => { const l = `  ${pct.toFixed(2)}% { background-position: -${r.x}px -${r.y}px; }`; pct += (r.ms / total) * 100; return l; });
    const last = p.rects[p.rects.length - 1]; keys.push(`  100% { background-position: -${last.x}px -${last.y}px; }`);
    return `/* ${safe}: ${p.rects.length} frames, ${total} ms per loop — generated by toolity.in/media/sprite-sheet-studio/ */\n.${safe} {\n  width: ${p.fw}px;\n  height: ${p.fh}px;\n  background: url("${name}.png") no-repeat 0 0;\n  image-rendering: pixelated;\n  animation: ${safe}-play ${total}ms step-end infinite;\n}\n@keyframes ${safe}-play {\n${keys.join('\n')}\n}\n`;
  }

  /* ── page wiring ── */
  const setMode = (mode) => {
    st.mode = mode; document.querySelectorAll('.ss-mode').forEach((el) => { el.hidden = el.dataset.mode !== mode; });
    $('ss-grid-row').hidden = mode !== 'anim'; $('ss-tip').hidden = mode !== 'anim'; $('rng-wrap').hidden = mode !== 'sheet';
    $('stage').classList.toggle('is-shown', mode === 'anim'); $('scrub-canvas').classList.toggle('is-shown', mode === 'sheet');
    $('btn-compress-label').textContent = mode === 'sheet' ? 'Build sprite sheet' : mode === 'anim' ? 'Build animation' : 'Build';
  };
  const R = G.bindFrameRange(() => T.S.frames, () => { if (st.mode === 'sheet') refresh(); });
  function refresh() {
    if (!st.mode) return;
    $('ss-extras').hidden = true;
    if (st.mode === 'anim') { drawStage(); st.frames = buildFrames(); startPreview(st.frames); $('result-badge').textContent = st.frames.length ? `${st.frames.length} frames · ${(st.frames.reduce((s, f) => s + f.ms, 0) / 1000).toFixed(1)} s` : 'No cells selected'; }
    else { const sel = selectedFrames(T.S); startPreview(sel); const p = sel.length ? packSheet(sel) : null; $('result-badge').textContent = p ? `${p.cols} × ${p.rows} · ${p.W} × ${p.H} px${Math.max(p.W, p.H) > 8192 ? ' · over 8192 px!' : ''}` : 'No frames'; }
    $('btn-compress').disabled = T.S.busy || (st.mode === 'anim' ? !st.frames.length : !selectedFrames(T.S).length);
    T.sync();
  }
  async function onFiles(files, S) {
    const file = files[0]; if (!file) return; T.showError(''); $('source-badge').textContent = 'Decoding…';
    try {
      const frames = await decodeAny(file); if (!frames.length) throw new Error('empty');
      Object.assign(S, { file, frames, w: frames[0].c.width, h: frames[0].c.height, ms: frames.reduce((s, f) => s + f.ms, 0) });
      $('dropzone').hidden = true; st.skipped.clear(); st.emptyKey = '';
      if (frames.length > 1) { setMode('sheet'); R.reset(frames.length); $('source-badge').textContent = `${S.w} × ${S.h} · ${frames.length} frames · ${(S.ms / 1000).toFixed(1)} s · ${formatBytes(file.size)}`; }
      else { st.sheet = frames[0].c; analyse(st.sheet); setMode('anim'); const g = detectGrid(); $('grid-cols').value = g.cols; $('grid-rows').value = g.rows; $('source-badge').textContent = `${S.w} × ${S.h} sheet · ${formatBytes(file.size)}`; }
      refresh();
    } catch (e) { console.warn(e); T.showError("Couldn't decode that file — use a PNG, JPG, WebP, GIF or APNG."); $('source-badge').textContent = 'No file loaded'; }
  }
  const T = G.mount({
    actionLabel: 'Build', verb: 'Encoding', suffix: 'sprite', multiple: true, accept: 'image/', onFiles,
    outExt: () => (st.out ? st.out.ext : 'gif'),
    summary: () => (st.mode === 'sheet' ? `${{ square: 'Near-square', cols: `${val('opt-cols')} columns`, row: 'Single row', col: 'Single column' }[val('opt-layout')]} · ${val('opt-scale')}× · ${val('opt-bg') === 'transparent' ? 'transparent' : val('opt-bg')}` : `${val('opt-out').toUpperCase()} · ${val('opt-fps')} fps · ${val('opt-scale')}×${val('opt-pingpong') ? ' · ping-pong' : ''} · ${{ 0: 'loop', 1: 'once', 3: '3×' }[val('opt-loop')]}`),
    onSetting: () => { const b = $('opt-fps-val'); if (b) b.textContent = `${val('opt-fps')} fps`; refresh(); },
    validate: () => (!st.mode ? 'Drop a sprite sheet or an animation first.' : st.mode === 'anim' && !st.frames.length ? 'No cells selected — un-skip a cell or change the grid.' : ''),
    async run(S, api) {
      const name = G.stem(S.file.name);
      if (st.mode === 'anim') {
        const frames = st.frames, out = val('opt-out'), loop = +val('opt-loop');
        if (out === 'gif') { const blob = await G.encode(frames, { repeat: loop === 0 ? 0 : loop === 1 ? -1 : loop - 1, onProgress: api.onProgress }); return { blob, w: frames[0].c.width, h: frames[0].c.height, n: frames.length, ext: 'gif', kind: 'anim' }; }
        if (out === 'apng') { const blob = await encodeApng(frames, loop, api.onProgress); return { blob, w: frames[0].c.width, h: frames[0].c.height, n: frames.length, ext: 'png', kind: 'anim' }; }
        if (!window.JSZip) throw new Error('ZIP library is still loading — try again in a second.');
        const zip = new JSZip(); for (let i = 0; i < frames.length; i++) { zip.file(`${name}-${String(i + 1).padStart(3, '0')}.png`, await new Promise((r) => frames[i].c.toBlob(r, 'image/png'))); api.onProgress((i + 1) / frames.length); }
        zip.file('frames.json', JSON.stringify({ frameSize: { w: frames[0].c.width, h: frames[0].c.height }, frames: frames.map((f, i) => ({ index: i, file: `${name}-${String(i + 1).padStart(3, '0')}.png`, ms: f.ms })) }, null, 2));
        return { blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }), w: frames[0].c.width, h: frames[0].c.height, n: frames.length, ext: 'zip', kind: 'zip' };
      }
      const sel = selectedFrames(S), p = packSheet(sel); api.onProgress(0.6);
      const blob = await new Promise((r) => p.c.toBlob(r, 'image/png'));
      return { blob, w: p.W, h: p.H, n: sel.length, ext: 'png', kind: 'sheet', meta: metaOf(p, `${name}-sprite`), css: cssOf(p, `${name}-sprite`) };
    },
    present(r, S, setOutput) {
      st.out = r; T.suffix = r.kind === 'sheet' ? 'sprite' : 'animation';
      setOutput(r.blob, r.w, r.h, r.kind === 'sheet' ? `${r.meta.columns} × ${r.meta.rows} · ${r.w} × ${r.h} px · ${formatBytes(r.blob.size)}` : `${r.n} frames · ${r.w} × ${r.h} · ${r.ext.toUpperCase()} · ${formatBytes(r.blob.size)}`);
      if (r.kind === 'zip') { $('output-img').classList.remove('is-shown'); return; } // keep the live preview playing
      stopPreview(); T.outImg.src = S.outUrl; T.outImg.classList.add('is-shown'); $('ss-extras').hidden = r.kind !== 'sheet';
    },
    copy: (S) => { if (st.out && st.out.kind === 'sheet') return copyText(JSON.stringify(st.out.meta, null, 2), 'metadata.json copied'); const f = st.mode === 'anim' ? st.frames[0] : S.frames[0]; if (f) f.c.toBlob((b) => copyBlob(b, 'First frame copied (PNG)'), 'image/png'); },
    onReset: () => { stopPreview(); Object.assign(st, { mode: null, sheet: null, data: null, frames: [], out: null, emptyKey: '' }); st.skipped.clear(); setMode(null); $('stage').classList.remove('is-shown'); $('scrub-canvas').classList.remove('is-shown'); $('ss-extras').hidden = true; $('grid-cols').value = 1; $('grid-rows').value = 1; $('ss-cell-info').textContent = ''; R.reset(0); }
  });
  setMode(null);
  ['grid-cols', 'grid-rows'].forEach((id) => $(id).addEventListener('input', () => refresh()));
  $('btn-auto-grid').addEventListener('click', () => { if (!st.sheet) return; const g = detectGrid(); $('grid-cols').value = g.cols; $('grid-rows').value = g.rows; st.emptyKey = ''; refresh(); toast(`Detected ${g.cols} × ${g.rows}`); });
  $('ss-extras').addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (!b || !st.out || st.out.kind !== 'sheet') return; const name = `${G.stem(T.S.file.name)}-sprite`; if (b.dataset.x === 'json') downloadBlob(new Blob([JSON.stringify(st.out.meta, null, 2)], { type: 'application/json' }), `${name}.json`); else downloadBlob(new Blob([st.out.css], { type: 'text/css' }), `${name}.css`); });
  window.ToolitySprite = { T, st, detectGrid, buildFrames, packSheet, encodeApng, decodeAny, onFiles, R }; // for the page test
})();
