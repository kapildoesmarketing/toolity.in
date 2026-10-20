/* Tag Detector — Toolity.in. pageSource (URL via relay or pasted HTML) → ToolityTagScan.scan (HTML + GTM container + first-party
 * scripts) → grouped tag table with IDs/placement, issues, missing list, hosts; Markdown / JSON / CSV exports. */
(function () {
  'use strict';
  const { mount, pageSource, fetchPage } = window.ToolityWeb, T = window.ToolityTagScan, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const COMMON = ['gtm', 'ga4', 'gads', 'meta', 'tiktok', 'linkedin', 'pinterest', 'clarity', 'hotjar', 'bing', 'snap', 'twitter'];
  let last = null;
  function issues(r) {
    const out = [], by = Object.fromEntries(r.tags.map((t) => [t.id, t]));
    if (r.gtmIds.length > 1) out.push(['warn', `${r.gtmIds.length} GTM containers (${r.gtmIds.join(', ')}) — usually one is enough; two often means an agency leftover`]);
    if (by.ga4 && by.ga4.ids.length > 1) out.push(['warn', `${by.ga4.ids.length} GA4 measurement IDs (${by.ga4.ids.join(', ')}) — double-counting unless intentional`]);
    if (by.meta && by.meta.ids.length > 1) out.push(['warn', `${by.meta.ids.length} Meta Pixel IDs — events may fire twice`]);
    if (by.ua) out.push(['fail', 'Universal Analytics is still loaded — it stopped processing data in 2023; remove it']);
    if (by.gaoptimize) out.push(['fail', 'Google Optimize snippet present — the product was sunset in 2023; it only slows the page']);
    const hard = r.tags.filter((t) => t.cat !== 'tagmanager' && t.cat !== 'other' && t.cat !== 'ecommerce' && (t.where.head || t.where.body) && r.gtmIds.length); if (hard.length) out.push(['warn', `${hard.length} tag${hard.length === 1 ? '' : 's'} hard-coded outside GTM (${hard.slice(0, 4).map((t) => t.name).join(', ')}${hard.length > 4 ? '…' : ''}) — move into the container for one place to manage consent and firing`]);
    const sync = r.tags.filter((t) => t.asyncOk === false); if (sync.length) out.push(['warn', `Render-blocking: ${sync.map((t) => t.name).join(', ')} load without async/defer`]);
    const marketing = r.tags.some((t) => t.cat === 'advertising' || t.cat === 'analytics' || t.cat === 'heatmaps'); if (marketing && !r.cmp.length) out.push(['fail', 'No consent management platform detected while analytics/advertising tags are present — required for EEA/UK visitors']);
    if (marketing && !r.consent.present) out.push(['warn', 'No Google Consent Mode default found — Google Ads/GA4 lose EEA data without it (see Consent Mode Checker)']);
    if (!r.tags.some((t) => t.id === 'gtm' || t.id === 'gtag')) out.push(['info', 'No Google tag loader found — tags are hard-coded or the site uses another tag manager']);
    if (r.stats.thirdParty.length > 12) out.push(['warn', `${r.stats.thirdParty.length} third-party script hosts — each is a privacy and performance cost`]);
    if (!out.length) out.push(['ok', 'No structural issues found in the static scan']);
    return out;
  }
  const whereTxt = (t) => [t.where.head && 'head', t.where.body && 'body', t.where.gtm && 'via GTM', t.where.script && 'script', t.where.noscript && 'noscript'].filter(Boolean).join(' · ');
  function render(r) {
    const stat = (k, v) => `<div class="web-stat"><span class="web-muted">${k}</span><strong>${v}</strong></div>`, cats = {};
    r.tags.forEach((t) => (cats[t.cat] = cats[t.cat] || []).push(t));
    const n = (c) => r.tags.filter((t) => t.cat === c).length;
    $('td-stats').innerHTML = stat('Tags detected', r.tags.length) + stat('Analytics', n('analytics')) + stat('Advertising', n('advertising')) + stat('Via GTM only', r.tags.filter((t) => t.viaGtmOnly).length) + stat('Scripts', `${r.stats.scripts} ext · ${r.stats.inline} inline`) + stat('CMP', r.cmp.length ? r.cmp.map((c) => c.name).join(', ') : 'none');
    $('td-issues').innerHTML = issues(r).map(([lvl, m]) => `<span class="web-tag ${lvl === 'fail' ? 'fail' : lvl === 'warn' ? 'warn' : lvl === 'ok' ? 'pass' : ''}">${esc(m)}</span>`).join('');
    const order = ['tagmanager', 'analytics', 'advertising', 'heatmaps', 'abtesting', 'chat', 'marketing', 'errors', 'ecommerce', 'other'];
    $('td-groups').innerHTML = order.filter((c) => cats[c]).map((c) => `<h3 class="td-cat">${T.CATS[c]} <span class="web-muted">${cats[c].length}</span></h3><div class="web-table-wrap"><table class="web-table td-table"><tbody>${cats[c].map((t) => `<tr><th scope="row">${esc(t.name)}</th><td>${t.ids.length ? t.ids.map((i) => `<code>${esc(i)}</code>`).join(' ') : '<span class="web-muted">—</span>'}</td><td><span class="td-where${t.viaGtmOnly ? ' is-gtm' : ''}">${esc(whereTxt(t))}</span>${t.asyncOk === false ? ' <span class="web-tag warn">sync</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`).join('') + (r.cmp.length ? `<h3 class="td-cat">${T.CATS.cmp} <span class="web-muted">${r.cmp.length}</span></h3><div class="web-table-wrap"><table class="web-table td-table"><tbody>${r.cmp.map((c) => `<tr><th scope="row">${esc(c.name)}</th><td colspan="2">${r.consent.present ? 'Consent Mode default found' : '<span class="web-muted">no Consent Mode default seen</span>'}</td></tr>`).join('')}</tbody></table></div>` : '');
    const have = new Set(r.tags.map((t) => t.id)); $('td-missing').innerHTML = COMMON.filter((id) => !have.has(id)).map((id) => `<span class="web-tag">${esc(T.SIG.find((s) => s[0] === id)[1])}</span>`).join('') || '<span class="web-muted">Every common tag was found.</span>';
    $('td-hosts').innerHTML = `<p class="web-muted">${r.stats.thirdParty.length} third-party host${r.stats.thirdParty.length === 1 ? '' : 's'}${r.stats.fetched.gtm.length ? ` · read GTM ${r.stats.fetched.gtm.join(', ')}` : ''}${r.stats.fetched.scripts.length ? ` · read ${r.stats.fetched.scripts.length} first-party script${r.stats.fetched.scripts.length === 1 ? '' : 's'}` : ''}</p><div class="web-tags">${r.stats.thirdParty.map((h) => `<span class="web-tag">${esc(h)}</span>`).join('')}</div>`;
  }
  const md = (r) => `# Tag report — ${r.url}\n\n${r.title ? `**${r.title}**\n\n` : ''}${r.tags.length} tags · ${r.gtmIds.length} GTM container(s) · CMP: ${r.cmp.map((c) => c.name).join(', ') || 'none'}\n\n## Issues\n${issues(r).map(([l, m]) => `- **${l.toUpperCase()}** ${m}`).join('\n')}\n\n## Tags\n| Tag | Category | IDs | Where |\n|---|---|---|---|\n${r.tags.map((t) => `| ${t.name} | ${T.CATS[t.cat]} | ${t.ids.join(', ') || '—'} | ${whereTxt(t)} |`).join('\n')}\n\n_Static scan by toolity.in/labs/tag-detector — tags loaded only after consent or server-side are not visible._\n`;
  mount({
    slug: 'tag-detector', debounce: 400, busyLabel: 'Scanning…',
    ready: (api) => pageSource.ready(api, 'Scan'),
    summary: ({ val }) => `${val('opt-gtm') ? 'GTM container' : 'no GTM read'} · ${val('opt-scripts') ? 'first-party scripts' : 'HTML only'}`,
    async run(api) {
      const page = await pageSource.load(api), url = page.baseUrl || page.finalUrl || 'pasted HTML';
      api.status('Reading page, container and scripts…');
      const r = await T.scan(page.html, page.baseUrl || '', { gtm: api.val('opt-gtm'), scripts: api.val('opt-scripts') && page.via !== 'pasted', fetchPage });
      r.url = url; last = r; render(r);
      const bad = issues(r).filter((i) => i[0] === 'fail').length;
      return { text: md(r), ext: 'md', mime: 'text/markdown', badge: `${r.tags.length} tags`, note: `${page.via === 'pasted' ? 'Pasted HTML' : `Fetched via ${page.via}`} · ${r.gtmIds.length ? `GTM ${r.gtmIds.join(', ')}` : 'no GTM'}${bad ? ` · ${bad} issue${bad === 1 ? '' : 's'}` : ''}`, ok: !bad, copyMsg: 'Report copied' };
    },
    async download(fmt) { if (!last) return null; if (fmt === 'json') return { text: JSON.stringify({ url: last.url, title: last.title, gtm: last.gtmIds, cmp: last.cmp, tags: last.tags.map(({ id, name, cat, ids, where, asyncOk, viaGtmOnly }) => ({ id, name, category: cat, ids, where, asyncOk, viaGtmOnly })), issues: issues(last), stats: last.stats }, null, 2), mime: 'application/json', ext: 'json' }; if (fmt === 'csv') return { text: 'tag,category,ids,where,via_gtm_only,async\n' + last.tags.map((t) => `"${t.name}","${T.CATS[t.cat]}","${t.ids.join(' ')}","${whereTxt(t)}",${t.viaGtmOnly},${t.asyncOk === null ? '' : t.asyncOk}`).join('\n') + '\n', mime: 'text/csv', ext: 'csv' }; return { text: md(last), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'tag-report',
    onReset() { last = null; ['td-stats', 'td-issues', 'td-groups', 'td-missing', 'td-hosts'].forEach((id) => { $(id).innerHTML = ''; }); }
  });
  window.__td = { issues, whereTxt, get last() { return last; } };
})();
