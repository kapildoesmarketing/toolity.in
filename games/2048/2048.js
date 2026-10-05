/* 2048 — Toolity.in. DOM tiles, keyboard + swipe, one-step undo, best per board size. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const board = $('board');
  const KEY = 'toolity_2048';
  const S = { n: 4, grid: [], score: 0, won: false, over: false, keepGoing: false, undoOn: true, sound: true, prev: null, moved: new Set(), merged: new Set() };

  /* ── Audio ── */
  let audio;
  function beep(freq, dur = 0.05, type = 'sine', gain = 0.05) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur + 0.01);
    } catch (e) { /* no audio — fine */ }
  }

  /* ── Storage ── */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const best = () => load()[S.n] || 0;
  function saveBest() { if (S.score <= best()) return; const d = load(); d[S.n] = S.score; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* blocked */ } }

  /* ── Core: slide one row left, return {row, gained, movedAny} ──
     Designed by Kapil Pidhwani: every direction is "rotate → slide left → rotate back"; simplest correct form, O(n²) per move. */
  function slideRow(row) {
    const vals = row.filter(Boolean), out = []; let gained = 0;
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); gained += vals[i] * 2; i++; } else out.push(vals[i]);
    }
    while (out.length < row.length) out.push(0);
    return { row: out, gained, movedAny: out.some((v, i) => v !== row[i]) };
  }
  const rotate = (g) => g[0].map((_, c) => g.map((r) => r[c]).reverse()); // clockwise
  const TURNS = { left: 0, up: 1, right: 2, down: 3 }; // rotations so that "left" works
  function applyMove(grid, dir) {
    let g = grid.map((r) => [...r]), gained = 0, movedAny = false;
    const t = TURNS[dir];
    for (let i = 0; i < t; i++) g = rotate(g);
    g = g.map((r) => { const s = slideRow(r); gained += s.gained; movedAny = movedAny || s.movedAny; return s.row; });
    for (let i = 0; i < (4 - t) % 4; i++) g = rotate(g);
    return { grid: g, gained, movedAny };
  }
  const empties = (g) => { const e = []; g.forEach((r, y) => r.forEach((v, x) => { if (!v) e.push([y, x]); })); return e; };
  function spawn(g) { const e = empties(g); if (!e.length) return null; const [y, x] = e[Math.floor(Math.random() * e.length)]; g[y][x] = Math.random() < 0.9 ? 2 : 4; return [y, x]; }
  const canMove = (g) => ['left', 'up', 'right', 'down'].some((d) => applyMove(g, d).movedAny);
  const maxTile = (g) => Math.max(...g.flat());

  /* ── Flow ── */
  function move(dir) {
    if (S.over) return false;
    const r = applyMove(S.grid, dir); if (!r.movedAny) return false;
    S.prev = { grid: S.grid, score: S.score, won: S.won };
    S.grid = r.grid; S.score += r.gained; saveBest();
    const sp = spawn(S.grid); S.merged = new Set(); S.spawned = sp ? sp[0] * S.n + sp[1] : -1;
    if (r.gained) { S.grid.forEach((row, y) => row.forEach((v, x) => { if (v && v !== S.prev.grid[y][x] && v > 2 && (y * S.n + x) !== S.spawned) S.merged.add(y * S.n + x); })); beep(440 + Math.log2(r.gained) * 40, 0.06); }
    else beep(260, 0.03, 'triangle', 0.03);
    if (!S.won && maxTile(S.grid) >= 2048) { S.won = true; S.keepGoing = false; beep(880, 0.4, 'square', 0.05); }
    if (!canMove(S.grid)) { S.over = true; beep(160, 0.4, 'sawtooth', 0.05); }
    render(); return true;
  }
  function undo() {
    if (!S.undoOn || !S.prev) return;
    S.grid = S.prev.grid; S.score = S.prev.score; S.won = S.prev.won; S.over = false; S.prev = null; S.merged = new Set(); S.spawned = -1;
    render();
  }
  function newGame() {
    S.grid = Array.from({ length: S.n }, () => Array(S.n).fill(0)); S.score = 0; S.won = false; S.over = false; S.keepGoing = false; S.prev = null; S.merged = new Set();
    spawn(S.grid); spawn(S.grid); S.spawned = -1;
    buildBoard(); render();
  }

  /* ── Render ── */
  function buildBoard() {
    board.style.setProperty('--n', S.n);
    board.innerHTML = Array.from({ length: S.n * S.n }, (_, i) => `<div class="g2048-cell" data-i="${i}"></div>`).join('');
  }
  function render() {
    const cells = board.children;
    S.grid.forEach((row, y) => row.forEach((v, x) => {
      const i = y * S.n + x, c = cells[i];
      c.textContent = v || ''; c.dataset.v = v ? String(Math.min(v, 4096)) : '';
      c.classList.toggle('is-new', i === S.spawned); c.classList.toggle('is-merged', S.merged.has(i));
      c.classList.toggle('is-small', v >= 1000); c.classList.toggle('is-tiny', v >= 10000);
    }));
    $('score-val').textContent = S.score; $('best-val').textContent = best();
    $('best-badge').hidden = !best(); $('best-badge').textContent = `best ${best()} on ${S.n}×${S.n}`;
    $('btn-undo').disabled = !S.undoOn || !S.prev; $('btn-undo').hidden = !S.undoOn;
    $('status-badge').textContent = S.over ? 'Game over' : S.won ? `${maxTile(S.grid)} tile!` : `Reach ${S.n === 3 ? 256 : S.n === 5 ? 4096 : 2048}`;
    const showWin = S.won && !S.keepGoing && !S.over;
    $('overlay').hidden = !(S.over || showWin);
    $('btn-continue').hidden = !showWin;
    if (S.over) { $('overlay-title').textContent = 'Game over'; $('overlay-text').textContent = `Score ${S.score} · Space or New game to try again`; }
    else if (showWin) { $('overlay-title').textContent = 'You made 2048! 🎉'; $('overlay-text').textContent = `Score ${S.score} · keep going or start fresh`; }
    $('settings-summary').textContent = `${S.n}×${S.n} · undo ${S.undoOn ? 'on' : 'off'} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  const KEY_FALLBACK = { Left: 'left', Right: 'right', Up: 'up', Down: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  // Designed by Kapil Pidhwani: discrete moves on keydown only, so tap-pair (remote desktop) keyboards behave identically to real ones.
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) newGame(); return; }
    if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); return; }
    const dir = DIRS[e.code] || KEY_FALLBACK[e.key] || (e.key.startsWith('Arrow') ? DIRS[e.key] : null);
    if (!dir) return; e.preventDefault(); if (!e.repeat) move(dir);
  });
  let sw = null;
  board.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  window.addEventListener('pointerup', (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  $('btn-play').addEventListener('click', newGame);
  $('btn-undo').addEventListener('click', undo);
  $('btn-continue').addEventListener('click', () => { S.keepGoing = true; render(); });

  /* ── Options ── */
  bindSegmented($('seg-size'), (v) => { S.n = Number(v); newGame(); });
  $('opt-undo').addEventListener('change', (e) => { S.undoOn = e.target.checked; render(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; render(); });
  function reset() {
    S.n = 4; S.undoOn = true; S.sound = true;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    $('seg-size').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === '4'));
    $('opt-undo').checked = true; $('opt-sound').checked = true;
    newGame(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: newGame, reset });

  newGame();
  window.__g2048 = { S, move, undo, newGame, applyMove, slideRow, canMove, render };
})();
