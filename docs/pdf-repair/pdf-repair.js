/* PDF Repair — Toolity.in. Rebuild: pdf-lib re-parses with tolerant options (it reconstructs the xref by scanning objects), pages are
 * copied into a brand-new document (clean object graph), optional strip of annotations/forms, fresh save. Fallback: PDF.js renders
 * whatever it still can → image pages (rasterised, clearly reported). Verification: the result is re-opened with PDF.js. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, { formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const LOAD = { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false, capNumbers: true };
  const META = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer'];

  // Designed by Kapil Pidhwani: pre-clean before parsing — drop junk before the %PDF- header (mail gateways / bad downloads prepend
  // text) and make sure the file ends with %%EOF so truncated files still hit the parsers' recovery paths.
  function clean(bytes) {
    const n = Math.min(bytes.length, 4096); let off = -1;
    for (let i = 0; i + 5 <= n; i++) if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) { off = i; break; }
    let b = off > 0 ? bytes.slice(off) : bytes;
    const tail = new TextDecoder('latin1').decode(b.slice(Math.max(0, b.length - 64)));
    if (!/%%EOF\s*$/.test(tail)) { const eof = new TextEncoder().encode('\n%%EOF\n'), m = new Uint8Array(b.length + eof.length); m.set(b); m.set(eof, b.length); b = m; }
    return b;
  }
  async function rebuild(bytes, { strip, keepMeta }) {
    const { PDFDocument, PDFName } = window.PDFLib;
    const src = await PDFDocument.load(clean(bytes), LOAD), out = await PDFDocument.create();
    const idx = src.getPageIndices(); if (!idx.length) throw new Error('No pages could be recovered from the file structure.');
    const pages = await out.copyPages(src, idx); let dropped = 0;
    for (const p of pages) {
      if (strip) { const a = p.node.lookup(PDFName.of('Annots')); if (a && (!a.size || a.size() > 0)) dropped++; p.node.delete(PDFName.of('Annots')); }
      out.addPage(p);
    }
    if (strip && src.catalog.has(PDFName.of('AcroForm'))) dropped++;
    if (keepMeta) { for (const k of META) { try { const v = src[`get${k}`](); if (v) out[`set${k}`](v); } catch (e) { /* damaged info dict — skip */ } } }
    out.setProducer('Toolity.in PDF Repair'); out.setModificationDate(new Date());
    return { bytes: await out.save({ useObjectStreams: true }), pages: pages.length, dropped, method: 'Rebuilt structure (vector)' };
  }
  async function raster(S, api) {
    const doc = S.doc || await P.open(clean(S.bytes)); // PDF.js may still open what pdf-lib cannot
    const imgs = await P.rasterize(doc, { dpi: 150, type: 'image/jpeg', quality: 0.85, onProgress: (p) => api.onProgress(0.1 + p * 0.8, 'Redrawing pages') });
    const pdf = await P.imagesToPdf(imgs); pdf.setProducer('Toolity.in PDF Repair (rasterised)');
    return { bytes: await pdf.save({ useObjectStreams: true }), pages: imgs.length, dropped: 0, method: 'Rasterised pages (150 dpi images — text is no longer selectable)' };
  }
  P.mount({
    actionLabel: 'Repair', suffix: 'repaired', source: 'canvas', lenient: true,
    summary: () => `${$('opt-method').selectedOptions[0].textContent.split(' — ')[0]} · ${$('opt-meta').checked ? 'keep metadata' : 'no metadata'}${$('opt-strip').checked ? ' · strip annotations' : ''}`,
    onLoad(S, api) { if (S.damaged) api.showError(`The viewer could not open this file (${S.damaged.slice(0, 80)}). Repair will try to rebuild it.`); },
    async run(S, api) {
      const method = $('opt-method').value, o = { strip: $('opt-strip').checked, keepMeta: $('opt-meta').checked }; let r, firstErr = null;
      api.progress(0.1, 'Parsing…');
      if (method !== 'raster') { try { r = await rebuild(S.bytes, o); } catch (e) { firstErr = e; if (method === 'rebuild') throw new Error(`Could not rebuild the structure (${(e.message || e).toString().slice(0, 90)}). Try the rasterise method.`); } }
      if (!r) { api.progress(0.1, 'Structure unrecoverable — redrawing…'); try { r = await raster(S, api); } catch (e) { throw new Error(`Nothing could be recovered: ${((firstErr || e).message || e).toString().slice(0, 120)}`); } }
      // verify with PDF.js
      let verified = false, vPages = 0; try { const d = await P.open(r.bytes); vPages = d.numPages; verified = vPages === r.pages; d.destroy(); } catch (e) { verified = false; }
      const blob = new Blob([r.bytes], { type: 'application/pdf' });
      const before = S.pages ? `${S.pages} → ` : '';
      return { blob, note: `${verified ? '✓ Opens cleanly' : '⚠ Still reports errors'} · ${before}${r.pages} page${r.pages === 1 ? '' : 's'} · ${r.method}${r.dropped ? ` · ${r.dropped} annotation/form object${r.dropped === 1 ? '' : 's'} dropped` : ''} · ${formatBytes(S.file.size)} → ${formatBytes(blob.size)}`, label: `${r.pages} pages · ${formatBytes(blob.size)}` };
    }
  });
  window.__pr = { rebuild };
})();
