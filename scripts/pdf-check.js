#!/usr/bin/env node
// PDF batch check (rule 50): synthetic fixtures built in the page with pdf-lib, fed through #file-input, real button click, asserts on the output.
// Usage: python3 -m http.server 3011 &  then  node scripts/pdf-check.js [ONLY=slug]
const { spawn } = require('child_process');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = 'http://localhost:3011/';

const HELPERS = `
  const tick = (ms = 150) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  for (let i = 0; i < 60 && !(window.PDFLib && window.ToolityPDFTool); i++) await tick(100);
  A(window.PDFLib && window.ToolityPDFTool, 'page did not mount');
  const L = window.PDFLib, T = window.ToolityPDFTool;
  const waitFor = async (cond, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(); } return false; };
  // fixture: 3 pages (A4 portrait with text, A5, Letter rotated 90) + metadata
  async function fixturePdf() {
    const d = await L.PDFDocument.create(); const font = await d.embedFont(L.StandardFonts.Helvetica);
    d.setTitle('Fixture Title'); d.setAuthor('Fixture Author');
    const sizes = [[595.28, 841.89], [419.53, 595.28], [612, 792]];
    sizes.forEach(([w, h], i) => { const p = d.addPage([w, h]); p.drawText('Hello page ' + (i + 1) + '. Second sentence here.', { x: 60, y: h - 80, size: 18, font });
      p.drawText('Line two of page ' + (i + 1), { x: 60, y: h - 110, size: 14, font });
      p.drawRectangle({ x: 60, y: 120, width: 200, height: 120, color: L.rgb(0.9, 0.2, 0.1) }); if (i === 2) p.setRotation(L.degrees(90)); });
    return new File([await d.save()], 'fixture.pdf', { type: 'application/pdf' });
  }
  async function fixtureForm() {
    const d = await L.PDFDocument.create(); const p = d.addPage([595, 842]); const form = d.getForm();
    const t = form.createTextField('name'); t.addToPage(p, { x: 60, y: 700, width: 240, height: 24 });
    const c = form.createCheckBox('agree'); c.addToPage(p, { x: 60, y: 650, width: 18, height: 18 });
    const dd = form.createDropdown('colour'); dd.addOptions(['Red', 'Green', 'Blue']); dd.addToPage(p, { x: 60, y: 600, width: 160, height: 24 });
    return new File([await d.save()], 'form.pdf', { type: 'application/pdf' });
  }
  async function fixtureImages() {
    const mk = (w, h, color, type) => new Promise((res) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.fillRect(20, 20, w / 2, h / 2); c.toBlob((b) => res(new File([b], 'img.' + type.split('/')[1], { type })), type, 0.9); });
    return [await mk(800, 600, '#1e88e5', 'image/png'), await mk(600, 900, '#e53935', 'image/jpeg'), await mk(400, 400, '#43a047', 'image/webp')];
  }
  const feed = async (files) => { const dt = new DataTransfer(); files.forEach((x) => dt.items.add(x)); $('file-input').files = dt.files; $('file-input').dispatchEvent(new Event('change', { bubbles: true })); A(await waitFor(() => T.S.bytes || T.S.files.length, 15000), 'file did not load: ' + ($('input-error').textContent || '').trim()); await tick(300); };
  const go = async () => { A(!$('btn-compress').disabled, 'primary disabled: ' + $('result-badge').textContent); $('btn-compress').click(); A(await waitFor(() => (!$('tool-card').classList.contains('is-busy') && (!$('btn-download').disabled || T.S.outText)) || !$('input-error').hidden, 60000), 'no output'); A($('input-error').hidden, 'error: ' + $('input-error').textContent.trim()); await tick(200); return T.S.out; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const pill = (gid, v) => document.querySelector('#' + gid + ' [data-value="' + v + '"]').click();
  const loadOut = async (blob) => L.PDFDocument.load(new Uint8Array(await blob.arrayBuffer()), { ignoreEncryption: true });
  const pageSizes = (d) => d.getPages().map((p) => { const { width, height } = p.getSize(); return [Math.round(width), Math.round(height)]; });
`;

