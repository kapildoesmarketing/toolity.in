/* Designed by Kapil Pidhwani: Chess — full legal rules (castling, en passant, promotion, check/checkmate/stalemate/50-move/
 * 3-fold) + piece-square 3-ply α–β AI (ceiling: ~1200 ELO in <80 ms on the main thread; no opening book or tablebase). */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  /* Compact rank/file bonus tables (from White's perspective, r=0 top → r=7 bottom). */
  const PST_P = [0, 50, 30, 20, 12, 6, 4, 0], CENTER = [0, 4, 8, 12, 12, 8, 4, 0];
  const colorOf = (p) => (!p ? '' : p === p.toUpperCase() ? 'w' : 'b');
  const opp = (c) => (c === 'w' ? 'b' : 'w');
  const sqName = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));

  function startPos() {
    return {
      b: 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR'.split('').map((c) => (c === '.' ? '' : c)),
      turn: 'w', c: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1, last: null
    };
  }
  const clonePos = (P) => ({ b: P.b.slice(), turn: P.turn, c: { ...P.c }, ep: P.ep, half: P.half, full: P.full, last: P.last });
  const posKey = (P) => P.b.map((x) => x || '.').join('') + P.turn + (P.c.K ? 'K' : '') + (P.c.Q ? 'Q' : '') + (P.c.k ? 'k' : '') + (P.c.q ? 'q' : '') + P.ep;

  function attackedBy(b, sq, byColor) {
    const r = Math.floor(sq / 8), c = sq % 8;
    const pr = byColor === 'w' ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      for (const dc of [-1, 1]) {
        const pc = c + dc;
        if (pc >= 0 && pc < 8 && b[pr * 8 + pc] === (byColor === 'w' ? 'P' : 'p')) return true;
      }
    }
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === (byColor === 'w' ? 'N' : 'n')) return true;
    }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === (byColor === 'w' ? 'K' : 'k')) return true;
    }
    for (const [dr, dc, rooks] of [[-1, 0, true], [1, 0, true], [0, -1, true], [0, 1, true], [-1, -1, false], [-1, 1, false], [1, -1, false], [1, 1, false]]) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = b[nr * 8 + nc];
        if (p) {
          if (colorOf(p) === byColor) {
            const t = p.toLowerCase();
            if (t === 'q' || (rooks && t === 'r') || (!rooks && t === 'b')) return true;
          }
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  const kingSq = (b, col) => b.indexOf(col === 'w' ? 'K' : 'k');
  const inCheck = (b, col) => { const k = kingSq(b, col); return k >= 0 && attackedBy(b, k, opp(col)); };

  function pseudoMoves(P, i) {
    const b = P.b, p = b[i]; if (!p) return [];
    const col = colorOf(p), enemy = opp(col), t = p.toLowerCase(), r = Math.floor(i / 8), c = i % 8, out = [];
    const add = (to, flag) => {
      if (t === 'p' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) {
        for (const pr of ['q', 'r', 'b', 'n']) out.push({ from: i, to, promo: col === 'w' ? pr.toUpperCase() : pr, flag });
      } else out.push({ from: i, to, flag });
    };
    if (t === 'p') {
      const dir = col === 'w' ? -1 : 1, startR = col === 'w' ? 6 : 1, r1 = r + dir;
      if (r1 >= 0 && r1 < 8 && !b[r1 * 8 + c]) {
        add(r1 * 8 + c);
        if (r === startR && !b[(r + 2 * dir) * 8 + c]) out.push({ from: i, to: (r + 2 * dir) * 8 + c, flag: 'dp' });
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc; if (nc < 0 || nc > 7 || r1 < 0 || r1 > 7) continue;
        const to = r1 * 8 + nc;
        if (b[to] && colorOf(b[to]) === enemy) add(to);
        else if (to === P.ep) out.push({ from: i, to, flag: 'ep' });
      }
    } else if (t === 'n') {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && colorOf(b[nr * 8 + nc]) !== col) out.push({ from: i, to: nr * 8 + nc });
      }
    } else if (t === 'k') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && colorOf(b[nr * 8 + nc]) !== col) out.push({ from: i, to: nr * 8 + nc });
      }
      const home = col === 'w' ? 60 : 4;
      if (i === home && !inCheck(b, col)) {
        if ((col === 'w' ? P.c.K : P.c.k) && !b[home + 1] && !b[home + 2] && !attackedBy(b, home + 1, enemy) && !attackedBy(b, home + 2, enemy)) out.push({ from: i, to: home + 2, flag: 'ck' });
        if ((col === 'w' ? P.c.Q : P.c.q) && !b[home - 1] && !b[home - 2] && !b[home - 3] && !attackedBy(b, home - 1, enemy) && !attackedBy(b, home - 2, enemy)) out.push({ from: i, to: home - 2, flag: 'cq' });
      }
    } else {
      const dirs = t === 'r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : t === 'b' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = nr * 8 + nc, q = b[to];
          if (!q) out.push({ from: i, to });
          else { if (colorOf(q) === enemy) out.push({ from: i, to }); break; }
          nr += dr; nc += dc;
        }
      }
    }
    return out;
  }

  function makeMove(P, mv) {
    const N = clonePos(P), b = N.b, p = b[mv.from], col = colorOf(p), t = p.toLowerCase();
    let cap = b[mv.to];
    b[mv.from] = '';
    if (mv.flag === 'ep') { const capSq = mv.to + (col === 'w' ? 8 : -8); cap = b[capSq]; b[capSq] = ''; }
    else if (mv.flag === 'ck') { b[mv.from + 1] = b[mv.from + 3]; b[mv.from + 3] = ''; }
    else if (mv.flag === 'cq') { b[mv.from - 1] = b[mv.from - 4]; b[mv.from - 4] = ''; }
    b[mv.to] = mv.promo || p;
    if (p === 'K') { N.c.K = false; N.c.Q = false; } else if (p === 'k') { N.c.k = false; N.c.q = false; }
    if (mv.from === 63 || mv.to === 63) N.c.K = false;
    if (mv.from === 56 || mv.to === 56) N.c.Q = false;
    if (mv.from === 7 || mv.to === 7) N.c.k = false;
    if (mv.from === 0 || mv.to === 0) N.c.q = false;
    N.ep = mv.flag === 'dp' ? (mv.from + mv.to) / 2 : -1;
    N.half = (t === 'p' || cap) ? 0 : P.half + 1;
    if (col === 'b') N.full++;
    N.turn = opp(col);
    N.last = { from: mv.from, to: mv.to, cap, p };
    return N;
  }

  function legalMoves(P, onlyFrom = -1) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      if (onlyFrom >= 0 && i !== onlyFrom) continue;
      if (colorOf(P.b[i]) !== P.turn) continue;
      for (const mv of pseudoMoves(P, i)) {
        const N = makeMove(P, mv);
        if (!inCheck(N.b, P.turn)) out.push(mv);
      }
    }
    return out;
  }

  function san(P, mv, N, nextMoves) {
    if (mv.flag === 'ck') return 'O-O';
    if (mv.flag === 'cq') return 'O-O-O';
    const p = P.b[mv.from], t = p.toLowerCase(), cap = P.b[mv.to] || mv.flag === 'ep';
    const head = t === 'p' ? (cap ? 'abcdefgh'[mv.from % 8] : '') : p.toUpperCase();
    const chk = inCheck(N.b, N.turn) ? (nextMoves.length ? '+' : '#') : '';
    return `${head}${cap ? 'x' : ''}${sqName(mv.to)}${mv.promo ? '=' + mv.promo.toUpperCase() : ''}${chk}`;
  }

  function evalPos(P) {
    let sc = 0;
    for (let i = 0; i < 64; i++) {
      const p = P.b[i]; if (!p) continue;
      const col = colorOf(p), t = p.toLowerCase(), r = Math.floor(i / 8), c = i % 8;
      const rr = col === 'w' ? r : 7 - r;
      let v = VAL[t] + (t === 'p' ? PST_P[rr] + (c >= 2 && c <= 5 ? 6 : 0) : t === 'n' || t === 'b' ? CENTER[r] + CENTER[c] : t === 'k' ? (rr === 7 ? 15 : -10) : 0);
      sc += col === 'w' ? v : -v;
    }
    return sc;
  }

  function search(P, depth, alpha, beta) {
    const moves = legalMoves(P);
    if (!moves.length) return inCheck(P.b, P.turn) ? (P.turn === 'w' ? -50000 - depth : 50000 + depth) : 0;
    if (depth <= 0) return evalPos(P);
    moves.sort((a, b) => (P.b[b.to] ? VAL[P.b[b.to].toLowerCase()] : 0) - (P.b[a.to] ? VAL[P.b[a.to].toLowerCase()] : 0));
    if (P.turn === 'w') {
      let best = -Infinity;
      for (const mv of moves) { best = Math.max(best, search(makeMove(P, mv), depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (alpha >= beta) break; }
      return best;
    }
    let best = Infinity;
    for (const mv of moves) { best = Math.min(best, search(makeMove(P, mv), depth - 1, alpha, beta)); beta = Math.min(beta, best); if (alpha >= beta) break; }
    return best;
  }

  function pickCpu(P, depth) {
    const moves = legalMoves(P); if (!moves.length) return null;
    if (depth <= 1 && Math.random() < 0.35) return moves[Math.floor(Math.random() * moves.length)];
    let best = P.turn === 'w' ? -Infinity : Infinity, picks = [moves[0]];
    for (const mv of moves) {
      const v = search(makeMove(P, mv), depth - 1, -Infinity, Infinity);
      if ((P.turn === 'w' && v > best) || (P.turn === 'b' && v < best)) { best = v; picks = [mv]; }
      else if (v === best) picks.push(mv);
    }
    return picks[Math.floor(Math.random() * picks.length)];
  }

  const S = { P: startPos(), sel: -1, focus: 52, hist: [], sans: [], keys: {}, capW: [], capB: [], pendingPromo: null, over: false, cpuTimer: 0 };

  function cpuSide(api) { return api.mode() === 'cpu' ? opp(api.val('opt-side')) : ''; }

  function commitMove(api, mv) {
    S.hist.push({ P: clonePos(S.P), sans: S.sans.slice(), capW: S.capW.slice(), capB: S.capB.slice(), keys: { ...S.keys } });
    const N = makeMove(S.P, mv);
    const next = legalMoves(N);
    S.sans.push(san(S.P, mv, N, next));
    if (N.last.cap) (S.P.turn === 'w' ? S.capW : S.capB).push(N.last.cap);
    S.P = N; S.sel = -1; S.pendingPromo = null; api.$('promo').hidden = true;
    const k = posKey(S.P); S.keys[k] = (S.keys[k] || 0) + 1;
    if (N.last.cap) api.sfx.capture(); else api.sfx.move();

    if (!next.length) {
      S.over = true;
      const chk = inCheck(S.P.b, S.P.turn);
      const msg = chk ? (S.P.turn === 'w' ? 'Checkmate — Black wins!' : 'Checkmate — White wins!') : 'Stalemate — Draw';
      if (chk) api.sfx.win(); else api.sfx.tap(320);
      api.status(msg, chk && S.P.turn === cpuSide(api));
      api.overlay(msg, 'Press Space or New game to play again');
    } else if (S.P.half >= 100 || S.keys[k] >= 3) {
      S.over = true;
      const msg = S.P.half >= 100 ? 'Draw (50-move rule)' : 'Draw (threefold repetition)';
      api.status(msg, false); api.overlay(msg, 'Press Space or New game to play again');
    }
    render(api);
    maybeCpu(api);
  }

  function maybeCpu(api) {
    clearTimeout(S.cpuTimer);
    if (S.over || S.P.turn !== cpuSide(api)) return;
    S.cpuTimer = setTimeout(() => {
      const mv = pickCpu(S.P, +api.val('opt-diff') || 2);
      if (mv) commitMove(api, mv);
    }, 180);
  }

  function clickSq(api, sq) {
    if (S.over || S.P.turn === cpuSide(api)) return;
    if (S.sel >= 0) {
      const matches = legalMoves(S.P, S.sel).filter((m) => m.to === sq);
      if (matches.length === 1) { commitMove(api, matches[0]); return; }
      if (matches.length > 1) { S.pendingPromo = matches; api.$('promo').hidden = false; return; }
      if (sq === S.sel) { S.sel = -1; render(api); return; }
    }
    if (colorOf(S.P.b[sq]) === S.P.turn) { S.sel = sq; api.sfx.tap(480); render(api); }
  }

  function render(api) {
    const { $, val, mode, status } = api;
    const flip = val('opt-flip') || (mode() === 'cpu' && val('opt-side') === 'b');
    const legal = S.sel >= 0 && !S.over ? legalMoves(S.P, S.sel) : [];
    const moveSet = new Set(legal.map((m) => m.to));
    const chkKing = inCheck(S.P.b, S.P.turn) ? kingSq(S.P.b, S.P.turn) : -1;
    const cells = $('board').children;
    for (let vi = 0; vi < 64; vi++) {
      const sq = flip ? 63 - vi : vi;
      const el = cells[vi], p = S.P.b[sq], dark = ((Math.floor(sq / 8) + (sq % 8)) % 2 === 1);
      const isLast = S.P.last && (S.P.last.from === sq || S.P.last.to === sq);
      el.dataset.sq = sq;
      el.className = 'chess-sq' + (dark ? ' is-dark' : '') + (isLast ? ' is-last' : '') + (sq === S.sel ? ' is-sel' : '')
        + (sq === S.focus ? ' is-focus' : '') + (sq === chkKing ? ' is-check' : '')
        + (moveSet.has(sq) ? (p || sq === S.P.ep ? ' is-cap' : ' is-move') : '');
      if (p) {
        const s = document.createElement('span');
        s.className = 'chess-p-' + colorOf(p);
        s.textContent = GLYPH[p];
        el.replaceChildren(s);
      } else el.replaceChildren();
    }
    $('cap-w').textContent = S.capW.map((p) => GLYPH[p]).join('') || '—';
    $('cap-b').textContent = S.capB.map((p) => GLYPH[p]).join('') || '—';
    $('move-val').textContent = S.P.full;
    const ol = $('moves'); ol.replaceChildren();
    for (let i = 0; i < S.sans.length; i += 2) {
      const li = document.createElement('li');
      li.textContent = S.sans[i] + (S.sans[i + 1] ? '  ' + S.sans[i + 1] : '');
      ol.append(li);
    }
    ol.scrollTop = ol.scrollHeight;
    api.setUndo(S.hist.length > 0 && !S.over);
    if (!S.over) {
      const chk = chkKing >= 0 ? ' · Check!' : '';
      status((S.P.turn === 'w' ? 'White to move' : 'Black to move') + chk);
    }
  }

  mount({
    slug: 'chess', defaultMode: 'cpu',
    summary: ({ mode, val, sound }) => `${mode() === 'cpu' ? '1P vs CPU · ' + { 1: 'Casual', 2: 'Standard', 3: 'Club' }[val('opt-diff')] + ' · as ' + (val('opt-side') === 'w' ? 'White' : 'Black') : '2 Players'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      clearTimeout(S.cpuTimer);
      const board = api.$('board');
      if (!board.children.length) {
        for (let vi = 0; vi < 64; vi++) {
          const b = document.createElement('div'); b.setAttribute('role', 'gridcell'); b.tabIndex = 0; b.className = 'chess-sq';
          b.setAttribute('aria-label', sqName(vi));
          b.addEventListener('click', () => { const sq = +b.dataset.sq; S.focus = sq; clickSq(api, sq); });
          board.append(b);
        }
      }
      S.P = startPos(); S.sel = -1; S.focus = 52; S.hist = []; S.sans = []; S.keys = { [posKey(S.P)]: 1 };
      S.capW = []; S.capB = []; S.pendingPromo = null; S.over = false;
      api.$('promo').hidden = true;
      render(api); maybeCpu(api);
    },
    undo(api) {
      clearTimeout(S.cpuTimer);
      if (!S.hist.length || S.over) return;
      const steps = api.mode() === 'cpu' && S.P.turn !== cpuSide(api) && S.hist.length >= 2 ? 2 : 1;
      let st;
      for (let i = 0; i < steps; i++) st = S.hist.pop();
      if (st) { S.P = st.P; S.sans = st.sans; S.capW = st.capW; S.capB = st.capB; S.keys = st.keys; S.sel = -1; S.over = false; }
      api.sfx.tap(360); render(api);
    },
    onMode: (_, api) => api.G.newGame(api),
    onSetting: (el, api) => { if (el.id === 'opt-side') api.G.newGame(api); else render(api); },
    onKey(e, api) {
      if (S.over) return;
      const r = Math.floor(S.focus / 8), c = S.focus % 8;
      const moves = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] };
      const m = moves[e.code] || moves[e.key];
      if (m) { e.preventDefault(); S.focus = ((r + m[0] + 8) % 8) * 8 + ((c + m[1] + 8) % 8); render(api); return; }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); clickSq(api, S.focus); }
    }
  });

  const api = window.__game;
  api.$('promo').addEventListener('click', (e) => {
    const b = e.target.closest('[data-promo]'); if (!b || !S.pendingPromo) return;
    const want = b.dataset.promo;
    const mv = S.pendingPromo.find((m) => m.promo.toLowerCase() === want) || S.pendingPromo[0];
    commitMove(api, mv);
  });

  window.__chess = { S, legalMoves, makeMove, inCheck, commitMove: (mv) => commitMove(api, mv), render: () => render(api) };
})();
