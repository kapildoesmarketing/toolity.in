/* Toolity PDF helpers — shared by the /docs/ PDF tools. Lazy PDF.js (render) + @cantoo/pdf-lib (edit, loaded per page as window.PDFLib). */
(function () {
  'use strict';
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
  const MAX_FILE = 100 * 1024 * 1024;
  let pdfjs = null;

  async function lib() {
    if (!pdfjs) { pdfjs = await import(PDFJS_URL); pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_URL.replace('pdf.min.mjs', 'pdf.worker.min.mjs'); }
    if (!window.PDFLib) throw new Error('PDF engine is still loading — try again in a second.');
    return pdfjs;
  }

  /** Open with PDF.js. Throws Error('encrypted') when a password is needed and none/wrong given. */
  async function open(bytes, password) {
    const p = await lib();
    try { return await p.getDocument({ data: bytes.slice(0), password }).promise; }
    catch (e) { if (e && e.name === 'PasswordException') { const err = new Error('encrypted'); err.needsPassword = true; throw err; } throw e; }
  }

  /** Read a dropped File → { file, bytes, doc, pages }. Validates size and that it parses. */
  async function read(file, { password, max = MAX_FILE } = {}) {
    if (file.size > max) throw new Error(`That file is ${window.Toolity.formatBytes(file.size)} — the limit is ${Math.round(max / 1048576)} MB.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await open(bytes, password);
    return { file, bytes, doc, pages: doc.numPages };
  }

  /** Render page n (1-based) at scale into canvas (created if omitted). Returns { c, vp } — vp.width/height are CSS px, page size in points = vp / scale. */
  async function render(doc, n, scale, canvas) {
    const page = await doc.getPage(n), vp = page.getViewport({ scale });
    const c = canvas || document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return { c, vp, page };
  }

  /** Page n (default first) of a PDF (bytes) into a canvas; used for output previews. */
  async function preview(bytes, canvas, password, n = 1) {
    const doc = await open(bytes, password);
    await render(doc, Math.min(Math.max(1, n), doc.numPages), 1.2, canvas); canvas.hidden = false; doc.destroy();
  }

  /**
   * Thumbnail grid. actions(n, item) may append buttons into item.querySelector('.pdf-thumb-actions').
   * Designed by Kapil Pidhwani: renders sequentially with a yield per page (keeps the UI alive) and caps at 300 thumbs — beyond that
   * pages are listed without an image. Upgrade path: IntersectionObserver lazy render.
   */
  async function thumbs(doc, container, { scale = 0.28, cap = 300, actions, onItem } = {}) {
    container.replaceChildren();
    const items = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const item = document.createElement('div'); item.className = 'pdf-thumb'; item.dataset.page = n;
      const c = document.createElement('canvas'); c.width = 80; c.height = 100;
      const num = document.createElement('span'); num.className = 'pdf-thumb-num'; num.textContent = n;
      const act = document.createElement('div'); act.className = 'pdf-thumb-actions';
      item.append(c, num, act); container.append(item); items.push(item);
      if (actions) actions(n, item, act);
      if (onItem) onItem(n, item);
    }
    for (let n = 1; n <= Math.min(cap, doc.numPages); n++) {
      if (!items[n - 1].isConnected) break; // reset happened mid-render
      await render(doc, n, scale, items[n - 1].querySelector('canvas'));
      await new Promise((r) => setTimeout(r, 0));
    }
    return items;
  }

  /** "1-3, 7, 10-12" → sorted unique 0-based indices within [0, max). Throws on nonsense. */
  function parseRange(str, max) {
    const out = new Set();
    for (const part of String(str).split(',').map((s) => s.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw new Error(`Can't read "${part}" — use numbers and ranges like 1-3, 7.`);
      let a = Number(m[1]), b = m[2] ? Number(m[2]) : a; if (a > b) [a, b] = [b, a];
      if (a < 1 || b > max) throw new Error(`Page ${a < 1 ? a : b} is out of range — this PDF has ${max} page${max === 1 ? '' : 's'}.`);
      for (let i = a; i <= b; i++) out.add(i - 1);
    }
    if (!out.size) throw new Error('Enter at least one page.');
    return [...out].sort((x, y) => x - y);
  }

  /** Load with pdf-lib (cantoo fork). Encrypted + no password → Error with .needsPassword. */
  async function loadLib(bytes, password) {
    const { PDFDocument } = window.PDFLib;
    try { return await PDFDocument.load(bytes, password === undefined ? { ignoreEncryption: false } : { password }); }
    catch (e) {
      if (/encrypt|password/i.test(e.message || '')) { const err = new Error('encrypted'); err.needsPassword = true; throw err; }
      throw e;
    }
  }

  const outName = (file, verb) => `${file.name.replace(/\.pdf$/i, '')}-${verb}.pdf`;

  /* ── Paper + raster helpers (shared by PDF to Images, Flattener, Grayscale, Resizer) ── */
  const PAPER = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a5: [419.53, 595.28], a3: [841.89, 1190.55], tabloid: [792, 1224] };
  const mm = (v) => (v * 72) / 25.4;
  const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode the page image.'))), type, q));
  /** Render pages (0-based indices; default all) to image blobs. { dpi, type 'image/jpeg'|'image/png'|'image/webp', quality 0–1, filter (CSS filter e.g. 'grayscale(1)'), onProgress } → [{ blob, wPt, hPt, index }] */
  async function rasterize(doc, { dpi = 150, type = 'image/jpeg', quality = 0.85, filter, pages, onProgress } = {}) {
    const idx = pages || [...Array(doc.numPages).keys()], out = [], scale = dpi / 72;
    for (let k = 0; k < idx.length; k++) {
      const { c, vp } = await render(doc, idx[k] + 1, scale);
      let src = c;
      if (filter) { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const x = f.getContext('2d'); x.filter = filter; x.drawImage(c, 0, 0); src = f; }
      out.push({ blob: await canvasBlob(src, type, quality), wPt: vp.width / scale, hPt: vp.height / scale, index: idx[k] });
      c.width = c.height = 0; if (src !== c) src.width = src.height = 0;
      if (onProgress) onProgress((k + 1) / idx.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  }
  /** Build a pdf-lib document from image blobs: [{ blob, wPt, hPt }] (JPEG or PNG) — one full-bleed page each. Returns the PDFDocument. */
  async function imagesToPdf(items, onProgress) {
    const { PDFDocument } = window.PDFLib, pdf = await PDFDocument.create();
    for (let i = 0; i < items.length; i++) {
      const it = items[i], bytes = new Uint8Array(await it.blob.arrayBuffer());
      const img = it.blob.type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([it.wPt, it.hPt]); page.drawImage(img, { x: 0, y: 0, width: it.wPt, height: it.hPt });
      if (onProgress) onProgress((i + 1) / items.length);
    }
    return pdf;
  }

  /* ── Page controller (rule 46). Pages come from gen_pdf_pages.js; a tool is T = {
   *   actionLabel, suffix, ext?('pdf'|'txt'|'zip'|'png'), accept?('application/pdf'|'image/'), multiple?,
   *   source?('canvas'|'thumbs'|'custom'), ready(S)→true|string(reason), run(S, api)→{ blob, text?, previewBytes?, note?, firstPage? },
   *   onLoad(S, api)?, onFiles(files, S, api)? (multiple), onSetting(el, S)?, summary(S)?, onReset(S)?, copy(S)?
   * } — load → ready → run → present → download/copy → reset, with the shared errors handled once. */
  function mount(T) {
    const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
    const $ = (id) => document.getElementById(id), card = $('tool-card');
    const S = { file: null, files: [], bytes: null, doc: null, pages: 0, out: null, outText: '', outUrl: '' };
    const showError = (msg) => { const el = $('input-error'); if (!el) return; el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const progress = (p, label) => { const f = $('progress-fill'); if (f) f.style.width = `${Math.round((p || 0) * 100)}%`; const l = $('btn-compress-label'); if (l) l.textContent = label || T.actionLabel; };
    const onProgress = (p, label) => progress(p, `${label || 'Working'} ${Math.round(p * 100)}%`);
    const api = { $, S, showError, progress, onProgress, formatBytes };
    const stem = () => (S.file ? S.file.name.replace(/\.[^.]+$/, '') : (S.files[0] ? S.files[0].name.replace(/\.[^.]+$/, '') : 'document'));
    const outFileName = () => `${stem()}-${T.suffix}.${T.ext || 'pdf'}`;
    const friendly = (e) => (e.needsPassword ? 'That PDF is password-protected — unlock it first with Unlock PDF.' : /limit/.test(e.message || '') ? e.message : e.message || "Couldn't process that file.");

    /* settings: every input/select in the left pane or the accordion */
    const controls = () => [...card.querySelectorAll('.tool-settings-panel input, .tool-settings-panel select, .tool-settings-panel textarea, .pane-content input:not([type=file]), .pane-content select, .pane-content textarea')].filter((el) => el.id !== 'output-text');
    const paintRanges = () => controls().forEach((el) => { const b = $(`${el.id}-val`); if (b && el.type === 'range') b.textContent = el.value + (el.dataset.unit || ''); });
    function invalidate() {
      paintRanges();
      if (S.out) { if (S.outUrl) URL.revokeObjectURL(S.outUrl); S.out = null; S.outText = ''; S.outUrl = ''; }
      ['output-canvas', 'output-img', 'output-text', 'output-list'].forEach((id) => { const el = $(id); if (el) el.hidden = true; });
      if ($('output-empty')) $('output-empty').hidden = false;
      if ($('output-badge')) $('output-badge').textContent = S.pages || S.files.length ? 'Awaiting ' + T.actionLabel.toLowerCase() : 'Awaiting file';
      ['btn-download', 'btn-copy', 'btn-open'].forEach((id) => { if ($(id)) $(id).disabled = true; });
      const rb = $('result-badge'); if (rb) rb.classList.remove('is-win');
      const loaded = S.bytes || S.files.length;
      const r = loaded ? (T.ready ? T.ready(S) : true) : false;
      if (rb) rb.textContent = !loaded ? (T.multiple ? 'Drop files to begin' : 'Drop a PDF to begin') : r === true ? `${S.pages ? S.pages + ' page' + (S.pages === 1 ? '' : 's') : S.files.length + ' files'} · press ${T.actionLabel}` : String(r);
      $('btn-compress').disabled = r !== true;
      if (T.summary && $('settings-summary')) $('settings-summary').textContent = T.summary(S);
    }
    card.addEventListener('input', (e) => { if (!e.target.matches('input, select, textarea') || e.target.type === 'file' || e.target.id === 'output-text') return; if (T.onSetting) T.onSetting(e.target, S, api); invalidate(); });
    card.addEventListener('change', (e) => { if (e.target.matches('select, input[type=checkbox], input[type=radio]')) { if (T.onSetting) T.onSetting(e.target, S, api); invalidate(); } });
    card.querySelectorAll('.segmented-group').forEach((g) => bindSegmented(g, () => { if (T.onSetting) T.onSetting(g, S, api); invalidate(); }));

    async function loadPdf(file) {
      showError(''); $('source-badge').textContent = 'Opening…';
      try {
        const r = await read(file);
        if (S.doc) S.doc.destroy();
        Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages });
        $('dropzone').hidden = true;
        if (T.source === 'canvas' && $('source-canvas')) { await render(r.doc, 1, 1.2, $('source-canvas')); $('source-canvas').hidden = false; }
        if (T.source === 'thumbs' && $('page-grid')) { $('page-grid').hidden = false; }
        $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
        if (T.onLoad) await T.onLoad(S, api);
        invalidate();
        if (T.source === 'thumbs' && $('page-grid')) await thumbs(r.doc, $('page-grid'), T.thumbOpts ? T.thumbOpts(S, api) : {});
      } catch (e) { console.warn(e); showError(friendly(e)); $('source-badge').textContent = 'No file loaded'; }
    }
    async function loadFiles(files) {
      showError(''); const list = [...files]; if (!list.length) return;
      try { await T.onFiles(list, S, api); $('dropzone').hidden = !!S.files.length; $('source-badge').textContent = `${S.files.length} file${S.files.length === 1 ? '' : 's'}`; invalidate(); }
      catch (e) { console.warn(e); showError(friendly(e)); }
    }
    if ($('dropzone')) bindDropzone($('dropzone'), $('file-input'), T.multiple ? loadFiles : loadPdf, { accept: T.accept === undefined ? 'application/pdf' : T.accept, multiple: !!T.multiple });
    if (T.multiple && $('btn-add-more')) $('btn-add-more').addEventListener('click', () => $('file-input').click());

    async function setOutput(r) {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = r.blob; S.outText = r.text || ''; S.outUrl = r.blob ? URL.createObjectURL(r.blob) : '';
      $('output-empty').hidden = true;
      if (r.text !== undefined && $('output-text')) { $('output-text').value = r.text; $('output-text').hidden = false; }
      else if (r.previewBytes && $('output-canvas')) { await preview(r.previewBytes, $('output-canvas'), undefined, r.firstPage || 1); }
      else if (r.imageUrl && $('output-img')) { $('output-img').src = r.imageUrl; $('output-img').hidden = false; }
      else if (r.blob && /pdf/.test(r.blob.type) && $('output-canvas')) { await preview(new Uint8Array(await r.blob.arrayBuffer()), $('output-canvas'), undefined, r.firstPage || 1); }
      if (r.list && $('output-list')) { $('output-list').replaceChildren(...r.list.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; })); $('output-list').hidden = false; }
      $('output-badge').textContent = r.label || (r.blob ? formatBytes(r.blob.size) : `${(r.text || '').length} chars`);
      const rb = $('result-badge'); rb.classList.add('is-win'); rb.textContent = r.note || `Done · ${r.blob ? formatBytes(r.blob.size) : 'ready'}`;
      $('btn-download').disabled = !r.blob; $('btn-copy').disabled = !(r.blob || r.text); if ($('btn-open')) $('btn-open').disabled = !(r.blob && /pdf|image|text/.test(r.blob.type));
    }
    async function run() {
      if ($('btn-compress').disabled || card.classList.contains('is-busy')) return;
      setBusy(card, true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.05, 'Starting…'); showError('');
      const t0 = performance.now();
      try {
        await lib(); const r = await T.run(S, api); await setOutput(r);
        if (!r.note) $('result-badge').textContent += ` · ${((performance.now() - t0) / 1000).toFixed(1)} s`;
        progress(1, 'Run again');
      } catch (e) { console.warn(e); showError(friendly(e)); progress(0); const rb = $('result-badge'); rb.classList.remove('is-win'); rb.textContent = 'Failed'; }
      finally { setBusy(card, false); $('btn-compress').disabled = (T.ready ? T.ready(S) : true) !== true; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
    }
    $('btn-compress').addEventListener('click', run);
    $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, outFileName()));
    $('btn-copy').addEventListener('click', () => (T.copy ? T.copy(S) : S.outText ? copyText(S.outText, 'Text copied') : copyText(`${outFileName()} · ${$('output-badge').textContent}`, 'Summary copied')));
    if ($('btn-open')) $('btn-open').addEventListener('click', () => S.outUrl && window.open(S.outUrl, '_blank', 'noopener'));

    function reset() {
      if (S.doc) S.doc.destroy(); if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      Object.assign(S, { file: null, files: [], bytes: null, doc: null, pages: 0, out: null, outText: '', outUrl: '' });
      ['source-canvas', 'output-canvas'].forEach((id) => { const c = $(id); if (c) { c.hidden = true; c.width = c.width; } });
      ['page-grid', 'file-list', 'form-fields'].forEach((id) => { const el = $(id); if (el) { el.replaceChildren(); el.hidden = true; } });
      if ($('dropzone')) $('dropzone').hidden = false;
      controls().forEach((el) => { if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value; else el.value = el.defaultValue; });
      card.querySelectorAll('.segmented-group').forEach((g) => g.querySelectorAll('.seg-pill').forEach((b, i) => b.classList.toggle('active', b.dataset.default !== undefined ? true : i === 0 && !g.querySelector('[data-default]'))));
      $('source-badge').textContent = 'No file loaded'; if (T.onReset) T.onReset(S, api); invalidate(); showError(''); progress(0); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: run, reset });
    invalidate();
    window.ToolityPDFTool = Object.assign(api, { run, reset, loadPdf, loadFiles, invalidate, setOutput, T });
    return api;
  }

  window.ToolityPDF = { lib, open, read, render, preview, thumbs, parseRange, loadLib, outName, mount, rasterize, imagesToPdf, canvasBlob, PAPER, mm, MAX_FILE };
})();
