/* Sign PDF — Toolity.in. Draw / type / upload a signature, place it on pages (drag), optional date, embed as image. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  // marks: { page (1-based), fx, fy, fw, fh — fractions of the *visual* page (top-left origin), png (Uint8Array), url, el, ratio (h/w) }
  const S = { file: null, bytes: null, doc: null, pages: 0, page: 1, vw: 1, vh: 1, marks: [], sel: null, mode: 'draw', upload: null, out: null };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Apply Signatures'; };

  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting apply';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const n = S.marks.length, all = $('opt-scope').value === 'all';
    $('result-badge').textContent = !S.pages ? 'Drop a PDF to begin' : !n ? 'Create a signature below, then Add to page' : `${n} signature${n === 1 ? '' : 's'} placed${all ? ' · every page' : ''} · press Apply`;
    $('btn-compress').disabled = !(S.pages && n); $('btn-remove').disabled = !S.sel;
    $('settings-summary').textContent = `${all ? 'Every page' : 'This page'} · ${$('opt-width').value}% wide · ${$('opt-date').checked ? 'dated' : 'no date'}`;
  }

  /* ── Viewer ── */
  async function showPage(n) {
    S.page = Math.min(Math.max(1, n), S.pages);
    const { vp } = await P.render(S.doc, S.page, 1.2, $('page-canvas')); S.vw = vp.width; S.vh = vp.height;
    $('pager-text').textContent = `Page ${S.page} / ${S.pages}`; $('btn-prev').disabled = S.page === 1; $('btn-next').disabled = S.page === S.pages;
    S.marks.forEach((m) => { m.el.hidden = m.page !== S.page; });
  }
  $('btn-prev').addEventListener('click', () => showPage(S.page - 1));
  $('btn-next').addEventListener('click', () => showPage(S.page + 1));

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      if (S.doc) S.doc.destroy();
      S.marks.forEach((m) => { m.el.remove(); URL.revokeObjectURL(m.url); });
      Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages, marks: [], sel: null, out: null });
      $('dropzone').hidden = true; $('viewer').hidden = false; $('pager').hidden = false; $('maker').hidden = false;
      await showPage(1);
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  /* ── Signature maker ── */
  const pad = $('pad'), pctx = pad.getContext('2d'); let drawing = false, padDirty = false;
  pctx.lineWidth = 4; pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.strokeStyle = '#111';
  const padPt = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * pad.width, ((e.clientY - r.top) / r.height) * pad.height]; };
  pad.addEventListener('pointerdown', (e) => { drawing = true; padDirty = true; try { pad.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ } pctx.beginPath(); pctx.moveTo(...padPt(e)); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { if (drawing) { pctx.lineTo(...padPt(e)); pctx.stroke(); } });
  ['pointerup', 'pointercancel'].forEach((ev) => pad.addEventListener(ev, () => { drawing = false; }));
  const clearPad = () => { pctx.clearRect(0, 0, pad.width, pad.height); padDirty = false; };
  $('btn-pad-clear').addEventListener('click', clearPad);

  bindSegmented($('seg-sig'), (v) => { S.mode = v; ['draw', 'type', 'upload'].forEach((k) => { $(`mk-${k}`).hidden = k !== v; }); });
  $('sig-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) { showError('Use a PNG or JPG image.'); e.target.value = ''; return; }
    S.upload = await createImageBitmap(f); showError('');
  });

  /** Crop a canvas to its non-transparent bounding box (with padding); returns a canvas or null if empty. */
  function trim(src) {
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const pad = 8, c = document.createElement('canvas'); c.width = x1 - x0 + 1 + pad * 2; c.height = y1 - y0 + 1 + pad * 2;
    c.getContext('2d').drawImage(src, x0 - pad, y0 - pad, c.width, c.height, 0, 0, c.width, c.height); return c;
  }
  /** Build the signature as a trimmed canvas from the active maker mode. */
  function makeSignature() {
    if (S.mode === 'draw') { if (!padDirty) throw new Error('Draw your signature on the pad first.'); return trim(pad); }
    if (S.mode === 'type') {
      const text = $('sig-text').value.trim(); if (!text) throw new Error('Type your name first.');
      const c = document.createElement('canvas'), ctx = c.getContext('2d'); ctx.font = $('sig-font').value;
      c.width = Math.ceil(ctx.measureText(text).width) + 40; c.height = 120; ctx.font = $('sig-font').value; ctx.fillStyle = '#111'; ctx.textBaseline = 'middle'; ctx.fillText(text, 20, 60);
      return trim(c);
    }
    if (!S.upload) throw new Error('Choose a signature image first.');
    const c = document.createElement('canvas'); c.width = S.upload.width; c.height = S.upload.height; c.getContext('2d').drawImage(S.upload, 0, 0); return c;
  }

  /* ── Placement ── */
  function select(m) { S.sel = m; S.marks.forEach((k) => k.el.classList.toggle('is-active', k === m)); if (m) $('opt-width').value = Math.round(m.fw * 100); $('opt-width-val').textContent = `${$('opt-width').value}%`; invalidate(); }
  function place(m) { Object.assign(m.el.style, { left: `${m.fx * 100}%`, top: `${m.fy * 100}%`, width: `${m.fw * 100}%` }); }
  function setWidth(m, fw) { m.fw = Math.min(0.95, Math.max(0.05, fw)); m.fh = m.fw * m.ratio * (S.vw / S.vh); m.fx = Math.min(m.fx, 1 - m.fw); m.fy = Math.min(m.fy, 1 - m.fh); place(m); }
  async function addMark() {
    try {
      const c = makeSignature(); if (!c) throw new Error('The pad looks empty — draw something first.');
      const blob = await new Promise((r) => c.toBlob(r, 'image/png')), png = new Uint8Array(await blob.arrayBuffer());
      const el = document.createElement('img'); el.className = 'spd-sig'; el.src = URL.createObjectURL(blob); el.alt = 'Signature'; el.draggable = false; el.tabIndex = 0;
      const m = { page: S.page, fx: 0.35, fy: 0.6, fw: 0.3, fh: 0, png, url: el.src, el, ratio: c.height / c.width };
      setWidth(m, Number($('opt-width').value) / 100); $('sig-layer').append(el); S.marks.push(m); select(m); showError('');
      // drag with pointer events; coordinates are fractions of the canvas box so CSS scaling never matters
      let start = null;
      el.addEventListener('pointerdown', (e) => { select(m); start = { x: e.clientX, y: e.clientY, fx: m.fx, fy: m.fy }; try { el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ } e.preventDefault(); });
      el.addEventListener('pointermove', (e) => {
        if (!start) return; const r = $('page-canvas').getBoundingClientRect();
        m.fx = Math.min(1 - m.fw, Math.max(0, start.fx + (e.clientX - start.x) / r.width)); m.fy = Math.min(1 - m.fh, Math.max(0, start.fy + (e.clientY - start.y) / r.height)); place(m); S.out = null; invalidate();
      });
      ['pointerup', 'pointercancel'].forEach((ev) => el.addEventListener(ev, () => { start = null; }));
      el.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeMark(m); } });
      if (S.mode === 'draw') clearPad();
    } catch (e) { showError(e.message); }
  }
  function removeMark(m) { if (!m) return; m.el.remove(); URL.revokeObjectURL(m.url); S.marks = S.marks.filter((k) => k !== m); select(null); }
  $('btn-add').addEventListener('click', addMark);
  $('btn-remove').addEventListener('click', () => removeMark(S.sel));
  $('sig-layer').addEventListener('pointerdown', (e) => { if (e.target === e.currentTarget) select(null); });
  $('opt-width').addEventListener('input', (e) => { $('opt-width-val').textContent = `${e.target.value}%`; if (S.sel) setWidth(S.sel, Number(e.target.value) / 100); invalidate(); });
  $('opt-scope').addEventListener('change', invalidate); $('opt-date').addEventListener('change', invalidate);

  /* ── Apply ── */
  async function apply() {
    const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib, doc = await P.loadLib(S.bytes), all = $('opt-scope').value === 'all';
    const font = $('opt-date').checked ? await doc.embedFont(StandardFonts.Helvetica) : null, today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const imgs = new Map(); let first = Infinity;
    for (const m of S.marks) {
      if (!imgs.has(m.png)) imgs.set(m.png, await doc.embedPng(m.png));
      const img = imgs.get(m.png), targets = all ? doc.getPageIndices() : [m.page - 1];
      for (const pi of targets) {
        const page = doc.getPage(pi), { width: W, height: H } = page.getSize(), rot = page.getRotation().angle % 360; first = Math.min(first, pi);
        // Designed by Kapil Pidhwani: fractions are in *visual* space (what PDF.js rendered). Map them through the page's /Rotate:
        // visual origin + right/down unit vectors in PDF space, then draw the image rotated with the page so it reads upright.
        const [VW, VH] = rot % 180 ? [H, W] : [W, H];
        const o = { 0: [0, H], 90: [0, 0], 180: [W, 0], 270: [W, H] }[rot], rt = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[rot], dn = { 0: [0, -1], 90: [1, 0], 180: [0, 1], 270: [-1, 0] }[rot];
        const vx = m.fx * VW, vy = m.fy * VH, vw = m.fw * VW, vh = m.fh * VH;
        const at = (dx, dy) => ({ x: o[0] + rt[0] * dx + dn[0] * dy, y: o[1] + rt[1] * dx + dn[1] * dy });
        page.drawImage(img, { ...at(vx, vy + vh), width: vw, height: vh, rotate: degrees(rot) });
        if (font) page.drawText(today, { ...at(vx, vy + vh + 11), size: 9, font, color: rgb(0.25, 0.25, 0.25), rotate: degrees(rot) });
      }
    }
    return { blob: new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' }), first: first + 1 };
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Signing…'); showError('');
    try {
      await P.lib(); const r = await apply(); S.out = r.blob; progress(0.8, 'Rendering…');
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas'), undefined, r.first); $('output-empty').hidden = true;
      $('output-badge').textContent = `${S.pages} page${S.pages === 1 ? '' : 's'} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Signed · ${S.marks.length} signature${S.marks.length === 1 ? '' : 's'} · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message || 'Signing failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !S.marks.length; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'signed')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: signed on page${S.marks.length === 1 ? '' : 's'} ${[...new Set(S.marks.map((m) => m.page))].join(', ')}`, 'Summary copied'));
  function reset() {
    if (S.doc) S.doc.destroy(); S.marks.forEach((m) => { m.el.remove(); URL.revokeObjectURL(m.url); });
    Object.assign(S, { file: null, bytes: null, doc: null, pages: 0, page: 1, marks: [], sel: null, upload: null, out: null });
    ['viewer', 'pager', 'maker'].forEach((id) => { $(id).hidden = true; }); $('dropzone').hidden = false; clearPad(); $('sig-text').value = ''; $('sig-file').value = '';
    const c = $('output-canvas'); c.hidden = true; c.width = c.width; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__spd = { S, load, run, addMark, removeMark, apply, showPage };
})();
