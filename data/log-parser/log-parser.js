/* Designed by Kapil Pidhwani: Log Parser — per-line format parsers (JSON lines, access log, syslog, generic) behind one
 * auto-detect that samples the first 200 lines; unparsed indented lines (stack traces) attach to the previous entry.
 * Parsed entries are cached per text+format, so filters re-render without re-parsing. Ceiling: table shows 1,000 rows. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const LEVELS = ['error', 'warn', 'info', 'debug', 'other'];
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const MAX_ROWS = 1000;
  const lvl = (s) => { s = String(s || '').toLowerCase(); return /^(fatal|crit|critical|emerg|emergency|alert|err|error|severe)$/.test(s) ? 'error' : /^(warn|warning)$/.test(s) ? 'warn' : /^(info|information|notice|informational)$/.test(s) ? 'info' : /^(debug|trace|verbose|fine|finer|finest)$/.test(s) ? 'debug' : 'other'; };
  const toDate = (v) => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v); const d = new Date(v); return isNaN(d) ? null : d; };

  const P = {
    json(line) {
      if (!/^\s*\{/.test(line)) return null;
      let o; try { o = JSON.parse(line); } catch (e) { return null; }
      let L = o.level ?? o.severity ?? o.lvl ?? o.levelname ?? o.log_level ?? (o.log && o.log.level);
      if (typeof L === 'number') L = L >= 50 ? 'error' : L >= 40 ? 'warn' : L >= 30 ? 'info' : 'debug'; // pino / bunyan
      return { time: toDate(o.time ?? o.timestamp ?? o['@timestamp'] ?? o.ts ?? o.date), level: lvl(L), msg: String(o.msg ?? o.message ?? o.event ?? line) };
    },
    access(line) {
      const m = line.match(/^(\S+) \S+ (\S+) \[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})\] "(\S+) (\S+)(?: [^"]*)?" (\d{3}) (\d+|-)/);
      if (!m) return null;
      const [, ip, , d, mo, y, h, mi, s, tz, method, path, status] = m;
      const time = new Date(Date.UTC(+y, MON[mo.toLowerCase()], +d, +h, +mi, +s) - (tz[0] === '-' ? -1 : 1) * (+tz.slice(1, 3) * 60 + +tz.slice(3)) * 60000);
      const st = +status;
      return { time, level: st >= 500 ? 'error' : st >= 400 ? 'warn' : 'info', msg: `${method} ${path} → ${status}`, ip, path: path.split('?')[0], status };
    },
    syslog(line) {
      let m = line.match(/^<(\d{1,3})>1 (\S+) (\S+) (\S+) (\S+) (\S+) (?:-|\[.*?\]) ?(.*)$/);
      if (m) return { time: toDate(m[2] === '-' ? null : m[2]), level: sev(+m[1] % 8), msg: `${m[4]}: ${m[7]}` };
      m = line.match(/^(?:<(\d{1,3})>)?([A-Z][a-z]{2}) +(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\S+) ([^:[\s]+)(?:\[\d+\])?: (.*)$/);
      if (!m) return null;
      const now = new Date(), t = new Date(now.getFullYear(), MON[m[2].toLowerCase()], +m[3], +m[4], +m[5], +m[6]);
      if (t - now > 864e5) t.setFullYear(t.getFullYear() - 1);
      return { time: t, level: m[1] !== undefined ? sev(+m[1] % 8) : guess(m[9]), msg: `${m[8]}: ${m[9]}` };
    },
    generic(line) {
      const m = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)\]?[\s|,-]*(.*)$/);
      if (m) { const rest = m[2], L = rest.match(/^\[?\s*(FATAL|CRITICAL|CRIT|ERROR|ERR|SEVERE|WARNING|WARN|INFO|NOTICE|DEBUG|TRACE|VERBOSE)\s*\]?[\s:|-]*/i); return { time: toDate(m[1].replace(',', '.').replace(' ', 'T')), level: L ? lvl(L[1]) : guess(rest), msg: L ? rest.slice(L[0].length) : rest }; }
      const L = line.match(/^\[?\s*(FATAL|CRITICAL|ERROR|ERR|WARNING|WARN|INFO|NOTICE|DEBUG|TRACE)\s*\]?[\s:|-]+(.*)$/i);
      return L ? { time: null, level: lvl(L[1]), msg: L[2] } : null;
    }
  };
  function sev(n) { return n <= 3 ? 'error' : n === 4 ? 'warn' : n <= 6 ? 'info' : 'debug'; }
  function guess(s) { const m = String(s).match(/\b(FATAL|CRITICAL|ERROR|EXCEPTION|FAILED|WARN(?:ING)?|DEBUG)\b/i); if (!m) return 'other'; const k = m[1].toLowerCase(); return /^(exception|failed)$/.test(k) ? 'error' : lvl(k); }

  function detect(lines) {
    const score = { json: 0, access: 0, syslog: 0, generic: 0 };
    lines.slice(0, 200).forEach((l) => { for (const k of Object.keys(score)) if (P[k](l)) score[k]++; });
    const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
    return best[1] ? best[0] : 'generic';
  }
  let cache = { key: null };
  function parseAll(text, fmt) {
    const key = fmt + '\u0000' + text;
    if (cache.key === key) return cache;
    const lines = text.split(/\r?\n/), nonEmpty = lines.filter((l) => l.trim());
    const used = fmt === 'auto' ? detect(nonEmpty) : fmt;
    const order = [used, ...['json', 'access', 'syslog', 'generic'].filter((k) => k !== used)];
    const entries = [];
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const cont = /^(\s+\S|\s*at\s|Caused by:|\s*\.\.\. \d+ more|[\w.$]+(Exception|Error)(:|$))/.test(raw) && entries.length && used !== 'access';
      if (cont) { const e = entries[entries.length - 1]; e.raw += '\n' + raw; e.msg += '\n' + raw.trim(); continue; }
      let r = null; for (const k of order) if ((r = P[k](raw))) break;
      entries.push(Object.assign(r || { time: null, level: 'other', msg: raw }, { raw }));
    }
    return (cache = { key, entries, used, lines: nonEmpty.length });
  }
  const NAMES = { json: 'JSON lines', access: 'access log', syslog: 'syslog', generic: 'text log' };
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '');
  const norm = (s) => s.split('\n')[0].replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '#').replace(/\b0x[0-9a-f]+\b|\b[0-9a-f]{12,}\b/gi, '#').replace(/\d+(\.\d+)?/g, '#').slice(0, 160);
  const top = (arr, n = 5) => [...arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, n);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  function chart(list) {
    const times = list.map((e) => e.time).filter(Boolean).map((d) => +d);
    if (times.length < 2) return null;
    const min = times.reduce((a, b) => Math.min(a, b)), max = times.reduce((a, b) => Math.max(a, b));
    const step = max - min > 72 * 36e5 ? 864e5 : 36e5;
    const start = Math.floor(min / step) * step, n = Math.min(120, Math.floor((max - start) / step) + 1);
    const b = Array.from({ length: n }, () => ({ all: 0, err: 0 }));
    list.forEach((e) => { if (!e.time) return; const i = Math.min(n - 1, Math.floor((+e.time - start) / step)); if (i >= 0) { b[i].all++; if (e.level === 'error') b[i].err++; } });
    return { b, start, step, peak: Math.max(...b.map((x) => x.all)) };
  }

  let lastList = [];
  mount({
    slug: 'log-parser', idle: 'Open or paste a log to begin',
    ready: ({ val }) => (val('text-input').trim() ? true : 'Open or paste a log to begin'),
    summary: ({ val }) => [val('opt-format') === 'auto' ? 'Auto format' : NAMES[val('opt-format')], val('opt-regex') ? 'regex search' : 'plain search', val('opt-case') && 'case-sensitive'].filter(Boolean).join(' · '),
    run: ({ val, $ }) => {
      const P0 = parseAll(val('text-input'), val('opt-format'));
      const on = new Set(LEVELS.filter((l) => val('lvl-' + l)));
      const q = val('search-input');
      let test = () => true;
      if (q) {
        if (val('opt-regex')) { let re; try { re = new RegExp(q, val('opt-case') ? '' : 'i'); } catch (e) { throw new Error('Search: ' + e.message); } test = (s) => re.test(s); }
        else { const n = val('opt-case') ? q : q.toLowerCase(); test = (s) => (val('opt-case') ? s : s.toLowerCase()).includes(n); }
      }
      const from = val('time-from') ? new Date(val('time-from')) : null, to = val('time-to') ? new Date(val('time-to')) : null;
      const list = P0.entries.filter((e) => on.has(e.level) && (!from || (e.time && e.time >= from)) && (!to || (e.time && e.time <= to)) && (!q || test(e.raw)));
      const count = LEVELS.reduce((o, l) => ((o[l] = 0), o), {}); list.forEach((e) => count[e.level]++);
      $('input-count').textContent = `${P0.lines.toLocaleString()} lines · ${NAMES[P0.used]}`;

      const tile = (label, value, cls) => { const d = el('div', 'web-stat' + (cls ? ' ' + cls : '')); d.append(el('span', '', label), el('strong', '', value)); return d; };
      const times = list.map((e) => e.time).filter(Boolean);
      const span = times.length ? `${stamp(times.reduce((a, b) => (a < b ? a : b)))} → ${stamp(times.reduce((a, b) => (a > b ? a : b)))}` : 'No timestamps';
      $('output-stats').replaceChildren(tile('Matching lines', `${list.length.toLocaleString()} of ${P0.entries.length.toLocaleString()}`), tile('Errors', count.error.toLocaleString(), count.error ? 'log-stat-error' : ''), tile('Warnings', count.warn.toLocaleString(), count.warn ? 'log-stat-warn' : ''), tile('Info · Debug · Other', `${count.info} · ${count.debug} · ${count.other}`), tile('Time span', span));

      const c = chart(list), ch = $('output-chart');
      ch.hidden = !c; ch.replaceChildren();
      if (c) {
        ch.setAttribute('aria-label', `Lines per ${c.step === 864e5 ? 'day' : 'hour'}, peak ${c.peak}`);
        c.b.forEach((x, i) => { const bar = el('div', 'log-bar'); bar.style.height = `${Math.max(2, (x.all / c.peak) * 100)}%`; bar.style.setProperty('--err', `${x.all ? (x.err / x.all) * 100 : 0}%`); bar.title = `${stamp(new Date(c.start + i * c.step))} · ${x.all} lines${x.err ? ` · ${x.err} errors` : ''}`; ch.appendChild(bar); });
      }

      const tops = [['Top repeated messages', top(list.map((e) => norm(e.msg)))]];
      if (P0.used === 'access') tops.push(['Status codes', top(list.map((e) => e.status).filter(Boolean))], ['Top paths', top(list.map((e) => e.path).filter(Boolean))], ['Top IPs', top(list.map((e) => e.ip).filter(Boolean))]);
      $('output-tops').replaceChildren(...tops.filter(([, t]) => t.length).map(([h, t]) => { const d = el('div', 'web-stat log-top'); d.append(el('strong', '', h)); const ol = el('ol'); t.forEach(([k, n]) => { const li = el('li'); li.append(el('span', 'log-top-k', k), el('span', 'log-top-n', n.toLocaleString())); ol.appendChild(li); }); d.appendChild(ol); return d; }));

      const t = $('output-table'); t.replaceChildren();
      const head = el('thead'); const hr = el('tr'); ['Time', 'Level', 'Message'].forEach((h) => hr.appendChild(el('th', '', h))); head.appendChild(hr); t.appendChild(head);
      const body = el('tbody'), frag = document.createDocumentFragment();
      list.slice(0, MAX_ROWS).forEach((e) => { const tr = el('tr', 'log-' + e.level); tr.append(el('td', 'log-time', stamp(e.time))); const lt = el('td'); lt.appendChild(el('span', 'web-tag log-lvl-' + e.level, e.level.toUpperCase())); tr.appendChild(lt); tr.appendChild(el('td', 'log-msg', e.msg)); frag.appendChild(tr); });
      body.appendChild(frag); t.appendChild(body);
      $('output-note').textContent = list.length > MAX_ROWS ? `Showing the first ${MAX_ROWS.toLocaleString()} of ${list.length.toLocaleString()} matching lines — downloads include all of them.` : '';
      lastList = list;
      return { text: list.map((e) => e.raw).join('\n'), ext: 'log', badge: `${list.length.toLocaleString()} lines`, note: `${count.error} error${count.error === 1 ? '' : 's'} · ${count.warn} warning${count.warn === 1 ? '' : 's'} · ${NAMES[P0.used]}`, ok: true };
    },
    download: (fmt, { S }) => {
      const list = lastList;
      if (fmt === 'csv') { const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s); return { text: ['time,level,message', ...list.map((e) => [e.time ? e.time.toISOString() : '', e.level, q(e.msg)].join(','))].join('\n'), ext: 'csv', mime: 'text/csv;charset=utf-8' }; }
      if (fmt === 'json') return { text: JSON.stringify(list.map((e) => ({ time: e.time ? e.time.toISOString() : null, level: e.level, message: e.msg, ...(e.status ? { status: +e.status, path: e.path, ip: e.ip } : {}) })), null, 2), ext: 'json', mime: 'application/json' };
      return { text: S.out.text, ext: 'log' };
    },
    filename: () => 'log-filtered',
    onReset: ({ $ }) => { cache = { key: null }; $('input-count').textContent = ''; ['output-stats', 'output-chart', 'output-tops', 'output-table'].forEach((id) => $(id).replaceChildren()); $('output-note').textContent = ''; }
  });
})();
