/* Designed by Kapil Pidhwani: Connect Four — 7×6 grid with depth-7 α–β minimax + centre-column ordering (ceiling:
 * heuristic evaluation at depth 7, ~10 ms/move; strong tactical play without a tablebase). */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const ROWS = 6, COLS = 7, ORDER = [3, 2, 4, 1, 5, 0, 6];
  const S = { b: Array(42).fill(0), turn: 1, aim: 3, hist: [], games: 0, over: false, winLine: null, cpuTimer: 0 };

  /* Precompute all 69 four-cell lines on the 7×6 board. */
  const LINES = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c <= 3) LINES.push([r * 7 + c, r * 7 + c + 1, r * 7 + c + 2, r * 7 + c + 3]);
    if (r <= 2) LINES.push([r * 7 + c, (r + 1) * 7 + c, (r + 2) * 7 + c, (r + 3) * 7 + c]);
    if (r <= 2 && c <= 3) LINES.push([r * 7 + c, (r + 1) * 7 + c + 1, (r + 2) * 7 + c + 2, (r + 3) * 7 + c + 3]);
    if (r <= 2 && c >= 3) LINES.push([r * 7 + c, (r + 1) * 7 + c - 1, (r + 2) * 7 + c - 2, (r + 3) * 7 + c - 3]);
  }

  function lowestRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) if (!b[r * 7 + col]) return r;
    return -1;
  }
  function checkWinner(b) {
    for (const ln of LINES) {
      const p = b[ln[0]];
      if (p && p === b[ln[1]] && p === b[ln[2]] && p === b[ln[3]]) return { who: p, line: ln };
    }
    return b.every(Boolean) ? { who: 0, line: [] } : null;
  }

  function evaluate(b, me) {
    const opp = 3 - me;
    let score = 0;
    for (let r = 0; r < ROWS; r++) { const p = b[r * 7 + 3]; if (p === me) score += 3; else if (p === opp) score -= 3; }
    for (const [a, c, d, e] of LINES) {
      let m = 0, o = 0;
      for (const idx of [a, c, d, e]) { if (b[idx] === me) m++; else if (b[idx] === opp) o++; }
      if (m && o) continue;
      if (m === 3) score += 14; else if (m === 2) score += 3;
      if (o === 3) score -= 16; else if (o === 2) score -= 3;
    }
    return score;
  }

  function alphabeta(b, depth, alpha, beta, turn, me) {
    const w = checkWinner(b);
    if (w) return w.who === 0 ? 0 : w.who === me ? 1000 + depth : -1000 - depth;
    if (depth === 0) return evaluate(b, me);
    if (turn === me) {
      let v = -Infinity;
      for (const col of ORDER) {
        const r = lowestRow(b, col); if (r < 0) continue;
        b[r * 7 + col] = turn;
        v = Math.max(v, alphabeta(b, depth - 1, alpha, beta, 3 - turn, me));
        b[r * 7 + col] = 0;
        alpha = Math.max(alpha, v); if (alpha >= beta) break;
      }
      return v;
    }
    let v = Infinity;
    for (const col of ORDER) {
      const r = lowestRow(b, col); if (r < 0) continue;
      b[r * 7 + col] = turn;
      v = Math.min(v, alphabeta(b, depth - 1, alpha, beta, 3 - turn, me));
      b[r * 7 + col] = 0;
      beta = Math.min(beta, v); if (alpha >= beta) break;
    }
    return v;
  }

  function cpuMove(b, diff) {
    const legal = ORDER.filter((c) => lowestRow(b, c) >= 0);
    if (!legal.length) return -1;
    if (diff === 'easy' && Math.random() < 0.55) return legal[Math.floor(Math.random() * legal.length)];
    const depth = diff === 'easy' ? 2 : diff === 'medium' ? 4 : 7;
    let best = -Infinity, picks = [legal[0]];
    for (const col of legal) {
      const r = lowestRow(b, col);
      b[r * 7 + col] = 2;
      const v = alphabeta(b, depth - 1, -Infinity, Infinity, 1, 2);
      b[r * 7 + col] = 0;
      if (v > best) { best = v; picks = [col]; } else if (v === best) picks.push(col);
    }
    return picks[Math.floor(Math.random() * picks.length)];
  }

  function drop(api, col, fromCpu) {
    if (S.over) return false;
    if (api.mode() === 'cpu' && S.turn === 2 && !fromCpu) return false;
    const r = lowestRow(S.b, col); if (r < 0) { api.sfx.bad(); return false; }
    const idx = r * 7 + col;
    S.b[idx] = S.turn; S.hist.push(idx); S.aim = col;
    api.sfx.tap(S.turn === 1 ? 500 : 390);
    const w = checkWinner(S.b);
    if (w) { finish(api, w); return true; }
    S.turn = 3 - S.turn;
    render(api);
    maybeCpu(api);
    return true;
  }

  function maybeCpu(api) {
    clearTimeout(S.cpuTimer);
    if (S.over || api.mode() !== 'cpu' || S.turn !== 2) return;
    S.cpuTimer = setTimeout(() => {
      const col = cpuMove(S.b, api.val('opt-diff'));
      if (col >= 0) drop(api, col, true);
    }, 220);
  }

  function finish(api, w) {
    S.over = true; S.games++; S.winLine = new Set(w.line);
    const key = api.mode(), t = api.st.get(key, { r: 0, d: 0, y: 0 });
    if (w.who === 1) t.r++; else if (w.who === 2) t.y++; else t.d++;
    api.st.set(key, t);
    const cpu = api.mode() === 'cpu';
    const msg = w.who === 0 ? 'Draw' : w.who === 1 ? (cpu ? 'You win!' : 'Red wins!') : (cpu ? 'Computer wins' : 'Yellow wins!');
    if (w.who === 1 || (w.who === 2 && !cpu)) api.sfx.win(); else if (w.who === 2) api.sfx.lose(); else api.sfx.tap(320);
    api.status(msg, w.who === 1 || (w.who === 2 && !cpu));
    api.overlay(msg, 'Press Space or New game to play again');
    render(api);
  }

  function render(api) {
    const { $, st, mode, status } = api;
    const cells = $('board').children, topAim = lowestRow(S.b, S.aim) * 7 + S.aim;
    for (let i = 0; i < 42; i++) {
      const el = cells[i];
      el.dataset.p = S.b[i] || '';
      el.className = 'c4-cell' + (!S.over && i === topAim ? ' is-aim' : '') + (S.winLine && S.winLine.has(i) ? ' is-win' : '');
    }
    const t = st.get(mode(), { r: 0, d: 0, y: 0 });
    $('r-wins').textContent = t.r; $('draws').textContent = t.d; $('y-wins').textContent = t.y;
    api.setUndo(S.hist.length > 0 && !S.over);
    if (!S.over) {
      const cpu = mode() === 'cpu';
      status(S.turn === 1 ? (cpu ? 'Your turn (Red)' : 'Red’s turn') : (cpu ? 'Computer thinking…' : 'Yellow’s turn'));
    }
  }

  mount({
    slug: 'connect-four', defaultMode: 'cpu',
    summary: ({ mode, val, sound }) => `${mode() === 'cpu' ? '1P vs CPU · ' + val('opt-diff') : '2 Players'} · ${val('opt-first') === '1' ? 'Red first' : val('opt-first') === '2' ? 'Yellow first' : 'alternate'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      clearTimeout(S.cpuTimer);
      const board = api.$('board');
      if (!board.children.length) {
        for (let i = 0; i < 42; i++) {
          const b = document.createElement('div'); b.setAttribute('role', 'gridcell'); b.tabIndex = 0; b.className = 'c4-cell';
          const col = i % 7;
          b.setAttribute('aria-label', `Column ${col + 1} row ${Math.floor(i / 7) + 1}`);
          b.addEventListener('click', () => drop(api, col, false));
          b.addEventListener('pointerenter', () => { if (!S.over) { S.aim = col; render(api); } });
          board.append(b);
        }
      }
      S.b.fill(0); S.hist = []; S.over = false; S.winLine = null; S.aim = 3;
      const f = api.val('opt-first');
      S.turn = f === 'alt' ? (S.games % 2 === 0 ? 1 : 2) : +f;
      render(api); maybeCpu(api);
    },
    undo(api) {
      clearTimeout(S.cpuTimer);
      if (!S.hist.length || S.over) return;
      const steps = api.mode() === 'cpu' && S.turn === 1 && S.hist.length >= 2 ? 2 : 1;
      for (let i = 0; i < steps; i++) { const idx = S.hist.pop(); S.b[idx] = 0; S.turn = 3 - S.turn; }
      api.sfx.tap(350); render(api);
    },
    onMode: (_, api) => { S.games = 0; api.G.newGame(api); },
    onSetting: (el, api) => { if (el.id === 'opt-first') api.G.newGame(api); else render(api); },
    onKey(e, api) {
      if (S.over) return;
      if (/^[1-7]$/.test(e.key)) { e.preventDefault(); drop(api, +e.key - 1, false); return; }
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); S.aim = (S.aim + 6) % 7; render(api); return; }
      if (e.key === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); S.aim = (S.aim + 1) % 7; render(api); return; }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); drop(api, S.aim, false); }
    }
  });

  const api = window.__game;
  window.__c4 = { S, drop: (c) => drop(api, c, false), cpuMove, checkWinner };
})();
