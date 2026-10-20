/* Nonogram — Toolity.in. Generator: random picture at the chosen density → line solver proves it is solvable by logic alone
 * (no guessing) or it is redrawn; image mode thresholds a picture to the grid and nudges until solvable. Board: fill / cross,
 * drag painting, keyboard, undo, auto-cross of finished lines, mistake check, timer + best times via game-common.
 * Designed by Kapil Pidhwani: the solver is pure line logic (overlap + gap elimination iterated to a fixpoint) — exactly the
 * reasoning a human uses, so "solvable" here means solvable without bifurcation. Ceiling: 20×15 max; bigger grids get slow on phones. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame, $ = (id) => document.getElementById(id);
  const SIZES = { 5: [5, 5], 10: [10, 10], 15: [15, 15], 20: [20, 15] }; // [cols, rows]
  const clues = (line) => { const out = []; let run = 0; for (const c of line) { if (c) run++; else if (run) { out.push(run); run = 0; } } if (run) out.push(run); return out.length ? out : [0]; };

  /* ── Line solver: given clue list and current cells (0 unknown, 1 filled, 2 empty), return deduced cells or null if contradiction ── */
  const memo = new Map();
  function lineSolve(clue, cells) {
    const n = cells.length, key = clue.join(',') + '|' + cells.join('');
    if (memo.has(key)) return memo.get(key);
    const runs = clue[0] === 0 ? [] : clue, canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
    let any = false;
    // enumerate placements with pruning (DFS over run starts)
    const place = (ri, pos, marks) => {
      if (ri === runs.length) { for (let i = pos; i < n; i++) if (cells[i] === 1) return; for (let i = 0; i < n; i++) (marks[i] ? canFill : canEmpty)[i] = true; any = true; return; }
      const len = runs[ri], rest = runs.slice(ri + 1).reduce((a, b) => a + b + 1, 0);
      for (let s = pos; s + len + rest <= n; s++) {
        if (cells[s - 1] === 1 && s > pos) break; // can't skip a known filled cell
        let ok = true; for (let i = s; i < s + len; i++) if (cells[i] === 2) { ok = false; break; }
        if (ok && (s + len === n || cells[s + len] !== 1)) { const m = marks.slice(); for (let i = s; i < s + len; i++) m[i] = 1; place(ri + 1, s + len + 1, m); }
        if (cells[s] === 1) break; // run must cover this filled cell
      }
    };
    place(0, 0, new Array(n).fill(0));
    let res = null;
    if (any) { res = cells.map((c, i) => (c ? c : canFill[i] && !canEmpty[i] ? 1 : canEmpty[i] && !canFill[i] ? 2 : 0)); }
    if (memo.size > 20000) memo.clear(); memo.set(key, res); return res;
  }
  // Full solver: returns 'solved' | 'stuck' | 'contradiction'
  function solve(rowClues, colClues, W, H) {
    const g = new Array(W * H).fill(0); let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < H; r++) { const line = g.slice(r * W, r * W + W), s = lineSolve(rowClues[r], line); if (!s) return { state: 'contradiction', g }; for (let c = 0; c < W; c++) if (s[c] !== line[c]) { g[r * W + c] = s[c]; changed = true; } }
      for (let c = 0; c < W; c++) { const line = []; for (let r = 0; r < H; r++) line.push(g[r * W + c]); const s = lineSolve(colClues[c], line); if (!s) return { state: 'contradiction', g }; for (let r = 0; r < H; r++) if (s[r] !== line[r]) { g[r * W + c] = s[r]; changed = true; } }
    }
    return { state: g.includes(0) ? 'stuck' : 'solved', g };
  }
  const cluesFor = (pic, W, H) => ({ rows: Array.from({ length: H }, (_, r) => clues(pic.slice(r * W, r * W + W))), cols: Array.from({ length: W }, (_, c) => clues(Array.from({ length: H }, (_, r) => pic[r * W + c]))) });
  function generate(W, H, density) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const pic = Array.from({ length: W * H }, () => (Math.random() < density ? 1 : 0));
      // smooth a little so pictures have runs, not noise
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { if (Math.random() < 0.35) { const i = r * W + c, nb = [pic[i - 1], pic[i + 1], pic[i - W], pic[i + W]].filter((v) => v !== undefined); pic[i] = nb.reduce((a, b) => a + b, 0) * 2 > nb.length ? 1 : nb.every((v) => !v) ? 0 : pic[i]; } }
      if (!pic.includes(1)) continue;
      const { rows, cols } = cluesFor(pic, W, H); if (solve(rows, cols, W, H).state === 'solved') return { pic, rows, cols };
    }
    return null;
  }
  function fromImage(img, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const s = Math.min(W / img.width, H / img.height), w = img.width * s, h = img.height * s; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const d = x.getImageData(0, 0, W, H).data, lum = []; for (let i = 0; i < W * H; i++) lum.push(d[i * 4 + 3] < 40 ? 255 : 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    const sorted = lum.slice().sort((a, b) => a - b), base = sorted[Math.floor(sorted.length * 0.5)];
    // try thresholds around the median, then nudge single cells until logic-solvable
    for (const t of [base, base - 20, base + 20, base - 40, base + 40, 128]) {
      let pic = lum.map((v) => (v < t ? 1 : 0)); if (!pic.includes(1) || !pic.includes(0)) continue;
      for (let k = 0; k < 60; k++) { const { rows, cols } = cluesFor(pic, W, H), r = solve(rows, cols, W, H); if (r.state === 'solved') return { pic, rows, cols }; const unknown = r.g.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0); const i = unknown[Math.floor(Math.random() * unknown.length)]; pic[i] = pic[i] ? 0 : 1; }
    }
    return null;
  }

  /* ── UI ── */
  const S = { W: 10, H: 10, pic: [], rows: [], cols: [], cells: [], hist: [], tool: 1, sel: 0, drag: null, done: false, source: 'random' };
  const left = () => { let n = 0; for (let i = 0; i < S.pic.length; i++) if (S.pic[i] && S.cells[i] !== 1) n++; return n; };
  function build() {
    const board = $('board'), rows = $('ng-rows'), cols = $('ng-cols'), wrap = $('ng-wrap');
    wrap.style.setProperty('--w', S.W); wrap.style.setProperty('--h', S.H); wrap.style.setProperty('--cl', Math.max(...S.cols.map((c) => c.length))); wrap.style.setProperty('--rl', Math.max(...S.rows.map((c) => c.length)));
    board.innerHTML = ''; board.style.gridTemplateColumns = `repeat(${S.W}, 1fr)`; let rowEl = null;
    for (let i = 0; i < S.W * S.H; i++) { if (i % S.W === 0) { rowEl = document.createElement('div'); rowEl.className = 'ng-row'; rowEl.setAttribute('role', 'row'); board.appendChild(rowEl); } const b = document.createElement('button'); b.type = 'button'; b.className = 'ng-cell'; b.dataset.i = i; b.setAttribute('role', 'gridcell'); b.setAttribute('aria-rowindex', Math.floor(i / S.W) + 1); b.setAttribute('aria-colindex', (i % S.W) + 1); b.setAttribute('aria-label', `Row ${Math.floor(i / S.W) + 1} column ${(i % S.W) + 1}`); if ((i % S.W) % 5 === 4 && i % S.W !== S.W - 1) b.classList.add('is-v5'); if (Math.floor(i / S.W) % 5 === 4 && Math.floor(i / S.W) !== S.H - 1) b.classList.add('is-h5'); rowEl.appendChild(b); }
    cols.innerHTML = S.cols.map((c, i) => `<div class="ng-clue ng-clue-col" data-c="${i}">${c.map((n) => `<span>${n}</span>`).join('')}</div>`).join('');
    rows.innerHTML = S.rows.map((c, i) => `<div class="ng-clue ng-clue-row" data-r="${i}">${c.map((n) => `<span>${n}</span>`).join('')}</div>`).join('');
    paint();
  }
  function paint() {
    const cells = $('board').querySelectorAll('.ng-cell');
    for (let i = 0; i < cells.length; i++) { const el = cells[i]; el.classList.toggle('is-fill', S.cells[i] === 1); el.classList.toggle('is-x', S.cells[i] === 2); el.classList.toggle('is-sel', i === S.sel); el.classList.toggle('is-bad', !!S.bad && S.bad.has(i)); el.setAttribute('aria-label', `Row ${Math.floor(i / S.W) + 1} column ${(i % S.W) + 1}: ${S.cells[i] === 1 ? 'filled' : S.cells[i] === 2 ? 'crossed' : 'empty'}`); }
    for (let r = 0; r < S.H; r++) $('ng-rows').children[r].classList.toggle('is-done', lineDone(S.rows[r], S.cells.slice(r * S.W, r * S.W + S.W)));
    for (let c = 0; c < S.W; c++) { const line = []; for (let r = 0; r < S.H; r++) line.push(S.cells[r * S.W + c]); $('ng-cols').children[c].classList.toggle('is-done', lineDone(S.cols[c], line)); }
    $('left-val').textContent = left();
  }
  const lineDone = (clue, line) => JSON.stringify(clues(line.map((v) => (v === 1 ? 1 : 0)))) === JSON.stringify(clue);
  function autoCross(api, i) {
    if (!api.val('opt-autocross')) return;
    const r = Math.floor(i / S.W), c = i % S.W, row = S.cells.slice(r * S.W, r * S.W + S.W), col = []; for (let k = 0; k < S.H; k++) col.push(S.cells[k * S.W + c]);
    if (lineDone(S.rows[r], row)) for (let k = 0; k < S.W; k++) if (!S.cells[r * S.W + k]) S.cells[r * S.W + k] = 2;
    if (lineDone(S.cols[c], col)) for (let k = 0; k < S.H; k++) if (!S.cells[k * S.W + c]) S.cells[k * S.W + c] = 2;
  }
  function setCell(api, i, v, { record = true } = {}) {
    if (S.done) return; const prev = S.cells[i]; if (prev === v) return;
    if (record) { S.hist.push([i, prev]); api.setUndo(true); }
    S.cells[i] = v; if (v) { api.sfx.tap(v === 1 ? 520 : 380); autoCross(api, i); }
    if (api.val('opt-mistakes') && v === 1 && !S.pic[i]) { S.bad = new Set([i]); api.sfx.bad(); api.status('That cell should be empty'); } else S.bad = null;
    paint(); checkWin(api);
  }
  function toggle(api, i, tool) { const cur = S.cells[i]; setCell(api, i, cur === tool ? 0 : tool); return S.cells[i]; }
  function checkWin(api) {
    for (let i = 0; i < S.pic.length; i++) if ((S.cells[i] === 1) !== !!S.pic[i]) return;
    S.done = true; api.timer.stop(); const t = api.timer.get(), key = 'best_' + api.mode(), best = api.st.get(key, null);
    if (S.source === 'random' && (!best || t < best)) api.st.set(key, t); $('best-val').textContent = api.fmtClock(api.st.get(key, t));
    $('board').classList.add('is-solved'); api.sfx.win(); api.status('Solved!', true); api.overlay('Picture complete!', `Finished in ${api.fmtClock(t)} · Press Space or New puzzle`);
  }
  function start(api, puzzle, source) {
    S.pic = puzzle.pic; S.rows = puzzle.rows; S.cols = puzzle.cols; S.cells = new Array(S.W * S.H).fill(0); S.hist = []; S.sel = 0; S.done = false; S.bad = null; S.source = source;
    $('board').classList.remove('is-solved'); api.setUndo(false); api.setCopy(true); build();
    $('best-val').textContent = source === 'random' && api.st.get('best_' + api.mode(), null) ? api.fmtClock(api.st.get('best_' + api.mode())) : '—';
    api.status(source === 'image' ? 'Puzzle from your image' : 'Fill cells to match the clues'); api.timer.start(0, (s) => { $('time-val').textContent = api.fmtClock(s); });
  }
  const setTool = (t) => { S.tool = t; $('btn-fill').classList.toggle('is-on', t === 1); $('btn-fill').setAttribute('aria-pressed', t === 1); $('btn-cross').classList.toggle('is-on', t === 2); $('btn-cross').setAttribute('aria-pressed', t === 2); };
  const printPage = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const cl = Math.max(...S.cols.map((c) => c.length)), rl = Math.max(...S.rows.map((c) => c.length)), td = (x, cls = '') => `<td class="${cls}">${x}</td>`;
    let h = '<table>';
    for (let k = 0; k < cl; k++) h += '<tr>' + td('', 'e').repeat(rl) + S.cols.map((c) => td(c[c.length - cl + k] ?? '')).join('') + '</tr>';
    for (let r = 0; r < S.H; r++) h += '<tr>' + td('', 'e').repeat(rl - S.rows[r].length) + S.rows[r].map((n) => td(n)).join('') + td('', 'g').repeat(S.W) + '</tr>';
    h += '</table>';
    w.document.write(`<!doctype html><title>Nonogram ${S.W}×${S.H}</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse}td{width:22px;height:22px;text-align:center;font-size:12px;border:1px solid #ddd}td.e{border:0}td.g{border:1px solid #333}h1{font-size:18px}</style><h1>Nonogram ${S.W}×${S.H} — toolity.in/games/nonogram</h1>${h}<script>print()<\/script>`); w.document.close();
  };

  const api = mount({
    slug: 'nonogram', defaultMode: '10',
    summary: ({ val }) => `${{ '0.35': 'Sparse', '0.45': 'Medium', '0.55': 'Dense' }[val('opt-density')]} density · ${val('opt-autocross') ? 'auto-cross on' : 'auto-cross off'}${val('opt-mistakes') ? ' · mistakes shown' : ''}`,
    newGame(api) { [S.W, S.H] = SIZES[api.mode()] || SIZES[10]; memo.clear(); const p = generate(S.W, S.H, +api.val('opt-density')); if (!p) { api.status('Could not generate — try again'); return; } start(api, p, 'random'); },
    undo(api) { const m = S.hist.pop(); if (!m) return; S.cells[m[0]] = m[1]; S.bad = null; api.setUndo(S.hist.length > 0); paint(); api.status('Undone'); },
    copy(api) { const txt = `Nonogram ${S.W}×${S.H}\nRows: ${S.rows.map((r) => r.join(' ')).join(' | ')}\nCols: ${S.cols.map((c) => c.join(' ')).join(' | ')}\n` + S.pic.reduce((a, v, i) => a + (v ? '█' : '·') + ((i + 1) % S.W ? '' : '\n'), ''); api.copyText(txt, 'Puzzle copied (with solution)'); },
    onMode: (_, api) => api.G.newGame(api),
    onKey(e, api) {
      const k = e.key, r = Math.floor(S.sel / S.W), c = S.sel % S.W; let moved = false;
      if (k === 'ArrowLeft' && c > 0) { S.sel--; moved = true; } else if (k === 'ArrowRight' && c < S.W - 1) { S.sel++; moved = true; } else if (k === 'ArrowUp' && r > 0) { S.sel -= S.W; moved = true; } else if (k === 'ArrowDown' && r < S.H - 1) { S.sel += S.W; moved = true; }
      if (moved) { e.preventDefault(); if (e.shiftKey && S.paintVal !== undefined) setCell(api, S.sel, S.paintVal); paint(); return; }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); S.paintVal = toggle(api, S.sel, 1); }
      else if (k === 'x' || k === 'X') { if (e.shiftKey) setTool(2); else S.paintVal = toggle(api, S.sel, 2); }
      else if (k === 'f' || k === 'F') setTool(1);
      else if (k === 'c' || k === 'C') $('btn-check').click();
    }
  });
  const board = $('board');
  const idx = (el) => { const b = el && el.closest && el.closest('.ng-cell'); return b ? +b.dataset.i : -1; };
  board.addEventListener('contextmenu', (e) => e.preventDefault());
  board.addEventListener('pointerdown', (e) => { const i = idx(e.target); if (i < 0) return; e.preventDefault(); try { board.setPointerCapture(e.pointerId); } catch (x) { /* synthetic event */ } const tool = e.button === 2 ? 2 : S.tool; S.sel = i; const v = toggle(api, i, tool); S.drag = { v, r: Math.floor(i / S.W), c: i % S.W, axis: null, last: i }; });
  board.addEventListener('pointermove', (e) => { if (!S.drag) return; const el = document.elementFromPoint(e.clientX, e.clientY), i = idx(el); if (i < 0 || i === S.drag.last) return; const r = Math.floor(i / S.W), c = i % S.W; if (!S.drag.axis) S.drag.axis = r === S.drag.r ? 'row' : c === S.drag.c ? 'col' : null; if (S.drag.axis === 'row' && r !== S.drag.r) return; if (S.drag.axis === 'col' && c !== S.drag.c) return; if (!S.drag.axis) return; S.drag.last = i; S.sel = i; setCell(api, i, S.drag.v); });
  ['pointerup', 'pointercancel'].forEach((t) => board.addEventListener(t, () => { S.drag = null; }));
  board.addEventListener('keydown', (e) => { if (e.key === 'Tab') return; });
  $('btn-fill').addEventListener('click', () => setTool(1)); $('btn-cross').addEventListener('click', () => setTool(2));
  $('btn-check').addEventListener('click', () => { const bad = new Set(); for (let i = 0; i < S.pic.length; i++) if ((S.cells[i] === 1 && !S.pic[i]) || (S.cells[i] === 2 && S.pic[i])) bad.add(i); S.bad = bad; paint(); api.status(bad.size ? `${bad.size} mistake${bad.size === 1 ? '' : 's'} highlighted` : 'No mistakes so far ✓', !bad.size); if (bad.size) api.sfx.bad(); else api.sfx.tap(700); });
  $('btn-image').addEventListener('click', () => $('ng-file').click());
  $('ng-file').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const img = new Image(); img.onload = () => { URL.revokeObjectURL(img.src); [S.W, S.H] = SIZES[api.mode()] || SIZES[10]; memo.clear(); const p = fromImage(img, S.W, S.H); if (!p) return api.toast('Could not make a logic-solvable puzzle from that image — try a simpler one'); api.overlay(null); start(api, p, 'image'); api.toast('Puzzle made from your image'); }; img.onerror = () => api.toast('Could not read that image'); img.src = URL.createObjectURL(f); });
  $('btn-print').addEventListener('click', printPage);
  window.__ng = { S, clues, lineSolve, solve, generate, cluesFor, fromImage, setCell: (i, v) => setCell(api, i, v) };
})();
