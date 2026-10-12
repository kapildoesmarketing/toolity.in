/* Designed by Kapil Pidhwani: shared runtime for the Games family (rule 46).
 * Pages come from gen_game_pages.js; a game is G = {
 *   slug, storageKey?, defaultMode?, newGame(api), undo?(api), copy?(api),
 *   onMode?(val, api), onSetting?(el, api), onReset?(api), onKey?(e, api), summary?(api)
 * } — owns Web Audio beeps, localStorage best/tally, 1-second timer, overlay show/hide,
 * toolbar (seg-mode · Reset · Undo/Copy · New game), settings sync/reset, and keyboard wiring. */
(function () {
  'use strict';
  let audio;
  function beep(on, freq, dur = 0.06, type = 'sine', gain = 0.06) {
    if (!on) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur + 0.01);
    } catch (e) { /* audio blocked — fine */ }
  }
  const chord = (on, freqs, step = 65, dur = 0.09, type = 'triangle') => freqs.forEach((f, i) => setTimeout(() => beep(on, f, dur, type), i * step));
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function store(key) {
    const k = 'toolity_' + key;
    const read = () => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
    const write = (d) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) { /* blocked */ } };
    const clear = () => { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } };
    return { read, write, clear, get: (sub, def) => { const d = read(); return d[sub] !== undefined ? d[sub] : def; }, set: (sub, v) => { const d = read(); d[sub] = v; write(d); } };
  }

  function mount(G) {
    const { copyText, bindSegmented, bindShortcuts, toast } = window.Toolity;
    const $ = (id) => document.getElementById(id), card = $('tool-card');
    const st = store(G.storageKey || G.slug);
    let tickId = 0, secs = 0;
    const val = (id) => { const el = $(id); return !el ? undefined : el.type === 'checkbox' ? el.checked : el.value; };
    const mode = () => { const b = card.querySelector('#seg-mode .seg-pill.active'); return b ? b.dataset.value : G.defaultMode; };
    const sound = () => { const el = $('opt-sound'); return !el || el.checked; };
    const status = (msg, win) => { const b = $('status-badge'); if (!b) return; b.textContent = msg; b.classList.toggle('is-win', !!win); };
    const setUndo = (on) => { const b = $('btn-undo'); if (b) b.disabled = !on; };
    const setCopy = (on) => { const b = $('btn-copy'); if (b) b.disabled = !on; };
    function overlay(title, sub, extraBtn) {
      const ov = $('overlay'); if (!ov) return;
      if (!title) { ov.hidden = true; return; }
      $('overlay-title').textContent = title;
      $('overlay-text').textContent = sub || 'Press Space or New game to play again';
      const eb = $('overlay-btn');
      if (eb) { eb.hidden = !extraBtn; if (extraBtn) { eb.textContent = extraBtn.label; eb.onclick = extraBtn.onClick; } }
      ov.hidden = false;
    }
    const timer = {
      start(from = 0, onTick) { timer.stop(); secs = from; if (onTick) onTick(secs); tickId = setInterval(() => { secs++; if (onTick) onTick(secs); }, 1000); },
      countdown(total, onTick, onDone) { timer.stop(); secs = total; if (onTick) onTick(secs); tickId = setInterval(() => { secs--; if (onTick) onTick(secs); if (secs <= 0) { timer.stop(); if (onDone) onDone(); } }, 1000); },
      stop() { if (tickId) { clearInterval(tickId); tickId = 0; } },
      get: () => secs, running: () => !!tickId
    };
    const sfx = {
      tap: (f = 480) => beep(sound(), f, 0.045, 'sine', 0.055),
      move: () => beep(sound(), 420, 0.05, 'triangle', 0.06),
      capture: () => beep(sound(), 280, 0.07, 'sawtooth', 0.06),
      bad: () => beep(sound(), 170, 0.11, 'sawtooth', 0.065),
      win: () => chord(sound(), [523, 659, 784, 1047], 65, 0.11),
      lose: () => chord(sound(), [360, 290, 220], 90, 0.14, 'sawtooth')
    };
    const api = { $, card, st, val, mode, sound, status, setUndo, setCopy, overlay, timer, sfx, fmtClock, copyText, toast };
    const paintSummary = () => { if (G.summary && $('settings-summary')) $('settings-summary').textContent = G.summary(api); };

    const controls = () => [...card.querySelectorAll('.tool-settings-panel input, .tool-settings-panel select')];
    card.querySelectorAll('.segmented-group').forEach((g) => bindSegmented(g, (v) => { if (g.id === 'seg-mode' && G.onMode) G.onMode(v, api); else if (G.onSetting) G.onSetting(g, api); paintSummary(); }));
    controls().forEach((el) => el.addEventListener('change', () => { if (G.onSetting) G.onSetting(el, api); paintSummary(); }));

    const play = () => { overlay(null); G.newGame(api); paintSummary(); };
    $('btn-play').addEventListener('click', play);
    if ($('btn-undo') && G.undo) $('btn-undo').addEventListener('click', () => G.undo(api));
    if ($('btn-copy') && G.copy) $('btn-copy').addEventListener('click', () => G.copy(api));

    function reset() {
      timer.stop(); st.clear(); overlay(null);
      controls().forEach((el) => { if (el.type === 'checkbox') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value; else el.value = el.defaultValue; });
      card.querySelectorAll('.segmented-group').forEach((g) => g.querySelectorAll('.seg-pill').forEach((b, i) => b.classList.toggle('active', b.dataset.default !== undefined ? true : i === 0 && !g.querySelector('[data-default]'))));
      if (G.onReset) G.onReset(api);
      G.newGame(api); paintSummary(); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: play, reset });

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && e.target.id !== 'typing-input') return;
      if ((e.key === 'z' || e.key === 'Z') && G.undo && $('btn-undo') && !$('btn-undo').disabled && e.target.id !== 'typing-input') { e.preventDefault(); G.undo(api); return; }
      if (e.key === ' ' && !$('overlay').hidden && e.target.id !== 'typing-input') { e.preventDefault(); play(); return; }
      if (G.onKey) G.onKey(e, api);
    });

    play();
    window.__game = Object.assign(api, { G, play, reset });
    return api;
  }

  window.ToolityGame = { mount, beep, chord, fmtClock, store };
})();
