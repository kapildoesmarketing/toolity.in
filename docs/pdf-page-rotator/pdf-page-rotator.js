/* PDF Page Rotator — Toolity.in. Per-page /Rotate edits with pdf-lib (lossless); live thumbnails via PDF.js. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  const S = { file: null, bytes: null, doc: null, pages: 0, rot: [], out: null };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Apply Rotation'; };
  const changedCount = () => S.rot.filter(Boolean).length;

  function paintThumb(i) {
    const item = $('page-grid').children[i]; if (!item) return;
    item.querySelector('canvas').style.transform = `rotate(${S.rot[i]}deg)`;
    item.classList.toggle('is-selected', S.rot[i] !== 0);
  }
  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting apply';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const n = changedCount(); $('result-badge').textContent = n ? `${n} page${n === 1 ? '' : 's'} rotated · press Apply` : `${S.pages} pages · nothing rotated yet`;
    $('btn-compress').disabled = !n;
  }
  const turn = (i, d) => { S.rot[i] = ((S.rot[i] + d) % 360 + 360) % 360; paintThumb(i); invalidate(); };

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      if (S.doc) S.doc.destroy();
      Object.assign(S, { file, bytes: r.bytes, doc: r.doc, pages: r.pages, rot: new Array(r.pages).fill(0), out: null });
      $('dropzone').hidden = true; $('page-grid').hidden = false;
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
      await P.thumbs(r.doc, $('page-grid'), { actions: (n, item, act) => {
        for (const [icon, label, d] of [['lucide:rotate-ccw', 'Rotate left', -90], ['lucide:rotate-cw', 'Rotate right', 90]]) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-thumb-btn'; b.title = `${label} (page ${n})`; b.setAttribute('aria-label', `${label}, page ${n}`);
          b.innerHTML = `<iconify-icon icon="${icon}" width="14" height="14"></iconify-icon>`; b.addEventListener('click', () => turn(n - 1, d)); act.append(b);
        }
      } });
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  bindSegmented($('seg-all'), (v) => {
    if (!S.pages) return;
    const d = Number(v); S.rot = S.rot.map((r) => (d === 0 ? 0 : ((r + d) % 360 + 360) % 360));
    S.rot.forEach((_, i) => paintThumb(i)); invalidate();
    $('seg-all').querySelectorAll('.seg-pill').forEach((b) => b.classList.remove('active'));
  });

  async function apply() {
    const { degrees } = window.PDFLib, doc = await P.loadLib(S.bytes);
    doc.getPages().forEach((p, i) => { if (S.rot[i]) p.setRotation(degrees((p.getRotation().angle + S.rot[i]) % 360)); });
    return new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
  }
  async function run() {
    if (!S.bytes || !changedCount() || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Rotating…'); showError('');
    try {
      await P.lib(); S.out = await apply();
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas')); $('output-empty').hidden = true;
      $('output-badge').textContent = `${S.pages} pages · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Rotated ${changedCount()} of ${S.pages} pages · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message || 'Rotation failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !changedCount(); setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'rotated')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: rotated ${changedCount()} of ${S.pages} pages`, 'Summary copied'));
  function reset() {
    if (S.doc) S.doc.destroy();
    Object.assign(S, { file: null, bytes: null, doc: null, pages: 0, rot: [], out: null });
    $('page-grid').replaceChildren(); $('page-grid').hidden = true; $('dropzone').hidden = false;
    const c = $('output-canvas'); c.hidden = true; c.width = c.width; $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; $('result-badge').textContent = 'Drop a PDF to begin'; $('result-badge').classList.remove('is-win');
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-compress').disabled = true; showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  window.__pdfr = { S, load, run, turn };
})();
