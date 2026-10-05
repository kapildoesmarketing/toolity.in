/* PDF Merger — Toolity.in. Combine PDFs in a chosen order with pdf-lib; previews via PDF.js. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  const S = { files: [], out: null, outPages: 0 };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Merge PDFs'; };
  const totalPages = () => S.files.reduce((a, f) => a + f.pages, 0);

  /* ── File list ── */
  function renderList() {
    const ol = $('file-list'); ol.replaceChildren(); ol.hidden = !S.files.length;
    S.files.forEach((f, i) => {
      const li = document.createElement('li'); li.className = 'pdf-file';
      li.innerHTML = `<span class="pdf-file-name" title="${f.file.name.replace(/"/g, '&quot;')}">${i + 1}. ${f.file.name}</span><span class="pdf-file-meta">${f.pages} p · ${formatBytes(f.file.size)}</span>`;
      const mk = (icon, label, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-thumb-btn'; b.title = label; b.setAttribute('aria-label', label); b.disabled = dis; b.innerHTML = `<iconify-icon icon="${icon}" width="14" height="14"></iconify-icon>`; b.addEventListener('click', fn); return b; };
      li.append(mk('lucide:arrow-up', 'Move up', () => move(i, -1), i === 0), mk('lucide:arrow-down', 'Move down', () => move(i, 1), i === S.files.length - 1), mk('lucide:x', 'Remove', () => { S.files.splice(i, 1); changed(); }));
      ol.append(li);
    });
    $('source-badge').textContent = S.files.length ? `${S.files.length} file${S.files.length === 1 ? '' : 's'} · ${totalPages()} pages` : 'No files loaded';
    $('btn-compress').disabled = S.files.length < 2;
  }
  const move = (i, d) => { const t = S.files.splice(i, 1)[0]; S.files.splice(i + d, 0, t); changed(); };
  function changed() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting merge';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    $('result-badge').textContent = S.files.length < 2 ? 'Drop two or more PDFs' : `${S.files.length} files → ${totalPages()} pages · press Merge`;
    renderList();
  }
  async function add(files) {
    if (!files.length) return;
    showError('');
    for (const file of files) {
      try {
        const r = await P.read(file); r.doc.destroy();
        S.files.push({ file, bytes: r.bytes, pages: r.pages });
      } catch (e) { showError(e.needsPassword ? `"${file.name}" is password-protected — unlock it first.` : e.message.includes('limit') ? e.message : `Couldn't open "${file.name}".`); }
    }
    changed();
  }
  bindDropzone($('dropzone'), $('file-input'), add, { accept: 'application/pdf', multiple: true });

  /* ── Merge ── */
  // Designed by Kapil Pidhwani: copies pages file-by-file with a yield between files; outlines/bookmarks are not copied (pdf-lib has no API for it).
  async function merge() {
    await P.lib();
    const { PDFDocument } = window.PDFLib, out = await PDFDocument.create();
    for (let i = 0; i < S.files.length; i++) {
      const f = S.files[i];
      let src; try { src = await P.loadLib(f.bytes); } catch (e) { throw new Error(e.needsPassword ? `"${f.file.name}" is password-protected — unlock it first.` : `Couldn't read "${f.file.name}".`); }
      const pages = await out.copyPages(src, src.getPageIndices()); pages.forEach((p) => out.addPage(p));
      progress((i + 1) / S.files.length, `Adding ${i + 1} of ${S.files.length}…`); await new Promise((r) => setTimeout(r, 0));
    }
    return new Blob([await out.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }
  async function run() {
    if (S.files.length < 2 || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      S.out = await merge(); S.outPages = totalPages();
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas')); $('output-empty').hidden = true;
      $('output-badge').textContent = `${S.outPages} pages · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Merged ${S.files.length} files → ${S.outPages} pages · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.message || 'Merge failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = S.files.length < 2; setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  /* ── Actions ── */
  const name = () => `${S.files[0].file.name.replace(/\.pdf$/i, '')}-merged.pdf`;
  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, name()));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`Merged ${S.files.length} PDFs → ${S.outPages} pages, ${formatBytes(S.out.size)}`, 'Summary copied'));
  function reset() {
    S.files = []; S.out = null; const c = $('output-canvas'); c.hidden = true; c.width = c.width;
    $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting file'; $('result-badge').textContent = 'Drop two or more PDFs'; $('result-badge').classList.remove('is-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; renderList(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  renderList();
  window.__pdfm = { S, add, run, merge };
})();
