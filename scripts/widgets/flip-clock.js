/* Designed by Kapil Pidhwani: Flip Clock widget definition (scripts/widgets/flip-clock.js).
 * Shared by /widgets/flip-clock/ (builder) and /widgets/flip-clock/embed/ (chromeless embed).
 */
(function () {
  'use strict';

  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));

  const SCHEMA = [
    { key: 'title',   type: 'text', default: '',       maxLength: 80, id: 'opt-title',   label: 'Header label' },
    { key: 'format',  type: 'enum', default: '12',     options: ['12', '24'], id: 'seg-format', label: 'Time format' },
    { key: 'seconds', type: 'bool', default: true,     id: 'opt-seconds', label: 'Show seconds' },
    { key: 'ampm',    type: 'bool', default: true,     id: 'opt-ampm',    label: 'Show AM/PM badge' },
    { key: 'date',    type: 'bool', default: true,     id: 'opt-date',    label: 'Show current date' },
    { key: 'tz',      type: 'tz',   default: 'local',  id: 'opt-tz',      label: 'Time zone' },
    { key: 'variant', type: 'enum', default: 'flip',   options: ['flip', 'minimal', 'compact'], id: 'seg-variant', label: 'Display style' },
    { key: 'labels',  type: 'bool', default: false,    id: 'opt-labels',  label: 'Show unit labels (HRS / MIN / SEC)' }
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
    const ampm = document.createElement('span');
    ampm.className = 'w-ampm';
    ampm.hidden = true;
    tile.appendChild(ampm);
    const label = document.createElement('span');
    label.className = 'w-unit-label';
    label.textContent = unitName;
    unit.appendChild(tile);
    unit.appendChild(label);
    return { unit, tile, digit, ampm, label };
  }

  function createSep() {
    const sep = document.createElement('span');
    sep.className = 'w-sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = ':';
    return sep;
  }

  function getClockParts(tz) {
    const now = new Date();
    const useTz = tz && tz !== 'local' ? tz : undefined;
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: useTz,
        hour12: false,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const parts = {};
      for (const p of dtf.formatToParts(now)) parts[p.type] = p.value;
      const h24 = Number(parts.hour) % 24;
      const m = Number(parts.minute) || 0;
      const s = Number(parts.second) || 0;
      const dateStr = `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
      return { h24, m, s, dateStr };
    } catch (e) {
      return {
        h24: now.getHours(),
        m: now.getMinutes(),
        s: now.getSeconds(),
        dateStr: now.toDateString()
      };
    }
  }

  function render(root, state) {
    root.innerHTML = '';
    root.setAttribute('aria-live', 'off');

    const wrap = document.createElement('div');
    wrap.className = 'w-card-wrap';

    const titleEl = document.createElement('div');
    titleEl.className = 'w-title';
    titleEl.textContent = state.title || '';
    titleEl.hidden = !state.title;
    wrap.appendChild(titleEl);

    const unitsRow = document.createElement('div');
    unitsRow.className = 'w-units';

    const uHours = createUnit('HRS');
    const sep1 = createSep();
    const uMins = createUnit('MIN');
    const sep2 = createSep();
    const uSecs = createUnit('SEC');

    unitsRow.appendChild(uHours.unit);
    unitsRow.appendChild(sep1);
    unitsRow.appendChild(uMins.unit);
    if (state.seconds) {
      unitsRow.appendChild(sep2);
      unitsRow.appendChild(uSecs.unit);
    }
    wrap.appendChild(unitsRow);

    const dateEl = document.createElement('div');
    dateEl.className = 'w-sub';
    dateEl.hidden = !state.date;
    wrap.appendChild(dateEl);

    root.appendChild(wrap);

    [uHours.label, uMins.label, uSecs.label].forEach((l) => {
      l.hidden = !state.labels;
    });

    const prev = { h: '', m: '', s: '' };

    function setDigit(unitObj, key, val) {
      if (prev[key] !== val) {
        const hadPrev = prev[key] !== '';
        prev[key] = val;
        unitObj.digit.textContent = val;
        if (hadPrev && state.variant === 'flip') {
          unitObj.tile.classList.remove('is-tick');
          void unitObj.tile.offsetWidth;
          unitObj.tile.classList.add('is-tick');
        }
      }
    }

    function tick() {
      const { h24, m, s, dateStr } = getClockParts(state.tz);
      const is12 = state.format === '12';
      const displayHour = is12 ? (h24 % 12 || 12) : h24;
      const period = h24 >= 12 ? 'PM' : 'AM';

      setDigit(uHours, 'h', pad2(displayHour));
      setDigit(uMins, 'm', pad2(m));
      if (state.seconds) setDigit(uSecs, 's', pad2(s));

      if (is12 && state.ampm) {
        uHours.ampm.hidden = false;
        uHours.ampm.textContent = period;
      } else {
        uHours.ampm.hidden = true;
      }

      if (state.date) {
        dateEl.textContent = dateStr;
      }

      root.setAttribute('aria-label', `${state.title ? state.title + ': ' : ''}${pad2(displayHour)}:${pad2(m)}${state.seconds ? ':' + pad2(s) : ''}${is12 ? ' ' + period : ''}`);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }

  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({
      slug: 'flip-clock',
      title: 'Flip Clock',
      schema: SCHEMA,
      render
    });
  }
})();
