/* ads.txt Validator — Toolity.in. IAB Tech Lab ads.txt 1.1 line validation for /ads.txt and /app-ads.txt (fetch or paste),
 * publisher-ID presence check, opt-in sellers.json cross-check per ad system (fetchText direct → relay, cached per session). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { fileSource, fileUrl, fetchText, looksHtml } = window.ToolityWellKnown, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const VARS = ['CONTACT', 'SUBDOMAIN', 'INVENTORYPARTNERDOMAIN', 'OWNERDOMAIN', 'MANAGERDOMAIN'];
  const HOST = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/i;
  // Designed by Kapil Pidhwani: the only certification authority ID we assert on is Google's (constant, public, the #1 copy-paste error).
  const CERT = { 'google.com': 'f08c47fec0942fa0' };
  // sellers.json lives at the ad system's root per spec; a few publish it elsewhere.
  const SELLERS_ALIAS = { 'google.com': 'https://realtimebidding.google.com/sellers.json', 'doubleclick.net': 'https://realtimebidding.google.com/sellers.json' };
  const MAX_SYSTEMS = 12;

  /* --- parse + validate one file --- */
  function validate(text, kind = 'ads.txt') {
    const out = { kind, records: [], vars: [], issues: [], lines: 0, comments: 0, blank: 0 }, add = (lvl, msg, line) => out.issues.push({ lvl, msg, line });
    if (text.charCodeAt(0) === 0xfeff) { add('warn', 'File starts with a UTF-8 BOM — some parsers reject the first line', 1); text = text.slice(1); }
    if (looksHtml(text)) { add('fail', 'This is an HTML page, not a text file — the server is returning a web page (soft 404 or login) at this path'); return out; }
    const lines = text.split(/\r\n|\r|\n/); out.lines = lines.length;
    const seen = new Map(), rel = new Map();
    lines.forEach((raw, i) => {
      const n = i + 1; let line = raw;
      const hash = line.indexOf('#'); if (hash >= 0) { if (!line.slice(0, hash).trim()) out.comments++; line = line.slice(0, hash); }
      line = line.trim(); if (!line) { if (hash < 0) out.blank++; return; }
      if (/\t/.test(line)) add('warn', `Line ${n}: contains a tab — use commas and spaces only`, n);
      if (/[^\x20-\x7e]/.test(line)) add('warn', `Line ${n}: contains non-ASCII characters`, n);
      const vm = line.match(/^([A-Za-z]+)\s*=\s*(.*)$/);
      if (vm && !line.includes(',') || (vm && VARS.includes(vm[1].toUpperCase()))) {
        const key = vm[1].toUpperCase(), val = vm[2].trim(), v = { key, value: val, line: n, flags: [] }; out.vars.push(v);
        if (!VARS.includes(key)) { v.flags.push('unknown variable'); add('warn', `Line ${n}: unknown variable ${vm[1]} — ignored by buyers`, n); return; }
        if (key !== vm[1]) { v.flags.push('lowercase key'); add('info', `Line ${n}: write ${key} in capitals`, n); }
        if (key === 'CONTACT') { if (!val) { v.flags.push('empty'); add('warn', `Line ${n}: CONTACT is empty`, n); } }
        else if (key === 'MANAGERDOMAIN') { const [dom, cc] = val.split(',').map((s) => s.trim()); if (!HOST.test(dom || '')) { v.flags.push('bad domain'); add('fail', `Line ${n}: MANAGERDOMAIN "${dom}" is not a valid domain`, n); } if (cc !== undefined && !/^[A-Z]{2}$/.test(cc)) { v.flags.push('bad country'); add('warn', `Line ${n}: MANAGERDOMAIN country "${cc}" should be a two-letter ISO code`, n); } }
        else if (!HOST.test(val)) { v.flags.push('bad domain'); add('fail', `Line ${n}: ${key} "${val}" is not a valid domain`, n); }
        return;
      }
      const fields = line.split(',').map((s) => s.trim());
      const r = { line: n, raw: raw.trim(), domain: fields[0] || '', id: fields[1] || '', rel: fields[2] || '', cert: fields[3] || '', extra: fields.slice(4), flags: [] }; out.records.push(r);
      const F = (lvl, flag, msg) => { r.flags.push(flag); add(lvl, `Line ${n}: ${msg}`, n); if (lvl === 'fail') r.bad = true; };
      if (fields.length < 3) { F('fail', 'too few fields', `only ${fields.length} field${fields.length === 1 ? '' : 's'} — need domain, seller ID, DIRECT|RESELLER[, cert ID]`); return; }
      if (fields.length > 4 && !/;/.test(line)) F('warn', 'extra fields', `${fields.length} fields — only 4 are defined (extensions go after a semicolon)`);
      if (/["']/.test(line)) F('fail', 'quotes', 'quotes are not allowed in ads.txt');
      const d = r.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (d !== r.domain) { if (/^https?:\/\//i.test(r.domain) || /\//.test(r.domain)) F('fail', 'domain is a URL', `ad system must be a bare domain, not "${r.domain}"`); else F('info', 'uppercase domain', `domain should be lowercase (${d})`); r.domain = d; }
      if (!HOST.test(r.domain)) F('fail', 'bad domain', `"${r.domain}" is not a valid domain`);
      else if (/^www\./.test(r.domain)) F('warn', 'www prefix', `use the root domain ${r.domain.slice(4)} without www`);
      if (!r.id) F('fail', 'empty seller ID', 'seller / publisher account ID is empty');
      else if (/\s/.test(r.id)) F('fail', 'space in seller ID', `seller ID "${r.id}" contains whitespace`);
      const relU = r.rel.toUpperCase();
      if (relU !== 'DIRECT' && relU !== 'RESELLER') F('fail', 'bad relationship', `relationship must be DIRECT or RESELLER, got "${r.rel}"`);
      else if (relU !== r.rel) F('warn', 'lowercase relationship', `write ${relU} in capitals`);
      r.rel = relU === 'DIRECT' || relU === 'RESELLER' ? relU : r.rel;
      if (r.cert) { if (!/^[A-Za-z0-9]{9,16}$/.test(r.cert)) F('warn', 'odd cert ID', `certification authority ID "${r.cert}" should be 9–16 alphanumeric characters (TAG-ID)`); else if (CERT[r.domain] && CERT[r.domain] !== r.cert.toLowerCase()) F('fail', 'wrong cert ID', `${r.domain}'s certification authority ID is ${CERT[r.domain]}, not ${r.cert}`); }
      else if (CERT[r.domain]) F('info', 'no cert ID', `${r.domain} lines usually end with ${CERT[r.domain]}`);
      if (r.domain === 'google.com' && !/^pub-\d{16}$/.test(r.id)) F('warn', 'odd Google ID', `Google publisher IDs look like pub-1234567890123456, got "${r.id}"`);
      const key = `${r.domain}|${r.id.toLowerCase()}|${r.rel}`; if (seen.has(key)) F('warn', 'duplicate', `duplicate of line ${seen.get(key)}`); else seen.set(key, n);
      const rk = `${r.domain}|${r.id.toLowerCase()}`; if (rel.has(rk) && rel.get(rk) !== r.rel) F('warn', 'DIRECT + RESELLER', `same seller ID is also ${rel.get(rk)} elsewhere — pick one`); else rel.set(rk, r.rel);
    });
    const owners = out.vars.filter((v) => v.key === 'OWNERDOMAIN'); if (owners.length > 1) add('fail', `OWNERDOMAIN appears ${owners.length} times — only one is allowed`, owners[1].line);
    const mgr = {}; out.vars.filter((v) => v.key === 'MANAGERDOMAIN').forEach((v) => { const cc = (v.value.split(',')[1] || '').trim().toUpperCase() || '*'; if (mgr[cc]) add('fail', `MANAGERDOMAIN for ${cc === '*' ? 'the default market' : cc} appears more than once (lines ${mgr[cc]} and ${v.line})`, v.line); mgr[cc] = v.line; });
    if (!out.records.length && !out.issues.some((i) => i.lvl === 'fail')) add('warn', `${kind} contains no seller records`);
    const systems = new Set(out.records.map((r) => r.domain)), direct = out.records.filter((r) => r.rel === 'DIRECT').length;
    if (out.records.length && !direct) add('info', 'No DIRECT line — every seller is a RESELLER; fine for a managed site, unusual for an AdSense site');
    if (systems.size > 1 && !owners.length) add('info', 'No OWNERDOMAIN — recommended by spec 1.1 when several ad systems are listed');
    out.stats = { records: out.records.length, direct, reseller: out.records.filter((r) => r.rel === 'RESELLER').length, systems: systems.size, bad: out.records.filter((r) => r.bad).length };
    return out;
  }

  /* --- sellers.json cross-check --- */
  const sellersCache = {};
  async function sellersFor(domain) {
    if (sellersCache[domain]) return sellersCache[domain];
    const url = SELLERS_ALIAS[domain] || `https://${domain}/sellers.json`;
    const p = (async () => { try { const r = await fetchText(url, 60000); if (r.status >= 400) return { error: `HTTP ${r.status}` }; let j; try { j = JSON.parse(r.text); } catch (e) { return { error: looksHtml(r.text) ? 'returned HTML' : 'invalid JSON' }; } const map = new Map(); (j.sellers || []).forEach((s) => map.set(String(s.seller_id).toLowerCase(), s)); return { map, count: map.size, url, via: r.via, version: j.version }; } catch (e) { return { error: 'unreachable' }; } })();
    return (sellersCache[domain] = p);
  }
  async function crossCheck(api) {
    if (!last) return; const recs = last.ads.records.filter((r) => !r.bad && r.domain), systems = [...new Set(recs.map((r) => r.domain))].slice(0, MAX_SYSTEMS), btn = $('btn-sellers'); btn.disabled = true;
    let i = 0, bad = 0;
    for (const dom of systems) {
      btn.querySelector('span').textContent = `Fetching sellers.json ${++i}/${systems.length} (${dom})…`;
      const s = await sellersFor(dom);
      recs.filter((r) => r.domain === dom).forEach((r) => { if (s.error) { r.sj = { cls: 'warn', text: `sellers.json ${s.error}` }; return; } const hit = s.map.get(String(r.id).toLowerCase()); if (!hit) { r.sj = { cls: 'fail', text: `not in sellers.json (${s.count.toLocaleString()} sellers)` }; bad++; return; } const type = String(hit.seller_type || '').toUpperCase(), conf = hit.is_confidential === 1 || hit.is_confidential === true; const mismatch = (r.rel === 'DIRECT' && type === 'INTERMEDIARY') || (r.rel === 'RESELLER' && type === 'PUBLISHER'); r.sj = { cls: mismatch ? 'warn' : 'pass', text: `${conf ? 'confidential' : (hit.name || '') + (hit.domain ? ` · ${hit.domain}` : '')}${type ? ` · ${type}` : ''}${mismatch ? ` — but listed as ${r.rel}` : ''}` }; if (mismatch) bad++; });
      renderTable();
    }
    const skipped = new Set(recs.map((r) => r.domain)).size - systems.length;
    btn.querySelector('span').textContent = `Checked ${systems.length} ad system${systems.length === 1 ? '' : 's'}${skipped > 0 ? ` (${skipped} skipped)` : ''}`; btn.disabled = false;
    api.toast(bad ? `${bad} seller line${bad === 1 ? '' : 's'} need attention` : 'All seller IDs found in sellers.json');
  }

  /* --- render --- */
  let last = null;
  const chip = (lvl, t) => `<span class="web-tag ${lvl === 'info' ? '' : lvl}">${esc(t)}</span>`;
  function renderTable() {
    const recs = last.ads.records, hasSj = recs.some((r) => r.sj); $('ad-table').querySelector('.ad-col-sj').hidden = !hasSj;
    $('ad-table').querySelector('tbody').innerHTML = recs.map((r) => `<tr class="${r.bad ? 'is-fail' : r.flags.length ? 'is-warn' : ''}"><td>${r.line}</td><td>${esc(r.domain)}</td><td>${esc(r.id)}</td><td>${esc(r.rel)}</td><td>${esc(r.cert) || '—'}</td><td class="ad-flags">${r.flags.map((f) => `<i class="web-tag ${r.bad && /too few|quotes|URL|bad|empty|space|wrong/.test(f) ? 'fail' : /duplicate|DIRECT|www|odd|extra|lowercase/.test(f) ? 'warn' : ''}">${esc(f)}</i>`).join('') || '✓'}</td><td class="ad-col-sj${r.sj ? ` is-${r.sj.cls}` : ''}"${hasSj ? '' : ' hidden'}>${r.sj ? esc(r.sj.text) : ''}</td></tr>`).join('');
  }
  function render(r) {
    const a = r.ads, fails = a.issues.filter((i) => i.lvl === 'fail').length, warns = a.issues.filter((i) => i.lvl === 'warn').length;
    $('ad-stats').innerHTML = [['Records', a.stats.records], ['DIRECT', a.stats.direct], ['RESELLER', a.stats.reseller], ['Ad systems', a.stats.systems], ['Errors', fails], ['Warnings', warns], ['Served as', r.src.via === 'pasted' ? 'pasted' : `${r.src.status}${r.src.type ? ` · ${r.src.type.split(';')[0]}` : ''}`]].map(([k, v]) => `<div class="web-stat"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
    const srcIssues = []; if (r.src.via !== 'pasted') { if (r.src.type && !/text\/plain/i.test(r.src.type)) srcIssues.push({ lvl: 'warn', msg: `Served as ${r.src.type.split(';')[0]} — the spec wants text/plain` }); if (r.src.finalUrl && r.src.url && new URL(r.src.finalUrl).host !== new URL(r.src.url).host) srcIssues.push({ lvl: 'warn', msg: `Redirected to ${new URL(r.src.finalUrl).host} — cross-domain redirects are only allowed once and may be ignored` }); }
    $('ad-issues').innerHTML = [...srcIssues, ...a.issues].map((i) => chip(i.lvl, i.msg)).join('');
    $('ad-pub').innerHTML = r.pub ? (r.pubHits.length ? chip('pass', `${r.pub} found on line${r.pubHits.length === 1 ? '' : 's'} ${r.pubHits.map((x) => x.line).join(', ')} (${[...new Set(r.pubHits.map((x) => `${x.domain} ${x.rel}`))].join(', ')})`) : chip('fail', `${r.pub} is NOT in this ads.txt — add: google.com, ${r.pub}, DIRECT, f08c47fec0942fa0`)) : '';
    renderTable();
    $('ad-vars').innerHTML = a.vars.length ? `<div class="web-group-head"><span>Variables</span></div><div class="web-tags">${a.vars.map((v) => chip(v.flags.some((f) => /bad|unknown|empty/.test(f)) ? 'fail' : v.flags.length ? 'warn' : 'pass', `${v.key}=${v.value}`)).join('')}</div>` : '';
    const app = r.app; $('ad-app').innerHTML = app ? `<div class="web-group-head"><span>app-ads.txt</span><span class="web-muted">${app.missing ? `HTTP ${app.status} — not present (normal for a website without apps)` : `${app.v.stats.records} records · ${app.v.issues.filter((i) => i.lvl === 'fail').length} errors`}</span></div>${app.missing ? '' : `<div class="web-tags">${app.v.issues.slice(0, 12).map((i) => chip(i.lvl, i.msg)).join('') || chip('pass', 'app-ads.txt is valid')}</div>`}` : '';
    $('btn-sellers').disabled = !a.records.some((x) => !x.bad); $('btn-sellers').querySelector('span').textContent = 'Cross-check with sellers.json';
    $('ad-raw').textContent = r.src.text.slice(0, 200000);
  }
  const cleaned = (a) => { const seen = new Set(); return [...a.vars.filter((v) => VARS.includes(v.key)).map((v) => `${v.key}=${v.value}`), ...a.records.filter((r) => !r.bad).map((r) => [r.domain, r.id, r.rel, r.cert.toLowerCase()].filter(Boolean).join(', ')).filter((l) => !seen.has(l) && seen.add(l))].join('\n') + '\n'; };
  const md = (r) => `# ads.txt validation — ${r.src.url || 'pasted file'}\n\n${r.ads.stats.records} records · ${r.ads.stats.direct} DIRECT · ${r.ads.stats.reseller} RESELLER · ${r.ads.stats.systems} ad systems · ${r.ads.issues.filter((i) => i.lvl === 'fail').length} errors\n${r.pub ? `\nPublisher ID ${r.pub}: **${r.pubHits.length ? 'present' : 'MISSING'}**\n` : ''}\n| Line | Ad system | Seller ID | Rel. | Cert | Issues${r.ads.records.some((x) => x.sj) ? ' | sellers.json' : ''} |\n|---|---|---|---|---|---|${r.ads.records.some((x) => x.sj) ? '---|' : ''}\n${r.ads.records.map((x) => `| ${x.line} | ${x.domain} | ${x.id} | ${x.rel} | ${x.cert || '—'} | ${x.flags.join(', ') || '✓'}${r.ads.records.some((y) => y.sj) ? ` | ${x.sj ? x.sj.text : ''}` : ''} |`).join('\n')}\n${r.ads.issues.length ? `\n## Issues\n\n${r.ads.issues.map((i) => `- **${i.lvl}**: ${i.msg}`).join('\n')}\n` : ''}${r.app ? `\n## app-ads.txt\n\n${r.app.missing ? `Not present (HTTP ${r.app.status}).` : `${r.app.v.stats.records} records, ${r.app.v.issues.filter((i) => i.lvl === 'fail').length} errors.`}\n` : ''}\n_Validated with toolity.in/labs/ads-txt-validator._\n`;
  const csv = (r) => ['line,ad_system,seller_id,relationship,cert_id,issues,sellers_json'].concat(r.ads.records.map((x) => [x.line, x.domain, x.id, x.rel, x.cert, x.flags.join(' | '), x.sj ? x.sj.text : ''].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','))).join('\n');

  mount({
    slug: 'ads-txt-validator', debounce: 300, busyLabel: 'Fetching ads.txt…',
    ready: (api) => fileSource.ready(api, 'Validate', '/ads.txt'),
    summary: ({ val }) => val('opt-app') ? 'Also checks app-ads.txt' : 'ads.txt only',
    async run(api) {
      const src = await fileSource.load(api, '/ads.txt');
      if (src.via !== 'pasted' && src.status >= 400) throw new Error(`${src.url} returned HTTP ${src.status} — there is no ads.txt at the root of this host. ${src.status === 404 ? 'Upload one; AdSense needs it exactly at /ads.txt.' : ''}`);
      const ads = validate(src.text, 'ads.txt'), pub = (api.val('ad-pubid') || '').trim().toLowerCase();
      const pubHits = pub ? ads.records.filter((x) => x.id.toLowerCase() === pub) : [];
      let app = null;
      if (api.val('opt-app') && src.via !== 'pasted' && src.origin) { api.status('Fetching app-ads.txt…'); try { const u = fileUrl(src.origin, '/app-ads.txt'); const r = await fetchText(u.href, 12000); app = r.status >= 400 || looksHtml(r.text) ? { missing: true, status: r.status } : { v: validate(r.text, 'app-ads.txt'), status: r.status }; } catch (e) { app = { missing: true, status: '—' }; } }
      last = { src, ads, pub, pubHits, app }; render(last);
      const fails = ads.issues.filter((i) => i.lvl === 'fail').length, warns = ads.issues.filter((i) => i.lvl === 'warn').length;
      return { text: md(last), ext: 'md', mime: 'text/markdown', badge: `${ads.stats.records} record${ads.stats.records === 1 ? '' : 's'}`, note: pub && !pubHits.length ? `${pub} missing` : fails ? `${fails} invalid line${fails === 1 ? '' : 's'}` : warns ? `${warns} warning${warns === 1 ? '' : 's'}` : '✓ ads.txt is valid', ok: !fails && !(pub && !pubHits.length), copyMsg: 'Report copied' };
    },
    download(fmt) { if (!last) return null; if (fmt === 'csv') return { text: csv(last), mime: 'text/csv', ext: 'csv' }; if (fmt === 'clean') return { text: cleaned(last.ads), mime: 'text/plain', ext: 'txt', name: 'ads.txt' }; if (fmt === 'json') return { text: JSON.stringify({ url: last.src.url, status: last.src.status, stats: last.ads.stats, records: last.ads.records.map((x) => ({ line: x.line, domain: x.domain, id: x.id, relationship: x.rel, cert: x.cert, flags: x.flags, sellersJson: x.sj || null })), variables: last.ads.vars, issues: last.ads.issues, publisherId: last.pub ? { id: last.pub, found: last.pubHits.length > 0 } : null, appAds: last.app }, null, 2), mime: 'application/json', ext: 'json' }; return { text: md(last), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'ads-txt-validation',
    onReset(api) { last = null; api.S.file = null; ['ad-stats', 'ad-issues', 'ad-pub', 'ad-vars', 'ad-app'].forEach((id) => { $(id).innerHTML = ''; }); $('ad-table').querySelector('tbody').innerHTML = ''; $('ad-raw').textContent = ''; }
  });
  $('btn-sellers').addEventListener('click', () => crossCheck(window.ToolityWebTool));
  window.__ad = { validate, cleaned, get last() { return last; } };
})();
