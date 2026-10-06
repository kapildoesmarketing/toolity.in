/* Designed by Kapil Pidhwani: Pomodoro Timer — timestamp-based countdown, task list, Web Audio chime, Notification API; state in localStorage */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindSegmented, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const KEY = 'toolity_pomodoro', C = 2 * Math.PI * 54, baseTitle = document.title;
  const DEF = { focus: 25, short: 5, long: 15, every: 4, autoBreak: true, autoFocus: false, sound: true, notify: false };
  const LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const today = () => new Date().toISOString().slice(0, 10);
  const fresh = () => ({ settings: { ...DEF }, mode: 'focus', endAt: 0, remaining: DEF.focus * 60000, round: 0, tasks: [], activeId: null, day: today(), count: 0, focusMs: 0, log: [] });
  let S = load(), tick = 0, audio = null;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.settings) { if (s.day !== today()) Object.assign(s, { day: today(), count: 0, focusMs: 0, log: [] }); return { ...fresh(), ...s, settings: { ...DEF, ...s.settings } }; } } catch (e) { /* corrupt → start fresh */ }
    return fresh();
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const dur = (m) => S.settings[m] * 60000;
  const running = () => S.endAt > 0;
  const left = () => (running() ? Math.max(0, S.endAt - Date.now()) : S.remaining);
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const activeTask = () => S.tasks.find((t) => t.id === S.activeId && !t.done) || null;

  /* ── Timer ── */
  function start() {
    if (running()) return;
    S.endAt = Date.now() + S.remaining; save(); loop(); render();
    if (S.settings.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }
  function pause() { if (!running()) return; S.remaining = left(); S.endAt = 0; clearInterval(tick); tick = 0; save(); render(); }
  function setMode(m, autoStart) {
    clearInterval(tick); tick = 0;
    S.mode = m; S.endAt = 0; S.remaining = dur(m); save();
    document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === m));
    render();
    if (autoStart) start();
  }
  function loop() { clearInterval(tick); tick = setInterval(() => { if (left() <= 0) finish(); else render(true); }, 250); }
  function finish() {
    clearInterval(tick); tick = 0;
    const was = S.mode, endedAt = S.endAt; S.endAt = 0;
    if (was === 'focus') {
      S.round += 1; S.count += 1; S.focusMs += dur('focus');
      const t = activeTask(); if (t) t.pomos += 1;
      S.log.push({ start: endedAt - dur('focus'), end: endedAt, task: t ? t.name : '', mins: S.settings.focus });
    }
    if (S.settings.sound) chime();
    notify(was);
    const next = was === 'focus' ? (S.round % S.settings.every === 0 ? 'long' : 'short') : 'focus';
    setMode(next, was === 'focus' ? S.settings.autoBreak : S.settings.autoFocus);
    toast(was === 'focus' ? 'Focus session done — take a break' : 'Break over — back to focus');
  }
  function skip() { if (S.mode === 'focus' && !confirm('Skip this focus session? It will not be counted.')) return; setMode(S.mode === 'focus' ? (S.round % S.settings.every === S.settings.every - 1 ? 'long' : 'short') : 'focus', false); }
  function chime() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [880, 1175, 1568].forEach((f, i) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; o.connect(g); g.connect(audio.destination); const t = audio.currentTime + i * 0.18; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.start(t); o.stop(t + 0.5); });
    } catch (e) { /* no audio available */ }
  }
  function notify(was) {
    if (!S.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(was === 'focus' ? 'Focus session complete' : 'Break is over', { body: was === 'focus' ? `Nice — ${S.count} pomodoro${S.count === 1 ? '' : 's'} today. Time for a break.` : 'Ready for the next focus session?', tag: 'toolity-pomodoro' }); } catch (e) { /* ignore */ }
  }

  /* ── Render ── */
  function render(light) {
    const ms = left(), total = dur(S.mode);
    $('pm-time').textContent = mmss(ms);
    $('pm-ring').style.strokeDashoffset = (C * (1 - ms / total)).toFixed(2);
    document.title = running() ? `${mmss(ms)} · ${LABEL[S.mode]} — Toolity` : baseTitle;
    if (light) return;
    $('pm-start-label').textContent = running() ? 'Pause' : (ms < total ? 'Resume' : 'Start');
    $('pm-start-icon').setAttribute('icon', running() ? 'lucide:pause' : 'lucide:play');
    $('btn-start').setAttribute('aria-label', running() ? 'Pause timer' : 'Start timer');
    $('tool-card').dataset.mode = S.mode;
    $('source-badge').textContent = `Round ${(S.round % S.settings.every) + 1} of ${S.settings.every}`;
    $('pm-dots').innerHTML = Array.from({ length: S.settings.every }, (_, i) => `<span class="pm-dot${i < S.round % S.settings.every ? ' done' : ''}"></span>`).join('');
    $('pm-today').textContent = `Today: ${S.count} pomodoro${S.count === 1 ? '' : 's'} · ${Math.round(S.focusMs / 60000)} min focused`;
    const t = activeTask(); $('pm-task-now').textContent = t ? t.name : (S.mode === 'focus' ? 'No task selected' : LABEL[S.mode]);
    $('result-badge').textContent = running() ? `${LABEL[S.mode]} running` : (ms < total ? 'Paused' : 'Ready · Space to start');
    $('btn-download').disabled = !S.log.length;
    $('settings-summary').textContent = `${S.settings.focus} / ${S.settings.short} / ${S.settings.long} · every ${S.settings.every}`;
    renderTasks();
  }
  function renderTasks() {
    const open = S.tasks.filter((t) => !t.done).length;
    $('output-badge').textContent = `${open} open`;
    $('output-empty').hidden = S.tasks.length > 0;
    $('btn-clear-done').hidden = !S.tasks.some((t) => t.done);
    $('task-list').innerHTML = S.tasks.map((t) => `<li class="pm-item${t.done ? ' done' : ''}${t.id === S.activeId ? ' active' : ''}" data-id="${t.id}">
      <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Mark ${esc(t.name)} ${t.done ? 'open' : 'done'}">
      <button type="button" class="pm-item-name" title="Make this the current task">${esc(t.name)}</button>
      <span class="pm-item-count" title="Pomodoros completed">${t.pomos ? '🍅 ' + t.pomos : ''}</span>
      <button type="button" class="pm-item-del" aria-label="Delete ${esc(t.name)}" title="Delete"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button>
    </li>`).join('');
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ── Tasks ── */
  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault(); const name = $('task-input').value.trim(); if (!name) return;
    const t = { id: Date.now().toString(36), name, done: false, pomos: 0 }; S.tasks.push(t); if (!activeTask()) S.activeId = t.id;
    $('task-input').value = ''; save(); render();
  });
  $('task-list').addEventListener('click', (e) => {
    const li = e.target.closest('.pm-item'); if (!li) return; const t = S.tasks.find((x) => x.id === li.dataset.id);
    if (e.target.closest('.pm-item-del')) S.tasks = S.tasks.filter((x) => x !== t);
    else if (e.target.closest('input[type=checkbox]')) { t.done = e.target.checked; if (t.done && S.activeId === t.id) S.activeId = (S.tasks.find((x) => !x.done) || {}).id || null; }
    else if (e.target.closest('.pm-item-name')) { if (!t.done) S.activeId = t.id; }
    else return;
    save(); render();
  });
  $('btn-clear-done').addEventListener('click', () => { S.tasks = S.tasks.filter((t) => !t.done); save(); render(); });

  /* ── Settings ── */
  const map = { focus: 'opt-focus', short: 'opt-short', long: 'opt-long', every: 'opt-every', autoBreak: 'opt-auto-break', autoFocus: 'opt-auto-focus', sound: 'opt-sound', notify: 'opt-notify' };
  function readSettings() {
    Object.entries(map).forEach(([k, id]) => { const el = $(id); S.settings[k] = el.type === 'checkbox' ? el.checked : Math.min(+el.max, Math.max(+el.min, +el.value || DEF[k])); });
    if (!running()) S.remaining = Math.min(S.remaining, dur(S.mode)) || dur(S.mode);
    if (S.settings.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    save(); render();
  }
  function writeSettings() { Object.entries(map).forEach(([k, id]) => { const el = $(id); if (el.type === 'checkbox') el.checked = S.settings[k]; else el.value = S.settings[k]; }); }
  Object.values(map).forEach((id) => $(id).addEventListener('change', readSettings));

  /* ── Toolbar ── */
  const summary = () => `Pomodoro — ${S.day}\n${S.count} pomodoro${S.count === 1 ? '' : 's'} · ${Math.round(S.focusMs / 60000)} min focused\n` + S.tasks.map((t) => `${t.done ? '[x]' : '[ ]'} ${t.name}${t.pomos ? ` (${t.pomos})` : ''}`).join('\n');
  function reset() {
    if (!confirm('Reset the timer, tasks, today\'s stats and settings?')) return;
    clearInterval(tick); tick = 0; S = fresh(); localStorage.removeItem(KEY);
    document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'focus'));
    writeSettings(); render(); toast('Reset');
  }
  const csv = () => 'start,end,minutes,task\n' + S.log.map((l) => `${new Date(l.start).toISOString()},${new Date(l.end).toISOString()},${l.mins},"${l.task.replace(/"/g, '""')}"`).join('\n') + '\n';
  $('btn-start').addEventListener('click', () => (running() ? pause() : start()));
  $('btn-skip').addEventListener('click', skip);
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', () => copyText(summary(), 'Summary copied'));
  $('btn-download').addEventListener('click', () => S.log.length && downloadBlob(new Blob([csv()], { type: 'text/csv' }), `pomodoro-${S.day}.csv`));
  $('btn-open').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : $('tool-card').requestFullscreen().catch(() => toast('Fullscreen is not available here'))));
  bindSegmented($('seg-mode'), (m) => { if (running() && !confirm('Switch mode and stop the current session?')) { document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === S.mode)); return; } setMode(m, false); });
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); running() ? pause() : start(); }
    else if (e.key.toLowerCase() === 'f') $('btn-open').click();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running()) (left() <= 0 ? finish() : render()); });

  /* ── Boot ── */
  writeSettings();
  document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === S.mode));
  if (running()) (left() <= 0 ? finish() : loop());
  render();
  window.__pomo = { get S() { return S; }, start, pause, finish, setMode, skip, load }; // self-check hook
})();
