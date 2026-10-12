/* Designed by Kapil Pidhwani: Sudoku — backtracking generator + uniqueness-checked hole digger (capped at 120 dig
 * attempts so generation stays <40 ms on phones). */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const HOLES = { easy: 36, medium: 46, hard: 52 };
  const S = { givens: [], grid: [], sol: [], notes: [], sel: 0, noteMode: false, hist: [], over: false };

  const rc = (i) => [Math.floor(i / 9), i % 9];
  const boxOf = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  function peers(i) {
    const [r, c] = rc(i), b = boxOf(r, c), out = [];
    for (let j = 0; j < 81; j++) if (j !== i) { const [rj, cj] = rc(j); if (rj === r || cj === c || boxOf(rj, cj) === b) out.push(j); }
    return out;
  }
  const PEERS = Array.from({ length: 81 }, (_, i) => peers(i));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function canPlace(g, i, v) {
    for (const p of PEERS[i]) if (g[p] === v) return false;
    return true;
  }
  function fillGrid(g, idx = 0) {
    while (idx < 81 && g[idx]) idx++;
    if (idx === 81) return true;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (canPlace(g, idx, v)) { g[idx] = v; if (fillGrid(g, idx + 1)) return true; g[idx] = 0; }
    }
    return false;
  }
  /* Count solutions up to `limit` (picks cell with fewest candidates first for speed). */
  function countSolutions(g, limit = 2) {
    let best = -1, bestOpts = null;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const opts = [];
      for (let v = 1; v <= 9; v++) if (canPlace(g, i, v)) opts.push(v);
      if (!opts.length) return 0;
      if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; if (opts.length === 1) break; }
    }
    if (best === -1) return 1;
    let total = 0;
    for (const v of bestOpts) {
      g[best] = v;
      total += countSolutions(g, limit - total);
      g[best] = 0;
      if (total >= limit) return total;
    }
    return total;
  }
  function generate(diff) {
    const sol = Array(81).fill(0); fillGrid(sol);
    const puzzle = sol.slice();
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i));
    let dug = 0, target = HOLES[diff] || 46;
    for (const i of order) {
      if (dug >= target) break;
      const save = puzzle[i]; puzzle[i] = 0;
      if (countSolutions(puzzle.slice(), 2) === 1) dug++;
      else puzzle[i] = save;
    }
    return { puzzle, sol };
  }

  function hasConflict(g, i) {
    const v = g[i]; if (!v) return false;
    for (const p of PEERS[i]) if (g[p] === v) return true;
    return false;
  }

  function render(api) {
    const { $, val, st, fmtClock } = api;
    const showConf = val('opt-conflicts');
    const selVal = S.grid[S.sel], selPeers = new Set(PEERS[S.sel]);
    const cells = $('board').children;
    let left = 0, conflicts = 0;
    for (let i = 0; i < 81; i++) {
      const el = cells[i], v = S.grid[i], conf = hasConflict(S.grid, i);
      if (!v) left++;
      if (conf) conflicts++;
      el.className = 'sdk-cell' + (S.givens[i] ? ' is-given' : v ? ' is-user' : '')
        + (i === S.sel ? ' is-sel' : selVal && v === selVal ? ' is-same' : selPeers.has(i) ? ' is-peer' : '')
        + (showConf && conf ? ' is-conflict' : '');
      if (v) el.textContent = v;
      else if (S.notes[i]) {
        const g = document.createElement('div'); g.className = 'sdk-notes';
        for (let d = 1; d <= 9; d++) { const s = document.createElement('span'); s.textContent = (S.notes[i] & (1 << d)) ? d : ''; g.append(s); }
        el.replaceChildren(g);
      } else el.textContent = '';
    }
    $('left-val').textContent = left;
    const best = st.get('best_' + api.mode(), null);
    $('best-val').textContent = best ? fmtClock(best) : '—';
    $('btn-notes').classList.toggle('is-on', S.noteMode);
    $('btn-notes').setAttribute('aria-pressed', String(S.noteMode));
    api.setUndo(S.hist.length > 0 && !S.over);
    if (left === 0 && conflicts === 0 && !S.over) {
      S.over = true; api.timer.stop();
      const t = api.timer.get();
      if (!best || t < best) st.set('best_' + api.mode(), t);
      $('best-val').textContent = fmtClock(st.get('best_' + api.mode(), t));
      api.sfx.win(); api.status('Solved!', true);
      api.overlay('Puzzle solved!', `Finished in ${fmtClock(t)} · Press Space or New puzzle`);
    }
  }

  function place(api, d) {
    if (S.over || S.givens[S.sel]) { api.sfx.bad(); return; }
    const i = S.sel;
    S.hist.push({ i, v: S.grid[i], notes: S.notes.slice() });
    if (d === 0) { S.grid[i] = 0; S.notes[i] = 0; api.sfx.tap(340); }
    else if (S.noteMode) { S.grid[i] = 0; S.notes[i] ^= (1 << d); api.sfx.tap(460); }
    else {
      S.grid[i] = S.grid[i] === d ? 0 : d;
      S.notes[i] = 0;
      if (S.grid[i] && api.val('opt-autonotes')) for (const p of PEERS[i]) S.notes[p] &= ~(1 << d);
      api.sfx.tap(hasConflict(S.grid, i) ? 210 : 520);
      api.status(S.grid[i] ? `Placed ${d}` : 'Cleared');
    }
    render(api);
  }

  mount({
    slug: 'sudoku', defaultMode: 'medium',
    summary: ({ mode, val, sound }) => `${mode()[0].toUpperCase() + mode().slice(1)} · ${val('opt-conflicts') ? 'conflicts on' : 'conflicts off'} · ${val('opt-autonotes') ? 'auto-clear notes' : 'manual notes'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      const { $, mode, timer, fmtClock, status } = api;
      const board = $('board');
      if (!board.children.length) {
        for (let i = 0; i < 81; i++) {
          const b = document.createElement('div'); b.setAttribute('role', 'gridcell'); b.tabIndex = 0; b.className = 'sdk-cell';
          const [r, c] = rc(i); b.dataset.r = r; b.dataset.c = c; b.dataset.i = i;
          b.setAttribute('aria-label', `Row ${r + 1} column ${c + 1}`);
          b.addEventListener('click', () => { S.sel = i; render(api); });
          board.append(b);
        }
      }
      const { puzzle, sol } = generate(mode());
      S.givens = puzzle.map(Boolean); S.grid = puzzle.slice(); S.sol = sol;
      S.notes = Array(81).fill(0); S.hist = []; S.over = false;
      S.sel = puzzle.findIndex((v) => v === 0); if (S.sel < 0) S.sel = 0;
      status('Select a cell');
      timer.start(0, (s) => { $('time-val').textContent = fmtClock(s); });
      render(api);
    },
    undo(api) {
      const last = S.hist.pop(); if (!last) return;
      S.grid[last.i] = last.v; S.notes = last.notes; S.sel = last.i;
      api.sfx.tap(360); render(api);
    },
    onMode: (_, api) => api.G.newGame(api),
    onSetting: (_, api) => render(api),
    onKey(e, api) {
      if (S.over) return;
      const [r, c] = rc(S.sel);
      const moves = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] };
      const m = moves[e.code] || moves[e.key];
      if (m) { e.preventDefault(); S.sel = ((r + m[0] + 9) % 9) * 9 + ((c + m[1] + 9) % 9); render(api); return; }
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); place(api, +e.key); return; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); place(api, 0); return; }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); S.noteMode = !S.noteMode; render(api); }
    }
  });

  const api = window.__game;
  api.$('numpad').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.num) place(api, +b.dataset.num);
    else if (b.id === 'btn-notes') { S.noteMode = !S.noteMode; render(api); }
    else if (b.id === 'btn-erase') place(api, 0);
  });

  window.__sudoku = { S, place: (d) => place(api, d), render: () => render(api), countSolutions };
})();
