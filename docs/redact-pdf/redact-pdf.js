/* Redact PDF — Toolity.in. Drag boxes over content; marked pages are re-rendered as images with the boxes burned in (true redaction). All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  // marks: { page (1-based), fx, fy, fw, fh — fractions of the rendered (visual) page, el }
  const S = { file: null, bytes: null, doc: null, pages: 0, page: 1, marks: [], sel: null, fill: '#000000', out: null };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Apply Redactions'; };
  const markedPages = () => new Set(S.marks.map((m) => m.page));

  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting apply';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const n = S.marks.length, pg = markedPages().size;
    $('result-badge').textContent = !S.pages ? 'Drop a PDF to begin' : !n ? 'Drag over the page to draw a redaction box' : `${n} box${n === 1 ? '' : 'es'} on ${pg} page${pg === 1 ? '' : 's'} · press Apply`;
    $('btn-compress').disabled = !(S.pages && n); $('btn-remove').disabled = !S.sel;
    const here = S.marks.filter((m) => m.page === S.page).length; $('mark-count').textContent = here ? `${here} box${here === 1 ? '' : 'es'} here` : '';
    $('settings-summary').textContent = `${S.fill === '#000000' ? 'Black' : 'White'} boxes · ${$('opt-dpi').value} DPI`;
  }

  /* ── Viewer ── */
  // Designed by Kapil Pidhwani: renders are queued so a double-click on ‹ › never races PDF.js on the same canvas.
  let queue = Promise.resolve();
  const showPage = (n) => (queue = queue.then(() => S.doc && renderPage(n)).catch(console.warn));
  async function renderPage(n) {
    S.page = Math.min(Math.max(1, n), S.pages);
    await P.render(S.doc, S.page, 1.2, $('page-canvas'));
    $('pager-text').textContent = `Page ${S.page} / ${S.pages}`; $('btn-prev').disabled = S.page === 1; $('btn-next').disabled = S.page === S.pages;
    S.marks.forEach((m) => { m.el.hidden = m.page !== S.page; }); select(null);
  }
  $('btn-prev').addEventListener('click', () => showPage(S.page - 1));
  $('btn-next').addEventListener('click', () => showPage(S.page + 1));

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      if (S.doc) S.doc.destroy();
      S.marks.forEach((m) => m.el.remove());
      Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages, marks: [], sel: null, out: null });
      $('dropzone').hidden = true; $('viewer').hidden = false; $('pager').hidden = false;
      await showPage(1);
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  /* ── Boxes ── */
  function select(m) { S.sel = m; S.marks.forEach((k) => k.el.classList.toggle('is-active', k === m)); invalidate(); }
  function place(m) { Object.assign(m.el.style, { left: `${m.fx * 100}%`, top: `${m.fy * 100}%`, width: `${m.fw * 100}%`, height: `${m.fh * 100}%`, background: S.fill }); }
  function removeMark(m) { if (!m) return; m.el.remove(); S.marks = S.marks.filter((k) => k !== m); select(null); }
  const layer = $('box-layer'); let draft = null;
  const frac = (e) => { const r = $('page-canvas').getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  layer.addEventListener('pointerdown', (e) => {
    const hit = e.target.closest('.rpd-box'); if (hit) { select(S.marks.find((m) => m.el === hit)); return; }
    if (!S.pages) return; e.preventDefault(); try { layer.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events */ }
    const [x, y] = frac(e), el = document.createElement('div'); el.className = 'rpd-box is-draft'; el.tabIndex = 0; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Redaction box');
    draft = { page: S.page, fx: x, fy: y, fw: 0, fh: 0, el, ox: x, oy: y }; layer.append(el); place(draft);
  });
  layer.addEventListener('pointermove', (e) => {
    if (!draft) return; const [x, y] = frac(e);
    draft.fx = Math.min(draft.ox, x); draft.fy = Math.min(draft.oy, y); draft.fw = Math.abs(x - draft.ox); draft.fh = Math.abs(y - draft.oy); place(draft);
  });
  const finish = () => {
    if (!draft) return; const m = draft; draft = null; m.el.classList.remove('is-draft'); delete m.ox; delete m.oy;
    if (m.fw < 0.005 || m.fh < 0.005) { m.el.remove(); return; } // a click, not a drag
    m.el.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeMark(m); } });
    S.marks.push(m); select(m);
  };
  ['pointerup', 'pointercancel'].forEach((ev) => layer.addEventListener(ev, finish));
  $('btn-remove').addEventListener('click', () => removeMark(S.sel));
  bindSegmented($('seg-fill'), (v) => { S.fill = v; S.marks.forEach(place); invalidate(); });
  $('opt-dpi').addEventListener('change', invalidate);

  /* ── Apply: flatten marked pages, copy the rest ── */
  // Designed by Kapil Pidhwani: only pages with boxes are rasterised (one at a time, so memory stays flat); the rest are copied intact.
  // Ceiling: a marked page loses its text layer entirely — that is the price of redaction that cannot be undone. Upgrade path: OCR-free text re-layering outside the boxes.
  async function apply() {
    const { PDFDocument } = window.PDFLib, src = await P.loadLib(S.bytes), out = await PDFDocument.create(), scale = Number($('opt-dpi').value) / 72, marked = markedPages();
    const plain = [...Array(S.pages).keys()].filter((i) => !marked.has(i + 1)), copies = plain.length ? await out.copyPages(src, plain) : [];
    let ci = 0, first = Infinity;
    for (let n = 1; n <= S.pages; n++) {
      if (!marked.has(n)) { out.addPage(copies[ci++]); continue; }
      first = Math.min(first, n);
      const { c, vp } = await P.render(S.doc, n, scale), ctx = c.getContext('2d'); ctx.fillStyle = S.fill;
      S.marks.filter((m) => m.page === n).forEach((m) => ctx.fillRect(Math.floor(m.fx * c.width), Math.floor(m.fy * c.height), Math.ceil(m.fw * c.width), Math.ceil(m.fh * c.height)));
      const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)), img = await out.embedJpg(await jpg.arrayBuffer()), w = vp.width / scale, h = vp.height / scale;
      out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h }); c.width = 0;
      progress(n / S.pages, `Page ${n} of ${S.pages}…`); await new Promise((r) => setTimeout(r, 0));
    }
    return { blob: new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' }), first, flattened: marked.size };
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      await P.lib(); const r = await apply(); S.out = r.blob; S.flattened = r.flattened;
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas'), undefined, r.first); $('output-empty').hidden = true;
      $('output-badge').textContent = `${r.flattened} of ${S.pages} pages flattened · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Redacted ${S.marks.length} box${S.marks.length === 1 ? '' : 'es'} · ${r.flattened} page${r.flattened === 1 ? '' : 's'} flattened · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message || 'Redaction failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !S.marks.length; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'redacted')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: ${S.marks.length} redaction${S.marks.length === 1 ? '' : 's'} on page${markedPages().size === 1 ? '' : 's'} ${[...markedPages()].sort((a, b) => a - b).join(', ')}`, 'Summary copied'));
  function reset() {
    if (S.doc) S.doc.destroy(); S.marks.forEach((m) => m.el.remove());
    Object.assign(S, { file: null, bytes: null, doc: null, pages: 0, page: 1, marks: [], sel: null, out: null });
    ['viewer', 'pager'].forEach((id) => { $(id).hidden = true; }); $('dropzone').hidden = false;
    const c = $('output-canvas'); c.hidden = true; c.width = c.width; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__rpd = { S, load, run, apply, showPage, removeMark };
})();
