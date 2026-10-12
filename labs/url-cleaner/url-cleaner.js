/* Designed by Kapil Pidhwani: URL Cleaner — batch tracker stripping on top of web-common. */
(function () {
  'use strict';
  const { mount, normalizeUrl } = window.ToolityWeb;
  const TRACKERS = new Set(['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'yclid', 'twclid', 'ttclid', '_hsenc', '_hsmi', 'hsctatracking', 'oly_anon_id', 'oly_enc_id', 'vero_id', 's_cid', 'mkt_tok', 'ref', 'ref_src', 'spm', 'si', '_ga', '_gl', 'srsltid', 'sscid', 'cmpid', 'ncid']);
  const isTracker = (k) => /^utm_/i.test(k) || TRACKERS.has(k.toLowerCase());

  function clean(line, o, removed) {
    const u = normalizeUrl(line);
    if (!u) return null;
    const extra = new Set(o.extra.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      const drop = o.all || (o.trackers && isTracker(k)) || extra.has(k.toLowerCase()) || (o.empty && v === '');
      if (drop) removed.set(k, (removed.get(k) || 0) + 1); else keep.append(k, v);
    }
    u.search = keep.toString() ? '?' + keep.toString() : '';
    if (o.fragment) u.hash = '';
    if (o.https && u.protocol === 'http:') u.protocol = 'https:';
    if (o.www) u.hostname = u.hostname.replace(/^www\./i, '');
    return u.href;
  }

  mount({
    slug: 'url-cleaner', idle: 'Paste URLs to begin',
    ready: ({ val }) => (val('url-input').trim() ? true : 'Paste URLs to begin'),
    summary: ({ val }) => [val('opt-all') ? 'all params' : val('opt-trackers') ? 'trackers' : 'no trackers', val('opt-empty') && 'empty params', val('opt-fragment') && 'no #', val('opt-https') && 'https', val('opt-www') && 'no www'].filter(Boolean).join(' · '),
    run: ({ val, $ }) => {
      const o = { trackers: val('opt-trackers'), empty: val('opt-empty'), fragment: val('opt-fragment'), https: val('opt-https'), www: val('opt-www'), all: val('opt-all'), extra: val('opt-extra') || '' };
      const lines = val('url-input').split(/\r?\n/);
      const removed = new Map(); let urls = 0, skipped = 0, first = '';
      const out = lines.map((l) => { if (!l.trim()) return l; const c = clean(l, o, removed); if (c === null) { skipped++; return l; } urls++; if (!first) first = c; return c; }).join('\n');
      $('output-text').textContent = out;
      $('input-count').textContent = `${urls} URL${urls === 1 ? '' : 's'}`;
      const total = [...removed.values()].reduce((a, b) => a + b, 0);
      $('output-removed').replaceChildren(...[...removed.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => { const s = document.createElement('span'); s.className = 'web-tag'; s.textContent = n > 1 ? `${k} ×${n}` : k; return s; }));
      return { text: out, ext: 'txt', url: first, badge: `${urls} clean · ${total} removed`, note: skipped ? `${urls} cleaned · ${skipped} line${skipped === 1 ? '' : 's'} skipped` : `${urls} URL${urls === 1 ? '' : 's'} cleaned`, ok: urls > 0 };
    },
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-removed').replaceChildren(); }
  });
})();
