/* Tic Tac Toe — Toolity.in. DOM board, minimax computer, keyboard (numpad layout) + tap. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const cells = [...document.querySelectorAll('.ttt-cell')];
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const KEY = 'toolity_tictactoe';
  const NUMPAD = { Digit7: 0, Digit8: 1, Digit9: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit1: 6, Digit2: 7, Digit3: 8 };
  for (const k in NUMPAD) NUMPAD[k.replace('Digit', 'Numpad')] = NUMPAD[k];

  const S = { mode: 'cpu', diff: 'hard', first: 'x', sound: true, board: Array(9).fill(''), turn: 'x', over: false, games: 0, cpuTimer: 0 };

  /* ── Audio ── */
  let audio;
  function beep(freq, dur = 0.06, type = 'sine', gain = 0.07) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur + 0.01);
    } catch (e) { /* no audio — fine */ }
  }

  /* ── Storage: tally per mode ── */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const tally = () => { const d = load(); return d[S.mode] || { x: 0, o: 0, d: 0 }; };
  function record(result) { // 'x' | 'o' | 'd'
    const d = load(); d[S.mode] = tally(); d[S.mode][result]++;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage blocked */ }
  }

  /* ── Rules ── */
  const winner = (b) => { for (const [a, c, e] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[e]) return { who: b[a], line: [a, c, e] }; return b.every(Boolean) ? { who: 'd' } : null; };
  /* Designed by Kapil Pidhwani: full-depth minimax — the 3×3 tree is tiny (≤ 9! nodes) so no pruning or memo needed. */
  function minimax(b, me, turn, depth) {
    const w = winner(b);
    if (w) return w.who === 'd' ? 0 : (w.who === me ? 10 - depth : depth - 10);
    let best = turn === me ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn; const v = minimax(b, me, turn === 'x' ? 'o' : 'x', depth + 1); b[i] = '';
      best = turn === me ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function bestMove(b, me) {
    let best = -Infinity, moves = [];
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = me; const v = minimax(b, me, me === 'x' ? 'o' : 'x', 1); b[i] = '';
      if (v > best) { best = v; moves = [i]; } else if (v === best) moves.push(i);
    }
    return moves[Math.floor(Math.random() * moves.length)]; // random among equally good → less robotic
  }
  const randomMove = (b) => { const f = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); return f[Math.floor(Math.random() * f.length)]; };

  /* ── Flow ── */
  const cpuMark = () => (S.mode === 'cpu' ? 'o' : null); // computer is always O
  function place(i) {
    if (S.over || S.board[i]) return false;
    S.board[i] = S.turn; beep(S.turn === 'x' ? 520 : 390);
    const w = winner(S.board);
    if (w) { finish(w); return true; }
    S.turn = S.turn === 'x' ? 'o' : 'x'; render(); maybeCpu(); return true;
  }
  function finish(w) {
    S.over = true; S.games++; record(w.who);
    if (w.line) cells.forEach((c, i) => c.classList.toggle('is-win', w.line.includes(i)));
    beep(w.who === 'd' ? 300 : (w.who === 'x' || S.mode === '2p' ? 660 : 220), 0.25, w.who === 'd' ? 'triangle' : 'square', 0.06);
    render();
  }
  function maybeCpu() {
    if (S.over || S.turn !== cpuMark()) return;
    clearTimeout(S.cpuTimer);
    S.cpuTimer = setTimeout(() => { if (!S.over && S.turn === cpuMark()) place(S.diff === 'hard' ? bestMove(S.board, 'o') : randomMove(S.board)); }, 350);
  }
  function newGame() {
    clearTimeout(S.cpuTimer);
    S.board = Array(9).fill(''); S.over = false;
    S.turn = S.first === 'alternate' ? (S.games % 2 ? 'o' : 'x') : S.first;
    cells.forEach((c) => c.classList.remove('is-win'));
    render(); maybeCpu();
  }

  /* ── UI ── */
  function render() {
    cells.forEach((c, i) => { c.textContent = S.board[i].toUpperCase(); c.dataset.mark = S.board[i]; c.disabled = S.over || !!S.board[i] || S.turn === cpuMark(); });
    const t = tally(); $('score-x').textContent = t.x; $('score-d').textContent = t.d; $('score-o').textContent = t.o;
    $('p1-name').textContent = S.mode === '2p' ? 'Player 1 (X)' : 'You (X)';
    $('p2-name').textContent = S.mode === '2p' ? 'Player 2 (O)' : 'Computer (O)';
    const w = S.over && winner(S.board);
    $('turn-badge').textContent = S.over ? (w.who === 'd' ? 'Draw' : `${w.who.toUpperCase()} wins`) : (S.turn === cpuMark() ? 'Computer thinking…' : `${S.turn.toUpperCase()} to move`);
    const ov = $('overlay'); ov.hidden = !S.over;
    if (S.over) {
      $('overlay-title').textContent = w.who === 'd' ? "It's a draw" : S.mode === '2p' ? `Player ${w.who === 'x' ? 1 : 2} wins!` : (w.who === 'x' ? 'You win! 🎉' : 'Computer wins');
      $('overlay-text').textContent = 'Space or New game to play again';
    }
    $('hint').textContent = S.mode === '2p' ? 'Take turns on one device · click a square or press 1–9 · Space for a new game' : 'Click a square or press 1–9 (numpad layout) · Space for a new game';
    $('settings-summary').textContent = `${S.mode === 'cpu' ? (S.diff === 'hard' ? 'Unbeatable' : 'Easy') + ' · ' : ''}${S.first === 'alternate' ? 'alternate start' : S.first.toUpperCase() + ' starts'} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  $('board').addEventListener('click', (e) => { const c = e.target.closest('.ttt-cell'); if (c) place(Number(c.dataset.i)); });
  // Designed by Kapil Pidhwani: `code` can be blank on remapped keyboards — fall back to `key` digits.
  const indexOf = (e) => (e.code in NUMPAD ? NUMPAD[e.code] : /^[1-9]$/.test(e.key) ? NUMPAD['Digit' + e.key] : undefined);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) (S.over ? newGame() : S.board.some(Boolean) ? newGame() : null); return; }
    const i = indexOf(e); if (i === undefined) return;
    e.preventDefault(); place(i);
  });
  $('btn-play').addEventListener('click', newGame);

  /* ── Options ── */
  bindSegmented($('seg-mode'), (v) => { S.mode = v; S.games = 0; newGame(); });
  $('opt-difficulty').addEventListener('change', (e) => { S.diff = e.target.value; render(); });
  $('opt-first').addEventListener('change', (e) => { S.first = e.target.value; newGame(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; render(); });
  function reset() {
    S.mode = 'cpu'; S.diff = 'hard'; S.first = 'x'; S.sound = true; S.games = 0;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    $('seg-mode').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'cpu'));
    $('opt-difficulty').value = 'hard'; $('opt-first').value = 'x'; $('opt-sound').checked = true;
    newGame(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: newGame, reset });

  newGame();
  window.__ttt = { S, place, newGame, bestMove, winner, minimax };
})();
