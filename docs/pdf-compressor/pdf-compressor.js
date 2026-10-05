/* PDF Compressor — Toolity.in. Keep-text (pdf-lib lossless re-save) or Maximum (PDF.js render → JPEG → pdf-lib rebuild). All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const MAX_FILE = 100 * 1024 * 1024;
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
  const DEF = { mode: 'keep', dpi: 110, quality: 70 };
  const S = { ...DEF, file: null, bytes: null, pages: 0, out: null };
  let pdfjs = null;

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Compress PDF'; };
  async function lib() {
    if (!pdfjs) { pdfjs = await import(PDFJS_URL); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_URL.replace('pdf.min.mjs', 'pdf.worker.min.mjs'); }
    if (!window.PDFLib) throw new Error('PDF engine is still loading — try again in a second.');
    return pdfjs;
  }
  const openDoc = async (bytes) => (await lib()).getDocument({ data: bytes.slice(0) }).promise;

  /* Render page `n` of a PDF.js doc at `scale` into a canvas (new one unless given). */
  async function renderPage(doc, n, scale, canvas) {
    const page = await doc.getPage(n), vp = page.getViewport({ scale });
    const c = canvas || document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return { c, w: page.view[2] - page.view[0], h: page.view[3] - page.view[1] }; // w/h in PDF points
  }
  async function preview(bytes, canvas) {
    const doc = await openDoc(bytes);
    await renderPage(doc, 1, 1.2, canvas); canvas.hidden = false; doc.destroy();
  }

  /* ── Load ── */
  async function load(file) {
    if (file.size > MAX_FILE) return showError(`That file is ${formatBytes(file.size)} — the limit is 100 MB.`);
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await openDoc(bytes); const pages = doc.numPages;
      await renderPage(doc, 1, 1.2, $('source-canvas')); doc.destroy();
      S.file = file; S.bytes = bytes; S.pages = pages;
      $('source-canvas').hidden = false; $('dropzone').hidden = true;
      $('source-badge').textContent = `${pages} page${pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      $('result-badge').textContent = `${formatBytes(file.size)} → press Compress`;
      $('btn-compress').disabled = false; syncSummary();
    } catch (e) {
      console.warn(e);
      showError(/password/i.test(e.message) ? 'That PDF needs a password to open — remove it first.' : "Couldn't open that PDF.");
      $('source-badge').textContent = 'No file loaded';
    }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  /* ── Compress ── */
  async function keepText() {
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.load(S.bytes, { ignoreEncryption: true, updateMetadata: false });
    ['setTitle', 'setAuthor', 'setSubject', 'setKeywords', 'setProducer', 'setCreator'].forEach((m) => { try { doc[m](m === 'setKeywords' ? [] : ''); } catch (_) { /* optional */ } });
    progress(0.5, 'Rewriting…');
    return new Blob([await doc.save({ useObjectStreams: true, addDefaultPage: false })], { type: 'application/pdf' });
  }
  // Designed by Kapil Pidhwani: flatten holds ONE rendered page at a time (≤ ~1.3 MP at 110 DPI for A4), so memory stays flat for 500-page scans;
  // cost is time (~150 ms/page). Upgrade path: OffscreenCanvas in a Worker to keep the UI thread free.
  async function flatten() {
    const { PDFDocument } = window.PDFLib;
    const src = await openDoc(S.bytes), out = await PDFDocument.create(), scale = S.dpi / 72;
    for (let n = 1; n <= S.pages; n++) {
      const { c, w, h } = await renderPage(src, n, scale);
      const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', S.quality / 100));
      const img = await out.embedJpg(await jpg.arrayBuffer());
      out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
      progress(n / S.pages, `Page ${n} of ${S.pages}`);
      await new Promise((r) => setTimeout(r, 0));
    }
    src.destroy();
    return new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }
  async function run() {
    if (!S.bytes || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      await lib();
      const blob = S.mode === 'keep' ? await keepText() : await flatten();
      const keep = blob.size >= S.file.size * 0.995; // <0.5% is noise, not a win
      S.out = keep ? S.file : blob;
      await preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas')); $('output-empty').hidden = true;
      const pct = Math.round((1 - S.out.size / S.file.size) * 100);
      $('output-badge').textContent = `${S.pages} page${S.pages === 1 ? '' : 's'} · ${S.mode === 'keep' ? 'text kept' : `${S.dpi} DPI · q${S.quality}`} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.toggle('pdc-win', pct > 0);
      $('result-badge').textContent = keep ? `${formatBytes(S.file.size)} → no gain in this mode, original kept${S.mode === 'keep' ? ' — try Maximum' : ''}` : `${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} · −${pct}%`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.error(e); showError(e.message || 'Compression failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = false; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  /* ── Settings ── */
  function syncSummary() {
    document.querySelectorAll('.pdc-flatten-only').forEach((el) => { el.hidden = S.mode !== 'flatten'; });
    $('opt-quality-val').textContent = S.quality;
    $('settings-summary').textContent = S.mode === 'keep' ? 'Keep text (lossless)' : `Maximum · ${S.dpi} DPI · quality ${S.quality}`;
  }
  $('opt-mode').addEventListener('change', (e) => { S.mode = e.target.value; syncSummary(); });
  $('opt-dpi').addEventListener('change', (e) => { S.dpi = Number(e.target.value); syncSummary(); });
  $('opt-quality').addEventListener('input', (e) => { S.quality = Number(e.target.value); syncSummary(); });

  /* ── Actions ── */
  const name = () => `${S.file.name.replace(/\.pdf$/i, '')}-compressed.pdf`;
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, name()));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: ${formatBytes(S.file.size)} → ${formatBytes(S.out.size)} (${S.pages} pages, ${S.mode === 'keep' ? 'lossless' : S.dpi + ' DPI'})`, 'Summary copied'));
  function reset() {
    Object.assign(S, DEF, { file: null, bytes: null, pages: 0, out: null });
    ['source-canvas', 'output-canvas'].forEach((id) => { const c = $(id); c.hidden = true; c.width = c.width; });
    $('dropzone').hidden = false; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
    $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('pdc-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true;
    $('opt-mode').value = 'keep'; $('opt-dpi').value = '110'; $('opt-quality').value = 70;
    showError(''); syncSummary(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  syncSummary();
  window.__pdc = { S, run, load, keepText, flatten };
})();
