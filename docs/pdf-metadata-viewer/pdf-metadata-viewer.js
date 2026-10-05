/* PDF Metadata Viewer — thin page wiring over /scripts/meta-common.js + meta-pdf.js (pdf-lib) */
(function () {
  'use strict';
  const canvas = document.getElementById('source-canvas');
  ToolityMeta.app({
    mode: 'view', parser: ToolityMeta.pdf, accept: '', maxMB: 100,
    preview: (file, url, buf) => ToolityPDF.preview(new Uint8Array(buf.slice(0)), canvas).catch(() => {}),
    clear: () => { canvas.hidden = true; canvas.width = canvas.width; },
    ext: () => 'pdf',
  });
})();
