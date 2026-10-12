/* PDF Cropper — Toolity.in. Drag box over a PDF.js page; pdf-lib setCropBox (lossless). Box is stored as page fractions so it applies to any page size. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const seg = (id) => (document.querySelector(`#${id} .seg-pill.active`) || {}).dataset?.value;
  const box = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }; // fractions of the visual page, origin top-left
  let cur = 1, vp = null, api = null;
  const MIN = 0.03;

  function ratio() { const v = $('opt-ratio').value; return v === 'free' ? 0 : v === 'a' ? 1 / 1.4142 : v === 'letter' ? 8.5 / 11 : 1 / Number(v); } // w/h in *visual* units
  function paintBox() {
    const el = $('crop-box'), c = $('source-canvas');
    el.style.left = `${box.x * c.clientWidth}px`; el.style.top = `${box.y * c.clientHeight}px`; el.style.width = `${box.w * c.clientWidth}px`; el.style.height = `${box.h * c.clientHeight}px`;
    el.setAttribute('aria-label', `Crop area ${Math.round(box.w * 100)} × ${Math.round(box.h * 100)} % of the page`);
  }
  function clamp() {
    box.w = Math.min(1, Math.max(MIN, box.w)); box.h = Math.min(1, Math.max(MIN, box.h));
    box.x = Math.min(1 - box.w, Math.max(0, box.x)); box.y = Math.min(1 - box.h, Math.max(0, box.y));
  }
  async function showPage(S, n) {
    cur = Math.min(Math.max(1, n), S.pages);
    const r = await P.render(S.doc, cur, 1.2, $('source-canvas')); vp = r.vp;
    $('crop-page-label').textContent = `Page ${cur} of ${S.pages}`; $('btn-prev').disabled = cur <= 1; $('btn-next').disabled = cur >= S.pages;
    paintBox();
  }

  /* pointer drag: move the box, or resize from a corner handle; aspect lock applies while resizing */
  (function bindDrag() {
    const stage = $('crop-stage'); let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.pdf-crop-handle'), inBox = e.target.closest('#crop-box');
      if (!h && !inBox) return;
      const c = $('source-canvas').getBoundingClientRect();
      drag = { mode: h ? h.dataset.h : 'move', sx: e.clientX, sy: e.clientY, start: { ...box }, cw: c.width, ch: c.height };
      stage.setPointerCapture(e.pointerId); e.preventDefault();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.sx) / drag.cw, dy = (e.clientY - drag.sy) / drag.ch, s = drag.start;
      if (drag.mode === 'move') { box.x = s.x + dx; box.y = s.y + dy; }
      else {
        const west = drag.mode.includes('w'), north = drag.mode.includes('n');
        let x = s.x, y = s.y, w = s.w, h = s.h;
        if (west) { x = s.x + dx; w = s.w - dx; } else w = s.w + dx;
        if (north) { y = s.y + dy; h = s.h - dy; } else h = s.h + dy;
        const r = ratio();
        if (r && vp) { // keep w/h = r in page units: fractions × (vp.width / vp.height)
          const pageR = vp.width / vp.height; h = (w * pageR) / r; if (north) y = s.y + s.h - h;
        }
        Object.assign(box, { x, y, w, h });
      }
      clamp(); paintBox();
    });
    const up = () => { if (drag) { drag = null; api.invalidate(); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  })();

  /* Auto-detect content bounds on the current page (non-white pixels) */
  async function autoDetect(S) {
    const { c } = await P.render(S.doc, cur, 0.6), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) { const k = (j * c.width + i) * 4; if (d[k] < 235 || d[k + 1] < 235 || d[k + 2] < 235) { if (i < minX) minX = i; if (i > maxX) maxX = i; if (j < minY) minY = j; if (j > maxY) maxY = j; } }
    if (maxX < 0) { api.showError('This page looks blank — nothing to snap to.'); return; }
    const pad = 6; box.x = Math.max(0, minX - pad) / c.width; box.y = Math.max(0, minY - pad) / c.height; box.w = Math.min(c.width, maxX + pad) / c.width - box.x; box.h = Math.min(c.height, maxY + pad) / c.height - box.y;
    clamp(); paintBox(); api.invalidate(); api.showError('');
  }

  api = P.mount({
    actionLabel: 'Crop', suffix: 'cropped', source: 'custom',
    async onLoad(S) { $('crop-stage').hidden = false; $('crop-pager').hidden = false; Object.assign(box, { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }); await showPage(S, 1); },
    ready(S) { if (seg('seg-scope') === 'range') { try { P.parseRange($('opt-pages').value, S.pages); } catch (e) { return e.message; } } return true; },
    onSetting(el) { $('opt-pages').closest('.control-item').hidden = seg('seg-scope') !== 'range'; if (el.id === 'opt-ratio' && ratio() && vp) { box.h = (box.w * (vp.width / vp.height)) / ratio(); clamp(); paintBox(); } },
    summary: () => `Apply to ${seg('seg-scope') === 'this' ? 'this page' : seg('seg-scope') === 'range' ? 'a range' : 'all pages'} · ${$('opt-ratio').selectedOptions[0].textContent.toLowerCase()} · ${Math.round(box.w * 100)}×${Math.round(box.h * 100)} %`,
    onReset() { $('crop-stage').hidden = true; $('crop-pager').hidden = true; vp = null; $('opt-pages').closest('.control-item').hidden = true; },
    async run(S) {
      const doc = await P.loadLib(S.bytes), scope = seg('seg-scope');
      const idx = scope === 'this' ? [cur - 1] : scope === 'range' ? P.parseRange($('opt-pages').value, S.pages) : doc.getPageIndices();
      for (const i of idx) {
        const page = doc.getPage(i), pg = await S.doc.getPage(i + 1), v = pg.getViewport({ scale: 1 });
        // Designed by Kapil Pidhwani: PDF.js viewport maps visual (top-left origin, rotation applied) → PDF user space, so one call handles /Rotate.
        const [x1, y1] = v.convertToPdfPoint(box.x * v.width, box.y * v.height), [x2, y2] = v.convertToPdfPoint((box.x + box.w) * v.width, (box.y + box.h) * v.height);
        const mb = page.getMediaBox(), cx = Math.min(x1, x2) + mb.x, cy = Math.min(y1, y2) + mb.y, cw = Math.abs(x2 - x1), ch = Math.abs(y2 - y1);
        if (cw < 20 || ch < 20) throw new Error('The crop box is too small — make it at least 20 pt wide and tall.');
        page.setCropBox(cx, cy, cw, ch);
      }
      const blob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, firstPage: idx[0] + 1, note: `Cropped ${idx.length} of ${S.pages} pages to ${Math.round(box.w * 100)}×${Math.round(box.h * 100)} % · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
  $('opt-pages').closest('.control-item').hidden = true;
  $('btn-prev').addEventListener('click', () => api.S.doc && showPage(api.S, cur - 1));
  $('btn-next').addEventListener('click', () => api.S.doc && showPage(api.S, cur + 1));
  $('btn-auto').addEventListener('click', () => api.S.doc && autoDetect(api.S));
  window.addEventListener('resize', () => { if (api.S.doc) paintBox(); });
  window.__crop = { box, api };
})();
