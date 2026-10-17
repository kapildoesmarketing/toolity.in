/* Designed by Kapil Pidhwani: JSON Converter — hub and spoke. Every input is parsed to a plain JS value, every output is
 * written from that value, so N formats need N readers + N writers (not N²). YAML/TOML load a pinned ESM lib on first use;
 * everything else is native (JSON, DOMParser/XMLSerializer, URLSearchParams) or a few lines here. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const LIB = { yaml: 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs', toml: 'https://cdn.jsdelivr.net/npm/smol-toml@1.3.4/+esm' };
  /* Designed by Kapil Pidhwani: converters stay synchronous (no busy flicker per keystroke); a format whose library is not
   * loaded yet throws {need}, run() loads it once and re-runs. */
  const libs = {}, loaded = {};
  const lib = (k) => (libs[k] = libs[k] || import(LIB[k]).then((m) => (loaded[k] = m.default && m.default.load ? m.default : m)).catch(() => { delete libs[k]; throw new Error(`Couldn't load the ${k.toUpperCase()} library — check your connection and try again.`); }));
  const need = (k) => { if (loaded[k]) return loaded[k]; throw { need: k }; };
  const EXT = { json: 'json', csv: 'csv', yaml: 'yaml', toml: 'toml', xml: 'xml', query: 'txt', markdown: 'md', typescript: 'ts', zod: 'ts' };
  const NAME = { json: 'JSON', csv: 'CSV', yaml: 'YAML', toml: 'TOML', xml: 'XML', query: 'query string', markdown: 'Markdown', typescript: 'TypeScript', zod: 'Zod' };
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const typed = (s) => { if (s === 'true') return true; if (s === 'false') return false; if (s === 'null') return null; if (s !== '' && /^-?(0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?$/.test(s) && Number.isFinite(+s)) return +s; return s; };

  /* ── CSV (RFC 4180) ── */
  function sniff(text) {
    const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const [d, n] = [',', '\t', ';', '|'].map((x) => [x, line.split(x).length]).sort((a, b) => b[1] - a[1])[0];
    return n > 1 ? d : ',';
  }
  function parseCsvRows(text, d) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && f === '') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (q) throw new Error('CSV has an unclosed quote.');
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.length > 1 || r[0] !== '');
  }
  const unflat = (o) => { const out = {}; for (const [k, v] of Object.entries(o)) { const parts = k.split('.'); let t = out; parts.forEach((p, i) => { if (i === parts.length - 1) t[p] = v; else t = (isObj(t[p]) ? t[p] : (t[p] = {})); }); } return out; };
  function readTable(rows, o) {
    if (!rows.length) return [];
    const head = rows[0].map((h, i) => h.trim() || `column${i + 1}`);
    return rows.slice(1).map((r) => { const obj = {}; head.forEach((h, i) => { obj[h] = o.types ? typed(r[i] === undefined ? '' : r[i]) : (r[i] === undefined ? '' : r[i]); }); return o.flatten ? unflat(obj) : obj; });
  }
  function flatten(o, pre = '', out = {}) {
    for (const [k, v] of Object.entries(o)) { const key = pre ? `${pre}.${k}` : k; if (isObj(v) && Object.keys(v).length) flatten(v, key, out); else out[key] = v; }
    return out;
  }
  function toRecords(v, o) {
    const arr = Array.isArray(v) ? v : [v];
    if (!arr.length) throw new Error('Nothing to put in a table — the data is an empty array.');
    const recs = arr.map((x) => (isObj(x) ? (o.flatten ? flatten(x) : x) : { value: x }));
    const keys = []; const seen = new Set();
    recs.forEach((r) => Object.keys(r).forEach((k) => { if (!seen.has(k)) { seen.add(k); keys.push(k); } }));
    return { keys, recs };
  }
  const cell = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  function writeCsv(v, o) {
    const { keys, recs } = toRecords(v, o);
    const q = (s) => (s.includes(o.delim) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    return [keys.map(q).join(o.delim), ...recs.map((r) => keys.map((k) => q(cell(r[k]))).join(o.delim))].join('\n');
  }

  /* ── Markdown table ── */
  function readMarkdown(text, o) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') || (l.includes('|') && l.length));
    const split = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
    const rows = lines.filter((l) => !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(l)).map(split);
    if (rows.length < 1) throw new Error('No Markdown table found — rows must look like | a | b |.');
    return readTable(rows, o);
  }
  function writeMarkdown(v, o) {
    const { keys, recs } = toRecords(v, o);
    const e = (s) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
    return [`| ${keys.map(e).join(' | ')} |`, `| ${keys.map(() => '---').join(' | ')} |`, ...recs.map((r) => `| ${keys.map((k) => e(cell(r[k]))).join(' | ')} |`)].join('\n');
  }

  /* ── XML ── */
  function readXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error('XML: ' + (err.textContent.split('\n').find((l) => l.trim() && !/^This page contains/.test(l)) || 'not well-formed').trim());
    const conv = (el) => {
      const o = {};
      for (const a of el.attributes) o['@' + a.name] = a.value;
      const kids = [...el.children];
      const text = [...el.childNodes].filter((n) => n.nodeType === 3 || n.nodeType === 4).map((n) => n.nodeValue).join('').trim();
      if (!kids.length && !el.attributes.length) return text;
      kids.forEach((k) => { const v = conv(k), n = k.tagName; if (n in o) { if (!Array.isArray(o[n])) o[n] = [o[n]]; o[n].push(v); } else o[n] = v; });
      if (text) o['#text'] = text;
      return o;
    };
    return { [doc.documentElement.tagName]: conv(doc.documentElement) };
  }
  function writeXml(v, o) {
    const tag = (k) => { let t = String(k).replace(/[^\w.-]/g, '_'); if (!/^[A-Za-z_]/.test(t)) t = '_' + t; return t; };
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ind = o.indent === '\t' ? '\t' : ' '.repeat(+o.indent || 0), nl = ind ? '\n' : '';
    const node = (name, val, d) => {
      const pad = ind.repeat(d);
      if (Array.isArray(val)) return val.map((x) => node(name, x, d)).join('');
      if (!isObj(val)) return `${pad}<${tag(name)}>${val === null || val === undefined ? '' : esc(val)}</${tag(name)}>${nl}`;
      const attrs = Object.entries(val).filter(([k]) => k.startsWith('@')).map(([k, x]) => ` ${tag(k.slice(1))}="${esc(x)}"`).join('');
      const kids = Object.entries(val).filter(([k]) => !k.startsWith('@') && k !== '#text');
      const text = val['#text'] !== undefined ? esc(val['#text']) : '';
      if (!kids.length) return `${pad}<${tag(name)}${attrs}>${text}</${tag(name)}>${nl}`;
      return `${pad}<${tag(name)}${attrs}>${nl}${text ? pad + ind + text + nl : ''}${kids.map(([k, x]) => node(k, x, d + 1)).join('')}${pad}</${tag(name)}>${nl}`;
    };
    const root = isObj(v) && Object.keys(v).length === 1 && !Object.keys(v)[0].startsWith('@') && !Array.isArray(Object.values(v)[0]) ? Object.entries(v)[0] : ['root', Array.isArray(v) ? { item: v } : v];
    return `<?xml version="1.0" encoding="UTF-8"?>\n${node(root[0], root[1], 0)}`.trimEnd();
  }

  /* ── Query string (a[b]=1, a[]=1, repeated keys → array) ── */
  function readQuery(text, o) {
    let s = text.trim(); const qi = s.indexOf('?'); if (qi >= 0) s = s.slice(qi + 1); s = s.split('#')[0];
    const out = {};
    for (const [k, raw] of new URLSearchParams(s)) {
      const val = o.types ? typed(raw) : raw;
      const path = k.replace(/\]/g, '').split('['); let t = out;
      path.forEach((p, i) => {
        const last = i === path.length - 1;
        if (last) { if (p === '' && Array.isArray(t)) t.push(val); else if (p in t) t[p] = [].concat(t[p], val); else t[p] = val; }
        else { const nextArr = path[i + 1] === ''; if (!(p in t) || typeof t[p] !== 'object' || t[p] === null) t[p] = nextArr ? [] : {}; t = t[p]; }
      });
    }
    return out;
  }
  function writeQuery(v) {
    if (!isObj(v)) throw new Error('A query string needs an object of keys, e.g. {"a": 1}.');
    const p = new URLSearchParams();
    const walk = (pre, x) => {
      if (Array.isArray(x)) x.forEach((y) => (isObj(y) || Array.isArray(y) ? walk(`${pre}[]`, JSON.stringify(y)) : p.append(`${pre}[]`, cell(y))));
      else if (isObj(x)) Object.entries(x).forEach(([k, y]) => walk(pre ? `${pre}[${k}]` : k, y));
      else p.append(pre, cell(x));
    };
    walk('', v);
    return p.toString().replace(/%5B/g, '[').replace(/%5D/g, ']');
  }

  /* ── Type inference → TypeScript / Zod ── */
  const shape = () => ({ t: new Set(), fields: new Map(), seen: new Map(), n: 0, items: null });
  function add(s, v) {
    if (v === null || v === undefined) s.t.add('null');
    else if (Array.isArray(v)) { s.t.add('array'); s.items = s.items || shape(); v.forEach((x) => add(s.items, x)); }
    else if (typeof v === 'object') { s.t.add('object'); s.n++; for (const [k, x] of Object.entries(v)) { if (!s.fields.has(k)) s.fields.set(k, shape()); add(s.fields.get(k), x); s.seen.set(k, (s.seen.get(k) || 0) + 1); } }
    else s.t.add(typeof v === 'bigint' ? 'number' : typeof v);
  }
  const pascal = (s) => (String(s).replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase()) || 'Item').replace(/^(\d)/, '_$1');
  const single = (s) => (/ies$/.test(s) ? s.slice(0, -3) + 'y' : /ses$/.test(s) ? s.slice(0, -2) : /s$/.test(s) && !/ss$/.test(s) ? s.slice(0, -1) : s + 'Item');
  const prop = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
  function toTs(v, root) {
    const s = shape(); add(s, v);
    const decls = [], used = new Set();
    const uniq = (n) => { let x = n, i = 2; while (used.has(x)) x = n + i++; used.add(x); return x; };
    const type = (sh, hint) => {
      const parts = [];
      for (const k of ['string', 'number', 'boolean']) if (sh.t.has(k)) parts.push(k);
      if (sh.t.has('object')) { const name = uniq(pascal(hint)); const body = [...sh.fields].map(([k, f]) => `  ${prop(k)}${sh.seen.get(k) < sh.n ? '?' : ''}: ${type(f, k)};`); decls.push(`export interface ${name} {\n${body.join('\n')}\n}`); parts.push(name); }
      if (sh.t.has('array')) { const it = sh.items && sh.items.t.size ? type(sh.items, single(hint)) : 'unknown'; parts.push(/[|]/.test(it) ? `(${it})[]` : `${it}[]`); }
      if (sh.t.has('null')) parts.push('null');
      return parts.join(' | ') || 'unknown';
    };
    if (isObj(v)) { type(s, root); const first = decls.pop(); return [first, ...decls.reverse()].join('\n\n'); }
    const t = type(s, root);
    return [`export type ${uniq(pascal(root))} = ${t};`, ...decls.reverse()].join('\n\n');
  }
  function toZod(v, root) {
    const s = shape(); add(s, v);
    const z = (sh, d) => {
      const pad = '  '.repeat(d), parts = [];
      for (const k of ['string', 'number', 'boolean']) if (sh.t.has(k)) parts.push(`z.${k}()`);
      if (sh.t.has('object')) parts.push(`z.object({\n${[...sh.fields].map(([k, f]) => `${pad}  ${prop(k)}: ${z(f, d + 1)}${sh.seen.get(k) < sh.n ? '.optional()' : ''},`).join('\n')}\n${pad}})`);
      if (sh.t.has('array')) parts.push(`z.array(${sh.items && sh.items.t.size ? z(sh.items, d) : 'z.unknown()'})`);
      let out = parts.length > 1 ? `z.union([${parts.join(', ')}])` : parts[0] || (sh.t.has('null') ? 'z.null()' : 'z.unknown()');
      if (sh.t.has('null') && parts.length) out += '.nullable()';
      return out;
    };
    const n = pascal(root);
    return `import { z } from "zod";\n\nexport const ${n}Schema = ${z(s, 0)};\n\nexport type ${n} = z.infer<typeof ${n}Schema>;`;
  }

  /* ── detection + dispatch ── */
  function detect(t) {
    const s = t.trim();
    if (/^[{[]/.test(s)) { try { JSON.parse(s); return 'json'; } catch (e) { if (/^\[[\w.\s"'-]+\]\s*$/m.test(s) && /^\s*[\w."-]+\s*=/m.test(s)) return 'toml'; return 'json'; } }
    if (s.startsWith('<')) return 'xml';
    if (/^\|.*\|\s*$/m.test(s.split('\n')[0])) return 'markdown';
    if (!/\s/.test(s) && /=/.test(s) && (/&/.test(s) || /^\??[^=&]+=[^&]*$/.test(s) || s.includes('?'))) return 'query';
    if (/^\s*[\w."-]+\s*=\s*\S/m.test(s) && !/^\s*[\w."-]+\s*:\s/m.test(s)) return 'toml';
    const lines = s.split(/\r?\n/).filter(Boolean);
    if (lines.length > 1) { try { const c = parseCsvRows(lines.slice(0, 20).join('\n'), sniff(s)).slice(0, -1).map((r) => r.length); if (c[0] > 1 && c.every((x) => x === c[0])) return 'csv'; } catch (e) { /* unclosed quote in the sample: not CSV */ } }
    if (/^\s*[\w"'-][^:\n]*:(\s|$)/m.test(s) || /^\s*-\s/m.test(s) || /^---/.test(s)) return 'yaml';
    return 'yaml';
  }
  function read(fmt, text, o) {
    switch (fmt) {
      case 'json': try { return JSON.parse(text); } catch (e) { throw new Error('JSON: ' + e.message); }
      case 'csv': return readTable(parseCsvRows(text, sniff(text)), o);
      case 'yaml': { const y = need('yaml'); try { return y.load(text); } catch (e) { throw new Error('YAML: ' + e.message.split('\n')[0]); } }
      case 'toml': { const t = need('toml'); try { return t.parse(text); } catch (e) { throw new Error('TOML: ' + e.message.split('\n')[0]); } }
      case 'xml': return readXml(text);
      case 'query': return readQuery(text, o);
      case 'markdown': return readMarkdown(text, o);
    }
  }
  const tomlSafe = (v) => (Array.isArray(v) ? v.map(tomlSafe) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tomlSafe(x)])) : v);
  function write(fmt, v, o) {
    const ind = o.indent === '\t' ? '\t' : +o.indent;
    switch (fmt) {
      case 'json': return JSON.stringify(v, null, ind || undefined);
      case 'csv': return writeCsv(v, o);
      case 'yaml': { const y = need('yaml'); return y.dump(v, { indent: typeof ind === 'number' && ind ? ind : 2, lineWidth: -1, noRefs: true }).trimEnd(); }
      case 'toml': {
        if (!isObj(v)) throw new Error('TOML needs an object at the top level — wrap the data in a key, e.g. {"items": [...]}.');
        if (JSON.stringify(v).includes('null')) { const hasNull = (x) => x === null || (typeof x === 'object' && Object.values(x).some(hasNull)); if (hasNull(v)) throw new Error('TOML has no null — remove or replace null values first.'); }
        const t = need('toml'); return t.stringify(tomlSafe(v));
      }
      case 'xml': return writeXml(v, { indent: o.indent === '0' ? '2' : o.indent });
      case 'query': return writeQuery(v);
      case 'markdown': return writeMarkdown(v, o);
      case 'typescript': return toTs(v, o.root);
      case 'zod': return toZod(v, o.root);
    }
  }

  let lastFrom = 'auto';
  function convert({ val, $ }) {
    const text = val('text-input'), to = val('opt-to');
    const from = val('opt-from') === 'auto' ? detect(text) : val('opt-from');
    lastFrom = from;
    const o = { indent: val('opt-indent') === 'tab' ? '\t' : val('opt-indent'), delim: val('opt-delim') === '\\t' ? '\t' : val('opt-delim'), flatten: val('opt-flatten'), types: val('opt-types'), root: (val('opt-root') || '').trim() || 'Root' };
    const data = read(from, text, o);
    const out = write(to, data, o);
    $('output-text').textContent = out;
    const lines = text.split('\n').length;
    $('input-count').textContent = `${lines.toLocaleString()} line${lines === 1 ? '' : 's'}${val('opt-from') === 'auto' ? ` · detected ${NAME[from]}` : ''}`;
    const n = Array.isArray(data) ? `${data.length} item${data.length === 1 ? '' : 's'}` : isObj(data) ? `${Object.keys(data).length} key${Object.keys(data).length === 1 ? '' : 's'}` : 'value';
    return { text: out, ext: EXT[to], mime: to === 'json' ? 'application/json' : 'text/plain;charset=utf-8', badge: `${NAME[from]} → ${NAME[to]}`, note: `Converted ${n}`, ok: true };
  }

  mount({
    slug: 'json-converter', idle: 'Paste data to begin', busyLabel: 'Loading library…',
    ready: ({ val }) => (val('text-input').trim() ? true : 'Paste data to begin'),
    summary: ({ val }) => [val('opt-indent') === 'tab' ? 'tab indent' : val('opt-indent') === '0' ? 'minified' : `${val('opt-indent')}-space indent`, { ',': 'comma', ';': 'semicolon', '\\t': 'tab', '|': 'pipe' }[val('opt-delim')], val('opt-flatten') && 'flatten'].filter(Boolean).join(' · '),
    run: (api) => {
      try { return convert(api); } catch (e) { if (e && e.need) return lib(e.need).then(() => convert(api)); throw e; }
    },
    filename: () => 'converted',
    onFile: (f, { $ }) => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const map = { json: 'json', csv: 'csv', tsv: 'csv', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml', md: 'markdown' };
      if (map[ext]) $('opt-from').value = map[ext];
    },
    onReset: ({ $ }) => { $('input-count').textContent = ''; }
  });

  const api = window.ToolityWebTool;
  api.$('btn-swap').addEventListener('click', () => {
    const from = api.$('opt-from'), to = api.$('opt-to');
    const cur = from.value === 'auto' ? lastFrom : from.value;
    const out = api.S.out && api.S.out.text;
    if (['typescript', 'zod'].includes(to.value)) return api.toast('TypeScript and Zod are output-only');
    from.value = to.value; to.value = cur;
    if (out) api.$('text-input').value = out;
    api.run();
  });
})();
