/* Designed by Kapil Pidhwani: shared "fetch this well-known text file or paste it" source for the site-file checkers
 * (robots.txt, sitemap.xml, ads.txt, security.txt). Same direct→relay path as ToolityWeb.fetchPage, but for plain text and
 * with the status code kept (a 404 body is not a robots.txt). Ceiling: relays only expose the final status, never redirects. */
(function () {
  'use strict';
  const W = () => window.ToolityWeb; // loaded after this lib — resolve lazily
  const normalizeUrl = (s) => W().normalizeUrl(s);
  const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms))]);

  /* fetchText(url) → { text, finalUrl, status, via, type } */
  async function fetchText(url, ms = 12000) {
    try {
      const r = await timeout(fetch(url, { redirect: 'follow' }), ms);
      return { text: await r.text(), finalUrl: r.url || url, status: r.status, via: 'direct', type: r.headers.get('content-type') || '' };
    } catch (e) { /* CORS / network → relay */ }
    for (const R of W().RELAYS) {
      try {
        const r = await timeout(fetch(R.url(url)), ms);
        if (!r.ok) continue;
        if (R.json) {
          const d = await r.json();
          if (!d || typeof d.contents !== 'string') continue;
          return { text: d.contents, finalUrl: (d.status && d.status.url) || url, status: (d.status && d.status.http_code) || 200, via: R.name, type: (d.status && d.status.content_type) || '' };
        }
        const text = await r.text();
        if (text) return { text, finalUrl: url, status: r.status, via: R.name, type: r.headers.get('content-type') || '' };
      } catch (e) { /* next relay */ }
    }
    throw new Error("Couldn't reach that file — the site blocks fetching or the relays are busy. Paste its contents instead.");
  }

  /* Resolve what the user typed into the file URL: "example.com" → https://example.com/<path>; a URL that already ends
   * with the file name is used as-is (so staging paths like /beta/robots.txt work). */
  function fileUrl(raw, path) {
    const u = normalizeUrl(raw); if (!u) return null;
    const name = path.split('/').pop();
    if (u.pathname.toLowerCase().endsWith(name.toLowerCase())) return u;
    return new URL(path, u.origin);
  }

  /* Fetch-or-paste source. #text-input (paste) wins over #url-input (fetch after the primary button, cached per URL). */
  const fileSource = {
    ready(api, action, path) {
      if ((api.val('text-input') || '').trim()) return true;
      const raw = (api.val('url-input') || '').trim();
      if (!raw) return `Enter a site URL or paste ${path.split('/').pop()}`;
      const u = fileUrl(raw, path); if (!u) return 'That doesn’t look like a web address';
      return api.S.go || (api.S.file && api.S.file.key === u.href) ? true : `Press ${action}`;
    },
    async load(api, path) {
      const text = (api.val('text-input') || '');
      const u = fileUrl(api.val('url-input'), path);
      if (text.trim()) return { text, url: u ? u.href : '', origin: u ? u.origin : '', via: 'pasted', status: 0, type: '' };
      if (api.S.file && api.S.file.key === u.href) return api.S.file;
      const r = await fetchText(u.href);
      return (api.S.file = Object.assign({ key: u.href, url: r.finalUrl || u.href, origin: u.origin }, r));
    }
  };

  const looksHtml = (t) => /^\s*(<!doctype|<html|<head|<body)/i.test(t.slice(0, 600));
  window.ToolityWellKnown = { fetchText, fileUrl, fileSource, looksHtml };
})();
