/* Designed by Kapil Pidhwani: Checkers — American draughts (8×8, mandatory jumps, multi-jump chains, kings) with depth-6 α–β CPU. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const S = { b: Array(64).fill(0), turn: 1, sel: -1, chain: -1, focus: 40, hist: [], over: false, cpuTimer: 0 };
  const sign = (p) => (p > 0 ? 1 : p < 0 ? -1 : 0);
  const isKing = (p) => Math.abs(p) === 2;
  const dirsOf = (p) => (isKing(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : p > 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

  function initBoard() {
    const b = Array(64).fill(0);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) { if (r < 3) b[r * 8 + c] = -1; else if (r > 4) b[r * 8 + c] = 1; }
    }
    return b;
  }

  function jumpsFrom(b, i) {
    const p = b[i]; if (!p) return [];
    const r = Math.floor(i / 8), c = i % 8, s = sign(p), out = [];
    for (const [dr, dc] of dirsOf(p)) {
      const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
      const mid = mr * 8 + mc, to = tr * 8 + tc;
      if (sign(b[mid]) === -s && b[to] === 0) out.push({ from: i, to, cap: mid });
    }
    return out;
  }

  function stepsFrom(b, i) {
    const p = b[i]; if (!p) return [];
    const r = Math.floor(i / 8), c = i % 8, out = [];
    for (const [dr, dc] of dirsOf(p)) {
      const tr = r + dr, tc = c + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && b[tr * 8 + tc] === 0) out.push({ from: i, to: tr * 8 + tc, cap: -1 });
    }
    return out;
  }

  function legalMoves(b, side, forced, chainAt = -1) {
    if (chainAt >= 0) return jumpsFrom(b, chainAt);
    const jumps = [], steps = [];
    for (let i = 0; i < 64; i++) if (sign(b[i]) === side) {
      jumps.push(...jumpsFrom(b, i));
      steps.push(...stepsFrom(b, i));
    }
    return forced && jumps.length ? jumps : jumps.concat(steps);
  }

  function applyStep(b, mv) {
    const nb = b.slice(), p = nb[mv.from];
    nb[mv.from] = 0;
    if (mv.cap >= 0) nb[mv.cap] = 0;
    const tr = Math.floor(mv.to / 8);
    const crowned = (p === 1 && tr === 0) ? 2 : (p === -1 && tr === 7) ? -2 : p;
    nb[mv.to] = crowned;
    const more = mv.cap >= 0 && crowned === p ? jumpsFrom(nb, mv.to) : [];
    return { b: nb, chain: more.length ? mv.to : -1 };
  }

  function evaluate(b) {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p) continue;
      const r = Math.floor(i / 8);
      if (p === 1) v -= 100 + (7 - r) * 4;
      else if (p === 2) v -= 165;
      else if (p === -1) v += 100 + r * 4;
      else if (p === -2) v += 165;
    }
    return v;
  }

  function search(b, depth, alpha, beta, side, forced, chainAt) {
    const moves = legalMoves(b, side, forced, chainAt);
    if (!moves.length) return side === -1 ? -900 - depth : 900 + depth;
    if (depth <= 0 && chainAt < 0) return evaluate(b);
    if (side === -1) {
      let best = -Infinity;
      for (const mv of moves) {
        const { b: nb, chain } = applyStep(b, mv);
        const sc = chain >= 0 ? search(nb, depth, alpha, beta, -1, forced, chain) : search(nb, depth - 1, alpha, beta, 1, forced, -1);
        best = Math.max(best, sc); alpha = Math.max(alpha, best); if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const mv of moves) {
      const { b: nb, chain } = applyStep(b, mv);
      const sc = chain >= 0 ? search(nb, depth, alpha, beta, 1, forced, chain) : search(nb, depth - 1, alpha, beta, -1, forced, -1);
      best = Math.min(best, sc); beta = Math.min(beta, best); if (alpha >= beta) break;
    }
    return best;
  }

  function pickCpuMove(b, diff, forced, chainAt) {
    const moves = legalMoves(b, -1, forced, chainAt);
    if (!moves.length) return null;
    if (diff === 'easy' && Math.random() < 0.5) return moves[Math.floor(Math.random() * moves.length)];
    const depth = diff === 'easy' ? 2 : diff === 'medium' ? 4 : 6;
    let best = -Infinity, picks = [moves[0]];
    for (const mv of moves) {
      const { b: nb, chain } = applyStep(b, mv);
      const sc = chain >= 0 ? search(nb, depth, -Infinity, Infinity, -1, forced, chain) : search(nb, depth - 1, -Infinity, Infinity, 1, forced, -1);
      if (sc > best) { best = sc; picks = [mv]; } else if (sc === best) picks.push(mv);
    }
    return picks[Math.floor(Math.random() * picks.length)];
  }

  function doMove(api, mv, fromCpu) {
    if (!fromCpu && S.chain < 0) S.hist.push({ b: S.b.slice(), turn: S.turn });
    const res = applyStep(S.b, mv);
    S.b = res.b;
    if (mv.cap >= 0) api.sfx.capture(); else api.sfx.move();
    if (res.chain >= 0) {
      S.chain = res.chain; S.sel = res.chain;
      render(api);
      if (fromCpu) maybeCpu(api);
      return;
    }
    S.chain = -1; S.sel = -1; S.turn = -S.turn;
    const nextMoves = legalMoves(S.b, S.turn, api.val('opt-forced'), -1);
    if (!nextMoves.length) {
      S.over = true;
      const winSide = -S.turn, key = api.mode(), w = api.st.get(key, { r: 0, b: 0 });
      if (winSide === 1) w.r++; else w.b++;
      api.st.set(key, w);
      const cpu = api.mode() === 'cpu';
      const msg = winSide === 1 ? (cpu ? 'You win!' : 'Red wins!') : (cpu ? 'Computer wins' : 'Black wins!');
      if (winSide === 1 || !cpu) api.sfx.win(); else api.sfx.lose();
      api.status(msg, winSide === 1 || !cpu);
      api.overlay(msg, 'Press Space or New game to play again');
      render(api); return;
    }
    render(api);
    maybeCpu(api);
  }

  function maybeCpu(api) {
    clearTimeout(S.cpuTimer);
    if (S.over || api.mode() !== 'cpu' || S.turn !== -1) return;
    S.cpuTimer = setTimeout(() => {
      const mv = pickCpuMove(S.b, api.val('opt-diff'), api.val('opt-forced'), S.chain);
      if (mv) doMove(api, mv, true);
    }, 220);
  }

  function clickSquare(api, i) {
    if (S.over || (api.mode() === 'cpu' && S.turn === -1)) return;
    const all = legalMoves(S.b, S.turn, api.val('opt-forced'), S.chain);
    if (S.sel >= 0) {
      const mv = all.find((m) => m.from === S.sel && m.to === i);
      if (mv) { doMove(api, mv, false); return; }
      if (S.chain < 0 && i === S.sel) { S.sel = -1; render(api); return; }
    }
    if (S.chain < 0 && all.some((m) => m.from === i)) {
      S.sel = i; api.sfx.tap(480); render(api);
    } else if (S.b[i]) api.sfx.bad();
  }

  function render(api) {
    const { $, st, mode, val, status } = api;
    const all = S.over ? [] : legalMoves(S.b, S.turn, val('opt-forced'), S.chain);
    const targets = new Set(all.filter((m) => m.from === S.sel).map((m) => m.to));
    const mustFrom = new Set(all.filter((m) => m.cap >= 0).map((m) => m.from));
    const sqs = $('board').children;
    let rCount = 0, bCount = 0;
    for (let i = 0; i < 64; i++) {
      const sq = sqs[i], p = S.b[i], dark = ((Math.floor(i / 8) + (i % 8)) % 2 === 1);
      if (p > 0) rCount++; else if (p < 0) bCount++;
      sq.className = 'chk-sq' + (dark ? ' is-dark' : '') + (i === S.sel ? ' is-sel' : '') + (i === S.focus ? ' is-focus' : '') + (targets.has(i) ? ' is-hint' : '') + (mustFrom.has(i) ? ' is-must' : '');
      if (p) {
        const d = document.createElement('span');
        d.className = 'chk-disc ' + (p > 0 ? 'is-r' : 'is-b');
        d.textContent = isKing(p) ? 'K' : '';
        sq.replaceChildren(d);
      } else sq.replaceChildren();
    }
    $('r-left').textContent = rCount; $('b-left').textContent = bCount;
    const w = st.get(mode(), { r: 0, b: 0 });
    $('wins-val').textContent = `${w.r}–${w.b}`;
    api.setUndo(S.hist.length > 0 && !S.over);
    if (!S.over) {
      const cpu = mode() === 'cpu';
      status(S.chain >= 0 ? 'Continue jump!' : S.turn === 1 ? (cpu ? 'Your turn (Red)' : 'Red to move') : (cpu ? 'Computer thinking…' : 'Black to move'));
    }
  }

  mount({
    slug: 'checkers', defaultMode: 'cpu',
    summary: ({ mode, val, sound }) => `${mode() === 'cpu' ? '1P vs CPU · ' + val('opt-diff') : '2 Players'} · ${val('opt-forced') ? 'forced jumps' : 'free jumps'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      clearTimeout(S.cpuTimer);
      const board = api.$('board');
      if (!board.children.length) {
        for (let i = 0; i < 64; i++) {
          const b = document.createElement('div'); b.setAttribute('role', 'gridcell'); b.tabIndex = 0; b.className = 'chk-sq';
          b.setAttribute('aria-label', `Row ${Math.floor(i / 8) + 1} col ${(i % 8) + 1}`);
          b.addEventListener('click', () => { S.focus = i; clickSquare(api, i); });
          board.append(b);
        }
      }
      S.b = initBoard(); S.turn = 1; S.sel = -1; S.chain = -1; S.focus = 40; S.hist = []; S.over = false;
      render(api);
    },
    undo(api) {
      clearTimeout(S.cpuTimer);
      const prev = S.hist.pop(); if (!prev) return;
      S.b = prev.b; S.turn = prev.turn; S.sel = -1; S.chain = -1; S.over = false;
      api.overlay(null); api.sfx.tap(360); render(api);
    },
    onMode: (_, api) => api.G.newGame(api),
    onSetting: (_, api) => render(api),
    onKey(e, api) {
      if (S.over) return;
      const r = Math.floor(S.focus / 8), c = S.focus % 8;
      const moves = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] };
      const m = moves[e.code] || moves[e.key];
      if (m) { e.preventDefault(); S.focus = ((r + m[0] + 8) % 8) * 8 + ((c + m[1] + 8) % 8); render(api); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); clickSquare(api, S.focus); return; }
      if (e.key === 'Backspace' && S.chain < 0) { S.sel = -1; render(api); }
    }
  });

  const api = window.__game;
  window.__checkers = { S, legalMoves, clickSquare: (i) => clickSquare(api, i), render: () => render(api) };
})();
