#!/usr/bin/env node
// Batch 4 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page, asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/batch4-check.js   (ONLY=slug for one tool · BASE=http://localhost:3000/)
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = process.env.BASE || 'http://localhost:3011/';

const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  const waitFor = async (cond, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(100); } return false; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const feed = (files, input = 'file-input') => { const dt = new DataTransfer(); [].concat(files).forEach(x => dt.items.add(x)); $(input).files = dt.files; $(input).dispatchEvent(new Event('change', { bubbles: true })); };
  const busy = () => $('tool-card').classList.contains('is-busy');
  const go = async (T, ms = 60000) => { $('btn-compress').click(); await tick(50); A(await waitFor(() => !busy() && (T.S.out || !$('input-error').hidden), ms), 'no output / no error within ' + ms + 'ms: ' + $('result-badge').textContent); if (!$('input-error').hidden) f.push('error shown: ' + $('input-error').textContent.trim()); };
  const png = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f00'; x.fillRect(0, 0, w, h); return new Promise(r => c.toBlob(b => r(new File([b], 'fixture.png', { type: 'image/png' })), 'image/png')); };
  const RATE = 48000;
  const buffer = (sec, fn, ch = 1) => { const b = new AudioBuffer({ numberOfChannels: ch, length: Math.round(sec * RATE), sampleRate: RATE }); for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = fn(i / RATE, i, c); } return b; };
  const wavFile = (b, name = 'fixture.wav') => new File([window.ToolityAudio.wav(b)], name, { type: 'audio/wav' });
  const loadAudio = async (T, b) => { feed(wavFile(b)); A(await waitFor(() => T.S.buf), 'audio did not decode'); };
  const imgOf = (blob) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = URL.createObjectURL(blob); });
  const pixel = async (blob, x, y) => { const i = await imgOf(blob), c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; };
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  const videoMeta = (blob) => new Promise(r => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { if (!isFinite(v.duration)) { v.onseeked = () => r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); v.currentTime = 1e9; } else r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); }; v.onerror = () => r(null); v.src = URL.createObjectURL(blob); });
`;

const PDF_HELPERS = `
  for (let i = 0; i < 80 && !(window.PDFLib && window.ToolityPDFTool); i++) await tick(100);
  A(window.PDFLib && window.ToolityPDFTool, 'pdf page did not mount');
  const L = window.PDFLib, T = window.ToolityPDFTool;
  // 6 A5 portrait pages, each with its number drawn big in the centre
  async function sixPages() { const d = await L.PDFDocument.create(); const font = await d.embedFont(L.StandardFonts.HelveticaBold); for (let i = 1; i <= 6; i++) { const p = d.addPage([419.53, 595.28]); p.drawText(String(i), { x: 180, y: 260, size: 120, font }); p.drawRectangle({ x: 20, y: 20, width: 379, height: 555, borderWidth: 2, borderColor: L.rgb(0, 0, 0) }); } d.setTitle('Six'); return d; }
  const toFile = async (d, name = 'fixture.pdf') => new File([await d.save({ useObjectStreams: false })], name, { type: 'application/pdf' });
  const loadOut = async () => { const doc = await window.ToolityPDF.open(new Uint8Array(await T.S.out.arrayBuffer())); return doc; };
  const pageText = async (doc, n) => (await (await doc.getPage(n)).getTextContent()).items.map(i => i.str).join(' ');
  const pageSize = async (doc, n) => { const v = (await doc.getPage(n)).getViewport({ scale: 1 }); return [Math.round(v.width), Math.round(v.height)]; };
  // text items with positions on page n → [{str, x, y}] in PDF points
  const items = async (doc, n) => (await (await doc.getPage(n)).getTextContent()).items.filter(i => i.str.trim()).map(i => ({ str: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }));
