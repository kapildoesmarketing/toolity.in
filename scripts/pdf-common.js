/* Toolity PDF helpers — shared by the /utilities/ PDF tools. Lazy PDF.js (render) + @cantoo/pdf-lib (edit, loaded per page as window.PDFLib). */
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

  window.ToolityPDF = { lib, open, read, render, preview, thumbs, parseRange, loadLib, outName, MAX_FILE };
})();
