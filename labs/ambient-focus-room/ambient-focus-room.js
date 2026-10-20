/* Ambient Focus Room — Toolity.in. Timestamp-based focus/break timer, Web-Audio-synthesised ambience (rain, brown noise, wind,
 * fire, stream, café — no files), 3-item task list, scenes, clock, quotes; state in the URL hash + localStorage.
 * Designed by Kapil Pidhwani: event-driven page (binds the toolbar itself, like Chronometer). Ceiling: sounds are procedural
 * approximations — pleasant, not field recordings; upgrade path is CC0 samples if ever wanted. */
(function () {
  'use strict';
  const { copyText, toast } = window.Toolity, $ = (id) => document.getElementById(id), baseTitle = document.title;
  const KEY = 'toolity_focus_room', SOUNDS = ['rain', 'brown', 'wind', 'fire', 'stream', 'cafe'], QUOTES = ['Slow is smooth, smooth is fast.', 'One thing at a time.', 'The work is the reward.', 'Start before you are ready.', 'Attention is the rarest form of generosity.', 'Make it small enough to begin.', 'Done is a direction.', 'Be where your feet are.'];
  const today = () => new Date().toISOString().slice(0, 10);
  const fresh = () => ({ focus: 25, phase: 'focus', endAt: 0, remaining: 25 * 60000, tasks: [], day: today(), log: [], scene: 'dawn', levels: Object.fromEntries(SOUNDS.map((k) => [k, 0])), muted: false });
  let S = load(), tick = 0, ctx = null, master = null, chans = {};
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.levels) { if (s.day !== today()) Object.assign(s, { day: today(), log: [] }); return { ...fresh(), ...s }; } } catch (e) { /* fresh */ } return fresh(); }
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const running = () => S.endAt > 0, left = () => (running() ? Math.max(0, S.endAt - Date.now()) : S.remaining);
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const breakMin = () => +$('opt-break').value;

  /* ── Audio: one context, a master gain, one synthesised channel per sound ── */
  function noiseBuffer(kind) {
    const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25; } else d[i] = w; }
    return b;
  }
  const src = (kind) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(kind); s.loop = true; s.start(); return s; };
  const filt = (type, f, q = 1) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const lfo = (freq, depth, target, base) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g).connect(target); if (base !== undefined) target.value = base; o.start(); return o; };
  const burst = (out, { dur, freq, q, gain, type = 'white' }) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(type); const f = filt('bandpass', freq, q), g = ctx.createGain(); const t = ctx.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.02); };
  const BUILD = {
    rain(out) { const w = src('white'), f = filt('bandpass', 1800, 0.6), g = ctx.createGain(); g.gain.value = 0.5; w.connect(f).connect(g).connect(out); const drops = setInterval(() => { if (Math.random() < 0.7) burst(out, { dur: 0.04 + Math.random() * 0.05, freq: 2500 + Math.random() * 4000, q: 4, gain: 0.08 + Math.random() * 0.1 }); }, 60); return () => clearInterval(drops); },
    brown(out) { const b = src('brown'), f = filt('lowpass', 500, 0.7); b.connect(f).connect(out); return () => {}; },
    wind(out) { const b = src('brown'), f = filt('bandpass', 400, 0.5), g = ctx.createGain(); g.gain.value = 1.4; lfo(0.07, 250, f.frequency, 450); lfo(0.11, 0.5, g.gain, 1.2); b.connect(f).connect(g).connect(out); return () => {}; },
    fire(out) { const b = src('brown'), f = filt('lowpass', 220, 0.8), g = ctx.createGain(); g.gain.value = 0.9; b.connect(f).connect(g).connect(out); const crack = setInterval(() => { if (Math.random() < 0.5) burst(out, { dur: 0.015 + Math.random() * 0.03, freq: 1500 + Math.random() * 3000, q: 1.2, gain: 0.25 + Math.random() * 0.4 }); }, 90); return () => clearInterval(crack); },
    stream(out) { const p = src('pink'), f = filt('bandpass', 1200, 0.9), g = ctx.createGain(); g.gain.value = 1.1; lfo(0.9, 300, f.frequency, 1200); lfo(2.3, 0.25, g.gain, 1); p.connect(f).connect(g).connect(out); const bub = setInterval(() => { if (Math.random() < 0.4) burst(out, { dur: 0.05 + Math.random() * 0.08, freq: 600 + Math.random() * 1200, q: 8, gain: 0.05 + Math.random() * 0.08, type: 'pink' }); }, 120); return () => clearInterval(bub); },
    cafe(out) { const b = src('brown'), f = filt('bandpass', 500, 0.7), g = ctx.createGain(); g.gain.value = 1.6; lfo(0.23, 0.6, g.gain, 1.4); lfo(0.17, 120, f.frequency, 520); b.connect(f).connect(g).connect(out); const clink = setInterval(() => { if (Math.random() < 0.12) { const o = ctx.createOscillator(), og = ctx.createGain(), t = ctx.currentTime; o.type = 'sine'; o.frequency.value = 2500 + Math.random() * 2500; og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(og).connect(out); o.start(t); o.stop(t + 0.3); } }, 400); return () => clearInterval(clink); }
  };
  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = S.muted ? 0 : 1; master.connect(ctx.destination);
    for (const k of SOUNDS) { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); chans[k] = { gain: g, stop: BUILD[k](g) }; }
    applyLevels();
  }
  function applyLevels(fadeTo) { if (!ctx) return; const t = ctx.currentTime; for (const k of SOUNDS) chans[k].gain.gain.setTargetAtTime((fadeTo !== undefined ? fadeTo : 1) * S.levels[k] * 0.6, t, 0.25); }
  function chime() { if (!$('opt-chime').checked) return; audio(); const t = ctx.currentTime; [0, 0.3, 0.6].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = [660, 880, 1320][i]; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9); o.connect(g).connect(master); o.start(t + d); o.stop(t + d + 1); }); }

  /* ── Timer ── */
  function render() {
    const l = left(); $('afr-timer').textContent = mmss(l); $('afr-phase').textContent = S.phase === 'focus' ? 'Focus' : 'Break';
    $('afr-room').classList.toggle('is-break', S.phase === 'break'); $('afr-room').classList.toggle('is-running', running());
    $('btn-start').querySelector('span').textContent = running() ? 'Pause' : l < (S.phase === 'focus' ? S.focus : breakMin()) * 60000 ? 'Resume' : 'Start'; $('btn-start').querySelector('iconify-icon').setAttribute('icon', running() ? 'lucide:pause' : 'lucide:play');
    document.title = running() ? `${mmss(l)} · ${S.phase === 'focus' ? 'Focus' : 'Break'} · Toolity` : baseTitle;
    $('status-badge').textContent = running() ? (S.phase === 'focus' ? 'Focusing…' : 'On a break') : 'Press Space to start a focus session'; $('status-badge').classList.toggle('is-win', running());
  }
  function start() { if (running()) return; audio(); S.endAt = Date.now() + S.remaining; save(); loop(); render(); if (S.phase === 'break' && $('opt-fade').checked) applyLevels(0.3); }
  function pause() { if (!running()) return; S.remaining = left(); S.endAt = 0; clearInterval(tick); tick = 0; save(); render(); }
  function loop() { clearInterval(tick); tick = setInterval(() => { if (left() <= 0) finish(); else render(); }, 250); }
  function finish() {
    clearInterval(tick); tick = 0; S.endAt = 0; chime(); if ('vibrate' in navigator) navigator.vibrate([150, 80, 150]);
    if (S.phase === 'focus') { S.log.push({ end: Date.now(), mins: S.focus }); toast(`Focus block done — ${S.focus} min logged`); if (breakMin() > 0) { S.phase = 'break'; S.remaining = breakMin() * 60000; save(); render(); renderLog(); if ($('opt-autobreak').checked) start(); return; } }
    else { toast('Break over — back to it'); applyLevels(); }
    S.phase = 'focus'; S.remaining = S.focus * 60000; save(); render(); renderLog();
  }
  function setFocus(min) { S.focus = Math.min(240, Math.max(1, min)); if (!running() && S.phase === 'focus') S.remaining = S.focus * 60000; else if (S.phase === 'focus') { S.endAt = Date.now() + S.focus * 60000; } $('afr-presets').querySelectorAll('[data-min]').forEach((b) => b.classList.toggle('is-on', +b.dataset.min === S.focus)); if (![25, 50, 90].includes(S.focus)) $('opt-custom').value = S.focus; save(); render(); hash(); }
  function skip() { clearInterval(tick); tick = 0; S.endAt = 0; if (S.phase === 'focus') { if (breakMin() > 0) { S.phase = 'break'; S.remaining = breakMin() * 60000; } } else { S.phase = 'focus'; S.remaining = S.focus * 60000; applyLevels(); } save(); render(); }
  function renderLog() {
    const mins = S.log.reduce((a, l) => a + l.mins, 0), stat = (k, v) => `<div class="web-stat"><span class="web-muted">${k}</span><strong>${v}</strong></div>`;
    $('afr-stats').innerHTML = stat('Sessions today', S.log.length) + stat('Focused', `${mins} min`) + stat('Longest', S.log.length ? Math.max(...S.log.map((l) => l.mins)) + ' min' : '—');
    $('afr-log').innerHTML = S.log.slice().reverse().map((l) => `<li class="web-list-item"><iconify-icon icon="lucide:check-circle-2" width="16" height="16"></iconify-icon><div><span class="web-list-url">${l.mins} min focus</span><div class="web-list-sub">ended ${new Date(l.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div></li>`).join('');
    const has = S.log.length > 0; $('output-empty').hidden = has; $('output-content').hidden = !has; $('output-badge').textContent = has ? `${mins} min` : '—';
  }
  /* ── Tasks ── */
  function renderTasks() { $('afr-task-list').innerHTML = S.tasks.map((t, i) => `<li class="afr-task${t.done ? ' is-done' : ''}"><input type="checkbox" id="afr-t${i}" ${t.done ? 'checked' : ''} data-i="${i}"><label for="afr-t${i}">${t.text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</label><button type="button" class="afr-task-x" data-x="${i}" aria-label="Remove task">×</button></li>`).join(''); $('afr-task-form').hidden = S.tasks.length >= 3; }
  const addTask = () => { const v = $('afr-task-input').value.trim(); if (!v || S.tasks.length >= 3) return; S.tasks.push({ text: v, done: false }); $('afr-task-input').value = ''; save(); renderTasks(); };
  /* ── Scene / hash ── */
  function setScene(sc) { S.scene = sc; $('afr-room').className = `afr-room scene-${sc}${S.phase === 'break' ? ' is-break' : ''}`; $('afr-scenes').querySelectorAll('.afr-scene').forEach((b) => b.classList.toggle('is-on', b.dataset.scene === sc)); save(); hash(); }
  function hash() { const p = new URLSearchParams(); p.set('scene', S.scene); p.set('focus', S.focus); for (const k of SOUNDS) if (S.levels[k] > 0) p.set(k, S.levels[k]); history.replaceState(null, '', '#' + p.toString()); }
  function readHash() { if (!location.hash) return; const p = new URLSearchParams(location.hash.slice(1)); if (p.get('scene')) S.scene = p.get('scene'); if (p.get('focus')) { S.focus = +p.get('focus') || 25; S.remaining = S.focus * 60000; } for (const k of SOUNDS) if (p.has(k)) S.levels[k] = Math.min(1, Math.max(0, +p.get(k) || 0)); }
  const share = () => `${location.origin}${location.pathname}#${new URLSearchParams(Object.assign({ scene: S.scene, focus: S.focus }, Object.fromEntries(SOUNDS.filter((k) => S.levels[k] > 0).map((k) => [k, S.levels[k]])))).toString()}`;

  /* ── Wiring ── */
  $('btn-start').addEventListener('click', () => (running() ? pause() : start()));
  $('btn-skip').addEventListener('click', skip);
  $('afr-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-min]'); if (b) { setFocus(+b.dataset.min); $('opt-custom').value = ''; } });
  $('opt-custom').addEventListener('change', () => { const v = +$('opt-custom').value; if (v) setFocus(v); });
  SOUNDS.forEach((k) => { const el = $('snd-' + k); el.value = S.levels[k]; el.addEventListener('input', () => { S.levels[k] = +el.value; audio(); applyLevels(); save(); hash(); }); });
  $('btn-mute').addEventListener('click', () => { S.muted = !S.muted; if (master) master.gain.setTargetAtTime(S.muted ? 0 : 1, ctx.currentTime, 0.1); $('btn-mute').setAttribute('aria-pressed', S.muted); $('btn-mute').querySelector('iconify-icon').setAttribute('icon', S.muted ? 'lucide:volume-x' : 'lucide:volume-2'); save(); });
  $('btn-hide').addEventListener('click', () => { const on = $('afr-room').classList.toggle('is-zen'); $('btn-hide').setAttribute('aria-pressed', on); });
  $('btn-full').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : $('afr-room').requestFullscreen().catch(() => toast('Fullscreen is not available here'))));
  $('afr-scenes').addEventListener('click', (e) => { const b = e.target.closest('[data-scene]'); if (b) setScene(b.dataset.scene); });
  $('btn-task-add').addEventListener('click', addTask); $('afr-task-form').addEventListener('submit', (e) => { e.preventDefault(); addTask(); }); $('afr-task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } });
  $('afr-task-list').addEventListener('click', (e) => { const x = e.target.closest('[data-x]'); if (x) { S.tasks.splice(+x.dataset.x, 1); save(); renderTasks(); return; } const c = e.target.closest('input[type=checkbox]'); if (c) { S.tasks[+c.dataset.i].done = c.checked; save(); renderTasks(); } });
  ['opt-clock', 'opt-quotes'].forEach((id) => $(id).addEventListener('change', () => { $('afr-clock').hidden = !$('opt-clock').checked; $('afr-quote').hidden = !$('opt-quotes').checked; }));
  ['opt-break', 'opt-autobreak', 'opt-chime', 'opt-clock', 'opt-fade'].forEach((id) => $(id).addEventListener('change', () => { $('settings-summary').textContent = `${breakMin() ? breakMin() + '-min breaks' : 'no breaks'} · chime ${$('opt-chime').checked ? 'on' : 'off'} · clock ${$('opt-clock').checked ? 'on' : 'off'}`; }));
  $('btn-copy').disabled = false; $('btn-copy').addEventListener('click', () => copyText(share(), 'Room link copied')); $('btn-download').disabled = true;
  $('btn-open').addEventListener('click', () => $('btn-full').click());
  $('btn-reset').addEventListener('click', () => { if (!confirm('Reset the timer, sounds, tasks and today’s log?')) return; clearInterval(tick); tick = 0; S = fresh(); localStorage.removeItem(KEY); history.replaceState(null, '', location.pathname); SOUNDS.forEach((k) => { $('snd-' + k).value = 0; }); applyLevels(); setScene('dawn'); setFocus(25); renderTasks(); renderLog(); render(); toast('Reset'); });
  document.addEventListener('keydown', (e) => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key.toLowerCase(); if (e.code === 'Space') { e.preventDefault(); running() ? pause() : start(); } else if (k === 'f') $('btn-full').click(); else if (k === 'h') $('btn-hide').click(); else if (k === 'm') $('btn-mute').click(); else if (k === 'r') $('btn-reset').click(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running()) (left() <= 0 ? finish() : render()); });
  setInterval(() => { $('afr-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 1000); $('afr-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('afr-quote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  /* ── Boot ── */
  readHash(); SOUNDS.forEach((k) => { $('snd-' + k).value = S.levels[k]; }); setScene(S.scene); $('afr-presets').querySelectorAll('[data-min]').forEach((b) => b.classList.toggle('is-on', +b.dataset.min === S.focus)); if (![25, 50, 90].includes(S.focus)) $('opt-custom').value = S.focus;
  if (S.muted) { $('btn-mute').setAttribute('aria-pressed', 'true'); $('btn-mute').querySelector('iconify-icon').setAttribute('icon', 'lucide:volume-x'); }
  renderTasks(); renderLog(); render(); if (running()) (left() <= 0 ? finish() : loop()); hash();
  window.__afr = { get S() { return S; }, start, pause, finish, setFocus, setScene, share, BUILD, get ctx() { return ctx; }, get chans() { return chans; } };
})();
