#!/usr/bin/env node
// Games batch check (rule 43, 50): real pages in headless Chrome, exercises DOM controls,
// tap-pair key events (keydown + keyup after ~40ms), mode switches, undo, reset, and win/loss flows.
// Usage: python3 -m http.server 3011 &  then  node scripts/game-check.js [ONLY=slug]
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, (r) => { let b = ''; r.on('data', (d) => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = 'http://localhost:3011/';

const HELPERS = `
  const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  for (let i = 0; i < 60 && !window.__game; i++) await tick(80);
  A(window.__game, 'game did not mount');
  const G = window.__game;
  const pill = (v) => document.querySelector('#seg-mode [data-value="' + v + '"]').click();
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const tapKey = async (key, code = key) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
    await tick(40);
    window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true }));
    await tick(40);
  };
`;

const CASES = [
  ['typing-speed-test', `
    const T = window.__tst;
    A(T && T.S.words.length >= 60, 'words generated');
    A($('btn-copy').disabled === true, 'copy disabled before finish');
    const inp = $('typing-input');
    const w0 = T.S.words[0], w1 = T.S.words[1];
    inp.value = w0; inp.dispatchEvent(new Event('input', { bubbles: true }));
    A(T.S.started > 0, 'timer started on first input');
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
    await tick(40);
    inp.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
    A(T.S.idx === 1 && T.S.typed[0] === w0, 'space advanced word: idx=' + T.S.idx);
    inp.value = w1 + 'x'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    T.finish(); await tick(60);
    A(T.S.over && !$('overlay').hidden, 'finish shows overlay');
    A(+$('wpm-val').textContent > 0, 'wpm > 0: ' + $('wpm-val').textContent);
    A($('btn-copy').disabled === false, 'copy enabled after finish');
    pill('15'); await tick(60); A(T.S.dur === 15 && !T.S.over, '15s mode switch');
    $('btn-reset').click(); await tick(60); A(T.S.dur === 30 && $('best-val').textContent === '0', 'reset restores 30s and clears best');
  `],
  ['sudoku', `
    const K = window.__sudoku;
    A(K && K.S.sol.length === 81, '81 cells');
    A(K.countSolutions(K.S.grid.slice(), 2) === 1, 'unique solution');
    const idx = K.S.sel;
    const right = K.S.sol[idx], wrong = (right % 9) + 1;
    await tapKey(String(wrong), 'Digit' + wrong);
    A(K.S.grid[idx] === wrong && !$('btn-undo').disabled, 'placed digit & undo enabled');
    $('btn-undo').click(); await tick(40);
    A(K.S.grid[idx] === 0, 'undo reverted digit');
    await tapKey('n', 'KeyN'); A(K.S.noteMode === true, 'note mode toggled');
    await tapKey(String(right), 'Digit' + right);
    A((K.S.notes[idx] & (1 << right)) !== 0, 'pencil note recorded');
    await tapKey('n', 'KeyN');
    for (let i = 0; i < 81; i++) if (!K.S.givens[i] && i !== idx) K.S.grid[i] = K.S.sol[i];
    await tapKey(String(right), 'Digit' + right);
    A(K.S.over && !$('overlay').hidden && $('left-val').textContent === '0', 'solved overlay shown');
    $('btn-reset').click(); await tick(60); A(!K.S.over && $('overlay').hidden, 'reset');
  `],
  ['minesweeper', `
    const M = window.__ms;
    A(M && M.S.rows === 9 && M.S.cols === 9 && M.S.mines === 10, '9x9x10 default');
    M.dig(40); await tick(40);
    A(M.S.planted && !M.S.mine[40] && M.S.open[40], 'first click safe at center');
    const closedIdx = M.S.open.findIndex((o, i) => !o && !M.S.mine[i]);
    M.toggleFlag(closedIdx); A(M.S.flag[closedIdx] && $('mines-val').textContent === '9', 'flag decrements counter');
    M.toggleFlag(closedIdx); A(!M.S.flag[closedIdx] && $('mines-val').textContent === '10', 'unflag restores counter');
    const mineIdx = M.S.mine.findIndex(Boolean);
    M.dig(mineIdx); await tick(40);
    A(M.S.over && !$('overlay').hidden && !$('btn-undo').disabled, 'hitting mine ends game & enables undo');
    $('btn-undo').click(); await tick(40);
    A(!M.S.over && $('overlay').hidden && !M.S.open[mineIdx], 'undo recovers from mine');
    for (let i = 0; i < 81; i++) if (!M.S.mine[i] && !M.S.open[i]) M.dig(i);
    await tick(40);
    A(M.S.over && /Cleared/i.test($('overlay-title').textContent), 'clearing all safe squares wins: ' + $('overlay-title').textContent);
    pill('hard'); await tick(60); A(M.S.rows === 16 && M.S.cols === 30 && M.S.mines === 99, '16x30 expert mode');
    $('btn-reset').click(); await tick(60); A(M.S.rows === 9 && M.S.cols === 9, 'reset');
  `],
  ['connect-four', `
    const C = window.__c4;
    pill('2p'); await tick(60);
    await tapKey('ArrowRight', 'ArrowRight'); A(C.S.aim === 4, 'aim moved right');
    for (let i = 0; i < 3; i++) { C.drop(0); C.drop(1); }
    $('btn-undo').click(); await tick(40); A(C.S.hist.length === 5, 'undo popped 1 move in 2p');
    C.drop(1); C.drop(0); await tick(40);
    A(C.S.over && !$('overlay').hidden && C.S.winLine && C.S.winLine.size === 4, 'vertical 4 wins');
    $('btn-reset').click(); await tick(60); A(G.mode() === 'cpu' && !C.S.over, 'reset restores cpu mode');
  `],
  ['checkers', `
    const K = window.__checkers;
    pill('2p'); await tick(60);
    A(K.S.b.filter((v) => v === 1).length === 12 && K.S.b.filter((v) => v === -1).length === 12, '12 vs 12 start');
    const mvs = K.legalMoves(K.S.b, 1, true);
    A(mvs.length === 7, '7 opening moves for Red: ' + mvs.length);
    K.clickSquare(mvs[0].from); K.clickSquare(mvs[0].to); await tick(40);
    A(K.S.turn === -1 && K.S.hist.length === 1, 'turn passed to Black');
    $('btn-undo').click(); await tick(40); A(K.S.turn === 1 && K.S.hist.length === 0, 'undo restored Red turn');
    // Test forced jump + king promotion
    K.S.b.fill(0); K.S.b[17] = 1; K.S.b[10] = -1; K.S.turn = 1; K.render();
    const j = K.legalMoves(K.S.b, 1, true);
    A(j.length === 1 && j[0].from === 17 && j[0].to === 3 && j[0].cap === 10, 'forced jump onto king row');
    K.clickSquare(17); K.clickSquare(3); await tick(40);
    A(K.S.b[3] === 2 && K.S.over && !$('overlay').hidden, 'crowned King & won when last Black piece captured');
    $('btn-reset').click(); await tick(60); A(!K.S.over && G.mode() === 'cpu', 'reset');
  `],
  ['chess', `
    const H = window.__chess;
    pill('2p'); await tick(60);
    const openMvs = H.legalMoves(H.S.P);
    A(openMvs.length === 20, '20 legal opening moves: ' + openMvs.length);
    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    const play = (from, to) => {
      const mv = H.legalMoves(H.S.P).find((m) => m.from === from && m.to === to);
      A(mv, 'legal move ' + from + '->' + to);
      if (mv) H.commitMove(mv);
    };
    play(53, 45); // f2-f3
    play(12, 28); // e7-e5
    play(54, 38); // g2-g4
    play(3, 39);  // Qd8-h4#
    await tick(60);
    A(H.S.over && !$('overlay').hidden && /Checkmate/i.test($('overlay-title').textContent), 'Fools mate detected: ' + $('overlay-title').textContent);
    A($('moves').textContent.includes('Qh4#'), 'SAN log has Qh4#: ' + $('moves').textContent);
    $('btn-reset').click(); await tick(60); A(!H.S.over && G.mode() === 'cpu', 'reset');
  `],
  ['sliding-puzzle', `
    const P = window.__sp;
    A(P && P.S.tiles.length === 16 && P.isSolvable(P.S.tiles, 4), '4x4 solvable deal');
    await tapKey('ArrowRight', 'ArrowRight'); await tapKey('ArrowLeft', 'ArrowLeft');
    await tapKey('ArrowDown', 'ArrowDown'); await tapKey('ArrowUp', 'ArrowUp');
    A(P.S.moves > 0 && !$('btn-undo').disabled, 'arrow key slid tile');
    $('btn-undo').click(); await tick(40);
    P.setNearWin();
    P.slideAt(15); await tick(40);
    A(P.S.over && !$('overlay').hidden && /solved/i.test($('overlay-title').textContent), 'solving triggers win overlay');
    pill('3'); await tick(60); A(P.S.n === 3 && P.S.tiles.length === 9 && P.isSolvable(P.S.tiles, 3), '3x3 solvable');
    pill('5'); await tick(60); A(P.S.n === 5 && P.S.tiles.length === 25 && P.isSolvable(P.S.tiles, 5), '5x5 solvable');
    $('btn-reset').click(); await tick(60); A(P.S.n === 4 && $('best-val').textContent === '—', 'reset');
  `],
  ['solitaire', `
    const L = window.__sol;
    A(L && L.S.stock.length === 24 && L.S.tab.length === 7, '24 stock + 28 tableau = 52 cards');
    await tapKey('d', 'KeyD');
    A(L.S.stock.length === 23 && L.S.waste.length === 1 && L.S.moves === 1, 'D key drew 1 card');
    $('btn-undo').click(); await tick(40);
    A(L.S.stock.length === 24 && L.S.waste.length === 0, 'undo reverted stock draw');
    pill('3'); await tick(60);
    L.drawStock(); await tick(40);
    A(L.S.waste.length === 3, 'Draw 3 mode draws 3 cards');
    L.setupAlmostWon(); await tick(40);
    A(!$('btn-auto').hidden, 'Auto-finish visible when all cards face-up');
    $('btn-auto').click(); await tick(60);
    A(L.S.over && !$('overlay').hidden && +$('wins-val').textContent >= 1, 'Auto-finish sweeps to win');
    $('btn-reset').click(); await tick(60); A(L.S.drawCount === 1 && $('wins-val').textContent === '0', 'reset');
  `]
];

(async () => {
  const only = process.env.ONLY;
  const port = 9600 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (slug, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, (r) => { let b = ''; r.on('data', (d) => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}games/${slug}/` }); await sleep(1200);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, timeout: 60000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map((e) => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [slug, expr] of CASES) {
    if (only && slug !== only) continue; n++;
    const f = await run(slug, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} games passing`);
  process.exit(fails ? 1 : 0);
})();
