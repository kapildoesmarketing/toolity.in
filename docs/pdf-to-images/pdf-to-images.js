/* PDF to Images — Toolity.in. PDF.js renders each page at the chosen dpi; one image downloads directly, several are zipped. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const EXT = { png: 'png', jpeg: 'jpg', webp: 'webp' };
  let firstUrl = '';
  const T = P.mount({
    actionLabel: 'Convert', suffix: 'pages', ext: 'zip', source: 'canvas',
    ready(S) { const r = $('opt-pages').value.trim(); if (r) { try { P.parseRange(r, S.pages); } catch (e) { return e.message; } } return true; },
    summary: () => `${$('opt-format').selectedOptions[0].textContent.split(' ·')[0]} · ${$('opt-dpi').value} dpi · ${$('opt-pages').value.trim() || 'all pages'}`,
    onSetting(el) { if (el.id === 'opt-format') $('opt-quality').closest('.control-item').hidden = el.value === 'png'; },
    onReset() { if (firstUrl) URL.revokeObjectURL(firstUrl); firstUrl = ''; $('opt-quality').closest('.control-item').hidden = true; },
    async run(S, { onProgress }) {
      const fmt = $('opt-format').value, dpi = Number($('opt-dpi').value), q = Number($('opt-quality').value) / 100;
      const pages = $('opt-pages').value.trim() ? P.parseRange($('opt-pages').value, S.pages) : undefined;
      const items = await P.rasterize(S.doc, { dpi, type: `image/${fmt}`, quality: q, pages, onProgress: (p) => onProgress(p, 'Rendering') });
      const stem = S.file.name.replace(/\.pdf$/i, ''), pad = String(S.pages).length;
      if (firstUrl) URL.revokeObjectURL(firstUrl); firstUrl = URL.createObjectURL(items[0].blob);
      const total = items.reduce((s, it) => s + it.blob.size, 0);
      if (items.length === 1) { T.T.ext = EXT[fmt]; return { blob: items[0].blob, imageUrl: firstUrl, label: `1 image · ${window.Toolity.formatBytes(total)}`, note: `Page ${items[0].index + 1} → ${EXT[fmt].toUpperCase()} at ${dpi} dpi` }; }
      if (!window.JSZip) throw new Error('ZIP library is still loading — try again in a second.');
      T.T.ext = 'zip'; const zip = new window.JSZip();
      items.forEach((it) => zip.file(`${stem}-page-${String(it.index + 1).padStart(pad, '0')}.${EXT[fmt]}`, it.blob));
      const blob = await zip.generateAsync({ type: 'blob', compression: fmt === 'png' ? 'STORE' : 'STORE' }, (m) => onProgress(m.percent / 100, 'Zipping'));
      return { blob, imageUrl: firstUrl, list: items.slice(0, 8).map((it) => `${stem}-page-${String(it.index + 1).padStart(pad, '0')}.${EXT[fmt]} · ${window.Toolity.formatBytes(it.blob.size)}`).concat(items.length > 8 ? [`… ${items.length - 8} more`] : []), label: `${items.length} images · ${window.Toolity.formatBytes(total)}`, note: `${items.length} pages → ${EXT[fmt].toUpperCase()} at ${dpi} dpi · ZIP ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
  $('opt-quality').closest('.control-item').hidden = true;
  window.__p2i = T;
})();
