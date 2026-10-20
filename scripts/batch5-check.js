#!/usr/bin/env node
// Batch 5 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page, asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/batch5-check.js   (ONLY=slug for one tool · BASE=http://localhost:3000/)
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
  ['labs/responsive-breakpoint-previewer/', `
    for (let i = 0; i < 80 && !(window.__rb && window.ToolityWebTool); i++) await tick(100);
    const R = window.__rb, T = window.ToolityWebTool;
    A($('rb-chips').querySelectorAll('.rb-chip').length === 9 && $('rb-chips').querySelectorAll('.rb-chip.is-on').length === 4, 'chips rendered, 4 on by default');
    const d = R.prepareDoc({ html: '<p>hi</p>', baseUrl: 'https://example.com/x/' }, true); A(/<base href="https:\\/\\/example.com\\/x\\/">/.test(d) && /color-scheme:dark/.test(d) && /<html>/.test(d), 'prepareDoc wraps + injects: ' + d.slice(0, 120));
    $('btn-sample').click(); A(await waitFor(() => $('rb-frames').querySelectorAll('iframe').length === 4, 10000), 'sample → 4 frames');
    const ws = [...$('rb-frames').querySelectorAll('iframe')].map(f => +f.getAttribute('width')); A(JSON.stringify(ws) === '[375,768,1024,1440]', 'frame widths: ' + ws);
    const scales = [...$('rb-frames').querySelectorAll('iframe')].map(f => f.style.transform); A(scales.every(s => /scale\\(/.test(s)) && new Set(scales).size === 1, 'one shared scale: ' + scales[0]);
    await tick(800); const cols = (f) => { try { return getComputedStyle(f.contentDocument.querySelector('.cards')).gridTemplateColumns.split(' ').length; } catch (e) { return -1; } };
    const fr = [...$('rb-frames').querySelectorAll('iframe')]; A(cols(fr[0]) === 1 && cols(fr[1]) === 2 && cols(fr[3]) === 3, 'media queries apply per width: ' + fr.map(cols));
    $('rb-chips').querySelector('[data-w="320"]').click(); await tick(300); A($('rb-frames').querySelectorAll('iframe').length === 5 && +$('rb-frames').querySelector('iframe').getAttribute('width') === 320, 'chip adds 320 first');
    set('opt-custom', 600); $('opt-custom').dispatchEvent(new Event('change', { bubbles: true })); await tick(300); A($('rb-chips').querySelector('[data-w="600"]') && [...$('rb-frames').querySelectorAll('iframe')].some(f => +f.getAttribute('width') === 600), 'custom width added');
    set('opt-landscape', true); await tick(900); const f0 = $('rb-frames').querySelector('iframe'); A(+f0.getAttribute('width') === 800 && +f0.getAttribute('height') === 320, 'landscape swaps: ' + f0.getAttribute('width') + 'x' + f0.getAttribute('height'));
    set('opt-landscape', false); set('opt-dark', true); await tick(900); A(/color-scheme:dark/.test($('rb-frames').querySelector('iframe').srcdoc), 'dark scheme injected');
    A(T.S.out && T.S.out.ext === 'html' && /Pasted HTML/.test($('status-badge').textContent), 'status: ' + $('status-badge').textContent);
    $('btn-reset').click(); await tick(300); A($('rb-frames').children.length === 0 && $('rb-chips').querySelectorAll('.rb-chip').length === 9, 'reset clears frames and custom chips');`],
  ['labs/accessibility-contrast-matrix/', `
    for (let i = 0; i < 80 && !(window.__cm && window.ToolityWebTool); i++) await tick(100);
    const M = window.__cm, T = window.ToolityWebTool;
    const pal = M.parsePalette('--brand: #F4511E;\\n--ink:#17191C\\n#fff, rgb(0,0,0)\\n--brand-dup: #f4511e\\nnonsense line');
    A(pal.length === 4 && pal[0].name === 'brand' && pal[1].name === 'ink' && pal[2].hex === '#FFFFFF' && pal[3].hex === '#000000', 'palette parse + names + dedupe: ' + JSON.stringify(pal.map(p => [p.name, p.hex])));
    set('text-input', '--ink: #000000\\n--paper: #FFFFFF\\n--brand: #F4511E\\n--muted: #999999'); A(await waitFor(() => T.S.out && M.P.length === 4, 10000), 'grid built');
    A(Math.abs(M.R[0][1] - 21) < 0.01, 'black/white = 21:1: ' + M.R[0][1]);
    const cells = $('cm-grid').querySelectorAll('td[data-i]'); A(cells.length === 6, 'upper half only by default: ' + cells.length);
    A($('cm-grid').querySelector('td[data-i="0"][data-j="1"]').classList.contains('is-pass') && $('cm-grid').querySelector('td[data-i="1"][data-j="3"]').classList.contains('is-fail'), 'pass/fail classes (white on #999 fails)');
    A(/\\/6 pass/.test($('output-badge').textContent) && /Pairs/.test($('cm-stats').textContent), 'summary: ' + $('output-badge').textContent);
    set('opt-half', false); await tick(300); A($('cm-grid').querySelectorAll('td[data-i]').length === 12, 'both directions → 12 cells');
    set('opt-level', 'aaa'); await tick(300); A($('cm-grid').querySelector('td[data-i="0"][data-j="2"]').classList.contains('is-fail') || $('cm-grid').querySelector('td[data-i="0"][data-j="2"]').classList.contains('is-large'), 'AAA tightens brand-on-black');
    set('opt-level', 'aa'); await tick(300);
    $('cm-grid').querySelector('td[data-i="1"][data-j="3"] button').click(); await tick(50); A(!$('cm-fix').hidden && $('cm-fix').querySelectorAll('.cm-fix-opt').length >= 1, 'fix panel with options');
    const f = M.fix({ r: 255, g: 255, b: 255, a: 1 }, { r: 153, g: 153, b: 153, a: 1 }, 4.5); A(f && window.ToolityColor.contrast(f, { r: 153, g: 153, b: 153, a: 1 }) >= 4.5, 'fix reaches target');
    A(/\\| \\*\\*ink\\*\\* \\|/.test(T.S.out.text) && /21\\.00 ✅/.test(T.S.out.text), 'markdown export: ' + T.S.out.text.split('\\n')[2]);
    const d = await T.T.download('csv'); A(/^text,text_hex/.test(d.text) && d.text.split('\\n').length === 8, 'csv rows: ' + d.text.split('\\n').length);
    const png = await T.T.download('png'); A(png.blob && png.blob.size > 3000, 'png export ' + png.blob.size);
    $('btn-sample').click(); await tick(400); A(M.P.length === 8 && M.P[0].name === 'brand', 'sample palette loads');`],
  ['labs/keyboard-shortcut-cheat-sheet-maker/', `
    for (let i = 0; i < 80 && !(window.__ks && window.ToolityWebTool); i++) await tick(100);
    const K = window.__ks, T = window.ToolityWebTool;
    const g = K.parse('## Edit\\nCtrl+Shift+P — Palette\\nCtrl+K Ctrl+C — Chord\\nCtrl+Y / Ctrl+Shift+Z — Redo\\nnot a shortcut line\\n## Nav\\nG then I: Inbox');
    A(g.length === 2 && g[0].rows.length === 3 && g[1].rows[0].desc === 'Inbox', 'parse groups/rows: ' + JSON.stringify(g));
    A(JSON.stringify(K.render('Shift+Ctrl+P', 'mac')) === '["⇧","⌘","P"]' && JSON.stringify(K.render('Shift+Ctrl+P', 'win')) === '["Ctrl","Shift","P"]', 'modifier mapping + order: ' + JSON.stringify(K.render('Shift+Ctrl+P', 'mac')));
    A(JSON.stringify(K.render('Control+Up', 'mac')) === '["⌃","↑"]' && K.render('Alt+=', 'mac')[0] === '⌥', 'control forces ⌃, glyphs');
    const c = K.combos('Ctrl+K Ctrl+C', 'mac'); A(c.length === 1 && c[0].length === 2 && c[0][1][1] === 'C', 'chord parsed: ' + JSON.stringify(c));
    A(K.combos('Ctrl+Y / Ctrl+Shift+Z', 'win').length === 2, 'alternatives parsed');
    A(await waitFor(() => T.S.out && /\\| Shortcut \\| Action \\|/.test(T.S.out.text), 10000), 'preset auto-loaded and markdown produced');
    A($('ks-sheet').querySelectorAll('.ks-row').length === 19 && $('ks-sheet').querySelectorAll('.ks-group').length === 3, 'sheet rows rendered: ' + $('ks-sheet').querySelectorAll('.ks-row').length);
    set('text-input', '## A\\nCtrl+B — Bold\\nCtrl+I — Italic'); set('opt-title', 'Mini'); document.querySelector('#seg-os [data-value=both]').click(); await tick(400);
    A($('ks-sheet').querySelectorAll('.ks-keys-alt').length === 2 && /Shortcut \\(Mac\\) \\| Shortcut \\(Windows\\)/.test(T.S.out.text), 'both mode: two key columns + markdown header');
    A(/\\| \`⌘B\` \\| \`Ctrl\\+B\` \\| Bold \\|/.test(T.S.out.text), 'markdown row: ' + T.S.out.text.split('\\n').find(l => /Bold/.test(l)));
    set('opt-cols', '1'); set('opt-theme', 'dark'); set('opt-numbers', true); await tick(300); A($('ks-sheet').querySelector('.ks-paper.theme-dark') && $('ks-sheet').querySelectorAll('.ks-num').length === 2 && $('ks-sheet').style.width === '640px', 'theme/numbers/width');
    const png = await K.toPng(K.state()); A(png && png.type === 'image/png' && png.size > 5000, 'png export: ' + (png && png.size));
    const px = await pixel(png, 10, 10); A(px[0] < 60 && px[3] === 255, 'dark theme pixel: ' + px);
    set('opt-preset', 'gmail'); await tick(400); A(/Compose/.test($('text-input').value) && $('opt-title').value === 'Gmail shortcuts' && $('opt-preset').value === '', 'preset loads and select resets');`],
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
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} batch-5 tools passing`);
  process.exit(fails ? 1 : 0);
})();
