/* Designed by Kapil Pidhwani: PDF metadata reader + remover on top of pdf-lib (already shipped with every PDF tool).
 * Reads the Info dictionary, the XMP packet (decoded via pdf-lib's stream decoder), page count, version, encryption,
 * forms and attachments. Removal empties the Info dict and deletes /Metadata, then saves with updateMetadata:false
 * so pdf-lib does not re-stamp Producer/ModDate. Pages, fonts and images are untouched. Encrypted files throw —
 * the Unlock PDF tool handles those first.
 */
(function (root) {
  'use strict';
  const M = root.ToolityMeta;
  const lib = () => root.PDFLib;
  const pdfDate = (d) => (d instanceof Date && !isNaN(d) ? M.iso(d) : d ? String(d) : null);

  async function loadDoc(buf) {
    const { PDFDocument } = lib();
    try { return await PDFDocument.load(buf, { updateMetadata: false, ignoreEncryption: false }); }
    catch (e) { if (/encrypted/i.test(e.message)) throw new Error('This PDF is password-protected. Unlock it first with the Unlock PDF tool.'); throw new Error('Could not parse this PDF — it may be damaged or not a PDF.'); }
  }

  M.pdf = {
    async parse(buf, file) {
      const { PDFName, PDFDict, PDFStream, decodePDFRawStream, PDFRawStream } = lib();
      const doc = await loadDoc(buf);
      const info = M.section('Document Info'), file_ = M.section('File', false), xmp = [];
      const get = (fn) => { try { return doc[fn](); } catch (e) { return null; } };
      M.add(info, 'Title', get('getTitle')); M.add(info, 'Author', get('getAuthor')); M.add(info, 'Subject', get('getSubject'));
      M.add(info, 'Keywords', (get('getKeywords') || '')); M.add(info, 'Creator', get('getCreator')); M.add(info, 'Producer', get('getProducer'));
      M.add(info, 'Created', pdfDate(get('getCreationDate'))); M.add(info, 'Modified', pdfDate(get('getModificationDate')));
      // Any non-standard Info keys (e.g. /Company, /SourceModified)
      const infoRef = doc.context.trailerInfo.Info, infoDict = infoRef ? doc.context.lookup(infoRef) : null;
      if (infoDict instanceof PDFDict) for (const [k, v] of infoDict.entries()) { const key = k.decodeText ? k.decodeText() : String(k).slice(1); if (!/^(Title|Author|Subject|Keywords|Creator|Producer|CreationDate|ModDate|Trapped)$/.test(key)) M.add(info, key, v.decodeText ? v.decodeText() : String(v)); }
      // XMP
      const metaRef = doc.catalog.get(PDFName.of('Metadata')); const stream = metaRef ? doc.context.lookup(metaRef) : null;
      if (stream instanceof PDFStream) { try { const bytes = stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents(); xmp.push(M.parseXmp(M.text(bytes))); if (!xmp[0].rows.length) M.add(xmp[0], 'XMP packet', `${M.fmtBytes(bytes.length)} (no readable fields)`); } catch (e) { const s = M.section('XMP'); M.add(s, 'XMP packet', 'present (could not decode)'); xmp.push(s); } }
      M.add(file_, 'Format', `PDF ${M.ascii(new DataView(buf), 5, 3).replace(/[^\d.]/g, '') || ''}`.trim());
      M.add(file_, 'Size', M.fmtBytes(buf.byteLength));
      M.add(file_, 'Pages', doc.getPageCount());
      const pg = doc.getPage(0); const { width, height } = pg.getSize(); M.add(file_, 'Page Size', `${(width / 72 * 25.4).toFixed(0)} × ${(height / 72 * 25.4).toFixed(0)} mm`);
      M.add(file_, 'Encrypted', doc.isEncrypted ? 'Yes' : 'No');
      if (doc.catalog.has(PDFName.of('AcroForm'))) M.add(file_, 'Interactive Form', 'Yes');
      const names = doc.catalog.lookup(PDFName.of('Names')); if (names instanceof PDFDict && names.has(PDFName.of('EmbeddedFiles'))) M.add(file_, 'Attachments', 'Yes (kept)');
      return M.finish([info, ...xmp, file_], { kind: 'pdf' });
    },
    async strip(buf) {
      const { PDFName, PDFDict } = lib();
      const doc = await loadDoc(buf);
      const infoRef = doc.context.trailerInfo.Info, infoDict = infoRef ? doc.context.lookup(infoRef) : null;
      if (infoDict instanceof PDFDict) for (const k of [...infoDict.keys()]) infoDict.delete(k);
      doc.catalog.delete(PDFName.of('Metadata'));
      doc.catalog.delete(PDFName.of('PieceInfo')); // app-private blobs (Illustrator/InDesign), often hold file paths
      const out = await doc.save({ updateMetadata: false, useObjectStreams: false });
      return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
    },
  };
})(window);
