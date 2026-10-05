/* Designed by Kapil Pidhwani: Add to Calendar Link Creator — Google / Outlook / Office 365 / Yahoo links + RFC 5545 .ics, all client-side */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const el = {
    title: $('ev-title'), start: $('ev-start'), end: $('ev-end'), allday: $('ev-allday'), loc: $('ev-location'), url: $('ev-url'), desc: $('ev-desc'),
    tz: $('ev-tz'), repeat: $('ev-repeat'), interval: $('ev-interval'), until: $('ev-until'), alarm: $('ev-alarm'),
    links: $('cal-links'), empty: $('output-empty'), badge: $('output-badge'), srcBadge: $('source-badge'), result: $('result-badge'),
    err: $('input-error'), summary: $('settings-summary')
  };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const browserTz = 'Asia/Calcutta'; // default zone (Toolity's home); the Settings select still lists every IANA zone

  // ── time helpers ──
  const parts = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v || ''); return m && { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0) }; };
  const asUtcMs = (p) => Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  function tzOffset(ms, tz) {
    const o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).forEach((x) => { o[x.type] = x.value; });
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - Math.floor(ms / 1000) * 1000;
  }
  // Wall-clock time in `tz` → UTC epoch ms (two passes settle DST edges)
  function zonedToUtc(p, tz) { let ms = asUtcMs(p); for (let i = 0; i < 2; i++) ms = asUtcMs(p) - tzOffset(ms, tz); return ms; }
  const addMinutes = (p, mins) => { const d = new Date(asUtcMs(p) + mins * 60000); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
  const fmtDate = (p) => `${p.y}${pad(p.mo)}${pad(p.d)}`;
  const fmtLocal = (p) => `${fmtDate(p)}T${pad(p.h)}${pad(p.mi)}00`;
  const fmtUtc = (ms) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const isoDate = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
  const isoUtc = (ms) => new Date(ms).toISOString().replace(/\.\d{3}/, '');

  // ── model ──
  function readEvent() {
    const start = parts(el.start.value);
    if (!el.title.value.trim() || !start) return null;
    const allDay = el.allday.checked;
    let end = parts(el.end.value);
    if (!end || (allDay ? asUtcMs(end) < asUtcMs(start) : asUtcMs(end) <= asUtcMs(start))) {
      if (end) return { error: 'End must be after the start' };
      end = allDay ? start : addMinutes(start, 60);
    }
    const ev = { title: el.title.value.trim(), start, end, allDay, tz: el.tz.value || browserTz, loc: el.loc.value.trim(), url: el.url.value.trim(), desc: el.desc.value.trim(), alarm: el.alarm.value };
    if (allDay) { ev.start = { ...start, h: 0, mi: 0 }; ev.end = addMinutes({ ...end, h: 0, mi: 0 }, 1440); } // DTEND exclusive
    ev.startUtc = zonedToUtc(ev.start, ev.tz); ev.endUtc = zonedToUtc(ev.end, ev.tz);
    ev.rrule = rrule(ev);
    return ev;
  }
  function rrule(ev) {
    const freq = el.repeat.value; if (!freq) return '';
    const n = Math.min(99, Math.max(1, +el.interval.value || 1));
    const until = parts(el.until.value);
    // Designed by Kapil Pidhwani: UNTIL is end-of-day UTC, not zone-exact — a repeat may spill one extra day near the date line. Upgrade: zonedToUtc(until 23:59 in ev.tz).
    return `FREQ=${freq}` + (n > 1 ? `;INTERVAL=${n}` : '') + (until ? `;UNTIL=${fmtDate(until)}${ev.allDay ? '' : 'T235959Z'}` : '');
  }
  const details = (ev) => ev.desc + (ev.url ? (ev.desc ? '\n\n' : '') + ev.url : '');

  // ── provider URLs ──
  const builders = {
    google(ev) {
      const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title });
      p.set('dates', ev.allDay ? `${fmtDate(ev.start)}/${fmtDate(ev.end)}` : `${fmtLocal(ev.start)}/${fmtLocal(ev.end)}`);
      if (!ev.allDay) p.set('ctz', ev.tz);
      if (details(ev)) p.set('details', details(ev));
      if (ev.loc) p.set('location', ev.loc);
      if (ev.rrule) p.set('recur', 'RRULE:' + ev.rrule);
      return 'https://calendar.google.com/calendar/render?' + p;
    },
    outlook: (ev) => msLink('https://outlook.live.com/calendar/0/action/compose', ev),
    office: (ev) => msLink('https://outlook.office.com/calendar/action/compose', ev),
    yahoo(ev) {
      const p = new URLSearchParams({ v: '60', title: ev.title });
      if (ev.allDay) { p.set('st', fmtDate(ev.start)); p.set('et', fmtDate(addMinutes(ev.end, -1440))); p.set('dur', 'allday'); }
      else { p.set('st', fmtUtc(ev.startUtc)); p.set('et', fmtUtc(ev.endUtc)); }
      if (details(ev)) p.set('desc', details(ev));
      if (ev.loc) p.set('in_loc', ev.loc);
      return 'https://calendar.yahoo.com/?' + p;
    }
  };
  function msLink(base, ev) {
    const p = new URLSearchParams({ rru: 'addevent', path: '/calendar/action/compose', subject: ev.title });
    p.set('startdt', ev.allDay ? isoDate(ev.start) : isoUtc(ev.startUtc));
    p.set('enddt', ev.allDay ? isoDate(ev.end) : isoUtc(ev.endUtc));
    p.set('allday', String(ev.allDay));
    if (details(ev)) p.set('body', details(ev));
    if (ev.loc) p.set('location', ev.loc);
    return base + '?' + p;
  }

  // ── ICS (RFC 5545) ──
  const icsText = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // Designed by Kapil Pidhwani: folds by characters, not octets — a line of non-ASCII may exceed 75 bytes; every major parser tolerates it.
  const fold = (line) => line.match(/.{1,74}/gs).join('\r\n ');
  function ics(ev) {
    const dt = (p) => ev.allDay ? `;VALUE=DATE:${fmtDate(p)}` : `;TZID=${ev.tz}:${fmtLocal(p)}`;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Toolity.in//Add to Calendar Link Creator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@toolity.in`, `DTSTAMP:${fmtUtc(Date.now())}`,
      `DTSTART${dt(ev.start)}`, `DTEND${dt(ev.end)}`, `SUMMARY:${icsText(ev.title)}`];
    if (ev.desc) lines.push(`DESCRIPTION:${icsText(ev.desc)}`);
    if (ev.loc) lines.push(`LOCATION:${icsText(ev.loc)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    if (ev.alarm) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', `TRIGGER:${ev.alarm}`, 'END:VALARM');
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  // ── view ──
  let current = null;
  function render() {
    const ev = readEvent();
    const bad = ev && ev.error;
    el.err.hidden = !bad; if (bad) el.err.lastElementChild.textContent = ev.error;
    current = bad ? null : ev;
    const ok = !!current;
    el.links.hidden = !ok; el.empty.hidden = ok;
    ['btn-copy', 'btn-download', 'btn-open'].forEach((id) => { $(id).disabled = !ok; });
    el.result.textContent = ok ? 'Links ready — nothing leaves your browser' : 'Add a title and start time';
    el.badge.textContent = ok ? (current.allDay ? 'All-day' : current.tz) : 'Awaiting details';
    el.srcBadge.textContent = ok ? duration(current) : '';
    el.summary.textContent = [el.tz.value || browserTz, el.repeat.value ? el.repeat.selectedOptions[0].textContent : '', el.alarm.value ? 'Reminder' : ''].filter(Boolean).join(' · ');
    if (!ok) return;
    Object.keys(builders).forEach((id) => {
      const url = builders[id](current);
      document.querySelector(`[data-open="${id}"]`).href = url;
      const hint = $(`hint-${id}`);
      hint.textContent = id === 'google' ? (current.rrule ? 'Includes the repeat rule' : '') : (current.rrule ? "Link can't carry the repeat rule" : '');
    });
  }
  function duration(ev) {
    const mins = Math.round((asUtcMs(ev.end) - asUtcMs(ev.start)) / 60000);
    if (ev.allDay) return mins <= 1440 ? '1 day' : `${mins / 1440} days`;
    return mins % 60 === 0 ? `${mins / 60} h` : mins > 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  }
  function setAllDay() {
    const type = el.allday.checked ? 'date' : 'datetime-local';
    [el.start, el.end].forEach((i) => { const p = parts(i.value); i.type = type; i.value = p ? (type === 'date' ? isoDate(p) : `${isoDate(p)}T${pad(p.h)}:${pad(p.mi)}`) : ''; });
    render();
  }
  function reset() {
    [el.title, el.start, el.end, el.loc, el.url, el.desc, el.until].forEach((i) => { i.value = ''; });
    el.allday.checked = false; el.repeat.value = ''; el.interval.value = 1; el.alarm.value = ''; el.tz.value = browserTz;
    setAllDay(); toast('Reset');
  }
  const fileName = () => (current.title.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'event') + '.ics';
  const downloadIcs = () => current && downloadBlob(new Blob([ics(current)], { type: 'text/calendar;charset=utf-8' }), fileName());
  const copyGoogle = () => (current ? copyText(builders.google(current), 'Google Calendar link copied') : toast('Add a title and start time first'));

  // time-zone list (Intl.supportedValuesOf needs Chrome 99 / Safari 15.4; fallback keeps the browser zone + UTC)
  const zones = (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [browserTz, 'UTC']);
  if (!zones.includes(browserTz)) zones.unshift(browserTz);
  el.tz.innerHTML = zones.map((z) => `<option value="${z}">${z.replace(/_/g, ' ')}</option>`).join('');
  el.tz.value = browserTz;

  [el.title, el.start, el.end, el.loc, el.url, el.desc, el.interval, el.until].forEach((i) => i.addEventListener('input', render));
  [el.tz, el.repeat, el.alarm].forEach((i) => i.addEventListener('change', render));
  el.allday.addEventListener('change', setAllDay);
  el.links.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]'); if (!b || !current) return;
    copyText(builders[b.dataset.copy](current), 'Link copied');
  });
  $('btn-ics').addEventListener('click', downloadIcs);
  $('btn-ics-copy').addEventListener('click', () => current && copyText(ics(current), '.ics text copied'));
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', copyGoogle);
  $('btn-download').addEventListener('click', downloadIcs);
  $('btn-open').addEventListener('click', () => current && window.open(builders.google(current), '_blank', 'noopener'));
  bindShortcuts({ primary: copyGoogle, reset });
  window.__calLinks = { builders, ics, readEvent, zonedToUtc }; // self-check hook
  render();
})();
