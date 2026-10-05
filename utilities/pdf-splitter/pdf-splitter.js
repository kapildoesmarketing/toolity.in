/* PDF Splitter — Toolity.in. Extract a page range to one PDF, or split into single pages / N-page chunks as a ZIP. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  const S = { file: null, bytes: null, doc: null, pages: 0, mode: 'extract', n: 2, sel: new Set(), out: null, outName: '', outInfo: '' };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Split PDF'; };

  /* Selection ⇄ range text ("1-3, 7") */
  function selToText() {
    const a = [...S.sel].sort((x, y) => x - y), parts = [];
    for (let i = 0; i < a.length; i++) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; parts.push(j > i ? `${a[i] + 1}-${a[j] + 1}` : `${a[i] + 1}`); i = j; }
    return parts.join(', ');
  }
  function paintSel() { [...$('page-grid').children].forEach((el, i) => el.classList.toggle('is-selected', S.mode === 'extract' && S.sel.has(i))); }
  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('zip-summary').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting split';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    let ready = !!S.pages, msg = `${S.pages} pages · press Split`;
    if (S.mode === 'extract') { ready = S.sel.size > 0; msg = S.sel.size ? `Extract ${S.sel.size} of ${S.pages} pages → one PDF` : 'Pick pages: type a range or click thumbnails'; }
    else if (S.mode === 'each') msg = `${S.pages} pages → ${S.pages} files in a ZIP`;
    else msg = `${S.pages} pages → ${Math.ceil(S.pages / S.n)} files of ${S.n} pages`;
    $('result-badge').textContent = S.pages ? msg : 'Drop a PDF to begin'; $('btn-compress').disabled = !ready;
    $('row-range').hidden = S.mode !== 'extract'; $('row-n').hidden = S.mode !== 'every';
    $('settings-summary').textContent = { extract: 'Extract pages → one PDF', each: 'Every page → ZIP', every: `Every ${S.n} pages → ZIP` }[S.mode];
  }

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      if (S.doc) S.doc.destroy();
      Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages, sel: new Set(), out: null }); $('opt-range').value = '';
      $('dropzone').hidden = true; $('page-grid').hidden = false;
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
      await P.thumbs(r.doc, $('page-grid'), { onItem: (n, item) => { item.tabIndex = 0; item.setAttribute('role', 'button'); item.setAttribute('aria-label', `Toggle page ${n}`);
        const tog = () => { if (S.mode !== 'extract') return; S.sel.has(n - 1) ? S.sel.delete(n - 1) : S.sel.add(n - 1); $('opt-range').value = selToText(); paintSel(); invalidate(); };
        item.addEventListener('click', tog); item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } }); } });
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  $('opt-range').addEventListener('input', (e) => {
    if (!S.pages) return;
    try { S.sel = new Set(e.target.value.trim() ? P.parseRange(e.target.value, S.pages) : []); showError(''); } catch (err) { showError(err.message); S.sel = new Set(); }
    paintSel(); invalidate();
  });
  $('opt-mode').addEventListener('change', (e) => { S.mode = e.target.value; paintSel(); invalidate(); });
  $('opt-n').addEventListener('input', (e) => { S.n = Math.max(1, Math.round(Number(e.target.value) || 1)); invalidate(); });

  /* ── Split ── */
  async function subset(src, indices) {
    const { PDFDocument } = window.PDFLib, d = await PDFDocument.create();
    (await d.copyPages(src, indices)).forEach((p) => d.addPage(p));
    return d.save({ useObjectStreams: true });
  }
  // Designed by Kapil Pidhwani: each chunk is a fresh pdf-lib document built via copyPages, so shared resources (fonts/images) are duplicated per
  // file — N single-page files from an image-heavy PDF can total more than the source. Correct, just not deduplicated.
  async function split() {
    await P.lib();
    const src = await P.loadLib(S.bytes), base = S.file.name.replace(/\.pdf$/i, '');
    if (S.mode === 'extract') {
      const idx = [...S.sel].sort((a, b) => a - b);
      progress(0.5, 'Extracting…');
      return { blob: new Blob([await subset(src, idx)], { type: 'application/pdf' }), name: `${base}-pages-${selToText().replace(/[,\s]+/g, '_')}.pdf`, info: `${idx.length} pages extracted` };
    }
    if (!window.JSZip) throw new Error('ZIP engine is still loading — try again in a second.');
    const zip = new JSZip(), step = S.mode === 'each' ? 1 : S.n, chunks = [];
    for (let i = 0; i < S.pages; i += step) chunks.push(Array.from({ length: Math.min(step, S.pages - i) }, (_, k) => i + k));
    const pad = String(chunks.length).length;
    for (let c = 0; c < chunks.length; c++) {
      const idx = chunks[c], label = idx.length === 1 ? `page-${String(idx[0] + 1).padStart(pad, '0')}` : `pages-${idx[0] + 1}-${idx[idx.length - 1] + 1}`;
      zip.file(`${base}-${label}.pdf`, await subset(src, idx));
      progress((c + 1) / chunks.length, `File ${c + 1} of ${chunks.length}…`); await new Promise((r) => setTimeout(r, 0));
    }
    return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), name: `${base}-split.zip`, info: `${chunks.length} PDFs in a ZIP` };
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      const r = await split(); S.out = r.blob; S.outName = r.name; S.outInfo = r.info;
      $('output-empty').hidden = true;
      if (S.mode === 'extract') { await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas')); $('zip-summary').hidden = true; }
      else { $('output-canvas').hidden = true; $('zip-text').textContent = `${r.info} · ${formatBytes(S.out.size)}`; $('zip-summary').hidden = false; }
      $('output-badge').textContent = `${r.info} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `${r.info} · ${formatBytes(S.out.size)} · ready`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message || 'Split failed.'); progress(0); $('btn-compress').disabled = false; }
    finally { setBusy($('tool-card'), false); if (!S.out) invalidate(); else $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, S.outName));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: ${S.outInfo} (${formatBytes(S.out.size)})`, 'Summary copied'));
  function reset() {
    if (S.doc) S.doc.destroy();
    Object.assign(S, { file: null, bytes: null, doc: null, pages: 0, mode: 'extract', n: 2, sel: new Set(), out: null });
    $('page-grid').replaceChildren(); $('page-grid').hidden = true; $('dropzone').hidden = false; $('opt-mode').value = 'extract'; $('opt-range').value = ''; $('opt-n').value = 2;
    const c = $('output-canvas'); c.hidden = true; c.width = c.width; $('zip-summary').hidden = true; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__pdfs = { S, load, run, split, selToText };
})();
