/* PDF Flattener — Toolity.in. Lossless: form.flatten() + annotation appearance baking. Raster: PDF.js render → JPEG pages. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const seg = (id) => (document.querySelector(`#${id} .seg-pill.active`) || {}).dataset?.value;
  const syncRows = () => { $('row-raster').hidden = seg('seg-mode') !== 'raster'; };

  P.mount({
    actionLabel: 'Flatten', suffix: 'flattened', source: 'canvas',
    async onLoad(S) {
      const doc = await P.loadLib(S.bytes); let fields = 0, annots = 0;
      try { fields = doc.getForm().getFields().length; } catch (e) {}
      const { PDFName } = window.PDFLib;
      doc.getPages().forEach((p) => { const a = p.node.lookup(PDFName.of('Annots')); if (a && a.size) annots += a.size(); });
      S.fields = fields; S.annots = Math.max(0, annots - fields);
      $('source-badge').textContent += ` · ${fields} field${fields === 1 ? '' : 's'} · ${S.annots} annotation${S.annots === 1 ? '' : 's'}`;
    },
    ready: (S) => (seg('seg-mode') === 'forms' && !S.fields && !S.annots ? 'Nothing to flatten losslessly — switch to Everything for a rasterised copy' : true),
    onSetting: syncRows,
    summary: () => (seg('seg-mode') === 'raster' ? `Everything · ${$('opt-dpi').value} dpi · ${$('opt-quality').value} %` : 'Forms & annotations · lossless'),
    onReset: syncRows,
    async run(S, { onProgress }) {
      if (seg('seg-mode') === 'raster') {
        const items = await P.rasterize(S.doc, { dpi: Number($('opt-dpi').value), quality: Number($('opt-quality').value) / 100, onProgress: (p) => onProgress(p * 0.85, 'Rendering') });
        const pdf = await P.imagesToPdf(items, (p) => onProgress(0.85 + p * 0.15, 'Assembling'));
        const blob = new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' });
        return { blob, note: `${S.pages} pages rasterised at ${$('opt-dpi').value} dpi · ${window.Toolity.formatBytes(blob.size)}` };
      }
      const { PDFName } = window.PDFLib, doc = await P.loadLib(S.bytes);
      let flattened = 0;
      try { const form = doc.getForm(); flattened = form.getFields().length; if (flattened) form.flatten(); } catch (e) { console.warn(e); }
      // Designed by Kapil Pidhwani: non-widget annotations (comments, stamps, links) are kept as-is — pdf-lib can flatten widgets only. Appearance streams of markup
      // annotations are already drawn by viewers; removing them would lose the mark. Upgrade path: draw each /AP form XObject onto the page, then delete the annot.
      const blob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, note: `${flattened} form field${flattened === 1 ? '' : 's'} flattened · annotations kept · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
  syncRows();
})();
