/* PDF Page Numberer — Toolity.in. pdf-lib drawText in Helvetica at a chosen slot; honours page /Rotate; all on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const POS = { bc: 'Bottom centre', br: 'Bottom right', bl: 'Bottom left', tc: 'Top centre', tr: 'Top right', tl: 'Top left', bo: 'Bottom outside' };
  const fmt = (n, total) => ({ n: `${n}`, page: `Page ${n}`, of: `${n} / ${total}`, pageof: `Page ${n} of ${total}`, dash: `– ${n} –` })[$('opt-format').value];

  P.mount({
    actionLabel: 'Add Numbers', suffix: 'numbered', source: 'canvas',
    ready(S) { if (Number($('opt-skip').value) >= S.pages) return 'Skipping every page — lower "Skip first pages"'; return true; },
    summary: () => `${POS[$('opt-pos').value]} · "${fmt(Number($('opt-start').value) || 1, 12)}" · from ${$('opt-start').value}`,
    async run(S, { onProgress }) {
      const { StandardFonts, rgb, degrees } = window.PDFLib, doc = await P.loadLib(S.bytes), font = await doc.embedFont(StandardFonts.Helvetica);
      const pos = $('opt-pos').value, start = Number($('opt-start').value) || 0, skip = Math.max(0, Number($('opt-skip').value) || 0);
      const size = Number($('opt-size').value), margin = P.mm(Number($('opt-margin').value)), hex = $('opt-colour').value.slice(1);
      const color = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
      const pages = doc.getPages(), total = pages.length - skip;
      for (let i = skip; i < pages.length; i++) {
        const page = pages[i], n = start + (i - skip), label = fmt(n, start + total - 1), tw = font.widthOfTextAtSize(label, size);
        const { width: W, height: H } = page.getSize(), rot = page.getRotation().angle % 360;
        // Designed by Kapil Pidhwani: work in the *visual* frame (what the reader sees), then rotate back into media-box coordinates.
        const vw = rot % 180 ? H : W, vh = rot % 180 ? W : H;
        let slot = pos === 'bo' ? ((i - skip) % 2 === 0 ? 'br' : 'bl') : pos;
        const top = slot[0] === 't', hx = slot[1] === 'c' ? (vw - tw) / 2 : slot[1] === 'r' ? vw - margin - tw : margin, hy = top ? vh - margin - size * 0.72 : margin;
        // visual (hx,hy) → media-box coords: 0: (x,y) · 90: (W-y, x) · 180: (W-x, H-y) · 270: (y, H-x); the text is rotated by the same angle so it reads upright.
        const [x, y] = rot === 90 ? [W - hy, hx] : rot === 180 ? [W - hx, H - hy] : rot === 270 ? [hy, H - hx] : [hx, hy];
        page.drawText(label, { x, y, size, font, color, rotate: degrees(rot) });
        if (i % 20 === 0) { onProgress((i + 1) / pages.length, 'Numbering'); await new Promise((r) => setTimeout(r, 0)); }
      }
      const blob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, firstPage: skip + 1, note: `Numbered ${total} of ${pages.length} pages · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
})();
