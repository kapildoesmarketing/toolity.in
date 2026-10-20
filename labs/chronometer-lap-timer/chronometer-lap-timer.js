/* Chronometer & Lap Timer — Toolity.in. Timestamp-based stopwatch (zero drift), laps/splits with best/worst, countdown with
 * Web Audio chime, keyboard shortcuts, fullscreen, CSV export, state in localStorage so a reload keeps counting.
 * Designed by Kapil Pidhwani: the generated page ships web-common.js but this tool is event-driven, not input→output, so it
 * binds the toolbar itself (same pattern as Pomodoro). Ceiling: the painted display is one rAF late; stored times are exact. */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindSegmented, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const KEY = 'toolity_chrono', baseTitle = document.title;
  const fresh = () => ({ mode: 'stopwatch', startAt: 0, acc: 0, laps: [], target: 300000, done: false }); // laps: [{t (split ms), lap}]
  let S = load(), raf = 0, ctx = null;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && 'acc' in s) return { ...fresh(), ...s }; } catch (e) { /* fresh */ } return fresh(); }
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const running = () => S.startAt > 0;
  const elapsed = () => S.acc + (running() ? Date.now() - S.startAt : 0);
  const prec = () => +$('opt-precision').value;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function fmt(ms, p = prec()) {
    ms = Math.max(0, Math.round(ms)); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, f = String(ms % 1000).padStart(3, '0').slice(0, p);
    return `${h ? pad(h) + ':' : ''}${pad(m)}:${pad(s)}${p ? '.' + f : ''}`;
  }
  const face = (ms) => { const t = fmt(ms), i = t.lastIndexOf('.'); return i < 0 ? t : `${t.slice(0, i)}<small>${t.slice(i)}</small>`; };
  const targetMs = () => Math.min(99 * 3600 + 59 * 60 + 59, Math.max(0, (+$('opt-h').value || 0) * 3600 + (+$('opt-m').value || 0) * 60 + (+$('opt-s').value || 0))) * 1000;

  /* ── Render ── */
  function render() {
    const e = elapsed(), cd = S.mode === 'countdown', left = S.target - e;
    $('chrono-main').innerHTML = face(cd ? left : e);
    $('chrono-face').classList.toggle('is-over', cd && left <= 0 && S.done);
    $('chrono-face').classList.toggle('is-running', running());
    $('chrono-sub').textContent = cd ? (running() || e ? `of ${fmt(S.target, 0)}` : '') : (S.laps.length ? `lap ${S.laps.length + 1} · ${fmt(e - (S.laps.at(-1) || { t: 0 }).t)}` : '');
    $('btn-start').querySelector('span').textContent = running() ? 'Pause' : e ? 'Resume' : 'Start';
    $('btn-start').querySelector('iconify-icon').setAttribute('icon', running() ? 'lucide:pause' : 'lucide:play');
    $('btn-lap').disabled = !running() || cd; $('btn-clear').disabled = !e && !S.laps.length;
    $('btn-start').disabled = cd && S.target <= 0;
    $('status-badge').textContent = running() ? (cd ? 'Counting down…' : 'Running · L to lap') : S.done && cd ? '⏰ Time’s up' : e ? 'Paused' : 'Ready · Space to start';
    $('status-badge').classList.toggle('is-win', running());
    document.title = running() ? `${fmt(cd ? left : e, 0)} · ${baseTitle}` : baseTitle;
    $('chrono-set').hidden = !cd || running() || e > 0; $('chrono-presets').hidden = $('chrono-set').hidden;
  }
  function renderLaps() {
    const L = S.laps, has = L.length > 0; $('output-empty').hidden = has; $('output-content').hidden = !has; $('output-badge').textContent = has ? `${L.length} lap${L.length === 1 ? '' : 's'}` : '—';
    $('btn-copy').disabled = $('btn-download').disabled = !has; if (!has) return;
    const best = Math.min(...L.map((l) => l.lap)), worst = Math.max(...L.map((l) => l.lap)), avg = L.reduce((a, l) => a + l.lap, 0) / L.length;
    const stat = (k, v) => `<div class="web-stat"><span class="web-muted">${k}</span><strong>${v}</strong></div>`;
    $('lap-stats').innerHTML = stat('Best', fmt(best)) + stat('Average', fmt(avg)) + stat('Worst', fmt(worst)) + stat('Total', fmt(L.at(-1).t));
    const rows = L.map((l, i) => `<tr class="${L.length > 1 && l.lap === best ? 'is-best' : L.length > 1 && l.lap === worst ? 'is-worst' : ''}"><td>${i + 1}</td><td>${fmt(l.lap)}</td><td>${fmt(l.t)}</td><td>${l.lap === best ? '—' : '+' + fmt(l.lap - best)}</td></tr>`);
    $('lap-body').innerHTML = ($('opt-newest').checked ? rows.reverse() : rows).join('');
  }
  const loop = () => { render(); if (S.mode === 'countdown' && elapsed() >= S.target) return finish(); raf = requestAnimationFrame(loop); };

  /* ── Actions ── */
  function start() { if (running()) return; if (S.mode === 'countdown') { if (!S.acc) S.target = targetMs(); if (S.target <= 0) return toast('Set a duration first'); } S.done = false; S.startAt = Date.now(); save(); cancelAnimationFrame(raf); loop(); }
  function pause() { if (!running()) return; S.acc = elapsed(); S.startAt = 0; cancelAnimationFrame(raf); save(); render(); }
  function lap() { if (!running() || S.mode === 'countdown') return; const t = elapsed(); S.laps.push({ t, lap: t - (S.laps.at(-1) || { t: 0 }).t }); save(); renderLaps(); render(); }
  function reset(silent) { cancelAnimationFrame(raf); S = { ...fresh(), mode: S.mode, target: S.target }; save(); renderLaps(); render(); if (!silent) toast('Reset'); }
  function finish() { S.acc = S.target; S.startAt = 0; S.done = true; save(); render(); if ($('opt-sound').checked) chime(); if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]); toast('⏰ Time’s up'); }
  function chime() {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = ctx.currentTime;
      [0, 0.25, 0.5, 1, 1.25, 1.5].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = i % 3 === 2 ? 1320 : 880; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.3, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22); o.connect(g).connect(ctx.destination); o.start(t0 + d); o.stop(t0 + d + 0.25); });
    } catch (e) { /* no audio */ }
  }
  const csv = () => 'lap,lap_time_ms,lap_time,split_ms,split\n' + S.laps.map((l, i) => `${i + 1},${l.lap},${fmt(l.lap, 3)},${l.t},${fmt(l.t, 3)}`).join('\n') + '\n';
  const text = () => `Laps — ${new Date().toLocaleString()}\n` + S.laps.map((l, i) => `${i + 1}\t${fmt(l.lap, 3)}\t${fmt(l.t, 3)}`).join('\n');

  /* ── Wiring ── */
  $('btn-start').addEventListener('click', () => (running() ? pause() : start()));
  $('btn-lap').addEventListener('click', lap);
  $('btn-clear').addEventListener('click', () => reset());
  $('btn-reset').addEventListener('click', () => { reset(true); ['opt-h', 'opt-m', 'opt-s'].forEach((id) => { $(id).value = $(id).defaultValue; }); $('opt-precision').value = '2'; $('opt-sound').checked = true; $('opt-newest').checked = false; S.target = targetMs(); save(); render(); toast('Reset'); });
  $('btn-copy').addEventListener('click', () => S.laps.length && copyText(text(), 'Laps copied'));
  $('btn-download').addEventListener('click', () => S.laps.length && downloadBlob(new Blob([csv()], { type: 'text/csv' }), `laps-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.csv`));
  $('btn-open').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : $('tool-card').requestFullscreen().catch(() => toast('Fullscreen is not available here'))));
  bindSegmented($('seg-mode'), (m) => { if (running()) pause(); S.mode = m; S.acc = 0; S.done = false; S.laps = []; if (m === 'countdown') S.target = targetMs(); save(); renderLaps(); render(); });
  $('chrono-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; const s = +b.dataset.preset; $('opt-h').value = Math.floor(s / 3600); $('opt-m').value = Math.floor(s / 60) % 60; $('opt-s').value = s % 60; S.target = targetMs(); save(); render(); });
  ['opt-h', 'opt-m', 'opt-s'].forEach((id) => $(id).addEventListener('input', () => { S.target = targetMs(); save(); render(); }));
  $('opt-precision').addEventListener('change', () => { render(); renderLaps(); $('settings-summary').textContent = `${{ 1: 'Tenths', 2: 'Hundredths', 3: 'Milliseconds' }[prec()]} · chime ${$('opt-sound').checked ? 'on' : 'off'}`; });
  $('opt-sound').addEventListener('change', () => $('opt-precision').dispatchEvent(new Event('change')));
  $('opt-newest').addEventListener('change', renderLaps);
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); running() ? pause() : start(); }
    else if (e.key === 'l' || e.key === 'L') lap();
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 'f' || e.key === 'F') $('btn-open').click();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running()) { cancelAnimationFrame(raf); loop(); } });

  /* ── Boot ── */
  document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === S.mode));
  if (S.mode === 'countdown' && !S.acc && !running()) { const s = S.target / 1000; $('opt-h').value = Math.floor(s / 3600); $('opt-m').value = Math.floor(s / 60) % 60; $('opt-s').value = Math.floor(s % 60); }
  renderLaps(); render(); if (running()) loop();
  window.__chrono = { get S() { return S; }, start, pause, lap, reset, fmt, finish, elapsed }; // self-check hook
})();
