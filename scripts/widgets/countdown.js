/* Designed by Kapil Pidhwani: Countdown Timer widget definition (scripts/widgets/countdown.js).
 * Shared by /widgets/countdown/ (builder) and /widgets/countdown/embed/ (chromeless embed).
 */
(function () {
  'use strict';

  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));

  const SCHEMA = [
    { key: 'title',   type: 'text',     default: '',      maxLength: 80, id: 'opt-title',   label: 'Event title' },
    { key: 'to',      type: 'datetime', default: '',      id: 'opt-to',      label: 'Target date & time' },
    { key: 'tz',      type: 'tz',       default: 'local', id: 'opt-tz',      label: 'Time zone' },
    { key: 'variant', type: 'enum',     default: 'flip',  options: ['flip', 'minimal', 'compact'], id: 'seg-variant', label: 'Display style' },
    { key: 'days',    type: 'bool',     default: true,    id: 'opt-days',    label: 'Show days' },
    { key: 'hours',   type: 'bool',     default: true,    id: 'opt-hours',   label: 'Show hours' },
    { key: 'minutes', type: 'bool',     default: true,    id: 'opt-minutes', label: 'Show minutes' },
    { key: 'seconds', type: 'bool',     default: true,    id: 'opt-seconds', label: 'Show seconds' },
    { key: 'done',    type: 'text',     default: '',      maxLength: 80, id: 'opt-done',    label: 'Completed message' }
  ];

  function createUnit(unitName) {
    const unit = document.createElement('div');
    unit.className = 'w-unit';
    const tile = document.createElement('div');
    tile.className = 'w-flip-tile';
    const digit = document.createElement('span');
    digit.className = 'w-digit';
    digit.textContent = '00';
    tile.appendChild(digit);
    const label = document.createElement('span');
    label.className = 'w-unit-label';
    label.textContent = unitName;
    unit.appendChild(tile);
    unit.appendChild(label);
    return { unit, tile, digit, label };
  }

  function createSep() {
    const sep = document.createElement('span');
    sep.className = 'w-sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = ':';
    return sep;
  }

  /* Wall-clock → epoch ms now lives in widget-common (ToolityWidgets.zonedMs), shared with the Timer widget. */
  function parseTargetMs(toStr, tz) {
    if (!toStr) {
      // Smart fallback for empty preview: next Jan 1 at 00:00 local time
      return new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0).getTime();
    }
    const ms = window.ToolityWidgets.zonedMs(toStr, tz);
    return Number.isNaN(ms) ? Date.now() : ms;
  }

  function formatTargetLabel(toStr, tz) {
    const ms = parseTargetMs(toStr, tz);
    try {
      const opts = { dateStyle: 'medium', timeStyle: 'short' };
      if (tz && tz !== 'local') opts.timeZone = tz;
      return new Intl.DateTimeFormat('en-US', opts).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toLocaleDateString();
    }
  }

  function validate(state) {
    if (state.to) {
      const target = parseTargetMs(state.to, state.tz);
      if (target < Date.now()) {
        return 'Target date is in the past — the widget is currently displaying its completed state.';
      }
    }
    if (!state.days && !state.hours && !state.minutes && !state.seconds) {
      return 'All time units are hidden — enable at least one unit (Days, Hours, Minutes, or Seconds).';
    }
    return '';
  }

  function render(root, state) {
    root.innerHTML = '';
    root.setAttribute('aria-live', 'off');

    const wrap = document.createElement('div');
    wrap.className = 'w-card-wrap';

    const titleEl = document.createElement('div');
    titleEl.className = 'w-title';
    const effectiveTitle = state.title || (!state.to ? `Countdown to ${new Date().getFullYear() + 1}` : '');
    titleEl.textContent = effectiveTitle;
    titleEl.hidden = !effectiveTitle;
    wrap.appendChild(titleEl);

    const unitsRow = document.createElement('div');
    unitsRow.className = 'w-units';

    const compact = state.variant === 'compact';
    const activeDefs = [];
    if (state.days)    activeDefs.push({ key: 'd', obj: createUnit(compact ? 'd' : 'DAYS') });
    if (state.hours)   activeDefs.push({ key: 'h', obj: createUnit(compact ? 'h' : 'HRS') });
    if (state.minutes) activeDefs.push({ key: 'm', obj: createUnit(compact ? 'm' : 'MIN') });
    if (state.seconds || !activeDefs.length) activeDefs.push({ key: 's', obj: createUnit(compact ? 's' : 'SEC') });

    activeDefs.forEach((u, idx) => {
      if (idx > 0) unitsRow.appendChild(createSep());
      unitsRow.appendChild(u.obj.unit);
    });
    wrap.appendChild(unitsRow);

    const doneEl = document.createElement('div');
    doneEl.className = 'w-done-msg';
    doneEl.hidden = true;
    wrap.appendChild(doneEl);

    const subEl = document.createElement('div');
    subEl.className = 'w-sub';
    subEl.textContent = formatTargetLabel(state.to, state.tz);
    wrap.appendChild(subEl);

    root.appendChild(wrap);

    const targetMs = parseTargetMs(state.to, state.tz);
    const prev = {};

    function setDigit(u, val) {
      if (prev[u.key] !== val) {
        const hadPrev = prev[u.key] !== undefined;
        prev[u.key] = val;
        u.obj.digit.textContent = val;
        if (hadPrev && state.variant === 'flip') {
          u.obj.tile.classList.remove('is-tick');
          void u.obj.tile.offsetWidth;
          u.obj.tile.classList.add('is-tick');
        }
      }
    }

    function tick() {
      const diff = Math.max(0, targetMs - Date.now());
      if (diff <= 0 && state.done) {
        unitsRow.hidden = true;
        doneEl.hidden = false;
        doneEl.textContent = state.done;
        root.setAttribute('aria-label', `${effectiveTitle ? effectiveTitle + ': ' : ''}${state.done}`);
        return;
      }
      unitsRow.hidden = false;
      doneEl.hidden = true;

      let rem = Math.floor(diff / 1000);
      const d = Math.floor(rem / 86400);
      if (state.days) rem %= 86400;
      const h = Math.floor(rem / 3600);
      if (state.hours) rem %= 3600;
      const m = Math.floor(rem / 60);
      const s = rem % 60;

      const vals = { d: pad2(d), h: pad2(h), m: pad2(m), s: pad2(s) };
      for (const u of activeDefs) setDigit(u, vals[u.key]);

      root.setAttribute('aria-label', `${effectiveTitle ? effectiveTitle + ': ' : ''}${d}d ${h}h ${m}m ${s}s remaining`);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }

  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({
      slug: 'countdown',
      title: 'Countdown Timer',
      schema: SCHEMA,
      validate,
      render
    });
  }
})();
