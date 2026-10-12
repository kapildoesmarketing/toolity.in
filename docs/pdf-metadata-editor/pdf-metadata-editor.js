/* PDF Metadata Editor — Toolity.in. Reads the Info dictionary into a form, writes it back with pdf-lib, optionally drops XMP. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const FIELDS = ['title', 'author', 'subject', 'keywords', 'creator', 'producer'], SIMPLE = FIELDS.filter((k) => k !== 'keywords');
  const toLocal = (d) => (d instanceof Date && !isNaN(d) ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

  P.mount({
    actionLabel: 'Save Metadata', suffix: 'metadata', source: 'custom',
    async onLoad(S) {
      const doc = await P.loadLib(S.bytes); S.libDoc = doc;
      const get = (k) => { try { return doc[`get${k[0].toUpperCase()}${k.slice(1)}`]() || ''; } catch (e) { return ''; } };
      FIELDS.forEach((k) => { $(`meta-${k}`).value = get(k); });
      $('meta-created').value = toLocal(doc.getCreationDate()); $('meta-modified').value = toLocal(doc.getModificationDate());
      $('meta-form').hidden = false;
    },
    summary: () => `${$('opt-xmp').checked ? 'Also strips XMP' : 'Keeps XMP'} · keeps content`,
    onReset() { $('meta-form').hidden = true; FIELDS.concat(['created', 'modified']).forEach((k) => { $(`meta-${k}`).value = ''; }); },
    copy(S) { const lines = FIELDS.map((k) => `${k[0].toUpperCase()}${k.slice(1)}: ${$(`meta-${k}`).value}`); window.Toolity.copyText(lines.join('\n'), 'Metadata copied'); },
    async run(S) {
      const doc = await P.loadLib(S.bytes);
      const set = (k, v) => doc[`set${k[0].toUpperCase()}${k.slice(1)}`](v);
      SIMPLE.forEach((k) => set(k, $(`meta-${k}`).value.trim()));
      doc.setKeywords($('meta-keywords').value.split(',').map((s) => s.trim()).filter(Boolean));
      const c = $('meta-created').value, m = $('meta-modified').value;
      doc.setCreationDate(c ? new Date(c) : new Date(0)); doc.setModificationDate(m ? new Date(m) : new Date());
      if ($('opt-xmp').checked) { // Designed by Kapil Pidhwani: drop the XMP stream so viewers can't prefer stale values over the Info dict. Upgrade path: rewrite XMP in sync.
        const { PDFName } = window.PDFLib; doc.catalog.delete(PDFName.of('Metadata'));
      }
      const blob = new Blob([await doc.save({ useObjectStreams: true, updateMetadata: false })], { type: 'application/pdf' });
      return { blob, note: `Metadata saved · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
  $('btn-clear-meta').addEventListener('click', () => { FIELDS.concat(['created', 'modified']).forEach((k) => { $(`meta-${k}`).value = ''; }); $('meta-title').dispatchEvent(new Event('input', { bubbles: true })); });
})();
