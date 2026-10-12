/* Images to PDF — Toolity.in. JPG/PNG embedded as-is, WebP/other re-encoded via canvas; page size auto or paper; all on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const seg = (id) => (document.querySelector(`#${id} .seg-pill.active`) || {}).dataset?.value;

  function paintList(S) {
    const ul = $('file-list'); ul.replaceChildren();
    S.files.forEach((f, i) => {
      const li = document.createElement('li'); li.className = 'pdf-file';
      const img = document.createElement('img'); img.className = 'pdf-file-thumb'; img.alt = ''; img.src = f.url;
      const name = document.createElement('span'); name.className = 'pdf-file-name'; name.textContent = f.file.name;
      const meta = document.createElement('span'); meta.className = 'pdf-file-meta'; meta.textContent = `${f.w}×${f.h}`;
      const mk = (icon, label, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-thumb-btn'; b.title = label; b.setAttribute('aria-label', `${label} ${f.file.name}`); b.disabled = dis; b.innerHTML = `<iconify-icon icon="${icon}" width="14" height="14"></iconify-icon>`; b.addEventListener('click', fn); return b; };
      li.append(img, name, meta,
        mk('lucide:arrow-up', 'Move up', () => { [S.files[i - 1], S.files[i]] = [S.files[i], S.files[i - 1]]; paintList(S); api.invalidate(); }, i === 0),
        mk('lucide:arrow-down', 'Move down', () => { [S.files[i + 1], S.files[i]] = [S.files[i], S.files[i + 1]]; paintList(S); api.invalidate(); }, i === S.files.length - 1),
        mk('lucide:x', 'Remove', () => { URL.revokeObjectURL(f.url); S.files.splice(i, 1); paintList(S); $('dropzone').hidden = !!S.files.length; $('btn-add-more').hidden = !S.files.length; $('source-badge').textContent = `${S.files.length} file${S.files.length === 1 ? '' : 's'}`; api.invalidate(); }));
      ul.append(li);
    });
    ul.hidden = !S.files.length; $('btn-add-more').hidden = !S.files.length;
  }
  const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Could not read that image.')); im.src = url; });

  const api = P.mount({
    actionLabel: 'Convert to PDF', suffix: 'images', accept: 'image/', multiple: true,
    ready: (S) => (S.files.length ? true : 'Add at least one image'),
    async onFiles(files, S) {
      for (const file of files) {
        if (!/^image\//.test(file.type)) continue;
        const url = URL.createObjectURL(file); const im = await loadImage(url);
        S.files.push({ file, url, w: im.naturalWidth, h: im.naturalHeight });
      }
      if (!S.files.length) throw new Error('Those files are not images — use JPG, PNG or WebP.');
      paintList(S);
    },
    onSetting(el) { if (el.id === 'opt-paper') $('row-custom').hidden = el.value !== 'custom'; },
    summary() {
      const p = $('opt-paper').value, size = p === 'auto' ? 'Auto page size' : p === 'custom' ? `${$('opt-w').value || '?'}×${$('opt-h').value || '?'} mm` : p.toUpperCase();
      return `${size} · ${seg('seg-fit')} · ${$('opt-margin').value} mm margin`;
    },
    onReset(S) { S.files.forEach((f) => URL.revokeObjectURL(f.url)); S.files = []; $('row-custom').hidden = true; $('btn-add-more').hidden = true; },
    async run(S, { onProgress }) {
      const { PDFDocument } = window.PDFLib, pdf = await PDFDocument.create();
      const paper = $('opt-paper').value, orient = seg('seg-orient'), fit = seg('seg-fit'), margin = P.mm(Number($('opt-margin').value)), q = Number($('opt-quality').value) / 100;
      let fixed = null;
      if (paper === 'custom') { const w = Number($('opt-w').value), h = Number($('opt-h').value); if (!(w >= 20 && h >= 20)) throw new Error('Enter a custom width and height of at least 20 mm.'); fixed = [P.mm(w), P.mm(h)]; }
      else if (paper !== 'auto') fixed = P.PAPER[paper];
      for (let i = 0; i < S.files.length; i++) {
        const f = S.files[i]; let bytes = new Uint8Array(await f.file.arrayBuffer()), type = f.file.type;
        if (!/jpeg|png/.test(type)) { // Designed by Kapil Pidhwani: WebP/AVIF/HEIC aren't PDF-native → canvas → JPEG. Ceiling: transparency is flattened to white.
          const im = await loadImage(f.url), c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
          bytes = new Uint8Array(await (await P.canvasBlob(c, 'image/jpeg', q)).arrayBuffer()); type = 'image/jpeg';
        }
        const img = /png/.test(type) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        let pw, ph;
        if (!fixed) { pw = f.w + 2 * margin; ph = f.h + 2 * margin; }
        else { [pw, ph] = fixed; const landscape = orient === 'landscape' || (orient === 'auto' && f.w > f.h); if (landscape !== pw > ph) [pw, ph] = [ph, pw]; }
        const page = pdf.addPage([pw, ph]), bw = pw - 2 * margin, bh = ph - 2 * margin;
        const s = fit === 'fill' ? Math.max(bw / f.w, bh / f.h) : Math.min(bw / f.w, bh / f.h);
        const dw = f.w * s, dh = f.h * s, x = (pw - dw) / 2, y = (ph - dh) / 2;
        if (fit === 'fill' && (dw > bw || dh > bh)) { page.pushOperators(window.PDFLib.pushGraphicsState(), window.PDFLib.rectangle(margin, margin, bw, bh), window.PDFLib.clip(), window.PDFLib.endPath()); page.drawImage(img, { x, y, width: dw, height: dh }); page.pushOperators(window.PDFLib.popGraphicsState()); }
        else page.drawImage(img, { x, y, width: dw, height: dh });
        onProgress((i + 1) / S.files.length, 'Adding');
      }
      const blob = new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, note: `${S.files.length} image${S.files.length === 1 ? '' : 's'} → ${S.files.length} page${S.files.length === 1 ? '' : 's'} · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
  window.__i2p = api;
})();
