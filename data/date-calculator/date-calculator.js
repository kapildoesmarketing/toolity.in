/* Designed by Kapil Pidhwani: Date Calculator. Four modes on one mount(): difference (calendar walk for Y/M/D + exact
 * totals), add/subtract (month arithmetic clamps to month end), working days (weekend digits from getDay() + a free-text
 * holiday list), age. All maths is plain Date in the device's local zone — no time-zone picker on purpose (datetime-local
 * inputs are local by definition). Ceilings: working-day loops are O(days) with a 100-year guard; holiday parsing trusts
 * Date.parse for textual formats, falling back to D/M/Y when M/D/Y is impossible. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const DAY = 864e5, pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const local = (s) => { // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' → local Date (new Date('YYYY-MM-DD') would be UTC)
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || ''); if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); return isNaN(d) ? null : d;
  };
  const parseLoose = (s) => {
    s = s.trim(); if (!s) return null;
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s); if (m) return local(`${m[1]}-${pad(m[2])}-${pad(m[3])}`);
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    if (m) { const a = +m[1], b = +m[2]; const [mo, d] = a > 12 ? [b, a] : [a, b]; return local(`${m[3]}-${pad(mo)}-${pad(d)}`); } // 26/01 → D/M, 01/26 → M/D
    const d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();
  const addMonths = (d, n) => { const r = new Date(d); const day = d.getDate(); r.setDate(1); r.setMonth(r.getMonth() + n); r.setDate(Math.min(day, dim(r.getFullYear(), r.getMonth()))); return r; };
  const isoWeek = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { week: Math.ceil(((t - y0) / DAY + 1) / 7), year: t.getUTCFullYear() }; };
  const doy = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 1)) / DAY) + 1;
  const F = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const FT = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmt = (d, time) => (time ? FT : F).format(d);
  const n = (x) => x.toLocaleString();
  const plural = (v, w) => `${n(v)} ${w}${v === 1 ? '' : 's'}`;

  /* calendar breakdown a→b (a ≤ b): whole months first, then exact remainder */
  function breakdown(a, b) {
    let months = 0; while (addMonths(a, months + 1) <= b) months++;
    let rest = b - addMonths(a, months);
    const days = Math.floor(rest / DAY); rest -= days * DAY;
    const hours = Math.floor(rest / 36e5); rest -= hours * 36e5;
    const minutes = Math.floor(rest / 6e4);
    return { years: Math.floor(months / 12), months: months % 12, days, hours, minutes };
  }
  const human = (p) => [['years', p.years], ['months', p.months], ['days', p.days], ['hours', p.hours], ['minutes', p.minutes]].filter(([, v]) => v).map(([w, v]) => plural(v, w.slice(0, -1))).join(', ') || '0 days';
  const weekendSet = (s) => new Set([...(s || '')].map(Number));
  const holidaysOf = (txt) => { const set = new Set(), bad = []; for (const line of (txt || '').split(/\r?\n/)) { if (!line.trim()) continue; const d = parseLoose(line); if (d) set.add(key(d)); else bad.push(line.trim()); } return { set, bad }; };
  const working = (d, wk, hol) => !wk.has(d.getDay()) && !hol.has(key(d));
  const between = (set, a, b, wk) => [...set].filter((k) => { const x = local(k); return x && x > Math.min(a, b) && x <= Math.max(a, b) && !wk.has(x.getDay()); }).length;

  function run({ val, pill, $ }) {
    const mode = pill('seg-mode') || 'diff', inclusive = !!val('opt-inclusive'), wk = weekendSet(val('opt-weekend'));
    const stats = [], rows = []; let headline = '', sub = '', badge = '';
    if (mode === 'diff') {
      let a = local(val('diff-a')), b = local(val('diff-b'));
      if (!a || !b) return 'Pick both dates';
      const neg = b < a; if (neg) [a, b] = [b, a];
      if (inclusive) b = new Date(b.getTime() + DAY);
      const p = breakdown(a, b), ms = b - a, totalDays = Math.floor(ms / DAY);
      headline = human(p); sub = neg ? 'the second date is earlier — showing the gap' : `${fmt(a, true)} → ${fmt(b, true)}${inclusive ? ' (end day included)' : ''}`;
      let wd = 0; for (let d = new Date(a.getFullYear(), a.getMonth(), a.getDate()), g = 0; d < b && g < 36600; d.setDate(d.getDate() + 1), g++) if (!wk.has(d.getDay())) wd++;
      stats.push(['Total days', n(totalDays)], ['Weeks', `${n(Math.floor(totalDays / 7))} w ${totalDays % 7} d`], ['Weekdays', n(wd)], ['Hours', n(Math.floor(ms / 36e5))], ['Minutes', n(Math.floor(ms / 6e4))], ['Seconds', n(Math.floor(ms / 1e3))]);
      rows.push(['ISO 8601 duration', `P${p.years ? p.years + 'Y' : ''}${p.months ? p.months + 'M' : ''}${p.days ? p.days + 'D' : ''}${p.hours || p.minutes ? 'T' + (p.hours ? p.hours + 'H' : '') + (p.minutes ? p.minutes + 'M' : '') : ''}`.replace(/^P$/, 'PT0S')], ['Total months', `${n(p.years * 12 + p.months)} (+${p.days} d)`], ['Percent of a year', `${(totalDays / 365.25 * 100).toFixed(1)} %`]);
      badge = plural(totalDays, 'day');
    } else if (mode === 'add') {
      const start = val('add-start') ? local(val('add-start')) : new Date(), sign = pill('seg-dir') === 'sub' ? -1 : 1;
      if (!start) return 'Enter a valid start';
      const v = (id) => Math.max(0, Math.floor(+val(id) || 0));
      const y = v('add-years'), mo = v('add-months'), w = v('add-weeks'), d = v('add-days'), h = v('add-hours'), mi = v('add-minutes');
      if (!(y || mo || w || d || h || mi)) return 'Enter an amount to add';
      let r = addMonths(start, sign * (y * 12 + mo)); r = new Date(r.getTime() + sign * ((w * 7 + d) * DAY + h * 36e5 + mi * 6e4));
      const hasTime = !!(h || mi || !val('add-start') || start.getHours() || start.getMinutes());
      headline = fmt(r, hasTime); sub = `${sign > 0 ? '+' : '−'} ${human({ years: y, months: mo, days: w * 7 + d, hours: h, minutes: mi })} from ${fmt(start, hasTime)}`;
      const iw = isoWeek(r), day0 = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
      stats.push(['Weekday', r.toLocaleDateString(undefined, { weekday: 'long' })], ['ISO week', `W${pad(iw.week)} · ${iw.year}`], ['Day of year', `${doy(r)} / ${dim(r.getFullYear(), 1) === 29 ? 366 : 365}`], ['Calendar days moved', n(Math.round((day0(r) - day0(start)) / DAY))]);
      rows.push(['ISO 8601', `${key(r)}${hasTime ? `T${pad(r.getHours())}:${pad(r.getMinutes())}` : ''}`], ['Unix time', String(Math.floor(r.getTime() / 1000))], ['Days from today', n(Math.round((day0(r) - day0(new Date())) / DAY))]);
      badge = key(r);
    } else if (mode === 'work') {
      const start = local(val('work-start')), end = local(val('work-end')), nAdd = val('work-n') === '' ? null : Math.trunc(+val('work-n'));
      if (!start) return 'Pick a start date';
      const { set: hol, bad } = holidaysOf(val('work-holidays'));
      if (nAdd !== null && !isNaN(nAdd)) {
        const step = nAdd < 0 ? -1 : 1; let left = Math.abs(nAdd), d = new Date(start), guard = 0;
        while (left > 0 && guard++ < 36600) { d.setDate(d.getDate() + step); if (working(d, wk, hol)) left--; }
        headline = fmt(d); sub = `${nAdd >= 0 ? '+' : ''}${n(nAdd)} working days from ${fmt(start)}`;
        const cal = Math.abs(Math.round((d - start) / DAY)), hs = between(hol, start, d, wk);
        stats.push(['Calendar days', n(cal)], ['Weekend days skipped', n(Math.max(0, cal - Math.abs(nAdd) - hs))], ['Holidays skipped', n(hs)], ['Lands on', d.toLocaleDateString(undefined, { weekday: 'long' })]);
        rows.push(['ISO 8601', key(d)]); badge = key(d);
      } else {
        if (!end) return 'Pick an end date or a number of days';
        let a = start, b = end; const neg = b < a; if (neg) [a, b] = [b, a];
        if (inclusive) b = new Date(b.getTime() + DAY);
        let wd = 0, we = 0, hd = 0, total = 0; const hit = [];
        for (let d = new Date(a); d < b && total < 36600; d.setDate(d.getDate() + 1), total++) { if (wk.has(d.getDay())) we++; else if (hol.has(key(d))) { hd++; hit.push(key(d)); } else wd++; }
        headline = plural(wd, 'working day'); sub = `${fmt(a)} → ${fmt(b)}${inclusive ? ' (end day included)' : ''}`;
        stats.push(['Calendar days', n(total)], ['Weekend days', n(we)], ['Holidays on weekdays', n(hd)], ['Working hours (8 h)', n(wd * 8)]);
        if (hit.length) rows.push(['Holidays counted', hit.join(', ')]);
        badge = plural(wd, 'working day');
      }
      if (bad.length) rows.push(['Unparsed holiday lines', bad.join(' · ')]);
    } else {
      const dob = local(val('age-dob')), on = val('age-on') ? local(val('age-on')) : new Date(new Date().setHours(0, 0, 0, 0));
      if (!dob) return 'Enter a date of birth';
      if (!on) return 'Enter a valid “age on” date';
      if (on < dob) return 'The “age on” date is before the birth date';
      const p = breakdown(dob, on), days = Math.round((on - dob) / DAY);
      headline = `${plural(p.years, 'year')}, ${plural(p.months, 'month')}, ${plural(p.days, 'day')}`; sub = `born ${fmt(dob)} · on ${fmt(on)}`;
      const bday = (y) => new Date(y, dob.getMonth(), Math.min(dob.getDate(), dim(y, dob.getMonth())));
      let next = bday(on.getFullYear()); if (next <= on) next = bday(on.getFullYear() + 1);
      stats.push(['Days alive', n(days)], ['Weeks', n(Math.floor(days / 7))], ['Months', n(p.years * 12 + p.months)], ['Hours', n(days * 24)], ['Next birthday', `${fmt(next)} · in ${plural(Math.round((next - on) / DAY), 'day')}`], ['Turning', String(p.years + 1)]);
      rows.push(['Born on a', dob.toLocaleDateString(undefined, { weekday: 'long' })], ['Decimal age', (days / 365.25).toFixed(2) + ' years'], ['10,000th day', fmt(new Date(dob.getTime() + 1e4 * DAY))]);
      badge = plural(p.years, 'year');
    }
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $('output-headline').innerHTML = `<strong>${esc(headline)}</strong><span>${esc(sub)}</span>`;
    $('output-stats').innerHTML = stats.map(([l, v]) => `<div class="web-stat"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('output-table').querySelector('tbody').innerHTML = rows.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`).join('');
    $('output-table').closest('.web-table-wrap').hidden = !rows.length;
    const all = [['Result', headline], ['Context', sub], ...stats, ...rows];
    return { text: all.map(([l, v]) => `${l}: ${v}`).join('\n'), json: Object.fromEntries(all), ext: 'txt', badge, note: 'Calculated', ok: true, copyMsg: 'Result copied' };
  }
  const PANES = ['diff', 'add', 'work', 'age'];
  const api = mount({
    slug: 'date-calculator', debounce: 100,
    summary: ({ val }) => `${{ 60: 'Sat–Sun', 56: 'Fri–Sat', 5: 'Fri', 0: 'Sun', '': 'no' }[val('opt-weekend')]} weekend · end day ${val('opt-inclusive') ? 'included' : 'excluded'}`,
    onPill: (g, { $, pill }) => { if (g.id !== 'seg-mode') return; const m = pill('seg-mode'); PANES.forEach((k) => { $(`pane-${k}`).hidden = k !== m; }); },
    run: (a) => { const r = run(a); if (typeof r === 'string') { a.status(r); return null; } return r; },
    download: (f, { S }) => (f === 'json' ? { text: JSON.stringify(S.out.json, null, 2), ext: 'json', mime: 'application/json' } : { text: S.out.text, ext: 'txt' }),
    filename: ({ pill }) => `date-${pill('seg-mode') || 'diff'}`,
    onReset: ({ $ }) => { PANES.forEach((k) => { $(`pane-${k}`).hidden = k !== 'diff'; }); $('output-headline').innerHTML = ''; $('output-stats').innerHTML = ''; }
  });
  window.ToolityDate = { addMonths, breakdown, isoWeek, parseLoose, api }; // for the page test
})();