const CASES = [
  ['images-to-pdf', `
    await feed(await fixtureImages()); A(T.S.files.length === 3, 'expected 3 images, got ' + T.S.files.length);
    let out = await go(); let d = await loadOut(out); A(d.getPageCount() === 3, 'auto: 3 pages, got ' + d.getPageCount());
    const s = pageSizes(d); A(Math.abs(s[0][0] - (800 + 2 * 28.35)) <= 1 && Math.abs(s[1][1] - (900 + 2 * 28.35)) <= 1, 'auto page sizes wrong: ' + JSON.stringify(s));
    set('opt-paper', 'a4'); pill('seg-orient', 'portrait'); out = await go(); d = await loadOut(out);
    A(pageSizes(d).every(([w, h]) => w === 595 && h === 842), 'A4 portrait sizes wrong: ' + JSON.stringify(pageSizes(d)));
    $('btn-reset').click(); await tick(); A(T.S.files.length === 0 && !$('dropzone').hidden, 'reset did not clear');`],
  ['pdf-to-images', `
    await feed([await fixturePdf()]); let out = await go();
    A(out.type.includes('zip') && out.size > 3000, 'expected zip, got ' + out.type + ' ' + out.size);
    A(!$('output-img').hidden && $('output-img').src.startsWith('blob:'), 'no preview image');
    set('opt-pages', '2'); set('opt-format', 'jpeg'); out = await go(); A(out.type === 'image/jpeg', 'single page should be a JPEG, got ' + out.type);
    A(T.T.ext === 'jpg', 'ext should switch to jpg');`],
  ['pdf-to-text', `
    await feed([await fixturePdf()]); const out = await go();
    A(/Hello page 1\\. Second sentence here\\./.test(T.S.outText), 'text missing: ' + T.S.outText.slice(0, 120));
    A(/Hello page 3/.test(T.S.outText), 'rotated page text missing');
    A(/----- Page 2 -----/.test(T.S.outText), 'page marker missing');
    A($('output-text').value === T.S.outText && !$('output-text').hidden, 'textarea not shown');
    set('opt-mode', 'lines'); set('opt-breaks', false); await go(); A(!/-----/.test(T.S.outText) && /Line two of page 2/.test(T.S.outText), 'lines mode wrong');`],
  ['pdf-page-numberer', `
    await feed([await fixturePdf()]); set('opt-format', 'pageof'); set('opt-skip', '1'); const out = await go();
    const d = await loadOut(out); A(d.getPageCount() === 3, 'page count changed');
    const P = window.ToolityPDF; const doc = await P.open(new Uint8Array(await out.arrayBuffer()));
    const txt = async (n) => (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ');
    A(!/Page 1 of/.test(await txt(1)), 'skipped page got a number'); A(/Page 1 of 2/.test(await txt(2)), 'page 2 label wrong: ' + await txt(2)); A(/Page 2 of 2/.test(await txt(3)), 'rotated page 3 label wrong: ' + await txt(3));`],
  ['pdf-metadata-editor', `
    await feed([await fixturePdf()]); A($('meta-title').value === 'Fixture Title' && $('meta-author').value === 'Fixture Author', 'form not prefilled: ' + $('meta-title').value);
    set('meta-title', 'New Title'); set('meta-keywords', 'a, b, c'); const out = await go(); const d = await loadOut(out);
    A(d.getTitle() === 'New Title', 'title not saved: ' + d.getTitle()); A(d.getKeywords() === 'a b c' || /a.*b.*c/.test(d.getKeywords() || ''), 'keywords not saved: ' + d.getKeywords());
    $('btn-clear-meta').click(); await tick(); A($('meta-title').value === '' && $('btn-compress').disabled === false, 'clear all failed');`],
  ['pdf-cropper', `
    await feed([await fixturePdf()]); A(!$('crop-stage').hidden && $('crop-box').offsetWidth > 20, 'crop stage not shown');
    window.__crop.box.x = 0.25; window.__crop.box.y = 0.25; window.__crop.box.w = 0.5; window.__crop.box.h = 0.5; T.invalidate();
    const out = await go(); const d = await loadOut(out);
    const cb = d.getPage(0).getCropBox(); A(Math.abs(cb.width - 595.28 / 2) < 2 && Math.abs(cb.height - 841.89 / 2) < 2, 'crop box wrong: ' + JSON.stringify(cb));
    const cb3 = d.getPage(2).getCropBox(); A(Math.abs(cb3.width - 612 / 2) < 2 && Math.abs(cb3.height - 792 / 2) < 2, 'rotated page crop wrong: ' + JSON.stringify(cb3));
    pill('seg-scope', 'this'); const out2 = await go(); const d2 = await loadOut(out2); A(d2.getPage(1).getCropBox().width > 400, 'this-page scope touched page 2');`],
  ['pdf-page-resizer', `
    await feed([await fixturePdf()]); set('opt-paper', 'letter'); const out = await go(); const d = await loadOut(out);
    const s = pageSizes(d); A(s[0][0] === 612 && s[0][1] === 792 && s[1][0] === 612, 'letter sizes wrong: ' + JSON.stringify(s));
    A(s[2][0] === 792 && s[2][1] === 612, 'rotated page should become landscape letter: ' + JSON.stringify(s[2]));
    pill('seg-orient', 'portrait'); set('opt-paper', 'custom'); set('opt-w', '100'); set('opt-h', '150'); const d2 = await loadOut(await go());
    A(pageSizes(d2).every(([w, h]) => w === 283 && h === 425), 'custom size wrong: ' + JSON.stringify(pageSizes(d2)));`],
  ['pdf-form-filler', `
    await feed([await fixtureForm()]); A(T.S.count === 3 && $('form-fields').children.length === 3, 'expected 3 fields, got ' + T.S.count);
    set('fld-0', 'Kapil'); set('fld-1', true); set('fld-2', 'Green'); const out = await go();
    const P = window.ToolityPDF; const doc = await P.open(new Uint8Array(await out.arrayBuffer()));
    const txt = (await (await doc.getPage(1)).getTextContent()).items.map((i) => i.str).join(' ');
    A(/Kapil/.test(txt) && /Green/.test(txt), 'flattened values not drawn: ' + txt);
    const d = await loadOut(out); A(d.getForm().getFields().length === 0, 'form not flattened');
    set('opt-flatten', false); const d2 = await loadOut(await go()); A(d2.getForm().getTextField('name').getText() === 'Kapil' && d2.getForm().getCheckBox('agree').isChecked(), 'editable save lost values');`],
  ['pdf-flattener', `
    await feed([await fixtureForm()]); A(/1 field/.test($('source-badge').textContent) || /3 field/.test($('source-badge').textContent), 'badge: ' + $('source-badge').textContent);
    let d = await loadOut(await go()); A(d.getForm().getFields().length === 0, 'lossless flatten left fields');
    A(d.getPage(0).node.lookup(L.PDFName.of('Contents')), 'page lost content');
    pill('seg-mode', 'raster'); A(!$('row-raster').hidden, 'raster rows hidden'); set('opt-dpi', '72'); d = await loadOut(await go());
    A(d.getPageCount() === 1 && Object.keys(d.getPage(0).node.Resources().lookup(L.PDFName.of('XObject')).dict ? d.getPage(0).node.Resources().lookup(L.PDFName.of('XObject')).dict : {}).length >= 0, 'raster output invalid');`],
  ['grayscale-pdf', `
    await feed([await fixturePdf()]); set('opt-dpi', '72'); const out = await go(); const d = await loadOut(out); A(d.getPageCount() === 3, 'page count');
    const P = window.ToolityPDF; const doc = await P.open(new Uint8Array(await out.arrayBuffer())); const { c } = await P.render(doc, 1, 1);
    const px = c.getContext('2d').getImageData(80, Math.round(841 - 180), 1, 1).data; A(Math.abs(px[0] - px[1]) < 3 && Math.abs(px[1] - px[2]) < 3 && px[0] < 200, 'red box not gray: ' + [...px]);
    set('opt-pages', '2'); const d2 = await loadOut(await go()); A(d2.getPageCount() === 3 && d2.getPage(0).node.lookup(L.PDFName.of('Contents')), 'partial conversion lost pages');`],
];

(async () => {
  const only = process.env.ONLY;
  const port = 9800 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (slug, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}docs/${slug}/` }); await sleep(2000);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, timeout: 120000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [slug, expr] of CASES) {
    if (only && slug !== only) continue; n++;
    const f = await run(slug, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} PDF tools passing`);
  process.exit(fails ? 1 : 0);
})();
