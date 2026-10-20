/* security.txt Validator — Toolity.in. RFC 9116 checks for /.well-known/security.txt (fetch or paste), legacy-location probe,
 * PGP cleartext detection, corrected-file generator. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { fileSource, fileUrl, fetchText, looksHtml } = window.ToolityWellKnown, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const FIELDS = ['Contact', 'Expires', 'Encryption', 'Acknowledgments', 'Preferred-Languages', 'Canonical', 'Policy', 'Hiring', 'CSAF'];
  const URLISH = ['Encryption', 'Acknowledgments', 'Canonical', 'Policy', 'Hiring', 'CSAF'];
  const DAY = 864e5, LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i, ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
  const yearOut = () => new Date(Date.now() + 365 * DAY).toISOString().replace(/\.\d{3}Z$/, '.000Z');

  function parse(text) {
    const out = { fields: [], issues: [], signed: false, crlf: /\r\n/.test(text), bom: text.charCodeAt(0) === 0xfeff, blankLines: 0 };
    let body = text.replace(/^\uFEFF/, '');
    if (/^-----BEGIN PGP SIGNED MESSAGE-----/m.test(body)) { out.signed = true; const m = body.match(/-----BEGIN PGP SIGNED MESSAGE-----\r?\n(?:Hash:[^\n]*\r?\n)*\r?\n([\s\S]*?)\r?\n-----BEGIN PGP SIGNATURE-----/); if (m) body = m[1].replace(/^- /gm, ''); else out.issues.push({ lvl: 'fail', msg: 'PGP header found but no complete cleartext signature block' }); }
    body.split(/\r\n|\r|\n/).forEach((raw, i) => {
      const n = i + 1, line = raw;
      if (!line.trim()) return;
      if (/^#/.test(line)) return;
      if (/^\s/.test(line)) return out.issues.push({ lvl: 'fail', msg: `Line ${n}: starts with whitespace — RFC 9116 does not allow folded or indented lines` });
      const m = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
      if (!m) return out.issues.push({ lvl: 'fail', msg: `Line ${n}: not a "Field: value" line — “${line.slice(0, 50)}”` });
      const key = FIELDS.find((f) => f.toLowerCase() === m[1].toLowerCase()) || m[1], value = m[2].trim();
      if (!/^[A-Za-z][A-Za-z0-9-]*: /.test(line) && value) out.issues.push({ lvl: 'warn', msg: `Line ${n}: a single space must follow the colon` });
      if (key !== m[1] && FIELDS.includes(key)) out.issues.push({ lvl: 'info', msg: `Line ${n}: field names are case-insensitive, but "${key}" is the canonical spelling` });
      out.fields.push({ key, value, line: n, known: FIELDS.includes(key) });
    });
    return out;
  }

  function check(p, ctx) {
    const rows = [], add = (name, status, detail, fix = '') => rows.push({ name, status, detail, fix });
    const get = (k) => p.fields.filter((f) => f.key === k), F = p.fields;
    const contacts = get('Contact');
    if (!contacts.length) add('Contact present', 'fail', 'No Contact field — the file is invalid without one', 'Add Contact: mailto:security@yourdomain.com');
    else { const bad = contacts.filter((c) => !/^(mailto:[^@\s]+@[^\s]+|https:\/\/\S+|tel:\+?[\d().\- ]{5,})$/i.test(c.value)); add('Contact values', bad.length ? 'fail' : 'pass', bad.length ? `${bad.map((c) => `line ${c.line}: “${c.value}”`).join('; ')} — must be a mailto:, https:// or tel: URI` : contacts.map((c) => c.value).join(' · '), 'Write e-mail addresses as mailto:name@domain, web forms as https:// URLs'); const http = contacts.filter((c) => /^http:\/\//i.test(c.value)); if (http.length) add('Contact over HTTPS', 'fail', `${http.length} Contact URL${http.length === 1 ? '' : 's'} use plain http://`, 'Use https://'); }
    const ex = get('Expires');
    if (!ex.length) add('Expires present', 'fail', 'No Expires field — required since RFC 9116', `Add Expires: ${yearOut()}`);
    else if (ex.length > 1) add('Expires present', 'fail', `Expires appears ${ex.length} times — exactly one is allowed`, 'Keep one Expires line');
    else { const v = ex[0].value, t = Date.parse(v); if (!ISO.test(v) || isNaN(t)) add('Expires format', 'fail', `“${v}” is not an ISO 8601 date-time with timezone`, `Use e.g. ${yearOut()}`); else { const left = t - Date.now(); add('Expires format', 'pass', `${v}`); if (left <= 0) add('Expires in the future', 'fail', `Expired ${Math.round(-left / DAY)} day${Math.round(-left / DAY) === 1 ? '' : 's'} ago — the file must not be used`, 'Update the date and review the contacts'); else if (left > 366 * DAY) add('Expires within a year', 'warn', `Expires in ${Math.round(left / DAY)} days — RFC 9116 recommends less than a year`, 'Set an expiry ≤ 365 days out and renew yearly'); else add('Expires within a year', left < 30 * DAY ? 'warn' : 'pass', `Expires in ${Math.round(left / DAY)} day${Math.round(left / DAY) === 1 ? '' : 's'}${left < 30 * DAY ? ' — renew soon' : ''}`); } }
    const can = get('Canonical');
    if (can.length) { const bad = can.filter((c) => !/^https:\/\/\S+\/\.well-known\/security\.txt$/i.test(c.value)); if (bad.length) add('Canonical URLs', 'fail', `${bad.map((c) => c.value).join(', ')} — must be https URL(s) ending in /.well-known/security.txt`, 'Point Canonical at the exact .well-known URL'); else if (ctx.url) { const match = can.some((c) => c.value.replace(/\/$/, '') === ctx.url.replace(/\/$/, '')); add('Canonical matches location', match ? 'pass' : 'warn', match ? can.map((c) => c.value).join(' · ') : `Fetched from ${ctx.url} but Canonical lists ${can.map((c) => c.value).join(', ')}`, 'List every URL the file is served from (www and bare domain both count)'); } else add('Canonical URLs', 'pass', can.map((c) => c.value).join(' · ')); }
    else add('Canonical', p.signed ? 'fail' : 'info', p.signed ? 'Signed files must include Canonical' : 'Optional — recommended, required when the file is PGP-signed', `Add Canonical: ${ctx.url || 'https://yourdomain.com/.well-known/security.txt'}`);
    URLISH.filter((k) => k !== 'Canonical' && k !== 'Policy').forEach((k) => { const v = get(k); if (!v.length) return; const bad = v.filter((f) => !/^https:\/\/\S+$/i.test(f.value) && !(k === 'Encryption' && /^(dns:|openpgp4fpr:)/i.test(f.value))); add(`${k} URL${v.length === 1 ? '' : 's'}`, bad.length ? 'fail' : 'pass', bad.length ? `${bad.map((f) => f.value).join(', ')} — must be https://${k === 'Encryption' ? ' (or dns: / openpgp4fpr:)' : ''}` : v.map((f) => f.value).join(' · '), 'Use an https:// URL'); });
    const pl = get('Preferred-Languages');
    if (pl.length > 1) add('Preferred-Languages', 'fail', 'Appears more than once — list all languages on one line, comma-separated', 'Preferred-Languages: en, fr');
    else if (pl.length) { const tags = pl[0].value.split(',').map((s) => s.trim()), bad = tags.filter((t) => !LANG.test(t)); add('Preferred-Languages', bad.length ? 'fail' : 'pass', bad.length ? `Invalid tag${bad.length === 1 ? '' : 's'}: ${bad.join(', ')} (use BCP 47, e.g. en, pt-BR)` : tags.join(', '), 'Use two-letter language codes'); }
    const unknown = F.filter((f) => !f.known); if (unknown.length) add('Unknown fields', 'warn', unknown.map((f) => `${f.key} (line ${f.line})`).join(', '), 'Only RFC 9116 fields are understood by scanners; others are ignored');
    const pol = get('Policy'), polBad = pol.filter((f) => !/^https:\/\/\S+$/i.test(f.value)); add('Policy', polBad.length ? 'fail' : pol.length ? 'pass' : 'info', polBad.length ? `${polBad.map((f) => f.value).join(', ')} — must be https://` : pol.length ? pol.map((f) => f.value).join(' · ') : 'Optional — a disclosure policy URL tells researchers what is in scope', pol.length ? 'Use an https:// URL' : 'Add Policy: https://yourdomain.com/security-policy');
    add('PGP signature', p.signed ? 'pass' : 'info', p.signed ? 'Cleartext-signed (signature not verified here)' : 'Not signed — optional; recommended if you publish an Encryption key', 'gpg --clearsign security.txt');
    if (p.bom) add('Byte-order mark', 'warn', 'File starts with a UTF-8 BOM — some parsers choke on the first field', 'Save as UTF-8 without BOM');
    p.issues.forEach((i) => add('Syntax', i.lvl, i.msg));
    if (ctx.via && ctx.via !== 'pasted') { add('Served as text/plain', ctx.type ? (/text\/plain/i.test(ctx.type) ? 'pass' : 'fail') : 'info', ctx.type ? ctx.type.split(';')[0] + (/charset=utf-8/i.test(ctx.type) ? ' · charset=utf-8' : /text\/plain/i.test(ctx.type) ? ' · no charset (add charset=utf-8)' : '') : 'Content type unknown (fetched through a relay)', 'Serve as text/plain; charset=utf-8'); if (ctx.status && ctx.status !== 200) add('HTTP status', 'fail', `HTTP ${ctx.status}`, 'Serve the file with a 200 status'); if (!/^https:/i.test(ctx.url || '')) add('Served over HTTPS', ctx.url && /^http:\/\/(localhost|127\.)/.test(ctx.url) ? 'info' : 'fail', ctx.url || '', 'security.txt must be served over HTTPS'); }
    if (ctx.legacy) { const L = ctx.legacy; if (L.state === 'only-legacy') add('Location', 'fail', 'Found only at /security.txt — RFC 9116 requires /.well-known/security.txt', 'Move it to /.well-known/ and redirect the root path there'); else if (L.state === 'both-differ') add('Legacy /security.txt', 'warn', 'A different file is served at /security.txt', 'Redirect /security.txt to /.well-known/security.txt'); else if (L.state === 'both-same') add('Legacy /security.txt', 'pass', 'Same content at /security.txt (redirect or copy)'); else if (L.state === 'none') add('Legacy /security.txt', 'pass', 'Not present at the root (fine)'); }
    return rows;
  }

  function fixed(p, ctx) {
    const get = (k) => p.fields.filter((f) => f.key === k).map((f) => f.value), lines = [];
    const contacts = get('Contact').map((v) => /^[^@\s:]+@[^\s]+$/.test(v) ? `mailto:${v}` : v); (contacts.length ? contacts : ['mailto:security@yourdomain.com']).forEach((v) => lines.push(`Contact: ${v}`));
    const ex = get('Expires')[0], t = ex ? Date.parse(ex) : NaN; lines.push(`Expires: ${!isNaN(t) && t > Date.now() && t - Date.now() <= 366 * DAY && ISO.test(ex) ? ex : yearOut()}`);
    get('Encryption').forEach((v) => lines.push(`Encryption: ${v}`)); get('Acknowledgments').forEach((v) => lines.push(`Acknowledgments: ${v}`));
    const pl = get('Preferred-Languages'); if (pl.length) lines.push(`Preferred-Languages: ${[...new Set(pl.flatMap((v) => v.split(',').map((s) => s.trim())).filter((s) => LANG.test(s)))].join(', ')}`);
    const can = get('Canonical').filter((v) => /^https:\/\/\S+\/\.well-known\/security\.txt$/i.test(v)); (can.length ? can : ctx.url && /^https:/.test(ctx.url) ? [ctx.url] : []).forEach((v) => lines.push(`Canonical: ${v}`));
    get('Policy').forEach((v) => lines.push(`Policy: ${v}`)); get('Hiring').forEach((v) => lines.push(`Hiring: ${v}`)); get('CSAF').forEach((v) => lines.push(`CSAF: ${v}`));
    return lines.join('\n') + '\n';
  }

  let last = null;
  const ICON = { pass: '✅ Pass', warn: '⚠ Warn', fail: '❌ Fail', info: 'ℹ Info' };
  function render(r) {
    const fails = r.rows.filter((x) => x.status === 'fail').length, warns = r.rows.filter((x) => x.status === 'warn').length;
    $('st-stats').innerHTML = [['Fields', r.p.fields.length], ['Errors', fails], ['Warnings', warns], ['Signed', r.p.signed ? 'PGP' : 'no'], ['Source', r.ctx.via === 'pasted' ? 'pasted' : `${r.ctx.status} via ${r.ctx.via}`]].map(([k, v]) => `<div class="web-stat"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
    $('st-table').querySelector('tbody').innerHTML = r.rows.map((x) => `<tr class="is-${x.status}"><th scope="row">${esc(x.name)}</th><td>${ICON[x.status]}</td><td>${esc(x.detail)}${x.fix && x.status !== 'pass' ? `<div class="st-fix">Fix: ${esc(x.fix)}</div>` : ''}</td></tr>`).join('');
    $('st-fields').innerHTML = r.p.fields.length ? `<div class="web-group-head"><span>Fields</span></div><div class="web-tags">${r.p.fields.map((f) => `<span class="web-tag ${f.known ? '' : 'warn'}">${esc(f.key)}<b>${esc(f.value)}</b></span>`).join('')}</div>` : '';
    $('st-fixed').textContent = r.fixed; $('st-raw').textContent = r.ctx.text.slice(0, 100000);
  }
  const md = (r) => `# security.txt validation — ${r.ctx.url || 'pasted file'}\n\n${r.rows.filter((x) => x.status === 'fail').length} errors · ${r.rows.filter((x) => x.status === 'warn').length} warnings · ${r.p.signed ? 'PGP-signed' : 'unsigned'}\n\n| Check | Result | Detail |\n|---|---|---|\n${r.rows.map((x) => `| ${x.name} | ${x.status.toUpperCase()} | ${x.detail}${x.fix && x.status !== 'pass' ? ` — **Fix:** ${x.fix}` : ''} |`).join('\n')}\n\n## Corrected file\n\n\`\`\`\n${r.fixed}\`\`\`\n\n_Validated with toolity.in/labs/security-txt-validator._\n`;

  mount({
    slug: 'security-txt-validator', debounce: 300, busyLabel: 'Fetching security.txt…',
    ready: (api) => fileSource.ready(api, 'Validate', '/.well-known/security.txt'),
    summary: ({ val }) => val('opt-legacy') ? 'Checks legacy /security.txt too' : '.well-known only',
    async run(api) {
      let src = await fileSource.load(api, '/.well-known/security.txt'), legacy = null;
      if (src.via !== 'pasted' && api.val('opt-legacy') && src.origin) {
        api.status('Checking legacy /security.txt…');
        try { const r = await fetchText(fileUrl(src.origin, '/security.txt').href, 10000); const has = r.status < 400 && !looksHtml(r.text) && /contact:/i.test(r.text); const main = src.status < 400 && !looksHtml(src.text); legacy = { state: has && !main ? 'only-legacy' : has && main ? (r.text.trim() === src.text.trim() ? 'both-same' : 'both-differ') : 'none' }; if (legacy.state === 'only-legacy') src = Object.assign({}, src, { text: r.text, status: r.status, type: r.type, url: r.finalUrl }); } catch (e) { legacy = { state: 'unknown' }; }
      }
      if (src.via !== 'pasted' && (src.status >= 400 || looksHtml(src.text)) && !(legacy && legacy.state === 'only-legacy')) throw new Error(src.status >= 400 ? `${src.url} returned HTTP ${src.status} — no security.txt. Create one with Contact: and Expires: lines.` : 'That URL returned an HTML page, not a security.txt — the server is catching the path.');
      const p = parse(src.text), ctx = { url: src.url, via: src.via, status: src.status, type: src.type, text: src.text, legacy };
      const rows = check(p, ctx); last = { p, rows, ctx, fixed: fixed(p, ctx) }; render(last);
      const fails = rows.filter((x) => x.status === 'fail').length, warns = rows.filter((x) => x.status === 'warn').length;
      return { text: md(last), ext: 'md', mime: 'text/markdown', badge: `${p.fields.length} field${p.fields.length === 1 ? '' : 's'}`, note: fails ? `${fails} RFC 9116 violation${fails === 1 ? '' : 's'}` : warns ? `${warns} warning${warns === 1 ? '' : 's'}` : '✓ Valid security.txt', ok: !fails, copyMsg: 'Report copied' };
    },
    download(fmt) { if (!last) return null; if (fmt === 'fixed') return { text: last.fixed, mime: 'text/plain', ext: 'txt', name: 'security.txt' }; if (fmt === 'json') return { text: JSON.stringify({ url: last.ctx.url, signed: last.p.signed, fields: last.p.fields, checks: last.rows, corrected: last.fixed }, null, 2), mime: 'application/json', ext: 'json' }; return { text: md(last), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'security-txt-validation',
    onReset(api) { last = null; api.S.file = null; ['st-stats', 'st-fields'].forEach((id) => { $(id).innerHTML = ''; }); $('st-table').querySelector('tbody').innerHTML = ''; $('st-fixed').textContent = ''; $('st-raw').textContent = ''; }
  });
  window.__st = { parse, check, fixed, get last() { return last; } };
})();
