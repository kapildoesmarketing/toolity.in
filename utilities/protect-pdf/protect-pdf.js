/* Protect PDF — Toolity.in. AES-256 open password + optional owner password and permission flags. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  const S = { file: null, bytes: null, pages: 0, out: null };
  const PERMS = ['print', 'copy', 'edit', 'annotate'];

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Protect PDF'; };
  const pw = () => $('opt-pw').value, pw2 = () => $('opt-pw2').value;
  function pwProblem() {
    if (pw().length < 4) return pw() ? 'Password needs at least 4 characters.' : 'Enter an open password.';
    if (pw() !== pw2()) return pw2() ? 'The two passwords do not match.' : 'Confirm the password.';
    return '';
  }

  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting password';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    const prob = pwProblem();
    $('result-badge').textContent = !S.pages ? 'Drop a PDF to begin' : prob || `${S.pages} pages · press Protect`;
    $('btn-compress').disabled = !(S.pages && !prob);
    const blocked = PERMS.filter((k) => !$(`opt-${k}`).checked);
    $('settings-summary').textContent = `AES-256 · ${blocked.length ? `${blocked.join(', ')} blocked` : 'all permissions allowed'}${$('opt-owner').value ? ' · owner pw' : ''}`;
  }

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      Object.assign(S, { file, bytes: r.bytes, pages: r.pages, out: null });
      $('dropzone').hidden = true; await P.render(r.doc, 1, 1.2, $('source-canvas')); $('source-canvas').hidden = false; r.doc.destroy();
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate(); $('opt-pw').focus();
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF already has a password — unlock it first, then protect it with a new one.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  ['opt-pw', 'opt-pw2', 'opt-owner'].forEach((id) => $(id).addEventListener('input', invalidate));
  PERMS.forEach((k) => $(`opt-${k}`).addEventListener('change', invalidate));
  $('opt-show').addEventListener('change', (e) => ['opt-pw', 'opt-pw2', 'opt-owner'].forEach((id) => { $(id).type = e.target.checked ? 'text' : 'password'; }));

  /* ── Encrypt ── */
  async function protect() {
    const doc = await P.loadLib(S.bytes), allow = (k) => $(`opt-${k}`).checked;
    // Designed by Kapil Pidhwani: unspecified permissions default to *denied* in pdf-lib, so every flag is passed explicitly.
    // Blank owner password → the library generates a random one, so the user password alone can never lift the flags.
    doc.encrypt({
      userPassword: pw(), ownerPassword: $('opt-owner').value || undefined,
      permissions: { printing: allow('print') ? 'highResolution' : false, copying: allow('copy'), contentAccessibility: true, modifying: allow('edit'), documentAssembly: allow('edit'), annotating: allow('annotate'), fillingForms: allow('annotate') },
    });
    return new Blob([await doc.save({ useObjectStreams: false })], { type: 'application/pdf' });
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0.3, 'Encrypting…'); showError('');
    try {
      await P.lib(); S.out = await protect(); progress(0.7, 'Verifying…');
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas'), pw()); $('output-empty').hidden = true;
      $('output-badge').textContent = `AES-256 · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Protected · opens with your password · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) { console.warn(e); showError(e.message || 'Encryption failed.'); progress(0); }
    finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !!pwProblem(); setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'protected')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: protected with AES-256 (${formatBytes(S.out.size)})`, 'Summary copied'));
  function reset() {
    Object.assign(S, { file: null, bytes: null, pages: 0, out: null });
    $('dropzone').hidden = false; ['source-canvas', 'output-canvas'].forEach((id) => { const c = $(id); c.hidden = true; c.width = c.width; }); $('output-empty').hidden = false;
    ['opt-pw', 'opt-pw2', 'opt-owner'].forEach((id) => { $(id).value = ''; }); PERMS.forEach((k) => { $(`opt-${k}`).checked = true; });
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__ppd = { S, load, run, protect };
})();
