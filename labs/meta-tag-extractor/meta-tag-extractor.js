/* Designed by Kapil Pidhwani: Meta Tag Extractor — fetch-or-paste, table / all tags / JSON views with SEO warnings. */
(function () {
  'use strict';
  const { mount, parseMeta, pageSource } = window.ToolityWeb;
  const len = (s, max) => (s ? `${s} (${s.length} chars${max && s.length > max ? ' — over ' + max : ''})` : '');

  function check(m) {
    const w = [];
    if (!m.title) w.push(['fail', 'Missing <title>']); else if (m.title.length > 60) w.push(['warn', `Title ${m.title.length} chars (>60)`]);
    if (!m.description) w.push(['fail', 'Missing meta description']); else if (m.description.length > 160) w.push(['warn', `Description ${m.description.length} chars (>160)`]);
    if (!m.canonical) w.push(['warn', 'No canonical']);
    if (/noindex/i.test(m.robots)) w.push(['fail', 'robots: noindex']);
    if (!m.viewport) w.push(['warn', 'No viewport meta']);
    if (!m.og['og:image']) w.push(['warn', 'No og:image']);
    if (!m.og['og:title'] && !m.twitter['twitter:title']) w.push(['warn', 'No og:title']);
    if (!m.lang) w.push(['warn', 'No <html lang>']);
    if (!w.length) w.push(['pass', 'No issues found']);
    return w;
  }
  const row = (k, v, cls) => { const tr = document.createElement('tr'); const th = document.createElement('th'); th.textContent = k; const td = document.createElement('td'); td.textContent = v || 'missing'; if (!v) td.className = 'is-empty'; if (cls) tr.className = cls; tr.append(th, td); return tr; };

  mount({
    slug: 'meta-tag-extractor', busyLabel: 'Fetching page…', filename: () => 'meta-tags',
    ready: (api) => pageSource.ready(api, 'Extract Tags'),
    async run(api) {
      const { $, pill } = api;
      const src = await pageSource.load(api);
      const m = parseMeta(src.html, src.baseUrl), view = pill('seg-view');
      const summary = [['title', len(m.title, 60)], ['description', len(m.description, 160)], ['canonical', m.canonical], ['robots', m.robots], ['viewport', m.viewport], ['lang', m.lang], ['charset', m.charset], ['theme-color', m.themeColor], ['author', m.author], ['generator', m.generator], ['keywords', m.keywords], ['icon', m.icon], ['apple-touch-icon', m.appleIcon], ...Object.entries(m.og), ...Object.entries(m.twitter)];
      const all = [...m.metas.map((x) => [x.key, x.value]), ...m.links.map((l) => [`link[${l.rel}${l.hreflang ? ' ' + l.hreflang : ''}${l.sizes ? ' ' + l.sizes : ''}]`, l.href])];
      const data = { url: src.finalUrl || null, title: m.title, description: m.description, canonical: m.canonical, robots: m.robots, viewport: m.viewport, lang: m.lang, charset: m.charset, themeColor: m.themeColor, icon: m.icon, appleIcon: m.appleIcon, og: m.og, twitter: m.twitter, meta: m.metas, links: m.links, issues: check(m).map(([k, t]) => `${k}: ${t}`) };
      const json = JSON.stringify(data, null, 2);
      $('output-issues').replaceChildren(...check(m).map(([k, t]) => { const s = document.createElement('span'); s.className = 'web-tag ' + k; s.textContent = t; return s; }));
      $('output-table').querySelector('tbody').replaceChildren(...(view === 'all' ? all : summary).map(([k, v]) => row(k, v)));
      $('output-table-wrap').hidden = view === 'json'; $('output-json').hidden = view !== 'json'; $('output-json').textContent = json;
      const text = view === 'json' ? json : (view === 'all' ? all : summary).map(([k, v]) => `${k}\t${v || ''}`).join('\n');
      return { text, ext: view === 'json' ? 'json' : 'tsv', mime: view === 'json' ? 'application/json' : 'text/tab-separated-values', url: src.finalUrl, badge: `${m.metas.length} meta · ${m.links.length} link`, note: src.via === 'pasted' ? 'Parsed pasted HTML' : src.via === 'direct' ? 'Fetched directly' : `Fetched via ${src.via}`, ok: true };
    },
    onReset: ({ S }) => { S.page = null; }
  });
})();
