#!/usr/bin/env node
// Batch 6 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page, asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/batch6-check.js   (ONLY=slug for one tool · BASE=http://localhost:3000/)
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
  ['data/number-formats-converter/', `
    for (let i = 0; i < 80 && !(window.__nf && window.ToolityWebTool); i++) await tick(100);
    const F = window.__nf, T = window.ToolityWebTool;
    A(F.enIntl(1234567n, true) === 'one million two hundred and thirty-four thousand five hundred and sixty-seven', 'en intl: ' + F.enIntl(1234567n, true));
    A(F.enIntl(1005n, true) === 'one thousand and five' && F.enIntl(1005n, false) === 'one thousand five' && F.enIntl(0n) === 'zero' && F.enIntl(10n ** 24n, false) === 'one septillion', 'en edge cases: ' + F.enIntl(1005n, true));
    A(F.enIndian(12345678n, false) === 'one crore twenty-three lakh forty-five thousand six hundred seventy-eight', 'en Indian: ' + F.enIndian(12345678n, false));
    A(F.hindi(12345678n) === 'एक करोड़ तेईस लाख पैंतालीस हज़ार छह सौ अठहत्तर' && F.hindi(0n) === 'शून्य' && F.hindi(99n) === 'निन्यानवे', 'hindi: ' + F.hindi(12345678n));
    A(F.spanish(1234567n) === 'un millón doscientos treinta y cuatro mil quinientos sesenta y siete' && F.spanish(100n) === 'cien' && F.spanish(21n) === 'veintiuno' && F.spanish(2000000n) === 'dos millones', 'spanish: ' + F.spanish(1234567n));
    A(F.french(1234567n) === 'un million deux cent trente-quatre mille cinq cent soixante-sept' && F.french(80n) === 'quatre-vingts' && F.french(91n) === 'quatre-vingt-onze' && F.french(71n) === 'soixante et onze' && F.french(200n) === 'deux cents' && F.french(1000n) === 'mille', 'french: ' + F.french(1234567n) + ' / ' + F.french(71n));
    A(F.german(1234567n) === 'eine Million zweihundertvierunddreißigtausendfünfhundertsiebenundsechzig' && F.german(1n) === 'eins' && F.german(21n) === 'einundzwanzig' && F.german(1001n) === 'eintausendeins', 'german: ' + F.german(1234567n));
    A(F.portuguese(1234567n) === 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete' && F.portuguese(100n) === 'cem' && F.portuguese(101n) === 'cento e um' && F.portuguese(1005n) === 'mil e cinco', 'portuguese: ' + F.portuguese(1234567n) + ' / ' + F.portuguese(1005n));
    A(F.toRoman(2026n) === 'MMXXVI' && F.fromRoman('MCMXCIV') === 1994 && F.fromRoman('IIII') === null && F.toRoman(4000n) === '', 'roman');
    const p1 = F.parse('12,34,567.89'); A(p1.int === 1234567n && p1.dec === '89', 'parse indian grouping');
    A(F.parse('1.234.567,89').int === 1234567n && F.parse('3.5e8').int === 350000000n && F.parse('1.5e-3').dec === '0015' && F.parse('-42').neg && F.parse('MMXXVI').int === 2026n, 'parse european / scientific / negative / roman: ' + F.parse('1.5e-3').dec);
    A(F.fromWords('two crore fifteen lakh thirty thousand and five').int === 21530005n && F.fromWords('two million five hundred thousand').int === 2500000n && F.fromWords('1.5 lakh').int === 150000n && F.fromWords('twelve point five').dec === '5' && F.fromWords('banana') === null, 'words → number: ' + (F.fromWords('two crore fifteen lakh thirty thousand and five') || {}).int);
    A(F.groupIndian('1234567') === '12,34,567' && F.groupIndian('123') === '123' && F.ordinal(22n) === '22nd' && F.ordinal(113n) === '113th', 'grouping + ordinal');
    set('text-input', '1234567.89'); set('opt-lang', 'en-IN'); A(await waitFor(() => T.S.out && /Twelve Lakh/.test(T.S.out.text), 10000), 'live words: ' + (T.S.out && T.S.out.text));
    const rows = [...$('nf-table').querySelectorAll('tr')].map(r => [r.querySelector('th').textContent, r.querySelector('td span').textContent]); const get = (k) => (rows.find(r => r[0] === k) || [])[1];
    A(get('Amount in words') === 'Rupees Twelve Lakh Thirty-Four Thousand Five Hundred And Sixty-Seven And Eighty-Nine Paise Only', 'cheque amount: ' + get('Amount in words'));
    A(get('Indian grouping') === '12,34,567.89' && get('International grouping') === '1,234,567.89' && get('European (1.234,56)') === '1.234.567,89' && get('Scientific') === '1.23456789e+6' && get('Engineering') === '1.235 × 10^6' && /^1\\.23 M$/.test(get('Compact · International').replace('M', ' M')), 'grouped formats: ' + [get('Indian grouping'), get('Scientific'), get('Engineering'), get('Compact · International')]);
    A(/12\\.35 Cr|1\\.23 Cr|12\\.35 L/.test(get('Compact · Indian')), 'compact indian: ' + get('Compact · Indian'));
    set('opt-lang', 'hi'); set('opt-currency', 'INR'); await tick(300); A(/बारह लाख/.test(T.S.out.text) && /दशमलव/.test(T.S.out.text), 'hindi words: ' + T.S.out.text); const hiAmt = [...$('nf-table').querySelectorAll('tr')].find(r => r.querySelector('th').textContent === 'Amount in words').querySelector('td span').textContent; A(/रुपये और .* पैसे मात्र$/.test(hiAmt), 'hindi amount: ' + hiAmt);
    set('opt-lang', 'en'); set('text-input', '2026'); await tick(300); const r2 = [...$('nf-table').querySelectorAll('tr')].map(r => [r.querySelector('th').textContent, r.querySelector('td span').textContent]); A((r2.find(r => r[0] === 'Roman numeral') || [])[1] === 'MMXXVI' && /2,026th · Two Thousand And Twenty-Sixth/.test((r2.find(r => r[0] === 'Ordinal') || [])[1]), 'roman + ordinal rows: ' + (r2.find(r => r[0] === 'Ordinal') || [])[1]);
    set('text-input', 'hello'); await tick(300); A(/Could not read/.test($('input-error').textContent), 'error for junk');
    set('text-input', '1\\n2\\n3'); await tick(300); const csv = await T.T.download('csv'); A(csv.text.split('\\n').length === 5 && /^input,words-en/.test(csv.text), 'batch csv: ' + csv.text.split('\\n')[0].slice(0, 40));`],
  ['games/nonogram/', `
    for (let i = 0; i < 80 && !(window.__ng && window.__game); i++) await tick(100);
    const N = window.__ng, api = window.__game;
    A(JSON.stringify(N.clues([1,1,0,1,0,0,1,1,1])) === '[2,1,3]' && JSON.stringify(N.clues([0,0])) === '[0]', 'clues');
    A(JSON.stringify(N.lineSolve([8], [0,0,0,0,0,0,0,0,0,0])) === '[0,0,1,1,1,1,1,1,0,0]', 'overlap deduction: ' + JSON.stringify(N.lineSolve([8], new Array(10).fill(0))));
    A(N.lineSolve([3], [0,2,0,0,0]) && JSON.stringify(N.lineSolve([3], [0,2,0,0,0])) === '[2,2,1,1,1]', 'gap elimination');
    A(N.lineSolve([4], [1,0,0,2,0]) === null, 'contradiction detected');
    const pic = [1,1,1, 1,0,0, 1,0,1], { rows, cols } = N.cluesFor(pic, 3, 3), r = N.solve(rows, cols, 3, 3); A(r.state === 'solved' && r.g.every((v, i) => (v === 1) === !!pic[i]), 'solver solves a 3×3: ' + r.state);
    const amb = [1,0, 0,1], ca = N.cluesFor(amb, 2, 2); A(N.solve(ca.rows, ca.cols, 2, 2).state === 'stuck', 'ambiguous checkerboard is stuck (needs guess)');
    const g = N.generate(10, 10, 0.45); A(g && g.pic.length === 100 && N.solve(g.rows, g.cols, 10, 10).state === 'solved', 'generated 10×10 is logic-solvable');
    A(N.S.W === 10 && $('board').children.length === 100 && $('ng-rows').children.length === 10 && $('ng-cols').children.length === 10, 'board built');
    const S = N.S; const first = S.pic.findIndex(v => v === 1), empty = S.pic.findIndex(v => v === 0);
    $('board').children[first].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 })); $('board').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); await tick(50);
    A(S.cells[first] === 1 && $('board').children[first].classList.contains('is-fill') && !$('btn-undo').disabled, 'pointer fill + undo enabled');
    $('btn-undo').click(); A(S.cells[first] === 0, 'undo');
    $('btn-cross').click(); $('board').children[empty].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2 })); $('board').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 })); A(S.cells[empty] === 2, 'cross mode marks X');
    set('opt-mistakes', true); N.setCell(empty, 1); A(S.bad && S.bad.has(empty), 'mistake highlighted'); N.setCell(empty, 0); set('opt-mistakes', false);
    S.pic.forEach((v, i) => { if (v) N.setCell(i, 1); }); await tick(100); A(S.done && /Solved/.test($('status-badge').textContent) && !$('overlay').hidden && $('board').classList.contains('is-solved'), 'win detected');
    A(/^\\d+:\\d\\d$/.test($('best-val').textContent), 'best time saved: ' + $('best-val').textContent);
    document.querySelector('#seg-mode [data-value="5"]').click(); await tick(300); A(S.W === 5 && $('board').children.length === 25 && !S.done, 'mode 5×5 regenerates');
    // image mode: draw a simple shape on a canvas → File → fromImage
    const c = document.createElement('canvas'); c.width = 40; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 40, 40); x.fillStyle = '#000'; x.fillRect(8, 8, 24, 24); x.clearRect(16, 16, 8, 8);
    const img = new Image(); img.src = c.toDataURL(); await new Promise(r => img.onload = r); const p = N.fromImage(img, 10, 10); A(p && p.pic.filter(Boolean).length > 20 && N.solve(p.rows, p.cols, 10, 10).state === 'solved', 'image → solvable puzzle: ' + (p && p.pic.filter(Boolean).length));`],
  ['widgets/button-grid/embed/?items=Mail%20%7C%20mail.google.com%20%7C%20lucide%3Amail%0AGit%20%7C%20https%3A%2F%2Fgithub.com%20%7C%20%F0%9F%90%99%0Abad%20line&cols=3&style=filled&labels=0', `
    for (let i = 0; i < 80 && !(window.__grid && window.ToolityWidget); i++) await tick(100);
    const items = window.__grid.parse('A | example.com | lucide:x\\nB | javascript:alert(1) | y\\nC | https://c.com');
    A(items.length === 2 && items[0].url === 'https://example.com' && items[1].label === 'C', 'parse: https prefix, javascript: dropped: ' + JSON.stringify(items));
    const btns = document.querySelectorAll('.w-gbtn'); A(btns.length === 2 && btns[0].target === '_blank' && btns[0].getAttribute('aria-label') === 'Mail', 'buttons + newtab + aria-label without labels');
    A(document.querySelector('.w-grid').style.getPropertyValue('--cols') === '3' && document.querySelector('.w-grid').classList.contains('style-filled'), 'cols + style');
    A(/api.iconify.design\\/lucide\\/mail.svg\\?color=%23ffffff/.test(btns[0].querySelector('img').src) && btns[1].querySelector('.w-btn-emoji').textContent === '🐙', 'iconify img white for filled + emoji icon');`],
  ['widgets/calculator/embed/?decimals=2', `
    for (let i = 0; i < 80 && !(window.__calc && document.querySelector('.w-calc')); i++) await tick(100);
    const C = window.__calc; A(C.calc(0.1, '+', 0.2) === 0.3 && C.calc(7, '÷', 2) === 3.5 && isNaN(C.calc(1, '÷', 0)) && C.calc(1.1, '×', 3) === 3.3, 'decimal-safe arithmetic');
    const card = document.querySelector('.w-calc'), key = (k) => [...card.querySelectorAll('.w-ckey')].find(b => b.textContent === k).click(), disp = () => card.querySelector('.w-calc-disp').textContent;
    key('1'); key('2'); key('+'); key('3'); key('='); A(disp() === '15', '12+3=15: ' + disp());
    key('×'); key('2'); key('='); A(disp() === '30', 'chain 15×2: ' + disp());
    key('AC'); key('2'); key('0'); key('0'); key('+'); key('1'); key('0'); key('%'); key('='); A(disp() === '220', 'percent of accumulator: ' + disp());
    key('M+'); key('AC'); key('MR'); A(disp() === '220', 'memory recall: ' + disp());
    card.focus(); const kd = (k) => card.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); kd('Escape'); kd('9'); kd('/'); kd('4'); kd('Enter'); A(disp() === '2.25', 'keyboard 9/4: ' + disp());
    window.ToolityWidget.update({ mode: 'tip', currency: '₹' }); await tick(50); const tip = document.querySelector('.w-tip'); A(tip, 'tip mode renders');
    const inputs = tip.querySelectorAll('input[type=number]'); inputs[0].value = '1000'; inputs[0].dispatchEvent(new Event('input')); inputs[1].value = '4'; inputs[1].dispatchEvent(new Event('input'));
    [...tip.querySelectorAll('.w-tip-pill')].find(b => b.textContent === '20%').click(); await tick(20);
    const rows = [...tip.querySelectorAll('.w-tip-row b')].map(b => b.textContent); A(rows[0] === '₹ 200' && rows[1] === '₹ 1,200' && rows[2] === '₹ 300', 'tip split 1000 @20% / 4: ' + rows);`],
  ['widgets/world-clocks/embed/?cities=Asia%2FKolkata%20%7C%20Mumbai%0AEurope%2FLondon%0ANot%2FAZone%20%7C%20x&format=12&seconds=1', `
    for (let i = 0; i < 80 && !(window.__clocks && document.querySelector('.w-clock')); i++) await tick(100);
    const W = window.__clocks; A(W.parse('Asia/Tokyo | Tokyo\\nBad/Zone\\nEurope/Paris').length === 2 && W.parse('Europe/Paris')[0].label === 'Paris', 'parse validates zones + default label');
    const jan = new Date('2026-01-15T12:00:00Z'), jul = new Date('2026-07-15T12:00:00Z'); A(W.offsetMin(jan, 'Asia/Kolkata') === 330 && W.offsetMin(jan, 'Europe/London') === 0 && W.offsetMin(jul, 'Europe/London') === 60 && W.offsetMin(jan, 'America/New_York') === -300, 'offsets incl. DST: ' + [W.offsetMin(jan, 'Asia/Kolkata'), W.offsetMin(jul, 'Europe/London')]);
    const clocks = document.querySelectorAll('.w-clock'); A(clocks.length === 2 && clocks[0].querySelector('.w-clock-city').textContent === 'Mumbai' && clocks[1].querySelector('.w-clock-city').textContent === 'London', 'two valid clocks');
    A(/^\\d{1,2}:\\d{2}:\\d{2} (AM|PM)$/.test(clocks[0].querySelector('.w-clock-time').textContent), '12h with seconds: ' + clocks[0].querySelector('.w-clock-time').textContent);
    A(/home$/.test(clocks[0].querySelector('.w-clock-sub').textContent) && /−(4.5|5.5)h$/.test(clocks[1].querySelector('.w-clock-sub').textContent), 'offset labels: ' + clocks[1].querySelector('.w-clock-sub').textContent);
    A(document.querySelector('.w-overlap-all') && /Everyone at work \\d\\d:\\d\\d/.test(document.querySelector('.w-overlap-label').textContent), 'overlap computed: ' + document.querySelector('.w-overlap-label').textContent);`],
  ['widgets/weather/embed/?lat=19.08&lon=72.88&place=Mumbai&days=3&units=f', `
    for (let i = 0; i < 80 && !(window.__wx && document.querySelector('.w-wx')); i++) await tick(100);
    const X = window.__wx; A(/temperature_unit=fahrenheit/.test(X.url({ lat: 1, lon: 2, days: 3, units: 'f' })) && /forecast_days=3/.test(X.url({ lat: 1, lon: 2, days: 3, units: 'c' })) && X.wmo(95)[1] === 'Thunderstorm' && X.wmo(999)[1] === 'Weather', 'url + wmo mapping');
    A(await waitFor(() => /°F/.test(document.querySelector('.w-wx').textContent) || /unavailable/.test(document.querySelector('.w-wx').textContent), 15000), 'forecast rendered or honest failure');
    if (/°F/.test(document.querySelector('.w-wx').textContent)) { A(document.querySelectorAll('.w-wx-day').length === 2 && /mph/.test(document.querySelector('.w-wx-meta').textContent), '2 forecast days + mph'); A(Object.keys(localStorage).some(k => k.startsWith('toolity_wx_')), 'cached'); }
    A(document.querySelector('.w-wx-src') && document.querySelector('.w-title').textContent === 'Mumbai', 'source credit + place title');`],
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
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} batch-6 tools passing`);
  process.exit(fails ? 1 : 0);
})();
