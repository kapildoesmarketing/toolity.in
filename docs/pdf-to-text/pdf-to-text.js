/* PDF to Text — Toolity.in. PDF.js text layer → reading-order paragraphs or raw lines. No OCR by design. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);

  /* Designed by Kapil Pidhwani: group text items into lines by baseline (±½ font height), sort lines top→bottom then items left→right,
   * join lines into paragraphs when the vertical gap is small. Good for single-column prose; multi-column pages can interleave (FAQ says so).
   * Upgrade path: column clustering by x-gap histogram. */
  function pageText(content, mode) {
    const items = content.items.filter((it) => it.str !== undefined && it.transform);
    if (!items.length) return '';
    const rows = [];
    for (const it of items) {
      const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10;
      let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.5));
      if (!row) { row = { y, h, items: [] }; rows.push(row); }
      row.items.push({ x, str: it.str, w: it.width || 0, h });
    }
    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map((r) => {
      r.items.sort((a, b) => a.x - b.x);
      let s = '', prevEnd = null;
      for (const it of r.items) {
        if (prevEnd !== null && it.x - prevEnd > it.h * 0.25 && !/^\s/.test(it.str) && !/\s$/.test(s)) s += ' ';
        s += it.str; prevEnd = it.x + it.w;
      }
      return { text: s.replace(/\s+/g, ' ').trim(), y: r.y, h: r.h };
    }).filter((l) => l.text);
    if (mode === 'lines') return lines.map((l) => l.text).join('\n');
    let out = '';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], prev = lines[i - 1];
      if (!prev) { out = l.text; continue; }
      const gap = prev.y - l.y, para = gap > prev.h * 1.6 || /[.!?:]$/.test(prev.text) && /^[A-Z•\-–\d]/.test(l.text) && gap > prev.h * 1.25;
      if (para) out += '\n\n' + l.text;
      else if (/\w-$/.test(out)) out = out.slice(0, -1) + l.text; // rejoin hyphenated word
      else out += ' ' + l.text;
    }
    return out;
  }

  P.mount({
    actionLabel: 'Extract Text', suffix: 'text', ext: 'txt', source: 'canvas',
    ready(S) { const r = $('opt-pages').value.trim(); if (r) { try { P.parseRange(r, S.pages); } catch (e) { return e.message; } } return true; },
    summary: () => `${$('opt-mode').value === 'lines' ? 'Raw lines' : 'Reading order'} · ${$('opt-breaks').checked ? 'page markers' : 'no markers'} · ${$('opt-pages').value.trim() || 'all pages'}`,
    async run(S, { onProgress }) {
      const idx = $('opt-pages').value.trim() ? P.parseRange($('opt-pages').value, S.pages) : [...Array(S.pages).keys()];
      const mode = $('opt-mode').value, breaks = $('opt-breaks').checked, parts = [];
      let chars = 0;
      for (let k = 0; k < idx.length; k++) {
        const page = await S.doc.getPage(idx[k] + 1), txt = pageText(await page.getTextContent(), mode);
        chars += txt.length;
        parts.push((breaks && idx.length > 1 ? `----- Page ${idx[k] + 1} -----\n` : '') + txt);
        onProgress((k + 1) / idx.length, 'Reading'); await new Promise((r) => setTimeout(r, 0));
      }
      if (!chars) throw new Error('This PDF has no text layer — it is a scanned image. OCR is not part of this tool.');
      const text = parts.join(breaks ? '\n\n' : '\n\n').trim();
      const words = (text.match(/\S+/g) || []).length;
      return { blob: new Blob([text], { type: 'text/plain;charset=utf-8' }), text, label: `${words.toLocaleString()} words · ${chars.toLocaleString()} chars`, note: `Extracted ${idx.length} of ${S.pages} pages · ${words.toLocaleString()} words` };
    }
  });
})();
