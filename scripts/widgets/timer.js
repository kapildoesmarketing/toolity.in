/* Designed by Kapil Pidhwani: Timer widget definition (scripts/widgets/timer.js) — Stopwatch · Pomodoro · Days since.
 * Shared by /widgets/timer/ (builder) and /widgets/timer/embed/ (chromeless embed).
 * Running state survives reloads: only timestamps are kept in the viewer's own localStorage (key = mode + embed query), so
 * reopening Notion carries on where it left off. Times are always derived from Date.now(), never from counting ticks, so a
 * throttled background tab can't drift. Pomodoro pauses at each phase change (with an optional chime) instead of running
 * unattended through breaks.
 */
(function () {
  'use strict';

  const SCHEMA = [
    { key: 'title',   type: 'text',     default: '',         maxLength: 60, id: 'opt-title',  label: 'Header label' },
    { key: 'mode',    type: 'enum',     default: 'pomodoro', options: ['stopwatch', 'pomodoro', 'since'], id: 'seg-mode', label: 'Mode' },
    { key: 'focus',   type: 'number',   default: 25, min: 1, max: 120, unit: ' min', id: 'opt-focus',  label: 'Focus length' },
    { key: 'brk',     type: 'number',   default: 5,  min: 1, max: 60,  unit: ' min', id: 'opt-break',  label: 'Short break' },
    { key: 'long',    type: 'number',   default: 15, min: 1, max: 60,  unit: ' min', id: 'opt-long',   label: 'Long break' },
    { key: 'rounds',  type: 'number',   default: 4,  min: 2, max: 8,   unit: '',     id: 'opt-rounds', label: 'Rounds before a long break' },
    { key: 'chime',   type: 'bool',     default: true,       id: 'opt-chime', label: 'Chime at the end of each phase' },
    { key: 'since',   type: 'datetime', default: '',         id: 'opt-since', label: 'Count up from' },
    { key: 'tz',      type: 'tz',       default: 'local',    id: 'opt-tz',    label: 'Time zone' },
    { key: 'units',   type: 'enum',     default: 'days',     options: ['days', 'full'], id: 'seg-units', label: 'Days since shows' },
    { key: 'variant', type: 'enum',     default: 'flip',     options: ['flip', 'minimal', 'compact'], id: 'seg-variant', label: 'Display style' }
  ];

  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked (private mode / partitioned iframe) — state just won't persist */ } }
  };

  let actx = null; // created on the first Start click (a user gesture), so the chime is allowed to play
  function chime() {
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    [0, 0.28].forEach((t, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + t;
      o.frequency.value = i ? 1175 : 880; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
      o.start(at); o.stop(at + 0.5);
    });
  }

  function validate(state) {
    if (state.mode === 'since' && !state.since) return 'Pick the date to count up from — the preview counts from 1 January this year.';
    if (state.mode === 'since' && Date.now() < window.ToolityWidgets.zonedMs(state.since, state.tz)) return 'That date is in the future — the widget shows 0 until it arrives (use the Countdown widget to count down to it).';
    return '';
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function unit(label, compact) {
    const u = el('div', 'w-unit'), tile = el('div', 'w-flip-tile'), digit = el('span', 'w-digit', '00');
    tile.appendChild(digit); u.appendChild(tile); u.appendChild(el('span', 'w-unit-label', compact ? label[0].toLowerCase() : label));
    return { u, tile, digit, label: u.lastChild };
  }
  function btn(text, label) { const b = el('button', 'w-btn', text); b.type = 'button'; b.setAttribute('aria-label', label || text); return b; }

  function render(root, state) {
    root.innerHTML = '';
    root.setAttribute('aria-live', 'off');
    const compact = state.variant === 'compact', mode = state.mode;
    const wrap = el('div', `w-card-wrap w-timer${mode === 'since' ? '' : ' has-controls'}`);
    const titleEl = el('div', 'w-title', state.title); titleEl.hidden = !state.title; wrap.appendChild(titleEl);
    const row = el('div', 'w-units'); wrap.appendChild(row);
    const sub = el('div', 'w-sub'); wrap.appendChild(sub);
    root.appendChild(wrap);

    const units = [], prev = {};
    const build = (labels) => { row.replaceChildren(); units.length = 0; labels.forEach((l, i) => { if (i) { const s = el('span', 'w-sep', ':'); s.setAttribute('aria-hidden', 'true'); row.appendChild(s); } const x = unit(l, compact); units.push(x); row.appendChild(x.u); }); };
    const show = (vals) => vals.forEach((v, i) => {
      const x = units[i]; if (!x || prev[i] === v) return;
      const had = prev[i] !== undefined; prev[i] = v; x.digit.textContent = v;
      if (had && state.variant === 'flip') { x.tile.classList.remove('is-tick'); void x.tile.offsetWidth; x.tile.classList.add('is-tick'); }
    });
    const key = `toolity-timer:${mode}:${location.search}`;
    let raf = 0, iv = 0;
    const stopLoops = () => { cancelAnimationFrame(raf); clearInterval(iv); };

    /* ── Days since ── */
    if (mode === 'since') {
      const from = state.since ? window.ToolityWidgets.zonedMs(state.since, state.tz) : new Date(new Date().getFullYear(), 0, 1).getTime();
      const full = state.units === 'full';
      build(full ? ['DAYS', 'HRS', 'MIN', 'SEC'] : ['DAYS']);
      let label = '';
      try { const o = { dateStyle: 'medium' }; if (state.tz !== 'local') o.timeZone = state.tz; label = new Intl.DateTimeFormat('en-US', o).format(new Date(from)); } catch (e) { label = new Date(from).toDateString(); }
      const tick = () => {
        const diff = Date.now() - from, s = Math.max(0, Math.floor(diff / 1000)), d = Math.floor(s / 86400);
        show(full ? [String(d), pad2(Math.floor((s % 86400) / 3600)), pad2(Math.floor((s % 3600) / 60)), pad2(s % 60)] : [String(d)]);
        sub.textContent = diff < 0 ? `Starts ${label}` : `since ${label}`;
        root.setAttribute('aria-label', `${state.title ? state.title + ': ' : ''}${d} day${d === 1 ? '' : 's'} since ${label}`);
      };
      tick(); iv = setInterval(tick, 1000);
      return stopLoops;
    }

    const controls = el('div', 'w-controls'); wrap.appendChild(controls);
    const go = btn('Start'); controls.appendChild(go);

    /* ── Stopwatch ── */
    if (mode === 'stopwatch') {
      const S = Object.assign({ run: false, t0: 0, acc: 0, laps: [] }, store.get(key) || {});
      const lap = btn('Lap'), reset = btn('Reset'), laps = el('div', 'w-laps');
      controls.appendChild(lap); controls.appendChild(reset); wrap.appendChild(laps);
      const elapsed = () => (S.run ? Date.now() - S.t0 : S.acc);
      const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${pad2(s % 60)}.${pad2(Math.floor((ms % 1000) / 10))}`; };
      let hours = null; const cs = el('span', 'w-meridiem w-cs'); // hundredths sit after the seconds like an AM/PM unit
      const paint = () => {
        const ms = elapsed(), s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
        if (hours !== (h > 0)) { hours = h > 0; build(hours ? ['HRS', 'MIN', 'SEC'] : ['MIN', 'SEC']); row.appendChild(cs); for (const k in prev) delete prev[k]; }
        show(hours ? [pad2(h), pad2(Math.floor((s % 3600) / 60)), pad2(s % 60)] : [pad2(Math.floor(s / 60)), pad2(s % 60)]);
        cs.textContent = `.${pad2(Math.floor((ms % 1000) / 10))}`;
        sub.textContent = S.run ? 'Running' : ms ? 'Paused' : 'Ready';
      };
      const ui = () => {
        go.textContent = S.run ? 'Pause' : elapsed() ? 'Resume' : 'Start'; go.setAttribute('aria-pressed', String(S.run));
        lap.disabled = !S.run; reset.disabled = S.run || !elapsed();
        laps.replaceChildren(...S.laps.slice(-3).reverse().map((l) => el('span', '', `Lap ${l.n} · ${fmt(l.ms)}`)));
        root.setAttribute('aria-label', `${state.title ? state.title + ': ' : ''}stopwatch ${fmt(elapsed())}${S.run ? ', running' : ''}`);
        store.set(key, S); paint();
      };
      const loop = () => { paint(); if (S.run) raf = requestAnimationFrame(loop); };
      const start = () => { stopLoops(); if (S.run) { raf = requestAnimationFrame(loop); iv = setInterval(paint, 250); } };
      go.addEventListener('click', () => { if (S.run) { S.acc = Date.now() - S.t0; S.run = false; } else { S.t0 = Date.now() - S.acc; S.run = true; } ui(); start(); });
      lap.addEventListener('click', () => { const ms = elapsed(), last = S.laps.length ? S.laps[S.laps.length - 1].at : 0; S.laps.push({ n: S.laps.length + 1, ms: ms - last, at: ms }); ui(); });
      reset.addEventListener('click', () => { Object.assign(S, { run: false, t0: 0, acc: 0, laps: [] }); ui(); });
      ui(); start();
      window.__timer = { S, ui };
      return stopLoops;
    }

    /* ── Pomodoro ── */
    const LEN = { focus: state.focus, break: state.brk, long: state.long };
    const NAME = { focus: 'Focus', break: 'Short break', long: 'Long break' };
    const P = Object.assign({ phase: 'focus', round: 1, run: false, end: 0, left: LEN.focus * 60000 }, store.get(key) || {});
    if (!LEN[P.phase]) Object.assign(P, { phase: 'focus', round: 1, run: false, left: LEN.focus * 60000 });
    const skip = btn('Skip', 'Skip to the next phase'), reset = btn('Reset');
    controls.appendChild(skip); controls.appendChild(reset);
    build(['MIN', 'SEC']);
    const remaining = () => Math.max(0, P.run ? P.end - Date.now() : P.left);
    const advance = (ring) => {
      if (ring && state.chime) chime();
      if (P.phase === 'focus') P.phase = P.round % state.rounds === 0 ? 'long' : 'break';
      else { P.round = P.phase === 'long' ? 1 : P.round + 1; P.phase = 'focus'; }
      Object.assign(P, { run: false, left: LEN[P.phase] * 60000 });
      wrap.dataset.phase = P.phase; ui();
    };
    const paint = () => {
      if (P.run && P.end <= Date.now()) return advance(true);
      const s = Math.ceil(remaining() / 1000); show([pad2(Math.floor(s / 60)), pad2(s % 60)]);
    };
    function ui() {
      go.textContent = P.run ? 'Pause' : P.left < LEN[P.phase] * 60000 ? 'Resume' : 'Start'; go.setAttribute('aria-pressed', String(P.run));
      const paused = !P.run && P.left < LEN[P.phase] * 60000;
      sub.textContent = `${NAME[P.phase]} · round ${P.round} of ${state.rounds}${paused ? ' · paused' : ''}`;
      wrap.dataset.phase = P.phase;
      root.setAttribute('aria-label', `${state.title ? state.title + ': ' : ''}${NAME[P.phase]}, round ${P.round} of ${state.rounds}, ${Math.ceil(remaining() / 60000)} minutes left${paused ? ', paused' : ''}`);
      store.set(key, P); paint();
    }
    go.addEventListener('click', () => {
      if (!actx && state.chime) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio — timer still works */ } }
      if (P.run) { P.left = remaining(); P.run = false; } else { P.end = Date.now() + P.left; P.run = true; }
      ui();
    });
    skip.addEventListener('click', () => advance(false));
    reset.addEventListener('click', () => { Object.assign(P, { phase: 'focus', round: 1, run: false, left: LEN.focus * 60000 }); ui(); });
    ui(); iv = setInterval(paint, 250);
    window.__timer = { P, ui, advance };
    return stopLoops;
  }

  /* Builder-only: show the settings that belong to the selected mode. */
  function builderExtras() {
    const seg = document.getElementById('seg-mode'); if (!seg) return;
    const sync = () => { const act = seg.querySelector('.seg-pill.active'), m = act ? act.dataset.value : 'pomodoro'; document.querySelectorAll('[data-mode-only]').forEach((g) => { g.hidden = !g.dataset.modeOnly.split(' ').includes(m); }); };
    document.getElementById('tool-card').addEventListener('click', () => setTimeout(sync, 0));
    document.getElementById('tool-card').addEventListener('input', () => setTimeout(sync, 0));
    sync();
  }

  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({ slug: 'timer', title: 'Timer', height: 220, schema: SCHEMA, validate, render });
    if (document.getElementById('tool-card')) (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', builderExtras, { once: true }) : builderExtras());
  }
})();
