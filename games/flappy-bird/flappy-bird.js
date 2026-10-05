/* Flappy Bird — Toolity.in. Portrait canvas, fixed 60 Hz physics, flap on key/click/tap, best per difficulty. */
(function () {
  'use strict';
  const { bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const canvas = $('flappy-canvas'), ctx = canvas.getContext('2d');
  const KEY = 'toolity_flappy';
  /* Logical units: 90 wide × 120 tall (3:4). */
  const W = 90, H = 120, GROUND = 12, BIRD_X = 24, BIRD_R = 3.2, PIPE_W = 12, STEP = 1 / 60;
  const GRAVITY = 260, FLAP_VY = -78, MAX_VY = 140;
  const DIFF = { easy: { gap: 40, speed: 30, every: 2.1 }, normal: { gap: 32, speed: 38, every: 1.7 }, hard: { gap: 26, speed: 46, every: 1.4 } };

  const S = {
    diff: 'normal', theme: 'day', sound: true,
    phase: 'idle', // idle | playing | paused | over
    y: H / 2, vy: 0, pipes: [], score: 0, t: 0, nextPipe: 0, flash: 0, wing: 0, scroll: 0,
    raf: 0, last: 0, acc: 0,
  };

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
  const best = () => load()[S.diff] || 0;
  function saveBest() { if (S.score <= best()) return; const d = load(); d[S.diff] = S.score; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* blocked */ } }

  /* ── Game ── */
  function newGame(go) {
    S.y = H / 2; S.vy = 0; S.pipes = []; S.score = 0; S.t = 0; S.nextPipe = 0.9; S.flash = 0; S.acc = 0; S.scroll = 0;
    S.phase = go ? 'playing' : 'idle';
    syncUi(); draw();
  }
  function spawnPipe() {
    const D = DIFF[S.diff], margin = 10, top = margin + Math.random() * (H - GROUND - D.gap - 2 * margin);
    S.pipes.push({ x: W + PIPE_W, top, gap: D.gap, passed: false });
  }
  function flap() {
    if (S.phase === 'over') return;
    if (S.phase !== 'playing') { if (S.phase === 'idle') newGame(true); else { S.phase = 'playing'; syncUi(); } }
    S.vy = FLAP_VY; S.wing = 0.18; beep(640, 0.04, 'triangle', 0.04);
  }
  function update(dt) {
    S.t += dt; S.scroll += DIFF[S.diff].speed * dt;
    if (S.wing > 0) S.wing -= dt;
    S.vy = Math.min(MAX_VY, S.vy + GRAVITY * dt); S.y += S.vy * dt;
    if (S.y - BIRD_R < 0) { S.y = BIRD_R; S.vy = 0; }
    const D = DIFF[S.diff];
    S.nextPipe -= dt; if (S.nextPipe <= 0) { spawnPipe(); S.nextPipe = D.every; }
    for (const p of S.pipes) {
      p.x -= D.speed * dt;
      if (!p.passed && p.x + PIPE_W < BIRD_X) { p.passed = true; S.score++; saveBest(); beep(880, 0.06, 'sine', 0.05); }
    }
    S.pipes = S.pipes.filter((p) => p.x > -PIPE_W - 2);
    if (hit()) die();
  }
  /** Circle (bird) vs pipes / ground. */
  function hit() {
    if (S.y + BIRD_R >= H - GROUND) return true;
    for (const p of S.pipes) {
      const cx = Math.max(p.x, Math.min(BIRD_X, p.x + PIPE_W)), dx = BIRD_X - cx; // nearest x on the pipe column
      if (Math.abs(dx) >= BIRD_R) continue;
      const dy = Math.sqrt(BIRD_R * BIRD_R - dx * dx); // vertical extent of the bird at that column
      if (S.y - dy < p.top || S.y + dy > p.top + p.gap) return true;
    }
    return false;
  }
  function die() { S.phase = 'over'; S.flash = 0.35; saveBest(); beep(120, 0.4, 'sawtooth', 0.06); syncUi(); }
  function togglePlay() {
    if (S.phase === 'over' || S.phase === 'idle') return newGame(true);
    S.phase = S.phase === 'playing' ? 'paused' : 'playing'; syncUi();
  }
  function pause() { if (S.phase === 'playing') { S.phase = 'paused'; syncUi(); } }

  /* ── Loop ── */
  function frame(now) {
    S.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000 || 0); S.last = now;
    if (S.flash > 0) S.flash -= dt;
    if (S.phase === 'playing') { S.acc += dt; let n = 0; while (S.acc >= STEP && n++ < 8 && S.phase === 'playing') { update(STEP); S.acc -= STEP; } if (n) $('score-val').textContent = S.score; }
    else if (S.phase === 'idle') { S.t += dt; S.y = H / 2 + Math.sin(S.t * 3) * 2; S.scroll += 10 * dt; }
    draw();
  }
  function step(n) { for (let i = 0; i < n; i++) update(STEP); syncUi(); draw(); } // tests

  /* ── Render ── */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function resize() {
    const wrap = canvas.parentElement, maxW = Math.max(180, wrap.clientWidth), maxH = Math.max(240, Math.min(window.innerHeight * 0.7, 560));
    const cw = Math.min(maxW, maxH * W / H), ch = cw * H / W, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    draw();
  }
  function draw() {
    const k = canvas.width / W, night = S.theme === 'night', brand = css('--brand') || '#f4511e';
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, night ? '#0b1026' : '#7ec8f2'); sky.addColorStop(1, night ? '#1f2a5a' : '#cdeefc');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // distant hills (parallax)
    ctx.fillStyle = night ? '#223266' : '#a8e0a0';
    for (let i = -1; i < 5; i++) { const x = ((i * 36 - (S.scroll * 0.3) % 36)); ctx.beginPath(); ctx.arc(x + 18, H - GROUND + 6, 16, Math.PI, 0); ctx.fill(); }
    // pipes
    for (const p of S.pipes) {
      ctx.fillStyle = night ? '#3b8a4a' : '#5cbf5f'; ctx.strokeStyle = night ? '#1d4a27' : '#2e7d32'; ctx.lineWidth = 0.8;
      rr(p.x, -2, PIPE_W, p.top + 2, 1); rr(p.x - 1, p.top - 4, PIPE_W + 2, 4, 1);
      rr(p.x, p.top + p.gap, PIPE_W, H - GROUND - p.top - p.gap + 2, 1); rr(p.x - 1, p.top + p.gap, PIPE_W + 2, 4, 1);
    }
    // ground
    ctx.fillStyle = night ? '#4b3b2a' : '#ded895'; ctx.fillRect(0, H - GROUND, W, GROUND);
    ctx.fillStyle = night ? '#5f8a3a' : '#7fcf5a'; ctx.fillRect(0, H - GROUND, W, 2.2);
    ctx.fillStyle = night ? '#3a2d20' : '#c9c27a';
    for (let x = -((S.scroll * 1) % 8); x < W; x += 8) ctx.fillRect(x, H - GROUND + 2.2, 4, 1.2);
    // bird
    const tilt = Math.max(-0.5, Math.min(1.2, S.vy / 120));
    ctx.save(); ctx.translate(BIRD_X, S.y); ctx.rotate(tilt);
    ctx.fillStyle = brand; ctx.beginPath(); ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-0.6, S.wing > 0 ? 0.8 : 0.2, 1.8, 1.1, S.wing > 0 ? -0.6 : 0.3, 0, Math.PI * 2); ctx.fill(); // wing
    ctx.beginPath(); ctx.arc(1.3, -1, 1.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(1.6, -1, 0.5, 0, Math.PI * 2); ctx.fill(); // eye
    ctx.fillStyle = '#f6b23a'; ctx.beginPath(); ctx.moveTo(2.4, 0.2); ctx.lineTo(4.4, 0.9); ctx.lineTo(2.4, 1.7); ctx.closePath(); ctx.fill(); // beak
    ctx.restore();
    // in-game score
    if (S.phase === 'playing' || S.phase === 'paused') { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.6; ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.strokeText(S.score, W / 2, 16); ctx.fillText(S.score, W / 2, 16); }
    if (S.flash > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) { ctx.fillStyle = '#fff'; ctx.globalAlpha = S.flash; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); }

  /* ── UI ── */
  function syncUi() {
    $('score-val').textContent = S.score; $('best-val').textContent = best();
    $('best-badge').hidden = !best(); $('best-badge').textContent = `best ${best()} on ${S.diff}`;
    const playing = S.phase === 'playing';
    $('play-label').textContent = playing ? 'Pause' : (S.phase === 'paused' ? 'Resume' : 'Play');
    $('play-icon').setAttribute('icon', playing ? 'lucide:pause' : 'lucide:play');
    $('btn-play').setAttribute('aria-label', $('play-label').textContent);
    $('status-badge').textContent = S.phase === 'over' ? 'Game over' : S.phase === 'paused' ? 'Paused' : playing ? 'Flying' : 'Ready';
    $('overlay').hidden = playing;
    if (S.phase === 'idle') { $('overlay-title').textContent = 'Flappy Bird'; $('overlay-text').textContent = 'Tap, click or press Space to flap'; }
    else if (S.phase === 'paused') { $('overlay-title').textContent = 'Paused'; $('overlay-text').textContent = 'P, Play or a flap to continue'; }
    else if (S.phase === 'over') { $('overlay-title').textContent = S.score >= best() && S.score > 0 ? `${S.score} — new best! 🎉` : `Score ${S.score}`; $('overlay-text').textContent = 'Space, click or Play to try again'; }
    $('settings-summary').textContent = `${S.diff[0].toUpperCase() + S.diff.slice(1)} · ${S.theme} · sound ${S.sound ? 'on' : 'off'}`;
  }

  /* ── Input ── */
  // Designed by Kapil Pidhwani: flap is a single keydown action (no held state), so tap-pair keyboards behave like real ones.
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.matches('input, select, textarea')) return;
    const flapKey = e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.key === 'Up' || e.code === 'KeyW' || e.key === 'w' || e.key === 'W';
    if (flapKey) { e.preventDefault(); if (e.repeat) return; if (S.phase === 'over') newGame(true); else flap(); return; }
    if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') { e.preventDefault(); if (!e.repeat && (S.phase === 'playing' || S.phase === 'paused')) togglePlay(); }
  });
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S.phase === 'over') newGame(true); else flap(); });
  $('btn-play').addEventListener('click', togglePlay);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ── Options ── */
  bindSegmented($('seg-diff'), (v) => { S.diff = v; newGame(false); });
  $('opt-theme').addEventListener('change', (e) => { S.theme = e.target.value; syncUi(); draw(); });
  $('opt-sound').addEventListener('change', (e) => { S.sound = e.target.checked; syncUi(); });
  function reset() {
    S.diff = 'normal'; S.theme = 'day'; S.sound = true;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    $('seg-diff').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'normal'));
    $('opt-theme').value = 'day'; $('opt-sound').checked = true;
    newGame(false); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: togglePlay, reset });

  /* ── Boot ── */
  new ResizeObserver(resize).observe(canvas.parentElement);
  window.addEventListener('resize', resize);
  newGame(false); resize();
  S.raf = requestAnimationFrame((t) => { S.last = t; frame(t); });
  window.__flappy = { S, flap, step, newGame, hit, spawnPipe, togglePlay, W, H, BIRD_X, BIRD_R, PIPE_W, GROUND };
})();
