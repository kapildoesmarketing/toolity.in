/* Organise PDF — Toolity.in. Reorder (drag or arrows), rotate and delete pages in a thumbnail grid, then rebuild the PDF. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  // items: current order of { src (0-based source page), rot (0/90/180/270), del }. nodes[src] = thumbnail element.
  const S = { file: null, bytes: null, doc: null, pages: 0, items: [], nodes: [], out: null, drag: -1 };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Apply Changes'; };
  const fresh = () => Array.from({ length: S.pages }, (_, i) => ({ src: i, rot: 0, del: false }));
  const changed = () => S.items.some((it, i) => it.src !== i || it.rot || it.del);
  const kept = () => S.items.filter((it) => !it.del);

  function paint() {
    const grid = $('page-grid');
    S.items.forEach((it, pos) => {
      const el = S.nodes[it.src]; grid.append(el);
      el.classList.toggle('is-deleted', it.del); el.classList.toggle('is-selected', !it.del && (it.rot !== 0 || it.src !== pos));
      el.querySelector('canvas').style.transform = `rotate(${it.rot}deg)`;
      el.querySelector('.pdf-thumb-num').textContent = it.del ? `was ${it.src + 1} · deleted` : it.src === pos ? `${pos + 1}` : `${pos + 1} · was ${it.src + 1}`;
      el.querySelector('[data-act="del"] iconify-icon').setAttribute('icon', it.del ? 'lucide:undo-2' : 'lucide:x');
    });
    invalidate();
  }
  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting apply';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const k = kept().length, d = S.pages - k, r = S.items.filter((it) => !it.del && it.rot).length, moved = S.items.some((it, i) => !it.del && it.src !== i);
    const bits = [moved && 'reordered', r && `${r} rotated`, d && `${d} deleted`].filter(Boolean);
    $('result-badge').textContent = !S.pages ? 'Drop a PDF to begin' : !changed() ? `${S.pages} pages · nothing changed yet` : !k ? 'Keep at least one page' : `${k} pages · ${bits.join(' · ')} · press Apply`;
    $('btn-compress').disabled = !(S.pages && changed() && k);
  }

  const posOf = (src) => S.items.findIndex((it) => it.src === src);
  function move(src, to) { const from = posOf(src); if (to < 0 || to >= S.items.length || to === from) return; const [it] = S.items.splice(from, 1); S.items.splice(to, 0, it); paint(); }

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      if (S.doc) S.doc.destroy();
      Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages, out: null }); S.items = fresh();
      $('dropzone').hidden = true; $('page-grid').hidden = false;
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
      S.nodes = await P.thumbs(r.doc, $('page-grid'), { actions: (n, item, act) => {
        const src = n - 1; item.draggable = true;
        for (const [icon, label, key] of [['lucide:arrow-left', 'Move left', 'left'], ['lucide:rotate-cw', 'Rotate', 'rot'], ['lucide:x', 'Delete', 'del'], ['lucide:arrow-right', 'Move right', 'right']]) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-thumb-btn'; b.dataset.act = key; b.title = `${label} (page ${n})`; b.setAttribute('aria-label', `${label}, page ${n}`);
          b.innerHTML = `<iconify-icon icon="${icon}" width="14" height="14"></iconify-icon>`;
          b.addEventListener('click', () => {
            const it = S.items[posOf(src)];
            if (key === 'left') move(src, posOf(src) - 1); else if (key === 'right') move(src, posOf(src) + 1);
            else if (key === 'rot') { it.rot = (it.rot + 90) % 360; paint(); } else { it.del = !it.del; paint(); }
          });
          act.append(b);
        }
        item.addEventListener('dragstart', (e) => { S.drag = src; item.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(src)); });
        item.addEventListener('dragend', () => { S.drag = -1; item.classList.remove('is-dragging'); });
        item.addEventListener('dragover', (e) => { if (S.drag >= 0) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
        item.addEventListener('drop', (e) => {
          e.preventDefault(); if (S.drag < 0 || S.drag === src) return;
          const r = item.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2, from = posOf(S.drag);
          let to = posOf(src) + (after ? 1 : 0); if (from < to) to--; move(S.drag, to);
        });
      } });
      paint();
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  bindSegmented($('seg-quick'), (v) => {
    if (S.pages) { if (v === 'reverse') S.items.reverse(); else if (v === 'restore') S.items.forEach((it) => { it.del = false; }); else S.items = fresh(); paint(); }
    $('seg-quick').querySelectorAll('.seg-pill').forEach((b) => b.classList.remove('active'));
  });

  async function apply() {
    const { PDFDocument, degrees } = window.PDFLib, src = await P.loadLib(S.bytes), out = await PDFDocument.create(), list = kept();
    const pages = await out.copyPages(src, list.map((it) => it.src));
    pages.forEach((p, i) => { if (list[i].rot) p.setRotation(degrees((p.getRotation().angle + list[i].rot) % 360)); out.addPage(p); });
    return new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Rebuilding…'); showError('');
    try {
      await P.lib(); S.out = await apply(); progress(0.8, 'Rendering…');
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas')); $('output-empty').hidden = true;
      const k = kept().length; $('output-badge').textContent = `${k} page${k === 1 ? '' : 's'} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Organised · ${k} of ${S.pages} pages kept · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message || 'Could not rebuild the PDF.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !(changed() && kept().length); setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'organised')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: new page order ${kept().map((it) => it.src + 1).join(', ')}`, 'Page order copied'));
  function reset() {
    if (S.doc) S.doc.destroy();
    Object.assign(S, { file: null, bytes: null, doc: null, pages: 0, items: [], nodes: [], out: null, drag: -1 });
    $('page-grid').replaceChildren(); $('page-grid').hidden = true; $('dropzone').hidden = false;
    const c = $('output-canvas'); c.hidden = true; c.width = c.width; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__opd = { S, load, run, move, apply };
})();
