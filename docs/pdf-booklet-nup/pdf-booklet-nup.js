/* Booklet & N-up Imposition — Toolity.in. Booklet: saddle-stitch sheet order (pad to ×4), front/back 2-up, back rotated 180° for long-edge
 * duplex. N-up: 2/4/6/9/16 cells, row or column fill. Halve: each page copied twice with a left/right media box (exact vector crop).
 * Pages are embedded as forms (embedPages) and scaled into cells with the same rotation handling as PDF Page Resizer. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, { formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const seg = (id) => (document.querySelector(`#${id} .seg-pill.active`) || {}).dataset?.value;
  const mode = () => seg('seg-mode'), mm = P.mm;
  const GRID = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4] }; // [cols, rows] on a landscape-ish sheet; swapped if the sheet is portrait
  const srcSize = (S) => S.srcSize || [595.28, 841.89];
  function sheet(S) { // [w, h] in points. Auto = cells exactly the source page size (A5 pages, 2-up → A4 landscape; 4-up → A3 portrait)
    const p = $('opt-paper').value, n = mode() === 'booklet' ? 2 : Number($('opt-nup').value), [c, r] = GRID[n];
    if (p === 'custom') { const w = Number($('opt-w').value), h = Number($('opt-h').value); if (!(w >= 20 && h >= 20)) throw new Error('Enter a custom width and height of at least 20 mm.'); return [mm(w), mm(h)]; }
    if (p === 'auto') { const [sw, sh] = srcSize(S); return [sw * c, sh * r]; }
    const [a, b] = P.PAPER[p], lo = Math.min(a, b), hi = Math.max(a, b); return c > r ? [hi, lo] : [lo, hi];
  }
  /* booklet sheet order for n pages (padded): [[front-left, front-right], [back-left, back-right]] per sheet, 1-based, 0 = blank */
  function bookletOrder(n, rtl) {
    const total = Math.ceil(n / 4) * 4, sheets = [];
    for (let s = 0; s < total / 4; s++) { const a = total - 2 * s, b = 1 + 2 * s; sheets.push([[a > n ? 0 : a, b], [b + 1, a - 1 > n ? 0 : a - 1]]); }
    if (rtl) sheets.forEach((sh) => sh.forEach((side) => side.reverse()));
    return { sheets, total };
  }
  const draw = (page, ep, rot, x0, y0, cw, ch, border) => { // fit the (visual) page into the cell, centred; same maths as Page Resizer
    const vw = rot % 180 ? ep.height : ep.width, vh = rot % 180 ? ep.width : ep.height, s = Math.min(cw / vw, ch / vh), dw = vw * s, dh = vh * s, bx = x0 + (cw - dw) / 2, by = y0 + (ch - dh) / 2;
    const [x, y] = rot === 90 ? [bx, by + dh] : rot === 180 ? [bx + dw, by + dh] : rot === 270 ? [bx + dw, by] : [bx, by];
    page.drawPage(ep, { x, y, width: ep.width * s, height: ep.height * s, rotate: window.PDFLib.degrees(-rot) });
    if (border) page.drawRectangle({ x: bx, y: by, width: dw, height: dh, borderWidth: 0.5, borderColor: window.PDFLib.rgb(0.6, 0.6, 0.6) });
  };
  const marks = (page, W, H, m) => { const L = mm(5), g = mm(2), c = window.PDFLib.rgb(0, 0, 0); [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(([x, y]) => { const sx = x < W / 2 ? -1 : 1, sy = y < H / 2 ? -1 : 1; page.drawLine({ start: { x: x + sx * g, y }, end: { x: x + sx * (g + L), y }, thickness: 0.4, color: c }); page.drawLine({ start: { x, y: y + sy * g }, end: { x, y: y + sy * (g + L) }, thickness: 0.4, color: c }); }); };
  const rows = () => { const m = mode(); $('row-nup').hidden = m !== 'nup'; $('row-order').hidden = m !== 'nup'; ['row-binding', 'row-duplex'].forEach((id) => { $(id).hidden = m !== 'booklet'; }); $('row-halve').hidden = m !== 'halve'; $('opt-margin').closest('.control-item').hidden = m === 'halve'; $('opt-gutter').closest('.control-item').hidden = m === 'halve'; $('opt-marks').closest('.control-item').hidden = m === 'halve'; $('opt-border').closest('.control-item').hidden = m === 'halve'; };
  rows();

  P.mount({
    actionLabel: 'Impose', suffix: 'imposed', source: 'canvas',
    ready() { try { if (mode() !== 'halve') sheet({}); return true; } catch (e) { return e.message; } },
    onSetting(el) { if (el.id === 'opt-paper') $('row-custom').hidden = el.value !== 'custom'; if (el.id === 'seg-mode') rows(); },
    onReset() { $('row-custom').hidden = true; rows(); },
    summary: (S) => { const m = mode(); const paper = $('opt-paper').value === 'auto' ? 'Auto' : $('opt-paper').value === 'custom' ? 'Custom' : $('opt-paper').value.toUpperCase(); return m === 'booklet' ? `Booklet · ${paper} · ${seg('seg-bind')} · ${seg('seg-duplex')} edge` : m === 'nup' ? `${$('opt-nup').value}-up · ${paper} · ${seg('seg-order') === 'row' ? 'rows' : 'columns'}` : `Split spreads · ${seg('seg-halve') === 'lr' ? 'left first' : 'right first'}`; },
    async onLoad(S) { const p = await S.doc.getPage(1), v = p.getViewport({ scale: 1 }); S.srcSize = [v.width, v.height]; $('source-badge').textContent += ` · ${Math.round(v.width / 72 * 25.4)}×${Math.round(v.height / 72 * 25.4)} mm`; },
    async run(S, { onProgress }) {
      const { PDFDocument } = window.PDFLib, src = await P.loadLib(S.bytes), out = await PDFDocument.create(), m = mode(), n = src.getPageCount();
      const srcPages = src.getPages(), rot = (i) => ((srcPages[i].getRotation().angle % 360) + 360) % 360;
      if (m === 'halve') {
        const rtl = seg('seg-halve') === 'rl', copies = await out.copyPages(src, [...Array(n).keys()].flatMap((i) => [i, i]));
        for (let i = 0; i < n; i++) {
          const [a, b] = [copies[2 * i], copies[2 * i + 1]], { x, y, width, height } = a.getMediaBox(), r = rot(i), land = (r % 180 ? height : width) > (r % 180 ? width : height);
          // split along the long edge of the *visual* page; for rotated pages the halves are stacked in media space
          const halves = land === !(r % 180) ? [[x, y, width / 2, height], [x + width / 2, y, width / 2, height]] : [[x, y + height / 2, width, height / 2], [x, y, width, height / 2]];
          const order = (r === 180 || r === 90) !== rtl ? [1, 0] : [0, 1];
          [a, b].forEach((pg, k) => { const h = halves[order[k]]; pg.setMediaBox(...h); pg.setCropBox(...h); out.addPage(pg); });
          if (i % 20 === 0) { onProgress((i + 1) / n, 'Splitting'); await new Promise((r) => setTimeout(r, 0)); }
        }
        const blob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
        return { blob, note: `${n} spreads → ${2 * n} pages · ${formatBytes(blob.size)}` };
      }
      const [W, H] = sheet(S), margin = mm(Number($('opt-margin').value)), gutter = mm(Number($('opt-gutter').value)), border = $('opt-border').checked, crop = $('opt-marks').checked;
      const embedded = await out.embedPages(srcPages);
      const place = (page, slots, cols, rws) => { const cw = (W - 2 * margin - gutter * (cols - 1)) / cols, ch = (H - 2 * margin - gutter * (rws - 1)) / rws; slots.forEach((pn, k) => { if (!pn) return; const c = k % cols, r = Math.floor(k / cols); draw(page, embedded[pn - 1], rot(pn - 1), margin + c * (cw + gutter), H - margin - (r + 1) * ch - r * gutter, cw, ch, border); }); if (crop) marks(page, W, H, margin); };
      let sheetsOut = 0, note;
      if (m === 'booklet') {
        const { sheets, total } = bookletOrder(n, seg('seg-bind') === 'right'), longEdge = seg('seg-duplex') === 'long';
        for (const [front, back] of sheets) {
          place(out.addPage([W, H]), front, 2, 1);
          const bp = out.addPage([W, H]); place(bp, back, 2, 1); if (longEdge) bp.setRotation(window.PDFLib.degrees(180));
          sheetsOut++; onProgress(sheetsOut / sheets.length, 'Imposing'); await new Promise((r) => setTimeout(r, 0));
        }
        note = `${n} pages → ${sheets.length} sheet${sheets.length === 1 ? '' : 's'} (${sheets.length * 2} sides, ${total - n} blank${total - n === 1 ? '' : 's'} added) · print double-sided, ${seg('seg-duplex')} edge`;
      } else {
        const per = Number($('opt-nup').value); let [cols, rws] = GRID[per]; if ((W < H) !== (cols < rws)) [cols, rws] = [rws, cols];
        const byCol = seg('seg-order') === 'col';
        for (let s = 0; s < n; s += per) {
          const slots = Array.from({ length: per }, (_, k) => { const idx = byCol ? (k % cols) * rws + Math.floor(k / cols) : k; return s + idx < n ? s + idx + 1 : 0; });
          place(out.addPage([W, H]), slots, cols, rws); sheetsOut++; if (sheetsOut % 5 === 0) { onProgress(Math.min(1, (s + per) / n), 'Imposing'); await new Promise((r) => setTimeout(r, 0)); }
        }
        note = `${n} pages → ${sheetsOut} sheet${sheetsOut === 1 ? '' : 's'} at ${per}-up`;
      }
      const blob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, note: `${note} · ${Math.round(W / 72 * 25.4)}×${Math.round(H / 72 * 25.4)} mm · ${formatBytes(blob.size)}` };
    }
  });
  window.__bk = { bookletOrder, sheet, GRID };
})();
