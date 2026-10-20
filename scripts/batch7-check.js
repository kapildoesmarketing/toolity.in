#!/usr/bin/env node
// Batch 7 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page, asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/batch7-check.js   (ONLY=slug for one tool · BASE=http://localhost:3000/)
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = process.env.BASE || 'http://localhost:3011/';

const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  const waitFor = async (cond, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(100); } return false; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const feed = (files, input = 'file-input') => { const dt = new DataTransfer(); [].concat(files).forEach(x => dt.items.add(x)); $(input).files = dt.files; $(input).dispatchEvent(new Event('change', { bubbles: true })); };
  const busy = () => $('tool-card').classList.contains('is-busy');
  const go = async (T, ms = 60000) => { $('btn-compress').click(); await tick(50); A(await waitFor(() => !busy() && (T.S.out || !$('input-error').hidden), ms), 'no output / no error within ' + ms + 'ms: ' + $('result-badge').textContent); if (!$('input-error').hidden) f.push('error shown: ' + $('input-error').textContent.trim()); };
  const png = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f00'; x.fillRect(0, 0, w, h); return new Promise(r => c.toBlob(b => r(new File([b], 'fixture.png', { type: 'image/png' })), 'image/png')); };
  const RATE = 48000;
  const buffer = (sec, fn, ch = 1) => { const b = new AudioBuffer({ numberOfChannels: ch, length: Math.round(sec * RATE), sampleRate: RATE }); for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = fn(i / RATE, i, c); } return b; };
  const wavFile = (b, name = 'fixture.wav') => new File([window.ToolityAudio.wav(b)], name, { type: 'audio/wav' });
  const loadAudio = async (T, b) => { feed(wavFile(b)); A(await waitFor(() => T.S.buf), 'audio did not decode'); };
  const imgOf = (blob) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = URL.createObjectURL(blob); });
  const pixel = async (blob, x, y) => { const i = await imgOf(blob), c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; };
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  const videoMeta = (blob) => new Promise(r => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { if (!isFinite(v.duration)) { v.onseeked = () => r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); v.currentTime = 1e9; } else r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); }; v.onerror = () => r(null); v.src = URL.createObjectURL(blob); });
`;

const PDF_HELPERS = `
  for (let i = 0; i < 80 && !(window.PDFLib && window.ToolityPDFTool); i++) await tick(100);
  A(window.PDFLib && window.ToolityPDFTool, 'pdf page did not mount');
  const L = window.PDFLib, T = window.ToolityPDFTool;
  // 6 A5 portrait pages, each with its number drawn big in the centre
  async function sixPages() { const d = await L.PDFDocument.create(); const font = await d.embedFont(L.StandardFonts.HelveticaBold); for (let i = 1; i <= 6; i++) { const p = d.addPage([419.53, 595.28]); p.drawText(String(i), { x: 180, y: 260, size: 120, font }); p.drawRectangle({ x: 20, y: 20, width: 379, height: 555, borderWidth: 2, borderColor: L.rgb(0, 0, 0) }); } d.setTitle('Six'); return d; }
  const toFile = async (d, name = 'fixture.pdf') => new File([await d.save({ useObjectStreams: false })], name, { type: 'application/pdf' });
  const loadOut = async () => { const doc = await window.ToolityPDF.open(new Uint8Array(await T.S.out.arrayBuffer())); return doc; };
  const pageText = async (doc, n) => (await (await doc.getPage(n)).getTextContent()).items.map(i => i.str).join(' ');
  const pageSize = async (doc, n) => { const v = (await doc.getPage(n)).getViewport({ scale: 1 }); return [Math.round(v.width), Math.round(v.height)]; };
  // text items with positions on page n → [{str, x, y}] in PDF points
  const items = async (doc, n) => (await (await doc.getPage(n)).getTextContent()).items.filter(i => i.str.trim()).map(i => ({ str: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }));
