/* Designed by Kapil Pidhwani: Robots.txt & Sitemap Generator — pure string building, no libraries, no crawling (rule 14).
 * Rule groups are DOM rows under #rb-groups (user-agents, Disallow, Allow, crawl-delay); presets replace the groups.
 * Both files are always generated so Download ▾ can offer either; the pills only choose what the output pane shows.
 * Ceilings: sitemap capped at the protocol's 50 000 URLs; no sitemap-index generation; lastmod accepts YYYY-MM-DD or a
 * full ISO timestamp and is otherwise flagged, never silently fixed. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Bytespider', 'Applebot-Extended', 'Amazonbot', 'FacebookBot', 'meta-externalagent', 'cohere-ai', 'Diffbot', 'omgili', 'YouBot'];
  const PRESETS = {
    allow: [{ ua: '*', dis: '', allow: '' }],
    block: [{ ua: '*', dis: '/', allow: '' }],
    ai: [{ ua: AI_BOTS.join(', '), dis: '/', allow: '' }, { ua: '*', dis: '', allow: '' }],
    wordpress: [{ ua: '*', dis: '/wp-admin/\n/wp-includes/\n/?s=\n/search/', allow: '/wp-admin/admin-ajax.php' }],
    staging: [{ ua: '*', dis: '/', allow: '' }]
  };
  const FREQ = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const today = () => new Date().toISOString().slice(0, 10);
  const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  const path = (p) => (/^[/*$]/.test(p) ? p : '/' + p);
  let seq = 0;

  function groupEl(g = { ua: '*', dis: '', allow: '', delay: '' }) {
    const id = ++seq, div = document.createElement('div');
    div.className = 'rb-group';
    div.innerHTML = `
      <div class="rb-group-head">
        <label class="form-label" for="rb-ua-${id}"><span>User-agent(s)</span><span class="form-label-desc">comma-separated</span></label>
        <button type="button" class="rb-del" title="Remove this group" aria-label="Remove this group"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button>
      </div>
      <input type="text" id="rb-ua-${id}" class="input-clean rb-ua" list="rb-ua-list" autocomplete="off" spellcheck="false" placeholder="*">
      <div class="rb-paths">
        <div class="form-group"><label class="form-label" for="rb-dis-${id}"><span>Disallow</span><span class="form-label-desc">one path per line</span></label><textarea id="rb-dis-${id}" class="textarea-clean rb-dis" rows="3" placeholder="/admin/&#10;/search" spellcheck="false" autocapitalize="off"></textarea></div>
        <div class="form-group"><label class="form-label" for="rb-allow-${id}"><span>Allow</span><span class="form-label-desc">exceptions</span></label><textarea id="rb-allow-${id}" class="textarea-clean rb-allow" rows="3" placeholder="/admin/public/" spellcheck="false" autocapitalize="off"></textarea></div>
      </div>
      <div class="form-group rb-delay-row"><label class="form-label" for="rb-delay-${id}"><span>Crawl-delay</span><span class="form-label-desc">seconds · ignored by Google</span></label><input type="number" id="rb-delay-${id}" class="input-clean rb-delay" min="0" step="1" placeholder="—" inputmode="numeric"></div>`;
    div.querySelector('.rb-ua').value = g.ua; div.querySelector('.rb-dis').value = g.dis; div.querySelector('.rb-allow').value = g.allow; div.querySelector('.rb-delay').value = g.delay || '';
    return div;
  }
  const readGroups = ($) => [...$('rb-groups').querySelectorAll('.rb-group')].map((d) => ({
    ua: lines(d.querySelector('.rb-ua').value.replace(/,/g, '\n')), dis: lines(d.querySelector('.rb-dis').value).map(path), allow: lines(d.querySelector('.rb-allow').value).map(path), delay: d.querySelector('.rb-delay').value.trim()
  }));
  function setGroups($, list) { const box = $('rb-groups'); box.innerHTML = ''; list.forEach((g) => box.append(groupEl(g))); }

  function robots(groups, site) {
    const out = [];
    for (const g of groups) {
      if (!g.ua.length) continue;
      const block = g.ua.map((u) => `User-agent: ${u}`);
      if (!g.dis.length && !g.allow.length) block.push('Disallow:');
      g.dis.forEach((p) => block.push(`Disallow: ${p}`)); g.allow.forEach((p) => block.push(`Allow: ${p}`));
      if (g.delay !== '' && +g.delay >= 0) block.push(`Crawl-delay: ${+g.delay}`);
      out.push(block.join('\n'));
    }
    if (site) out.push(`Sitemap: ${site.origin}/sitemap.xml`);
    return out.join('\n\n') + (out.length ? '\n' : '');
  }
  function sitemap(text, site, j) {
    const issues = [], seen = new Set(), urls = [];
    for (const raw of text.split('\n')) {
      const l = raw.trim(); if (!l || l.startsWith('#')) continue;
      const [loc, lastmodIn, freqIn, prIn] = l.split(',').map((x) => x.trim());
      let u;
      try { if (/\s/.test(loc)) throw 0; u = new URL(loc, site ? site.href : undefined); } catch (e) { issues.push(['fail', `Not a URL: ${loc}`]); continue; }
      if (!/^https?:$/.test(u.protocol)) { issues.push(['fail', `Not http(s): ${loc}`]); continue; }
      if (site && u.host !== site.host) issues.push(['warn', `Different host: ${u.host}`]);
      u.hash = '';
      const href = u.href;
      if (seen.has(href)) { issues.push(['warn', `Duplicate removed: ${href}`]); continue; }
      seen.add(href);
      let lastmod = lastmodIn !== undefined ? lastmodIn : (j.lastmod === 'today' ? today() : '');
      if (lastmod && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/.test(lastmod)) { issues.push(['fail', `Bad lastmod "${lastmod}" for ${u.pathname} — use YYYY-MM-DD`]); lastmod = ''; }
      let freq = freqIn !== undefined ? freqIn.toLowerCase() : j.freq;
      if (freq && !FREQ.has(freq)) { issues.push(['fail', `Bad changefreq "${freq}" for ${u.pathname}`]); freq = ''; }
      let pr = prIn !== undefined ? prIn : j.priority;
      if (pr !== '' && !(+pr >= 0 && +pr <= 1)) { issues.push(['fail', `Priority must be 0.0–1.0 (${u.pathname})`]); pr = ''; }
      urls.push({ href, lastmod, freq, pr });
    }
    if (urls.length > 50000) { issues.unshift(['fail', `${urls.length.toLocaleString()} URLs — the sitemap protocol allows 50,000 per file; split into several files + a sitemap index`]); urls.length = 50000; }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url>\n    <loc>${esc(u.href)}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}${u.freq ? `    <changefreq>${u.freq}</changefreq>\n` : ''}${u.pr !== '' ? `    <priority>${(+u.pr).toFixed(1)}</priority>\n` : ''}  </url>`).join('\n')}\n</urlset>\n`;
    return { xml, n: urls.length, issues };
  }
  const tag = ([k, t]) => `<span class="web-tag ${k}">${esc(t)}</span>`;

  const api = mount({
    slug: 'robots-sitemap-generator', debounce: 150,
    ready: ({ $, pill, val }) => (pill('seg-mode') === 'sitemap' ? (val('text-input').trim() ? true : 'Paste URLs, one per line') : (readGroups($).some((g) => g.ua.length) ? true : 'Add a rule group or pick a preset')),
    summary: ({ val }) => [`lastmod ${val('opt-lastmod') === 'today' ? 'today' : 'omitted'}`, val('opt-freq') ? `changefreq ${val('opt-freq')}` : 'no changefreq', val('opt-priority') ? `priority ${val('opt-priority')}` : 'no priority'].join(' · '),
    onPill: (g, { $, pill }) => { if (g.id !== 'seg-mode') return; const sm = pill('seg-mode') === 'sitemap'; $('rb-pane').hidden = sm; $('sm-pane').hidden = !sm; },
    run: ({ $, pill, val }) => {
      let site = null; const raw = val('site-url').trim();
      if (raw) { try { site = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { throw new Error('Site URL is not a valid address.'); } }
      const j = { lastmod: val('opt-lastmod'), freq: val('opt-freq'), priority: val('opt-priority') };
      const groups = readGroups($), rb = robots(groups, site), sm = sitemap(val('text-input'), site, j), mode = pill('seg-mode') || 'robots';
      const issues = mode === 'sitemap' ? sm.issues : [];
      if (mode === 'robots') { if (!site) issues.push(['warn', 'Add a Site URL to include the Sitemap: line']); if (groups.some((g) => g.dis.includes('/') && g.ua.includes('*'))) issues.push(['warn', 'User-agent * is blocked from the whole site — search engines will drop your pages']); }
      $('output-text').textContent = mode === 'robots' ? rb : sm.xml;
      $('output-issues').innerHTML = (issues.length ? issues : [['pass', mode === 'robots' ? 'Valid robots.txt' : 'Valid sitemap']]).slice(0, 40).map(tag).join('');
      const rules = groups.reduce((n, g) => n + g.dis.length + g.allow.length, 0);
      return { text: mode === 'robots' ? rb : sm.xml, robots: rb, sitemap: sm.xml, ext: mode === 'robots' ? 'txt' : 'xml', badge: mode === 'robots' ? `${groups.length} group${groups.length === 1 ? '' : 's'} · ${rules} rule${rules === 1 ? '' : 's'}` : `${sm.n.toLocaleString()} URL${sm.n === 1 ? '' : 's'}`, note: issues.some((i) => i[0] === 'fail') ? 'Check the issues' : 'Ready', ok: !issues.some((i) => i[0] === 'fail'), copyMsg: `${mode === 'robots' ? 'robots.txt' : 'sitemap.xml'} copied` };
    },
    download: (fmt, { S }) => (fmt === 'sitemap' ? { text: S.out.sitemap, name: 'sitemap.xml', mime: 'application/xml' } : { text: S.out.robots, name: 'robots.txt', mime: 'text/plain;charset=utf-8' }),
    onReset: ({ $ }) => { setGroups($, PRESETS.allow); $('rb-pane').hidden = false; $('sm-pane').hidden = true; $('output-text').textContent = ''; $('output-issues').innerHTML = ''; }
  });
  setGroups(api.$, PRESETS.allow); api.run();
  api.$('btn-add-group').addEventListener('click', () => { api.$('rb-groups').append(groupEl({ ua: '', dis: '', allow: '' })); api.$('rb-groups').lastElementChild.querySelector('.rb-ua').focus(); api.run(); });
  api.$('rb-groups').addEventListener('click', (e) => { const b = e.target.closest('.rb-del'); if (!b) return; b.closest('.rb-group').remove(); api.run(); });
  api.card.querySelector('.rb-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; setGroups(api.$, PRESETS[b.dataset.preset]); api.run(); api.toast(`${b.textContent} preset applied`); });
})();
