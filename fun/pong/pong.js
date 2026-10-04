/* Pong — Toolity.in. Canvas, fixed 60 Hz logic step, keyboard + pointer, CPU with reaction lag. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('pong-canvas'), ctx = canvas.getContext('2d');

  /* ── Constants (logical units: 160 × 90 board) ── */
  const W = 160, H = 90, PAD_W = 2.2, BALL = 2, PAD_X = 5, STEP = 1 / 60;
  const DIFF = { easy: { speed: 48, lag: 0.28, err: 9 }, normal: { speed: 66, lag: 0.16, err: 5 }, hard: { speed: 90, lag: 0.08, err: 2 } };
  const BALL_SPEED = 62, SPEED_UP = 1.045, MAX_SPEED = 150, SERVE_DELAY = 1;
  const KEY = 'toolity_pong';

  /* ── State ── */
  const S = {
    mode: 'cpu', diff: 'normal', target: 7, padH: 16, sound: true,
    phase: 'idle', // idle | serving | playing | paused | over
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 }, l: { y: H / 2 }, r: { y: H / 2 },
    score: [0, 0], serveTo: 1, serveAt: 0, t: 0, cpuTargetY: H / 2, cpuNext: 0, flash: 0,
    keys: new Set(), pointers: new Map(), raf: 0, last: 0, acc: 0,
  };
  const paddleH = () => S.padH;

  /* ── Audio (synthesized) ── */
  let audio;
  function beep(freq, dur = 0.05, type = 'square', gain = 0.08) {
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
  function recordWin(margin) {
    const d = load(); const k = S.mode === 'cpu' ? 'cpu_' + S.diff : '2p';
    d[k] = (d[k] || 0) + 1; d.bestMargin = Math.max(d.bestMargin || 0, margin);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage blocked */ }
    showBest();
  }
  function showBest() {
    const d = load(); const k = S.mode === 'cpu' ? 'cpu_' + S.diff : '2p'; const wins = d[k] || 0;
    $('best-badge').hidden = !wins;
    $('best-badge').textContent = S.mode === 'cpu' ? `${wins} win${wins === 1 ? '' : 's'} on ${S.diff}` : `${wins} match${wins === 1 ? '' : 'es'} played`;
  }

  /* ── Match flow ── */
  function serve(toRight) {
    const ang = (Math.random() * 0.5 - 0.25) * Math.PI; // ±45°
    S.ball = { x: W / 2, y: H / 2, vx: Math.cos(ang) * BALL_SPEED * (toRight ? 1 : -1), vy: Math.sin(ang) * BALL_SPEED };
    S.phase = 'serving'; S.serveAt = S.t + SERVE_DELAY; S.cpuNext = 0;
  }
  function startOrResume() {
    if (S.phase === 'over') return newMatch(true);
    if (S.phase === 'idle') { newMatch(true); return; }
    if (S.phase === 'paused') { S.phase = S.ball.vx ? 'playing' : 'serving'; if (S.phase === 'serving') S.serveAt = S.t + 0.5; }
    syncUi();
  }
  function pause() { if (S.phase === 'playing' || S.phase === 'serving') { S.phase = 'paused'; syncUi(); } }
  function togglePlay() { S.phase === 'playing' || S.phase === 'serving' ? pause() : startOrResume(); }
  function newMatch(go) {
    S.score = [0, 0]; S.l.y = S.r.y = H / 2; S.serveTo = Math.random() < 0.5 ? 1 : -1; S.flash = 0;
    if (go) serve(S.serveTo > 0); else { S.phase = 'idle'; S.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; }
    syncUi(); draw();
  }
  function point(side) { // side: 0 = left scored, 1 = right scored
    S.score[side]++; S.flash = 0.35;
    beep(side === 0 ? 220 : 180, 0.18, 'sawtooth', 0.06);
    const t = S.target;
    if (S.score[side] >= t) {
      S.phase = 'over';
      const youWon = S.mode === '2p' || side === 0;
      if (youWon) recordWin(Math.abs(S.score[0] - S.score[1]));
      syncUi(); return;
    }
    serve(side === 0); // classic rule: serve toward the player who lost the point
    syncUi();
  }

  /* ── Physics ── */
  function update(dt) {
    S.t += dt;
    if (S.flash > 0) S.flash -= dt;
    // Human paddles
    const sp = 95 * dt, ph = paddleH();
    const up1 = S.keys.has('KeyW') || (S.mode === 'cpu' && S.keys.has('ArrowUp')), dn1 = S.keys.has('KeyS') || (S.mode === 'cpu' && S.keys.has('ArrowDown'));
    if (up1) S.l.y -= sp; if (dn1) S.l.y += sp;
    if (S.mode === '2p') { if (S.keys.has('ArrowUp')) S.r.y -= sp; if (S.keys.has('ArrowDown')) S.r.y += sp; }
    S.pointers.forEach((p) => { const pad = (S.mode === 'cpu' || p.x < W / 2) ? S.l : S.r; pad.y += (p.y - pad.y) * Math.min(1, 25 * dt); });
    S.l.y = clamp(S.l.y, ph / 2, H - ph / 2); S.r.y = clamp(S.r.y, ph / 2, H - ph / 2);
    if (S.phase === 'serving' && S.t >= S.serveAt) S.phase = 'playing';
    if (S.phase !== 'playing' && S.phase !== 'serving') return;
    // CPU: re-aims every `lag` seconds with a small error; drifts to centre when the ball moves away
    if (S.mode === 'cpu') {
      const D = DIFF[S.diff];
      if (S.t >= S.cpuNext) {
        S.cpuNext = S.t + D.lag;
        S.cpuTargetY = S.ball.vx > 0 ? predictY() + (Math.random() * 2 - 1) * D.err : H / 2;
      }
      const d = S.cpuTargetY - S.r.y, mv = Math.min(Math.abs(d), D.speed * dt);
      S.r.y = clamp(S.r.y + Math.sign(d) * mv, ph / 2, H - ph / 2);
    }
    if (S.phase !== 'playing') return;
    const b = S.ball;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < BALL / 2) { b.y = BALL / 2; b.vy = Math.abs(b.vy); beep(330); }
    if (b.y > H - BALL / 2) { b.y = H - BALL / 2; b.vy = -Math.abs(b.vy); beep(330); }
    // Paddle collisions — angle from hit offset (classic), speed up per hit
    const hit = (pad, px, dir) => {
      if (Math.abs(b.y - pad.y) > ph / 2 + BALL / 2) return false;
      const off = (b.y - pad.y) / (ph / 2); // -1..1
      const speed = Math.min(MAX_SPEED, Math.hypot(b.vx, b.vy) * SPEED_UP), ang = off * 0.75 * Math.PI / 2; // ≤ 67.5°
      b.vx = Math.cos(ang) * speed * dir; b.vy = Math.sin(ang) * speed; b.x = px; beep(520, 0.04); return true;
    };
    if (b.vx < 0 && b.x - BALL / 2 <= PAD_X + PAD_W && b.x > PAD_X - 2) hit(S.l, PAD_X + PAD_W + BALL / 2, 1);
    else if (b.vx > 0 && b.x + BALL / 2 >= W - PAD_X - PAD_W && b.x < W - PAD_X + 2) hit(S.r, W - PAD_X - PAD_W - BALL / 2, -1);
    if (b.x < -BALL) point(1); else if (b.x > W + BALL) point(0);
  }
  /** Where will the ball cross the right paddle line (with wall bounces)? */
  function predictY() {
    const b = S.ball; if (b.vx <= 0) return H / 2;
    const t = (W - PAD_X - PAD_W - b.x) / b.vx; let y = b.y + b.vy * t;
    const span = H - BALL; y = ((y - BALL / 2) % (2 * span) + 2 * span) % (2 * span);
    return (y > span ? 2 * span - y : y) + BALL / 2;
  }
  const clamp = (v, a, z) => Math.max(a, Math.min(z, v));

  /* ── Render ── */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function resize() {
    const wrap = canvas.parentElement, cw = Math.max(200, wrap.clientWidth), ch = Math.round(cw * H / W);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    draw();
  }
  function draw() {
    const k = canvas.width / W, ph = paddleH();
    const fg = css('--text-primary') || '#111', mid = css('--border') || '#ccc', brand = css('--brand') || '#f4511e';
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = css('--surface') || '#fff'; ctx.fillRect(0, 0, W, H);
    if (S.flash > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) { ctx.fillStyle = brand; ctx.globalAlpha = S.flash * 0.35; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.strokeStyle = mid; ctx.lineWidth = 0.6; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = fg;
    roundRect(PAD_X, S.l.y - ph / 2, PAD_W, ph, 1); roundRect(W - PAD_X - PAD_W, S.r.y - ph / 2, PAD_W, ph, 1);
    if (S.phase !== 'idle') { ctx.fillStyle = brand; ctx.beginPath(); ctx.arc(S.ball.x, S.ball.y, BALL / 2, 0, Math.PI * 2); ctx.fill(); }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

  /* ── Loop (fixed step with accumulator → same speed on 60/120/144 Hz) ── */
  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0); S.last = now; S.acc += dt;
    let n = 0; while (S.acc >= STEP && n++ < 8) { update(STEP); S.acc -= STEP; }
    draw();
  }
  function step(n) { for (let i = 0; i < n; i++) update(STEP); draw(); } // for tests

  /* ── UI sync ── */
  function syncUi() {
    $('score-l').textContent = S.score[0]; $('score-r').textContent = S.score[1];
    const playing = S.phase === 'playing' || S.phase === 'serving';
    $('play-label').textContent = playing ? 'Pause' : (S.phase === 'over' || S.phase === 'idle' ? 'Play' : 'Resume');
    $('play-icon').setAttribute('icon', playing ? 'lucide:pause' : 'lucide:play');
    $('btn-play').setAttribute('aria-label', $('play-label').textContent);
    const ov = $('overlay'), title = $('overlay-title'), text = $('overlay-text');
    ov.hidden = playing;
    if (S.phase === 'idle') { title.textContent = 'Pong'; text.textContent = 'Press Space or tap Play to serve'; }
    else if (S.phase === 'paused') { title.textContent = 'Paused'; text.textContent = 'Space or Play to continue'; }
    else if (S.phase === 'over') {
      const leftWon = S.score[0] > S.score[1];
      title.textContent = S.mode === '2p' ? `Player ${leftWon ? 1 : 2} wins!` : (leftWon ? 'You win! 🎉' : 'Computer wins');
      text.textContent = `${S.score[0]} – ${S.score[1]} · Space or Play for a rematch`;
    }
    $('p1-name').textContent = S.mode === '2p' ? 'Player 1' : 'You';
    $('p2-name').textContent = S.mode === '2p' ? 'Player 2' : 'Computer';
    $('hint').textContent = S.mode === '2p' ? 'P1: W S · P2: ↑ ↓ · Space serve & pause · drag your half on touch' : '↑ ↓ or W S to move · Space to serve & pause · drag on touch';
    $('settings-summary').textContent = `${S.diff[0].toUpperCase() + S.diff.slice(1)} · first to ${S.target} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Space']);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.code === 'Space') { if (!e.repeat) togglePlay(); return; }
    S.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => S.keys.delete(e.code));
  const toBoard = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  canvas.addEventListener('pointerdown', (e) => { try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* inactive pointer id */ } S.pointers.set(e.pointerId, toBoard(e)); if (S.phase === 'idle' || S.phase === 'over' || S.phase === 'paused') startOrResume(); });
  canvas.addEventListener('pointermove', (e) => { if (S.pointers.has(e.pointerId)) S.pointers.set(e.pointerId, toBoard(e)); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => canvas.addEventListener(ev, (e) => S.pointers.delete(e.pointerId)));
  $('btn-play').addEventListener('click', togglePlay);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ── Options ── */
  bindSegmented($('seg-mode'), (v) => { S.mode = v; newMatch(false); showBest(); });
  $('opt-difficulty').addEventListener('change', (e) => { S.diff = e.target.value; syncUi(); showBest(); });
  $('opt-target').addEventListener('change', (e) => { S.target = Number(e.target.value); syncUi(); });
  $('opt-paddle').addEventListener('change', (e) => { S.padH = e.target.value === 'large' ? 24 : 16; draw(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; syncUi(); });
  function reset() {
    S.mode = 'cpu'; S.diff = 'normal'; S.target = 7; S.padH = 16; S.sound = true; S.keys.clear(); S.pointers.clear();
    $('seg-mode').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'cpu'));
    $('opt-difficulty').value = 'normal'; $('opt-target').value = '7'; $('opt-paddle').value = 'normal'; $('opt-sound').checked = true;
    newMatch(false); showBest(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: togglePlay, reset });

  /* ── Boot ── */
  new ResizeObserver(resize).observe(canvas.parentElement);
  const themeObs = new MutationObserver(draw); themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  newMatch(false); showBest(); resize();
  S.raf = requestAnimationFrame((t) => { S.last = t; frame(t); });
  window.__pong = { S, step, serve, point, newMatch };
})();
