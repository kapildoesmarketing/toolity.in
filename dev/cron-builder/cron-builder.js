/* Designed by Kapil Pidhwani: Cron Builder. One parser (Vixie 5-field + optional seconds, names, @aliases, Quartz L / W / # / ?),
 * one simulator (walks days, then the hour/minute/second sets — never minute-by-minute), wall-clock ⇄ UTC through
 * Intl.DateTimeFormat so any IANA zone works incl. DST gaps (non-existent times are skipped like real cron), and an English
 * describer. The visual builder is rendered here (6 field blocks) and kept in two-way sync with #cron-input.
 * Ceilings: 5-year search horizon; no year field; L-n offsets ("L-3") and Quartz "W" on ranges are not supported. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], DOWS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const FIELDS = [
    { k: 'second', min: 0, max: 59, label: 'Second', unit: 'second' },
    { k: 'minute', min: 0, max: 59, label: 'Minute', unit: 'minute' },
    { k: 'hour', min: 0, max: 23, label: 'Hour', unit: 'hour' },
    { k: 'dom', min: 1, max: 31, label: 'Day of month', unit: 'day-of-month' },
    { k: 'month', min: 1, max: 12, label: 'Month', unit: 'month', names: MONTHS, full: (v) => MONTH_FULL[v - 1] },
    { k: 'dow', min: 0, max: 6, label: 'Day of week', unit: 'day-of-week', names: DOWS, full: (v) => DOW_FULL[v] }
  ];
  const ALIAS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  const ord = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const pad = (n) => String(n).padStart(2, '0');

  /* ── parse one field → { any, set, specials[], kind, step, from, to, text } ── */
  function parseField(text, F) {
    const f = { any: false, set: new Set(), specials: [], kind: 'custom', text };
    const num = (t) => {
      if (F.names) { const i = F.names.indexOf(t.toUpperCase()); if (i >= 0) return F.min + i; }
      if (!/^\d+$/.test(t)) throw new Error(`“${t}” is not valid in the ${F.label.toLowerCase()} field`);
      let v = +t; if (F.k === 'dow' && v === 7) v = 0;
      if (v < F.min || v > F.max) throw new Error(`${F.label} must be ${F.min}–${F.max}${F.k === 'dow' ? ' (7 = Sunday)' : ''}, got ${t}`);
      return v;
    };
    const parts = text.split(','); if (parts.some((p) => !p)) throw new Error(`Empty value in the ${F.label.toLowerCase()} field`);
    for (const p of parts) {
      if (p === '*' || p === '?') { if (p === '?' && F.k !== 'dom' && F.k !== 'dow') throw new Error('“?” is only allowed in day-of-month or day-of-week'); for (let v = F.min; v <= F.max; v++) f.set.add(v); f.any = true; if (parts.length === 1) f.kind = 'any'; continue; }
      if (F.k === 'dom' && /^(L|LW|\d{1,2}W)$/i.test(p)) { const u = p.toUpperCase(); if (u === 'L') f.specials.push({ t: 'L' }); else if (u === 'LW') f.specials.push({ t: 'LW' }); else f.specials.push({ t: 'W', n: num(u.slice(0, -1)) }); continue; }
      if (F.k === 'dow' && /^[a-z0-9]+L$/i.test(p)) { f.specials.push({ t: 'dowL', n: num(p.slice(0, -1)) }); continue; }
      if (F.k === 'dow' && /#/.test(p)) { const [a, b] = p.split('#'); const nth = +b; if (!(nth >= 1 && nth <= 5)) throw new Error('“#” needs 1–5 (e.g. MON#2 = second Monday)'); f.specials.push({ t: '#', n: num(a), nth }); continue; }
      const m = /^([^/]+)(?:\/(\d+))?$/.exec(p); if (!m) throw new Error(`Cannot read “${p}” in the ${F.label.toLowerCase()} field`);
      const step = m[2] ? +m[2] : 1; if (!step) throw new Error('Step must be at least 1');
      let from, to;
      if (m[1] === '*') { from = F.min; to = F.max; } else if (m[1].includes('-')) { const [a, b] = m[1].split('-'); from = num(a); to = num(b); if (F.k === 'dow' && to === 0 && from > 0) to = 6; if (from > to) throw new Error(`Range ${p} is backwards`); } else { from = num(m[1]); to = m[2] ? F.max : from; }
      for (let v = from; v <= to; v += step) f.set.add(v);
      if (parts.length === 1) { if (m[2]) { f.kind = 'step'; f.step = step; f.from = from; f.to = to; } else if (m[1].includes('-')) { f.kind = 'range'; f.from = from; f.to = to; } else f.kind = 'list'; }
    }
    if (parts.length > 1 && f.specials.length === 0 && !f.any && parts.every((p) => !/[-/]/.test(p))) f.kind = 'list';
    if (f.specials.length && f.set.size === 0) f.kind = 'custom';
    return f;
  }
  function parse(expr, seconds) {
    let s = expr.trim().replace(/\s+/g, ' ');
    if (!s) throw new Error('empty');
    if (s.toLowerCase() === '@reboot') return { reboot: true, fields: null, text: s };
    if (ALIAS[s.toLowerCase()]) s = (seconds ? '0 ' : '') + ALIAS[s.toLowerCase()];
    const toks = s.split(' '), want = seconds ? 6 : 5;
    if (toks.length !== want) throw new Error(`Expected ${want} fields (${seconds ? 'second ' : ''}minute hour day-of-month month day-of-week), got ${toks.length}`);
    const names = seconds ? FIELDS : FIELDS.slice(1), fields = {};
    names.forEach((F, i) => { fields[F.k] = parseField(toks[i], F); });
    if (!seconds) fields.second = parseField('0', FIELDS[0]);
    return { fields, text: s };
  }

  /* ── calendar + zone helpers (pure UTC arithmetic on wall-clock components) ── */
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dowOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const fmtCache = {};
  const dtf = (tz) => fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const wall = (date, tz) => { const o = {}; for (const p of dtf(tz).formatToParts(date)) if (p.type !== 'literal') o[p.type] = +p.value; return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second }; };
  function zonedToUtc(y, m, d, h, mi, s, tz) {
    const target = Date.UTC(y, m - 1, d, h, mi, s); let guess = target;
    for (let i = 0; i < 3; i++) { const w = wall(new Date(guess), tz); const got = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s); if (got === target) return guess; guess += target - got; }
    const w = wall(new Date(guess), tz); return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) === target ? guess : null; // null = DST gap
  }
  function dayMatches(y, m, d, f) {
    const dow = dowOf(y, m, d), last = dim(y, m);
    const domSpecial = f.dom.specials.some((sp) => sp.t === 'L' ? d === last : sp.t === 'LW' ? d === lastWeekday(y, m) : d === nearestWeekday(y, m, sp.n));
    const dowSpecial = f.dow.specials.some((sp) => sp.t === 'dowL' ? dow === sp.n && d + 7 > last : dow === sp.n && Math.ceil(d / 7) === sp.nth);
    const domAny = f.dom.any && !f.dom.specials.length, dowAny = f.dow.any && !f.dow.specials.length;
    const domHit = (!f.dom.any && f.dom.set.has(d)) || domSpecial, dowHit = (!f.dow.any && f.dow.set.has(dow)) || dowSpecial;
    if (domAny && dowAny) return true; if (domAny) return dowHit; if (dowAny) return domHit; return domHit || dowHit;
  }
  const lastWeekday = (y, m) => { let d = dim(y, m); while ([0, 6].includes(dowOf(y, m, d))) d--; return d; };
  const nearestWeekday = (y, m, n) => { const last = dim(y, m); n = Math.min(n, last); const w = dowOf(y, m, n); if (w === 6) return n > 1 ? n - 1 : n + 2; if (w === 0) return n < last ? n + 1 : n - 2; return n; };
  function nextRuns(spec, tz, count, seconds) {
    const f = spec.fields, out = [], hours = [...f.hour.set].sort((a, b) => a - b), mins = [...f.minute.set].sort((a, b) => a - b), secs = seconds ? [...f.second.set].sort((a, b) => a - b) : [0];
    const q = seconds ? 1000 : 60000, start = new Date(Math.floor(Date.now() / q) * q + q), w = wall(start, tz);
    let cur = Date.UTC(w.y, w.m - 1, w.d), first = true;
    for (let i = 0; i < 1830 && out.length < count; i++, cur += 864e5, first = false) {
      const D = new Date(cur), y = D.getUTCFullYear(), m = D.getUTCMonth() + 1, d = D.getUTCDate();
      if (!f.month.set.has(m) || !dayMatches(y, m, d, f)) continue;
      for (const h of hours) { if (first && h < w.h) continue; for (const mi of mins) { if (first && h === w.h && mi < w.mi) continue; for (const s of secs) {
        if (first && h === w.h && mi === w.mi && s < w.s) continue;
        const t = zonedToUtc(y, m, d, h, mi, s, tz); if (t === null) continue;
        out.push(t); if (out.length >= count) return out;
      } } }
    }
    return out;
  }

  /* ── English ── */
  const runs = (vals, name) => { // [1,2,3,5] → "1 through 3 and 5"
    const v = [...vals].sort((a, b) => a - b), groups = []; let s = v[0], p = v[0];
    for (let i = 1; i <= v.length; i++) { if (v[i] === p + 1) { p = v[i]; continue; } groups.push(p - s >= 2 ? `${name(s)} through ${name(p)}` : p === s ? name(s) : `${name(s)}, ${name(p)}`); s = p = v[i]; }
    return groups.length > 1 ? groups.slice(0, -1).join(', ') + ' and ' + groups[groups.length - 1] : groups[0];
  };
  function fieldDesc(f, F) {
    const name = F.full || String;
    if (f.kind === 'step') return `every ${ord(f.step)} ${F.unit}${f.from === F.min && f.to === F.max ? '' : ` from ${name(f.from)} through ${name(f.to)}`}`;
    const parts = [];
    if (!f.any && f.set.size) parts.push(`${F.unit} ${runs(f.set, name)}`);
    for (const sp of f.specials) parts.push(sp.t === 'L' ? 'the last day of the month' : sp.t === 'LW' ? 'the last weekday of the month' : sp.t === 'W' ? `the weekday nearest day ${sp.n}` : sp.t === 'dowL' ? `the last ${DOW_FULL[sp.n]} of the month` : `the ${ord(sp.nth)} ${DOW_FULL[sp.n]} of the month`);
    return parts.join(' and ');
  }
  function describe(spec, seconds) {
    if (spec.reboot) return 'At start-up (reboot) only';
    const f = spec.fields, single = (x) => !x.any && x.set.size === 1 && !x.specials.length, one = (x) => [...x.set][0];
    const hourDesc = f.hour.any ? 'every hour' : f.hour.kind === 'step' ? fieldDesc(f.hour, FIELDS[2]) : `hour ${runs(f.hour.set, String)}`;
    let t;
    if (single(f.minute) && single(f.hour)) t = `At ${pad(one(f.hour))}:${pad(one(f.minute))}`;
    else if (single(f.minute)) t = `At minute ${one(f.minute)} past ${hourDesc}`;
    else if (f.minute.any && f.hour.any) t = 'Every minute';
    else if (f.minute.any) t = `Every minute past ${hourDesc}`;
    else if (f.minute.kind === 'step') t = `Every ${ord(f.minute.step)} minute${f.minute.from === 0 && f.minute.to === 59 ? '' : ` from ${f.minute.from} through ${f.minute.to}`}${f.hour.any ? '' : ` past ${hourDesc}`}`;
    else t = `At minute ${runs(f.minute.set, String)}${f.hour.any ? '' : ` past ${hourDesc}`}`;
    if (seconds && !(single(f.second) && one(f.second) === 0)) t = (f.second.any ? 'Every second' : f.second.kind === 'step' ? `Every ${ord(f.second.step)} second` : `At second ${runs(f.second.set, String)}`) + ', ' + t[0].toLowerCase() + t.slice(1);
    const dom = f.dom.any && !f.dom.specials.length ? '' : fieldDesc(f.dom, FIELDS[3]), dow = f.dow.any && !f.dow.specials.length ? '' : fieldDesc(f.dow, FIELDS[5]), mon = f.month.any ? '' : fieldDesc(f.month, FIELDS[4]);
    return t + (dom ? ` on ${dom}` : '') + (dow ? `${dom ? ' and' : ''} on ${dow}` : '') + (mon ? ` in ${mon}` : '');
  }

  /* ── builder UI ── */
  const $ = (id) => document.getElementById(id), B = $('cron-builder');
  const optList = (F) => { let s = ''; for (let v = F.min; v <= F.max; v++) s += `<option value="${v}">${F.full ? F.full(v) : v}</option>`; return s; };
  B.innerHTML = FIELDS.map((F) => `
    <fieldset class="cb-field" data-k="${F.k}"${F.k === 'second' ? ' hidden' : ''}>
      <div class="cb-field-head"><legend>${F.label}</legend>
        <select id="cb-${F.k}-mode" class="select-clean" aria-label="${F.label} mode"><option value="any">Every ${F.unit.replace('day-of-month', 'day').replace('day-of-week', 'day')}</option><option value="step">Every N</option><option value="range">Between</option><option value="list">Specific</option><option value="custom" hidden>Custom (edit the expression)</option></select>
      </div>
      <div class="cb-field-body" data-m="step"><label class="web-muted" for="cb-${F.k}-step">every</label><input type="number" id="cb-${F.k}-step" class="input-clean" min="1" max="${F.max}" value="${F.k === 'minute' ? 15 : F.k === 'hour' ? 6 : 2}" inputmode="numeric"><span class="web-muted">${F.unit.replace(/-/g, ' ')}s</span></div>
      <div class="cb-field-body" data-m="range"><select id="cb-${F.k}-from" class="select-clean" aria-label="${F.label} from">${optList(F)}</select><span class="web-muted">to</span><select id="cb-${F.k}-to" class="select-clean" aria-label="${F.label} to">${optList(F)}</select></div>
      <div class="cb-field-body cb-chips" data-m="list" role="group" aria-label="${F.label} values">${Array.from({ length: F.max - F.min + 1 }, (_, i) => { const v = F.min + i; return `<button type="button" class="cb-chip" data-v="${v}" aria-pressed="false">${F.names ? F.names[i][0] + F.names[i].slice(1).toLowerCase() : v}</button>`; }).join('')}</div>
    </fieldset>`).join('');
  FIELDS.forEach((F) => { $(`cb-${F.k}-to`).value = F.k === 'hour' ? 17 : F.k === 'dow' ? 5 : F.max; $(`cb-${F.k}-from`).value = F.k === 'hour' ? 9 : F.k === 'dow' ? 1 : F.min; [...$(`cb-${F.k}-to`).options].find((o) => o.value === $(`cb-${F.k}-to`).value).defaultSelected = true; [...$(`cb-${F.k}-from`).options].find((o) => o.value === $(`cb-${F.k}-from`).value).defaultSelected = true; });
  const showMode = (k) => { const m = $(`cb-${k}-mode`).value; B.querySelectorAll(`[data-k="${k}"] .cb-field-body`).forEach((el) => { el.hidden = el.dataset.m !== m; }); };
  const chips = (k) => [...B.querySelectorAll(`[data-k="${k}"] .cb-chip`)];
  function compose(seconds) {
    return (seconds ? FIELDS : FIELDS.slice(1)).map((F) => {
      const m = $(`cb-${F.k}-mode`).value;
      if (m === 'step') return `*/${Math.max(1, +$(`cb-${F.k}-step`).value || 1)}`;
      if (m === 'range') { const a = +$(`cb-${F.k}-from`).value, b = +$(`cb-${F.k}-to`).value; return a === b ? String(a) : a < b ? `${a}-${b}` : `${b}-${a}`; }
      if (m === 'list') { const v = chips(F.k).filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.v); return v.length ? v.join(',') : '*'; }
      if (m === 'custom') return $(`cb-${F.k}-mode`).dataset.raw || '*';
      return '*';
    }).join(' ');
  }
  function reflect(spec, seconds) { // expression → builder
    FIELDS.forEach((F) => {
      const sel = $(`cb-${F.k}-mode`), f = spec && spec.fields && spec.fields[F.k];
      if (!f || (F.k === 'second' && !seconds)) { sel.value = 'any'; chips(F.k).forEach((c) => c.setAttribute('aria-pressed', 'false')); showMode(F.k); return; }
      const kind = f.kind === 'step' && f.from === F.min && f.to === F.max ? 'step' : f.kind === 'range' ? 'range' : f.kind === 'list' ? 'list' : f.kind === 'any' ? 'any' : 'custom';
      sel.value = kind; sel.dataset.raw = f.text; sel.querySelector('[value=custom]').hidden = kind !== 'custom';
      if (kind === 'step') $(`cb-${F.k}-step`).value = f.step;
      if (kind === 'range') { $(`cb-${F.k}-from`).value = f.from; $(`cb-${F.k}-to`).value = f.to; }
      chips(F.k).forEach((c) => c.setAttribute('aria-pressed', String(kind === 'list' && f.set.has(+c.dataset.v))));
      showMode(F.k);
    });
  }
  FIELDS.forEach((F) => showMode(F.k));

  /* time zones: common first, then the full ICU list */
  const COMMON = ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
  const tzSel = $('opt-tz'), all = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : COMMON;
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  tzSel.options[0].textContent = `Device time zone (${device})`;
  [...COMMON, ...all.filter((z) => !COMMON.includes(z))].forEach((z) => tzSel.add(new Option(z.replace(/_/g, ' '), z)));

  let syncing = false;
  const api = mount({
    slug: 'cron-builder', debounce: 120, idle: 'Enter an expression',
    ready: ({ val }) => (val('cron-input').trim() ? true : 'Enter an expression'),
    summary: ({ val }) => `${val('opt-tz') || 'Device'} time zone · ${val('opt-count')} runs · ${val('opt-seconds') ? '6' : '5'} fields`,
    onInput: (el, a) => {
      if (syncing) return; syncing = true;
      try {
        const seconds = !!a.val('opt-seconds');
        if (el.id === 'cron-preset' && el.value) { a.$('cron-input').value = (seconds ? '0 ' : '') + el.value; el.value = ''; try { reflect(parse(a.$('cron-input').value, seconds), seconds); } catch (e) { /* shown by run */ } }
        else if (el.id === 'cron-input') { try { reflect(parse(el.value, seconds), seconds); } catch (e) { /* keep builder as is */ } }
        else if (el.id === 'opt-seconds') {
          const v = a.$('cron-input').value.trim(); B.querySelector('[data-k=second]').hidden = !seconds; a.$('cron-fields-hint').textContent = (seconds ? 'second · ' : '') + 'minute · hour · day · month · weekday';
          const nf = v ? v.split(/\s+/).length : 0; // idempotent: a checkbox fires input + change
          if (v && !v.startsWith('@') && nf === (seconds ? 5 : 6)) a.$('cron-input').value = seconds ? '0 ' + v : v.split(/\s+/).slice(1).join(' ');
          try { reflect(parse(a.$('cron-input').value, seconds), seconds); } catch (e) { /* noop */ }
        }
        else if (el.closest('.cb-field')) { if (el.id.endsWith('-mode')) showMode(el.closest('.cb-field').dataset.k); a.$('cron-input').value = compose(seconds); }
      } finally { syncing = false; }
    },
    run: ({ val, $: g }) => {
      const seconds = !!val('opt-seconds'), tz = val('opt-tz') || undefined, count = +val('opt-count') || 10, h24 = !!val('opt-24h');
      const spec = parse(val('cron-input'), seconds); // throws → shared error pane
      const human = describe(spec, seconds), flags = [];
      const list = spec.reboot ? [] : nextRuns(spec, tz, count, seconds);
      if (spec.fields) {
        const f = spec.fields;
        if (!f.dom.any && !f.dow.any) flags.push(['warn', 'Day-of-month OR day-of-week (runs when either matches)']);
        if ([...f.dom.set].every((d) => d > 29) && !f.dom.any && [...f.month.set].every((m) => m === 2)) flags.push(['fail', 'Never runs — February has no such day']);
        else if (!list.length && !spec.reboot) flags.push(['fail', 'No run found in the next 5 years']);
        if (f.minute.any && f.hour.any && !seconds) flags.push(['', 'Runs every minute — 1,440 times a day']);
        if (seconds && f.second.any) flags.push(['warn', 'Runs every second']);
      }
      const zone = tz || device, fmt = new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: !h24, timeZoneName: 'short' });
      const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }), relOf = (t) => { const s = (t - Date.now()) / 1000; return s < 90 ? rel.format(Math.round(s), 'second') : s < 5400 ? rel.format(Math.round(s / 60), 'minute') : s < 129600 ? rel.format(Math.round(s / 3600), 'hour') : s < 3456000 ? rel.format(Math.round(s / 86400), 'day') : rel.format(Math.round(s / 2592000), 'month'); };
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      g('output-human').innerHTML = `<strong>${esc(human)}</strong><code>${esc(spec.text)}</code>`;
      g('output-flags').innerHTML = flags.map(([c, t]) => `<span class="web-tag ${c}">${esc(t)}</span>`).join('');
      g('output-runs').innerHTML = list.map((t, i) => `<li><span>${esc(fmt.format(t))}</span><span class="web-muted">${i === 0 ? esc(relOf(t)) : i > 0 ? '+' + esc(gap(list[i - 1], t)) : ''}</span></li>`).join('');
      g('output-runs').hidden = !list.length;
      const iso = list.map((t) => new Date(t).toISOString());
      return { text: spec.text, ext: 'txt', badge: spec.reboot ? '@reboot' : `${list.length} run${list.length === 1 ? '' : 's'} · ${zone}`, note: flags.some((f) => f[0] === 'fail') ? flags.find((f) => f[0] === 'fail')[1] : 'Valid expression', ok: !flags.some((f) => f[0] === 'fail'), copyMsg: 'Expression copied',
        full: { expression: spec.text, description: human, timeZone: zone, fields: seconds ? 6 : 5, warnings: flags.map((f) => f[1]), nextRuns: iso, nextRunsLocal: list.map((t) => fmt.format(t)) } };
    },
    download: (f, { S }) => (f === 'json' ? { text: JSON.stringify(S.out.full, null, 2), ext: 'json', mime: 'application/json' } : { text: `${S.out.full.expression}\n${S.out.full.description}\nTime zone: ${S.out.full.timeZone}\n${S.out.full.warnings.map((w) => '! ' + w + '\n').join('')}\nNext runs:\n${S.out.full.nextRunsLocal.map((l, i) => `${i + 1}. ${l}  (${S.out.full.nextRuns[i]})`).join('\n')}`, ext: 'txt' }),
    filename: () => 'cron-schedule',
    onReset: ({ $: g }) => { reflect(null, false); B.querySelector('[data-k=second]').hidden = true; g('cron-fields-hint').textContent = 'minute · hour · day · month · weekday'; g('output-human').innerHTML = ''; g('output-runs').innerHTML = ''; g('output-flags').innerHTML = ''; }
  });
  const gap = (a, b) => { const s = Math.round((b - a) / 1000); return s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${+(s / 3600).toFixed(1)} h` : `${+(s / 86400).toFixed(1)} d`; };
  B.addEventListener('click', (e) => {
    const c = e.target.closest('.cb-chip'); if (!c) return;
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    const k = c.closest('.cb-field').dataset.k; $(`cb-${k}-mode`).value = 'list'; showMode(k);
    syncing = true; api.$('cron-input').value = compose(!!api.val('opt-seconds')); syncing = false; api.run();
  });
  window.ToolityCron = { parse, describe, nextRuns, zonedToUtc, compose, api }; // for the page test
})();
