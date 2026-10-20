/* Cookie Header Decoder — Toolity.in. Pure parsing, zero network: Set-Cookie / Cookie / document.cookie / header block / HAR →
 * per-cookie attributes, decoded values (URL, Base64, JWT), expiry maths and RFC 6265bis browser-rejection checks. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/, BAD_VAL = /[\x00-\x20\x7f",;\\]/, ATTRS = ['expires', 'max-age', 'domain', 'path', 'secure', 'httponly', 'samesite', 'partitioned', 'priority'];
  const DAY = 864e5, CAP_DAYS = 400, SESSIONY = /^(__host-|__secure-)?(sess|sid|ssid|phpsessid|jsessionid|asp\.net_sessionid|connect\.sid|auth|token|jwt|access|refresh|login|csrf|xsrf|_?session|laravel_session|remember)/i;
  const bytes = (s) => new TextEncoder().encode(s).length;
  const rel = (ms) => { const a = Math.abs(ms), u = a < 36e5 ? [6e4, 'minute'] : a < DAY ? [36e5, 'hour'] : a < DAY * 60 ? [DAY, 'day'] : a < DAY * 730 ? [DAY * 30.44, 'month'] : [DAY * 365.25, 'year'], n = Math.max(1, Math.round(a / u[0])); return `${ms < 0 ? '' : 'in '}${n} ${u[1]}${n === 1 ? '' : 's'}${ms < 0 ? ' ago' : ''}`; };
  const fmtDate = (d) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  /* --- value decoding --- */
  const b64 = (s) => { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const bin = atob(s); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); } catch (e) { return null; } };
  const readable = (t) => t && t.length > 1 && (t.replace(/[^\x20-\x7e\n\r\t\u00a0-\uffff]/g, '').length / t.length) > 0.95;
  function decodeValue(v) {
    const out = [];
    if (/%[0-9a-f]{2}/i.test(v)) { try { const d = decodeURIComponent(v); if (d !== v) out.push({ kind: 'URL-decoded', text: d }); } catch (e) { /* not valid percent-encoding */ } }
    const src = out.length ? out[0].text : v;
    const jwt = src.match(/^([\w-]{8,})\.([\w-]{2,})\.([\w-]*)$/);
    if (jwt) { const h = b64(jwt[1]), p = b64(jwt[2]); try { const H = JSON.parse(h); if (H && H.alg) { const P = JSON.parse(p); ['exp', 'iat', 'nbf'].forEach((k) => { if (typeof P[k] === 'number') P[k] = `${P[k]} (${fmtDate(new Date(P[k] * 1000))}, ${rel(P[k] * 1000 - Date.now())})`; }); out.push({ kind: `JWT · ${H.alg}${jwt[3] ? '' : ' · unsigned'}`, text: JSON.stringify({ header: H, payload: P }, null, 2) }); return out; } } catch (e) { /* not a JWT */ } }
    if (/^[A-Za-z0-9+/_-]{8,}={0,2}$/.test(src) && !/^\d+$/.test(src) && !/^[a-f0-9]+$/i.test(src)) { const t = b64(src); if (readable(t)) { let text = t; try { text = JSON.stringify(JSON.parse(t), null, 2); } catch (e) { /* plain text */ } out.push({ kind: 'Base64-decoded', text }); } }
    return out;
  }

  /* --- input → list of {kind:'set'|'req', raw, source} --- */
  function splitInput(text) {
    const items = [];
    if (/^\s*\{/.test(text) && /"log"\s*:/.test(text)) { try { const har = JSON.parse(text); (har.log.entries || []).forEach((e) => { const u = e.request && e.request.url || ''; (e.response && e.response.headers || []).filter((h) => h.name.toLowerCase() === 'set-cookie').forEach((h) => h.value.split(/\r?\n/).forEach((v) => v.trim() && items.push({ kind: 'set', raw: v.trim(), source: u }))); (e.request && e.request.headers || []).filter((h) => h.name.toLowerCase() === 'cookie').forEach((h) => items.push({ kind: 'req', raw: h.value, source: u })); }); return items; } catch (e) { /* fall through to text */ } }
    text.split(/\r?\n/).forEach((line) => {
      line = line.replace(/^\s*[-*>]\s+/, '').trim(); if (!line) return;
      let m = line.match(/^(?:set-cookie|set-cookie2)\s*:\s*(.*)$/i); if (m) return items.push({ kind: 'set', raw: m[1] });
      m = line.match(/^cookie\s*:\s*(.*)$/i); if (m) return items.push({ kind: 'req', raw: m[1] });
      m = line.match(/^document\.cookie\s*=?\s*["']?(.*?)["']?;?$/i); if (m) return items.push({ kind: 'req', raw: m[1] });
      if (/^[\w-]+\s*:\s/.test(line) || /^HTTP\/|^\w+ \S+ HTTP\//.test(line)) return; // some other header / status line
      const hasAttr = /;\s*(expires|max-age|domain|path|secure|httponly|samesite|partitioned|priority)\b/i.test(line);
      if (hasAttr) items.push({ kind: 'set', raw: line }); else if (/=/.test(line) || /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(line)) items.push({ kind: 'req', raw: line });
    });
    return items;
  }

  /* --- one Set-Cookie line --- */
  function parseSet(raw, source) {
    const parts = raw.split(';'), first = parts.shift().trim(), eq = first.indexOf('=');
    const c = { kind: 'set', raw, source, name: eq < 0 ? '' : first.slice(0, eq).trim(), value: (eq < 0 ? first : first.slice(eq + 1)).trim(), attrs: {}, unknown: [], issues: [] };
    if (/^".*"$/.test(c.value)) c.value = c.value.slice(1, -1);
    parts.forEach((p) => { const i = p.indexOf('='), k = (i < 0 ? p : p.slice(0, i)).trim().toLowerCase(), v = i < 0 ? true : p.slice(i + 1).trim(); if (!k) return; if (!ATTRS.includes(k)) return c.unknown.push(p.trim()); if (c.attrs[k] !== undefined) c.issues.push(['warn', `Attribute ${k} repeated — the last one wins`]); c.attrs[k] = v; });
    const A = c.attrs, now = Date.now();
    if (A['max-age'] !== undefined) { const n = Number(A['max-age']); if (!/^-?\d+$/.test(String(A['max-age']))) c.issues.push(['fail', `Max-Age "${A['max-age']}" is not an integer — ignored by browsers`]); else { c.expiresAt = now + n * 1000; c.expirySource = 'Max-Age'; } }
    if (A.expires !== undefined && A.expires !== true) { const t = Date.parse(A.expires); if (isNaN(t)) c.issues.push(['warn', `Expires "${A.expires}" is not a parsable HTTP date — browsers treat the cookie as session`]); else if (c.expiresAt === undefined) { c.expiresAt = t; c.expirySource = 'Expires'; } else c.issues.push(['info', 'Both Max-Age and Expires set — Max-Age wins']); }
    return c;
  }
  function parseReq(raw, source) { return raw.split(';').map((s) => s.trim()).filter(Boolean).map((pair) => { const eq = pair.indexOf('='); let value = (eq < 0 ? '' : pair.slice(eq + 1)).trim(); if (/^".*"$/.test(value)) value = value.slice(1, -1); return { kind: 'req', raw: pair, source, name: eq < 0 ? pair : pair.slice(0, eq).trim(), value, attrs: {}, unknown: [], issues: [] }; }); }

  /* --- checks (RFC 6265bis + Chrome/Firefox/Safari behaviour, Oct 2026) --- */
  function check(c, ctx) {
    const I = c.issues, A = c.attrs, has = (k) => A[k] !== undefined, secure = has('secure'), name = c.name, lname = name.toLowerCase();
    if (!name) I.push(['warn', 'No name — nameless cookies are accepted by most browsers but easy to lose']);
    else if (!TOKEN.test(name)) I.push(['fail', 'Name contains characters outside the token set (spaces, =, ;, quotes…) — rejected']);
    if (BAD_VAL.test(c.value)) I.push(['fail', 'Value contains a control character, space, comma, semicolon, quote or backslash — browsers drop or truncate it']);
    c.size = bytes(name) + bytes(c.value);
    if (c.size > 4096) I.push(['fail', `Name + value is ${c.size} bytes — over the 4096-byte limit, the cookie is dropped`]); else if (c.size > 3072) I.push(['warn', `Name + value is ${c.size} bytes — close to the 4096-byte limit`]);
    if (c.kind === 'req') { if (/^__(host|secure)-/i.test(name) && !ctx.https) I.push(['fail', `${name.match(/^__\w+-/i)[0]} cookies exist only on HTTPS — this request cannot carry one`]); return c; }
    if (A.samesite !== undefined) { const ss = String(A.samesite).toLowerCase(); if (!['strict', 'lax', 'none'].includes(ss)) I.push(['warn', `SameSite=${A.samesite} is not Strict / Lax / None — treated as unspecified (Lax by default in Chrome)`]); else if (ss === 'none' && !secure) I.push(['fail', 'SameSite=None without Secure — Chrome, Firefox and Safari reject the cookie']); }
    else I.push(['info', 'No SameSite — Chrome applies Lax by default; set it explicitly']);
    if (/^__host-/i.test(name)) { if (!secure) I.push(['fail', '__Host- prefix requires Secure — rejected']); if (A.path !== '/') I.push(['fail', '__Host- prefix requires Path=/ — rejected']); if (has('domain')) I.push(['fail', '__Host- prefix forbids a Domain attribute — rejected']); }
    else if (/^__secure-/i.test(name) && !secure) I.push(['fail', '__Secure- prefix requires Secure — rejected']);
    if (!secure) I.push([ctx.https ? 'warn' : 'info', ctx.https ? 'No Secure flag — the cookie is also sent over plain HTTP' : 'No Secure flag (fine for an http:// page, but add it before going live on HTTPS)']);
    else if (!ctx.https) I.push(['fail', 'Secure cookie set from an http:// page — browsers ignore it (except on localhost)']);
    if (!has('httponly') && SESSIONY.test(lname)) I.push(['warn', 'Looks like a session / auth cookie without HttpOnly — readable by any script (XSS exposure)']);
    if (has('domain') && A.domain !== true) { const d = String(A.domain); if (/^https?:\/\/|:\d+$/i.test(d)) I.push(['fail', `Domain "${d}" contains a scheme or port — rejected`]); else if (/^(com|net|org|co\.uk|github\.io|localhost)$/i.test(d.replace(/^\./, ''))) I.push(['fail', `Domain "${d}" is a public suffix — rejected`]); else if (!/^\.?[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d) && !/^\.?localhost$/i.test(d)) I.push(['warn', `Domain "${d}" does not look like a registrable host name`]); }
    if (has('path') && A.path !== true && !String(A.path).startsWith('/')) I.push(['warn', `Path "${A.path}" does not start with / — browsers fall back to the default path`]);
    if (!has('path')) I.push(['info', 'No Path — defaults to the directory of the request URL, not /']);
    if (has('partitioned')) { if (!secure) I.push(['fail', 'Partitioned requires Secure — rejected']); if (String(A.samesite || '').toLowerCase() !== 'none') I.push(['warn', 'Partitioned cookies are meant for cross-site use — pair with SameSite=None']); }
    if (has('priority') && !['low', 'medium', 'high'].includes(String(A.priority).toLowerCase())) I.push(['warn', `Priority "${A.priority}" is not Low / Medium / High`]);
    c.unknown.forEach((u) => I.push(['info', `Unknown attribute "${u}" — ignored by browsers`]));
    if (c.expiresAt !== undefined) { const left = c.expiresAt - Date.now(); if (left <= 0) I.push(['info', `Expiry is in the past (${rel(left)}) — this deletes the cookie`]); else if (left > CAP_DAYS * DAY) I.push(['warn', `Expires ${rel(left)} — Chrome and Safari clamp to ${CAP_DAYS} days`]); }
    if (ctx.cross) { const ss = String(A.samesite || 'lax').toLowerCase(); if (ss !== 'none') I.push(['warn', `SameSite=${A.samesite === undefined ? 'Lax (default)' : A.samesite} — not sent in cross-site requests (embeds, third-party calls)`]); else if (!has('partitioned')) I.push(['info', 'Unpartitioned third-party cookie — blocked by Safari and Firefox, restricted in Chrome; consider Partitioned']); }
    return c;
  }

  function analyse(text, ctx) {
    const items = splitInput(text), cookies = [];
    items.forEach((it) => it.kind === 'set' ? cookies.push(parseSet(it.raw, it.source)) : cookies.push(...parseReq(it.raw, it.source)));
    cookies.forEach((c) => check(c, ctx));
    const seen = {}; cookies.forEach((c) => { const k = `${c.kind}:${c.name}:${c.attrs.domain || ''}:${c.attrs.path || ''}`; if (seen[k]) c.issues.push(['info', `Duplicate of an earlier ${c.kind === 'set' ? 'Set-Cookie' : 'cookie'} with the same name${c.kind === 'set' ? ', domain and path' : ''} — the later one overwrites`]); seen[k] = true; });
    const reqTotal = cookies.filter((c) => c.kind === 'req').reduce((a, c) => a + c.size + 2, 0);
    const global = []; if (reqTotal > 8192) global.push(['warn', `Cookie header is ~${reqTotal} bytes — many servers reject headers over 8 KB`]);
    const reqNames = cookies.filter((c) => c.kind === 'req').length; if (reqNames > 50) global.push(['warn', `${reqNames} cookies in one request — Chrome keeps at most 180 per domain, but every one travels with every request`]);
    cookies.forEach((c) => { c.decoded = ctx.decode ? decodeValue(c.value) : []; });
    return { cookies, global, counts: { set: cookies.filter((c) => c.kind === 'set').length, req: reqNames, fail: cookies.reduce((a, c) => a + c.issues.filter((i) => i[0] === 'fail').length, 0), warn: cookies.reduce((a, c) => a + c.issues.filter((i) => i[0] === 'warn').length, 0) + global.filter((i) => i[0] === 'warn').length } };
  }

  /* --- render --- */
  const chip = (k, v, cls = '') => `<span class="web-tag ${cls}">${esc(k)}${v === true || v === undefined ? '' : `<b>${esc(v)}</b>`}</span>`;
  function expiryText(c) { if (c.expiresAt === undefined) return chip('Session', undefined, 'ck-chip-expiry'); const left = c.expiresAt - Date.now(); return chip(c.expirySource, `${fmtDate(new Date(c.expiresAt))} · ${rel(left)}`, left <= 0 ? 'fail' : 'ck-chip-expiry'); }
  function card(c, i) {
    const A = c.attrs, worst = c.issues.some((x) => x[0] === 'fail') ? 'fail' : c.issues.some((x) => x[0] === 'warn') ? 'warn' : 'pass';
    const flags = ['secure', 'httponly', 'partitioned'].map((k) => chip(k === 'httponly' ? 'HttpOnly' : k[0].toUpperCase() + k.slice(1), undefined, A[k] !== undefined ? 'pass' : 'ck-chip-off')).join('');
    const attrs = c.kind === 'set' ? [A.domain !== undefined ? chip('Domain', A.domain) : '', A.path !== undefined ? chip('Path', A.path) : '', expiryText(c), A.samesite !== undefined ? chip('SameSite', A.samesite) : chip('SameSite', 'unset', 'ck-chip-off'), A.priority !== undefined ? chip('Priority', A.priority) : '', flags].join('') : chip('Request cookie', undefined, 'ck-chip-expiry');
    return `<article class="ck-card is-${worst}" id="ck-${i}"><header class="ck-head"><h4 class="ck-name">${esc(c.name) || '<em>(no name)</em>'}</h4><span class="web-muted">${c.kind === 'set' ? 'Set-Cookie' : 'Cookie'} · ${c.size} B${c.source ? ` · ${esc(c.source.replace(/^https?:\/\//, '').slice(0, 60))}` : ''}</span></header><div class="ck-val"><code>${esc(c.value) || '<em>(empty)</em>'}</code></div>${c.decoded.map((d) => `<details class="ck-dec" open><summary>${esc(d.kind)}</summary><pre class="web-code">${esc(d.text)}</pre></details>`).join('')}<div class="web-tags ck-attrs">${attrs}</div>${c.issues.length ? `<ul class="ck-issues">${c.issues.map(([lvl, msg]) => `<li class="is-${lvl}">${esc(msg)}</li>`).join('')}</ul>` : ''}</article>`;
  }
  function render(r) {
    const n = r.cookies.length;
    $('ck-stats').innerHTML = [['Cookies', n], ['Set-Cookie', r.counts.set], ['Request cookies', r.counts.req], ['Rejections', r.counts.fail], ['Warnings', r.counts.warn]].map(([k, v]) => `<div class="web-stat"><span>${k}</span><strong>${v}</strong></div>`).join('');
    $('ck-issues').innerHTML = r.global.map(([lvl, msg]) => `<span class="web-tag ${lvl}">${esc(msg)}</span>`).join('');
    $('ck-list').innerHTML = r.cookies.map(card).join('');
  }
  const attrStr = (c) => c.kind === 'req' ? '—' : Object.entries(c.attrs).map(([k, v]) => v === true ? k : `${k}=${v}`).join('; ') || '—';
  const md = (r) => `# Cookie report\n\n${r.cookies.length} cookies · ${r.counts.fail} rejections · ${r.counts.warn} warnings\n\n| # | Name | Kind | Size | Attributes | Expires | Issues |\n|---|---|---|---|---|---|---|\n${r.cookies.map((c, i) => `| ${i + 1} | \`${c.name}\` | ${c.kind === 'set' ? 'Set-Cookie' : 'Cookie'} | ${c.size} B | ${attrStr(c)} | ${c.kind === 'req' ? '—' : c.expiresAt === undefined ? 'session' : `${fmtDate(new Date(c.expiresAt))} (${rel(c.expiresAt - Date.now())})`} | ${c.issues.map(([l, m]) => `**${l}**: ${m}`).join('<br>') || '—'} |`).join('\n')}\n${r.global.length ? `\n${r.global.map(([l, m]) => `- **${l}**: ${m}`).join('\n')}\n` : ''}\n_Decoded with toolity.in/dev/cookie-header-decoder — nothing left the browser._\n`;
  const csvCell = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = (r) => ['name,kind,value,size_bytes,domain,path,expires_utc,max_age,secure,httponly,samesite,partitioned,priority,issues'].concat(r.cookies.map((c) => [c.name, c.kind, c.value, c.size, c.attrs.domain || '', c.attrs.path || '', c.expiresAt === undefined ? '' : new Date(c.expiresAt).toISOString(), c.attrs['max-age'] || '', c.attrs.secure !== undefined, c.attrs.httponly !== undefined, c.attrs.samesite || '', c.attrs.partitioned !== undefined, c.attrs.priority || '', c.issues.map((i) => `${i[0]}: ${i[1]}`).join(' | ')].map(csvCell).join(','))).join('\n');
  const json = (r) => JSON.stringify(r.cookies.map((c) => ({ name: c.name, kind: c.kind, value: c.value, decoded: c.decoded, sizeBytes: c.size, attributes: c.attrs, expiresAt: c.expiresAt === undefined ? null : new Date(c.expiresAt).toISOString(), source: c.source || null, issues: c.issues.map(([level, message]) => ({ level, message })) })), null, 2);

  let last = null;
  mount({
    slug: 'cookie-header-decoder', debounce: 200,
    ready: (api) => (api.val('text-input') || '').trim() ? true : 'Paste a Set-Cookie or Cookie header',
    summary: ({ val }) => `${val('opt-context') === 'cross' ? 'Cross-site request' : 'Same-site request'} · ${val('opt-https') ? 'https' : 'http'} page · ${val('opt-decode') ? 'decode values' : 'raw values'}`,
    run(api) {
      const r = analyse(api.val('text-input'), { cross: api.val('opt-context') === 'cross', https: api.val('opt-https'), decode: api.val('opt-decode') });
      if (!r.cookies.length) throw new Error('No cookies found — paste Set-Cookie: or Cookie: lines, or a name=value; name2=value2 string.');
      last = r; render(r);
      const n = r.cookies.length;
      return { text: md(r), ext: 'md', mime: 'text/markdown', badge: `${n} cookie${n === 1 ? '' : 's'}`, note: r.counts.fail ? `${r.counts.fail} would be rejected by browsers` : r.counts.warn ? `${r.counts.warn} warning${r.counts.warn === 1 ? '' : 's'}` : '✓ All cookies look healthy', ok: !r.counts.fail, copyMsg: 'Report copied' };
    },
    download(fmt) { if (!last) return null; if (fmt === 'json') return { text: json(last), mime: 'application/json', ext: 'json' }; if (fmt === 'csv') return { text: csv(last), mime: 'text/csv', ext: 'csv' }; return { text: md(last), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'cookies',
    onReset() { last = null; ['ck-stats', 'ck-issues', 'ck-list'].forEach((id) => { $(id).innerHTML = ''; }); }
  });
  window.__ck = { analyse, decodeValue, splitInput, get last() { return last; } };
})();
