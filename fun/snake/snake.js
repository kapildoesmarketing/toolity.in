/* Snake — Toolity.in. Canvas grid, tick-based movement, input queue, keyboard + swipe, best per speed/board. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('snake-canvas'), ctx = canvas.getContext('2d');
  const KEY = 'toolity_snake';
  const SPEED = { slow: 7, normal: 10, fast: 14 }; // ticks per second
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

  const S = {
    speed: 'normal', n: 20, walls: 'solid', sound: true,
    phase: 'idle', // idle | playing | paused | over
    snake: [], dir: 'right', queue: [], food: null, eaten: 0, flash: 0,
    raf: 0, last: 0, acc: 0,
  };
  const tps = () => SPEED[S.speed] + (S.speed === 'fast' ? Math.min(6, Math.floor(S.eaten / 5)) : 0);

  /* ── Audio ── */
  let audio;
  function beep(freq, dur = 0.05, type = 'square', gain = 0.05) {
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
  const bestKey = () => `${S.speed}_${S.n}`;
  const best = () => load()[bestKey()] || 0;
  function saveBest() { const len = S.snake.length; if (len <= best()) return; const d = load(); d[bestKey()] = len; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* blocked */ } }

  /* ── Game ── */
  function placeFood() {
    const taken = new Set(S.snake.map(([x, y]) => y * S.n + x)), free = [];
    for (let i = 0; i < S.n * S.n; i++) if (!taken.has(i)) free.push(i);
    if (!free.length) { S.food = null; return; }
    const i = free[Math.floor(Math.random() * free.length)]; S.food = [i % S.n, Math.floor(i / S.n)];
  }
  function newGame(go) {
    const c = Math.floor(S.n / 2);
    S.snake = [[c, c], [c - 1, c], [c - 2, c]]; S.dir = 'right'; S.queue = []; S.eaten = 0; S.flash = 0; S.acc = 0;
    placeFood();
    S.phase = go ? 'playing' : 'idle';
    syncUi(); draw();
  }
  /** One movement tick. Returns 'moved' | 'ate' | 'dead'. */
  function tick() {
    if (S.queue.length) S.dir = S.queue.shift();
    const [dx, dy] = DIR[S.dir], [hx, hy] = S.snake[0];
    let nx = hx + dx, ny = hy + dy;
    if (S.walls === 'wrap') { nx = (nx + S.n) % S.n; ny = (ny + S.n) % S.n; }
    else if (nx < 0 || ny < 0 || nx >= S.n || ny >= S.n) return die();
    const ate = S.food && nx === S.food[0] && ny === S.food[1];
    // tail moves away this tick unless we grow, so the current tail cell is safe to enter
    const body = ate ? S.snake : S.snake.slice(0, -1);
    if (body.some(([x, y]) => x === nx && y === ny)) return die();
    S.snake.unshift([nx, ny]);
    if (ate) { S.eaten++; saveBest(); placeFood(); beep(660 + Math.min(S.eaten, 20) * 15, 0.05); if (!S.food) { S.phase = 'over'; syncUi(); return 'won'; } return 'ate'; }
    S.snake.pop(); return 'moved';
  }
  function die() { S.phase = 'over'; S.flash = 0.4; beep(140, 0.35, 'sawtooth', 0.06); syncUi(); return 'dead'; }
  function steer(dir) {
    const last = S.queue.length ? S.queue[S.queue.length - 1] : S.dir;
    if (dir === last || dir === OPP[last]) return false; // no reversing, no duplicate
    if (S.queue.length < 2) S.queue.push(dir);
    if (S.phase === 'idle') { S.phase = 'playing'; syncUi(); }
    return true;
  }
  function togglePlay() {
    if (S.phase === 'over') return newGame(true);
    if (S.phase === 'idle') { S.phase = 'playing'; }
    else if (S.phase === 'playing') S.phase = 'paused';
    else S.phase = 'playing';
    syncUi();
  }
  function pause() { if (S.phase === 'playing') { S.phase = 'paused'; syncUi(); } }

  /* ── Loop ── */
  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0); S.last = now;
    if (S.flash > 0) S.flash -= dt;
    if (S.phase !== 'playing') { if (S.flash > 0) draw(); return; }
    S.acc += dt; const step = 1 / tps();
    let n = 0; while (S.acc >= step && n++ < 4 && S.phase === 'playing') { tick(); S.acc -= step; }
    if (n) { syncUi(); draw(); }
  }

  /* ── Render ── */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function resize() {
    const wrap = canvas.parentElement, size = Math.max(200, Math.min(wrap.clientWidth, 560));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    canvas.width = canvas.height = Math.round(size * dpr);
    draw();
  }
  function draw() {
    const k = canvas.width / S.n, brand = css('--brand') || '#f4511e', fg = css('--text-primary') || '#111', grid = css('--border') || '#ddd';
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = css('--surface') || '#fff'; ctx.fillRect(0, 0, S.n, S.n);
    ctx.strokeStyle = grid; ctx.lineWidth = 0.03; ctx.beginPath();
    for (let i = 1; i < S.n; i++) { ctx.moveTo(i, 0); ctx.lineTo(i, S.n); ctx.moveTo(0, i); ctx.lineTo(S.n, i); }
    ctx.stroke();
    if (S.food) { ctx.fillStyle = brand; ctx.beginPath(); ctx.arc(S.food[0] + 0.5, S.food[1] + 0.5, 0.36, 0, Math.PI * 2); ctx.fill(); }
    S.snake.forEach(([x, y], i) => {
      ctx.fillStyle = fg; ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i / (S.snake.length + 6));
      const p = 0.08; rr(x + p, y + p, 1 - 2 * p, 1 - 2 * p, i === 0 ? 0.3 : 0.2);
    });
    ctx.globalAlpha = 1;
    if (S.flash > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) { ctx.fillStyle = brand; ctx.globalAlpha = S.flash * 0.5; ctx.fillRect(0, 0, S.n, S.n); ctx.globalAlpha = 1; }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

  /* ── UI ── */
  function syncUi() {
    $('score-val').textContent = S.snake.length; $('best-val').textContent = best();
    $('best-badge').hidden = !best(); $('best-badge').textContent = `best ${best()} · ${S.speed} ${S.n}×${S.n}`;
    const playing = S.phase === 'playing';
    $('play-label').textContent = playing ? 'Pause' : (S.phase === 'paused' ? 'Resume' : 'Play');
    $('play-icon').setAttribute('icon', playing ? 'lucide:pause' : 'lucide:play');
    $('btn-play').setAttribute('aria-label', $('play-label').textContent);
    $('status-badge').textContent = S.phase === 'over' ? (S.food ? 'Game over' : 'Board full!') : S.phase === 'paused' ? 'Paused' : playing ? `${S.eaten} eaten` : 'Ready';
    const ov = $('overlay'); ov.hidden = playing;
    if (S.phase === 'idle') { $('overlay-title').textContent = 'Snake'; $('overlay-text').textContent = 'Press an arrow key, Space or tap Play to start'; }
    else if (S.phase === 'paused') { $('overlay-title').textContent = 'Paused'; $('overlay-text').textContent = 'Space or Play to continue'; }
    else if (S.phase === 'over') { $('overlay-title').textContent = S.food ? 'Game over' : 'You filled the board! 🎉'; $('overlay-text').textContent = `Length ${S.snake.length}${S.snake.length >= best() && best() > 3 ? ' · new best!' : ''} · Space or Play to retry`; }
    $('settings-summary').textContent = `${S.speed[0].toUpperCase() + S.speed.slice(1)} · ${S.n}×${S.n} · ${S.walls === 'wrap' ? 'wrap-around' : 'solid walls'} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  const KEY_FALLBACK = { Left: 'left', Right: 'right', Up: 'up', Down: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  // Designed by Kapil Pidhwani: steering is a discrete keydown action (queued up to 2), so tap-pair keyboards and real ones behave the same.
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) togglePlay(); return; }
    const dir = DIRS[e.code] || KEY_FALLBACK[e.key] || (e.key && e.key.startsWith('Arrow') ? DIRS[e.key] : null);
    if (!dir) return; e.preventDefault();
    if (S.phase === 'paused') { S.phase = 'playing'; syncUi(); }
    if (S.phase === 'over') return;
    steer(dir);
  });
  let sw = null;
  canvas.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  window.addEventListener('pointerup', (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { togglePlay(); return; } // tap = play/pause
    if (S.phase === 'paused') { S.phase = 'playing'; syncUi(); }
    if (S.phase === 'over') return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  $('btn-play').addEventListener('click', togglePlay);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ── Options ── */
  bindSegmented($('seg-speed'), (v) => { S.speed = v; newGame(false); });
  $('opt-grid').addEventListener('change', (e) => { S.n = Number(e.target.value); newGame(false); });
  $('opt-walls').addEventListener('change', (e) => { S.walls = e.target.value; syncUi(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; syncUi(); });
  function reset() {
    S.speed = 'normal'; S.n = 20; S.walls = 'solid'; S.sound = true;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    $('seg-speed').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'normal'));
    $('opt-grid').value = '20'; $('opt-walls').value = 'solid'; $('opt-sound').checked = true;
    newGame(false); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: togglePlay, reset });

  /* ── Boot ── */
  new ResizeObserver(resize).observe(canvas.parentElement);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  newGame(false); resize();
  S.raf = requestAnimationFrame((t) => { S.last = t; frame(t); });
  window.__snake = { S, tick, steer, newGame, togglePlay, placeFood, draw, syncUi };
})();
