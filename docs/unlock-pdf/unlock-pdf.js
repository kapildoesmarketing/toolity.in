/* Unlock PDF — Toolity.in. Decrypts a PDF with a known password, or strips owner-only restrictions. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  // state: 'open' (not encrypted) | 'restricted' (encrypted, empty user password) | 'locked' (needs password)
  const S = { file: null, bytes: null, pages: 0, state: '', out: null };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Unlock PDF'; };

  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting unlock';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const msg = { '': 'Drop a PDF to begin', open: 'This PDF is not locked — nothing to remove', restricted: 'Restricted only (no password needed) · press Unlock', locked: $('opt-pw').value ? 'Password entered · press Unlock' : 'Password required to open this PDF' }[S.state];
    $('result-badge').textContent = msg;
    $('btn-compress').disabled = !(S.state === 'restricted' || (S.state === 'locked' && $('opt-pw').value));
    $('pw-row').hidden = S.state !== 'locked';
  }

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Checking…'; $('opt-pw').value = '';
    try {
      if (file.size > P.MAX_FILE) throw new Error(`That file is ${formatBytes(file.size)} — the limit is ${Math.round(P.MAX_FILE / 1048576)} MB.`);
      await P.lib();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const lib = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      let state = lib.isEncrypted ? 'restricted' : 'open', doc = null;
      try { doc = await P.open(bytes); } catch (e) { if (!e.needsPassword) throw e; state = 'locked'; }
      Object.assign(S, { file, bytes, pages: doc ? doc.numPages : 0, state, out: null });
      $('dropzone').hidden = true;
      if (doc) { await P.render(doc, 1, 1.2, $('source-canvas')); $('source-canvas').hidden = false; $('locked-state').hidden = true; doc.destroy(); }
      else { $('source-canvas').hidden = true; $('locked-state').hidden = false; }
      $('source-badge').textContent = `${{ open: 'Not encrypted', restricted: 'Owner-restricted', locked: 'Password-protected' }[state]} · ${formatBytes(file.size)}`;
      invalidate(); if (state === 'locked') $('opt-pw').focus();
    } catch (e) { console.warn(e); showError(e.message.includes('limit') ? e.message : "Couldn't read that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });
  $('opt-pw').addEventListener('input', () => { showError(''); invalidate(); });
  $('opt-show').addEventListener('change', (e) => { $('opt-pw').type = e.target.checked ? 'text' : 'password'; });

  async function unlock() {
    // Designed by Kapil Pidhwani: loading with the password decrypts; saving writes a plain file. Owner-restricted files decrypt with the empty user password.
    const { PDFName, PDFDict } = window.PDFLib, doc = await P.loadLib(S.bytes, S.state === 'locked' ? $('opt-pw').value : '');
    // pdf-lib keeps the old Encrypt dict, and the source's /Type /XRef stream (whose dict still says /Encrypt) as a raw PDFInvalidObject;
    // strict parsers (pdf-lib itself included) read that back as trailer data and call the result encrypted. Drop both.
    const F = PDFName.of('Filter'), latin1 = new TextDecoder('latin1');
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj.data instanceof Uint8Array && /\/Type\s*\/XRef/.test(latin1.decode(obj.data))) doc.context.delete(ref);
      else if (obj instanceof PDFDict && obj.get(F) === PDFName.of('Standard') && obj.has(PDFName.of('O')) && obj.has(PDFName.of('U'))) doc.context.delete(ref);
    }
    return new Blob([await doc.save({ useObjectStreams: false })], { type: 'application/pdf' });
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Decrypting…'); showError('');
    try {
      S.out = await unlock(); progress(0.7, 'Verifying…');
      const bytes = new Uint8Array(await S.out.arrayBuffer()), doc = await P.open(bytes); S.pages = doc.numPages;
      if (S.state === 'locked') { await P.render(doc, 1, 1.2, $('source-canvas')); $('source-canvas').hidden = false; $('locked-state').hidden = true; }
      await P.render(doc, 1, 1.2, $('output-canvas')); $('output-canvas').hidden = false; $('output-empty').hidden = true; doc.destroy();
      $('output-badge').textContent = `${S.pages} page${S.pages === 1 ? '' : 's'} · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Unlocked · opens without a password · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That password is not correct.' : e.message || 'Unlock failed.'); progress(0); S.out = null; $('btn-compress').disabled = false; }
    finally { setBusy($('tool-card'), false); setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'unlocked')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: unlocked (${formatBytes(S.out.size)})`, 'Summary copied'));
  function reset() {
    Object.assign(S, { file: null, bytes: null, pages: 0, state: '', out: null });
    $('dropzone').hidden = false; $('locked-state').hidden = true; $('opt-pw').value = '';
    ['source-canvas', 'output-canvas'].forEach((id) => { const c = $(id); c.hidden = true; c.width = c.width; }); $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__upd = { S, load, run, unlock };
})();
