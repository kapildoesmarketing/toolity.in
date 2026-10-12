/* Grayscale PDF — Toolity.in. Renders pages with PDF.js, desaturates on canvas, re-embeds as JPEG with pdf-lib. Raster output; all on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  P.mount({
    actionLabel: 'Convert to Grayscale', suffix: 'grayscale', source: 'canvas',
    ready(S) { const r = $('opt-pages').value.trim(); if (r) { try { P.parseRange(r, S.pages); } catch (e) { return e.message; } } return true; },
    summary: () => `${$('opt-dpi').value} dpi · ${$('opt-quality').value} % quality · ${$('opt-pages').value.trim() || 'all pages'}`,
    async run(S, { onProgress }) {
      const dpi = Number($('opt-dpi').value), q = Number($('opt-quality').value) / 100;
      const sel = $('opt-pages').value.trim() ? P.parseRange($('opt-pages').value, S.pages) : null;
      const items = await P.rasterize(S.doc, { dpi, quality: q, filter: 'grayscale(1)', pages: sel || undefined, onProgress: (p) => onProgress(p * 0.8, 'Rendering') });
      let pdf;
      if (!sel) pdf = await P.imagesToPdf(items, (p) => onProgress(0.8 + p * 0.2, 'Assembling'));
      else { // Designed by Kapil Pidhwani: partial conversion keeps untouched pages vector by copying them from the source and replacing only the selected ones.
        const { PDFDocument } = window.PDFLib, src = await P.loadLib(S.bytes); pdf = await PDFDocument.create();
        const byIndex = new Map(items.map((it) => [it.index, it]));
        for (let i = 0; i < S.pages; i++) {
          const it = byIndex.get(i);
          if (it) { const img = await pdf.embedJpg(new Uint8Array(await it.blob.arrayBuffer())); pdf.addPage([it.wPt, it.hPt]).drawImage(img, { x: 0, y: 0, width: it.wPt, height: it.hPt }); }
          else { const [cp] = await pdf.copyPages(src, [i]); pdf.addPage(cp); }
          onProgress(0.8 + ((i + 1) / S.pages) * 0.2, 'Assembling');
        }
      }
      const blob = new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, firstPage: (sel ? sel[0] : 0) + 1, note: `${items.length} of ${S.pages} pages → grayscale · ${window.Toolity.formatBytes(S.file.size)} → ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
})();
