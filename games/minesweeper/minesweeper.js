/* Designed by Kapil Pidhwani: Minesweeper — mines laid after the first click so the opening 3×3 is always safe. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const CFG = { easy: [9, 9, 10], medium: [16, 16, 40], hard: [16, 30, 99] };
  const S = { rows: 9, cols: 9, mines: 10, mine: [], open: [], flag: [], count: [], planted: false, focus: 0, flagMode: false, snap: null, over: false };

  function adj(i) {
    const r = Math.floor(i / S.cols), c = i % S.cols, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < S.rows && nc >= 0 && nc < S.cols) out.push(nr * S.cols + nc);
    }
    return out;
  }

  function plant(safeIdx) {
    const n = S.rows * S.cols, safe = new Set([safeIdx, ...adj(safeIdx)]);
    const pool = [];
    for (let i = 0; i < n; i++) if (!safe.has(i)) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (let k = 0; k < S.mines && k < pool.length; k++) S.mine[pool[k]] = true;
    for (let i = 0; i < n; i++) S.count[i] = S.mine[i] ? -1 : adj(i).filter((j) => S.mine[j]).length;
    S.planted = true;
  }

  function flood(start) {
    const q = [start];
    while (q.length) {
      const i = q.pop();
      if (S.open[i] || S.flag[i]) continue;
      S.open[i] = true;
      if (S.count[i] === 0) for (const j of adj(i)) if (!S.open[j] && !S.flag[j]) q.push(j);
    }
  }

  function dig(api, i) {
    if (S.over || S.flag[i]) return;
    if (S.open[i]) {
      if (!api.val('opt-chord') || S.count[i] <= 0) return;
      const ns = adj(i), flags = ns.filter((j) => S.flag[j]).length;
      if (flags !== S.count[i]) return;
      S.snap = { open: S.open.slice(), flag: S.flag.slice() };
      for (const j of ns) if (!S.flag[j] && !S.open[j]) step(api, j);
      checkWin(api); render(api); return;
    }
    if (!S.planted) {
      plant(i);
      api.status('Sweep the field');
      api.timer.start(0, (s) => { api.$('time-val').textContent = api.fmtClock(s); });
    }
    S.snap = { open: S.open.slice(), flag: S.flag.slice() };
    step(api, i);
    checkWin(api); render(api);
  }

  function step(api, i) {
    if (S.mine[i]) {
      S.open[i] = true; S.over = true; api.timer.stop();
      api.sfx.lose(); api.status('Boom!', false);
      api.overlay('Mine detonated', 'Press Z / Undo to step back, or Space for a new board');
      return;
    }
    flood(i); api.sfx.tap(500);
  }

  function checkWin(api) {
    if (S.over) return;
    const n = S.rows * S.cols;
    for (let i = 0; i < n; i++) if (!S.mine[i] && !S.open[i]) return;
    S.over = true; api.timer.stop();
    for (let i = 0; i < n; i++) if (S.mine[i]) S.flag[i] = true;
    const t = api.timer.get(), key = 'best_' + api.mode(), best = api.st.get(key, null);
    if (!best || t < best) api.st.set(key, t);
    api.sfx.win(); api.status('Cleared!', true);
    api.overlay('Field cleared!', `Time ${api.fmtClock(t)} · Press Space or New game`);
  }

  function toggleFlag(api, i) {
    if (S.over || S.open[i]) return;
    S.flag[i] = !S.flag[i];
    api.sfx.tap(S.flag[i] ? 620 : 380);
    render(api);
  }

  function render(api) {
    const { $, st, fmtClock } = api;
    const cells = $('board').children, n = S.rows * S.cols;
    let flags = 0;
    for (let i = 0; i < n; i++) {
      const el = cells[i], open = S.open[i], fl = S.flag[i], m = S.mine[i], c = S.count[i];
      if (fl) flags++;
      el.className = 'ms-cell' + (open ? ' is-open' : '') + (fl ? ' is-flag' : '') + ((open && m) || (S.over && m && !fl) ? ' is-mine' : '') + (i === S.focus ? ' is-focus' : '');
      el.dataset.n = open && c > 0 ? c : '';
      el.textContent = fl ? '⚑' : (open && m) || (S.over && m) ? '✹' : open && c > 0 ? c : '';
    }
    $('mines-val').textContent = S.mines - flags;
    const best = st.get('best_' + api.mode(), null);
    $('best-val').textContent = best !== null ? fmtClock(best) : '—';
    const fb = $('btn-flag-mode');
    fb.classList.toggle('is-on', S.flagMode);
    fb.setAttribute('aria-pressed', String(S.flagMode));
    $('flag-mode-label').textContent = S.flagMode ? 'Mode: Flag' : 'Mode: Dig';
    api.setUndo(!!S.snap);
  }

  mount({
    slug: 'minesweeper', defaultMode: 'easy',
    summary: ({ mode, val, sound }) => `${{ easy: '9×9', medium: '16×16', hard: '16×30' }[mode()]} · ${val('opt-chord') ? 'chord on' : 'chord off'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      const { $, mode, timer, fmtClock, status } = api;
      timer.stop();
      [S.rows, S.cols, S.mines] = CFG[mode()] || CFG.easy;
      const n = S.rows * S.cols;
      S.mine = Array(n).fill(false); S.open = Array(n).fill(false); S.flag = Array(n).fill(false); S.count = Array(n).fill(0);
      S.planted = false; S.focus = 0; S.snap = null; S.over = false;
      const board = $('board');
      board.dataset.cols = S.cols;
      board.replaceChildren(...Array.from({ length: n }, (_, i) => {
        const b = document.createElement('div'); b.setAttribute('role', 'gridcell'); b.tabIndex = 0; b.className = 'ms-cell';
        b.setAttribute('aria-label', `Row ${Math.floor(i / S.cols) + 1} col ${(i % S.cols) + 1}`);
        b.addEventListener('click', () => { S.focus = i; if (S.flagMode && !S.open[i]) toggleFlag(api, i); else dig(api, i); });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); S.focus = i; toggleFlag(api, i); });
        return b;
      }));
      $('time-val').textContent = fmtClock(0);
      status('Click any square to start');
      render(api);
    },
    undo(api) {
      if (!S.snap) return;
      S.open = S.snap.open; S.flag = S.snap.flag; S.snap = null; S.over = false;
      api.overlay(null); api.status('Stepped back');
      render(api);
    },
    onMode: (_, api) => api.G.newGame(api),
    onKey(e, api) {
      const r = Math.floor(S.focus / S.cols), c = S.focus % S.cols;
      const moves = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] };
      const m = moves[e.code] || moves[e.key];
      if (m) { e.preventDefault(); S.focus = ((r + m[0] + S.rows) % S.rows) * S.cols + ((c + m[1] + S.cols) % S.cols); render(api); return; }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFlag(api, S.focus); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !S.over) { e.preventDefault(); dig(api, S.focus); }
    }
  });

  const api = window.__game;
  api.$('btn-flag-mode').addEventListener('click', () => { S.flagMode = !S.flagMode; render(api); });
  window.__ms = { S, dig: (i) => dig(api, i), toggleFlag: (i) => toggleFlag(api, i) };
})();
