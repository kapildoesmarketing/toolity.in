/* Tetris — Toolity.in. 10×20 canvas, 7-bag, ghost, hard drop, classic scoring, keyboard + swipe. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('tetris-canvas'), ctx = canvas.getContext('2d'), nextCv = $('next-canvas'), nctx = nextCv.getContext('2d');
  const KEY = 'toolity_tetris', COLS = 10, ROWS = 20, STEP = 1 / 60;
  const SHAPES = { // rotation 0, as [x,y] cells in a 4×4 box
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  };
  const COLORS = { I: '#22c1dc', O: '#f5c400', T: '#a259ff', S: '#3ecf5a', Z: '#f0453d', J: '#3a7bff', L: '#ff8c1a' };
  const LINE_PTS = [0, 40, 100, 300, 1200];
  // Designed by Kapil Pidhwani: simple wall kicks (0, ±1, ±2, up 1) instead of full SRS tables — covers wall/floor rotations; T-spin triples are the ceiling.
  const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
  const gravity = (lvl) => Math.max(0.05, 0.8 * Math.pow(0.85, lvl - 1)); // seconds per row

  const S = {
    startLevel: 1, ghost: true, sound: true,
    phase: 'idle', // idle | playing | paused | over
    grid: [], cur: null, next: null, bag: [], score: 0, lines: 0, level: 1, fall: 0, lock: 0, flash: [], flashT: 0,
    raf: 0, last: 0, acc: 0,
  };

  /* ── Audio ── */
  let audio;
  function beep(freq, dur = 0.05, type = 'square', gain = 0.045) {
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
  const best = () => load().best || 0;
  function saveBest() { if (S.score <= best()) return; try { localStorage.setItem(KEY, JSON.stringify({ best: S.score, lines: S.lines })); } catch (e) { /* blocked */ } }

  /* ── Pieces ── */
  const rotateCells = (cells, times, type) => { let c = cells; for (let i = 0; i < ((times % 4) + 4) % 4; i++) c = type === 'O' ? c : c.map(([x, y]) => [type === 'I' ? 3 - y : 2 - y, x]); return c; };
  const cellsOf = (p) => rotateCells(SHAPES[p.type], p.rot, p.type).map(([x, y]) => [p.x + x, p.y + y]);
  function fits(p) { return cellsOf(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !S.grid[y][x])); }
  function draw7() { if (!S.bag.length) { S.bag = Object.keys(SHAPES); for (let i = S.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.bag[i], S.bag[j]] = [S.bag[j], S.bag[i]]; } } return S.bag.pop(); }
  const makePiece = (type) => ({ type, rot: 0, x: 3, y: type === 'I' ? -1 : 0 });
  function spawn() {
    S.cur = makePiece(S.next || draw7()); S.next = draw7(); S.fall = 0; S.lock = 0;
    if (!fits(S.cur)) { S.cur.y -= 1; if (!fits(S.cur)) { gameOver(); return false; } }
    return true;
  }
  const ghostY = () => { const g = { ...S.cur }; while (fits({ ...g, y: g.y + 1 })) g.y++; return g.y; };

  /* ── Actions ── */
  function move(dx) { if (S.phase !== 'playing') return false; const p = { ...S.cur, x: S.cur.x + dx }; if (!fits(p)) return false; S.cur = p; S.lock = 0; return true; }
  function rotate(dir) {
    if (S.phase !== 'playing' || S.cur.type === 'O') return false;
    for (const [kx, ky] of KICKS) { const p = { ...S.cur, rot: S.cur.rot + dir, x: S.cur.x + kx, y: S.cur.y + ky }; if (fits(p)) { S.cur = p; S.lock = 0; beep(520, 0.03, 'triangle', 0.03); return true; } }
    return false;
  }
  function softDrop() { if (S.phase !== 'playing') return false; const p = { ...S.cur, y: S.cur.y + 1 }; if (!fits(p)) return false; S.cur = p; S.score++; S.fall = 0; return true; }
  function hardDrop() { if (S.phase !== 'playing') return; const gy = ghostY(); S.score += (gy - S.cur.y) * 2; S.cur.y = gy; beep(200, 0.05); lockPiece(); }
  function lockPiece() {
    for (const [x, y] of cellsOf(S.cur)) { if (y < 0) { gameOver(); return; } S.grid[y][x] = S.cur.type; }
    const full = []; for (let y = 0; y < ROWS; y++) if (S.grid[y].every(Boolean)) full.push(y);
    if (full.length) {
      full.forEach((y) => { S.grid.splice(y, 1); S.grid.unshift(Array(COLS).fill(null)); });
      S.lines += full.length; S.score += LINE_PTS[full.length] * S.level;
      S.level = Math.max(S.startLevel, Math.floor(S.lines / 10) + S.startLevel);
      S.flash = full; S.flashT = 0.25; beep(full.length === 4 ? 980 : 700, full.length === 4 ? 0.25 : 0.12, 'square', 0.05);
    } else beep(150, 0.03, 'sine', 0.04);
    saveBest(); spawn(); syncUi();
  }
  function gameOver() { S.phase = 'over'; saveBest(); beep(110, 0.5, 'sawtooth', 0.06); syncUi(); }
  function newGame(go) {
    S.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); S.bag = []; S.next = null; S.score = 0; S.lines = 0; S.level = S.startLevel; S.flash = []; S.acc = 0;
    S.phase = go ? 'playing' : 'idle'; spawn(); syncUi(); draw();
  }
  function togglePlay() { if (S.phase === 'over' || S.phase === 'idle') return newGame(true); S.phase = S.phase === 'playing' ? 'paused' : 'playing'; syncUi(); }
  function pause() { if (S.phase === 'playing') { S.phase = 'paused'; syncUi(); } }

  /* ── Tick ── */
  function update(dt) {
    if (S.flashT > 0) { S.flashT -= dt; if (S.flashT <= 0) S.flash = []; }
    if (S.phase !== 'playing') return;
    S.fall += dt;
    const onFloor = !fits({ ...S.cur, y: S.cur.y + 1 });
    if (onFloor) { S.lock += dt; if (S.lock >= 0.5) lockPiece(); return; }
    if (S.fall >= gravity(S.level)) { S.fall = 0; S.cur = { ...S.cur, y: S.cur.y + 1 }; }
  }
  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0); S.last = now; S.acc += dt;
    let n = 0; while (S.acc >= STEP && n++ < 8) { update(STEP); S.acc -= STEP; }
    draw();
  }
  function step(n) { for (let i = 0; i < n; i++) update(STEP); syncUi(); draw(); }

  /* ── Render ── */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function resize() {
    const wrap = canvas.parentElement, maxW = Math.max(120, wrap.clientWidth), maxH = Math.max(240, Math.min(window.innerHeight * 0.72, 600));
    const cw = Math.min(maxW, maxH * COLS / ROWS), ch = cw * ROWS / COLS, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    draw();
  }
  function cell(c, x, y, color, alpha = 1, k = 1) {
    c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(x * k + 0.04 * k, y * k + 0.04 * k, 0.92 * k, 0.92 * k);
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x * k + 0.04 * k, y * k + 0.04 * k, 0.92 * k, 0.18 * k);
    c.globalAlpha = 1;
  }
  function draw() {
    const k = canvas.width / COLS, grid = css('--border') || '#ddd';
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = css('--surface') || '#fff'; ctx.fillRect(0, 0, COLS, ROWS);
    ctx.strokeStyle = grid; ctx.lineWidth = 0.03; ctx.beginPath();
    for (let i = 1; i < COLS; i++) { ctx.moveTo(i, 0); ctx.lineTo(i, ROWS); } for (let i = 1; i < ROWS; i++) { ctx.moveTo(0, i); ctx.lineTo(COLS, i); }
    ctx.stroke();
    S.grid.forEach((row, y) => row.forEach((t, x) => { if (t) cell(ctx, x, y, COLORS[t]); }));
    if (S.flash.length) { ctx.fillStyle = '#fff'; ctx.globalAlpha = Math.min(1, S.flashT * 4); S.flash.forEach((y) => ctx.fillRect(0, y, COLS, 1)); ctx.globalAlpha = 1; }
    if (S.cur && S.phase !== 'idle') {
      if (S.ghost && S.phase === 'playing') { const gy = ghostY(); cellsOf({ ...S.cur, y: gy }).forEach(([x, y]) => { if (y >= 0) cell(ctx, x, y, COLORS[S.cur.type], 0.22); }); }
      cellsOf(S.cur).forEach(([x, y]) => { if (y >= 0) cell(ctx, x, y, COLORS[S.cur.type]); });
    }
    // next
    const nk = nextCv.width / 4; nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.clearRect(0, 0, nextCv.width, nextCv.height);
    if (S.next && S.phase !== 'idle') { const cs = SHAPES[S.next], ox = S.next === 'I' || S.next === 'O' ? 0 : 0.5, oy = S.next === 'I' ? 0.5 : 1; cs.forEach(([x, y]) => cell(nctx, x + ox, y + oy, COLORS[S.next], 1, nk)); }
  }

  /* ── UI ── */
  function syncUi() {
    $('score-val').textContent = S.score; $('best-val').textContent = best(); $('level-val').textContent = S.level; $('lines-val').textContent = S.lines;
    $('best-badge').hidden = !best(); $('best-badge').textContent = `best ${best()}`;
    const playing = S.phase === 'playing';
    $('play-label').textContent = playing ? 'Pause' : (S.phase === 'paused' ? 'Resume' : 'Play');
    $('play-icon').setAttribute('icon', playing ? 'lucide:pause' : 'lucide:play');
    $('btn-play').setAttribute('aria-label', $('play-label').textContent);
    $('status-badge').textContent = S.phase === 'over' ? 'Game over' : S.phase === 'paused' ? 'Paused' : playing ? `Level ${S.level}` : 'Ready';
    $('overlay').hidden = playing;
    if (S.phase === 'idle') { $('overlay-title').textContent = 'Tetris'; $('overlay-text').textContent = 'Press Space or tap Play to start'; }
    else if (S.phase === 'paused') { $('overlay-title').textContent = 'Paused'; $('overlay-text').textContent = 'P or Play to continue'; }
    else if (S.phase === 'over') { $('overlay-title').textContent = S.score >= best() && S.score > 0 ? `${S.score} — new best! 🎉` : 'Game over'; $('overlay-text').textContent = `${S.score} points · ${S.lines} lines · Space or Play to retry`; }
    $('settings-summary').textContent = `Level ${S.startLevel} · ghost ${S.ghost ? 'on' : 'off'} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  const ACTIONS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', KeyX: 'cw', KeyZ: 'ccw', Space: 'hard', KeyP: 'pause' };
  const KEY_FALLBACK = { Left: 'left', Right: 'right', Down: 'down', Up: 'cw', x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw', ' ': 'hard', p: 'pause', P: 'pause' };
  // Designed by Kapil Pidhwani: held left/right/down rely on native key auto-repeat (keydown with e.repeat) rather than tracked key state,
  // so tap-pair (remote desktop) keyboards and real ones behave identically; no DAS tuning needed.
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    const a = ACTIONS[e.code] || KEY_FALLBACK[e.key] || (e.key && e.key.startsWith('Arrow') ? ACTIONS[e.key] : null);
    if (!a) return; e.preventDefault();
    if (a === 'pause') { if (!e.repeat && (S.phase === 'playing' || S.phase === 'paused')) togglePlay(); return; }
    if (S.phase === 'over' || S.phase === 'idle') { if (!e.repeat && a === 'hard') newGame(true); return; }
    if (S.phase === 'paused') { if (a === 'hard') return; S.phase = 'playing'; syncUi(); }
    if (a === 'left') move(-1); else if (a === 'right') move(1); else if (a === 'down') softDrop();
    else if (a === 'cw') { if (!e.repeat) rotate(1); } else if (a === 'ccw') { if (!e.repeat) rotate(-1); } else if (a === 'hard' && !e.repeat) hardDrop();
  });
  let sw = null;
  canvas.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
  window.addEventListener('pointerup', (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = performance.now() - sw.t; sw = null;
    if (S.phase === 'over' || S.phase === 'idle') { newGame(true); return; }
    if (S.phase === 'paused') { S.phase = 'playing'; syncUi(); return; }
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { rotate(1); return; }
    if (Math.abs(dx) > Math.abs(dy)) { const n = Math.max(1, Math.round(Math.abs(dx) / 40)); for (let i = 0; i < n; i++) move(dx > 0 ? 1 : -1); }
    else if (dy > 0) { if (dy > 90 || dt < 180) hardDrop(); else for (let i = 0; i < 3; i++) softDrop(); }
  });
  $('btn-play').addEventListener('click', togglePlay);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ── Options ── */
  bindSegmented($('seg-level'), (v) => { S.startLevel = Number(v); newGame(false); });
  $('opt-ghost').addEventListener('change', (e) => { S.ghost = e.target.checked; syncUi(); draw(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; syncUi(); });
  function reset() {
    S.startLevel = 1; S.ghost = true; S.sound = true;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    $('seg-level').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === '1'));
    $('opt-ghost').checked = true; $('opt-sound').checked = true;
    newGame(false); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: togglePlay, reset });

  /* ── Boot ── */
  new ResizeObserver(resize).observe(canvas.parentElement);
  window.addEventListener('resize', resize);
  newGame(false); resize();
  S.raf = requestAnimationFrame((t) => { S.last = t; frame(t); });
  window.__tetris = { S, move, rotate, softDrop, hardDrop, lockPiece, newGame, step, fits, cellsOf, ghostY, spawn, draw7, togglePlay, gravity, COLS, ROWS };
})();
