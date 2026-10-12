/* Designed by Kapil Pidhwani: Open Graph Preview — fetch-or-paste, then render the card four ways. */
(function () {
  'use strict';
  const { mount, parseMeta, pageSource } = window.ToolityWeb;
  const LIMITS = { facebook: [88, 300], x: [70, 200], linkedin: [120, 0], slack: [0, 400] };
  const cut = (s, n) => (n && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  function pick(m, platform) {
    const og = m.og, tw = m.twitter, xFirst = platform === 'x';
    const f = (a, b, c) => (xFirst ? tw[b] || og[a] : og[a] || tw[b]) || c || '';
    const image = f('og:image', 'twitter:image') || tw['twitter:image:src'] || '';
    const site = f('og:url', 'twitter:url', m.canonical || m.abs(''));
    let domain = ''; try { domain = new URL(site).hostname.replace(/^www\./, ''); } catch (e) { /* no url */ }
    return { title: f('og:title', 'twitter:title', m.title), description: f('og:description', 'twitter:description', m.description), image: image ? m.abs(image) : '', domain, card: tw['twitter:card'] || '', type: og['og:type'] || '', siteName: og['og:site_name'] || '' };
  }

  function issues(p, m) {
    const out = [];
    if (!p.image) out.push(['fail', 'No og:image']);
    if (!p.title) out.push(['fail', 'No title']); else if (p.title.length > 60) out.push(['warn', `Title ${p.title.length} chars — may truncate`]);
    if (!p.description) out.push(['warn', 'No description']); else if (p.description.length > 200) out.push(['warn', `Description ${p.description.length} chars`]);
    if (!m.og['og:url'] && !m.canonical) out.push(['warn', 'No og:url or canonical']);
    if (!m.twitter['twitter:card']) out.push(['warn', 'No twitter:card — X falls back to a small summary']);
    if (!out.length) out.push(['pass', 'All key tags present']);
    return out;
  }

  mount({
    slug: 'open-graph-preview', busyLabel: 'Fetching page…', filename: () => 'open-graph-tags',
    ready: (api) => pageSource.ready(api, 'Fetch Page'),
    async run(api) {
      const { $, pill } = api;
      const src = await pageSource.load(api);
      const m = parseMeta(src.html, src.baseUrl);
      const platform = pill('seg-platform'), p = pick(m, platform), [tl, dl] = LIMITS[platform];
      $('output-card').dataset.platform = platform;
      $('output-domain').textContent = p.domain || '—';
      $('output-title').textContent = cut(p.title, tl) || 'Untitled';
      $('output-desc').textContent = cut(p.description, dl);
      $('output-desc').hidden = !p.description || platform === 'linkedin';
      const img = $('output-img'); img.hidden = !p.image; $('output-noimg').hidden = !!p.image;
      if (p.image && img.src !== p.image) { img.src = p.image; img.onerror = () => { img.hidden = true; $('output-noimg').hidden = false; $('output-noimg').textContent = 'Image could not be loaded'; }; }
      if (p.image) $('output-noimg').textContent = 'No og:image';
      $('output-issues').replaceChildren(...issues(p, m).map(([k, t]) => { const s = document.createElement('span'); s.className = 'web-tag ' + k; s.textContent = t; return s; }));
      const rows = [['title', m.title], ['description', m.description], ['canonical', m.canonical], ...Object.entries(m.og), ...Object.entries(m.twitter)];
      $('output-table').querySelector('tbody').replaceChildren(...rows.map(([k, v]) => { const tr = document.createElement('tr'); const th = document.createElement('th'); th.textContent = k; const td = document.createElement('td'); td.textContent = v || 'missing'; if (!v) td.className = 'is-empty'; tr.append(th, td); return tr; }));
      const json = JSON.stringify({ url: src.finalUrl || null, resolved: p, og: m.og, twitter: m.twitter, title: m.title, description: m.description, canonical: m.canonical }, null, 2);
      return { text: json, ext: 'json', mime: 'application/json', url: src.finalUrl, badge: `${Object.keys(m.og).length} og · ${Object.keys(m.twitter).length} twitter`, note: src.via === 'pasted' ? 'Parsed pasted HTML' : src.via === 'direct' ? 'Fetched directly' : `Fetched via ${src.via}`, ok: true };
    },
    onReset: ({ S, $ }) => { S.page = null; $('output-img').removeAttribute('src'); }
  });
})();
