/* Designed by Kapil Pidhwani: Config Converter. Every source parses to a plain object: flat formats (.env, export, properties,
 * compose environment, ConfigMap data) give { KEY: "string" }, nested formats (JSON, YAML, TOML, INI) give trees. Going to
 * a nested target un-flattens keys on the chosen separator (A__B or A.B) and types values; going to a flat target flattens
 * the tree with the same separator and stringifies leaves (objects as JSON). YAML/TOML use the same pinned libraries as
 * JSON Converter, loaded on first use. Ceilings: comments are dropped (most targets have nowhere to keep them); INI has no
 * nesting beyond one [section]; compose output is the map form of environment:. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const LIB = { yaml: 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs', toml: 'https://cdn.jsdelivr.net/npm/smol-toml@1.3.4/+esm' };
  const libs = {}, loaded = {};
  const lib = (k) => (libs[k] = libs[k] || import(LIB[k]).then((m) => (loaded[k] = m.default && m.default.load ? m.default : m)).catch(() => { delete libs[k]; throw new Error(`Couldn't load the ${k.toUpperCase()} library — check your connection and try again.`); }));
  const NAME = { env: '.env', json: 'JSON', yaml: 'YAML', toml: 'TOML', ini: 'INI', properties: '.properties', export: 'shell export', compose: 'compose environment', configmap: 'ConfigMap' };
  const EXT = { env: '.env', json: 'config.json', yaml: 'config.yaml', toml: 'config.toml', ini: 'config.ini', properties: 'application.properties', export: 'env.sh', compose: 'compose.env.yaml', configmap: 'configmap.yaml' };
  const FLAT = new Set(['env', 'export', 'properties', 'compose', 'configmap']);
  const SECRET = /(secret|token|passw|api[_-]?key|private|credential|auth)/i;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function detect(t) {
    const s = t.trim();
    if (/^[[{]/.test(s)) { try { JSON.parse(s); return 'json'; } catch (e) { /* not JSON */ } }
    if (/^\s*(apiVersion|kind):/m.test(s) && /^\s*data:/m.test(s)) return 'configmap';
    if (/^\s*environment:\s*$/m.test(s) || (/^\s*services:/m.test(s) && /environment/.test(s))) return 'compose';
    if (/^\s*export\s+[A-Za-z_]/m.test(s)) return 'export';
    if (/^\s*\[[\w.\- "]+\]\s*$/m.test(s)) return /^\s*[\w.-]+\s*=\s*(".*"|'.*'|\d|true|false|\[|\{)/m.test(s) && !/^\s*[\w.-]+\s*=\s*(?!["'\d\[{]|true\b|false\b)\S/m.test(s) ? 'toml' : 'ini';
    if (/^\s*[\w.-]+\s*=\s*(".*"|\d+(\.\d+)?|true|false|\[.*\]|\{.*\})\s*(#.*)?$/m.test(s) && /\s=\s/.test(s) && !/^[A-Z0-9_]+=/m.test(s)) return 'toml';
    if (/^[A-Za-z_][\w]*=/m.test(s) && !/^\s*[\w.-]+\s*:\s/m.test(s)) return /^[a-z][\w]*\.[\w.]+\s*[=:]/m.test(s) ? 'properties' : 'env';
    if (/^\s*[\w.-]+\s*:\s*\S/m.test(s) || /^\s*- /m.test(s)) return 'yaml';
    if (/^\s*[\w.-]+\s*[=:]\s*/m.test(s)) return 'properties';
    return 'env';
  }
  /* ── flat parsers → [{k, v}] (keeps duplicates so we can warn) ── */
  function parseEnv(t) {
    const out = [], lines = t.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].trim(); if (!l || l.startsWith('#')) continue;
      l = l.replace(/^export\s+/, '');
      const m = /^([\w.-]+)\s*=\s*(.*)$/.exec(l); if (!m) continue;
      let v = m[2];
      if (v.startsWith('"')) { while (!/[^\\]"\s*(#.*)?$/.test(v) && v !== '"' && i + 1 < lines.length) v += '\n' + lines[++i]; v = v.replace(/^"([\s\S]*?)"\s*(#.*)?$/, '$1').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
      else if (v.startsWith("'")) v = v.replace(/^'([\s\S]*?)'\s*(#.*)?$/, '$1');
      else v = v.replace(/\s+#.*$/, '').trim();
      out.push({ k: m[1], v });
    }
    return out;
  }
  function parseProps(t) {
    const out = [], lines = t.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].replace(/^\s+/, ''); if (!l || /^[#!]/.test(l)) continue;
      while (/\\$/.test(l) && i + 1 < lines.length) l = l.slice(0, -1) + lines[++i].replace(/^\s+/, '');
      const m = /^((?:\\.|[^\s=:])+)\s*[=:]?\s*(.*)$/.exec(l); if (!m) continue;
      const un = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r' }[c] || c));
      out.push({ k: un(m[1]), v: un(m[2]) });
    }
    return out;
  }
  function parseIni(t) {
    const o = {}, dups = []; let sec = null;
    for (const raw of t.replace(/\r/g, '').split('\n')) {
      const l = raw.trim(); if (!l || /^[#;]/.test(l)) continue;
      const s = /^\[(.+)\]$/.exec(l); if (s) { sec = s[1].trim(); o[sec] = o[sec] || {}; continue; }
      const m = /^([^=:]+?)\s*[=:]\s*(.*)$/.exec(l); if (!m) continue;
      const tgt = sec ? o[sec] : o, k = m[1].trim(), v = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').replace(/\s+[;#].*$/, '');
      if (k in tgt) dups.push((sec ? sec + '.' : '') + k); tgt[k] = v;
    }
    return { obj: o, dups };
  }
  const fromPairs = (pairs) => { const o = {}, dups = []; for (const { k, v } of pairs) { if (k in o) dups.push(k); o[k] = v; } return { obj: o, dups }; };
  const envFromAny = (env) => (Array.isArray(env) ? fromPairs(env.map((l) => { const i = String(l).indexOf('='); return i < 0 ? { k: String(l), v: '' } : { k: String(l).slice(0, i), v: String(l).slice(i + 1) }; })) : { obj: Object.fromEntries(Object.entries(env || {}).map(([k, v]) => [k, v == null ? '' : String(v)])), dups: [] });
  async function parse(text, fmt) {
    if (fmt === 'json') return { obj: JSON.parse(text), dups: [] };
    if (fmt === 'yaml') return { obj: (await lib('yaml')).load(text) || {}, dups: [] };
    if (fmt === 'toml') return { obj: (await lib('toml')).parse(text), dups: [] };
    if (fmt === 'ini') return parseIni(text);
    if (fmt === 'properties') return fromPairs(parseProps(text));
    if (fmt === 'env' || fmt === 'export') return fromPairs(parseEnv(text));
    const y = (await lib('yaml')).load(text) || {};
    if (fmt === 'compose') { const found = []; const walk = (n) => { if (!n || typeof n !== 'object') return; if (n.environment) found.push(n.environment); for (const v of Object.values(n)) if (v && typeof v === 'object' && !Array.isArray(v)) walk(v); }; walk(y); if (Array.isArray(y) || (!found.length && (y.environment || !('services' in y)))) found.push(y.environment || y); const r = { obj: {}, dups: [] }; for (const e of found) { const p = envFromAny(e); Object.assign(r.obj, p.obj); r.dups.push(...p.dups); } return r; }
    const data = Object.assign({}, y.data || {}, y.stringData || {}), b64 = /secret/i.test(y.kind || '') && y.data;
    return { obj: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, b64 && k in (y.data || {}) ? (() => { try { return decodeURIComponent(escape(atob(String(v)))); } catch (e) { return String(v); } })() : String(v)])), dups: [] };
  }
  /* ── shape helpers ── */
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const flatten = (o, sep, pre = '', out = {}) => { for (const [k, v] of Object.entries(o || {})) { const key = pre ? pre + sep + k : k; if (isObj(v) && Object.keys(v).length) flatten(v, sep, key, out); else out[key] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); } return out; };
  const unflatten = (o, sep) => { const r = {}; for (const [k, v] of Object.entries(o)) { const parts = sep ? k.split(sep) : [k]; let t = r; parts.forEach((p, i) => { if (i === parts.length - 1) t[p] = v; else { if (!isObj(t[p])) t[p] = {}; t = t[p]; } }); } return r; };
  const typed = (v) => (typeof v !== 'string' ? v : v === 'true' ? true : v === 'false' ? false : v === 'null' ? null : /^-?\d+$/.test(v) && v.length < 16 && !/^0\d/.test(v) ? +v : /^-?\d+\.\d+$/.test(v) ? +v : v);
  const mapLeaves = (o, f) => (isObj(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, mapLeaves(v, f)])) : Array.isArray(o) ? o.map((x) => mapLeaves(x, f)) : f(o));
  const upperSnake = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-.\s]+/g, '_').toUpperCase();
  const needsQuote = (v) => v === '' || /[\s#$"'\\`]|^[=]/.test(v) || v !== v.trim();
  const envQuote = (v) => '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\$/g, '\\$') + '"';
  const propEsc = (s, key) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(key ? /([=:# !])/g : /^ /, '\\$1');
  /* ── emitters ── */
  async function emit(fmt, obj, flat, j, issues) {
    if (fmt === 'json') return JSON.stringify(obj, null, 2) + '\n';
    if (fmt === 'yaml') return (await lib('yaml')).dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
    if (fmt === 'toml') return (await lib('toml')).stringify(obj) + '\n';
    if (fmt === 'ini') { const top = [], secs = []; for (const [k, v] of Object.entries(obj || {})) { if (isObj(v)) secs.push(`[${k}]\n${Object.entries(flatten(v, '.')).map(([a, b]) => `${a} = ${b}`).join('\n')}`); else top.push(`${k} = ${v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v}`); } return [top.join('\n'), ...secs].filter(Boolean).join('\n\n') + '\n'; }
    const keys = Object.keys(flat);
    if (fmt === 'env' || fmt === 'export') { let q = 0; const lines = keys.map((k) => { const v = flat[k], quote = j.quote ? needsQuote(v) : true; if (quote && j.quote) q++; return `${fmt === 'export' ? 'export ' : ''}${k}=${quote ? envQuote(v) : v}`; }); if (q) issues.push(['pass', `${q} value${q === 1 ? '' : 's'} quoted`]); return lines.join('\n') + '\n'; }
    if (fmt === 'properties') return keys.map((k) => `${propEsc(k, true)}=${propEsc(flat[k])}`).join('\n') + '\n';
    const y = await lib('yaml');
    if (fmt === 'compose') return y.dump({ environment: flat }, { lineWidth: -1, quotingType: '"', forceQuotes: true });
    const secret = j.secret, data = secret ? Object.fromEntries(keys.map((k) => [k, btoa(unescape(encodeURIComponent(flat[k])))])) : flat;
    return y.dump({ apiVersion: 'v1', kind: secret ? 'Secret' : 'ConfigMap', metadata: { name: secret ? 'app-secret' : 'app-config' }, ...(secret ? { type: 'Opaque' } : {}), data }, { lineWidth: -1, quotingType: '"', forceQuotes: true });
  }
  async function convert(j) {
    const from = j.from === 'auto' ? detect(j.text) : j.from, issues = [], sep = j.nest === 'none' ? null : j.nest;
    const { obj: src, dups } = await parse(j.text, from);
    if (dups.length) issues.push(['warn', `Duplicate key${dups.length === 1 ? '' : 's'} — last one wins: ${[...new Set(dups)].slice(0, 5).join(', ')}`]);
    let obj = src, flat = null;
    if (FLAT.has(j.to)) {
      flat = FLAT.has(from) ? Object.fromEntries(Object.entries(src).map(([k, v]) => [k, String(v)])) : flatten(src, sep || '__');
      if (j.case === 'upper' && j.to !== 'properties' && j.to !== 'configmap') flat = Object.fromEntries(Object.entries(flat).map(([k, v]) => [sep ? k.split(sep).map(upperSnake).join(sep) : upperSnake(k), v])); // per segment, so the A.B rule keeps its dots
      const bad = Object.keys(flat).filter((k) => (j.to === 'configmap' ? !/^[-._a-zA-Z0-9]+$/.test(k) : !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)));
      if (bad.length) issues.push(['fail', `Invalid key${bad.length === 1 ? '' : 's'} for ${NAME[j.to]}: ${bad.slice(0, 4).join(', ')}`]);
    } else {
      obj = FLAT.has(from) ? unflatten(src, sep) : src;
      if (j.types) obj = mapLeaves(obj, typed);
      if (!isObj(obj)) throw new Error(`${NAME[from]} input is not a key/value document.`);
    }
    const secrets = Object.keys(flat || flatten(obj, '.')).filter((k) => SECRET.test(k));
    if (secrets.length) issues.push(['warn', `Looks like secrets (${secrets.slice(0, 3).join(', ')}) — never paste real credentials into any online tool`]);
    const out = await emit(j.to, obj, flat, j, issues);
    const n = Object.keys(flat || flatten(obj, '.')).length;
    return { out, from, n, issues };
  }

  const job = (val) => ({ text: val('text-input'), from: val('opt-from'), to: val('opt-to'), nest: val('opt-nest'), case: val('opt-case'), types: val('opt-types'), quote: val('opt-quote'), secret: val('opt-secret') });
  let cache = { key: null }, pending = null;
  const api = mount({
    slug: 'config-converter', debounce: 250,
    ready: ({ val }) => (val('text-input').trim() ? true : 'Paste a config to begin'),
    summary: ({ val }) => [{ __: 'Nest on __', '.': 'Nest on dots', none: 'No nesting' }[val('opt-nest')], val('opt-types') ? 'typed values' : 'strings only', val('opt-quote') ? 'quote when needed' : 'always quote', val('opt-secret') ? 'Secret (base64)' : null].filter(Boolean).join(' · '),
    run: ({ val, $, S, status }) => {
      const j = job(val), key = JSON.stringify(j), nl = j.text.split('\n').length;
      $('input-count').textContent = `${nl.toLocaleString()} line${nl === 1 ? '' : 's'}`;
      if (cache.key === key) {
        if (cache.err) throw cache.err;
        const r = cache.res; $('output-text').textContent = r.out;
        $('output-issues').innerHTML = (r.issues.length ? r.issues : [['pass', `${r.n} key${r.n === 1 ? '' : 's'} converted`]]).map(([k, s]) => `<span class="web-tag ${k}">${esc(s)}</span>`).join('');
        return { text: r.out, ext: EXT[j.to].split('.').pop(), badge: `${r.n} key${r.n === 1 ? '' : 's'}`, note: `${j.from === 'auto' ? 'Detected ' : ''}${NAME[r.from]} → ${NAME[j.to]}`, ok: !r.issues.some((i) => i[0] === 'fail'), copyMsg: `${NAME[j.to]} copied` };
      }
      if (pending !== key) { pending = key; convert(j).then((res) => { cache = { key, res }; }, (err) => { cache = { key, err: new Error(err.message || String(err)) }; }).finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } }); }
      status('Converting…'); return S.out ? Object.assign({}, S.out, { note: 'Converting…' }) : null;
    },
    download: (fmt, { S, val }) => ({ text: S.out.text, name: EXT[val('opt-to')], mime: 'text/plain;charset=utf-8' }),
    onReset: ({ $ }) => { $('output-text').textContent = ''; $('output-issues').innerHTML = ''; $('input-count').textContent = ''; cache = { key: null }; pending = null; }
  });
  api.$('btn-swap').addEventListener('click', () => {
    const f = api.$('opt-from'), t = api.$('opt-to'), from = f.value === 'auto' ? (api.S.out ? detect(api.val('text-input')) : 'env') : f.value;
    f.value = t.value; t.value = from; if (api.S.out) api.$('text-input').value = api.S.out.text; api.run();
  });
})();
