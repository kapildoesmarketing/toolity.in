/* PDF Page Resizer — Toolity.in. Each source page is embedded as a form onto a new page of the target size (vector-safe). All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const seg = (id) => (document.querySelector(`#${id} .seg-pill.active`) || {}).dataset?.value;
  const target = () => {
    const p = $('opt-paper').value;
    if (p !== 'custom') return P.PAPER[p];
    const w = Number($('opt-w').value), h = Number($('opt-h').value);
    if (!(w >= 20 && h >= 20)) throw new Error('Enter a custom width and height of at least 20 mm.');
    return [P.mm(w), P.mm(h)];
  };
  P.mount({
    actionLabel: 'Resize', suffix: 'resized', source: 'canvas',
    ready() { try { target(); return true; } catch (e) { return e.message; } },
    onSetting(el) { if (el.id === 'opt-paper') $('row-custom').hidden = el.value !== 'custom'; },
    onReset() { $('row-custom').hidden = true; },
    summary: () => `${$('opt-paper').value === 'custom' ? 'Custom' : $('opt-paper').value.toUpperCase()} · ${seg('seg-fit')} · ${seg('seg-orient') === 'auto' ? 'keep orientation' : seg('seg-orient')}`,
    async onLoad(S) { const p = await S.doc.getPage(1), v = p.getViewport({ scale: 1 }); $('source-badge').textContent += ` · ${Math.round(v.width / 72 * 25.4)}×${Math.round(v.height / 72 * 25.4)} mm`; },
    async run(S, { onProgress }) {
      const { PDFDocument } = window.PDFLib, src = await P.loadLib(S.bytes), out = await PDFDocument.create();
      const [tw0, th0] = target(), orient = seg('seg-orient'), mode = seg('seg-fit'), n = src.getPageCount();
      const srcPages = src.getPages(), embedded = await out.embedPages(srcPages);
      for (let i = 0; i < n; i++) {
        const ep = embedded[i], rot = ((srcPages[i].getRotation().angle % 360) + 360) % 360;
        // Designed by Kapil Pidhwani: embedPages ignores /Rotate, so the form is unrotated — we rotate it back when drawing and size against the *visual* box.
        const vw = rot % 180 ? ep.height : ep.width, vh = rot % 180 ? ep.width : ep.height;
        let [tw, th] = [tw0, th0]; const landscape = orient === 'landscape' || (orient === 'auto' && vw > vh); if (landscape !== tw > th) [tw, th] = [th, tw];
        const page = out.addPage([tw, th]);
        const s = mode === 'none' ? 1 : mode === 'fill' ? Math.max(tw / vw, th / vh) : Math.min(tw / vw, th / vh);
        const dw = vw * s, dh = vh * s, bx = (tw - dw) / 2, by = (th - dh) / 2;
        // rotate by -rot (viewer rotates clockwise); the rotation pivot is (x,y), so shift the anchor to keep the box at (bx,by)
        const [x, y] = rot === 90 ? [bx, by + dh] : rot === 180 ? [bx + dw, by + dh] : rot === 270 ? [bx + dw, by] : [bx, by];
        page.drawPage(ep, { x, y, width: ep.width * s, height: ep.height * s, rotate: window.PDFLib.degrees(-rot) });
        if (i % 10 === 0) { onProgress((i + 1) / n, 'Placing'); await new Promise((r) => setTimeout(r, 0)); }
      }
      const blob = new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, note: `${n} pages → ${Math.round(tw0 / 72 * 25.4)}×${Math.round(th0 / 72 * 25.4)} mm · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
})();
