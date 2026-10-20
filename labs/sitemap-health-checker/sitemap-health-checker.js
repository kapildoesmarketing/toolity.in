/* Sitemap Health Checker — Toolity.in. sitemaps.org protocol validation (urlset / sitemapindex / plain text), nested index
 * following, per-URL lint, section breakdown with filter, opt-in status sampling through fetchText (direct → relay). */
(function () {
  'use strict';
  const { mount, parseMeta } = window.ToolityWeb, { fileSource, fetchText, looksHtml } = window.ToolityWellKnown, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9', FREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'], MAX_URLS = 50000, MAX_BYTES = 50 * 1024 * 1024, SAMPLE = 25, ROWS = 300;
  const W3C = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;
  const kb = (n) => n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

  /* --- parse one sitemap document --- */
  function parseOne(text, url) {
    const out = { url, kind: 'unknown', urls: [], children: [], issues: [], bytes: new TextEncoder().encode(text).length, lastmods: 0 }, add = (lvl, msg) => out.issues.push({ lvl, msg, file: url });
    const t = text.replace(/^\uFEFF/, '');
    if (!/^\s*</.test(t)) { // plain-text sitemap
      const lines = t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (lines.every((l) => /^https?:\/\//i.test(l))) { out.kind = 'text'; lines.forEach((loc, i) => out.urls.push({ loc, line: i + 1 })); return out; }
      add('fail', 'Not XML and not a plain-text URL list'); return out;
    }
    const doc = new DOMParser().parseFromString(t, 'application/xml'), err = doc.querySelector('parsererror');
    if (err) { add('fail', `Malformed XML — ${(err.textContent || '').replace(/\s+/g, ' ').replace(/^.*?error on line/i, 'error on line').slice(0, 160)}`); return out; }
    const root = doc.documentElement, ln = root.localName;
    if (ln !== 'urlset' && ln !== 'sitemapindex') { add('fail', `Root element is <${ln}> — expected <urlset> or <sitemapindex>`); return out; }
    out.kind = ln === 'urlset' ? 'urlset' : 'index';
    if (root.namespaceURI !== NS) add('fail', `Wrong or missing namespace (${root.namespaceURI || 'none'}) — must be xmlns="${NS}"`);
    const decl = t.match(/^\s*<\?xml[^>]*encoding=["']([^"']+)/i); if (decl && decl[1].toLowerCase() !== 'utf-8') add('warn', `Declared encoding ${decl[1]} — sitemaps must be UTF-8`);
    const txt = (el, name) => { const c = [...el.children].find((x) => x.localName === name); return c ? c.textContent.trim() : undefined; };
    if (out.kind === 'index') {
      [...root.children].filter((x) => x.localName === 'sitemap').forEach((el, i) => { const loc = txt(el, 'loc'); if (!loc) return add('fail', `<sitemap> #${i + 1} has no <loc>`); out.children.push({ loc, lastmod: txt(el, 'lastmod') }); });
      if (!out.children.length) add('fail', 'Sitemap index lists no sitemaps');
      if (out.children.length > MAX_URLS) add('fail', `${out.children.length.toLocaleString()} sitemaps in the index — limit is 50,000`);
      return out;
    }
    [...root.children].filter((x) => x.localName === 'url').forEach((el, i) => {
      const u = { loc: txt(el, 'loc'), lastmod: txt(el, 'lastmod'), changefreq: txt(el, 'changefreq'), priority: txt(el, 'priority'), images: 0, videos: 0, alternates: 0, news: false, line: i + 1 };
      [...el.children].forEach((c) => { if (c.localName === 'image') u.images++; else if (c.localName === 'video') u.videos++; else if (c.localName === 'link' && c.getAttribute('rel') === 'alternate') u.alternates++; else if (c.localName === 'news') u.news = true; });
      if (u.lastmod) out.lastmods++;
      out.urls.push(u);
    });
    if (!out.urls.length && !out.issues.length) add('fail', 'The urlset contains no <url> entries');
    return out;
  }

  /* --- lint across all collected URLs --- */
  function lint(all, files, base) {
    const issues = [], add = (lvl, msg) => issues.push({ lvl, msg });
    files.forEach((f) => { f.issues.forEach((i) => issues.push(i)); if (f.kind === 'urlset' || f.kind === 'text') { if (f.urls.length > MAX_URLS) add('fail', `${f.url || 'sitemap'}: ${f.urls.length.toLocaleString()} URLs — limit is 50,000 per file`); if (f.bytes > MAX_BYTES) add('fail', `${f.url || 'sitemap'}: ${kb(f.bytes)} — limit is 50 MB uncompressed`); } });
    let host = null, scheme = null; try { const b = new URL(base); host = b.host; scheme = b.protocol; } catch (e) { /* pasted without URL */ }
    const seen = new Map(), counts = { dup: 0, rel: 0, host: 0, scheme: 0, frag: 0, badDate: 0, future: 0, badFreq: 0, badPrio: 0, space: 0 }, now = Date.now() + 864e5, stamps = new Set();
    all.forEach((u) => {
      u.flags = [];
      if (!u.loc) { u.flags.push('no loc'); return; }
      if (/\s/.test(u.loc)) { counts.space++; u.flags.push('whitespace'); }
      let p; try { p = new URL(u.loc); } catch (e) { counts.rel++; u.flags.push('not absolute'); return; }
      if (!/^https?:$/.test(p.protocol)) { counts.rel++; u.flags.push('not http(s)'); }
      if (host && p.host !== host) { counts.host++; u.flags.push('other host'); } else if (scheme && p.protocol !== scheme) { counts.scheme++; u.flags.push('other scheme'); }
      if (p.hash) { counts.frag++; u.flags.push('#fragment'); }
      const key = u.loc; if (seen.has(key)) { counts.dup++; u.flags.push('duplicate'); } else seen.set(key, 1);
      if (u.lastmod !== undefined) { if (!W3C.test(u.lastmod)) { counts.badDate++; u.flags.push('bad lastmod'); } else { const t = Date.parse(u.lastmod.length === 10 ? u.lastmod + 'T00:00:00Z' : u.lastmod); if (isNaN(t)) { counts.badDate++; u.flags.push('bad lastmod'); } else { if (t > now) { counts.future++; u.flags.push('future lastmod'); } stamps.add(u.lastmod); } } }
      if (u.changefreq !== undefined && !FREQ.includes(u.changefreq.toLowerCase())) { counts.badFreq++; u.flags.push('bad changefreq'); }
      if (u.priority !== undefined) { const n = Number(u.priority); if (!/^\d(\.\d+)?$/.test(u.priority) || n < 0 || n > 1) { counts.badPrio++; u.flags.push('bad priority'); } }
      u.path = p.pathname; u.section = p.pathname.split('/')[1] ? '/' + p.pathname.split('/')[1] + (p.pathname.split('/').length > 2 ? '/' : '') : '/';
    });
    const n = all.length, withDate = all.filter((u) => u.lastmod).length;
    if (counts.rel) add('fail', `${counts.rel} URL${counts.rel === 1 ? '' : 's'} not absolute http(s) — ignored by Google`);
    if (counts.host) add('fail', `${counts.host} URL${counts.host === 1 ? '' : 's'} on another host than ${host} — ignored unless that host is verified`);
    if (counts.scheme) add('fail', `${counts.scheme} URL${counts.scheme === 1 ? '' : 's'} use a different scheme (http vs https) than the sitemap`);
    if (counts.space) add('fail', `${counts.space} URL${counts.space === 1 ? '' : 's'} contain whitespace`);
    if (counts.dup) add('warn', `${counts.dup} duplicate URL${counts.dup === 1 ? '' : 's'}`);
    if (counts.frag) add('warn', `${counts.frag} URL${counts.frag === 1 ? '' : 's'} with a #fragment — fragments are never indexed separately`);
    if (counts.badDate) add('warn', `${counts.badDate} invalid lastmod value${counts.badDate === 1 ? '' : 's'} (use YYYY-MM-DD or full ISO 8601 with timezone)`);
    if (counts.future) add('warn', `${counts.future} lastmod date${counts.future === 1 ? '' : 's'} in the future`);
    if (n > 20 && withDate === n && stamps.size === 1) add('warn', `Every URL has the same lastmod (${[...stamps][0]}) — Google learns to ignore lastmod when it is not the real change date`);
    if (n && withDate && withDate < n) add('info', `lastmod on ${Math.round(withDate / n * 100)}% of URLs`);
    if (n && !withDate) add('info', 'No lastmod anywhere — fine, but accurate dates help recrawl prioritisation');
    if (counts.badFreq) add('warn', `${counts.badFreq} invalid changefreq value${counts.badFreq === 1 ? '' : 's'}`);
    if (counts.badPrio) add('warn', `${counts.badPrio} invalid priority value${counts.badPrio === 1 ? '' : 's'} (0.0–1.0)`);
    const prios = new Set(all.filter((u) => u.priority !== undefined).map((u) => u.priority)); if (prios.size === 1 && all.length > 5 && all.filter((u) => u.priority !== undefined).length === all.length) add('info', `Every URL has priority ${[...prios][0]} — the field carries no signal (Google ignores it anyway)`);
    return issues;
  }

  /* --- load (follows an index) --- */
  async function load(api, src, maxChildren, follow) {
    const files = [], root = parseOne(src.text, src.url); files.push(root);
    const all = [...root.urls]; let skipped = 0, nested = 0;
    if (root.kind === 'index' && follow) {
      const kids = root.children.slice(0, maxChildren); skipped = root.children.length - kids.length;
      for (let i = 0; i < kids.length; i++) {
        api.status(`Reading child sitemap ${i + 1}/${kids.length}…`);
        let loc = kids[i].loc; try { loc = new URL(loc, src.url || undefined).href; } catch (e) { /* keep */ }
        try { const r = await fetchText(loc, 15000); if (r.status >= 400) { files.push({ url: loc, kind: 'error', urls: [], children: [], issues: [{ lvl: 'fail', msg: `${loc} returned HTTP ${r.status}` }], bytes: 0, lastmods: 0 }); continue; } if (/\.gz$/i.test(loc)) { files.push({ url: loc, kind: 'gz', urls: [], children: [], issues: [{ lvl: 'warn', msg: `${loc} is gzip-compressed — not readable in the browser, paste it decompressed` }], bytes: 0, lastmods: 0 }); continue; } const f = parseOne(r.text, loc); if (f.kind === 'index') { nested++; f.issues.push({ lvl: 'fail', msg: `${loc} is itself a sitemap index — nested indexes are not supported by Google` }); } files.push(f); all.push(...f.urls.map((u) => Object.assign(u, { file: loc }))); }
        catch (e) { files.push({ url: loc, kind: 'error', urls: [], children: [], issues: [{ lvl: 'warn', msg: `${loc}: ${e.message}` }], bytes: 0, lastmods: 0 }); }
      }
    }
    return { files, all, root, skipped, nested };
  }

  /* --- render --- */
  let last = null, filter = '', sampled = {};
  const sectionOf = (u) => u.section || '—';
  function rows() { if (!last) return []; let f = filter.trim(); if (!f) return last.all; const m = f.match(/^\/(.+)\/([a-z]*)$/); let rx = null; if (m) { try { rx = new RegExp(m[1], m[2]); } catch (e) { rx = null; } } f = f.toLowerCase(); return last.all.filter((u) => rx ? rx.test(u.loc || '') : (u.loc || '').toLowerCase().includes(f) || (u.flags || []).some((x) => x.includes(f))); }
  function renderTable() {
    const list = rows(), show = list.slice(0, ROWS), hasStatus = Object.keys(sampled).length > 0;
    $('sm-table').querySelector('.sm-col-status').hidden = !hasStatus;
    $('sm-table').querySelector('tbody').innerHTML = show.map((u) => { const s = sampled[u.loc]; return `<tr class="${u.flags && u.flags.length ? 'has-flag' : ''}"><td class="sm-url"><a href="${esc(u.loc || '#')}" target="_blank" rel="noopener nofollow">${esc(u.loc || '(no loc)')}</a>${u.flags && u.flags.length ? `<span class="sm-flags">${u.flags.map((f) => `<i class="web-tag ${/dup|bad|future|#/.test(f) ? 'warn' : 'fail'}">${esc(f)}</i>`).join('')}</span>` : ''}</td><td>${esc(u.lastmod || '—')}</td><td>${esc(u.changefreq || '—')} · ${esc(u.priority || '—')}</td><td>${[u.images ? `${u.images} img` : '', u.videos ? `${u.videos} video` : '', u.alternates ? `${u.alternates} hreflang` : '', u.news ? 'news' : ''].filter(Boolean).join(', ') || '—'}</td><td class="sm-col-status${s ? ` is-${s.cls}` : ''}"${hasStatus ? '' : ' hidden'}>${s ? esc(s.text) : ''}</td></tr>`; }).join('');
    $('sm-more').textContent = list.length > ROWS ? `Showing ${ROWS} of ${list.length.toLocaleString()} matching URLs — refine the filter or download the full list.` : filter ? `${list.length.toLocaleString()} of ${last.all.length.toLocaleString()} URLs match.` : '';
  }
  function render(r, src) {
    const { all, files, root } = r, issues = r.issues, fails = issues.filter((i) => i.lvl === 'fail').length, warns = issues.filter((i) => i.lvl === 'warn').length;
    const kind = root.kind === 'index' ? 'Sitemap index' : root.kind === 'text' ? 'Text sitemap' : root.kind === 'urlset' ? 'URL set' : 'Invalid';
    $('sm-stats').innerHTML = [['Type', kind], ['URLs', all.length.toLocaleString()], root.kind === 'index' ? ['Child sitemaps', `${files.length - 1}${r.skipped ? ` of ${root.children.length}` : ''}`] : ['Size', kb(root.bytes)], ['With lastmod', all.length ? `${Math.round(all.filter((u) => u.lastmod).length / all.length * 100)}%` : '—'], ['Errors', fails], ['Warnings', warns]].map(([k, v]) => `<div class="web-stat"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');
    $('sm-issues').innerHTML = issues.map((i) => `<span class="web-tag ${i.lvl === 'info' ? '' : i.lvl}">${esc(i.msg)}</span>`).join('') + (r.skipped ? `<span class="web-tag">${r.skipped} more child sitemap${r.skipped === 1 ? '' : 's'} not read (raise the limit in Settings)</span>` : '');
    $('sm-children').innerHTML = root.kind === 'index' ? `<div class="web-group-head"><span>Child sitemaps</span></div><ul class="web-list">${files.slice(1).map((f) => `<li class="web-list-item"><span class="web-tag ${f.kind === 'error' ? 'fail' : f.kind === 'gz' ? 'warn' : 'pass'}">${f.kind === 'error' ? 'error' : f.kind === 'gz' ? 'gzip' : f.kind === 'index' ? 'index!' : `${f.urls.length.toLocaleString()} URLs`}</span><span><span class="web-list-url">${esc(f.url)}</span><span class="web-list-sub">${f.bytes ? kb(f.bytes) : ''}${f.urls.length ? ` · lastmod on ${Math.round(f.lastmods / f.urls.length * 100)}%` : ''}</span></span></li>`).join('')}${root.children.slice(files.length - 1).map((c) => `<li class="web-list-item"><span class="web-tag">not read</span><span class="web-list-url">${esc(c.loc)}</span></li>`).join('')}</ul>` : '';
    const secs = {}; all.forEach((u) => { const s = sectionOf(u); secs[s] = (secs[s] || 0) + 1; }); const top = Object.entries(secs).sort((a, b) => b[1] - a[1]), max = top.length ? top[0][1] : 1;
    $('sm-tree-sum').textContent = `${top.length} section${top.length === 1 ? '' : 's'}`;
    $('sm-tree').innerHTML = top.slice(0, 16).map(([s, n]) => `<button type="button" class="sm-bar" data-section="${esc(s)}" aria-pressed="false"><span class="sm-bar-label">${esc(s)}</span><span class="sm-bar-track"><i style="width:${Math.max(2, n / max * 100)}%"></i></span><span class="sm-bar-n">${n.toLocaleString()}</span></button>`).join('') + (top.length > 16 ? `<p class="web-muted">+ ${top.length - 16} smaller sections</p>` : '');
    $('sm-tree').closest('.sm-tree-wrap').hidden = !all.length;
    $('btn-sample').disabled = !all.length; $('btn-sample').querySelector('span').textContent = `Check status of ${Math.min(SAMPLE, all.length)} URL${Math.min(SAMPLE, all.length) === 1 ? '' : 's'}`;
    $('sm-raw').textContent = src.text.slice(0, 200000) + (src.text.length > 200000 ? '\n… (truncated)' : '');
    renderTable();
  }

  /* --- opt-in status sampling (Designed by Kapil Pidhwani: 25 URLs, sequential, relay-friendly; the ceiling is the relay) --- */
  async function sample(api) {
    if (!last || !last.all.length) return;
    const list = rows().length ? rows() : last.all, n = Math.min(SAMPLE, list.length), picks = [...new Set(Array.from({ length: n }, (_, i) => list[Math.floor(i * list.length / n)]))].filter((u) => u.loc && !sampled[u.loc]);
    const btn = $('btn-sample'); btn.disabled = true; let done = 0, bad = 0;
    for (const u of picks) {
      btn.querySelector('span').textContent = `Checking ${++done}/${picks.length}…`;
      try {
        const r = await fetchText(u.loc, 15000); let cls = r.status >= 400 ? 'fail' : r.status >= 300 ? 'warn' : 'pass', text = `${r.status || '?'}`;
        if (r.finalUrl && r.finalUrl.replace(/\/$/, '') !== u.loc.replace(/\/$/, '')) { cls = 'warn'; text += ` → ${r.finalUrl}`; }
        if (r.status < 400 && looksHtml(r.text)) { const m = parseMeta(r.text, u.loc); if (/noindex/i.test(m.robots)) { cls = 'fail'; text += ' · noindex'; } if (m.canonical && m.canonical.replace(/\/$/, '') !== (r.finalUrl || u.loc).replace(/\/$/, '')) { if (cls === 'pass') cls = 'warn'; text += ` · canonical ${m.canonical}`; } }
        if (cls !== 'pass') bad++; sampled[u.loc] = { cls, text, via: r.via };
      } catch (e) { sampled[u.loc] = { cls: 'warn', text: 'unreachable (' + e.message.split(' — ')[0] + ')' }; bad++; }
      renderTable();
    }
    btn.querySelector('span').textContent = `Checked ${Object.keys(sampled).length} · ${bad} problem${bad === 1 ? '' : 's'}`; btn.disabled = false;
    api.toast(bad ? `${bad} of ${picks.length} sampled URLs need attention` : `All ${picks.length} sampled URLs look fine`);
  }

  const md = (r, src) => `# Sitemap health — ${src.url || 'pasted sitemap'}\n\n${r.root.kind === 'index' ? `Sitemap index · ${r.files.length - 1} child sitemaps read` : 'URL set'} · ${r.all.length.toLocaleString()} URLs · ${r.issues.filter((i) => i.lvl === 'fail').length} errors · ${r.issues.filter((i) => i.lvl === 'warn').length} warnings\n\n## Issues\n\n${r.issues.map((i) => `- **${i.lvl}**: ${i.msg}`).join('\n') || '- none'}\n\n## URLs by section\n\n${Object.entries(r.all.reduce((a, u) => { const s = sectionOf(u); a[s] = (a[s] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([s, n]) => `- \`${s}\` — ${n}`).join('\n')}\n${Object.keys(sampled).length ? `\n## Sampled URLs\n\n| URL | Result |\n|---|---|\n${Object.entries(sampled).map(([u, s]) => `| ${u} | ${s.text} |`).join('\n')}\n` : ''}\n_Checked with toolity.in/labs/sitemap-health-checker._\n`;
  const csv = (r) => ['url,lastmod,changefreq,priority,images,videos,hreflang,flags,sampled_status,source_file'].concat(r.all.map((u) => [u.loc || '', u.lastmod || '', u.changefreq || '', u.priority || '', u.images, u.videos, u.alternates, (u.flags || []).join(' '), sampled[u.loc] ? sampled[u.loc].text : '', u.file || r.root.url || ''].map((s) => `"${String(s).replace(/"/g, '""')}"`).join(','))).join('\n');

  mount({
    slug: 'sitemap-health-checker', debounce: 300, busyLabel: 'Fetching sitemap…',
    ready: (api) => fileSource.ready(api, 'Check', '/sitemap.xml'),
    summary: ({ val }) => val('opt-children') ? `Follow index · up to ${val('opt-max-children')} child sitemaps` : 'Index not followed',
    async run(api) {
      const src = await fileSource.load(api, '/sitemap.xml');
      if (src.via !== 'pasted' && src.status >= 400) throw new Error(`${src.url} returned HTTP ${src.status} — no sitemap there. Try the exact sitemap URL (often /sitemap_index.xml or /sitemap.xml.gz).`);
      if (src.via !== 'pasted' && looksHtml(src.text)) throw new Error('That URL returned an HTML page, not XML — check the sitemap URL (robots.txt usually lists it).');
      if (/\.gz$/i.test(src.url) && !/^\s*</.test(src.text)) throw new Error('That sitemap is gzip-compressed — the browser cannot decompress it here. Paste the decompressed XML.');
      sampled = {}; filter = ''; $('sm-filter').value = '';
      const r = await load(api, src, Number(api.val('opt-max-children')) || 10, api.val('opt-children'));
      r.issues = lint(r.all, r.files, src.url || (r.all[0] && r.all[0].loc) || ''); last = Object.assign(r, { src }); render(r, src);
      const fails = r.issues.filter((i) => i.lvl === 'fail').length, warns = r.issues.filter((i) => i.lvl === 'warn').length;
      return { text: md(r, src), ext: 'md', mime: 'text/markdown', badge: `${r.all.length.toLocaleString()} URL${r.all.length === 1 ? '' : 's'}`, note: fails ? `${fails} error${fails === 1 ? '' : 's'} Google would reject` : warns ? `${warns} warning${warns === 1 ? '' : 's'}` : '✓ Sitemap is healthy', ok: !fails, copyMsg: 'Report copied' };
    },
    download(fmt) { if (!last) return null; if (fmt === 'csv') return { text: csv(last), mime: 'text/csv', ext: 'csv' }; if (fmt === 'txt') return { text: last.all.map((u) => u.loc).filter(Boolean).join('\n'), mime: 'text/plain', ext: 'txt' }; if (fmt === 'json') return { text: JSON.stringify({ url: last.src.url, kind: last.root.kind, files: last.files.map((f) => ({ url: f.url, kind: f.kind, urls: f.urls.length, bytes: f.bytes })), issues: last.issues, urls: last.all.map((u) => ({ loc: u.loc, lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority, flags: u.flags, sampled: sampled[u.loc] || null })) }, null, 2), mime: 'application/json', ext: 'json' }; return { text: md(last, last.src), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'sitemap-health',
    onReset(api) { last = null; sampled = {}; filter = ''; api.S.file = null; ['sm-stats', 'sm-issues', 'sm-children', 'sm-tree'].forEach((id) => { $(id).innerHTML = ''; }); $('sm-table').querySelector('tbody').innerHTML = ''; $('sm-raw').textContent = ''; $('sm-more').textContent = ''; $('sm-filter').value = ''; }
  });
  $('sm-filter').addEventListener('input', () => { filter = $('sm-filter').value; $('sm-tree').querySelectorAll('.sm-bar').forEach((b) => b.setAttribute('aria-pressed', 'false')); renderTable(); });
  const sectionFilter = (s) => s === '/' ? '/^https?:\\/\\/[^/]+\\/?$/' : `/^https?:\\/\\/[^/]+${s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/`;
  $('sm-tree').addEventListener('click', (e) => { const b = e.target.closest('.sm-bar'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true'; $('sm-tree').querySelectorAll('.sm-bar').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', String(!on)); filter = on ? '' : sectionFilter(b.dataset.section); $('sm-filter').value = filter; renderTable(); });
  $('btn-sample').addEventListener('click', () => sample(window.ToolityWebTool));
  window.__sm = { parseOne, lint, get last() { return last; }, get sampled() { return sampled; }, rows };
})();