`;

const CASES = [
  ['dev/cookie-header-decoder/', `
    for (let i = 0; i < 80 && !(window.__ck && window.ToolityWebTool); i++) await tick(100);
    const T = window.ToolityWebTool, K = window.__ck;
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({ sub: 'u1', exp: 4102444800 })).replace(/=/g, '') + '.sig';
    const far = new Date(Date.now() + 500 * 864e5).toUTCString();
    const FIX = 'HTTP/2 200\\ncontent-type: text/html\\nset-cookie: session=' + jwt + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600\\nSet-Cookie: __Host-csrf=abc; Secure\\nSet-Cookie: track=1; SameSite=None; Expires=' + far + '\\nSet-Cookie: pref=hello%20world; Path=/; Secure; SameSite=Strict; Partitioned\\nCookie: a=1; b=aGVsbG8gd29ybGQ=; session=x\\n';
    const r = K.analyse(FIX, { cross: false, https: true, decode: true }), by = {}; r.cookies.forEach(c => { by[c.kind + ':' + c.name] = c; });
    A(r.cookies.length === 7 && r.counts.set === 4 && r.counts.req === 3, 'split: ' + r.cookies.map(c => c.kind + ':' + c.name).join(','));
    A(by['set:session'] && by['set:session'].expirySource === 'Max-Age' && Math.abs(by['set:session'].expiresAt - Date.now() - 36e5) < 5000, 'max-age → expiresAt');
    A(by['set:session'].decoded.some(d => /JWT · HS256/.test(d.kind) && /2100-01-01/.test(d.text)), 'jwt decoded: ' + JSON.stringify(by['set:session'].decoded));
    A(by['set:session'].issues.every(i => i[0] !== 'fail'), 'healthy cookie has no fail: ' + JSON.stringify(by['set:session'].issues));
    const host = by['set:__Host-csrf'].issues.map(i => i[1]).join('|'); A(/Path=\\//.test(host) && !/forbids a Domain/.test(host), '__Host- path rule: ' + host);
    const tr = by['set:track'].issues; A(tr.some(i => i[0] === 'fail' && /SameSite=None without Secure/.test(i[1])) && tr.some(i => /clamp to 400/.test(i[1])), 'track issues: ' + JSON.stringify(tr));
    A(by['set:pref'].decoded[0].text === 'hello world' && by['set:pref'].issues.some(i => /pair with SameSite=None/.test(i[1])), 'pref decode + partitioned warn: ' + JSON.stringify(by['set:pref']));
    A(by['req:b'].decoded[0].text === 'hello world' && by['req:a'].decoded.length === 0, 'base64 request cookie: ' + JSON.stringify(by['req:b'].decoded));
    const cross = K.analyse('Set-Cookie: s=1; Secure; SameSite=Lax', { cross: true, https: true, decode: true }); A(cross.cookies[0].issues.some(i => /not sent in cross-site/.test(i[1])), 'cross-site warn');
    const har = K.analyse(JSON.stringify({ log: { entries: [{ request: { url: 'https://x.test/', headers: [{ name: 'Cookie', value: 'q=2' }] }, response: { headers: [{ name: 'Set-Cookie', value: 'h=1; Path=/\\nj=2; Path=/' }] } }] } }), { https: true, decode: false });
    A(har.cookies.length === 3 && har.cookies[0].source === 'https://x.test/', 'HAR: ' + har.cookies.map(c => c.name).join(','));
    set('text-input', FIX); await tick(500);
    A(T.S.out && /7 cookies/.test($('output-badge').textContent) && document.querySelectorAll('.ck-card').length === 7, 'page render: ' + $('output-badge').textContent);
    A(document.querySelector('.ck-card.is-fail') && /rejected/.test($('status-badge').textContent), 'status: ' + $('status-badge').textContent);
    A(/\\| 7 \\| \`session\` \\| Cookie/.test(T.S.out.text) && /\\| 1 \\| \`session\` \\| Set-Cookie/.test(T.S.out.text), 'markdown');
    set('opt-context', 'cross'); await tick(400); A(/not sent in cross-site/.test($('ck-list').textContent), 'cross-site re-render');
    set('text-input', 'HTTP/2 200\\ncontent-type: text/html'); await tick(400); A(!$('input-error').hidden && /No cookies/.test($('input-error').textContent), 'no-cookie error');
    $('btn-reset').click(); await tick(200); A(!$('output-empty').hidden && $('ck-list').innerHTML === '' && $('opt-context').value === 'same', 'reset');
  `],
  ['labs/robots-txt-tester/', `
    for (let i = 0; i < 80 && !(window.__rt && window.ToolityWellKnown && window.ToolityWebTool); i++) await tick(100);
    const T = window.ToolityWebTool, R = window.__rt;
    const FIX = 'Disallow: /orphan\\nUser-agent: *\\nDisallow: /admin/\\nAllow: /admin/public/\\nDisallow: /*.pdf$\\nDisallow: /*?utm_\\nCrawl-delay: 5\\n\\nUser-agent: Googlebot\\nUser-agent: Bingbot\\nDisallow: /private\\nAllow: /private\\n\\nUser-agent: GPTBot\\nDisallow: /\\n\\nUser-agent: Googlebot-News\\nAllow: /\\n\\nSitemap: /sitemap.xml\\nSitemap: https://x.test/sitemap.xml\\nNoindex: /x\\nDissallow: /typo\\n';
    const p = R.parse(FIX), msgs = p.issues.map(i => i.lvl + ':' + i.msg).join('|');
    A(p.groups.length === 5 && p.groups.map(g => g.ua).join() === '*,googlebot,bingbot,gptbot,googlebot-news', 'groups: ' + p.groups.map(g => g.ua).join());
    A(/fail:Line 1: Disallow before any User-agent/.test(msgs) && /fail:Line 20: Sitemap must be an absolute/.test(msgs) && /warn:Line 7: Crawl-delay/.test(msgs) && /Noindex in robots.txt is not supported/.test(msgs) && /misspelling of Disallow/.test(msgs), 'lint: ' + msgs);
    const d = (ua, path, fb = true) => R.decide(p, ua, path, fb);
    A(d('*', '/admin/x').allowed === false && d('*', '/admin/public/x').allowed === true, 'longest match');
    A(d('*', '/doc.pdf').allowed === false && d('*', '/doc.pdfx').allowed === true && d('*', '/a/b.pdf').allowed === false, '$ anchor');
    A(d('*', '/page?utm_source=x').allowed === false && d('*', '/page').allowed === true, '* wildcard with query');
    A(d('Googlebot', '/private/x').allowed === true && d('Bingbot', '/private').allowed === true, 'Allow wins tie: ' + d('Googlebot', '/private/x').why);
    A(d('Googlebot', '/admin/x').allowed === true, 'specific group does not inherit * rules');
    A(d('Googlebot-Image', '/private/x').allowed === true && d('Googlebot-Image', '/private/x').group.ua === 'googlebot', 'fallback to parent token');
    A(d('Googlebot-Image', '/private/x', false).group.ua === '*' && d('Googlebot-Image', '/private/x', false).allowed === true, 'no fallback → *');
    A(d('AdsBot-Google', '/admin/x').allowed === true && d('AdsBot-Google', '/admin/x').group === null, 'AdsBot ignores *');
    A(d('gptbot', '/anything').allowed === false && d('GPTBot', '/').why === 'Disallow: / (line 15)', 'case-insensitive UA + why: ' + d('GPTBot', '/').why);
    const an = R.analyse(FIX, { urls: ['/admin/public/a', 'https://other.test/x'], uas: [], origin: 'https://x.test', fallback: true });
    A(an.agents.length === 6 && an.matrix.length === 3 && an.matrix[0].input === '/' && an.ai.find(a => a.ua === 'GPTBot').status === 'blocked' && an.ai.find(a => a.ua === 'ClaudeBot').status === 'partial', 'analyse: ' + JSON.stringify(an.ai.slice(0, 5)));
    A(an.parsed.issues.some(i => /other\\.test\\/x is on another host/.test(i.msg)), 'foreign host info');
    // live: the site's own robots.txt through the page (same-origin direct fetch)
    set('url-input', location.origin); set('rt-urls', '/templates/x\\n/labs/'); set('rt-agents', 'Googlebot, GPTBot'); await tick(300);
    A(/Press Test/.test($('status-badge').textContent), 'waits for button: ' + $('status-badge').textContent);
    $('btn-run').click(); A(await waitFor(() => T.S.out || !$('input-error').hidden, 15000), 'fetch did not finish: ' + $('input-error').textContent);
    A(T.S.out && $('rt-table').querySelectorAll('tbody tr').length === 3 && $('rt-table').querySelectorAll('thead th').length === 3, 'matrix rendered: ' + $('input-error').textContent);
    const cells = [...$('rt-table').querySelectorAll('tbody tr')].map(tr => tr.querySelector('th').textContent.trim().split('/')[1] + ':' + [...tr.querySelectorAll('td b')].map(b => b.textContent).join('/'));
    A(cells.some(c => /^templates:Blocked\\/Blocked/.test(c)) && cells.some(c => /^labs:Allowed/.test(c)), 'live cells: ' + cells.join(' '));
    A(/blocked combination/.test($('status-badge').textContent), 'status: ' + $('status-badge').textContent);
    A(/^Source/.test([...$('rt-stats').children].pop().textContent) && /direct/.test($('rt-stats').textContent), 'source stat: ' + $('rt-stats').textContent);
    A(/\\| \`\\/templates\\/x\` \\| ⛔ Blocked/.test(T.S.out.text), 'markdown row');
    set('opt-ai', false); await tick(400); A($('rt-ai').closest('.rt-ai').hidden, 'AI summary toggle');
    set('text-input', 'User-agent: *\\nDisallow: /'); await tick(500); A(/whole site is blocked/.test($('rt-issues').textContent) && T.S.out, 'paste overrides URL');
    $('btn-reset').click(); await tick(200); A(!$('output-empty').hidden && $('rt-table').querySelector('tbody').innerHTML === '' && $('opt-ai').checked, 'reset');
  `],
  ['labs/sitemap-health-checker/', `
    for (let i = 0; i < 80 && !(window.__sm && window.ToolityWellKnown && window.ToolityWebTool); i++) await tick(100);
    const T = window.ToolityWebTool, M = window.__sm, O = location.origin;
    const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9', future = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const FIX = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="' + NS + '" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://x.test/</loc><lastmod>2026-01-15</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url><url><loc>https://x.test/blog/a</loc><lastmod>' + future + '</lastmod><image:image><image:loc>https://x.test/a.png</image:loc></image:image></url><url><loc>https://x.test/blog/a</loc></url><url><loc>http://x.test/http-page</loc><lastmod>15/01/2026</lastmod><changefreq>sometimes</changefreq><priority>1.5</priority></url><url><loc>https://other.test/p#frag</loc></url><url><loc>/relative</loc></url><url><lastmod>2026-01-01</lastmod></url></urlset>';
    const f = M.parseOne(FIX, 'https://x.test/sitemap.xml'); A(f.kind === 'urlset' && f.urls.length === 7 && f.urls[1].images === 1 && f.issues.length === 0, 'parseOne: ' + JSON.stringify(f.issues));
    const iss = M.lint(f.urls, [f], 'https://x.test/sitemap.xml'), msgs = iss.map(i => i.lvl + ':' + i.msg).join('|');
    A(/fail:1 URL not absolute/.test(msgs) && /fail:1 URL on another host/.test(msgs) && /fail:1 URL use a different scheme/.test(msgs) && /warn:1 duplicate URL/.test(msgs) && /warn:1 URL with a #fragment/.test(msgs) && /warn:1 invalid lastmod/.test(msgs) && /warn:1 lastmod date in the future/.test(msgs) && /warn:1 invalid changefreq/.test(msgs) && /warn:1 invalid priority/.test(msgs), 'lint: ' + msgs);
    A(f.urls[6].flags[0] === 'no loc' && f.urls[2].flags.includes('duplicate') && f.urls[0].section === '/' && f.urls[1].section === '/blog/', 'flags/sections: ' + JSON.stringify(f.urls.map(u => u.flags)));
    const bad = M.parseOne('<?xml version="1.0"?><urlset xmlns="' + NS + '"><url><loc>https://x.test/?a=1&b=2</loc></url></urlset>', ''); A(bad.issues[0] && /Malformed XML/.test(bad.issues[0].msg), 'malformed: ' + JSON.stringify(bad.issues));
    const ns = M.parseOne('<urlset><url><loc>https://x.test/</loc></url></urlset>', ''); A(ns.issues.some(i => /namespace/.test(i.msg)) && ns.urls.length === 1, 'namespace check');
    const txt = M.parseOne('https://x.test/a\\nhttps://x.test/b\\n', ''); A(txt.kind === 'text' && txt.urls.length === 2, 'text sitemap');
    const idx = M.parseOne('<sitemapindex xmlns="' + NS + '"><sitemap><loc>https://x.test/s1.xml</loc><lastmod>2026-01-01</lastmod></sitemap><sitemap><loc>https://x.test/s2.xml</loc></sitemap></sitemapindex>', ''); A(idx.kind === 'index' && idx.children.length === 2, 'index parse');
    // live: a pasted index pointing at this site's own sitemap (same-origin child fetch)
    set('url-input', O + '/sitemap.xml'); set('text-input', '<sitemapindex xmlns="' + NS + '"><sitemap><loc>' + O + '/sitemap.xml</loc></sitemap><sitemap><loc>' + O + '/nope-sitemap.xml</loc></sitemap></sitemapindex>'); await tick(500);
    A(await waitFor(() => T.S.out || !$('input-error').hidden, 20000) && T.S.out, 'index run: ' + $('input-error').textContent);
    A(M.last.root.kind === 'index' && M.last.files.length === 3 && M.last.all.length > 100, 'children read: ' + M.last.files.map(x => x.kind + ':' + x.urls.length).join(','));
    A(/HTTP 404/.test($('sm-issues').textContent) && /other host/.test($('sm-issues').textContent), 'child 404 + host mismatch (localhost vs toolity.in): ' + $('sm-issues').textContent.slice(0, 200));
    A($('sm-tree').querySelectorAll('.sm-bar').length > 3 && $('sm-table').querySelectorAll('tbody tr').length > 50, 'tree + table');
    const bar = [...$('sm-tree').querySelectorAll('.sm-bar')].find(b => b.dataset.section === '/labs/'); bar.click(); await tick(100);
    A(bar.getAttribute('aria-pressed') === 'true' && M.rows().length > 10 && M.rows().every(u => /\\/labs\\//.test(u.loc)), 'section click filters: ' + M.rows().length);
    $('sm-filter').value = 'qr-code'; $('sm-filter').dispatchEvent(new Event('input', { bubbles: true })); await tick(100); A(M.rows().length >= 1 && M.rows().every(u => /qr-code/.test(u.loc)) && bar.getAttribute('aria-pressed') === 'false', 'text filter');
    A(/- \`\\/labs\\/\` — \\d+/.test(T.S.out.text) && /other host/.test(T.S.out.text), 'markdown: ' + T.S.out.text.slice(0, 300));
    // sampling on same-origin URLs: one 200, one 404
    set('text-input', '<urlset xmlns="' + NS + '"><url><loc>' + O + '/labs/</loc></url><url><loc>' + O + '/definitely-missing-page/</loc></url></urlset>'); await tick(600);
    A(T.S.out && M.last.all.length === 2, 'small urlset');
    $('btn-sample').click(); A(await waitFor(() => Object.keys(M.sampled).length === 2 && !$('btn-sample').disabled, 20000), 'sampling finished: ' + JSON.stringify(M.sampled));
    const s = M.sampled; A(s[O + '/labs/'] && /^200 · canonical https:\\/\\/toolity\\.in\\/labs\\/$/.test(s[O + '/labs/'].text) && s[O + '/definitely-missing-page/'] && s[O + '/definitely-missing-page/'].cls === 'fail' && /404/.test(s[O + '/definitely-missing-page/'].text), 'sample results: ' + JSON.stringify(s));
    A(!$('sm-table').querySelector('.sm-col-status').hidden && $('sm-table').querySelectorAll('td.is-fail').length === 1, 'status column shown');
    $('btn-reset').click(); await tick(200); A(!$('output-empty').hidden && $('sm-table').querySelector('tbody').innerHTML === '' && Object.keys(M.sampled).length === 0 && $('sm-filter').value === '', 'reset');
  `],
  ['labs/ads-txt-validator/', `
    for (let i = 0; i < 80 && !(window.__ad && window.ToolityWellKnown && window.ToolityWebTool); i++) await tick(100);
    const T = window.ToolityWebTool, V = window.__ad, O = location.origin;
    const FIX = '\\ufeff# comment\\nOWNERDOMAIN=example.com\\nOWNERDOMAIN=other.com\\nMANAGERDOMAIN=agency.com, fr\\nCONTACT=ads@example.com\\nFOO=bar\\ngoogle.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\\nGoogle.com, pub-1234567890123456, direct, f08c47fec0942fa0\\ngoogle.com, pub-1234567890123456, RESELLER, deadbeefdeadbeef\\nwww.appnexus.com, 1234, RESELLER\\nhttps://openx.com, 5678, RESELLER\\nrubiconproject.com, 9999\\n"pubmatic.com", 1, DIRECT\\nindexexchange.com, 42, RESELLER, 50b1c356f2c5c8fc, extra, more\\n';
    const v = V.validate(FIX), msgs = v.issues.map(i => i.lvl + ':' + i.msg).join('|'), by = {}; v.records.forEach(r => { by[r.line] = r; });
    A(v.records.length === 8 && v.vars.length === 5 && v.comments === 1, 'counts: ' + v.records.length + '/' + v.vars.length + '/' + v.comments);
    A(/warn:File starts with a UTF-8 BOM/.test(msgs) && /fail:OWNERDOMAIN appears 2 times/.test(msgs) && /warn:Line 4: MANAGERDOMAIN country "fr"/.test(msgs) && /warn:Line 6: unknown variable FOO/.test(msgs), 'vars: ' + msgs);
    A(by[7].flags.length === 0 && !by[7].bad, 'clean google line: ' + JSON.stringify(by[7].flags));
    A(by[8].flags.includes('uppercase domain') && by[8].flags.includes('lowercase relationship') && by[8].flags.includes('duplicate') && by[8].domain === 'google.com' && by[8].rel === 'DIRECT' && !by[8].bad, 'normalised + dup: ' + JSON.stringify(by[8].flags));
    A(by[9].bad && by[9].flags.includes('wrong cert ID') && by[9].flags.includes('DIRECT + RESELLER'), 'wrong cert + conflict: ' + JSON.stringify(by[9].flags));
    A(by[10].flags.includes('www prefix') && by[11].bad && by[11].flags.includes('domain is a URL') && by[12].bad && by[12].flags.includes('too few fields') && by[13].bad && by[13].flags.includes('quotes') && by[14].flags.includes('extra fields') && !by[14].bad, 'line flags: ' + [10,11,12,13,14].map(n => n + ':' + by[n].flags.join('/')).join(' '));
    A(v.stats.records === 8 && v.stats.direct === 3 && v.stats.systems === 6, 'stats: ' + JSON.stringify(v.stats));
    const clean = V.cleaned(v); A(/^OWNERDOMAIN=example.com\\n/.test(clean) && clean.split('\\n').filter(l => /^google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0$/.test(l)).length === 1 && !/openx/.test(clean) && /FOO/.test(clean) === false, 'cleaned: ' + clean);
    const html = V.validate('<!doctype html><html><body>404</body></html>'); A(html.issues[0].lvl === 'fail' && /HTML page/.test(html.issues[0].msg) && html.records.length === 0, 'soft-404');
    // live: this site's own ads.txt (same-origin), publisher ID present, app-ads.txt absent
    set('url-input', O); set('ad-pubid', 'pub-6148655095183291'); await tick(300); A(/Press Validate/.test($('status-badge').textContent), 'waits: ' + $('status-badge').textContent);
    $('btn-run').click(); A(await waitFor(() => T.S.out || !$('input-error').hidden, 15000) && T.S.out, 'live run: ' + $('input-error').textContent);
    A(V.last.ads.records.length >= 1 && V.last.pubHits.length === 1 && /found on line/.test($('ad-pub').textContent) && $('ad-pub').querySelector('.web-tag.pass'), 'pub id found: ' + $('ad-pub').textContent);
    A(V.last.app && V.last.app.missing && /not present/.test($('ad-app').textContent), 'app-ads.txt missing info: ' + JSON.stringify(V.last.app));
    A($('ad-table').querySelectorAll('tbody tr').length === V.last.ads.records.length && !$('btn-sellers').disabled && /✓ ads.txt is valid/.test($('status-badge').textContent), 'table + status: ' + $('status-badge').textContent);
    A(/Publisher ID pub-6148655095183291: \\*\\*present\\*\\*/.test(T.S.out.text), 'markdown');
    set('ad-pubid', 'pub-0000000000000000'); await tick(500); A(/NOT in this ads.txt/.test($('ad-pub').textContent) && /missing/.test($('status-badge').textContent), 'pub id missing: ' + $('status-badge').textContent);
    set('text-input', FIX); await tick(500); A($('ad-table').querySelectorAll('tbody tr').length === 8 && /invalid line/.test($('status-badge').textContent) === false || /missing/.test($('status-badge').textContent), 'paste overrides: ' + $('status-badge').textContent);
    $('btn-reset').click(); await tick(200); A(!$('output-empty').hidden && $('ad-table').querySelector('tbody').innerHTML === '' && $('ad-pubid').value === '', 'reset');
  `],
  ['labs/security-txt-validator/', `
    for (let i = 0; i < 80 && !(window.__st && window.ToolityWellKnown && window.ToolityWebTool); i++) await tick(100);
    const T = window.ToolityWebTool, S = window.__st, O = location.origin;
    const BAD = 'Contact: security@example.com\\nContact: http://example.com/report\\nPreferred-Languages: en, xx-toolong1234\\nPreferred-Languages: de\\nCanonical: http://example.com/.well-known/security.txt\\nPolicy: https://example.com/policy\\nFoo: bar\\n  indented: line\\n';
    const p = S.parse(BAD), rows = S.check(p, { url: 'https://example.com/.well-known/security.txt', via: 'pasted' }), by = {}; rows.forEach(r => { by[r.name] = r; });
    A(p.fields.length === 7 && p.issues.some(i => /starts with whitespace/.test(i.msg)), 'parse: ' + p.fields.length + ' ' + JSON.stringify(p.issues));
    A(by['Contact values'].status === 'fail' && /security@example.com/.test(by['Contact values'].detail) && by['Contact over HTTPS'].status === 'fail', 'contact checks: ' + JSON.stringify(by['Contact values']));
    A(by['Expires present'].status === 'fail' && by['Preferred-Languages'].status === 'fail' && /more than once/.test(by['Preferred-Languages'].detail) && by['Canonical URLs'].status === 'fail' && by['Unknown fields'].status === 'warn' && /Foo/.test(by['Unknown fields'].detail) && by['Policy'].status === 'pass', 'rules: ' + rows.map(r => r.name + '=' + r.status).join(','));
    const fx = S.fixed(p, { url: 'https://example.com/.well-known/security.txt' }); A(/^Contact: mailto:security@example.com\\n/.test(fx) && /Expires: \\d{4}-\\d{2}-\\d{2}T/.test(fx) && /Preferred-Languages: en, de\\n/.test(fx) && !/Foo/.test(fx) && !/http:\\/\\/example.com\\/\\.well-known/.test(fx), 'fixed: ' + fx);
    const far = new Date(Date.now() + 700 * 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
    const r2 = S.check(S.parse('Contact: mailto:a@b.co\\nExpires: ' + far + '\\n'), {}); A(r2.find(r => r.name === 'Expires within a year').status === 'warn', 'far expiry warn');
    const r3 = S.check(S.parse('Contact: mailto:a@b.co\\nExpires: ' + past + '\\n'), {}); A(r3.find(r => r.name === 'Expires in the future').status === 'fail', 'past expiry fail');
    const r4 = S.check(S.parse('Contact: mailto:a@b.co\\nExpires: 2027-01-01\\n'), {}); A(r4.find(r => r.name === 'Expires format').status === 'fail', 'date-only expiry fail');
    const SIG = '-----BEGIN PGP SIGNED MESSAGE-----\\nHash: SHA256\\n\\nContact: mailto:sec@x.test\\nExpires: ' + new Date(Date.now() + 100 * 864e5).toISOString() + '\\n- -- dash escaped comment\\n-----BEGIN PGP SIGNATURE-----\\nabc\\n-----END PGP SIGNATURE-----\\n';
    const ps = S.parse(SIG); A(ps.signed && ps.fields.length === 2, 'pgp unwrap: ' + JSON.stringify(ps.fields)); const rs = S.check(ps, {}); A(rs.find(r => r.name === 'Canonical').status === 'fail' && rs.find(r => r.name === 'PGP signature').status === 'pass', 'signed needs Canonical');
    const ok = S.check(S.parse('Contact: mailto:a@b.co\\nExpires: ' + new Date(Date.now() + 200 * 864e5).toISOString() + '\\nCanonical: https://b.co/.well-known/security.txt\\n'), { url: 'https://b.co/.well-known/security.txt', via: 'direct', status: 200, type: 'text/plain; charset=utf-8', legacy: { state: 'none' } });
    A(ok.every(r => r.status !== 'fail' && r.status !== 'warn'), 'clean file passes: ' + ok.filter(r => r.status === 'fail' || r.status === 'warn').map(r => r.name + ':' + r.detail).join('|'));
    // live: this site's own file (same-origin)
    set('url-input', O); await tick(300); $('btn-run').click(); A(await waitFor(() => T.S.out || !$('input-error').hidden, 15000) && T.S.out, 'live: ' + $('input-error').textContent);
    const L = S.last; A(L.p.fields.length === 5 && L.ctx.legacy && L.ctx.legacy.state === 'none', 'live parse: ' + JSON.stringify(L.ctx.legacy) + ' ' + L.p.fields.length);
    const lb = {}; L.rows.forEach(r => { lb[r.name] = r; }); A(lb['Expires within a year'].status === 'pass' && lb['Canonical matches location'].status === 'warn' && lb['Served as text/plain'].status === 'pass' && lb['Legacy /security.txt'].status === 'pass' && lb['Served over HTTPS'].status === 'info', 'live rows: ' + L.rows.map(r => r.name + '=' + r.status).join(','));
    A($('st-table').querySelectorAll('tbody tr').length === L.rows.length && /5 fields/.test($('output-badge').textContent) && /warning/.test($('status-badge').textContent) && /^Contact: mailto:hello@toolity.in/.test($('st-fixed').textContent), 'render: ' + [$('st-table').querySelectorAll('tbody tr').length, L.rows.length, $('output-badge').textContent, $('status-badge').textContent, $('st-fixed').textContent.slice(0, 40)].join(' | '));
    A(/\\| Expires within a year \\| PASS/.test(T.S.out.text), 'markdown');
    set('text-input', BAD); await tick(500); A(/violation/.test($('status-badge').textContent) && $('st-table').querySelector('tr.is-fail'), 'paste overrides: ' + $('status-badge').textContent);
    $('btn-reset').click(); await tick(200); A(!$('output-empty').hidden && $('st-table').querySelector('tbody').innerHTML === '' && $('opt-legacy').checked, 'reset');
  `]
];

(async () => {
  const only = process.env.ONLY;
  const port = 9700 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (path, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}${path}` }); await sleep(2000);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, userGesture: true, timeout: 240000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [path, expr] of CASES) {
    const slug = path.split('/')[1]; if (only && slug !== only) continue; n++;
    const f = await run(path, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} batch-7 tools passing`);
  process.exit(fails ? 1 : 0);
})();