`;

const CASES = [
  ['docs/zip-maker-extractor/', `
    for (let i = 0; i < 80 && !(window.JSZip && window.__zip && window.ToolityWebTool); i++) await tick(100);
    const Z = window.__zip, T = window.ToolityWebTool, txt = 'hello world '.repeat(200);
    Z.addFiles([{ path: 'docs/hello.txt', file: new File([txt], 'hello.txt', { type: 'text/plain' }) }, { path: 'pic.png', file: await png(8, 8) }]);
    await tick(300); A($('make-list').children.length === 2, 'two rows listed'); A(/Press Build ZIP/.test($('status-badge').textContent), 'waits for button: ' + $('status-badge').textContent);
    $('btn-run').click(); A(await waitFor(() => T.S.out && T.S.out.blob && T.S.out.ext === 'zip', 20000), 'zip built');
    const zblob = T.S.out.blob; A(zblob.size < txt.length, 'deflate shrank text: ' + zblob.size + ' < ' + txt.length);
    const back = await JSZip.loadAsync(zblob); const names = Object.keys(back.files).filter(n => !back.files[n].dir).sort(); A(JSON.stringify(names) === '["docs/hello.txt","pic.png"]', 'entries kept with folder: ' + names); A(await back.file('docs/hello.txt').async('string') === txt, 'content round-trips');
    set('opt-level', '0'); A(await waitFor(() => T.S.out && T.S.out.blob && T.S.out.blob !== zblob, 20000), 'store rebuild'); A(T.S.out.blob.size > txt.length, 'store is uncompressed: ' + T.S.out.blob.size);
    $('make-list').querySelector('[data-rm="1"]').click(); await tick(300); A($('make-list').children.length === 1 && /Press Build ZIP/.test($('status-badge').textContent), 'remove row invalidates build');
    // extract
    document.querySelector('#seg-mode [data-value=extract]').click(); await tick(200); A($('panel-make').hidden && !$('panel-extract').hidden && $('btn-run').hidden, 'extract panel shown');
    await Z.openZip(new File([zblob], 'test.zip', { type: 'application/zip' })); A(await waitFor(() => Z.M.entries.length === 2 && $('zip-tree').children.length === 2, 10000), 'entries listed: ' + Z.M.entries.length);
    A(/2 files/.test($('output-badge').textContent) && /Folders/.test($('zip-stats').textContent), 'stats: ' + $('output-badge').textContent);
    $('zip-tree').querySelector('[data-pick="0"]').click(); A(await waitFor(() => T.S.out && T.S.out.text === txt, 10000), 'text preview selected'); A(/hello world/.test($('zip-preview').textContent) && !$('zip-preview').hidden, 'inline preview rendered'); A(T.S.out.name === 'hello.txt', 'download name is basename: ' + T.S.out.name);
    $('zip-tree').querySelector('[data-pick="1"]').click(); A(await waitFor(() => T.S.out && T.S.out.name === 'pic.png', 10000), 'png selected'); A($('zip-preview').querySelector('img.zip-media'), 'image preview'); A(T.S.out.blob.type === 'image/png', 'png mime');
    set('zip-filter', 'png'); await tick(100); A($('zip-tree').children.length === 1 && /1 of 2/.test($('zip-count').textContent), 'filter: ' + $('zip-count').textContent);
    await Z.openZip(new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'nope.zip')); await tick(300); A(/doesn’t look like a ZIP/.test($('input-error').textContent), 'bad zip message: ' + $('input-error').textContent);
    $('btn-reset').click(); await tick(300); A(!$('panel-make').hidden && Z.M.files.length === 0 && !T.S.out, 'reset');`],
  ['dev/code-formatter/', `
    const out = () => $('output-text').textContent;
    set('opt-lang', 'sql'); set('opt-dialect', 'postgresql'); set('text-input', "select a.id, count(*) as n from users a join orders o on o.uid=a.id where a.created_at > now() - interval '7 days' group by a.id having count(*) > 2 order by n desc");
    A(await waitFor(() => /SELECT\\n/.test(out()), 30000), 'sql beautified upper: ' + out().slice(0, 80)); A(/\\nFROM\\n/.test(out()) && /\\n  JOIN /.test(out()), 'clauses on own lines');
    set('opt-keycase', 'lower'); A(await waitFor(() => /^select\\n/.test(out()), 10000), 'lowercase keywords: ' + out().slice(0, 40)); A(/count\\(\\*\\)/.test(out()), 'function lowercase');
    set('opt-dialect', 'duckdb'); set('opt-keycase', 'upper'); A(await waitFor(() => /^SELECT\\n/.test(out()), 10000), 'duckdb dialect formats');
    document.querySelector('#seg-mode [data-value=minify]').click(); A(await waitFor(() => !/\\n/.test(out().trim()) && out().length > 50, 10000), 'minified to one line: ' + out().slice(0, 60));
    A(/−\\d+%/.test($('output-badge').textContent), 'size badge: ' + $('output-badge').textContent);`],
  ['docs/pdf-repair/', PDF_HELPERS + `
    const good = await (await sixPages()).save({ useObjectStreams: false });
    // corrupt: drop the xref table + trailer (the classic "file didn't finish downloading" damage) and sprinkle junk before the header
    const txt = new TextDecoder('latin1').decode(good), xi = txt.lastIndexOf('xref'); A(xi > 0, 'fixture has xref');
    const cut = good.slice(0, xi), junk = new TextEncoder().encode('JUNKJUNKJUNK\\n'); const bad = new Uint8Array(junk.length + cut.length); bad.set(junk); bad.set(cut, junk.length);
    feed(new File([bad], 'broken.pdf', { type: 'application/pdf' })); A(await waitFor(() => T.S.bytes, 15000), 'accepted');
    A(/Damaged|6 page/.test($('source-badge').textContent) || /press Repair/.test($('result-badge').textContent), 'ready after load: ' + $('source-badge').textContent + ' | ' + $('result-badge').textContent);
    await go(T, 60000); A(T.S.out && T.S.out.type === 'application/pdf', 'repaired pdf');
    const d = await loadOut(); A(d.numPages === 6, 'six pages recovered: ' + d.numPages); A(/6/.test(await pageText(d, 6)), 'page 6 text kept (vector rebuild)');
    A(/Opens cleanly/.test($('result-badge').textContent) && /Rebuilt/.test($('result-badge').textContent), 'note: ' + $('result-badge').textContent);
    // forced rasterise path
    set('opt-method', 'raster'); await go(T, 90000); const d2 = await loadOut(); A(d2.numPages === 6, 'raster six pages'); A((await pageText(d2, 1)).trim() === '', 'raster pages have no text layer'); A(/Rasterised/.test($('result-badge').textContent), 'raster note');
    // strip annotations: add a link annotation then repair with strip
    $('btn-reset').click(); await tick(300); const dd = await sixPages(); const pg = dd.getPage(0); pg.node.set(L.PDFName.of('Annots'), dd.context.obj([dd.context.register(dd.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 100, 100] }))]));
    feed(await toFile(dd, 'annots.pdf')); A(await waitFor(() => T.S.pages === 6, 15000), 'annots fixture'); set('opt-method', 'auto'); set('opt-strip', true); await go(T, 60000);
    A(/1 annotation/.test($('result-badge').textContent), 'dropped annotation reported: ' + $('result-badge').textContent);
    const lib = await L.PDFDocument.load(new Uint8Array(await T.S.out.arrayBuffer())); A(!lib.getPage(0).node.has(L.PDFName.of('Annots')) && lib.getTitle() === 'Six', 'annots gone, title kept');`],
  ['docs/pdf-booklet-nup/', PDF_HELPERS + `
    const BO = window.__bk.bookletOrder; A(JSON.stringify(BO(8, false).sheets) === '[[[8,1],[2,7]],[[6,3],[4,5]]]', 'booklet order 8: ' + JSON.stringify(BO(8, false).sheets));
    A(JSON.stringify(BO(6, false).sheets) === '[[[0,1],[2,0]],[[6,3],[4,5]]]' && BO(6, false).total === 8, 'booklet order 6 padded: ' + JSON.stringify(BO(6, false).sheets));
    A(JSON.stringify(BO(4, true).sheets) === '[[[1,4],[3,2]]]', 'rtl order');
    feed(await toFile(await sixPages())); A(await waitFor(() => T.S.pages === 6, 15000), 'fixture'); await tick(300);
    // Booklet, auto sheet (A5 → A4 landscape), 6 pages → 2 sheets = 4 sides
    await go(T, 60000); let d = await loadOut(); A(d.numPages === 4, 'booklet sides: ' + d.numPages); let sz = await pageSize(d, 1); A(sz[0] === 839 && sz[1] === 595, 'auto sheet = 2×A5 landscape: ' + sz);
    let it = await items(d, 1); A(it.length === 1 && it[0].str === '1' && it[0].x > 420, 'sheet 1 front: blank left (pad), page 1 right: ' + JSON.stringify(it));
    it = await items(d, 3); const left = it.find(i => i.x < 420), right = it.find(i => i.x > 420); A(left && left.str === '6' && right && right.str === '3', 'sheet 2 front = [6,3]: ' + JSON.stringify(it));
    A(/2 sheets/.test($('result-badge').textContent) && /2 blanks/.test($('result-badge').textContent), 'note: ' + $('result-badge').textContent);
    // long-edge duplex rotates back sides
    document.querySelector('#seg-duplex [data-value=long]').click(); await tick(200); await go(T, 60000); d = await loadOut(); A((await d.getPage(2)).rotate === 180 && (await d.getPage(1)).rotate === 0, 'back side rotated 180');
    // N-up 4 on A4 portrait, row order: sheet 1 = 1 2 / 3 4
    document.querySelector('#seg-mode [data-value=nup]').click(); await tick(200); set('opt-nup', '4'); set('opt-paper', 'a4'); set('opt-border', true); await go(T, 60000); d = await loadOut();
    A(d.numPages === 2, '4-up → 2 sheets: ' + d.numPages); sz = await pageSize(d, 1); A(sz[0] === 595 && sz[1] === 842, 'A4 portrait for 2×2: ' + sz);
    it = (await items(d, 1)).sort((a, b) => b.y - a.y || a.x - b.x); A(it.map(i => i.str).join('') === '1234', 'row fill 1 2 / 3 4: ' + it.map(i => i.str + '@' + i.x + ',' + i.y).join(' '));
    document.querySelector('#seg-order [data-value=col]').click(); await tick(200); await go(T, 60000); d = await loadOut(); it = (await items(d, 1)).sort((a, b) => b.y - a.y || a.x - b.x); A(it.map(i => i.str).join('') === '1324', 'column fill 1 3 / 2 4: ' + it.map(i => i.str).join(''));
    // Halve: 6 portrait pages → each split top/bottom → 12 pages of half height
    document.querySelector('#seg-mode [data-value=halve]').click(); await tick(200); A($('row-halve') && !$('row-halve').hidden && $('row-nup').hidden, 'halve rows'); await go(T, 60000); d = await loadOut();
    A(d.numPages === 12, 'halve → 12: ' + d.numPages); sz = await pageSize(d, 1); A(sz[0] === 420 && (sz[1] === 298 || sz[1] === 297), 'half height: ' + sz);
    $('btn-reset').click(); await tick(300); A(!T.S.out && $('row-nup').hidden && !$('row-binding').hidden, 'reset to booklet');`],
];

(async () => {
  const only = process.env.ONLY;
  const port = 9700 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (path, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}${path}` }); await sleep(2000);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, userGesture: true, timeout: 240000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [path, expr] of CASES) {
    const slug = path.split('/')[1]; if (only && slug !== only) continue; n++;
    const f = await run(path, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} batch-3 tools passing`);
  process.exit(fails ? 1 : 0);
})();
