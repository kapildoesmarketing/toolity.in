/* Designed by Kapil Pidhwani: Redirect Checker — start → final URL. Ceiling: browsers and the relay both follow the chain
 * opaquely, so intermediate hops are not observable without a server (see FAQ); the first-hop probe is the one extra bit we get. */
(function () {
  'use strict';
  const { mount, normalizeUrl, fetchPage } = window.ToolityWeb;
  const STATUS = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 410: 'Gone', 429: 'Too Many Requests', 500: 'Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' };
  const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const same = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

  /* First-hop probe: an opaque-redirect response proves the start URL itself redirects, even cross-origin. */
  async function firstHop(url) {
    try { const r = await timeout(fetch(url, { mode: 'no-cors', redirect: 'manual', cache: 'no-store' }), 8000); return r.type === 'opaqueredirect' ? true : r.type === 'opaque' || r.ok ? false : null; } catch (e) { return null; }
  }
  const item = (label, url, tag) => {
    const li = document.createElement('div'); li.className = 'web-list-item';
    const l = document.createElement('span'); l.className = 'web-tag'; l.textContent = label;
    const body = document.createElement('div'); const u = document.createElement('div'); u.className = 'web-list-url'; u.textContent = url; body.append(u);
    if (tag) { const s = document.createElement('div'); s.className = 'web-list-sub'; s.textContent = tag; body.append(s); }
    li.append(l, body); return li;
  };
  const stat = (k, v, cls) => { const d = document.createElement('div'); d.className = 'web-stat'; const s = document.createElement('span'); s.textContent = k; const b = document.createElement('strong'); b.textContent = v; if (cls) b.className = 'web-tag ' + cls; d.append(s, b); return d; };

  mount({
    slug: 'redirect-checker', busyLabel: 'Following the link…', filename: () => 'redirect-check',
    ready: ({ val, S }) => { const raw = (val('url-input') || '').trim(); if (!raw) return 'Enter a URL to check'; const u = normalizeUrl(raw); if (!u) return 'That doesn’t look like a web address'; return S.go || (S.last && S.last.key === u.href) ? true : 'Press Check Redirect'; },
    async run({ $, val, S }) {
      const start = normalizeUrl(val('url-input'));
      if (!S.last || S.last.key !== start.href) {
        const [hop, page] = await Promise.all([firstHop(start.href), fetchPage(start.href, 15000)]);
        S.last = { key: start.href, hop, page };
      }
      const { hop, page } = S.last;
      const finalKnown = page.via !== 'codetabs.com';
      const fin = finalKnown ? normalizeUrl(page.finalUrl) || start : null;
      const redirected = fin ? !same(fin.href, start.href) || hop === true : hop;
      const status = page.status || 0, sText = status ? `${status} ${STATUS[status] || ''}`.trim() : 'unknown';
      $('output-list').replaceChildren(item('Start', start.href, hop === true ? 'Redirects (confirmed by first-hop probe)' : hop === false ? 'Serves directly' : ''), fin ? item('Final', fin.href, `HTTP ${sText}`) : item('Final', 'Final address not reported by the relay', 'Open the link to see where it lands'));
      const yes = (b) => (b === true ? ['Yes', 'warn'] : b === false ? ['No', 'pass'] : ['Unknown', '']);
      const rows = [['Redirected', ...yes(redirected)], ['Final status', sText, status >= 200 && status < 300 ? 'pass' : status >= 400 ? 'fail' : status ? 'warn' : '']];
      if (fin) rows.push(['Protocol', fin.protocol === start.protocol ? fin.protocol.replace(':', '').toUpperCase() : `${start.protocol.replace(':', '')} → ${fin.protocol.replace(':', '')}`, fin.protocol === 'https:' ? 'pass' : 'warn'], ['Host', fin.hostname === start.hostname ? 'Same' : `${start.hostname} → ${fin.hostname}`, fin.hostname === start.hostname ? '' : 'warn'], ['Path', fin.pathname + fin.search === start.pathname + start.search ? 'Same' : 'Changed', '']);
      rows.push(['Checked via', page.via === 'direct' ? 'Direct request' : `Relay · ${page.via}`, '']);
      $('output-stats').replaceChildren(...rows.map(([k, v, c]) => stat(k, v, c)));
      $('output-note').textContent = fin && fin.search ? 'The final URL still carries query parameters — run it through URL Cleaner before sharing.' : '';
      const text = `${start.href}\n→ ${fin ? fin.href : '(unknown)'}\nStatus: ${sText}\nRedirected: ${yes(redirected)[0]}\nVia: ${page.via}`;
      return { text, ext: 'txt', url: fin ? fin.href : start.href, badge: sText, note: redirected ? `Redirects → ${fin ? fin.hostname : '?'}` : redirected === false ? 'No redirect' : 'Checked', ok: status < 400 };
    },
    onReset: ({ S }) => { S.last = null; }
  });
})();
