/* Robots.txt Tester — Toolity.in. RFC 9309 parser + Google-style matcher (most specific UA group, longest path pattern,
 * Allow wins ties, * and $ wildcards), syntax lint, URL × UA matrix and an AI-crawler summary. fileSource = fetch or paste. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { fileSource, looksHtml } = window.ToolityWellKnown, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const DEFAULT_UAS = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'GPTBot', 'ClaudeBot', '*'];
  const AI = [['GPTBot', 'OpenAI training'], ['ChatGPT-User', 'ChatGPT browsing'], ['OAI-SearchBot', 'ChatGPT search'], ['Google-Extended', 'Gemini training'], ['ClaudeBot', 'Anthropic training'], ['Claude-User', 'Claude browsing'], ['Claude-SearchBot', 'Claude search'], ['anthropic-ai', 'Anthropic (legacy)'], ['CCBot', 'Common Crawl'], ['PerplexityBot', 'Perplexity index'], ['Perplexity-User', 'Perplexity browsing'], ['Bytespider', 'ByteDance / TikTok'], ['Applebot-Extended', 'Apple Intelligence'], ['Amazonbot', 'Amazon Alexa'], ['meta-externalagent', 'Meta AI training'], ['Meta-ExternalFetcher', 'Meta AI fetch'], ['DuckAssistBot', 'DuckDuckGo AI'], ['MistralAI-User', 'Mistral Le Chat'], ['cohere-ai', 'Cohere'], ['Diffbot', 'Diffbot'], ['YouBot', 'You.com'], ['omgili', 'Webz.io'], ['Timpibot', 'Timpi']];
  const KNOWN = ['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host', 'clean-param', 'noindex', 'request-rate', 'visit-time', 'nofollow', 'noarchive', 'content-signal'];
  // Google-specific: these product tokens never fall back to "*"
  const NO_STAR = /^(adsbot-google|adsbot-google-mobile|mediapartners-google)$/i;

  /* --- parse --- */
  function parse(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const lines = text.split(/\r\n|\r|\n/), groups = [], sitemaps = [], issues = [], add = (lvl, msg, line) => issues.push({ lvl, msg, line });
    let cur = null, lastWasUa = false;
    lines.forEach((raw, i) => {
      const n = i + 1, line = raw.replace(/#.*$/, '').trim(); if (!line) return;
      const m = line.match(/^([A-Za-z][A-Za-z-]*)\s*:\s*(.*)$/);
      if (!m) { add('fail', `Line ${n}: not a "field: value" line — ignored (“${raw.trim().slice(0, 40)}”)`, n); return; }
      const field = m[1].toLowerCase(), value = m[2].trim();
      if (field === 'user-agent' || field === 'useragent' || field === 'user agent') {
        if (field !== 'user-agent') add('warn', `Line ${n}: "${m[1]}" — Google accepts it, most other crawlers want exactly "User-agent"`, n);
        if (!value) { add('fail', `Line ${n}: empty User-agent — group ignored`, n); return; }
        const token = value.split(/[\s/]/)[0].toLowerCase();
        if (token !== value.toLowerCase()) add('warn', `Line ${n}: only the product token "${token}" is matched, not "${value}"`, n);
        if (!lastWasUa || !cur) { cur = { uas: [], rules: [], delay: null, lines: [n] }; groups.push(cur); }
        cur.uas.push(token); cur.lines.push(n); lastWasUa = true; return;
      }
      lastWasUa = false;
      if (field === 'sitemap') { sitemaps.push({ url: value, line: n }); if (!/^https?:\/\//i.test(value)) add('fail', `Line ${n}: Sitemap must be an absolute URL (https://…), got “${value}”`, n); return; }
      if (field === 'allow' || field === 'disallow' || field === 'dissallow' || field === 'disalow') {
        if (field !== 'allow' && field !== 'disallow') { add('fail', `Line ${n}: "${m[1]}" is a misspelling of Disallow — ignored by crawlers`, n); return; }
        if (!cur) { add('fail', `Line ${n}: ${m[1]} before any User-agent — outside a group, ignored by every crawler`, n); return; }
        let path = value;
        if (path && !/^[/*]/.test(path)) { add('warn', `Line ${n}: pattern “${path}” does not start with / — treated as /${path}`, n); path = '/' + path; }
        if (field === 'allow' && !path) add('info', `Line ${n}: empty Allow has no effect`, n);
        cur.rules.push({ allow: field === 'allow', path, line: n, raw: raw.trim() }); return;
      }
      if (field === 'crawl-delay') { if (cur) cur.delay = value; add('warn', `Line ${n}: Crawl-delay is ignored by Google (Bing and Yandex honour it)`, n); return; }
      if (field === 'noindex' || field === 'nofollow' || field === 'noarchive') { add('warn', `Line ${n}: ${m[1]} in robots.txt is not supported by Google since 2019 — use a meta robots tag or X-Robots-Tag`, n); return; }
      if (field === 'host') { add('info', `Line ${n}: Host is a Yandex-only directive`, n); return; }
      if (field === 'clean-param') { add('info', `Line ${n}: Clean-param is a Yandex-only directive`, n); return; }
      if (!KNOWN.includes(field)) add('warn', `Line ${n}: unknown directive "${m[1]}" — ignored`, n);
    });
    // merge groups that name the same UA (RFC 9309 §2.2.1)
    const merged = [], byUa = {};
    groups.forEach((g) => g.uas.forEach((ua) => { if (byUa[ua]) { byUa[ua].rules.push(...g.rules); byUa[ua].lines.push(...g.lines); if (g.delay && !byUa[ua].delay) byUa[ua].delay = g.delay; } else { byUa[ua] = { ua, rules: [...g.rules], delay: g.delay, lines: [...g.lines] }; merged.push(byUa[ua]); } }));
    const size = new TextEncoder().encode(text).length;
    if (size > 512000) add('fail', `File is ${(size / 1024).toFixed(0)} KB — Google reads only the first 500 KB`, 0);
    if (!groups.length && text.trim()) add('warn', 'No User-agent group found — every crawler may crawl everything', 0);
    if (!sitemaps.length) add('info', 'No Sitemap: line — optional, but it helps crawlers find your sitemap', 0);
    const seen = {}; sitemaps.forEach((s) => { if (seen[s.url]) add('info', `Line ${s.line}: duplicate Sitemap ${s.url}`, s.line); seen[s.url] = 1; });
    merged.forEach((g) => { if (!g.rules.length) add('info', `Group "${g.ua}" has no Allow/Disallow rules — that crawler may crawl everything`, g.lines[0]); });
    return { groups: merged, sitemaps, issues, size, lines: lines.length };
  }

  /* --- match --- */
  const rx = {};
  function patternMatches(pattern, path) {
    let r = rx[pattern];
    if (!r) { const anchored = pattern.endsWith('$'); const body = (anchored ? pattern.slice(0, -1) : pattern).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*'); r = rx[pattern] = new RegExp('^' + body + (anchored ? '$' : '')); }
    return r.test(path);
  }
  function urlPath(input, origin) {
    let u; try { u = new URL(input, origin || 'https://example.invalid/'); } catch (e) { return null; }
    let p = u.pathname + u.search; try { p = decodeURI(p); } catch (e) { /* keep raw */ }
    return { path: p || '/', host: u.host, href: u.href };
  }
  function groupFor(parsed, ua, fallback) {
    const t = ua.toLowerCase(), by = (x) => parsed.groups.find((g) => g.ua === x);
    let g = by(t); if (g) return g;
    if (fallback) { const parts = t.split('-'); while (parts.length > 1) { parts.pop(); g = by(parts.join('-')); if (g) return g; } }
    if (fallback && NO_STAR.test(t)) return null;
    return by('*') || null;
  }
  function decide(parsed, ua, path, fallback) {
    const g = groupFor(parsed, ua, fallback);
    if (!g) return { allowed: true, rule: null, group: null, why: 'no matching group' };
    let best = null;
    g.rules.forEach((r) => { if (!r.path) return; if (!patternMatches(r.path, path)) return; if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow && !best.allow)) best = r; });
    if (!best) return { allowed: true, rule: null, group: g, why: 'no rule matches' };
    return { allowed: best.allow, rule: best, group: g, why: `${best.allow ? 'Allow' : 'Disallow'}: ${best.path} (line ${best.line})` };
  }
  function aiSummary(parsed, fallback) {
    return AI.map(([ua, who]) => { const g = groupFor(parsed, ua, fallback), root = decide(parsed, ua, '/', fallback); const dis = g ? g.rules.filter((r) => !r.allow && r.path).length : 0; const status = !root.allowed ? 'blocked' : dis ? 'partial' : 'allowed'; return { ua, who, status, group: g ? g.ua : null, rules: dis }; });
  }

  /* --- run --- */
  function analyse(text, { urls, uas, origin, fallback }) {
    const parsed = parse(text);
    const list = [...new Set(['/', ...urls])].map((u) => { const p = urlPath(u, origin); return p ? { input: u, ...p } : { input: u, path: null }; });
    const agents = uas.length ? uas : DEFAULT_UAS;
    const matrix = list.map((u) => ({ ...u, cells: agents.map((ua) => u.path === null ? { allowed: null, why: 'invalid URL' } : decide(parsed, ua, u.path, fallback)) }));
    list.forEach((u) => { if (u.path !== null && origin && u.host && u.host !== new URL(origin).host) parsed.issues.push({ lvl: 'info', msg: `${u.input} is on another host — robots.txt only governs ${new URL(origin).host}`, line: 0 }); });
    const star = parsed.groups.find((g) => g.ua === '*'); if (star && star.rules.some((r) => !r.allow && r.path === '/') && !star.rules.some((r) => r.allow)) parsed.issues.unshift({ lvl: 'fail', msg: 'User-agent: * / Disallow: / — the whole site is blocked for every crawler without its own group', line: 0 });
    return { parsed, agents, matrix, ai: aiSummary(parsed, fallback) };
  }

  /* --- render --- */
  function render(r, src) {
    const { parsed } = r, rules = parsed.groups.reduce((a, g) => a + g.rules.length, 0), blocked = r.matrix.reduce((a, row) => a + row.cells.filter((c) => c.allowed === false).length, 0);
    $('rt-stats').innerHTML = [['Groups', parsed.groups.length], ['Rules', rules], ['Sitemaps', parsed.sitemaps.length], ['Size', `${(parsed.size / 1024).toFixed(1)} KB`], ['Blocked cells', `${blocked}/${r.matrix.length * r.agents.length}`], ['Source', src.via === 'pasted' ? 'pasted' : `${src.status || ''} via ${src.via}`]].map(([k, v]) => `<div class="web-stat"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
    $('rt-issues').innerHTML = parsed.issues.map((i) => `<span class="web-tag ${i.lvl === 'info' ? '' : i.lvl}">${esc(i.msg)}</span>`).join('');
    $('rt-table').querySelector('thead').innerHTML = `<tr><th>URL</th>${r.agents.map((a) => `<th>${esc(a)}</th>`).join('')}</tr>`;
    $('rt-table').querySelector('tbody').innerHTML = r.matrix.map((row) => `<tr><th scope="row"><code>${esc(row.input)}</code>${row.path && row.path !== row.input ? `<span class="web-muted">${esc(row.path)}</span>` : ''}</th>${row.cells.map((c) => `<td class="${c.allowed === null ? 'is-empty' : c.allowed ? 'is-pass' : 'is-fail'}"><b>${c.allowed === null ? '—' : c.allowed ? 'Allowed' : 'Blocked'}</b><span>${esc(c.why)}${c.group && c.rule ? ` · group ${esc(c.group.ua)}` : c.group ? ` · group ${esc(c.group.ua)}` : ''}</span></td>`).join('')}</tr>`).join('');
    const showAi = r.showAi !== false; $('rt-ai').closest('.rt-ai').hidden = !showAi;
    if (showAi) { const b = r.ai.filter((a) => a.status === 'blocked').length, p = r.ai.filter((a) => a.status === 'partial').length; $('rt-ai-sum').textContent = `${b} blocked · ${p} partial · ${r.ai.length - b - p} allowed`; $('rt-ai').innerHTML = r.ai.map((a) => `<span class="web-tag ${a.status === 'blocked' ? 'fail' : a.status === 'partial' ? 'warn' : 'pass'}" title="${esc(a.who)}${a.group ? ` · matched group ${a.group}` : ' · no group'}">${esc(a.ua)} <i>${a.status}</i></span>`).join(''); }
    $('rt-groups').textContent = parsed.groups.map((g) => `User-agent: ${g.ua}${g.delay ? `   (crawl-delay ${g.delay})` : ''}\n${g.rules.map((x) => `  ${x.allow ? 'Allow   ' : 'Disallow'} ${x.path || '(empty — allow all)'}   # line ${x.line}`).join('\n') || '  (no rules)'}`).join('\n\n') + (parsed.sitemaps.length ? `\n\nSitemaps:\n${parsed.sitemaps.map((s) => `  ${s.url}   # line ${s.line}`).join('\n')}` : '');
    $('rt-raw').textContent = src.text.slice(0, 200000);
  }
  const md = (r, src) => `# robots.txt test — ${src.url || 'pasted file'}\n\n${r.parsed.groups.length} groups · ${r.parsed.groups.reduce((a, g) => a + g.rules.length, 0)} rules · ${r.parsed.sitemaps.length} sitemaps · ${(r.parsed.size / 1024).toFixed(1)} KB\n\n| URL | ${r.agents.join(' | ')} |\n|---|${r.agents.map(() => '---').join('|')}|\n${r.matrix.map((row) => `| \`${row.input}\` | ${row.cells.map((c) => c.allowed === null ? '—' : `${c.allowed ? '✅ Allowed' : '⛔ Blocked'} (${c.why})`).join(' | ')} |`).join('\n')}\n${r.parsed.issues.length ? `\n## Issues\n\n${r.parsed.issues.map((i) => `- **${i.lvl}**: ${i.msg}`).join('\n')}\n` : ''}\n## AI crawlers\n\n${r.ai.map((a) => `- ${a.ua} (${a.who}): **${a.status}**${a.group ? ` via group \`${a.group}\`` : ''}`).join('\n')}\n\n_Tested with toolity.in/labs/robots-txt-tester._\n`;
  const csv = (r) => [['url', ...r.agents].join(','), ...r.matrix.map((row) => [row.input, ...row.cells.map((c) => c.allowed === null ? '' : `${c.allowed ? 'allowed' : 'blocked'}: ${c.why}`)].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','))].join('\n');

  let last = null;
  mount({
    slug: 'robots-txt-tester', debounce: 300, busyLabel: 'Fetching robots.txt…',
    ready: (api) => fileSource.ready(api, 'Test', '/robots.txt'),
    summary: ({ val }) => `${val('opt-fallback') ? 'Google fallback rules' : 'exact UA groups only'} · AI summary ${val('opt-ai') ? 'on' : 'off'}`,
    async run(api) {
      const src = await fileSource.load(api, '/robots.txt');
      if (src.via !== 'pasted' && src.status >= 400) throw new Error(`${src.url} returned HTTP ${src.status} — ${src.status === 404 ? 'no robots.txt, so crawlers may crawl everything' : 'crawlers treat 5xx as "disallow all" temporarily'}.`);
      if (src.via !== 'pasted' && looksHtml(src.text)) throw new Error('That URL returned an HTML page, not a robots.txt — the site may be serving a soft 404 or a login page.');
      const urls = (api.val('rt-urls') || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean), uas = (api.val('rt-agents') || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const r = analyse(src.text, { urls, uas, origin: src.origin, fallback: api.val('opt-fallback') }); r.showAi = api.val('opt-ai'); last = { r, src }; render(r, src);
      const fails = r.parsed.issues.filter((i) => i.lvl === 'fail').length, blocked = r.matrix.reduce((a, row) => a + row.cells.filter((c) => c.allowed === false).length, 0);
      return { text: md(r, src), ext: 'md', mime: 'text/markdown', badge: `${r.parsed.groups.length} group${r.parsed.groups.length === 1 ? '' : 's'}`, note: fails ? `${fails} syntax error${fails === 1 ? '' : 's'}` : blocked ? `${blocked} blocked combination${blocked === 1 ? '' : 's'}` : '✓ Everything tested is allowed', ok: !fails, copyMsg: 'Report copied' };
    },
    download(fmt) { if (!last) return null; if (fmt === 'json') return { text: JSON.stringify({ url: last.src.url, groups: last.r.parsed.groups, sitemaps: last.r.parsed.sitemaps, issues: last.r.parsed.issues, agents: last.r.agents, matrix: last.r.matrix.map((row) => ({ url: row.input, path: row.path, results: row.cells.map((c) => ({ allowed: c.allowed, why: c.why, group: c.group ? c.group.ua : null })) })), ai: last.r.ai }, null, 2), mime: 'application/json', ext: 'json' }; if (fmt === 'csv') return { text: csv(last.r), mime: 'text/csv', ext: 'csv' }; return { text: md(last.r, last.src), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'robots-test',
    onReset(api) { last = null; api.S.file = null; ['rt-stats', 'rt-issues', 'rt-ai'].forEach((id) => { $(id).innerHTML = ''; }); $('rt-table').querySelector('thead').innerHTML = ''; $('rt-table').querySelector('tbody').innerHTML = ''; $('rt-groups').textContent = ''; $('rt-raw').textContent = ''; }
  });
  window.__rt = { parse, decide, analyse, patternMatches, AI, get last() { return last; } };
})();
