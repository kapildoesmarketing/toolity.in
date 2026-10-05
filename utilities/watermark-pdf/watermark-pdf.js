/* Watermark PDF — Toolity.in. Text or image stamp, centred or tiled, with size/opacity/angle/colour and page range. All on-device. */
(function () {
  'use strict';
  const { copyText, downloadBlob, formatBytes, bindDropzone, bindSegmented, bindShortcuts, setBusy, toast } = window.Toolity;
  const P = window.ToolityPDF;
  const $ = (id) => document.getElementById(id);
  const S = { file: null, bytes: null, pages: 0, type: 'text', text: '', img: null, size: 50, opacity: 30, angle: 45, colour: '#808080', layout: 'centre', range: '', out: null, firstPage: 1 };

  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg; };
  const progress = (p, label) => { $('progress-fill').style.width = `${Math.round(p * 100)}%`; $('btn-compress-label').textContent = label || 'Apply Watermark'; };
  const hasMark = () => (S.type === 'text' ? !!S.text.trim() : !!S.img);

  function invalidate() {
    S.out = null; $('output-canvas').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = 'Awaiting watermark';
    $('btn-download').disabled = true; $('btn-copy').disabled = true; $('result-badge').classList.remove('is-win');
    $('result-badge').textContent = !S.pages ? 'Drop a PDF to begin' : hasMark() ? `${S.pages} pages · press Apply` : S.type === 'text' ? 'Type the watermark text' : 'Choose a watermark image';
    $('btn-compress').disabled = !(S.pages && hasMark());
    $('row-text').hidden = S.type !== 'text'; $('row-image').hidden = S.type === 'text'; $('row-colour').hidden = S.type !== 'text';
    $('settings-summary').textContent = `${S.type === 'text' ? 'Text' : 'Image'} · ${S.layout === 'centre' ? 'centred' : 'tiled'} · ${S.angle}° · ${S.opacity}%`;
  }

  async function load(file) {
    showError(''); $('source-badge').textContent = 'Opening…';
    try {
      const r = await P.read(file);
      Object.assign(S, { file, bytes: r.bytes, pages: r.pages, out: null });
      $('dropzone').hidden = true; await P.render(r.doc, 1, 1.2, $('source-canvas')); $('source-canvas').hidden = false; r.doc.destroy();
      $('source-badge').textContent = `${r.pages} page${r.pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      invalidate();
    } catch (e) { console.warn(e); showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : e.message.includes('limit') ? e.message : "Couldn't open that PDF."); $('source-badge').textContent = 'No file loaded'; }
  }
  bindDropzone($('dropzone'), $('file-input'), load, { accept: 'application/pdf' });

  /* ── Settings ── */
  bindSegmented($('seg-type'), (v) => { S.type = v; invalidate(); });
  bindSegmented($('seg-angle'), (v) => { S.angle = Number(v); invalidate(); });
  bindSegmented($('seg-layout'), (v) => { S.layout = v; invalidate(); });
  $('opt-text').addEventListener('input', (e) => { S.text = e.target.value; invalidate(); });
  $('opt-image').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) { showError('Use a PNG or JPG image.'); e.target.value = ''; return; }
    S.img = { bytes: new Uint8Array(await f.arrayBuffer()), png: f.type === 'image/png', name: f.name }; showError(''); invalidate();
  });
  $('opt-size').addEventListener('input', (e) => { S.size = Number(e.target.value); $('opt-size-val').textContent = `${S.size}%`; invalidate(); });
  $('opt-opacity').addEventListener('input', (e) => { S.opacity = Number(e.target.value); $('opt-opacity-val').textContent = `${S.opacity}%`; invalidate(); });
  $('opt-colour').addEventListener('input', (e) => { S.colour = e.target.value; invalidate(); });
  $('opt-pages').addEventListener('input', (e) => { S.range = e.target.value; invalidate(); if (S.pages && S.range.trim()) { try { P.parseRange(S.range, S.pages); showError(''); } catch (err) { showError(err.message); } } else showError(''); });

  /* ── Stamp ── */
  async function stamp() {
    const { StandardFonts, rgb, degrees } = window.PDFLib, doc = await P.loadLib(S.bytes);
    const idx = S.range.trim() ? P.parseRange(S.range, S.pages) : doc.getPageIndices();
    const hex = S.colour.slice(1), color = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
    const opacity = S.opacity / 100;
    let font, img;
    if (S.type === 'text') {
      // Designed by Kapil Pidhwani: standard Helvetica is WinAnsi-only and the fork drops unknown glyphs silently — check first. Upgrade path: embed a Unicode TTF via fontkit.
      if (!/^[\x20-\x7E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]*$/.test(S.text)) throw new Error('That text has characters the built-in font cannot draw — use Latin letters, or an image.');
      font = await doc.embedFont(StandardFonts.HelveticaBold);
    } else img = S.img.png ? await doc.embedPng(S.img.bytes) : await doc.embedJpg(S.img.bytes);
    for (let k = 0; k < idx.length; k++) {
      const page = doc.getPage(idx[k]), { width: W, height: H } = page.getSize(), rot = page.getRotation().angle % 360;
      // Designed by Kapil Pidhwani: rotated pages (/Rotate 90/270) keep their media-box coordinates — we add the page rotation to the
      // stamp angle and size against the *visual* width, which is what the reader sees. Good enough for scans; odd for mixed-orientation art.
      const visualW = rot % 180 ? H : W, a = S.angle + rot, rad = (a * Math.PI) / 180;
      let tw, th, size;
      if (font) {
        size = 12; tw = font.widthOfTextAtSize(S.text, size); size = Math.max(6, (visualW * S.size) / 100 / (tw / size)); tw = font.widthOfTextAtSize(S.text, size); th = size * 0.72;
      } else { tw = (visualW * S.size) / 100; th = tw * (img.height / img.width); }
      const draw = (cx, cy) => {
        // Rotation happens about the bottom-left origin; shift it so the stamp's centre lands on (cx, cy).
        const x = cx - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad), y = cy - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad);
        if (font) page.drawText(S.text, { x, y, size, font, color, opacity, rotate: degrees(a) });
        else page.drawImage(img, { x, y, width: tw, height: th, opacity, rotate: degrees(a) });
      };
      if (S.layout === 'centre') draw(W / 2, H / 2);
      else {
        const diag = Math.hypot(tw, th), sx = diag * 1.15, sy = Math.max(th * 3, diag * 0.6);
        for (let j = -Math.ceil(H / sy); j <= Math.ceil(H / sy); j++) for (let i = -Math.ceil(W / sx) - 1; i <= Math.ceil(W / sx) + 1; i++) {
          const cx = W / 2 + i * sx + (Math.abs(j) % 2) * sx / 2, cy = H / 2 + j * sy;
          if (cx > -diag / 2 && cx < W + diag / 2 && cy > -diag / 2 && cy < H + diag / 2) draw(cx, cy);
        }
      }
      progress((k + 1) / idx.length, `Page ${k + 1} of ${idx.length}…`); await new Promise((r) => setTimeout(r, 0));
    }
    S.firstPage = idx[0] + 1;
    return { blob: new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' }), count: idx.length };
  }
  async function run() {
    if (!S.bytes || $('btn-compress').disabled || $('tool-card').classList.contains('is-busy')) return;
    setBusy($('tool-card'), true); $('btn-compress').disabled = true; $('progress-bar').classList.add('active'); progress(0, 'Starting…'); showError('');
    try {
      await P.lib(); const r = await stamp(); S.out = r.blob; S.count = r.count;
      await P.preview(new Uint8Array(await S.out.arrayBuffer()), $('output-canvas'), undefined, S.firstPage); $('output-empty').hidden = true;
      $('output-badge').textContent = `${r.count} of ${S.pages} pages · ${formatBytes(S.out.size)}`;
      $('result-badge').classList.add('is-win'); $('result-badge').textContent = `Watermarked ${r.count} of ${S.pages} pages · ${formatBytes(S.out.size)}`;
      $('btn-download').disabled = false; $('btn-copy').disabled = false; progress(1);
    } catch (e) {
      console.warn(e);
      showError(e.needsPassword ? 'That PDF is password-protected — unlock it first.' : /WinAnsi|encode/i.test(e.message) ? 'That text has characters the built-in font cannot draw — use Latin letters, or an image.' : e.message || 'Watermark failed.'); progress(0);
    } finally { setBusy($('tool-card'), false); $('btn-compress').disabled = !hasMark(); setTimeout(() => $('progress-bar').classList.remove('active'), 800); }
  }
  $('btn-compress').addEventListener('click', run);

  $('btn-download').addEventListener('click', () => S.out && downloadBlob(S.out, P.outName(S.file, 'watermarked')));
  $('btn-copy').addEventListener('click', () => S.out && copyText(`${S.file.name}: watermarked ${S.count} of ${S.pages} pages with ${S.type === 'text' ? `"${S.text}"` : S.img.name}`, 'Summary copied'));
  function reset() {
    Object.assign(S, { file: null, bytes: null, pages: 0, out: null });
    $('dropzone').hidden = false; ['source-canvas', 'output-canvas'].forEach((id) => { const c = $(id); c.hidden = true; c.width = c.width; }); $('output-empty').hidden = false;
    $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file'; invalidate(); showError(''); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: run, reset });

  invalidate();
  window.__wpd = { S, load, run, stamp };
})();
